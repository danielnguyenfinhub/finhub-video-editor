// Self-check for mcp/finhub-video-server.mjs: it starts over stdio, lists exactly its eleven tools,
// answers list_designs and video_status, refuses a slug that could reach outside the repo
// (preflight and still; still takes a slug so it renders the video being edited), holds the spend
// gate, and saves edit.json only through a confirmed, schema-checked, backed-up patch.
// Renders nothing. Run: node scripts/check-mcp.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { connect } from "node:net";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const root = join(import.meta.dirname, "..");

// The Railway image copies scripts one by one (mcp/Dockerfile): every script the remote tools run, and
// every script those import, must be in its COPY line, or the tool dies with "Cannot find module" there.
{
  const copied = new Set([...readFileSync(join(root, "mcp/Dockerfile"), "utf8").matchAll(/scripts\/[\w.-]+/g)].map((m) => m[0]));
  const need = ["scripts/research.py", "scripts/providers.mjs"];
  for (let i = 0; i < need.length; i++)
    if (need[i].endsWith(".mjs"))
      for (const [, dep] of readFileSync(join(root, need[i]), "utf8").matchAll(/^import .* from "\.\/([\w.-]+)";$/gm)) if (!need.includes(`scripts/${dep}`)) need.push(`scripts/${dep}`);
  for (const f of need) assert.ok(copied.has(f), `mcp/Dockerfile copies ${f} (the remote tools need it)`);
  // The server's static imports must load in that image too: mcp/edit.mjs needs src/ and esbuild, so it is imported lazily.
  for (const f of ["finhub-video-server.mjs", "http.mjs", "oauth.mjs"])
    for (const [, a, b] of readFileSync(join(root, "mcp", f), "utf8").matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm)) {
      const m = a ?? b;
      const ok = /^(node:|@modelcontextprotocol\/sdk\/)|^zod$/.test(m) || (m.startsWith("./") && m !== "./edit.mjs") || copied.has(m.replace(/^\.\.\//, ""));
      assert.ok(ok, `mcp/${f} imports ${m} statically; the Railway image can't load it`);
    }
}
const client = new Client({ name: "check-mcp", version: "1.0.0" });
// FINHUB_FAKE_PROVIDERS: scripts/providers.mjs answers with canned data, so nothing is spent or sent.
process.env.FINHUB_FAKE_PROVIDERS = "1";
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(root, "mcp/finhub-video-server.mjs")], cwd: root, stderr: "ignore", env: { ...process.env } }));
const testSlug = "zz-check-mcp";
try {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["audio", "edit", "list_designs", "preflight", "prep", "render_video", "research", "review", "still", "video_status", "visuals"]);
  for (const t of tools) assert.ok(!/publish|upload|clone/i.test(t.name), `${t.name}: publishing and cloning stay off the MCP`);

  const designs = JSON.parse((await client.callTool({ name: "list_designs", arguments: {} })).content[0].text);
  assert.ok(designs.length > 10 && designs.every((d) => d.id), "list_designs returns the designs");

  const status = await client.callTool({ name: "video_status", arguments: {} });
  assert.match(status.content[0].text, /^exit \d/, "video_status runs the script");

  for (const bad of ["../etc", "a/b", "A B; rm -rf /"]) {
    const r = await client.callTool({ name: "preflight", arguments: { slug: bad } });
    assert.ok(r.isError, `preflight refuses slug ${JSON.stringify(bad)}`);
  }
  for (const composition of ["x; echo", "--help"]) {
    const r = await client.callTool({ name: "still", arguments: { composition, frame: 0 } });
    assert.ok(r.isError, `still refuses composition ${JSON.stringify(composition)}`);
  }
  const still = tools.find((t) => t.name === "still");
  assert.ok(still.inputSchema.properties.slug, "still takes a slug, so it renders the video being edited, not the default");
  for (const bad of ["../etc", "a/b"]) {
    const r = await client.callTool({ name: "still", arguments: { composition: "MortgageReel", frame: 0, slug: bad } });
    // The validation message, not just isError: a bad slug that reached Remotion would fail too, later.
    assert.ok(r.isError && /Input validation error.*at slug/.test(r.content[0].text), `still refuses slug ${JSON.stringify(bad)}`);
  }
  const flag = await client.callTool({ name: "research", arguments: { mode: "topic", query: "--days=99999", slug: "x" } });
  assert.ok(flag.isError, "research refuses a query that reads as a flag");
  for (const mode of ["watch", "comments"]) {
    for (const query of ["http://www.youtube.com/watch?v=x", "file:///etc/passwd", "-o/tmp/x", "--exec=calc"]) {
      const r = await client.callTool({ name: "research", arguments: { mode, query, slug: "x" } });
      assert.ok(r.isError && !/^exit /.test(r.content[0].text), `research ${mode} refuses ${query} before running anything`);
    }
  }
  const transcript = await client.callTool({ name: "research", arguments: { mode: "transcript", query: "https://example.com/v", slug: "x" } });
  assert.ok(transcript.isError && !/^exit /.test(transcript.content[0].text), "research transcript takes YouTube links only");

  // Spend gate: a paid call without confirm quotes and spends nothing; the code works once, for those arguments only.
  const ledgerFile = join(root, "out", "spend-ledger.jsonl");
  const spent = () => (existsSync(ledgerFile) ? readFileSync(ledgerFile, "utf8").split("\n").filter(Boolean).length : 0);
  const before = spent();
  const sfx = { action: "sfx", slug: testSlug, prompt: "soft cash register ding", seconds: 2 };
  const quote = await client.callTool({ name: "audio", arguments: sfx });
  const code = /confirm: "([^"]+)"/.exec(quote.content[0].text)?.[1];
  assert.ok(!quote.isError && code && /US\$/.test(quote.content[0].text), "a paid call without confirm returns a quote and a code");
  assert.equal(spent(), before, "the quote spends nothing");
  for (const confirm of ["1.x", `${Date.now() + 60_000}.${"a".repeat(24)}`]) {
    const r = await client.callTool({ name: "audio", arguments: { ...sfx, confirm } });
    assert.ok(r.isError && /refused/.test(r.content[0].text), `a forged code is refused (${confirm.slice(0, 6)}...)`);
  }
  const [exp, macPart] = code.split(".");
  for (const respelt of [`0${exp}.${macPart}`, `+${exp}.${macPart}`]) {
    const r = await client.callTool({ name: "audio", arguments: { ...sfx, confirm: respelt } });
    assert.ok(r.isError && /refused/.test(r.content[0].text), `a respelt expiry is refused (${respelt.slice(0, 2)}...)`);
  }
  const other = await client.callTool({ name: "audio", arguments: { ...sfx, seconds: 9, confirm: code } });
  assert.ok(other.isError && /refused/.test(other.content[0].text), "a code is bound to the arguments it was quoted for");
  const made = await client.callTool({ name: "audio", arguments: { ...sfx, confirm: code } });
  assert.ok(!made.isError && /public\/videos\/zz-check-mcp\/assets\/sfx-/.test(made.content[0].text), "the confirmed call runs and writes in the video's folder");
  assert.equal(spent(), before + 1, "the confirmed call is in the spend ledger");
  const again = await client.callTool({ name: "audio", arguments: { ...sfx, confirm: code } });
  assert.ok(again.isError && /refused/.test(again.content[0].text), "a code works once");
  const escape = await client.callTool({ name: "audio", arguments: { action: "transcribe", slug: testSlug, file: "../../../package.json" } });
  assert.ok(escape.isError && /not a file inside/.test(escape.content[0].text), "transcribe refuses a file outside the video's folder");
  const stt = { action: "transcribe", slug: testSlug, file: "tone.txt", engine: "elevenlabs" };
  mkdirSync(join(root, "public", "videos", testSlug), { recursive: true });
  writeFileSync(join(root, "public", "videos", testSlug, "tone.txt"), "x");
  const sttQuote = await client.callTool({ name: "audio", arguments: stt });
  const sttCode = /confirm: "([^"]+)"/.exec(sttQuote.content[0].text)?.[1];
  assert.ok(sttCode && /uploads .*ElevenLabs/.test(sttQuote.content[0].text), "ElevenLabs transcription quotes first and says it uploads the file");
  const sttRun = await client.callTool({ name: "audio", arguments: { ...stt, confirm: sttCode } });
  assert.ok(!sttRun.isError && /transcribe-tone\.json/.test(sttRun.content[0].text), "the confirmed transcription writes word timings");
  const openaiImage = await client.callTool({ name: "visuals", arguments: { action: "image", prompt: "x", slug: testSlug, provider: "openai" } });
  assert.ok(openaiImage.isError, "OpenAI images are gone (fal and xAI only)");
  const ask = await client.callTool({ name: "research", arguments: { mode: "ask", query: "RBA cash rate?" } });
  assert.ok(!ask.isError && /out\/research\/ask-/.test(ask.content[0].text), "research ask writes a cited answer");
  const tr = await client.callTool({ name: "research", arguments: { mode: "translate", query: "Hello", to: "vi" } });
  assert.match(tr.content[0].text, /bản dịch giả/, "research translate returns the translation");
  const term = await client.callTool({ name: "visuals", arguments: { action: "library", term: "house --kind music" } });
  assert.ok(term.isError, "visuals refuses a term that carries a flag");

  // edit: a change is previewed first, saved only with that preview's code, checked by the render's schema and backed up.
  const vdir = join(root, "public", "videos", testSlug);
  mkdirSync(vdir, { recursive: true });
  const editFile = join(vdir, "edit.json");
  const original = '{"title":"Check","pacing":{"mode":"off"}}\n';
  writeFileSync(editFile, original);
  writeFileSync(join(vdir, "words.json"), JSON.stringify([" Lãi", " suất", " 4,1", " phần", " trăm."].map((text, i) => ({ text, startMs: i * 300, endMs: i * 300 + 300 }))));
  const edit = (args) => client.callTool({ name: "edit", arguments: { slug: testSlug, ...args } });
  const fileHash = () => createHash("sha256").update(readFileSync(editFile)).digest("hex");
  assert.match((await edit({ action: "get" })).content[0].text, /"title": "Check"/, "edit get returns the file");
  assert.ok((await edit({ action: "get", slug: "../etc" })).isError, "edit refuses a bad slug");
  assert.match((await edit({ action: "words", find: "4,1 phần" })).content[0].text, /^600-1200 /, "edit words finds a phrase with its source ms");
  assert.match((await edit({ action: "words", fromMs: 0, toMs: 600 })).content[0].text, /^0-300 Lãi\n300-600 suất$/, "edit words lists a window");
  const h0 = fileHash();
  for (const [ops, why] of [
    [[{ op: "set", path: "__proto__.x", value: 1 }], "a __proto__ path"],
    [[{ op: "set", path: "constructor.prototype.polluted", value: 1 }], "a key the schema doesn't know"],
    [[{ op: "set", path: "hook", value: {} }], "a hook without big"],
    [[{ op: "set", path: "pacing.mode", value: "auto" }], "auto pacing on Daniel's footage"],
    [[{ op: "set", path: "source", value: "x" }], "a new source (prep sets it)"],
    [[{ op: "unset", path: "title" }], "an edit.json without a title"],
    [[{ op: "set", path: "remove", value: [[0, 300]] }, { op: "set", path: "remove.length", value: 5_000_000 }], "a list length (a huge sparse list)"],
    [[{ op: "set", path: "remove", value: [[0, 300]] }, { op: "unset", path: "remove.x" }], "a list item that isn't a position"],
    [[{ op: "set", path: "remove", value: [[0, 300]] }, { op: "set", path: "remove.5", value: [600, 900] }], "a position past the end of a list"],
  ]) {
    const r = await edit({ action: "patch", ops });
    assert.ok(r.isError && !/confirm:/.test(r.content[0].text), `edit patch refuses ${why}`);
  }
  assert.equal(fileHash(), h0, "a refused patch leaves edit.json as it was");
  assert.ok(!(await edit({ action: "get" })).isError, "the server is still up after those");
  const yesFor = async (ops) => (await edit({ action: "patch", ops })).content[0].text.split("Needs Daniel's explicit yes:")[1] ?? "";
  assert.match(await yesFor([{ op: "append", path: "cut.words", value: "4,1" }]), /cut\.words "4,1" drops a spoken number 1 time/, "cut.words that drops a number needs Daniel's yes");
  assert.match(await yesFor([{ op: "append", path: "cut.words", value: "xyz" }]), /never said/, "cut.words that matches nothing needs Daniel's yes");
  assert.match(await yesFor([{ op: "append", path: "remove", value: [1150, 1500] }]), /drops a spoken number: "phần trăm\."/, "a cut that drops a number word needs Daniel's yes");
  assert.match(await yesFor([{ op: "append", path: "captionFixes", value: { from: "4,1", to: "41" } }]), /changes a number/, "a caption fix 4,1 -> 41 needs Daniel's yes");
  const ops = [{ op: "append", path: "remove", value: [550, 950] }, { op: "set", path: "background", value: "vignette" }];
  const preview = (await edit({ action: "patch", ops, check: false })).content[0].text;
  const editCode = /confirm: "([^"]+)"/.exec(preview)?.[1];
  assert.ok(editCode && /Nothing was saved/.test(preview), "a patch without confirm returns a preview and a code");
  assert.ok(/explicit yes:[\s\S]*drops a spoken number: "suất 4,1 phần"/.test(preview) && /explicit yes:[\s\S]*background becomes vignette/.test(preview), "the preview names what needs Daniel's yes: a cut number, vignette");
  assert.ok(fileHash() === h0 && !existsSync(`${editFile}.bak`), "the preview saves nothing");
  const skipChecks = await edit({ action: "patch", ops, confirm: /confirm: "([^"]+)"/.exec((await edit({ action: "patch", ops })).content[0].text)[1], check: false });
  assert.ok(skipChecks.isError && /refused/.test(skipChecks.content[0].text), "a code issued with the checks on can't confirm with them off");
  const forged = await edit({ action: "patch", ops, check: false, confirm: `${Date.now() + 60_000}.${"a".repeat(24)}` });
  assert.ok(forged.isError && /refused/.test(forged.content[0].text), "a forged edit code is refused");
  const otherOps = await edit({ action: "patch", ops: ops.slice(0, 1), check: false, confirm: editCode });
  assert.ok(otherOps.isError && /refused/.test(otherOps.content[0].text), "an edit code is bound to its ops");
  writeFileSync(editFile, '{"title":"Changed meanwhile","pacing":{"mode":"off"}}\n');
  const stale = await edit({ action: "patch", ops, check: false, confirm: editCode });
  assert.ok(stale.isError && /refused/.test(stale.content[0].text), "a code from before someone else saved is refused");
  writeFileSync(editFile, original);
  const saved = await edit({ action: "patch", ops, check: false, confirm: editCode });
  assert.ok(!saved.isError && /saved public\/videos\/zz-check-mcp\/edit\.json/.test(saved.content[0].text), "the confirmed patch saves");
  assert.equal(readFileSync(`${editFile}.bak`, "utf8"), original, "the old edit.json is kept as edit.json.bak");
  const after = readFileSync(editFile, "utf8");
  assert.ok(after.endsWith("}\n") && JSON.parse(after).remove[0][1] === 950 && JSON.parse(after).background === "vignette", "edit.json holds the change");
  const reused = await edit({ action: "patch", ops, check: false, confirm: editCode });
  assert.ok(reused.isError && /refused/.test(reused.content[0].text), "an edit code works once");
  const undoCode = /confirm: "([^"]+)"/.exec((await edit({ action: "undo", check: false })).content[0].text)?.[1];
  assert.ok(undoCode && readFileSync(editFile, "utf8") === after, "undo previews first");
  assert.ok(!(await edit({ action: "undo", check: false, confirm: undoCode })).isError, "the confirmed undo runs");
  assert.ok(readFileSync(editFile, "utf8") === original && readFileSync(`${editFile}.bak`, "utf8") === after, "undo swaps edit.json and .bak (a second undo redoes)");
  const target = join(root, "out", "check-mcp-link-target.txt");
  mkdirSync(join(root, "out"), { recursive: true });
  writeFileSync(target, "untouched");
  let planted = false;
  try {
    rmSync(`${editFile}.bak`, { force: true });
    symlinkSync(target, `${editFile}.tmp`);
    symlinkSync(target, `${editFile}.bak`);
    planted = true;
  } catch {
    // no symlinks here: nothing to check
  }
  if (planted) {
    const linkOps = [{ op: "set", path: "subtitle", value: "x" }];
    const c = /confirm: "([^"]+)"/.exec((await edit({ action: "patch", ops: linkOps, check: false })).content[0].text)[1];
    assert.ok(!(await edit({ action: "patch", ops: linkOps, check: false, confirm: c })).isError, "a save with links planted at .tmp and .bak runs");
    assert.equal(readFileSync(target, "utf8"), "untouched", "a link planted at edit.json.tmp or .bak is replaced, not written through");
  }
  rmSync(target, { force: true });
  let linked = false;
  try {
    unlinkSync(editFile);
    symlinkSync(join(root, "package.json"), editFile);
    linked = true;
  } catch {
    // no symlinks here (Windows without the right): nothing to check
  }
  if (linked) assert.ok(/outside/.test((await edit({ action: "get" })).content[0].text), "an edit.json linked outside public/videos is refused");
  // prep and review: a footage or music file is a bare name inside its folder, refused before anything runs.
  for (const file of ["../package.json", "a/b.mp4", "a\\b.mp4", "-x.mp4"]) {
    const r = await client.callTool({ name: "prep", arguments: { action: "ingest", slug: "zz-new", file } });
    assert.ok(r.isError && /Input validation error.*file/s.test(r.content[0].text), `prep ingest refuses file ${JSON.stringify(file)} at the schema`);
  }
  const footLink = join(root, "1 - PUT FOOTAGE HERE", "zz-check-mcp-link.mp4");
  let footLinked = false;
  try {
    mkdirSync(join(root, "1 - PUT FOOTAGE HERE"), { recursive: true });
    symlinkSync(join(root, "package.json"), footLink);
    footLinked = true;
  } catch {
    // no symlinks here: nothing to check
  }
  if (footLinked) {
    const r = await client.callTool({ name: "prep", arguments: { action: "ingest", slug: "zz-new", file: "zz-check-mcp-link.mp4" } });
    rmSync(footLink, { force: true });
    assert.ok(r.isError && /not a file in/.test(r.content[0].text), "a footage-folder link to a file outside it is refused");
  }
  const missing = await client.callTool({ name: "prep", arguments: { action: "ingest", slug: "zz-new", file: "no-such-take.mp4" } });
  assert.ok(missing.isError && /not a file in 1 - PUT FOOTAGE HERE/.test(missing.content[0].text), "prep ingest takes only a file in the footage folder");
  const music = await client.callTool({ name: "prep", arguments: { action: "music_start", file: "../package.json" } });
  assert.ok(music.isError && !/^exit /.test(music.content[0].text), "prep music_start refuses a path");
  for (const action of ["ingest", "reedit", "assemble"]) {
    const r = await client.callTool({ name: "prep", arguments: { action, slug: testSlug, file: "x.mp4", recording: "x" } });
    assert.ok(r.isError && /edit\.json exists/.test(r.content[0].text), `prep ${action} won't touch an existing edit.json`);
  }
  // prep matte: only a prepared video, and an existing cut-out (45 min of GPU work) is replaced only with redo.
  const matte = (args) => client.callTool({ name: "prep", arguments: { action: "matte", ...args } });
  assert.match((await matte({ slug: "zz-no-such-video" })).content[0].text, /edit\.json doesn't exist/, "prep matte needs a prepared video");
  assert.match((await matte({ slug: "zz_dot.slug" })).content[0].text, /hyphens/, "prep matte takes only the slugs matte.html accepts");
  rmSync(editFile, { force: true });
  writeFileSync(editFile, original);
  assert.match((await matte({ slug: testSlug })).content[0].text, /no source\.mp4/, "prep matte needs the recording's source.mp4");
  writeFileSync(join(vdir, "source.mp4"), "x");
  writeFileSync(join(vdir, "foreground.webm"), "x");
  const twice = await matte({ slug: testSlug });
  assert.ok(twice.isError && /already has foreground\.webm; redo: true/.test(twice.content[0].text), "prep matte won't replace a cut-out without redo");
  for (const bench of [2, 61, 4.5]) assert.ok((await matte({ slug: testSlug, bench })).isError, `prep matte refuses bench ${bench}`);
  const reviewTool = tools.find((t) => t.name === "review");
  assert.ok(!reviewTool.inputSchema.properties.promote, "review pack can't promote a design");
  console.log(`check-mcp: ${tools.length} tools, ${designs.length} designs, bad slugs refused, spend gate holds, edit.json saves only when confirmed`);
} finally {
  await client.close();
  for (const d of [join(root, "public", "videos", testSlug), join(root, "out", "videos", testSlug)]) rmSync(d, { recursive: true, force: true });
}

