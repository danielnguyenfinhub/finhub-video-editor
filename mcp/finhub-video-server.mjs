// The repo's own MCP server (stdio): the editing scripts as tools for Claude Desktop, Cowork and
// Claude Code on Daniel's PC. Every tool runs a script that already exists; nothing here edits a
// video itself or reads an API key (scripts/providers.mjs does). Paid calls go through `paid`: a quote
// first, the real call only with the confirm code that quote returned. Kept off on purpose: publishing (YouTube, Facebook, Drive), voice cloning and
// moving recordings stay chat-run behind Daniel's yes (docs/agents/plugin-and-mcp.md).
//
//   node mcp/finhub-video-server.mjs        (npm run mcp; registered in .mcp.json, not in the plugin)
//   mcp/http.mjs serves makeServer({ remote: true }) over HTTP on Railway.
import { execFile, spawn } from "node:child_process";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
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
// The paid APIs (scripts/providers.mjs; keys are read there, never here).
const prov = (op, args, extra = [], ms = 300_000) => node("scripts/providers.mjs", [op, "--json", JSON.stringify(args), ...extra], ms);

// Spend gate: a paid call without `confirm` only quotes (nothing is spent) and returns a code
// bound to this tool, these exact arguments and that quote, good for 15 minutes and once. The
// caller shows Daniel the cost and calls again with the code. The key lives in this process only,
// so a restart voids every code. ponytail: used codes are kept in memory for the process life.
const GATE = randomBytes(32);
const usedCodes = new Set();
const mac = (tool, args, quote, exp) => createHmac("sha256", GATE).update(JSON.stringify([tool, args, quote, exp])).digest("base64url").slice(0, 24);
const paid = async (tool, args, confirm, quote, job) => {
  const q = await quote();
  if (q.isError) return q;
  const said = q.content[0].text.replace(/^exit 0\n/, "");
  if (!confirm) {
    const exp = Date.now() + 15 * 60_000;
    return text(`${said}\n\nNothing was spent. Show Daniel this cost; only after he agrees, call ${tool} again with the same arguments and confirm: "${exp}.${mac(tool, args, said, exp)}" (valid 15 minutes, once).`);
  }
  const [exp, got = ""] = String(confirm).split(".");
  const want = mac(tool, args, said, Number(exp));
  if (!(Number(exp) > Date.now()) || usedCodes.has(confirm) || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want)))
    return { ...text("confirm code refused: expired, already used, or for other arguments or a changed quote. Call without confirm for a fresh quote."), isError: true };
  usedCodes.add(confirm);
  return job();
};
const YOUTUBE = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const isYoutube = (u) => {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && YOUTUBE.has(url.hostname);
  } catch {
    return false;
  }
};

