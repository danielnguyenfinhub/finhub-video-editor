// Checks scripts/sweep-render.mjs: the frame budget, showinfo parsing, the
// 16x16 dedup and the even thinning on synthetic data; then, when ffmpeg is on
// PATH, the whole sweep on a lavfi clip of 14 colour cuts (one keyframe per
// cut, as claude-video's tests build it) and on a static clip that must fall
// back to uniform sampling. Run: node scripts/check-sweep.mjs (exit 1 on failure).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chunk, dedupeByDeltas, evenIndices, frameBudget, parseShowinfo, sheetLayout, sweep } from "./sweep-render.mjs";

let failed = 0;
const check = (ok, what) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};

check(frameBudget(10) === 12, "budget: 10 s -> 12 frames (floor)");
check(frameBudget(25) === 25, "budget: 25 s -> 25 frames (one a second)");
check(frameBudget(45) === 40, "budget: 45 s -> 40");
check(frameBudget(120) === 60, "budget: 120 s -> 60");
check(frameBudget(400) === 80, "budget: 400 s -> 80");
check(frameBudget(4000, 50) === 50, "budget: the cap wins");

const info = "[Parsed_showinfo_1 @ 0x1] n:   0 pts:      0 pts_time:0       pos: 1 fmt:yuv420p\n" +
  "[Parsed_showinfo_1 @ 0x1] n:   1 pts:  12800 pts_time:0.4     pos: 2 fmt:yuv420p\n" +
  "frame=    2 fps=0.0 q=3.0\n";
check(JSON.stringify(parseShowinfo(info)) === "[0,0.4]", "showinfo: pts_time per selected frame");

const flat = (v) => new Uint8Array(256).fill(v);
check(JSON.stringify(dedupeByDeltas([flat(10), flat(11), flat(12), flat(40)])) === "[0,3]", "dedup: compares with the last kept frame, <= 2 is a duplicate");
check(JSON.stringify(dedupeByDeltas([flat(0), flat(0), flat(0)])) === "[0]", "dedup: a static video collapses to one frame");
check(JSON.stringify(evenIndices(5, 10)) === "[0,1,2,3,4]", "thin: nothing to thin");
check(JSON.stringify(evenIndices(100, 5)) === "[0,25,50,74,99]", "thin: first and last kept");
check(JSON.stringify(evenIndices(9, 1)) === "[0]", "thin: one frame is the first");

check(JSON.stringify(chunk([1, 2, 3, 4, 5], 2)) === "[[1,2],[3,4],[5]]", "sheets: frames split into groups, the last one short");
check(sheetLayout(5, 4) === "0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0", "sheets: xstack layout fills rows left to right");

const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (ffmpeg.error) {
  console.log("skip ffmpeg is not on PATH: end-to-end sweep not run here");
} else {
  const dir = mkdtempSync(join(tmpdir(), "sweep-"));
  const colours = ["red", "green", "blue", "yellow", "cyan", "magenta", "white", "gray", "orange", "purple", "pink", "brown", "navy", "teal"];
  const inputs = colours.flatMap((c) => ["-f", "lavfi", "-t", "0.4", "-i", `color=c=${c}:s=320x568:r=25`]);
  const concat = `${colours.map((_, i) => `[${i}:v]`).join("")}concat=n=${colours.length}:v=1:a=0[v]`;
  const cuts = join(dir, "cuts.mp4");
  let r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", concat, "-map", "[v]", "-force_key_frames", "expr:gte(t,n_forced*0.4)", "-c:v", "libx264", "-pix_fmt", "yuv420p", cuts], { encoding: "utf8" });
  check(r.status === 0, `synth: 14-cut clip built${r.status ? `: ${r.stderr.slice(-200)}` : ""}`);
  const s1 = sweep(cuts, join(dir, "sweep-cuts"));
  check(s1.engine === "scene", `cuts: scene engine (${s1.candidates} candidates)`);
  check(s1.frames.length >= 12 && s1.frames.length <= 14, `cuts: one frame per colour, ${s1.frames.length} kept`);
  check(s1.frames[0].s === 0, "cuts: first frame is t=0");
  const s3 = sweep(cuts, join(dir, "sweep-sheet"), { sheet: true });
  const expected = Math.ceil(s3.frames.length / 12);
  check(s3.sheets.length === expected && s3.sheets.every((h) => existsSync(h.path)), `sheet: ${s3.frames.length} frames -> ${expected} contact sheet(s) written`);
  const dims = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", s3.sheets[0].path], { encoding: "utf8" }).stdout.trim();
  const [w, h] = dims.split(",").map(Number);
  check(w === 1280 && h > 0, `sheet: first sheet is 4 tiles of 320 px across (${dims})`);
  check(s1.sheets === undefined, "sheet: off by default");
  const still = join(dir, "still.mp4");
  r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-t", "6", "-i", "color=c=blue:s=320x568:r=25", "-g", "600", "-c:v", "libx264", "-pix_fmt", "yuv420p", still], { encoding: "utf8" });
  check(r.status === 0, "synth: static clip built");
  const s2 = sweep(still, join(dir, "sweep-still"));
  check(s2.engine === "uniform", "still: falls back to uniform sampling");
  check(s2.frames.length === 1, `still: dedup collapses it to 1 frame (${s2.frames.length})`);
  rmSync(dir, { recursive: true, force: true });
}

if (failed) {
  console.error(`sweep: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("sweep ok");
