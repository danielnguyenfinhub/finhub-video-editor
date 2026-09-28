// Sweep a finished render for every visual change, so QC sees what edit.json
// did not name (a cutaway that lands late, an element over a spoken number, a
// template artefact between chapters). One ffmpeg pass lists the scene cuts;
// fewer than 8 falls back to evenly spaced frames; near-duplicates go (16x16
// grey thumbnails, mean difference <= 2); the rest is thinned to the budget,
// first and last frame always kept. Frames are 512 px wide, so each costs
// about a quarter of a full still to look at.
//
//   node scripts/sweep-render.mjs <slug> [--file <mp4>] [--max <n>] [--out <dir>]
//
// Writes out/videos/<slug>/team/qc/sweep/sweep-<n>-<time>.jpg and sweep.json,
// and prints one line per frame: open every one and look (video-qc skill).
// The frame budget, engines and dedup are claude-video's watch skill
// (bradautomates/claude-video, frames.py), rewritten for Node.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SCENE_THRESHOLD = 0.2; // ffmpeg scene score; 0.2 catches cutaways, not caption pages
export const SCENE_MIN_FRAMES = 8; // fewer scene cuts than this: the video is one shot, sample evenly
export const MAX_FPS = 2; // never denser than this, whatever the budget
export const DEDUP_DELTA = 2.0; // mean |a-b| over a 16x16 grey thumb (0-255)
export const WIDTH = 512;

// How many frames a video of `seconds` deserves, before the cap.
export const frameBudget = (seconds, cap = 80) => {
  if (seconds <= 30) return Math.min(cap, Math.max(12, Math.round(seconds)));
  if (seconds <= 60) return Math.min(cap, 40);
  if (seconds <= 180) return Math.min(cap, 60);
  if (seconds <= 600) return Math.min(cap, 80);
  return cap;
};

// showinfo prints one line per frame that passed `select`; pts_time is its time.
export const parseShowinfo = (stderr) =>
  [...stderr.matchAll(/\bn:\s*(\d+)\b.*?\bpts_time:\s*([\d.]+)/g)].map((m) => Number(m[2]));

// Greedy: keep a frame only if it differs from the last KEPT one by more than
// `delta` on average. thumbs[i] is the 256-byte grey thumbnail of frame i.
export const dedupeByDeltas = (thumbs, delta = DEDUP_DELTA) => {
  const kept = [];
  let last = null;
  thumbs.forEach((t, i) => {
    if (last) {
      let sum = 0;
      for (let k = 0; k < t.length; k++) sum += Math.abs(t[k] - last[k]);
      if (sum / t.length <= delta) return;
    }
    kept.push(i);
    last = t;
  });
  return kept;
};

// `count` indices spread over 0..n-1, always including the first and last.
export const evenIndices = (n, count) => {
  if (n <= count) return [...Array(n).keys()];
  if (count <= 1) return [0];
  const out = new Set();
  for (let i = 0; i < count; i++) out.add(Math.round((i * (n - 1)) / (count - 1)));
  return [...out].sort((a, b) => a - b);
};

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${String(m).padStart(2, "0")}-${sec.toFixed(2).padStart(5, "0").replace(".", "-")}`;
};

const ff = (args, what) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.error) throw new Error(`${what}: ffmpeg is not on PATH`);
  if (r.status !== 0) throw new Error(`${what}: ffmpeg exited ${r.status}\n${r.stderr.split("\n").slice(-5).join("\n")}`);
  return r.stderr;
};

export const durationOf = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());

// 16x16 grey thumbnails of every JPEG in `dir` matching `pattern`, in order.
const thumbsOf = (dir, pattern, n) => {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-framerate", "1", "-i", join(dir, pattern), "-vf", "scale=16:16,format=gray", "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 26 },
  );
  if (r.status !== 0 || r.stdout.length !== n * 256) return null; // fail open: no dedup
  return Array.from({ length: n }, (_, i) => r.stdout.subarray(i * 256, (i + 1) * 256));
};

export const sweep = (file, outDir, { max = 80 } = {}) => {
  const seconds = durationOf(file);
  const budget = Math.min(max, frameBudget(seconds, max));
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const scale = `scale=${WIDTH}:-2`;
  // Engine 1: scene cuts, whole video decoded (a cap would drop the tail).
  let engine = "scene";
  let times = parseShowinfo(
    ff(["-i", file, "-vf", `select='eq(n,0)+gt(scene,${SCENE_THRESHOLD})',${scale},showinfo`, "-vsync", "vfr", "-q:v", "3", join(outDir, "raw_%05d.jpg")], "scene pass"),
  );
  if (times.length < SCENE_MIN_FRAMES) {
    // Engine 2: evenly spaced, at most MAX_FPS.
    engine = "uniform";
    for (const f of readdirSync(outDir)) rmSync(join(outDir, f));
    const fps = Math.min(MAX_FPS, budget / Math.max(seconds, 1));
    times = parseShowinfo(
      ff(["-i", file, "-vf", `fps=${fps},${scale},showinfo`, "-frames:v", String(budget), "-q:v", "3", join(outDir, "raw_%05d.jpg")], "uniform pass"),
    );
  }
  const raw = readdirSync(outDir).filter((f) => f.startsWith("raw_")).sort();
  if (raw.length !== times.length) times = raw.map((_, i) => times[i] ?? (i * seconds) / Math.max(raw.length - 1, 1));
  const thumbs = thumbsOf(outDir, "raw_%05d.jpg", raw.length);
  const unique = thumbs ? dedupeByDeltas(thumbs) : raw.map((_, i) => i);
  const keep = evenIndices(unique.length, budget).map((i) => unique[i]);
  const frames = keep.map((i, k) => {
    const name = `sweep-${String(k + 1).padStart(3, "0")}-${fmt(times[i])}.jpg`;
    renameSync(join(outDir, raw[i]), join(outDir, name));
    return { path: join(outDir, name), s: Math.round(times[i] * 100) / 100 };
  });
  for (const f of readdirSync(outDir)) if (f.startsWith("raw_")) rmSync(join(outDir, f));
  const report = { file, seconds, engine, budget, candidates: raw.length, duplicatesDropped: raw.length - unique.length, frames };
  writeFileSync(join(outDir, "sweep.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  const slug = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"))[0];
  if (!slug) {
    console.error("usage: node scripts/sweep-render.mjs <slug> [--file <mp4>] [--max <n>] [--out <dir>]");
    process.exit(2);
  }
  const root = resolve(import.meta.dirname, "..");
  const file = resolve(opt("--file") ?? join(root, "out", "videos", slug, `${slug}.mp4`));
  if (!existsSync(file)) {
    console.error(`sweep: no render at ${file} (run python scripts/render-video.py ${slug} first)`);
    process.exit(1);
  }
  const outDir = resolve(opt("--out") ?? join(root, "out", "videos", slug, "team", "qc", "sweep"));
  const r = sweep(file, outDir, { max: Number(opt("--max") ?? 80) });
  console.log(`sweep: ${r.frames.length} frames (${r.engine}, ${r.candidates} candidates, ${r.duplicatesDropped} duplicates dropped) from ${r.seconds.toFixed(1)} s`);
  for (const f of r.frames) console.log(`- ${f.path} (t=${f.s}s)`);
  console.log(`Open every frame and look; the list is ${join(outDir, "sweep.json")}.`);
}