// Jobs, in this process (a stand-in job, no render): the id answers at once, the slot is taken, edit.json
// waits, and video_status follows the step to the result.
{
  const { makeServer, startJob } = await import("../mcp/finhub-video-server.mjs");
  const [a, b] = InMemoryTransport.createLinkedPair();
  const local = new Client({ name: "check-mcp-jobs", version: "1.0.0" });
  await makeServer().connect(a);
  await local.connect(b);
  const vdir = join(root, "public", "videos", testSlug);
  mkdirSync(vdir, { recursive: true });
  writeFileSync(join(vdir, "edit.json"), '{"title":"Check","pacing":{"mode":"off"}}\n');
  try {
    const started = startJob(`render ${testSlug}`, process.execPath, ["-e", 'console.log("== the slow step"); setTimeout(() => {}, 1500)'], 60_000);
    const id = /job ([0-9a-f]{8})/.exec(started.content[0].text)?.[1];
    assert.ok(id, "startJob answers at once with a job id");
    assert.ok(startJob("another", process.execPath, ["-e", ""], 60_000).isError, "one heavy job at a time");
    const patch = await local.callTool({ name: "edit", arguments: { action: "patch", slug: testSlug, ops: [{ op: "set", path: "subtitle", value: "x" }] } });
    assert.ok(patch.isError && /is running/.test(patch.content[0].text), "edit.json waits while a job for that video runs");
    let st;
    let sawStep = false;
    for (let i = 0; i < 50; i++) {
      st = (await local.callTool({ name: "video_status", arguments: { job: id } })).content[0].text;
      if (/finished/.test(st)) break;
      sawStep ||= /running \d+ s, at: the slow step/.test(st);
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(sawStep, "video_status shows the job's step while it runs");
    assert.match(st, /finished after \d+ s\nexit 0/, "video_status shows the result when it ends");
    assert.match((await local.callTool({ name: "video_status", arguments: { job: "all" } })).content[0].text, new RegExp(`job ${id} render ${testSlug}`), "job all lists it");
    assert.ok((await local.callTool({ name: "video_status", arguments: { job: "00000000" } })).isError, "an unknown job id is an error");
    // Node refuses a NUL in an argument before anything starts: the job still ends and frees the slot.
    const bad = /job ([0-9a-f]{8})/.exec(startJob("bad start", process.execPath, ["a\0b"], 60_000).content[0].text)[1];
    await new Promise((r) => setTimeout(r, 50));
    assert.match((await local.callTool({ name: "video_status", arguments: { job: bad } })).content[0].text, /finished.*\ncould not start/s, "a job that can't start says so");
    assert.ok(!startJob("after", process.execPath, ["-e", ""], 60_000).isError, "and the slot is free again");
    console.log("check-mcp jobs: id at once, one slot, edit waits, status follows the step");
  } finally {
    await local.close();
    rmSync(vdir, { recursive: true, force: true });
  }
}

// Over HTTP a finished sweep brings its contact sheets back as pictures; a sheet outside out/ never does.
{
  const { makeServer, startJob } = await import("../mcp/finhub-video-server.mjs");
  const [a, b] = InMemoryTransport.createLinkedPair();
  const pcClient = new Client({ name: "check-mcp-sheets", version: "1.0.0" });
  await makeServer({ http: true }).connect(a);
  await pcClient.connect(b);
  const sweepDir = join(root, "out", "videos", testSlug, "team", "qc", "sweep");
  const outside = join(root, "zz-check-mcp-outside.jpg");
  try {
    mkdirSync(sweepDir, { recursive: true });
    writeFileSync(join(sweepDir, "sheet-01.jpg"), "jpeg bytes");
    writeFileSync(outside, "not shown");
    writeFileSync(join(sweepDir, "sweep.json"), JSON.stringify({ sheets: [{ path: join(sweepDir, "sheet-01.jpg") }, { path: outside }, { path: join(sweepDir, "gone.jpg") }] }));
    let started;
    for (let i = 0; i < 50 && (started = startJob(`sweep ${testSlug}`, process.execPath, ["-e", ""], 60_000)).isError; i++) await new Promise((res) => setTimeout(res, 100)); // the jobs check's last job frees the slot
    const id = /job ([0-9a-f]{8})/.exec(started.content[0].text)[1];
    let r;
    for (let i = 0; i < 50 && !/finished/.test((r = await pcClient.callTool({ name: "video_status", arguments: { job: id } })).content[0].text); i++) await new Promise((res) => setTimeout(res, 100));
    const images = r.content.filter((c) => c.type === "image");
    assert.equal(images.length, 1, "a finished sweep brings its sheet back as a picture, and only the one inside out/");
    assert.equal(Buffer.from(images[0].data, "base64").toString(), "jpeg bytes");
    // A hand-broken sweep.json, or a folder named like a sheet, never turns the job's answer into an error.
    for (const bad of ["not json", JSON.stringify({ sheets: "x" }), JSON.stringify({ sheets: [null, { path: sweepDir }] })]) {
      writeFileSync(join(sweepDir, "sweep.json"), bad);
      const again = await pcClient.callTool({ name: "video_status", arguments: { job: id } });
      assert.ok(!again.isError && /finished/.test(again.content[0].text) && !again.content.some((c) => c.type === "image"), `a bad sweep.json (${bad.slice(0, 12)}) still answers`);
    }
    console.log("check-mcp sheets: a finished sweep's contact sheet comes back as a picture over HTTP");
  } finally {
    await pcClient.close();
    rmSync(join(root, "out", "videos", testSlug), { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
}

// The Railway HTTP mode (mcp/http.mjs): no token, no service; the light tools only, behind the token.
const token = "check-mcp-token-0123456789abcdef";
const port = 18000 + Math.floor(Math.random() * 1000);
const http = spawn(process.execPath, [join(root, "mcp/http.mjs")], { cwd: root, env: { ...process.env, MCP_TOKEN: token, PORT: String(port) }, stdio: "ignore" });
try {
  const noToken = spawnSync(process.execPath, [join(root, "mcp/http.mjs")], { cwd: root, env: { ...process.env, MCP_TOKEN: "" }, encoding: "utf8" });
  assert.equal(noToken.status, 1, "http.mjs refuses to start without MCP_TOKEN");
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100 && !(await fetch(`${base}/health`).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal((await fetch(`${base}/mcp`, { method: "POST" })).status, 401, "no token: 401");
  assert.equal((await fetch(`${base}/mcp/${"x".repeat(token.length)}`, { method: "POST" })).status, 401, "wrong path token: 401");
  const remote = new Client({ name: "check-mcp-http", version: "1.0.0" });
  await remote.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/${token}`)));
  const names = (await remote.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["list_designs", "research", "visuals"], "remote keeps only the tools that need no footage");
  const remoteImage = await remote.callTool({ name: "visuals", arguments: { action: "image", prompt: "x", slug: "x" } });
  assert.ok(remoteImage.isError, "remote visuals is stock search only");
  const remoteAsk = await remote.callTool({ name: "research", arguments: { mode: "ask", query: "RBA cash rate?" } });
  assert.ok(JSON.stringify(remoteAsk.content).includes("fake answer"), "remote research ask returns the answer file");
  const watch = await remote.callTool({ name: "research", arguments: { mode: "watch", query: "https://x", slug: "x" } });
  assert.ok(watch.isError, "remote research refuses watch");
  // A line break in the query once forged an "out/../package.json" line that the remote answer then read.
  const forged = await remote.callTool({ name: "research", arguments: { mode: "comments", query: "https://youtu.be/x\nout/../package.json", slug: "x" } });
  assert.ok(forged.isError && !JSON.stringify(forged.content).includes('"name": "finhub-video"'), "remote research refuses a control character and returns no repo file");
  await remote.close();
  const big = await fetch(`${base}/mcp/${token}`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: { pad: "x".repeat(20_000) } }) });
  assert.equal(big.status, 413, "a body over 16 KB is refused");
  console.log("check-mcp http: token required, light tools only");

  // A malformed request line once made new URL throw outside any try and killed the process.
  const raw = await new Promise((done) => {
    const sock = connect(port, "127.0.0.1", () => sock.end("GET //[ HTTP/1.1\r\nHost: x\r\n\r\n"));
    let got = "";
    sock.on("data", (d) => (got += d));
    sock.on("close", () => done(got));
    sock.on("error", () => done(got));
  });
  assert.match(raw, /^HTTP\/1\.1 400/, "a malformed URL gets 400");
  assert.ok((await fetch(`${base}/health`)).ok, "the server is still up after a malformed URL");

  // OAuth sign-in (mcp/oauth.mjs), the way claude.ai runs it: 401 -> metadata -> register -> authorize -> token.
  const unauth = await fetch(`${base}/mcp`, { method: "POST" });
  assert.match(unauth.headers.get("www-authenticate") ?? "", /resource_metadata="http:\/\/127\.0\.0\.1:\d+\/\.well-known\/oauth-protected-resource"/, "401 points at the sign-in metadata");
  const prm = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json();
  const asm = await (await fetch(`${prm.authorization_servers[0]}/.well-known/oauth-authorization-server`)).json();
  assert.deepEqual(asm.code_challenge_methods_supported, ["S256"], "PKCE S256 only");
  const post = (url, body, form = true) =>
    fetch(url, { method: "POST", redirect: "manual", headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json" }, body: form ? new URLSearchParams(body) : JSON.stringify(body) });
  const callback = "https://claude.ai/api/mcp/auth_callback";
  assert.equal((await post(asm.registration_endpoint, { redirect_uris: ["https://evil.example/cb"] }, false)).status, 400, "register refuses a redirect outside the allowlist");
  const reg = await post(asm.registration_endpoint, { redirect_uris: [callback], client_name: "check" }, false);
  assert.equal(reg.status, 201, "register 201");
  const { client_id } = await reg.json();
  const verifier = "check-mcp-verifier-0123456789abcdef0123456789abcdef";
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authz = { client_id, redirect_uri: callback, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", state: "s1" };
  const form = await fetch(`${asm.authorization_endpoint}?${new URLSearchParams(authz)}`);
  assert.ok(form.status === 200 && /name="mcp_token"/.test(await form.text()), "authorize shows the MCP_TOKEN form");
  assert.equal((await fetch(`${asm.authorization_endpoint}?${new URLSearchParams({ ...authz, redirect_uri: "https://claude.ai/other" })}`)).status, 400, "authorize refuses an unregistered redirect");
  assert.equal((await fetch(`${asm.authorization_endpoint}?${new URLSearchParams({ ...authz, code_challenge_method: "plain" })}`)).status, 400, "authorize requires S256");
  const wrong = await post(asm.authorization_endpoint, { ...authz, mcp_token: "x".repeat(token.length) });
  assert.ok(wrong.status === 401 && !wrong.headers.get("location"), "a wrong MCP_TOKEN gets no code");
  const ok = await post(asm.authorization_endpoint, { ...authz, mcp_token: token });
  const loc = new URL(ok.headers.get("location") ?? "http://x/");
  assert.ok(ok.status === 302 && loc.origin + loc.pathname === callback && loc.searchParams.get("state") === "s1", "the right MCP_TOKEN redirects back with code and state");
  const code = loc.searchParams.get("code");
  const exchange = (extra) => post(asm.token_endpoint, { grant_type: "authorization_code", code, client_id, redirect_uri: callback, code_verifier: verifier, ...extra });
  assert.equal((await exchange({ code_verifier: `${verifier}x` })).status, 400, "a wrong PKCE verifier is refused");
  const tok = await exchange();
  assert.equal(tok.status, 200, "code -> tokens");
  const { access_token, refresh_token } = await tok.json();
  assert.equal((await exchange()).status, 400, "a code works once");
  assert.equal((await post(asm.token_endpoint, { grant_type: "authorization_code", code: access_token, client_id, redirect_uri: callback, code_verifier: verifier })).status, 400, "an access token is not a code");
  const signedIn = new Client({ name: "check-mcp-oauth", version: "1.0.0" });
  await signedIn.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${access_token}` } } }));
  assert.deepEqual((await signedIn.listTools()).tools.map((t) => t.name).sort(), ["list_designs", "research", "visuals"], "the access token opens /mcp");
  await signedIn.close();
  const forgedToken = `${access_token.split(".")[0]}.${"A".repeat(43)}`;
  assert.equal((await fetch(`${base}/mcp`, { method: "POST", headers: { authorization: `Bearer ${forgedToken}` } })).status, 401, "a forged token is refused");
  assert.equal((await fetch(`${base}/mcp`, { method: "POST", headers: { authorization: `Bearer ${refresh_token}` } })).status, 401, "a refresh token does not open /mcp");
  const again = await post(asm.token_endpoint, { grant_type: "refresh_token", refresh_token, client_id });
  assert.ok(again.status === 200 && (await again.json()).access_token, "refresh gives a new access token");
  console.log("check-mcp oauth: register, PKCE sign-in, single-use code, refresh, forged tokens refused");
} finally {
  http.kill();
}

