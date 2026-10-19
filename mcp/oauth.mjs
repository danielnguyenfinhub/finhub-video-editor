// OAuth 2.1 sign-in for the Railway MCP server, the flow the MCP authorization spec asks of a remote
// server: protected-resource metadata (RFC 9728), authorization-server metadata (RFC 8414), dynamic
// client registration (RFC 7591), authorization code with PKCE S256, and refresh tokens.
// claude.ai connectors cannot send a header: on a 401 they run this flow, Daniel pastes MCP_TOKEN once
// on /authorize, and the connector keeps a 1-hour access token plus a 30-day refresh token.
//
// Stateless (Railway has no volume): client ids, codes and tokens are HMAC-signed payloads keyed on
// MCP_TOKEN, so changing MCP_TOKEN signs every client out. Node stdlib only.
// ponytail: used codes and failed sign-ins are remembered in memory, so one replica; move them to a
// store if the service ever runs more than one.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ACCESS_S = 60 * 60;
const REFRESH_S = 30 * 24 * 60 * 60;
const CODE_S = 5 * 60;
const MAX_FAILS = 10; // wrong MCP_TOKEN tries per IP per 15 minutes
const MAX_FAILS_ALL = 100; // and from all addresses together
const FAIL_WINDOW_MS = 15 * 60_000;

const b64 = (b) => Buffer.from(b).toString("base64url");
const sha = (s) => createHash("sha256").update(s).digest();
const now = () => Math.floor(Date.now() / 1000);

// claude.ai's connector callback, plus local callbacks for Claude Desktop and Claude Code.
export const redirectOk = (u) => {
  try {
    const x = new URL(u);
    if (x.username || x.password || x.hash) return false;
    if (x.protocol === "https:") return ["claude.ai", "claude.com"].includes(x.hostname) && !x.port && x.pathname === "/api/mcp/auth_callback";
    return x.protocol === "http:" && ["localhost", "127.0.0.1"].includes(x.hostname);
  } catch {
    return false;
  }
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const json = (res, status, body, headers = {}) =>
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers }).end(JSON.stringify(body));

const readBody = (req) =>
  new Promise((done, fail) => {
    let size = 0;
    const parts = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 16 * 1024) {
        req.destroy();
        fail(new Error("body too large"));
      } else parts.push(c);
    });
    req.on("end", () => done(Buffer.concat(parts).toString("utf8")));
    req.on("error", fail);
  });

