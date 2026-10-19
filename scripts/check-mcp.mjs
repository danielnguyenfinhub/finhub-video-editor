// Self-check for mcp/finhub-video-server.mjs: it starts over stdio, lists exactly the six tools,
// answers list_designs and video_status, and refuses a slug that could reach outside the repo
// (preflight and still; still takes a slug so it renders the video being edited).
// Renders nothing. Run: node scripts/check-mcp.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { connect } from "node:net";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const root = join(import.meta.dirname, "..");
const client = new Client({ name: "check-mcp", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(root, "mcp/finhub-video-server.mjs")], cwd: root, stderr: "ignore" }));
try {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["list_designs", "preflight", "render_video", "research", "still", "video_status"]);
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
  console.log(`check-mcp: ${tools.length} tools, ${designs.length} designs, bad slugs refused`);
} finally {
  await client.close();
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
  assert.deepEqual(names, ["list_designs", "research"], "remote keeps only the tools that need no footage");
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
  assert.deepEqual((await signedIn.listTools()).tools.map((t) => t.name).sort(), ["list_designs", "research"], "the access token opens /mcp");
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