// The PC connector (npm run mcp:pc = http.mjs --all): every tool over HTTP, behind the same sign-in.
const pcPort = 19000 + Math.floor(Math.random() * 1000);
const pc = spawn(process.execPath, [join(root, "mcp/http.mjs"), "--all"], { cwd: root, env: { ...process.env, MCP_TOKEN: token, PORT: String(pcPort) }, stdio: "ignore" });
try {
  const pcBase = `http://127.0.0.1:${pcPort}`;
  for (let i = 0; i < 100 && !(await fetch(`${pcBase}/health`).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal((await fetch(`${pcBase}/mcp`, { method: "POST" })).status, 401, "PC connector: no token, 401");
  const full = new Client({ name: "check-mcp-pc", version: "1.0.0" });
  await full.connect(new StreamableHTTPClientTransport(new URL(`${pcBase}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));
  const fullTools = (await full.listTools()).tools;
  assert.deepEqual(fullTools.map((t) => t.name).sort(), ["audio", "edit", "list_designs", "preflight", "prep", "render_video", "research", "review", "still", "video_status", "visuals"], "--all serves every tool");
  assert.ok(fullTools.find((t) => t.name === "research").inputSchema.properties.mode.enum.includes("watch"), "--all keeps research watch");
  const badStill = await full.callTool({ name: "still", arguments: { composition: "MortgageReel", frame: 0, slug: "../etc" } });
  assert.ok(badStill.isError, "PC connector still refuses a bad slug");
  await full.close();
  // Loopback only: this machine's LAN address must not reach it (the tunnel connects on 127.0.0.1).
  const lan = Object.values(networkInterfaces()).flat().find((n) => n.family === "IPv4" && !n.internal)?.address;
  if (lan) assert.equal(await fetch(`http://${lan}:${pcPort}/health`).then(() => "open", () => "closed"), "closed", `--all must not answer on ${lan}`);
  console.log(`check-mcp pc: --all serves every tool behind the token, on loopback only${lan ? "" : " (no LAN address to try)"}`);
} finally {
  pc.kill();
}
