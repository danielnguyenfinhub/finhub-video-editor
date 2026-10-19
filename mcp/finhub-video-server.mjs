// The repo's own MCP server (stdio): the editing scripts as tools for Claude Desktop, Cowork and
// Claude Code on Daniel's PC. Every tool runs a script that already exists; nothing here edits a
// video itself. Kept off on purpose: publishing (YouTube, Facebook, Drive), voice cloning and
// moving recordings stay chat-run behind Daniel's yes (docs/agents/plugin-and-mcp.md).
//
//   node mcp/finhub-video-server.mjs        (npm run mcp; registered in .mcp.json, not in the plugin)
//   mcp/http.mjs serves makeServer({ remote: true }) over HTTP on Railway.
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { slugOk } from "../scripts/listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");
const PYTHON = process.env.PYTHON ?? "python"; // as npm run test:py calls it
const REMOTION = join(ROOT, "node_modules/@remotion/cli/remotion-cli.js");
const TAIL = 40; // the repo's tail -n habit: the error is at the end

const slug = z.string().refine(slugOk, "lowercase letters, digits, '.', '_' or '-', no '/' or '..'");
const text = (t) => ({ content: [{ type: "text", text: t }] });

// No shell (spawn without shell): arguments go to the program as a list, so a slug or query cannot run a command.
// The timeout kills the whole process tree: a plain kill leaves Remotion's ffmpeg and Chromium (or
// yt-dlp's ffmpeg) running, holding the output open, and the next heavy job would overlap them.
// ponytail: off Windows the job gets its own process group, so Ctrl-C on the server doesn't reach it.
const run = (cmd, args, timeoutMs) =>
  new Promise((done) => {
    let timedOut = false;
    const buf = { stdout: "", stderr: "" };
    const child = spawn(cmd, args, { cwd: ROOT, windowsHide: true, detached: process.platform !== "win32" });
    for (const k of ["stdout", "stderr"]) child[k].on("data", (d) => (buf[k] = (buf[k] + d).slice(-1_000_000)));
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === "win32") execFile("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }, () => {});
      else try { process.kill(-child.pid, "SIGKILL"); } catch {} // already gone
    }, timeoutMs);
    const finish = (code) => {
      clearTimeout(timer);
      const out = `${buf.stdout}${buf.stderr}`.trim().split("\n").slice(-TAIL).join("\n");
      done({ content: [{ type: "text", text: `${timedOut ? "timed out" : `exit ${code}`}\n${out}` }], isError: timedOut || code !== 0 });
    };
    child.on("error", (err) => finish(err.code)); // e.g. ENOENT: python not on PATH
    child.on("close", (code, signal) => finish(code ?? signal));
  });
// One render or still at a time: parallel calls would fight for the CPU and write the same out/ folder.
let busy = null;
const heavy = async (what, job) => {
  if (busy) return { ...text(`busy: ${busy} is still running; try again when it finishes`), isError: true };
  busy = what;
  try {
    return await job();
  } finally {
    busy = null;
  }
};
// Remotely the out/ files stay on the server, so the answer carries the files research.py says it wrote.
// Only files inside out/: the output also carries stderr, so a printed path is never trusted as is.
const OUT = join(ROOT, "out") + sep;
const withFiles = (r) => {
  for (const [, f] of r.content[0].text.matchAll(/^(out\/\S+\.(?:md|json|txt))\b/gm)) {
    const p = resolve(ROOT, f);
    if (p.startsWith(OUT) && existsSync(p)) r.content.push({ type: "text", text: `--- ${f}\n${readFileSync(p, "utf8").slice(0, 60_000)}` });
  }
  return r;
};
// Over HTTP, research, preflight and video_status: at most 2 at once. Each is a process for up to
// 5-10 minutes, and one HTTP POST can carry a batch of calls. ponytail: a client that disconnects doesn't stop its job; the timeout does.
let researching = 0;
const capped = async (job) => {
  if (researching >= 2) return { ...text("busy: 2 jobs are running; try again when one finishes"), isError: true };
  researching++;
  try {
    return await job();
  } finally {
    researching--;
  }
};
const node = (script, args, timeoutMs = 120_000) => run(process.execPath, ["--no-warnings", join(ROOT, script), ...args], timeoutMs);

