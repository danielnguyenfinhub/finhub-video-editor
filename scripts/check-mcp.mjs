// Self-check for mcp/finhub-video-server.mjs: it starts over stdio, lists exactly the six tools,
// answers list_designs and video_status, and refuses a slug that could reach outside the repo
// (preflight and still; still takes a slug so it renders the video being edited).
// Renders nothing. Run: node scripts/check-mcp.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
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
  await remote.close();
  console.log("check-mcp http: token required, light tools only");
} finally {
  http.kill();
}
