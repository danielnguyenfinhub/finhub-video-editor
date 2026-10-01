// Check for review/server.ts. Run: node review/check-server.mjs (exit 1 on failure).
// Starts the real server on a free port with REVIEW_PUBLIC pointing at a temp
// public/ (one fake video, a sibling public-x/, a 100-byte file), so nothing
// real is read, saved or rendered, then tests the guards in review/guard.ts directly.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = fileURLToPath(new URL(".", import.meta.url));
const errors = [];
const expect = (what, got, want) => got !== want && errors.push(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// A temp public/: video "zz-check" (edit.json + empty recording files), and
// public-x/f.txt next to it, which must never be served.
const tmp = mkdtempSync(join(tmpdir(), "review-check-"));
const pub = join(tmp, "public");
const video = join(pub, "videos", "zz-check");
mkdirSync(video, { recursive: true });
writeFileSync(join(video, "edit.json"), `${JSON.stringify({ title: "Lãi suất" })}\n`);
writeFileSync(join(video, "source.mp4"), "");
writeFileSync(join(video, "words.json"), "[]");
writeFileSync(join(pub, "f.bin"), Buffer.alloc(100, 1));
mkdirSync(join(tmp, "public-x"));
writeFileSync(join(tmp, "public-x", "f.txt"), "SECRET");
const NO_VIDEO = "zz-no-such-video-check"; // never a real slug, so nothing can start

// 1. CSRF / DNS rebinding: only the page's own Host and Origin are served.
const bundle = join(here, "dist", "check-server.cjs");
await esbuild.build({ entryPoints: [join(here, "server.ts")], outfile: bundle, bundle: true, format: "cjs", platform: "node", logLevel: "warning" });
const proc = spawn(process.execPath, [bundle], { env: { ...process.env, REVIEW_PORT: "0", REVIEW_PUBLIC: pub } });
let stderr = "";
proc.stderr.on("data", (b) => (stderr += b));
try {
  const port = await new Promise((ok, fail) => {
    let out = "";
    proc.stdout.on("data", (b) => {
      out += b;
      const m = /localhost:(\d+)/.exec(out);
      if (m) {
        clearTimeout(timer);
        ok(Number(m[1]));
      }
    });
    proc.on("exit", () => fail(new Error(`server exited: ${out}`)));
    const timer = setTimeout(() => fail(new Error(`server did not start: ${out}`)), 10_000);
  });
  // fetch() cannot set Host, so use http.request.
  const { request } = await import("node:http");
  // Resolves to the status ("reset" if the server cut the connection, "down"
  // if it is gone). `chunks` are written one at a time with a pause between.
  const call = (method, path, headers, chunks = method === "POST" ? ["{}"] : []) =>
    new Promise((ok) => {
      const r = request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
        res.resume();
        res.on("end", () => ok(res.statusCode));
        res.on("error", () => ok("reset"));
      });
      r.on("error", (e) => ok(e.code === "ECONNREFUSED" ? "down" : "reset"));
      (async () => {
        for (const c of chunks) {
          r.write(c);
          await new Promise((t) => setTimeout(t, 30));
        }
        r.end();
      })();
    });
  const own = `localhost:${port}`;
  const mine = { host: own };
  expect("GET /api/videos, own Host", await call("GET", "/api/videos", mine), 200);
  expect("GET /api/videos, Host 127.0.0.1", await call("GET", "/api/videos", { host: `127.0.0.1:${port}` }), 200);
  expect("GET /api/videos, rebinding Host", await call("GET", "/api/videos", { host: `evil.example:${port}` }), 403);
  expect("GET /public/, rebinding Host", await call("GET", "/public/f.bin", { host: `evil.example:${port}` }), 403);
  expect("POST edit, foreign Origin", await call("POST", `/api/edit/${NO_VIDEO}`, { host: own, origin: "http://evil.example", "content-type": "text/plain" }), 403);
  expect("POST render, foreign Origin", await call("POST", `/api/render/${NO_VIDEO}`, { host: own, origin: "http://evil.example" }), 403);
  expect("POST render, Origin null", await call("POST", `/api/render/${NO_VIDEO}`, { host: own, origin: "null" }), 403);
  // Own origin passes the guard (404: no such video, nothing started).
  expect("POST render, own Origin", await call("POST", `/api/render/${NO_VIDEO}`, { host: own, origin: `http://${own}` }), 404);
  // Sec-Fetch-Site: only a cross-site request is refused.
  for (const [site, want] of [["cross-site", 403], ["same-origin", 200], ["same-site", 200], ["none", 200]])
    expect(`GET /api/videos, Sec-Fetch-Site ${site}`, await call("GET", "/api/videos", { ...mine, "sec-fetch-site": site }), want);

  // 2. Range requests: bad ranges get 416 and the server keeps answering.
  for (const range of ["bytes=5-2", "bytes=-", "bytes=-0", "bytes=100-", "bytes=999999999999-"])
    expect(`GET f.bin, Range ${range}`, await call("GET", "/public/f.bin", { ...mine, range }), 416);
  expect("GET f.bin, Range bytes=0-9", await call("GET", "/public/f.bin", { ...mine, range: "bytes=0-9" }), 206);
  expect("GET f.bin, Range bytes=-500 (whole file)", await call("GET", "/public/f.bin", { ...mine, range: "bytes=-500" }), 206);
  expect("GET /api/videos after the bad ranges", await call("GET", "/api/videos", mine), 200);

  // 3. Path containment through the server: a sibling folder sharing the prefix.
  expect("GET /public/..%2fpublic-x/f.txt", await call("GET", "/public/..%2fpublic-x/f.txt", mine), 404);
  expect("GET /public/..%2f..%2fpublic-x/f.txt", await call("GET", "/public/..%2f..%2fpublic-x/f.txt", mine), 404);

  // 4. A large Vietnamese edit.json, sent in chunks cut inside "ệ" (3 bytes),
  // is saved without U+FFFD.
  const sent = { title: "Lãi suất cố định", notes: Array.from({ length: 2000 }, (_, i) => `ghi chú ${i}: ệệệệ ữ ặ`) };
  const raw = Buffer.from(JSON.stringify(sent), "utf8");
  const chunks = [];
  for (let at = 0, n = 0; at < raw.length; n++) {
    const next = n < 4 ? raw.indexOf(Buffer.from("ệ"), at + 20_000) + 1 : raw.length; // +1: one byte into "ệ"
    chunks.push(raw.subarray(at, next > 0 ? next : raw.length));
    at = next > 0 ? next : raw.length;
  }
  const status = await call("POST", "/api/edit/zz-check", { ...mine, origin: `http://${own}`, "content-type": "application/json" }, chunks);
  expect("POST edit zz-check, split body", status, 200);
  const saved = existsSync(join(video, "edit.json")) ? readFileSync(join(video, "edit.json"), "utf8") : "";
  expect("saved edit.json has no U+FFFD", saved.includes("\uFFFD"), false);
  expect("saved edit.json round-trips", saved === `${JSON.stringify(sent, null, 2)}\n`, true);
  expect("server still running", proc.exitCode, null);
} finally {
  proc.kill();
  rmSync(tmp, { recursive: true, force: true });
}
if (/ERR_|Error/.test(stderr)) errors.push(`server stderr: ${stderr.split("\n").slice(0, 3).join(" | ")}`);

