// Check the design-side number and caption rules from the viewed critique (02/10/2026),
// on the designs' real exported helpers. Run: node scripts/check-design-figures.mjs
//   (a) a calendar year or a date is shown as said, never counted up (faceless, paper `counted`);
//   (b) faceless `stagedFigures` never overlap in time, start after the hook, keep a stat's
//       reading time and the number hold, and keep a unique key: on rba-sept-2026 and on a
//       synthetic reel with two stats said during the hook;
//   (c) every design whose said caption word scales keeps the fixed `saidRoom` margin
//       ("ThángHai": the scale eats the word space otherwise).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { repoTmp } from "./tmp-dir.mjs";
import { FPS, READING, reelOf, words } from "./check-golden.mjs";

const ROOT = join(import.meta.dirname, "..");
const out = repoTmp("design-figures-");
const bundle = (src, name) => {
  execFileSync(process.execPath, [
    join(ROOT, "node_modules/esbuild/bin/esbuild"), join(ROOT, src), "--bundle", "--format=esm",
    "--platform=node", "--jsx=automatic", "--packages=external", "--log-level=error",
    `--outfile=${join(out, name)}`,
  ]);
  return import(pathToFileURL(join(out, name)).href);
};
const faceless = await bundle("src/designs/faceless/Stage.tsx", "faceless.mjs");
const paper = await bundle("src/designs/paper/Stage.tsx", "paper.mjs");

let failed = false;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed = true;
};

// (a) years and dates as said; an ordinary number still counts (the guard is not "never count").
for (const [design, { counted }] of [["faceless", faceless], ["paper", paper]]) {
  for (const big of ["2026", "1999", "năm 2026", "29/9"]) {
    const seen = [0, 0.3, 0.7, 1].map((t) => counted(big, t));
    check(`${design}: "${big}" shown as said`, seen.every((s) => s === big), seen.join(" | "));
  }
  check(`${design}: "4,35%" still counts`, counted("4,35%", 0.5) !== "4,35%", counted("4,35%", 0.5));
}

// (b) staged figures.
const hold = Math.round((READING.minNumberHoldMs / 1000) * FPS);
const HOOK = 105;
const staged = (name, reel) => {
  const raw = faceless.stagedFigures(reel, FPS);
  const spans = raw.map((f) => `${f.big}@${f.fromFrame}+${f.frames}`).join(", ");
  const overlap = raw.some((f, i) => i > 0 && f.fromFrame < raw[i - 1].fromFrame + raw[i - 1].frames);
  check(`${name}: staged figures never overlap`, raw.length > 0 && !overlap, spans);
  if (reel.edit.hook) check(`${name}: no figure during the hook`, raw.every((f) => f.fromFrame >= HOOK), spans);
  check(`${name}: every figure held >= ${hold} frames`, raw.every((f) => f.frames >= hold), spans);
  const said = raw.map((f) => f.saidFrame);
  check(`${name}: keys unique`, new Set(raw.map((f) => `${f.source}${f.saidFrame}`)).size === raw.length, said.join(","));
  return raw;
};
const pub = join(ROOT, "public", "videos", "rba-sept-2026");
if (existsSync(join(pub, "edit.json"))) {
  const edit = JSON.parse(readFileSync(join(pub, "edit.json"), "utf8"));
  staged("rba-sept-2026", reelOf(JSON.parse(readFileSync(join(pub, "words.json"), "utf8")), edit));
} else check("public/videos/rba-sept-2026 present", false);
const w = words("dân Úc trả nhiều tiền trong năm nay vì lãi suất tăng ba lần liên tiếp rồi mình xem tiếp nhé");
const statReel = reelOf(w, {
  hook: { big: "4,35%", sub: "Lãi suất cơ bản" },
  stats: [
    { atMs: 600, durMs: 3000, big: "4,1 tỷ", label: "Người Úc trả thêm mỗi năm cho khoản vay" },
    { atMs: 1800, durMs: 3000, big: "5 triệu", label: "Số hộ gia đình đang trả góp nhà" },
  ],
});
const s = staged("two stats in the hook", statReel);
check("two stats in the hook: each stat keeps its reading time",
  s.length === 2 && s.every((f) => f.frames >= Math.round(3 * FPS)), s.map((f) => f.frames).join(","));

// (c) said-word scale keeps the word space.
for (const file of ["journey/Captions.tsx", "orbit/Stage.tsx", "isometric/Captions.tsx", "retro/index.tsx", "kinetic/Captions.tsx"]) {
  const src = readFileSync(join(ROOT, "src", "designs", file), "utf8");
  check(`${file}: said word keeps a saidRoom margin`, /const saidRoom\b/.test(src) && /margin:[^\n]*saidRoom\(/.test(src));
}

console.log(failed ? "design figures: FAILED" : "design figures ok");
process.exit(failed ? 1 : 0);
