// Request guards for review/server.ts, kept free of other imports so
// review/check-server.mjs can test them directly.
import type { IncomingHttpHeaders } from "node:http";
import { sep } from "node:path";
import type { Readable } from "node:stream";

// A web page open in the browser can POST to 127.0.0.1 (CSRF) or reach it
// through a DNS-rebinding name: only the page's own origin gets through.
// A browser marking the request cross-site (Sec-Fetch-Site) is refused too;
// same-origin, same-site, none and no header at all (curl, old browsers) pass.
export const sameOrigin = (headers: IncomingHttpHeaders, port: number) => {
  const hosts = [`localhost:${port}`, `127.0.0.1:${port}`];
  if (!hosts.includes(headers.host ?? "")) return false;
  if (headers["sec-fetch-site"] === "cross-site") return false;
  return headers.origin === undefined || hosts.some((h) => headers.origin === `http://${h}`);
};

// `file` is strictly inside `base` (not `base` itself, not a sibling like public-x).
export const inside = (base: string, file: string) => file.startsWith(base.endsWith(sep) ? base : base + sep);

// The body as UTF-8, decoded once so a character split across chunks survives.
export const readBody = (req: Readable, max: number) =>
  new Promise<string>((ok, fail) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    req.on("data", (c: Buffer) => {
      chunks.push(c);
      bytes += c.length;
      if (bytes > max) fail(new Error("edit.json is larger than 1 MB"));
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });
