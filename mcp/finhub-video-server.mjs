// The repo's own MCP server (stdio): the editing scripts as tools for Claude Desktop, Cowork and
// Claude Code on Daniel's PC. Every tool runs a script that already exists or the edit.json patcher in
// mcp/edit.mjs; nothing here renders a video itself or reads an API key (scripts/providers.mjs does). Paid calls go through `paid`: a quote
// first, the real call only with the confirm code that quote returned; edit.json saves go through the
// same gate (mcp/edit.mjs: a preview instead of a quote). Renders, prep and review packs run as jobs
// that video_status follows. Kept off on purpose: publishing (YouTube, Facebook, Drive), voice cloning,
// moving recordings and promoting a design stay chat-run behind Daniel's yes (docs/agents/plugin-and-mcp.md).
//
//   node mcp/finhub-video-server.mjs        (npm run mcp; registered in .mcp.json, not in the plugin)
//   mcp/http.mjs serves makeServer({ remote: true }) over HTTP on Railway.
import { execFile, spawn } from "node:child_process";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { slugOk } from "../scripts/listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");
const PYTHON = process.env.PYTHON ?? "python"; // as npm run test:py calls it
const REMOTION = join(ROOT, "node_modules/@remotion/cli/remotion-cli.js");
const FOOTAGE = "1 - PUT FOOTAGE HERE"; // Daniel's recordings, read in place (AGENTS.md)
const TAIL = 40; // the repo's tail -n habit: the error is at the end

const slug = z.string().refine(slugOk, "lowercase letters, digits, '.', '_' or '-', no '/' or '..'");
const text = (t) => ({ content: [{ type: "text", text: t }] });