// remote: the Railway HTTP mode (mcp/http.mjs) has no footage, Remotion or ffmpeg, so it keeps only the
// tools that need none of them: list_designs and research (trending, topic, comments).
// http: served over HTTP (mcp/http.mjs), so the caller can't open files on this machine: still also
// returns the picture and research returns the files it wrote.
export const makeServer = ({ remote = false, http = remote } = {}) => {
  const server = new McpServer({ name: "finhub-video", version: "1.0.0" });
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const localTool = remote ? () => {} : server.registerTool.bind(server);

  localTool(
    "video_status",
    {
      description: "Where each video's team run stands, or for one slug: readiness, what's done, what's next. Reads only.",
      inputSchema: { slug: slug.optional() },
      annotations: readOnly,
    },
    ({ slug }) => (http ? capped(() => node("scripts/video-status.mjs", slug ? [slug] : [])) : node("scripts/video-status.mjs", slug ? [slug] : [])),
  );

  localTool(
    "preflight",
    {
      description: "The checks a render must pass first (edit.json mistakes, check-schema, speech cuts, pacing). Run before render_video.",
      inputSchema: { slug },
      annotations: readOnly,
    },
    ({ slug }) => (http ? capped(() => node("scripts/preflight.mjs", [slug], 600_000)) : node("scripts/preflight.mjs", [slug], 600_000)),
  );

  localTool(
    "still",
    {
      description:
        "One frame of a composition as a half-scale PNG in out/mcp/ (cheap to look at). Pass slug for the video being edited (without it the composition's default video renders) and safeZones to draw the SAFE band and FACE box (checking only). Returns the file path; open it to view.",
      inputSchema: {
        composition: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/),
        frame: z.number().int().min(0).max(100_000),
        slug: slug.optional(),
        safeZones: z.boolean().optional(),
      },
      annotations: { ...readOnly, readOnlyHint: false },
    },
    ({ composition, frame, slug, safeZones }) => heavy(`still ${composition}`, async () => {
      mkdirSync(join(ROOT, "out/mcp"), { recursive: true });
      const file = join("out/mcp", `${composition}${slug ? `-${slug}` : ""}-${frame}.png`);
      // As runbook A6.2: the video's props and --gl=angle.
      const props = slug || safeZones ? [`--props=${JSON.stringify({ slug, safeZones })}`, "--gl=angle"] : [];
      const r = await run(process.execPath, [REMOTION, "still", composition, file, `--frame=${frame}`, "--scale=0.5", ...props], 600_000);
      if (!r.isError) r.content.unshift({ type: "text", text: `still: ${join(ROOT, file)}` });
      if (!r.isError && http) r.content.push({ type: "image", mimeType: "image/png", data: readFileSync(join(ROOT, file)).toString("base64") });
      return r;
    }),
  );

  localTool(
    "render_video",
    {
      description:
        "Render a finished video on this PC (scripts/render-video.py): writes out/videos/<slug>/ and puts <Topic>.mp4 in '2 - FINISHED VIDEOS'. Takes minutes. Only when Daniel has asked to render, after preflight passes. Posts nothing.",
      inputSchema: { slug },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    ({ slug }) => heavy(`render ${slug}`, () => run(PYTHON, [join(ROOT, "scripts/render-video.py"), slug], 2 * 60 * 60_000)),
  );

  server.registerTool(
    "research",
    {
      description:
        "Before a faceless script: what's trending, or sources on a topic (scripts/research.py). watch (query = an https YouTube link): a reference video's pacing, contact sheets and captions; comments: its most-liked comments, anonymised. Writes under out/.",
      inputSchema: { mode: z.enum(remote ? ["trending", "topic", "comments"] : ["trending", "topic", "watch", "comments"]), query: z.string().min(1).max(200).regex(/^[^-]/, "must not start with -").regex(/^[^\x00-\x1f\x7f]*$/, "no line breaks or control characters").optional(), slug: slug.optional() },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ mode, query, slug }) => {
      const call = (args, ms) => run(PYTHON, [join(ROOT, "scripts/research.py"), ...args], ms);
      const py = (args, ms = 300_000) => (http ? capped(() => call(args, ms).then(withFiles)) : call(args, ms));
      if (mode === "trending") return py(["trending"]);
      if (!query || !slug) return { ...text(`${mode} needs query and slug`), isError: true };
      if (mode === "topic") return py(["topic", query, "--slug", slug]);
      if (!query.startsWith("https://")) return { ...text(`${mode} needs query = an https:// link`), isError: true };
      // watch downloads (480p, 20 min cap) and runs an ffmpeg sweep: one heavy job at a time.
      return mode === "watch" ? heavy(`watch ${slug}`, () => py(["watch", query, "--slug", slug], 1_800_000)) : py(["comments", query, "--slug", slug]);
    },
  );

  server.registerTool(
    "list_designs",
    {
      description: "The video designs (templates) with what each is for: id, intents, data shapes, aspects, promoted.",
      annotations: readOnly,
    },
    () => {
      const dir = join(ROOT, "src/designs");
      const rows = readdirSync(dir)
        .filter((d) => existsSync(join(dir, d, "template.json")))
        .map((d) => {
          const t = JSON.parse(readFileSync(join(dir, d, "template.json"), "utf8"));
          return { id: t.id, intents: t.intents, dataShapes: t.dataShapes, aspects: t.aspects, promoted: t.promoted };
        });
      return text(JSON.stringify(rows, null, 1));
    },
  );
  return server;
};

// Run directly (npm run mcp, .mcp.json): stdio. Imported by mcp/http.mjs: nothing connects here.
if (process.argv[1] && import.meta.filename === realpathSync(process.argv[1])) await makeServer().connect(new StdioServerTransport());
