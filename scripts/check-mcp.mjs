// Self-check for mcp/finhub-video-server.mjs: it starts over stdio, lists exactly the six tools,
// answers list_designs and video_status, and refuses a slug that could reach outside the repo
// (preflight and still; still takes a slug so it renders the video being edited).
// Renders nothing. Run: node scripts/check-mcp.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { connect } from "node:net";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
}
const client = new Client({ name: "check-mcp", version: "1.0.0" });
// FINHUB_FAKE_PROVIDERS: scripts/providers.mjs answers with canned data, so nothing is spent or sent.
process.env.FINHUB_FAKE_PROVIDERS = "1";
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(root, "mcp/finhub-video-server.mjs")], cwd: root, stderr: "ignore", env: { ...process.env } }));
const testSlug = "zz-check-mcp";
try {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["audio", "list_designs", "preflight", "render_video", "research", "still", "video_status", "visuals"]);
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
  console.log(`check-mcp: ${tools.length} tools, ${designs.length} designs, bad slugs refused, spend gate holds`);
} finally {
  await client.close();
  for (const d of [join(root, "public", "videos", testSlug), join(root, "out", "videos", testSlug)]) rmSync(d, { recursive: true, force: true });
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
  assert.deepEqual(fullTools.map((t) => t.name).sort(), ["audio", "list_designs", "preflight", "render_video", "research", "still", "video_status", "visuals"], "--all serves every tool");
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
