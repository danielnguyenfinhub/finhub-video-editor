// The repo's own MCP server (stdio): the editing scripts as tools for Claude Desktop, Cowork and
// Claude Code on Daniel's PC. Every tool runs a script that already exists; nothing here edits a
// video itself. Kept off on purpose: publishing (YouTube, Facebook, Drive), voice cloning and
// moving recordings stay chat-run behind Daniel's yes (docs/agents/plugin-and-mcp.md).
//
//   node mcp/finhub-video-server.mjs        (npm run mcp; registered in .mcp.json, not in the plugin)
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

// No shell: arguments go to the program as a list, so a slug or query cannot run a command.
const run = (cmd, args, timeoutMs) =>
  new Promise((done) =>
    execFile(cmd, args, { cwd: ROOT, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const out = `${stdout}${stderr}`.trim().split("\n").slice(-TAIL).join("\n");
      const code = err ? (err.killed ? "timed out" : `exit ${err.code ?? 1}`) : "exit 0";
      done({ content: [{ type: "text", text: `${code}\n${out}` }], isError: Boolean(err) });
    }),
  );
// One render or still at a time: parallel calls would fight for the CPU and write the same out/ folder.
// ponytail: on Windows a timeout kills only the direct child (ffmpeg or Chromium may linger); add taskkill /T if that bites.
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
const node = (script, args, timeoutMs = 120_000) => run(process.execPath, ["--no-warnings", join(ROOT, script), ...args], timeoutMs);

const server = new McpServer({ name: "finhub-video", version: "1.0.0" });
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

server.registerTool(
  "video_status",
  {
    description: "Where each video's team run stands, or for one slug: readiness, what's done, what's next. Reads only.",
    inputSchema: { slug: slug.optional() },
    annotations: readOnly,
  },
  ({ slug }) => node("scripts/video-status.mjs", slug ? [slug] : []),
);

server.registerTool(
  "preflight",
  {
    description: "The checks a render must pass first (edit.json mistakes, check-schema, speech cuts, pacing). Run before render_video.",
    inputSchema: { slug },
    annotations: readOnly,
  },
  ({ slug }) => node("scripts/preflight.mjs", [slug], 600_000),
);

server.registerTool(
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
    return r;
  }),
);

server.registerTool(
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
    inputSchema: { mode: z.enum(["trending", "topic", "watch", "comments"]), query: z.string().min(1).max(200).regex(/^[^-]/, "must not start with -").optional(), slug: slug.optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  ({ mode, query, slug }) => {
    const py = (args, ms = 300_000) => run(PYTHON, [join(ROOT, "scripts/research.py"), ...args], ms);
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

await server.connect(new StdioServerTransport());
