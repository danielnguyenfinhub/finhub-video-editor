// One command that drives the real MCP server (stdio, as Claude Desktop and Cowork start it) through its
// tools on one of Daniel's videos and writes a PASS / FAIL / SKIP report to paste back to Claude.
// Nothing it does changes the video: edit patch is called without confirm (a preview only), and the
// matte only runs as a bench (it saves nothing). A render runs only with --render.
//   npm run mcp:smoke -- <slug> [--matte] [--render]
// Writes out/mcp/smoke-<slug>.md. Steps that need the footage (source.mp4) are SKIP without it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
if (!slug || !existsSync(join(ROOT, "public/videos", slug, "edit.json"))) {
  console.error("Usage: npm run mcp:smoke -- <slug> [--matte] [--render]   (a video with public/videos/<slug>/edit.json)");
  process.exit(2);
}
const { recordingPath } = await import(pathToFileURL(join(ROOT, "src/mortgage/recording.ts")).href);
const edit = JSON.parse(readFileSync(join(ROOT, "public/videos", slug, "edit.json"), "utf8"));
const at = (f) => join(ROOT, "public", recordingPath(slug, edit.source, f));
const footage = existsSync(at("source.mp4"));
const words = existsSync(at("words.json")) ? JSON.parse(readFileSync(at("words.json"), "utf8")) : [];

const client = new Client({ name: "mcp-smoke", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(ROOT, "mcp/finhub-video-server.mjs")], cwd: ROOT, stderr: "ignore" }));
const rows = [];
const call = (name, a) => client.callTool({ name, arguments: a }, undefined, { timeout: 15 * 60_000 });
const first = (r) => (r.content?.[0]?.text ?? "").split("\n").slice(0, 3).join(" | ").slice(0, 160);
const step = async (name, fn) => {
  const t = Date.now();
  try {
    const [state, note] = await fn();
    rows.push([name, state, Math.round((Date.now() - t) / 1000), note]);
  } catch (e) {
    rows.push([name, "FAIL", Math.round((Date.now() - t) / 1000), e.message]);
  }
  console.log(`${rows.at(-1)[1].padEnd(4)} ${name}`);
};
const ok = (r, test = () => true) => [!r.isError && test(r) ? "PASS" : "FAIL", first(r)];
// A job answers with its id; follow it until it finishes (the same polling Cowork does).
const job = async (r, minutes) => {
  const id = /job ([0-9a-f]{8})/.exec(r.content?.[0]?.text ?? "")?.[1];
  if (!id) return r;
  for (const end = Date.now() + minutes * 60_000; Date.now() < end; await new Promise((s) => setTimeout(s, 10_000))) {
    const s = await call("video_status", { job: id });
    if (/finished after/.test(s.content[0].text)) return s;
  }
  return { content: [{ type: "text", text: `job ${id} still running after ${minutes} min` }], isError: true };
};

try {
  await step("tools listed (11)", async () => {
    const n = (await client.listTools()).tools.length;
    return [n === 11 ? "PASS" : "FAIL", `${n} tools`];
  });
  await step("video_status", async () => ok(await call("video_status", { slug })));
  await step("edit get", async () => ok(await call("edit", { action: "get", slug, fields: ["title", "design", "pacing"] }), (r) => /^edit\.json /.test(r.content[0].text)));
  const phrase = words.slice(0, 2).map((w) => w.text.trim()).join(" ");
  await step("edit words (find)", async () => (phrase ? ok(await call("edit", { action: "words", slug, find: phrase }), (r) => /^\d+-\d+ /.test(r.content[0].text)) : ["SKIP", "no words.json"]));
  // A preview only: no confirm is sent, so edit.json stays as it is.
  await step("edit patch (preview only)", async () => {
    const r = await call("edit", { action: "patch", slug, ops: [{ op: "set", path: "subtitle", value: `${edit.subtitle ?? ""} ` }], check: false });
    return [/confirm: "/.test(r.content[0].text) || /pacing must be/.test(r.content[0].text) ? "PASS" : "FAIL", first(r)];
  });
  await step("prep template", async () => ok(await call("prep", { action: "template", slug })));
  await step("review chapters", async () => ok(await call("review", { action: "chapters", slug })));
  await step("review srt", async () => ok(await call("review", { action: "srt", slug })));
  if (!footage) for (const name of ["still", "preflight", "prep matte bench", "render + sweep"]) rows.push([name, "SKIP", 0, "no source.mp4 here"]);
  else {
    await step("still (frame 30)", async () => ok(await call("still", { composition: "MortgageReel", frame: 30, slug })));
    await step("preflight", async () => ok(await call("preflight", { slug })));
    if (args.includes("--matte")) await step("prep matte bench 10", async () => ok(await job(await call("prep", { action: "matte", slug, bench: 10 }), 20)));
    if (args.includes("--render")) {
      await step("render_video", async () => ok(await job(await call("render_video", { slug }), 120)));
      await step("review sweep", async () => ok(await job(await call("review", { action: "sweep", slug }), 30)));
    }
  }
} finally {
  await client.close();
}

const report = [
  `# MCP smoke test: ${slug}`,
  "",
  `${new Date().toISOString()} · node ${process.version} · ${process.platform} · footage: ${footage ? "yes" : "no"}`,
  "",
  "| Step | Result | Seconds | Note |",
  "|---|---|---|---|",
  ...rows.map(([n, s, t, note]) => `| ${n} | ${s} | ${t} | ${String(note).replace(/\|/g, "/").replace(/\n/g, " ")} |`),
  "",
].join("\n");
mkdirSync(join(ROOT, "out/mcp"), { recursive: true });
const file = join(ROOT, "out/mcp", `smoke-${slug}.md`);
writeFileSync(file, report);
console.log(`\n${report}\nWrote ${file}: paste it to Claude.`);
process.exit(rows.some((r) => r[1] === "FAIL") ? 1 : 0);
