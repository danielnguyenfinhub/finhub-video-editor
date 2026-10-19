// Self-check for mcp/finhub-video-server.mjs: it starts over stdio, lists exactly the six tools,
// answers list_designs and video_status, and refuses a slug that could reach outside the repo
// (preflight and still; still takes a slug so it renders the video being edited).
// Renders nothing. Run: node scripts/check-mcp.mjs
import assert from "node:assert/strict";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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
