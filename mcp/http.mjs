// The MCP server over HTTP for Railway (mcp/Dockerfile, railway.json): the light tools only
// (list_designs, research trending/topic/comments), so claude.ai web and the phone app can reach them.
// Editing, stills and renders stay on Daniel's PC over stdio (docs/agents/plugin-and-mcp.md).
//
// Every call needs MCP_TOKEN: as "Authorization: Bearer <token>", in the path /mcp/<token>, or through
// the OAuth sign-in in mcp/oauth.mjs (claude.ai connectors: a 401 starts it, Daniel pastes MCP_TOKEN
// once and the connector then sends a signed access token). Without MCP_TOKEN the server refuses to start.
//   MCP_TOKEN=... PORT=8080 node mcp/http.mjs        GET /health answers without the token.
import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { makeServer } from "./finhub-video-server.mjs";
import { makeOAuth } from "./oauth.mjs";

const TOKEN = process.env.MCP_TOKEN ?? "";
if (TOKEN.length < 24) {
  console.error("MCP_TOKEN is not set (or shorter than 24 characters); refusing to serve without it.");
  process.exit(1);
}
const oauth = makeOAuth(TOKEN);
const same = (a) => Buffer.byteLength(a) === Buffer.byteLength(TOKEN) && timingSafeEqual(Buffer.from(a), Buffer.from(TOKEN));

const authorised = (req, path) => {
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  if (path === "/mcp") return Boolean(bearer) && (same(bearer) || oauth.verifyAccess(bearer));
  return path.startsWith("/mcp/") && same(path.slice(5));
};

// A malformed request line (GET //[) makes new URL throw: answer 400, never let it reach the process.
process.on("unhandledRejection", (err) => console.error(err));
createServer(async (req, res) => {
  let path;
  try {
    path = new URL(req.url ?? "/", "http://x").pathname;
  } catch {
    return res.writeHead(400).end();
  }
  if (path === "/health") return res.writeHead(200, { "content-type": "text/plain" }).end("ok");
  try {
    if (await oauth.handle(req, res, path)) return;
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(400).end();
    return;
  }
  if (path !== "/mcp" && !path.startsWith("/mcp/")) return res.writeHead(404).end();
  // The WWW-Authenticate header points an OAuth client (claude.ai) at the sign-in metadata.
  if (!authorised(req, path)) return res.writeHead(401, { "www-authenticate": oauth.challenge(req) }).end();
  // Stateless: a fresh server and transport per request, nothing kept between calls.
  const server = makeServer({ remote: true });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 16 * 1024 });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end();
  }
}).listen(Number(process.env.PORT ?? 8080), () => console.log(`finhub-video MCP over HTTP on :${process.env.PORT ?? 8080}`));