export const makeOAuth = (token) => {
  const key = sha(`finhub-oauth:${token}`);
  const tokenHash = sha(token);
  const tokenOk = (s) => typeof s === "string" && timingSafeEqual(sha(s), tokenHash);

  // "<payload>.<hmac>"; typ keeps a code from being used as a token and the other way round.
  const sign = (typ, data, ttl) => {
    const p = b64(JSON.stringify({ ...data, typ, ...(ttl ? { exp: now() + ttl } : {}) }));
    return `${p}.${b64(createHmac("sha256", key).update(p).digest())}`;
  };
  const open = (typ, s) => {
    if (typeof s !== "string" || s.length > 8192) return null;
    const [p, mac, extra] = s.split(".");
    if (!p || !mac || extra !== undefined) return null;
    const want = createHmac("sha256", key).update(p).digest();
    const got = Buffer.from(mac, "base64url");
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    try {
      const d = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
      return d.typ === typ && (!d.exp || d.exp > now()) ? d : null;
    } catch {
      return null;
    }
  };

  const usedCodes = new Map(); // jti -> exp: a code works once
  const fails = new Map(); // ip -> { n, since }; key "*" counts every address together
  const over = (k, max) => {
    const f = fails.get(k);
    if (f && Date.now() - f.since > FAIL_WINDOW_MS) fails.delete(k);
    return (fails.get(k)?.n ?? 0) >= max;
  };
  const blocked = (ip) => over(ip, MAX_FAILS) || over("*", MAX_FAILS_ALL);
  const failed = (ip) => {
    for (const k of [ip, "*"]) {
      const f = fails.get(k) ?? { n: 0, since: Date.now() };
      f.n++;
      fails.set(k, f);
    }
    if (fails.size > 10_000) for (const k of fails.keys()) if (k !== "*") fails.delete(k);
  };

  const base = (req) => {
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
    const host = /^[a-z0-9.-]+(:\d+)?$/i.test(req.headers.host ?? "") ? req.headers.host : "localhost";
    // Railway terminates TLS: https unless this is a local run (check-mcp, Claude Desktop on the PC).
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const proto = !local || String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https" ? "https" : "http";
    return `${proto}://${host}`;
  };
  // The rightmost x-forwarded-for entry is the one Railway's proxy added; the leftmost is the client's to write.
  // Behind a tunnel that adds none (the PC connector), every attempt is 127.0.0.1: the lock is then global.
  const ipOf = (req) => String(req.headers["x-forwarded-for"] ?? "").split(",").pop().trim() || req.socket.remoteAddress || "?";

  // A refresh keeps the first sign-in's end date (e0): 30 days after pasting MCP_TOKEN, sign in again.
  const tokens = (cid, e0 = now() + REFRESH_S) => ({
    access_token: sign("access", { c: cid }, ACCESS_S),
    token_type: "Bearer",
    expires_in: ACCESS_S,
    refresh_token: sign("refresh", { c: cid, e0 }, Math.max(1, e0 - now())),
  });

  // The /authorize request, checked the same way on GET (show the form) and POST (sign in).
  const authRequest = (p) => {
    const client = open("client", p.get("client_id"));
    const redirect = p.get("redirect_uri") ?? "";
    if (!client || !client.r.includes(redirect) || !redirectOk(redirect)) return { error: "unknown client or redirect_uri" };
    if (p.get("response_type") !== "code") return { error: "response_type must be code" };
    if (p.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(p.get("code_challenge") ?? ""))
      return { error: "PKCE with code_challenge_method=S256 is required" };
    return { cid: p.get("client_id"), redirect, challenge: p.get("code_challenge"), state: p.get("state") ?? "" };
  };

  const page = (res, status, p, error) => {
    const hidden = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"]
      .filter((k) => p.has(k))
      .map((k) => `<input type="hidden" name="${k}" value="${esc(p.get(k))}">`)
      .join("");
    res
      .writeHead(status, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
      })
      .end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finance Hub video tools: sign in</title><style>body{font:16px system-ui,sans-serif;max-width:26rem;margin:4rem auto;padding:0 1rem;color:#111;background:#fff}
input[type=password]{width:100%;padding:.6rem;font-size:1rem;box-sizing:border-box}button{margin-top:1rem;padding:.6rem 1.2rem;font-size:1rem}p.e{color:#b00020}</style></head>
<body><h1>Finance Hub video tools</h1><p>A Claude connector (${esc(new URL(p.get("redirect_uri")).host)}) asks to use the Finance Hub video tools.</p>
<p><strong>Only continue if you clicked Connect in your own Claude account just now.</strong> If someone sent you this link, close the page.</p>
<p>Paste this server's <code>MCP_TOKEN</code>: from Railway (finhub-video-editor, Variables), or from <code>.env</code> on the PC for the PC connector.</p>
${error ? `<p class="e">${esc(error)}</p>` : ""}<form method="post" action="/authorize">${hidden}
<label for="t">MCP_TOKEN</label><input id="t" type="password" name="mcp_token" autocomplete="current-password" required autofocus>
<button type="submit">Connect</button></form></body></html>`);
  };

  const handle = async (req, res, path) => {
    const b = base(req);
    if (req.method === "GET" && (path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-protected-resource/mcp")) {
      json(res, 200, { resource: `${b}/mcp`, authorization_servers: [b], bearer_methods_supported: ["header"] });
      return true;
    }
    if (req.method === "GET" && path === "/.well-known/oauth-authorization-server") {
      json(res, 200, {
        issuer: b,
        authorization_endpoint: `${b}/authorize`,
        token_endpoint: `${b}/token`,
        registration_endpoint: `${b}/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
      });
      return true;
    }
    if (path === "/register" && req.method === "POST") {
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        json(res, 400, { error: "invalid_client_metadata", error_description: "JSON body required" });
        return true;
      }
      const r = body?.redirect_uris;
      if (!Array.isArray(r) || !r.length || r.length > 5 || !r.every((u) => typeof u === "string" && redirectOk(u))) {
        json(res, 400, { error: "invalid_redirect_uri", error_description: "only the claude.ai connector callback or a localhost callback" });
        return true;
      }
      json(res, 201, {
        client_id: sign("client", { r }),
        client_id_issued_at: now(),
        redirect_uris: r,
        client_name: String(body.client_name ?? "").slice(0, 100),
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      });
      return true;
    }
    if (path === "/authorize" && (req.method === "GET" || req.method === "POST")) {
      let p;
      try {
        p = req.method === "GET" ? new URL(req.url, "http://x").searchParams : new URLSearchParams(await readBody(req));
      } catch {
        res.writeHead(400).end();
        return true;
      }
      const a = authRequest(p);
      // A bad client or redirect is never redirected to: the error stays on this page.
      if (a.error) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end(a.error);
        return true;
      }
      if (req.method === "GET") {
        page(res, 200, p);
        return true;
      }
      const ip = ipOf(req);
      if (blocked(ip)) {
        page(res, 429, p, "Too many wrong tokens. Wait 15 minutes and try again.");
        return true;
      }
      if (!tokenOk(p.get("mcp_token"))) {
        failed(ip);
        page(res, 401, p, "That is not this server's MCP_TOKEN.");
        return true;
      }
      const code = sign("code", { c: a.cid, r: a.redirect, ch: a.challenge, j: b64(randomBytes(12)) }, CODE_S);
      const to = new URL(a.redirect);
      to.searchParams.set("code", code);
      if (a.state) to.searchParams.set("state", a.state);
      res.writeHead(302, { location: to.toString(), "cache-control": "no-store" }).end();
      return true;
    }
    if (path === "/token" && req.method === "POST") {
      let p;
      try {
        p = new URLSearchParams(await readBody(req));
      } catch {
        json(res, 400, { error: "invalid_request" });
        return true;
      }
      const bad = (d) => json(res, 400, { error: "invalid_grant", error_description: d });
      if (p.get("grant_type") === "authorization_code") {
        const code = open("code", p.get("code"));
        if (!code) return bad("unknown or expired code"), true;
        if (usedCodes.has(code.j)) return bad("code already used"), true;
        if (p.get("client_id") !== code.c || p.get("redirect_uri") !== code.r) return bad("client_id or redirect_uri does not match"), true;
        const verifier = p.get("code_verifier") ?? "";
        if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || b64(sha(verifier)) !== code.ch) return bad("PKCE code_verifier does not match"), true;
        for (const [j, exp] of usedCodes) if (exp < now()) usedCodes.delete(j);
        usedCodes.set(code.j, code.exp);
        json(res, 200, tokens(code.c));
        return true;
      }
      if (p.get("grant_type") === "refresh_token") {
        const r = open("refresh", p.get("refresh_token"));
        if (!r || !(r.e0 > now()) || (p.has("client_id") && p.get("client_id") !== r.c)) return bad("unknown or expired refresh_token"), true;
        json(res, 200, tokens(r.c, r.e0));
        return true;
      }
      json(res, 400, { error: "unsupported_grant_type" });
      return true;
    }
    return false;
  };

  return {
    handle,
    verifyAccess: (bearer) => Boolean(open("access", bearer)),
    challenge: (req) => `Bearer resource_metadata="${base(req)}/.well-known/oauth-protected-resource"`,
  };
};