// remote: the Railway HTTP mode (mcp/http.mjs) has no footage, Remotion or ffmpeg, so it keeps only the
// tools that need none of them: list_designs, research (all but watch) and visuals (stock search only).
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

  const err = (t) => ({ ...text(t), isError: true });
  // Over HTTP a job is capped and its out/ files come back in the answer.
  const light = (job) => (http ? capped(() => job().then(withFiles)) : job());

  server.registerTool(
    "research",
    {
      description:
        "Before and while writing a video (scripts/research.py, scripts/providers.mjs). trending; topic (query, slug): sources on a topic; ask (query = a question): a cited web answer (Perplexity, about US$0.005; deep=true for sonar-pro); " +
        "translate (query = one line, to = vi|en): narration translation that keeps every number; read (query = an http(s) page, slug): the page as Markdown; transcript (query = a YouTube link, slug): its captions; " +
        (remote ? "" : "watch (query = a YouTube link, slug): a reference video's pacing, contact sheets and captions; ") +
        "comments (YouTube link, slug): most-liked comments, anonymised; audience (query = a YouTube channel link): what its viewers ask. Writes under out/.",
      inputSchema: {
        mode: z.enum(remote ? ["trending", "topic", "ask", "translate", "read", "transcript", "comments", "audience"] : ["trending", "topic", "ask", "translate", "read", "transcript", "watch", "comments", "audience"]),
        query: z.string().min(1).max(2000).regex(/^[^-]/, "must not start with -").regex(/^[^\x00-\x1f\x7f]*$/, "no line breaks or control characters").optional(),
        slug: slug.optional(),
        to: z.enum(["vi", "en"]).optional(),
        deep: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ mode, query, slug, to, deep }) => {
      const call = (args, ms) => run(PYTHON, [join(ROOT, "scripts/research.py"), ...args], ms);
      const py = (args, ms = 300_000) => light(() => call(args, ms));
      if (mode === "trending") return py(["trending"]);
      if (!query) return err(`${mode} needs query`);
      if (mode === "ask") return light(() => prov("ask", { question: query, slug, deep: Boolean(deep) }));
      if (mode === "translate") return to ? light(() => prov("translate", { text: query, to })) : err("translate needs to = vi or en");
      if (mode === "audience") return isYoutube(query) ? py(["audience", query]) : err("audience needs query = an https YouTube channel link");
      if (!slug) return err(`${mode} needs query and slug`);
      if (mode === "topic") return py(["topic", query, "--slug", slug]);
      if (mode === "read") return /^https?:\/\//.test(query) ? py(["read", query, "--slug", slug]) : err("read needs query = an http(s) link");
      // yt-dlp follows redirects itself, so only YouTube links (research.py's public_https).
      if (!isYoutube(query)) return err(`${mode} needs query = an https YouTube link`);
      if (mode === "transcript") return py(["transcript", query, "--slug", slug]);
      // watch downloads (480p, 20 min cap) and runs an ffmpeg sweep: one heavy job at a time.
      return mode === "watch" ? heavy(`watch ${slug}`, () => py(["watch", query, "--slug", slug], 1_800_000)) : py(["comments", query, "--slug", slug]);
    },
  );

  const prompt = z.string().min(1).max(500).regex(/^[^-]/, "must not start with -").regex(/^[^\x00-\x1f\x7f]*$/, "no line breaks or control characters");
  const confirm = z.string().max(80).optional();

  localTool(
    "audio",
    {
      description:
        "Sound for a video, all paid: the first call returns a quote and a confirm code (nothing spent); show Daniel the cost and call again with confirm. " +
        "voice: narrate public/videos/<slug>/script.json (scripts/voice-video.mjs; the quote is its --dry-run with the RG 234 and fact checks; engine google (default) or elevenlabs). " +
        "music (prompt, seconds 10-300): an instrumental bed; sfx (prompt, seconds 0.5-30): a sound effect (both ElevenLabs, saved to public/videos/<slug>/assets/). " +
        "transcribe (file inside public/videos/<slug>/, lang): OpenAI Whisper word timings to out/. Voice cloning is not here.",
      inputSchema: {
        action: z.enum(["voice", "music", "sfx", "transcribe"]),
        slug,
        prompt: prompt.optional(),
        seconds: z.number().min(0.5).max(300).optional(),
        file: z.string().min(1).max(200).regex(/^[^-]/, "must not start with -").regex(/^[^\x00-\x1f\x7f]*$/).optional(),
        lang: z.enum(["vi", "en"]).optional(),
        engine: z.enum(["google", "elevenlabs"]).optional(),
        confirm,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ action, slug, prompt, seconds, file, lang, engine, confirm }) => {
      if (action === "voice") {
        const eng = engine ? ["--engine", engine] : [];
        return paid("audio", { action, slug, engine }, confirm, () => node("scripts/voice-video.mjs", [slug, "--dry-run", ...eng], 600_000), () =>
          heavy(`voice ${slug}`, () => node("scripts/voice-video.mjs", [slug, ...eng], 60 * 60_000)),
        );
      }
      if (action === "transcribe" ? !file : !prompt || !seconds) return err(action === "transcribe" ? "transcribe needs file" : `${action} needs prompt and seconds`);
      const args = action === "transcribe" ? { file, slug, lang } : { prompt, seconds, slug };
      return paid("audio", { action, ...args }, confirm, () => prov(action, args, ["--quote"]), () => capped(() => prov(action, args).then(withFiles)));
    },
  );

  server.registerTool(
    "visuals",
    {
      description:
        "Pictures and footage for a video. stock (term = 2-5 English words" +
        (remote ? "): Pixabay and Pexels candidates (links, licence), nothing downloaded. Free." : ", slug, need 1-5): free Pixabay/Pexels clips, CLIP-ranked, saved to the library and the video's footage; ") +
        (remote
          ? ""
          : "library (term, kind?): what public/library already has (reuse before buying); image (prompt, slug, provider fal|xai|openai, n 1-4): an AI still in the house style, Gemini picks the best of n; paid: the first call quotes, call again with confirm after Daniel agrees."),
      inputSchema: {
        action: z.enum(remote ? ["stock"] : ["stock", "library", "image"]),
        term: z.string().min(1).max(100).regex(/^[\p{L}\p{N}][\p{L}\p{N} ,'&]*$/u, "words only").optional(),
        slug: slug.optional(),
        need: z.number().int().min(1).max(5).optional(),
        prompt: prompt.optional(),
        provider: z.enum(["fal", "xai", "openai"]).optional(),
        n: z.number().int().min(1).max(4).optional(),
        kind: z.enum(["stock-video", "stock-image", "ai-image", "own-footage", "music"]).optional(),
        confirm,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ action, term, slug, need, prompt, provider = "fal", n = 1, kind, confirm }) => {
      if (action === "stock") {
        if (!term || (!remote && !slug)) return err(remote ? "stock needs term" : "stock needs term and slug (clips go into the library and the video's footage)");
        return light(() => prov("stock", { term, slug, need, download: !remote }));
      }
      if (action === "library") return term ? node("scripts/library.mjs", ["find", ...term.split(/\s+/), ...(kind ? ["--kind", kind] : [])]) : err("library needs term");
      if (!prompt || !slug) return err("image needs prompt and slug");
      const args = { prompt, slug, provider, n };
      return paid("visuals", { action, ...args }, confirm, () => prov("image", args, ["--quote"]), async () => {
        const r = await capped(() => prov("image", args));
        const made = r.isError ? null : r.content[0].text.trim().split("\n").at(-1);
        const p = made && resolve(ROOT, made);
        if (http && p?.startsWith(join(ROOT, "public", "library") + sep) && existsSync(p) && statSync(p).size < 5_000_000)
          r.content.push({ type: "image", mimeType: /\.jpe?g$/i.test(p) ? "image/jpeg" : "image/png", data: readFileSync(p).toString("base64") });
        return r;
      });
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