// 5. Guards on their own.
const { inside, readBody } = await import(new URL("./guard.ts", import.meta.url));
const base = resolve("/srv/public");
expect("inside: file in base", inside(base, `${base}${sep}a.mp4`), true);
expect("inside: sibling public-x", inside(base, `${base}-x${sep}f.txt`), false);
expect("inside: parent", inside(base, resolve(base, "..", ".env.local")), false);

// A Vietnamese character split across two chunks must survive (U+1EC7 is 3 bytes).
const text = JSON.stringify({ title: "Lãi suất ệ" });
const bytes = Buffer.from(text, "utf8");
const cut = bytes.indexOf(Buffer.from("ệ")) + 1;
const stream = new PassThrough();
const body = readBody(stream, 1_000_000);
stream.write(bytes.subarray(0, cut));
stream.end(bytes.subarray(cut));
expect("readBody: split multi-byte character", await body, text);
const big = new PassThrough();
const tooBig = readBody(big, 10).then(() => "accepted", (e) => e.message);
big.end(Buffer.alloc(11));
expect("readBody: over the limit", await tooBig, "edit.json is larger than 1 MB");

if (errors.length) {
  console.error(`review server check failed:\n${errors.join("\n")}`);
  process.exit(1);
}
console.log("review server ok: Host/Origin/Sec-Fetch-Site guard, Range, path containment, UTF-8 body (direct and through the server)");