// No shell (spawn without shell): arguments go to the program as a list, so a slug or query cannot run a command.
// The timeout kills the whole process tree: a plain kill leaves Remotion's ffmpeg and Chromium (or
// yt-dlp's ffmpeg) running, holding the output open, and the next heavy job would overlap them.
// ponytail: off Windows the job gets its own process group, so Ctrl-C on the server doesn't reach it.
// buf: pass one in to read the output while the job runs (startJob).
const run = (cmd, args, timeoutMs, buf = { stdout: "", stderr: "" }) =>
  new Promise((done) => {
    let timedOut = false;
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
// Long jobs (a render, prep, a review pack) take the same slot but answer at once with a job id: an
// MCP client gives up on a call after about a minute. video_status with that id shows the step
// (render-video.py's "== <step>" lines, else the last line) and the tail, then the result.
// ponytail: jobs live in this process's memory, so a restart forgets them (a render still shows in
// out/videos/<slug>/<slug>.inputs); add a lock file in out/mcp/ if two servers ever share the PC.
const jobs = new Map();
export const startJob = (what, cmd, args, timeoutMs) => {
  if (busy) return { ...text(`busy: ${busy} is still running; video_status with job "all" shows it`), isError: true };
  busy = what;
  const id = randomBytes(4).toString("hex");
  const job = { what, started: Date.now(), buf: { stdout: "", stderr: "" }, result: null };
  jobs.set(id, job);
  for (const old of [...jobs.keys()].slice(0, -20)) if (jobs.get(old).result) jobs.delete(old);
  // A spawn that throws (a bad PYTHON, an argument Node refuses) ends the job too, so the slot is freed.
  run(cmd, args, timeoutMs, job.buf)
    .catch((e) => ({ ...text(`could not start: ${e.message}`), isError: true }))
    .then((r) => {
      job.result = r;
      job.ended = Date.now();
      busy = null;
    });
  return text(`started ${what}: job ${id}. Check it with video_status job "${id}" every minute or so.`);
};
const jobStatus = (id, job) => {
  const secs = Math.round(((job.ended ?? Date.now()) - job.started) / 1000);
  if (job.result) return { ...text(`job ${id} ${job.what}: finished after ${secs} s\n${job.result.content[0].text}`), isError: job.result.isError };
  const out = `${job.buf.stdout}${job.buf.stderr}`.trim();
  const step = [...out.matchAll(/^== (.+)$/gm)].at(-1)?.[1] ?? (out.split("\n").at(-1) || "starting");
  return text(`job ${id} ${job.what}: running ${secs} s, at: ${step}\n${out.split("\n").slice(-15).join("\n")}`);
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
const paid = async (tool, args, confirm, quote, job, nothing = "Nothing was spent. Show Daniel this cost") => {
  const q = await quote();
  if (q.isError) return q;
  const said = q.content[0].text.replace(/^exit 0\n/, "");
  if (!confirm) {
    const exp = Date.now() + 15 * 60_000;
    return text(`${said}\n\n${nothing}; only after he agrees, call ${tool} again with the same arguments and confirm: "${exp}.${mac(tool, args, said, exp)}" (valid 15 minutes, once).`);
  }
  // One spelling of the expiry only ("0" + exp or "+exp" would be a fresh Set entry), and spent codes keyed on the MAC.
  const [e, got = ""] = String(confirm).split(".");
  const exp = Number(e);
  const want = mac(tool, args, said, exp);
  if (String(exp) !== e || !(exp > Date.now()) || usedCodes.has(got) || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want)))
    return { ...text("confirm code refused: expired, already used, or for other arguments or a changed quote. Call without confirm for a fresh quote."), isError: true };
  usedCodes.add(got);
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
      description:
        "Where each video's team run stands, or for one slug: readiness, what's done, what's next. Reads only. " +
        'job (an id from render_video, prep or review, or "all"): that job\'s step and output so far, then its result.',
      inputSchema: { slug: slug.optional(), job: z.string().regex(/^([0-9a-f]{8}|all)$/).optional() },
      annotations: readOnly,
    },
    ({ slug, job }) =>
      job === "all"
        ? text([...jobs].map(([id, j]) => jobStatus(id, j).content[0].text.split("\n")[0]).join("\n") || "no jobs since the server started")
        : job
          ? jobs.has(job)
            ? jobStatus(job, jobs.get(job))
            : { ...text(`no job ${job} (jobs are forgotten when the server restarts; video_status <slug> still shows a render)`), isError: true }
          : http
            ? capped(() => node("scripts/video-status.mjs", slug ? [slug] : []))
            : node("scripts/video-status.mjs", slug ? [slug] : []),
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
        "Render a finished video on this PC (scripts/render-video.py): writes out/videos/<slug>/ and puts <Topic>.mp4 in '2 - FINISHED VIDEOS'. Takes minutes, so it starts a job and answers with its id: follow it with video_status job. Only when Daniel has asked to render, after preflight passes. Posts nothing.",
      inputSchema: { slug },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    ({ slug }) => startJob(`render ${slug}`, PYTHON, [join(ROOT, "scripts/render-video.py"), slug], 2 * 60 * 60_000),
  );

  const err = (t) => ({ ...text(t), isError: true });
  // Over HTTP a job is capped and its out/ files come back in the answer.
  const light = (job) => (http ? capped(() => job().then(withFiles)) : job());

  server.registerTool(
    "research",
    {
      description:
        "Before and while writing a video (scripts/research.py, scripts/providers.mjs). trending; topic (query, slug): sources on a topic; ask (query = a question): a cited web answer (Perplexity, about US$0.005; deep=true for sonar-pro, which quotes first and needs confirm); " +
        "translate (query = one line, to = vi|en): narration translation that keeps every number; read (query = an http(s) page, slug): the page as Markdown; transcript (query = a YouTube link, slug): its captions; " +
        (remote ? "" : "watch (query = a YouTube link, slug): a reference video's pacing, contact sheets and captions; ") +
        "comments (YouTube link, slug): most-liked comments, anonymised; audience (query = a YouTube channel link): what its viewers ask. Writes under out/.",
      inputSchema: {
        mode: z.enum(remote ? ["trending", "topic", "ask", "translate", "read", "transcript", "comments", "audience"] : ["trending", "topic", "ask", "translate", "read", "transcript", "watch", "comments", "audience"]),
        query: z.string().min(1).max(2000).regex(/^[^-]/, "must not start with -").regex(/^[^\x00-\x1f\x7f]*$/, "no line breaks or control characters").optional(),
        slug: slug.optional(),
        to: z.enum(["vi", "en"]).optional(),
        deep: z.boolean().optional(),
        confirm: z.string().max(80).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    ({ mode, query, slug, to, deep, confirm }) => {
      const call = (args, ms) => run(PYTHON, [join(ROOT, "scripts/research.py"), ...args], ms);
      const py = (args, ms = 300_000) => light(() => call(args, ms));
      if (mode === "trending") return py(["trending"]);
      if (!query) return err(`${mode} needs query`);
      if (mode === "ask") {
        const args = { question: query, slug, deep: Boolean(deep) };
        // sonar-pro costs about 6x sonar: quote first, like the other paid calls.
        return deep ? paid("research", { mode, ...args }, confirm, () => prov("ask", args, ["--quote"]), () => light(() => prov("ask", args))) : light(() => prov("ask", args));
      }
      // No withFiles: the translation is model output, and a line in it could name another out/ file.
      if (mode === "translate") return to ? (http ? capped(() => prov("translate", { text: query, to })) : prov("translate", { text: query, to })) : err("translate needs to = vi or en");
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

  // edit.json: every save is a preview first and a confirm second, through the spend gate. The preview
  // carries the file's hash, so a code issued before someone else saved (the review page, another call) is refused.
  const msIn = z.number().int().min(0).max(36_000_000);
  localTool(
    "edit",
    {
      description:
        "Read and change a video's edit.json (public/videos/<slug>/edit.json). Times are SOURCE ms on words.json's clock; durMs is on-screen ms. " +
        "get (fields = top-level keys, optional): the file. words (find = a phrase, or fromMs and toMs): what Daniel says, with the ms to paste into remove, captionFixes or cues. " +
        "patch (ops: set / unset / append on a dot path such as hook.big, cues.2.toMs or remove): checked with the render's schema, then the first call returns a preview and a confirm code and saves nothing; " +
        "show Daniel the preview (above all its 'Needs Daniel's explicit yes' lines) and call again with the same ops and confirm only after he agrees. undo: back to edit.json.bak, previewed and confirmed the same way. " +
        "A save keeps the old file as edit.json.bak, then runs the speech-cut and pacing checks the change needs (check: false skips them).",
      inputSchema: {
        action: z.enum(["get", "words", "patch", "undo"]),
        slug,
        fields: z.array(z.string().regex(/^[A-Za-z]+$/)).max(30).optional(),
        find: z.string().min(1).max(200).regex(/^[^\x00-\x1f\x7f]*$/, "no line breaks or control characters").optional(),
        fromMs: msIn.optional(),
        toMs: msIn.optional(),
        ops: z
          .array(
            z.object({
              op: z.enum(["set", "unset", "append"]),
              path: z.string().max(120).regex(/^[A-Za-z]+(\.(\d{1,4}|[A-Za-z]+))*$/, "a dot path such as hook.big or cues.2.toMs"),
              value: z.unknown().optional(),
            }),
          )
          .min(1)
          .max(50)
          .optional(),
        check: z.boolean().optional(),
        confirm,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ action, slug, fields, find, fromMs, toMs, ops, check, confirm }) => {
      try {
        const ed = await import("./edit.mjs");
        if (action === "get") return text(ed.get(slug, fields));
        if (action === "words") return text(await ed.words(slug, { find, fromMs, toMs }));
        if (busy?.split(" ").at(-1) === slug) return err(`${busy} is running: edit.json waits until it finishes`);
        if (action === "patch" && !ops) return err("patch needs ops");
        const plan = action === "patch" ? await ed.planPatch(slug, ops) : await ed.planUndo(slug);
        const touched = new Set(action === "patch" ? ops.map((o) => o.path.split(".")[0]) : ["remove", "cues"]);
        const save = async () => {
          plan.save();
          const out = [`saved public/videos/${slug}/edit.json (the old one is edit.json.bak)`];
          const runs = [];
          if (check !== false && ["remove", "cut", "pacing"].some((k) => touched.has(k))) runs.push(["speech cuts", "scripts/check-speech-cuts.mjs", 120_000]);
          if (check !== false && ["remove", "cut", "cues", "chapters", "stats", "visuals", "hook"].some((k) => touched.has(k))) runs.push(["pacing", "scripts/check-pacing.mjs", 60_000]);
          for (const [name, script, ms] of runs) {
            const r = await node(script, [slug], ms);
            const t = r.content[0].text;
            out.push(name === "pacing" && /^exit 2/.test(t) ? `pacing warnings:\n${t}` : r.isError ? `${name} CHECK FAILED (saved anyway; edit undo goes back):\n${t}` : `${name}: OK`);
          }
          return text(out.join("\n\n"));
        };
        return await paid("edit", { action, slug, ops, check }, confirm, async () => text(plan.preview), save, "Nothing was saved. Show Daniel these changes");
      } catch (e) {
        return err(e.message);
      }
    },
  );

  // A file from Daniel's footage or music folder: a bare name, and after symlinks still inside that folder.
  const fileName = z.string().min(1).max(200).regex(/^[^-\\/\x00-\x1f][^\\/\x00-\x1f]*$/, "a file name in the folder, no path");
  const inFolder = (folder, file) => {
    const dir = join(ROOT, folder);
    const p = join(dir, file);
    if (!existsSync(p) || !statSync(p).isFile() || !realpathSync(p).startsWith(realpathSync(dir) + sep)) throw new Error(`${file} is not a file in ${folder}/`);
    return realpathSync(p);
  };
  const design = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
  localTool(
    "prep",
    {
      description:
        "Start a video and choose its design. ingest (file = a recording in '1 - PUT FOOTAGE HERE', slug, recording id optional, noClean): " +
        "scripts/prep-video.py makes public/recordings/<id>/ (9:16 proxy, transcript) and a skeleton edit.json; read in place, never moved; " +
        "refuses a recording id that exists. reedit (slug, recording): a new edit of a prepared recording. assemble (slug): the takes in public/videos/<slug>/clips.json as one recording. " +
        "ingest, reedit and assemble start a job (follow it with video_status job) and refuse a slug that already has an edit.json (change that one with edit). " +
        "template (slug): scripts/select-template.mjs ranks the designs (out/videos/<slug>/selection.json); pick (slug, design, reason): records Daniel's override there, then set it with edit patch design. " +
        "clean (slug): clean-clip's report of pauses, repeats and false starts (nothing applied; cut what Daniel agrees to with edit patch remove). " +
        "music_start (file in public/music): where the track gets going, for music.startMs. reframe (file in the footage folder): where the face is (a job). " +
        "matte (slug; bench 3-60 seconds to test speed and the GPU first, saving nothing; headed for a visible Chrome window when headless has no GPU; redo to replace an existing cut-out): " +
        "removes the background (foreground.webm, about 13x the video's length) through review/matte.html in Chrome, as a job.",
      inputSchema: {
        action: z.enum(["ingest", "reedit", "assemble", "template", "pick", "clean", "music_start", "reframe", "matte"]),
        slug: slug.optional(),
        file: fileName.optional(),
        recording: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
        noClean: z.boolean().optional(),
        design: design.optional(),
        reason: prompt.optional(),
        bench: z.number().int().min(3).max(60).optional(),
        headed: z.boolean().optional(),
        redo: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ action, slug, file, recording, noClean, design, reason, bench, headed, redo }) => {
      try {
        if (action === "music_start") return file ? light(() => node("scripts/music-start.mjs", [`public/music/${basename(inFolder("public/music", file))}`, "--json"])) : err("music_start needs file");
        if (action === "reframe") return file ? startJob(`reframe ${file}`, PYTHON, [join(ROOT, "scripts/reframe.py"), inFolder(FOOTAGE, file)], 600_000) : err("reframe needs file");
        if (!slug) return err(`${action} needs slug`);
        if (action === "template") return light(() => node("scripts/select-template.mjs", [slug]));
        if (action === "pick") return design && reason ? light(() => node("scripts/select-template.mjs", [slug, "--pick", design, "--reason", reason])) : err("pick needs design and reason");
        if (action === "clean") return light(() => node("scripts/clean-clip.mjs", [slug]));
        if (action === "matte") {
          // matte.html and the review server take only these slugs (no '.' or '_').
          if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return err("matte takes a slug of lowercase letters, digits and hyphens");
          const editFile = join(ROOT, "public/videos", slug, "edit.json");
          if (!existsSync(editFile)) return err(`public/videos/${slug}/edit.json doesn't exist: prep the video first`);
          const { recordingPath } = await import(pathToFileURL(join(ROOT, "src/mortgage/recording.ts")).href);
          const at = (f) => join(ROOT, "public", recordingPath(slug, JSON.parse(readFileSync(editFile, "utf8")).source, f));
          if (!existsSync(at("source.mp4"))) return err(`no source.mp4 for ${slug}: prep the video first`);
          // About 13x the video's length of GPU work, reused by every video of that recording: replace it only on purpose.
          if (!bench && !redo && existsSync(at("foreground.webm"))) return err(`${slug} already has foreground.webm; redo: true replaces it (after clips.json changed)`);
          const flags = [...(bench ? ["--bench", String(bench)] : []), ...(headed ? ["--headed"] : [])];
          return startJob(`matte ${slug}`, process.execPath, [join(ROOT, "scripts/matte-headless.mjs"), slug, ...flags], 4 * 60 * 60_000);
        }
        // prep-video.py sets "source" in an existing edit.json: every edit.json change goes through edit's preview instead.
        if (existsSync(join(ROOT, "public/videos", slug, "edit.json"))) return err(`public/videos/${slug}/edit.json exists: ${action} would change it. Change it with edit, or prep under a new slug.`);
        const prep = (args) => startJob(`prep ${slug}`, PYTHON, [join(ROOT, "scripts/prep-video.py"), ...args], 3 * 60 * 60_000);
        if (action === "ingest") return file ? prep([inFolder(FOOTAGE, file), slug, ...(recording ? ["--recording", recording] : []), ...(noClean ? ["--no-clean"] : [])]) : err("ingest needs file");
        if (action === "reedit") return recording ? prep([slug, "--recording", recording]) : err("reedit needs recording");
        return existsSync(join(ROOT, "public/videos", slug, "clips.json")) ? prep([slug, "--clips", join("public/videos", slug, "clips.json")]) : err(`assemble needs public/videos/${slug}/clips.json`);
      } catch (e) {
        return err(e.message);
      }
    },
  );

  localTool(
    "review",
    {
      description:
        "Check and export a video. srt: captions as the render shows them (out/videos/<slug>/<slug>.srt). chapters: the YouTube/Facebook chapter list. " +
        "sweep (sheet, start, end in seconds): frames at every visual change of the finished render, for QC (out/videos/<slug>/team/qc/sweep/). " +
        "pack (designs or family): stills of designs on this video and review.html for Daniel (out/review-pack/<slug>/); promoting a design stays a chat step. sweep and pack start a job (video_status job).",
      inputSchema: {
        action: z.enum(["srt", "chapters", "sweep", "pack"]),
        slug,
        sheet: z.boolean().optional(),
        start: z.number().min(0).optional(),
        end: z.number().min(0).optional(),
        designs: z.array(design).min(1).max(12).optional(),
        family: z.enum(["talkinghead-data", "talkinghead-story"]).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    ({ action, slug, sheet, start, end, designs, family }) => {
      if (action === "srt") return light(() => node("scripts/export-srt.mjs", [slug]));
      if (action === "chapters") return light(() => node("scripts/export-chapters.mjs", [slug]));
      if (action === "sweep")
        return startJob(`sweep ${slug}`, process.execPath, [join(ROOT, "scripts/sweep-render.mjs"), slug, ...(sheet ? ["--sheet"] : []), ...(start !== undefined ? ["--start", String(start)] : []), ...(end !== undefined ? ["--end", String(end)] : [])], 30 * 60_000);
      return startJob(`pack ${slug}`, process.execPath, [join(ROOT, "scripts/review-pack.mjs"), slug, ...(designs ? ["--designs", designs.join(",")] : family ? ["--family", family] : [])], 60 * 60_000);
    },
  );

  localTool(
    "audio",
    {
      description:
        "Sound for a video, all paid: the first call returns a quote and a confirm code (nothing spent); show Daniel the cost and call again with confirm. " +
        "voice: narrate public/videos/<slug>/script.json (scripts/voice-video.mjs; the quote is its --dry-run with the RG 234 and fact checks; engine google (default) or elevenlabs). " +
        "music (prompt, seconds 10-300): an instrumental bed; sfx (prompt, seconds 0.5-30): a sound effect (both ElevenLabs, saved to public/videos/<slug>/assets/). " +
        "transcribe (file inside public/videos/<slug>/, lang, engine): word timings to out/; engine local (default) is free faster-whisper on this PC and needs no confirm, elevenlabs uploads the file to ElevenLabs Scribe (paid, quote first). Voice cloning is not here.",
      inputSchema: {
        action: z.enum(["voice", "music", "sfx", "transcribe"]),
        slug,
        prompt: prompt.optional(),
        seconds: z.number().min(0.5).max(300).optional(),
        file: z.string().min(1).max(200).regex(/^[^-]/, "must not start with -").regex(/^[^\x00-\x1f\x7f]*$/).optional(),
        lang: z.enum(["vi", "en"]).optional(),
        engine: z.enum(["google", "elevenlabs", "local"]).optional(),
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
      if (action === "transcribe" && engine === "google") return err('transcribe engine is "local" or "elevenlabs"');
      if (action === "transcribe" && engine !== "elevenlabs") return heavy(`transcribe ${slug}`, () => prov("transcribe", { file, slug, lang, engine: "local" }, [], 30 * 60_000).then(withFiles));
      const args = action === "transcribe" ? { file, slug, lang, engine } : { prompt, seconds, slug };
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
          : "library (term, kind?): what public/library already has (reuse before buying); image (prompt, slug, provider fal|xai, n 1-4): an AI still in the house style, Gemini picks the best of n; paid: the first call quotes, call again with confirm after Daniel agrees."),
      inputSchema: {
        action: z.enum(remote ? ["stock"] : ["stock", "library", "image"]),
        term: z.string().min(1).max(100).regex(/^[\p{L}\p{N}][\p{L}\p{N} ,'&]*$/u, "words only").optional(),
        slug: slug.optional(),
        need: z.number().int().min(1).max(5).optional(),
        prompt: prompt.optional(),
        provider: z.enum(["fal", "xai"]).optional(),
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
