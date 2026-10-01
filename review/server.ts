// Local server for the review page: serves the page and public/ (with HTTP
// Range, so the Player's <video> can seek), saves edit.json and starts renders.
// Bound to 127.0.0.1 only. Bundled by review/build.mjs into dist/server.cjs.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, relative, resolve } from "node:path";
import { z } from "zod";
import { recordingPath } from "../src/mortgage/recording";
import { editSchema } from "../src/mortgage/schema";
import { inside, readBody, sameOrigin } from "./guard";

const ROOT = resolve(__dirname, "..", "..");
const DIST = join(ROOT, "review", "dist");
// REVIEW_PUBLIC: a temp public/ for review/check-server.mjs, so its saves never touch real videos.
const PUBLIC = process.env.REVIEW_PUBLIC ? resolve(process.env.REVIEW_PUBLIC) : join(ROOT, "public");
const VIDEOS = join(PUBLIC, "videos");
const PORT = Number(process.env.REVIEW_PORT ?? 4100); // review/check-server.mjs uses 0 (any free port)
const MAX_BODY = 1_000_000;
const MAX_FOREGROUND = 8_000_000_000;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".map": "application/json",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

// Serves a file inside `base`, answering Range requests.
const serveFile = (req: IncomingMessage, res: ServerResponse, base: string, rel: string) => {
  const file = resolve(base, `.${rel}`);
  if (!inside(base, file) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  const size = statSync(file).size;
  const headers = {
    "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
  };
  // A read error after the headers went out can only cut the response.
  const send = (opts?: { start: number; end: number }) =>
    createReadStream(file, opts).on("error", () => res.destroy()).pipe(res);
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (!range) {
    res.writeHead(200, { ...headers, "Content-Length": size });
    send();
    return;
  }
  // "-N" is the last N bytes; "-", "-0", "5-2" and a start past the end are unsatisfiable.
  const start = range[1] === "" ? Math.max(0, size - Number(range[2] || 0)) : Number(range[1]);
  const end = range[1] !== "" && range[2] !== "" ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (!(start <= end)) {
    res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` }).end();
    return;
  }
  res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
  send({ start, end });
};

// A recording file (source.mp4, foreground.webm, words.json) of a video: in
// public/recordings/<source>/ when edit.json names one, else in its own folder.
// A "source" that isn't a plain id (a hand-edited "../x") is refused.
const recordingFile = (slug: string, file: string) => {
  const { source } = JSON.parse(readFileSync(join(VIDEOS, slug, "edit.json"), "utf8")) as { source?: string };
  if (source !== undefined && !SLUG.test(source))
    throw new Error(`edit.json "source" must be a recording id like ty-do, not "${source}".`);
  return join(PUBLIC, recordingPath(slug, source, file));
};

// A video is reviewable once it has an edit.json and its recording has
// source.mp4 and words.json (prep-video.py makes all three).
const listVideos = () =>
  readdirSync(VIDEOS).filter((d) => {
    if (!SLUG.test(d) || !existsSync(join(VIDEOS, d, "edit.json"))) return false;
    try {
      return ["source.mp4", "words.json"].every((f) => existsSync(recordingFile(d, f)));
    } catch {
      return true; // edit.json doesn't parse or has a bad source: list it so the page shows why
    }
  });

// Validates with the same schema the render uses, keeps the previous version
// as edit.json.bak, then writes.
const saveEdit = async (req: IncomingMessage, res: ServerResponse, slug: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readBody(req, MAX_BODY));
  } catch (e) {
    return json(res, 400, { error: `Not saved: ${(e as Error).message}` });
  }
  const r = editSchema.safeParse(parsed);
  if (!r.success)
    return json(res, 400, { error: `Not saved, edit.json would be invalid:\n${z.prettifyError(r.error)}` });
  const file = join(VIDEOS, slug, "edit.json");
  copyFileSync(file, `${file}.bak`);
  writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
  json(res, 200, { saved: `public/videos/${slug}/edit.json`, backup: `public/videos/${slug}/edit.json.bak` });
};

// Video frames in a file, counted from packets (fast: no decoding).
const videoFrames = (file: string) =>
  Number(
    execFileSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0", "-count_packets",
      "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", file,
    ]).toString().trim(),
  );

// Saves the background-removed foreground (from matte.html) as the
// recording's foreground.webm. Streamed to a .part file, then kept only if it
// has exactly as many frames as source.mp4: the render plays it through the same cuts and
// pacing, so a single dropped frame would put it out of sync with the voice.
const saveForeground = (req: IncomingMessage, res: ServerResponse, slug: string) =>
  new Promise<void>((done) => {
    let target: string;
    try {
      target = recordingFile(slug, "foreground.webm");
    } catch (e) {
      json(res, 400, { error: `Foreground not saved: ${(e as Error).message}` });
      return done();
    }
    const part = `${target}.part`;
    const out = createWriteStream(part);
    let bytes = 0;
    let settled = false;
    const finish = (status: number, body: unknown) => {
      if (settled) return;
      settled = true;
      json(res, status, body);
      done();
    };
    const fail = (e: Error) => {
      out.destroy();
      rmSync(part, { force: true });
      finish(400, { error: `Foreground not saved: ${e.message}` });
    };
    req.on("data", (c: Buffer) => {
      bytes += c.length;
      if (bytes > MAX_FOREGROUND) req.destroy(new Error("it is larger than 8 GB"));
    });
    req.on("error", fail);
    out.on("error", fail);
    req.pipe(out);
    out.on("finish", () => {
      if (settled) return;
      try {
        const want = videoFrames(recordingFile(slug, "source.mp4"));
        const got = videoFrames(part);
        if (got !== want)
          throw new Error(`it has ${got} frames but source.mp4 has ${want}, so it would drift out of sync. Run it again.`);
        renameSync(part, target);
        finish(200, { saved: relative(ROOT, target).replace(/\\/g, "/"), frames: got });
      } catch (e) {
        fail(e as Error);
      }
    });
  });

// One render at a time, through the same script Daniel would run.
let render: { slug: string; proc: ChildProcess; lines: string[]; exitCode: number | null } | null = null;
const startRender = (res: ServerResponse, slug: string) => {
  if (render && render.exitCode === null)
    return json(res, 409, { error: `Already rendering ${render.slug}; wait for it to finish.` });
  const proc = spawn("python", [join("scripts", "render-video.py"), slug], { cwd: ROOT });
  const job = { slug, proc, lines: [] as string[], exitCode: null as number | null };
  const keep = (b: Buffer) => {
    job.lines.push(...b.toString().split(/\r?\n/).filter(Boolean));
    job.lines.splice(0, Math.max(0, job.lines.length - 30));
  };
  proc.stdout?.on("data", keep);
  proc.stderr?.on("data", keep);
  proc.on("error", (e) => {
    job.lines.push(`Could not start the render: ${e.message}`);
    job.exitCode = -1;
  });
  proc.on("close", (code) => {
    job.exitCode = code ?? -1;
  });
  render = job;
  json(res, 202, { started: slug });
};

const server = createServer(async (req, res) => {
  try {
    const { port } = server.address() as AddressInfo;
    if (!sameOrigin(req.headers, port)) return json(res, 403, { error: `Open the review page at http://localhost:${port}/` });
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = decodeURIComponent(url.pathname);
    const api = /^\/api\/(edit|render|foreground)\/([^/]+)$/.exec(path);
    if (path === "/api/videos") return json(res, 200, listVideos());
    if (api) {
      const [, what, slug] = api;
      if (!SLUG.test(slug) || !listVideos().includes(slug))
        return json(res, 404, { error: `No reviewable video "${slug}" in public/videos/.` });
      if (what === "edit" && req.method === "POST") return await saveEdit(req, res, slug);
      if (what === "render" && req.method === "POST") return startRender(res, slug);
      if (what === "foreground" && req.method === "POST") return await saveForeground(req, res, slug);
      if (what === "render")
        return json(res, 200, render?.slug === slug
          ? { running: render.exitCode === null, exitCode: render.exitCode, lines: render.lines }
          : { running: false, exitCode: null, lines: [] });
      return json(res, 405, { error: "Method not allowed" });
    }
    if (path.startsWith("/public/")) return serveFile(req, res, PUBLIC, path.slice("/public".length));
    return serveFile(req, res, DIST, path === "/" ? "/index.html" : path);
  } catch (e) {
    // Headers already sent: a second writeHead would throw and stop the server.
    if (res.headersSent) res.destroy();
    else json(res, 500, { error: (e as Error).message });
  }
});
server.on("error", (e: NodeJS.ErrnoException) => {
  console.error(
    e.code === "EADDRINUSE"
      ? `The review page is already running: open http://localhost:${PORT}/ (or close the other window running it first).`
      : `The review page could not start: ${e.message}`,
  );
  process.exit(1);
});
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Review page: http://localhost:${(server.address() as AddressInfo).port}/  (Ctrl+C to stop)`);
});
