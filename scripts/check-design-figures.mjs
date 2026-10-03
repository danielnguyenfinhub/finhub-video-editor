// Check the design-side number and caption rules from the viewed critiques (02/10/2026),
// on the core and the designs' real exported helpers. Run: node scripts/check-design-figures.mjs
//   [--only <design>] [--verbose] (default: failures and one count line).
//   (a) a calendar year or a date is shown as said, never counted up or spun: the core's
//       `asSaid` and every design's own counter of a figure (each file that defines a
//       `counted` must be listed here, so a new one cannot skip the check);
//   (b) the core's `figuresOf` makes a figure said during the hook wait for its end, never
//       overlapping the next, each held >= the number hold, a stat its reading time; figures
//       said after the hook (or with no hook) are untouched unless the previous is in its reading time; faceless `stagedFigures` builds
//       on it (rba-sept-2026 and a synthetic reel with two stats said during the hook);
//   (c) the eleven faceless-data designs: ten stage plans show each core figure, none before
//       the hook end (ticker, which has no plan, by source); faceless StageLayer / index.tsx
//       still use the staged helper;
//   (d) the hook count-up never starts from 0: each of the eight counting designs' hook
//       text, evaluated at count progress 0, 0.5 and 1;
//   (e) every design whose said caption word grows keeps a non-zero `saidRoom` margin, in use
//       ("ThángHai"); kinetic fits its lines to FIT_W, narrower than SAFE_W;
//   (f) evaluated: no meter, bar, ring or needle for a year (flash, ticker, kinetic, faceless,
//       gauge, orbit, phoneapp, journey), every hook count through hookCount (source, src/designs and src/youtube), a neutral kicker not "CON SỐ" for a year or date, a level scale beam for a lone
//       hook value and plaques off the pillar, no "TỔNG" on a rate, the calendar title page torn
//       before a points notepad, headline units kept together (keepUnits);
//   (g) classic cue panels (Panel) in every design that places one: clipped at their rest top,
//       inside SAFE at every drop-in / fly-out frame, right edge clear of the measured LogoMark
//       tile while it shows and never left of LOGO_CLEAR; youtube/Kit's 16:9 panels inside YT_SAFE, clear of LogoMark16's windows;
//   (h) replay of every public/videos fixture with words: with a hook, no figure before
//       HOOK_FRAMES (the hook-time branches deleted from six designs stay unreachable).
//   (j) talking-head repeats: checklist "0/0", series empty strip, kitchen hook by talk frame 25,
//       reaction artefact clear of the logo and its headline wrapped; (e)/(f) also cover newsroom,
//       neon (saidRoom), cards, editorial (kicker), cards, datalab, newsroom, chatstory (no meter).
//   (i) blueprint and orbit, every fixture: every figure on the stage, yielding to a compare cue; phoneapp's
//       checklist bar is said / n; (d) also runs every hook text on "4,1 TỶ ĐÔ", "10%", "2026".
// Source checks (marked "source" below) read comment-stripped, whitespace-free code, so a
// commented-out use does not pass; they cannot see a render, so what they guard is a `rule`
// in corrections.md, not `checked`.
// esbuild is not a direct dependency: it ships with @remotion/bundler, so it is resolved from
// there (works hoisted or nested, no package.json change).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { repoTmp } from "./tmp-dir.mjs";
import { FPS, READING, figuresOf, reelOf, words } from "./check-golden.mjs";

const ROOT = join(import.meta.dirname, "..");
const req = createRequire(join(ROOT, "package.json"));
const { buildSync, transformSync } = createRequire(req.resolve("@remotion/bundler/package.json"))("esbuild");
const out = repoTmp("design-figures-");
const bundle = (src) => {
  const outfile = join(out, `${src.replace(/\W/g, "_")}.mjs`);
  buildSync({ entryPoints: [join(ROOT, src)], bundle: true, format: "esm", platform: "node", jsx: "automatic", packages: "external", logLevel: "error", outfile });
  return import(pathToFileURL(outfile).href);
};
const design = (file) => bundle(`src/designs/${file}`);
// A design file as comment-free JS with no whitespace (esbuild keeps some comments
// otherwise, so a commented-out use would still match), and its top-level constants
// evaluated in order (`given` supplies imported ones; one that needs anything else is skipped).
const code = (file, given = {}) => {
  const src = readFileSync(join(ROOT, "src", "designs", file), "utf8");
  const opts = { loader: file.endsWith(".tsx") ? "tsx" : "ts", jsx: "automatic" };
  const js = transformSync(src, { ...opts, minifyWhitespace: true }).code;
  const env = { ...given };
  for (const line of transformSync(src, opts).code.split("\n")) {
    const m = line.match(/^(?:export )?const (\w+) = (.*);$/);
    if (!m || m[1] in given) continue;
    try {
      env[m[1]] = new Function(...Object.keys(env), `return (${m[2]});`)(...Object.values(env));
    } catch {
      // needs a runtime import: not a constant this check evaluates
    }
  }
  return { js, env };
};

// Prints failures and one count line; `--verbose` every line; `--only <id>` also the ok lines that
// name <id> (every check still runs and every failure prints: the exit code covers them all).
const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const verbose = argv.includes("--verbose");
// A typo fails at once, before any bundling: --only takes a design id (src/designs, src/youtube/designs).
const ids = ["designs", "youtube/designs"].flatMap((d) => readdirSync(join(ROOT, "src", d), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name));
if (only !== null && !ids.includes(only)) {
  console.log(`FAIL --only ${only}: not a design id (${ids.length} known, e.g. ${ids.slice(0, 3).join(", ")})`);
  process.exit(1);
}
let failed = false;
let passed = 0;
let matched = 0;
const check = (name, ok, detail = "") => {
  if (only && name.includes(only)) matched++;
  if (!ok || verbose || (only && name.includes(only))) console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed = true;
  else passed++;
};

const golden = await bundle("src/mortgage/golden.ts");
const faceless = await design("faceless/Stage.tsx");
const HOOK = golden.HOOK_FRAMES;

// (a) years and dates as said; an ordinary number still counts (the guard is not "never count").
const SAID = ["2026", "1999", "năm 2026", "29/9"];
for (const big of SAID) check(`core asSaid("${big}")`, golden.asSaid(big) === true);
for (const big of ["4,35%", "2.026", "600.000 đô", "3,6", "2000 đô", "20/80"]) check(`core asSaid("${big}") is false`, golden.asSaid(big) === false);
// Every design file that defines its own figure counter; scale/Stage.tsx counts only the hook ((d)).
const COUNTERS = ["faceless/Stage.tsx", "paper/Stage.tsx", "receipt/Paper.tsx", "flipcard/Stage.tsx", "pulse/Scope.tsx",
  "splitscreen/numbers.ts", "scale/MiniPan.tsx", "kinetic/Stage.tsx", "orbit/Stage.tsx", "retro/Stage.tsx",
  "phoneapp/Phone.tsx", "isometric/Stage.tsx", "journey/Stage.tsx", "blueprint/Stage.tsx", "reaction/Pieces.tsx"];
const defining = readdirSync(join(ROOT, "src", "designs"), { recursive: true })
  .filter((f) => /\.tsx?$/.test(f) && /(^|\n)(export )?const counted\b/.test(readFileSync(join(ROOT, "src", "designs", f), "utf8")))
  .map((f) => f.replace(/\\/g, "/")).filter((f) => f !== "scale/Stage.tsx").sort();
check("every design counter is listed in this check", defining.join() === [...COUNTERS].sort().join(), `defines counted: ${defining.join(", ")}`);
const counters = await Promise.all(COUNTERS.map(async (f) => [f, (await design(f)).counted]));
for (const [name, counted] of counters) {
  for (const big of SAID) {
    const seen = [0, 0.3, 0.7, 1].map((t) => counted(big, t));
    check(`${name}: "${big}" shown as said`, seen.every((s) => s === big), seen.join(" | "));
  }
  check(`${name}: "4,35%" still counts`, counted("4,35%", 0.5) !== "4,35%", counted("4,35%", 0.5));
}
const gaugeValue = (await design("gauge/Dial.tsx")).parseValue;
check("gauge: a year or a date is not a value on the dial", SAID.every((b) => gaugeValue(b) === null) && gaugeValue("4,35%")?.value === 4.35);
const { spinGlyph } = await design("ticker/Board.tsx");
const spun = (text) => [...Array(20).keys()].flatMap((s) => Array.from(text, (ch, i) => spinGlyph(ch, `${s}${i}`, text))).join("");
check('ticker: a year never flips through other digits ("5 2 4")', spun("2026") === "2026".repeat(20), spun("2026").slice(0, 16));
const title = "Lãi suất cần biết";
check("ticker: a letter flaps on itself, no random capitals", spun(title) === title.repeat(20), spun(title).slice(0, 20));
check("ticker: a rate's digits still spin", spun("4,35%") !== "4,35%".repeat(20));

// (b) the core's hook wait, and faceless on top of it.
const hold = Math.round((READING.minNumberHoldMs / 1000) * FPS);
const spans = (fs) => fs.map((f) => `${f.big}@${f.fromFrame}+${f.frames}`).join(", ");
const staged = (name, raw, reel) => {
  const s = spans(raw);
  const overlap = raw.some((f, i) => i > 0 && f.fromFrame < raw[i - 1].fromFrame + raw[i - 1].frames);
  check(`${name}: figures never overlap`, raw.length > 0 && !overlap, s);
  if (reel.edit.hook) check(`${name}: no figure before the hook ends (${HOOK})`, raw.every((f) => f.fromFrame >= HOOK), s);
  check(`${name}: every figure held >= ${hold} frames`, raw.every((f) => f.frames >= hold), s);
  check(`${name}: keys unique`, new Set(raw.map((f) => `${f.source}${f.saidFrame}`)).size === raw.length, raw.map((f) => f.saidFrame).join(","));
  return raw;
};
const pub = join(ROOT, "public", "videos", "rba-sept-2026");
const rba = existsSync(join(pub, "edit.json"))
  ? reelOf(JSON.parse(readFileSync(join(pub, "words.json"), "utf8")), JSON.parse(readFileSync(join(pub, "edit.json"), "utf8")))
  : null;
if (!rba) check("public/videos/rba-sept-2026 present", false);
const w = words("dân Úc trả nhiều tiền trong năm nay vì lãi suất tăng ba lần liên tiếp rồi mình xem tiếp nhé");
const hookStats = {
  hook: { big: "4,35%", sub: "Lãi suất cơ bản" },
  stats: [
    { atMs: 600, durMs: 3000, big: "4,1 tỷ", label: "Người Úc trả thêm mỗi năm cho khoản vay" },
    { atMs: 1800, durMs: 3000, big: "5 triệu", label: "Số hộ gia đình đang trả góp nhà" },
  ],
};
const statReel = reelOf(w, hookStats);
const reels = [...(rba ? [["rba-sept-2026", rba]] : []), ["two stats in the hook", statReel]];
for (const [name, reel] of reels) {
  const core = staged(`core ${name}`, figuresOf(reel, FPS), reel);
  // Said after the hook and after the previous figure's hold: untouched.
  const said = core.filter((f, i) => f.saidFrame >= (i ? core[i - 1].fromFrame + core[i - 1].frames : HOOK));
  check(`core ${name}: a figure said after the hook and the last hold keeps its time`, said.every((f) => f.fromFrame === f.saidFrame), spans(said));
  staged(`faceless ${name}`, faceless.stagedFigures(reel, FPS), reel);
}
const s = figuresOf(statReel, FPS);
check("two stats in the hook: each stat keeps its reading time", s.length === 2 && s.every((f) => f.frames >= Math.round(3 * FPS)), s.map((f) => f.frames).join(","));
const noHook = figuresOf(reelOf(w, { stats: hookStats.stats }), FPS);
// No hook: the first starts when said; the second, said 36 frames into the first's 90-frame
// reading time, waits for it (never two at once).
check("no hook: the first starts when said, the next waits for its reading time", noHook[0]?.fromFrame === noHook[0]?.saidFrame && noHook[1]?.fromFrame === noHook[0].fromFrame + noHook[0].frames && noHook[0].frames >= hold, spans(noHook));
if (rba) {
  const years = figuresOf(rba, FPS).filter((f) => golden.asSaid(f.big));
  check("rba-sept-2026: years stay figures (shown as said, not dropped)", years.some((f) => f.big === "2026"), spans(years));
}

// (c) the eleven faceless-data designs: ten plans here (ticker below, by source): every core
// figure on their stage, none in the hook.
const plans = [
  ["bigdigit", "bigdigit/Plan.ts", "planOf"], ["flash", "flash/Stage.tsx", "stagePlan"],
  ["gauge", "gauge/Scenes.tsx", "planOf"], ["pulse", "pulse/Plan.ts", "planOf"],
  ["scale", "scale/Plan.ts", "planOf"], ["receipt", "receipt/Stage.tsx", "planOf"],
  ["calendar", "calendar/Plan.ts", "planPage"], ["timelapse", "timelapse/Plan.ts", "planOf"],
  ["splitscreen", "splitscreen/Plan.ts", "planOf"], ["flipcard", "flipcard/Stage.tsx", "stagePlan"],
];
const figuresIn = (plan) => {
  const found = [];
  const walk = (o, parent) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach((x) => walk(x, parent));
    if (typeof o.big === "string" && (o.source === "auto" || o.source === "stat"))
      found.push({ big: o.big, from: typeof parent?.from === "number" ? parent.from : o.fromFrame });
    for (const v of Object.values(o)) walk(v, o);
  };
  walk(plan, null);
  return found;
};
for (const [name, file, fn] of plans) {
  const mod = await design(file);
  for (const [reelName, reel] of reels) {
    const shown = figuresIn(mod[fn](reel, FPS, reel.timeline.talkFrames))
      .filter((f) => !(f.big === reel.edit.hook?.big && f.from === 0)); // the hook itself
    const core = figuresOf(reel, FPS).map((f) => f.big).sort().join(",");
    check(`${name} ${reelName}: every core figure staged`, shown.map((f) => f.big).sort().join(",") === core, `${shown.map((f) => f.big).join(",")} vs ${core}`);
    check(`${name} ${reelName}: no figure before the hook ends`, shown.every((f) => f.from >= HOOK), shown.map((f) => `${f.big}@${f.from}`).join(", "));
  }
}
check("ticker (source): hook-time figures come from the core, no local mini row", /const boards=figuresOf\(reel,fps\);/.test(code("ticker/Stage.tsx").js) && !/MiniFigure/.test(code("ticker/Stage.tsx").js));
const fl = code("faceless/Stage.tsx").js;
check("faceless/Stage.tsx (source): stagedFigures is built on the core figuresOf", /const stagedFigures=\([^)]*\)=>\{[^}]*?figuresOf\(reel,fps\)/.test(fl));
check("faceless/Stage.tsx (source): StageLayer renders stagedFigures", /stagedFigures\(reel,fps\)\.map\(/.test(fl));
check("faceless/index.tsx (source): captions step down for stagedFigures", /busyFrames\(reel,fps,stagedFigures\(reel,fps\)\)/.test(code("faceless/index.tsx").js));
check("faceless, paper (source): no local year rule (the core's asSaid)", ["faceless/Stage.tsx", "paper/Stage.tsx"].every((f) => {
  const js = code(f).js;
  return !/\(19\|20\)/.test(js) && /asSaid\(/.test(js);
}));

// (d) the hook count-up: from 0.9 of the value, exact by half of the design's count. Each
// design's own hook text, evaluated at count progress 0, 0.5 and 1.
const { hookCount } = golden;
check("hookCount: never below 90 % of the value", [0, 0.1, 0.3].every((t) => hookCount(4.35, t) >= 0.9 * 4.35 - 1e-9), [0, 0.1, 0.3].map((t) => hookCount(4.35, t)).join(" | "));
check("hookCount: exact from half way", [0.5, 0.8, 1].every((t) => hookCount(4.35, t) === 4.35));
const HOOK_RATE = { big: "4,35%", countTo: 4.35, decimals: 2, suffix: "%", sub: "Lãi suất cơ bản" };
const num = (s) => parseFloat(String(s).replace(/[^\d,]/g, "").replace(",", "."));
const gaugeMod = await design("gauge/Scenes.tsx");
const scalePlan = await design("scale/Plan.ts");
const scaleStage = await design("scale/Stage.tsx");
const lone = scalePlan.hookScene(HOOK_RATE);
const landAt = lone.pans[1].dropAt + scalePlan.FALL;
const await_pulse = await design("pulse/Beats.tsx");
const await_receipt = await design("receipt/Stage.tsx");
const await_calendar = await design("calendar/Page.tsx");
const await_timelapse = await design("timelapse/Plan.ts");
const await_split = await design("splitscreen/Scenes.tsx");
const await_flip = await design("flipcard/Stage.tsx");
// Each design's own hook text for a hook and a count progress t.
const scaleText = (hook, t) => {
  const pan = scalePlan.hookScene(hook).pans[1];
  return scaleStage.counted(pan, pan.dropAt + scalePlan.FALL + 26 * (1 - Math.cbrt(1 - t)));
};
const hookTexts = {
  gauge: (hook, t) => gaugeMod.hookView(hook, 6 + 32 * (1 - Math.cbrt(1 - t)), FPS).readout.text, // lf for eased t
  pulse: (hook, t) => await_pulse.hookText(hook, t),
  scale: scaleText,
  receipt: (hook, t) => await_receipt.hookValue(hook, t),
  calendar: (hook, t) => await_calendar.countAt(hook, t),
  timelapse: (hook, t) => await_timelapse.hookScrub(hook)?.(t) ?? hook.big,
  splitscreen: (hook, t) => await_split.hookText(hook, t),
  flipcard: (hook, t) => await_flip.hookText(hook, t),
  core: (hook, t) => golden.hookText(hook, t), // every other design prints through it (source check below)
};
// The auditor's edge cases (review c849a4c): a word unit keeps its space, a whole number never
// starts on a wrong value, a year-like hook is never counted.
const HOOK_UNIT = { big: "4,1 TỶ ĐÔ", countTo: 4.1, decimals: 1, suffix: "TỶ ĐÔ" };
const HOOK_INT = { big: "10%", countTo: 10, suffix: "%" };
const HOOK_YEAR = { big: "2026", countTo: 2026 };
// Every hook ends exactly as written (review 557b020): thousands, a "$", a word unit.
const HOOK_ENDS = [HOOK_RATE, HOOK_UNIT, HOOK_INT, { big: "750.000 ĐÔ", countTo: 750000, suffix: "ĐÔ" }, { big: "$4.1B", countTo: 4.1, decimals: 1, suffix: "B" }, { big: "3 TIÊU CHÍ", countTo: 3, suffix: "TIÊU CHÍ" },
  // review 40bdcff: schema-valid inputs that came out wrong; suffix/decimals must never rebuild the text.
  { big: "-0,25%", countTo: -0.25, decimals: 2, suffix: "%" }, { big: "-1,5%", countTo: -1.5, decimals: 1, suffix: "%" },
  { big: "4,35%", countTo: 4.35, decimals: 1, suffix: "%" }, { big: "750 000 ĐÔ", countTo: 750000, suffix: "ĐÔ" },
  { big: "6 TRIỆU", countTo: 6000000, suffix: "TRIỆU" }, { big: "3–4", countTo: 4 }, { big: "600 NGHÌN", countTo: 600, suffix: "nghìn" },
  { big: "4,1 TỶ", countTo: 4.1, decimals: 1, suffix: "TỶ ĐÔ" }, { big: "4,350%", countTo: 4.35, decimals: 3, suffix: "%" },
  { big: "", countTo: 1 }, { big: "—", countTo: 1 }, { big: "1,5–2,5%", countTo: 1.5 }, { big: "$600,000", countTo: 600000 }, { big: "1.234,5 k", countTo: 1234.5, decimals: 1, suffix: "k" }];
// Mid-count the text keeps big's exact shape (every digit read as 9): its prefix, suffix and units,
// sign, thousands and decimal marks and decimals; only digits of the counted fraction change.
const shape = (x) => String(x).replace(/\d/g, "9");
// A big with more than one number (a range) is ambiguous: it never counts.
const numbers = (x) => (String(x).match(/[-−]?\d(?:[.,   ]?\d)*/g) ?? []).length;
for (const [name, text] of Object.entries(hookTexts)) {
  const seen = [0, 0.5, 1].map((t) => text(HOOK_RATE, t));
  check(`${name}: hook never counts from 0, exact by half its count`, num(seen[0]) >= 0.9 * 4.35 - 0.006 && seen.slice(1).every((x) => num(x) === 4.35), seen.join(" | "));
  const ts = [0, 0.1, 0.3, 0.5, 1];
  const unit = ts.map((t) => text(HOOK_UNIT, t));
  check(`${name}: a word unit keeps its space ("4,1 TỶ ĐÔ")`, unit.every((x) => /^\d[\d.,]* TỶ ĐÔ$/.test(x)) && unit.at(-1) === "4,1 TỶ ĐÔ", unit.join(" | "));
  const int = ts.map((t) => text(HOOK_INT, t));
  check(`${name}: a whole number never shows a wrong value ("10%")`, int.every((x) => x === "10%"), int.join(" | "));
  const year = ts.map((t) => text(HOOK_YEAR, t));
  check(`${name}: a year-like hook is never counted`, year.every((x) => x === "2026"), year.join(" | "));
  const odd = HOOK_ENDS.flatMap((h) => [0, 0.25, 0.5, 0.75, 1].map((t) => [h.big, t, text(h, t)]))
    .filter(([big, , out]) => (out.includes("--") && !big.includes("--")) || shape(out) !== shape(big) || (numbers(big) > 1 && out !== big));
  check(`${name}: mid-count keeps big's exact shape (no "--", no doubled unit, same marks and decimals)`, odd.length === 0, odd.slice(0, 4).map(([b, t, o]) => `${b}@${t} -> ${o}`).join(", ") || `${HOOK_ENDS.length} hooks`);
  const ends = HOOK_ENDS.map((h) => [h.big, text(h, 1)]);
  check(`${name}: every hook ends as written ("750.000 ĐÔ", "$4.1B", …)`, ends.every(([a, b]) => a === b), ends.filter(([a, b]) => a !== b).map(([a, b]) => `${a} -> ${b}`).join(", ") || "all equal");
}
// Every fixture hook with a count ends exactly as written.
{
  const vids = join(ROOT, "public", "videos");
  const hooks = readdirSync(vids).filter((d) => existsSync(join(vids, d, "edit.json")))
    .map((d) => [d, JSON.parse(readFileSync(join(vids, d, "edit.json"), "utf8")).hook]).filter(([, h]) => h?.countTo !== undefined);
  const bad = hooks.filter(([, h]) => golden.hookText(h, 1) !== h.big).map(([d, h]) => `${d}: ${h.big} -> ${golden.hookText(h, 1)}`);
  check("hookText(hook, 1) === hook.big for every fixture hook that counts", hooks.length >= 2 && bad.length === 0, bad.join("; ") || `${hooks.length} hooks`);
}

// (e) said-word scale keeps the word space; kinetic fits to the narrower width.
for (const file of ["journey/Captions.tsx", "orbit/Stage.tsx", "isometric/Captions.tsx", "retro/index.tsx", "kinetic/Captions.tsx", "neon/Captions.tsx"]) {
  const { js, env } = code(file);
  const room = typeof env.saidRoom === "function" ? env.saidRoom(1.12, "Tháng") : 0;
  check(`${file}: said word keeps a saidRoom margin`, room > 0 && /margin:`[^`]*saidRoom\(/.test(js), `saidRoom(1.12, "Tháng") = ${room}`);
}
{
  // newsroom's amber box reaches PAD_X past the said word: every word keeps half of it as a margin.
  const { js, env } = code("newsroom/Captions.tsx");
  check("newsroom/Captions.tsx: words keep half the box's reach as a margin (saidRoom)", env.saidRoom > 0 && env.saidRoom * 2 >= env.PAD_X && /margin:`0 \$\{saidRoom\}px`/.test(js), `saidRoom ${env.saidRoom}, PAD_X ${env.PAD_X}`);
}
{
  const { js, env } = code("flipcard/Captions.tsx");
  const ok = typeof env.saidRoom === "function" && env.saidRoom(false) > 0 && env.saidRoom(true) + env.PAD === env.saidRoom(false);
  check("flipcard/Captions.tsx: said card grows into its own margin only", ok && /margin:`[^`]*saidRoom\(/.test(js) && /padding:now\?/.test(js),
    ok ? `margin ${env.saidRoom(false)} px, said ${env.saidRoom(true)} px + pad ${env.PAD}` : "saidRoom missing or not constant-width");
}
{
  const { js, env } = code("kinetic/Captions.tsx", { SAFE_W: 906 });
  const uses = (js.match(/maxBoxWidth:FIT_W\b/g) ?? []).length;
  check("kinetic/Captions.tsx: lines fit to FIT_W < SAFE_W", env.FIT_W < 906 && uses >= 2, `FIT_W ${env.FIT_W}, used ${uses}x`);
}
const ff = code("flipcard/Cues.tsx").js;
check("flipcard/Cues.tsx (source): cue track sets the font", /export const FlipCueTrack=[\s\S]*?fontFamily:FONT/.test(ff));

// (f) evaluated design behaviour.
// The gate: the null branch is nothing and the other branch is the meter element itself.
const fills = [["flash", (await design("flash/Figures.tsx")).meterFill, /fillTo===null\?null:jsx\("div"/],
  ["ticker", (await design("ticker/Stage.tsx")).meterFill, /fillTo===null\?null:jsx\("div"/],
  ["kinetic", (await design("kinetic/Stage.tsx")).barFill, /fillTo===null\?null:jsx\("div"/],
  ["faceless", faceless.ringFill, /fill===null\?null:jsx\("circle"/]];
const fillFiles = { flash: "flash/Figures.tsx", ticker: "ticker/Stage.tsx", kinetic: "kinetic/Stage.tsx", faceless: "faceless/Stage.tsx" };
for (const [name, fill, gate] of fills) {
  check(`${name}: no meter, bar or ring for a year or a date`, SAID.every((b) => fill(b) === null) && fill("4,35%") > 0, SAID.map(fill).join(","));
  const js = code(fillFiles[name]).js;
  check(`${name} (source): the meter is drawn only when its fill is not null`, gate.test(js) && js.split(/fill(?:To)?===null\?null:/).length === 2);
}
// Talking-head figure meters (th critiques 13): cards' dot grid, datalab's and newsroom's bar,
// chatstory's ring and a stat's bar; each drawn only behind its gate.
for (const [name, file, fn, gates] of [
  ["cards", "cards/Scenes.tsx", "gridFill", [/fillTo===null\?null:jsx\("div"/]],
  ["datalab", "datalab/Figures.tsx", "barFill", [/fillTo===null\?null:jsx\("div"/]],
  ["newsroom", "newsroom/Pieces.tsx", "barFill", [/fillTo===null\?null:jsx\("div"/, /isStat=figure\.source==="stat"&&fillTo!==null/]],
  ["chatstory", "chatstory/Figures.tsx", "ringFill", [/fill===null\?number:jsx\(Circle/, /f\.source==="stat"&&fill!==null\?jsx\(OneBarChart/]],
]) {
  const fill = (await design(file))[fn];
  check(`${name}: no meter, bar or ring for a year or a date`, SAID.every((b) => fill(b) === null) && fill("4,35%") > 0, SAID.map(fill).join(","));
  const js = code(file).js;
  check(`${name} (source): the meter is drawn only behind its fill gate`, gates.every((g) => g.test(js)));
}
// A ring, orbit or road meter is drawn only for a non-null fill (the prop types make a null
// fill a tsc error, so every call site has to gate it).
for (const [name, file, fn] of [["orbit", "orbit/Stage.tsx", "arcFill"], ["phoneapp", "phoneapp/Phone.tsx", "ringFill"], ["journey", "journey/Stage.tsx", "roadFill"]]) {
  const fill = (await design(file))[fn];
  check(`${name}: no ring or road meter for a year or a date`, SAID.every((b) => fill(b) === null) && fill("4,35%") > 0, SAID.map(fill).join(","));
}
// Comment-stripped, whitespace-free: outside the files whose hook text (d) evaluates, a design
// (src/designs and src/youtube) may only test `countTo` against undefined, copy it unchanged
// (`countTo:x.countTo`, a destructured prop) or hand it to hookText; any other read (arithmetic,
// `?? 0`, interpolate, formatting) fails, so every other hook prints through the core hookText.
const EVALUATED = ["gauge/Scenes.tsx", "scale/Plan.ts", "pulse/Beats.tsx", "receipt/Stage.tsx", "calendar/Page.tsx", "timelapse/Plan.ts", "splitscreen/Scenes.tsx", "flipcard/Stage.tsx"].map((f) => `designs/${f}`);
const fromZero = ["designs", "youtube"].flatMap((d) => readdirSync(join(ROOT, "src", d), { recursive: true }).map((f) => `${d}/${f.replace(/\\/g, "/")}`))
  .filter((f) => /\.tsx?$/.test(f) && !EVALUATED.includes(f))
  .filter((f) => /countTo/.test(code(`../${f}`).js.replace(/\s/g, "")
    .replace(/\.?countTo[!=]==(?:void0|undefined)/g, "")
    .replace(/countTo:[\w.]+\.countTo(?=[,}])/g, "")
    .replace(/hookText\(\{[^}]*\}/g, "")
    .replace(/([{,])countTo(?=\}(?:\)=>|=))/g, "$1")));
check("every design's hook text (src/designs, src/youtube) goes through the core hookText (source: countTo only tested, copied or passed to hookText)", fromZero.length === 0, fromZero.join(", "));
const yearView = gaugeMod.figureView({ big: "2026", label: "", source: "auto", fromFrame: 0, frames: 45 }, 20, FPS);
const rateView = gaugeMod.figureView({ big: "4,35%", label: "", source: "auto", fromFrame: 0, frames: 45 }, 20, FPS);
check("gauge: a year is a plain readout (dial dimmed, no lit arc), a rate keeps its needle", yearView.plain === true && !yearView.lit && yearView.readout.text === "2026" && !rateView.plain && Boolean(rateView.lit));
const kickers = [["ticker", "ticker/Stage.tsx"], ["receipt", "receipt/Figures.tsx"], ["splitscreen", "splitscreen/Chip.tsx"], ["bigdigit", "bigdigit/Stage.tsx"], ["flash", "flash/Figures.tsx"], ["retro", "retro/Stage.tsx"],
  ["cards", "cards/Scenes.tsx"], ["editorial", "editorial/Behind.tsx"]];
for (const [name, file] of kickers) {
  const { kickerOf } = await design(file);
  const k = ["2026", "29/9", "4,35%"].map(kickerOf);
  check(`${name}: a year or a date gets a neutral kicker, not "CON SỐ"`, k[0] === "NĂM" && k[1] === "NGÀY" && k[2] === "CON SỐ", k.join(" | "));
}
check("cards, editorial (source): the figure kicker is kickerOf, not a fixed word",
  /text:kickerOf\(figure\.big\)/.test(code("cards/Scenes.tsx").js) && /children:kickerOf\(big\)/.test(code("editorial/Behind.tsx").js) && code("editorial/Behind.tsx").js.split('"CON S\\u1ED0"').length === 2);
check("scale: a lone hook value keeps the beam level", lone.pans[0] === null && lone.tilts.every((x) => x.angle === 0), JSON.stringify(lone.tilts));
const { CX } = await design("scale/Scale.tsx");
const plaques = [[1, 737, 400], [1, 730, 400], [0, 277, 400], [1, 900, 300]].map(([side, x, w]) => [side, scaleStage.plaqueLeft(side, x, w), w]);
check("scale: no plaque over the pillar (46 px clear of its centre)", plaques.every(([side, l, w]) => (side === 1 ? l >= CX + 46 : l + w <= CX - 46)), JSON.stringify(plaques));
const receiptStage = await_receipt;
check("receipt: no \"TỔNG\" on a rate hook, kept on an amount", receiptStage.totalWordOf(HOOK_RATE) === "" && receiptStage.totalWordOf({ big: "290 đô" }) === "TỔNG");
const { titleStyle } = await_calendar;
const pad = [[300, 400]];
const at = (f) => titleStyle(f, pad);
check("calendar: title page torn off before the notepad comes in, back after it",
  at(270) === undefined && at(290)?.transform !== undefined && at(299)?.opacity !== undefined && Number(at(300)?.opacity ?? 1) === 0 && at(350)?.opacity === 0 && at(405)?.opacity > 0 && at(420) === undefined,
  [270, 290, 300, 350, 405, 420].map((f) => JSON.stringify(at(f)?.opacity ?? null)).join(" "));
const { keepUnits } = await bundle("src/elements/keepUnits.ts");
const kept = keepUnits("Lãi suất cơ bản sau 3 lần tăng");
check("keepUnits: a number keeps its word, two-word units stay whole", kept === "Lãi\u00a0suất cơ\u00a0bản sau 3\u00a0lần tăng", JSON.stringify(kept));
for (const file of ["receipt/Stage.tsx", "timelapse/Scenes.tsx"])
  check(`${file} (source): headline wrapped through keepUnits`, /keepUnits\((hook\.sub|s\.title)\)/.test(code(file).js));
check("ticker/index.tsx (source): the tape starts after the hook", /from:reel\.edit\.hook\?HOOK_FRAMES:0,[^}]*children:jsx\(Tape\b/.test(code("ticker/index.tsx").js));

// (j) talking-head repeats (th critiques 13, 03/10/2026): checklist's hook shows no "0/0"; series
// hides an empty strip; kitchen's hook is exact and its meaning up by talk frame 25 (a still at reel
// frame 90); reaction's pushed artefact keeps clear of the logo, its headline wraps by word.
{
  const { hookTrackLabel } = await design("checklist/StepColumn.tsx");
  check('checklist: no "0/0" track under the hook without chapters', hookTrackLabel(0) === null && hookTrackLabel(3) === "0/3", `${hookTrackLabel(0)} | ${hookTrackLabel(3)}`);
  check("checklist/index.tsx (source): the hook track is drawn only for a label",
    /trackLabel===null\?null:jsx\("div",\{style:\{marginTop:24\},children:jsx\(ProgressTrack,\{filled:0,label:trackLabel\}/.test(code("checklist/index.tsx").js.replace(/\s/g, "")));
  const { stripText } = await design("series/Strip.tsx");
  const { stripLine } = await design("series/episode.ts");
  const ch = [{ atMs: 2000, title: "Lãi suất" }];
  const at = (ms) => Math.round((ms / 1000) * FPS);
  const empty = [0, 90, 190, 300].map((f) => stripText([], at, f, FPS, stripLine(undefined)).text);
  const chap = stripText(ch, at, 70, FPS, "").text;
  check("series: no strip text without an episode or chapter, a chapter still shows", empty.every((t) => t === "") && chap === "PHẦN 1 · LÃI SUẤT", `${JSON.stringify(empty)} | ${chap}`);
  check("series/Strip.tsx (source): the strip is drawn only with text", /text\?jsx\(StripBar,\{text,chapter\}\):null/.test(code("series/Strip.tsx").js));
  const { hookAt } = await design("kitchen/Bubbles.tsx");
  const k = hookAt(25);
  check("kitchen: by talk frame 25 the hook is solid, exact and its meaning up", k.bigIn === 1 && k.subIn === 1 && !k.typing && golden.hookText(HOOK_RATE, k.count) === "4,35%", JSON.stringify(k));
  check("kitchen/Bubbles.tsx (source): KitchenHook draws from hookAt", /const\{bigIn,subIn,count,typing\}=hookAt\(frame\);constbig=hookText\(hook,count\)/.test(code("kitchen/Bubbles.tsx").js.replace(/\s/g, "")));
  const { ARTEFACT, PUSH } = await design("reaction/Artefact.tsx");
  const { LOGO_CLEAR } = await design("classic/Infographics.tsx");
  const right = ARTEFACT.left + (ARTEFACT.width * (1 + PUSH)) / 2;
  check("reaction: the pushed artefact's right edge stays left of LOGO_CLEAR", right <= LOGO_CLEAR, `right ${right.toFixed(1)}, LOGO_CLEAR ${LOGO_CLEAR}`);
  const ra = code("reaction/Artefact.tsx").js.replace(/\s/g, "");
  check("reaction/Artefact.tsx (source): the headline is highlighted word by word (wraps, never clipped), push is PUSH",
    /words\.map\(/.test(ra) && /children:w\}\)/.test(ra) && !/children:title\}/.test(ra) && /\[1,PUSH\]/.test(ra));
}

// (g) classic cue panels (Panel, classic/Infographics.tsx), in every design that places one: each
// panel host's real offset (bundled from its source), Panel's own motion and clip, and the
// LogoMark's measured tile. At every drop-in and fly-out frame the visible top stays inside SAFE
// and no higher than the rest top; while the logo shows, a panel resting in its band keeps its
// right edge left of the logo.
{
  const { spring } = await import("remotion");
  const { pop } = await bundle("src/mortgage/style.ts");
  const info = await design("classic/Infographics.tsx");
  const panel = code("classic/Infographics.tsx").js;
  const motion = panel.match(/const Panel=[\s\S]*?const y=interpolate\(inP,\[0,1\],\[(-?\d+),0\]\)-exit\*(\d+);const moving=y<-1;[\s\S]*?clipPath:moving\?`inset\(\$\{PANEL_TOP\}px 0 0 0\)`:void 0[\s\S]*?top:PANEL_TOP,[\s\S]*?right:1080-SAFE\.right\+clear,[\s\S]*?boxShadow:moving\?"none":[\s\S]*?translateY\(\$\{y\}px\)/);
  check("classic Panel (source): clipped at PANEL_TOP, rests at PANEL_TOP, right edge clears the logo, motion read", Boolean(motion), motion ? `from ${motion[1]}, out ${motion[2]}` : "Panel's clip, top, right or motion not found");
  // Panel hosts: every file that passes a panelOffset or provides PanelPlace, and every file that
  // mounts a classic panel (Panel, Points or the classic CueView) must set PanelPlace.
  const files = readdirSync(join(ROOT, "src", "designs"), { recursive: true }).map((f) => f.replace(/\\/g, "/")).filter((f) => /\.tsx?$/.test(f));
  const mounts = files.filter((f) => f !== "classic/Infographics.tsx" && /import\{[^}]*\b(Panel|Points)\b[^}]*\}from"(?:\.\.\/classic|\.)\/Infographics"/.test(code(f).js.replace(/\s/g, "")));
  const unplaced = mounts.filter((f) => !/PanelPlace\.Provider/.test(code(f).js));
  check("every file that mounts a classic Panel sets its PanelPlace", mounts.length >= 2 && unplaced.length === 0, `mounts: ${mounts.join(", ")}${unplaced.length ? `; unplaced: ${unplaced.join(", ")}` : ""}`);
  // Real offsets: the file bundled with its panelOffset / POINTS_OFFSET expressions exported.
  // Each host: its offset, its layer width (MotionTrack and explainer full width, checklist's
  // ColumnCueTrack HOST_WIDTH, bundled too) and whether it passes logo={false}.
  const offsetsOf = async (f) => {
    const src = readFileSync(join(ROOT, "src", "designs", f), "utf8");
    const found = [...src.matchAll(/panelOffset=\{([^}]+)\}/g)].map((m) => {
      const open = Math.max(src.lastIndexOf("<MotionTrack", m.index), src.lastIndexOf("<ColumnCueTrack", m.index));
      const tag = src.slice(open, src.indexOf("/>", m.index));
      return { expr: m[1], column: tag.startsWith("<ColumnCueTrack"), logo: !/logo=\{false\}/.test(tag) };
    });
    if (/const POINTS_OFFSET\b/.test(src)) found.push({ expr: "POINTS_OFFSET", column: false, logo: true, scaled: true });
    if (!found.length) return [];
    const exprs = found.map((h) => h.expr).concat(found.some((h) => h.scaled) ? ["POINTS_SCALE"] : []);
    const outfile = join(out, `${f.replace(/\W/g, "_")}-offsets.mjs`);
    buildSync({ stdin: { contents: `${src}\nexport const __offsets = [${exprs.join(", ")}];`, loader: f.endsWith("x") ? "tsx" : "ts", resolveDir: join(ROOT, "src", "designs", f, "..") },
      bundle: true, format: "esm", platform: "node", jsx: "automatic", packages: "external", logLevel: "error", outfile });
    const offs = (await import(pathToFileURL(outfile).href)).__offsets;
    // The scale the layer is really drawn at: POINTS_SCALE only if the rendered transform applies
    // it from (SAFE.left, PANEL_TOP); otherwise 1 (and the offset only if it translates by it).
    const drawn = code(f).js.replace(/\s/g, "");
    const scaled = /transform:`translateY\(\$\{POINTS_OFFSET\}px\)scale\(\$\{POINTS_SCALE\}\)`,transformOrigin:`\$\{SAFE\.left\}px\$\{PANEL_TOP\}px`/.test(drawn);
    const moved = /transform:`translateY\(\$\{POINTS_OFFSET\}px\)/.test(drawn);
    const told = /PanelPlace\.Provider,\{value:\{[^}]*scale:POINTS_SCALE/.test(drawn); // the scale Panel is told
    return found.map((h, i) => ({
      offset: h.scaled && !moved ? 0 : offs[i], logo: h.logo, width: h.column ? columnWidth : 1080,
      scale: h.scaled && scaled ? offs.at(-1) : 1, toldScale: h.scaled && told ? offs.at(-1) : 1,
    }));
  };
  // checklist's ColumnCueTrack layer width, from its own module.
  const colOut = join(out, "column-width.mjs");
  buildSync({ stdin: { contents: `${readFileSync(join(ROOT, "src", "designs", "checklist", "ColumnCues.tsx"), "utf8")}\nexport const __w = HOST_WIDTH;`, loader: "tsx", resolveDir: join(ROOT, "src", "designs", "checklist") },
    bundle: true, format: "esm", platform: "node", jsx: "automatic", packages: "external", logLevel: "error", outfile: colOut });
  const columnWidth = (await import(pathToFileURL(colOut).href)).__w;
  const hosts = [];
  for (const f of files.filter((f) => /panelOffset=\{|const POINTS_OFFSET\b/.test(readFileSync(join(ROOT, "src", "designs", f), "utf8"))))
    for (const h of await offsetsOf(f)) hosts.push([f, h]);
  // The LogoMark tile: the logo file's size, LOGO_HEIGHT, LogoMark's padding and its pop-in spring.
  const png = readFileSync(join(ROOT, "public", "brand", "finhub-logo.png"));
  const [pw, ph] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  const logoJs = code("../mortgage/LogoMark.tsx").js;
  const pad = logoJs.match(/padding:"(\d+)px (\d+)px"/)?.slice(1).map(Number) ?? [NaN, NaN];
  const cfg = logoJs.match(/damping:(\d+),stiffness:(\d+)/)?.slice(1).map(Number) ?? [NaN, NaN];
  const grow = Math.max(...[...Array(60).keys()].map((f) => 0.6 + 0.4 * spring({ frame: f, fps: FPS, config: { damping: cfg[0], stiffness: cfg[1] } })));
  const logo = { left: golden.SAFE.right - (golden.LOGO_HEIGHT * pw / ph + 2 * pad[1]) * grow, bottom: golden.SAFE.top + (golden.LOGO_HEIGHT + 2 * pad[0]) * grow };
  check("Panel's logo constants hold the measured LogoMark tile", info.LOGO_CLEAR < logo.left && info.LOGO_BOTTOM >= logo.bottom, `tile left ${logo.left.toFixed(1)}, bottom ${logo.bottom.toFixed(1)} (pop ${grow.toFixed(3)}); LOGO_CLEAR ${info.LOGO_CLEAR}, LOGO_BOTTOM ${info.LOGO_BOTTOM}`);
  const [from, outBy] = motion ? [Number(motion[1]), Number(motion[2])] : [NaN, NaN];
  const dur = 120;
  const talk = 1500;
  check("checklist/ColumnCues.tsx (source): its PanelPlace carries the column's width", /PanelPlace\.Provider,\{value:\{[^}]*width:HOST_WIDTH/.test(code("checklist/ColumnCues.tsx").js.replace(/\s/g, "")));
  const drawsLogo = (f) => {
    const dir = join(ROOT, "src", "designs", f.split("/")[0]);
    return readdirSync(dir).some((x) => /\.tsx$/.test(x) && /<LogoMark\b/.test(readFileSync(join(dir, x), "utf8")));
  };
  for (const [f, { offset, width, logo: logoOn, scale, toldScale }] of hosts) {
    const rest = info.PANEL_TOP + offset;
    const frames = [...Array(31).keys(), ...Array.from({ length: 11 }, (_, i) => dur - 10 + i)];
    const tops = frames.map((fr) => {
      const exit = Math.min(1, Math.max(0, (fr - (dur - 10)) / 10));
      const y = from * (1 - pop(fr, FPS, 0)) - exit * outBy;
      return motion && y < -1 ? Math.max(rest + y, rest) : rest + y; // clipped only while above the line
    });
    const high = Math.min(...tops);
    const name = `${f.split("/")[0]} (${f}, rest ${rest})`;
    check(`${name}: panel inside SAFE, never above its rest top`, Number.isFinite(high) && high >= golden.SAFE.top - 1 && high >= rest - 1, `highest visible top ${Math.round(high)}`);
    const hasLogo = drawsLogo(f);
    if (!logoOn) check(`${name}: logo={false} only in a design without a LogoMark`, !hasLogo);
    if (rest < logo.bottom && hasLogo) {
      // Sample cues starting every 10 frames, short and long: the panel's right edge is the same
      // at every frame of a cue (no rewrap while read) and left of the logo whenever it shows.
      const place = { offset, talkFrames: talk, width, logo: logoOn, scale: toldScale };
      const bad = [];
      for (let from = 0; from < talk && bad.length < 3; from += 10)
        for (const dur of [40, 200]) {
          // On screen: a scaled host shrinks from SAFE.left.
          const edges = [...Array(dur).keys()].map((fr) => golden.SAFE.left + (width - (1080 - golden.SAFE.right) - info.panelInset({ ...place, from }, fr, dur, FPS) - golden.SAFE.left) * scale);
          if (new Set(edges).size !== 1) bad.push(`cue ${from}+${dur}: width changes`);
          const hit = edges.findIndex((e, fr) => golden.logoVisible(from + fr, talk, FPS) && !(e < logo.left));
          if (hit >= 0) bad.push(`cue ${from}+${dur}: frame ${from + hit} under the logo`);
          // Two-sided: narrowed only to LOGO_CLEAR on screen (a scaled host's inset divides by its scale).
          const normal = golden.SAFE.left + (width - (1080 - golden.SAFE.right) - golden.SAFE.left) * scale;
          const over = edges.findIndex((e) => e < Math.min(info.LOGO_CLEAR, normal) - 1);
          if (over >= 0) bad.push(`cue ${from}+${dur}: edge ${edges[over].toFixed(0)} left of LOGO_CLEAR ${info.LOGO_CLEAR} (over-narrowed)`);
        }
      check(`${name}: one width per cue, clear of the LogoMark whenever it shows, never past LOGO_CLEAR`, bad.length === 0, bad.join("; ") || `layer ${width}`);
    }
  }
  check("panel hosts found", hosts.length >= 30, `${hosts.length}`);
  // A cue whose last frame is 6 before the logo window still narrows (LOGO_MARGIN: it flies out
  // as the logo pops in); a panel resting at or below LOGO_BOTTOM never narrows.
  const near = { offset: 0, talkFrames: talk, width: 1080, logo: true, from: golden.HOOK_FRAMES - 40 };
  const below = { ...near, offset: info.LOGO_BOTTOM - info.PANEL_TOP, from: golden.HOOK_FRAMES };
  check("classic Panel: narrow for a cue ending 6 frames before the logo window, never when resting below LOGO_BOTTOM",
    info.panelInset(near, 0, 35, FPS) > 0 && info.panelInset(below, 0, 60, FPS) === 0, `${info.panelInset(near, 0, 35, FPS)}, ${info.panelInset(below, 0, 60, FPS)}`);

  // YouTube (src/youtube/Kit.tsx CueFallback16): the classic panels scaled into 16:9 rest inside
  // YT_SAFE and, whenever LogoMark16 shows (from frame 0, not the vertical windows), keep their
  // right edge left of its measured tile; one width per cue.
  const kit = await bundle("src/youtube/Kit.tsx");
  const { YT_SAFE } = await bundle("src/youtube/frame.ts");
  const kitJs = readFileSync(join(ROOT, "src", "youtube", "Kit.tsx"), "utf8");
  const [kh, kpad] = [Number(kitJs.match(/const LOGO_HEIGHT = (\d+);/)?.[1]), kitJs.match(/padding: "(\d+)px (\d+)px"/)?.slice(1).map(Number) ?? [NaN, NaN]];
  // LogoMark16's own window, read from its fade (opacity > 0), not from the helper under test.
  const show = Number(kitJs.match(/const LOGO_SHOW_FRAMES = (\d+);/)?.[1]);
  check("youtube Kit (source): LogoMark16 fades over [0, 10, LOGO_SHOW_FRAMES - 10, LOGO_SHOW_FRAMES] and from talkFrames - LOGO_SHOW_FRAMES",
    show > 0 && /\[0, 10, LOGO_SHOW_FRAMES - 10, LOGO_SHOW_FRAMES\]/.test(kitJs) && /\[talkFrames - LOGO_SHOW_FRAMES, talkFrames - LOGO_SHOW_FRAMES \+ 10\]/.test(kitJs));
  check("youtube Kit: LogoMark16 shows for the vertical reels' LOGO_SECONDS", show === golden.LOGO_SECONDS * FPS, `LOGO_SHOW_FRAMES ${show}, LOGO_SECONDS ${golden.LOGO_SECONDS}`);
  const logo16Shows = (fr, talkFrames) => (fr > 0 && fr < show) || fr > talkFrames - show;
  const tile = { left: YT_SAFE.right - (kh * pw / ph + 2 * kpad[1]), bottom: YT_SAFE.top + kh + 2 * kpad[0] };
  const k = kit.CUE16_SCALE;
  const boxLeft = YT_SAFE.right - 1080 * k;
  const restTop = (info.PANEL_TOP + kit.CUE16_OFFSET) * k;
  check("youtube Kit (source): CueFallback16 passes CUE16_OFFSET and LogoMark16's windows",
    /panelOffset=\{CUE16_OFFSET\}\s*logo=\{\(f\) => logo16Visible\(f, reel\.timeline\.talkFrames\)\}/.test(kitJs) && /left: YT_SAFE\.right - 1080 \* scale/.test(kitJs));
  check("youtube Kit: panels rest inside YT_SAFE", restTop >= YT_SAFE.top && boxLeft + golden.SAFE.left * k >= YT_SAFE.left, `rest top ${restTop.toFixed(1)}, YT_SAFE.top ${YT_SAFE.top}`);
  const ytBad = [];
  if (restTop < tile.bottom)
    for (let from = 0; from < talk && ytBad.length < 3; from += 10)
      for (const dur of [40, 200]) {
        const place = { offset: kit.CUE16_OFFSET, talkFrames: talk, width: 1080, logo: (fr) => kit.logo16Visible(fr, talk), from };
        const edges = [...Array(dur).keys()].map((fr) => boxLeft + (golden.SAFE.right - info.panelInset(place, fr, dur, FPS)) * k);
        if (new Set(edges).size !== 1) ytBad.push(`cue ${from}+${dur}: width changes`);
        const hit = edges.findIndex((e, fr) => logo16Shows(from + fr, talk) && !(e < tile.left));
        if (hit >= 0) ytBad.push(`cue ${from}+${dur}: frame ${from + hit} under LogoMark16 (edge ${edges[hit].toFixed(0)} vs ${tile.left.toFixed(0)})`);
      }
  check("youtube Kit: one width per cue, clear of LogoMark16 whenever it shows", ytBad.length === 0, ytBad.join("; ") || `tile left ${tile.left.toFixed(1)}`);
}

// (i) blueprint and orbit, every fixture with words (and rba-sept-2026 with injected stats that
// force a chip): every core figure is on the stage (rule 1, never dropped); none shares it with a
// compare cue except a hold over the cue's drop-in (at most 10 frames, to reach the reading floor);
// a figure moved after the cue is a chip whenever another cue or figure is up then; no two figures
// in one place at once; the chip places are clear of everything that can be up with them
// (rba-sept-2026: 2027 at 705 holds 45 frames, 1 over compare 749).
{
  const { outFrameOf } = await bundle("src/mortgage/schema.ts");
  const { recordingPath } = await bundle("src/mortgage/recording.ts");
  const vids = join(ROOT, "public", "videos");
  const orbitMod = await design("orbit/Stage.tsx");
  const stages = await Promise.all(["blueprint", "orbit"].map(async (n) => [n, (await design(`${n}/Stage.tsx`)).stageFigures]));
  // Where each design draws a figure: blueprint the chip strip or the stage; orbit the chip moon,
  // the in-stage moon (moonsOf) or the core. Two figures in one place at once overlap.
  const placeOf = {
    blueprint: (shown) => (f) => (f.chip ? "chip" : "stage"),
    orbit: (shown, reel) => {
      const moons = orbitMod.moonsOf(shown, Boolean(reel.edit.hook));
      return (f) => (f.chip ? "chip moon" : moons.has(f) ? "moon" : "core");
    },
  };
  // Fixtures, plus rba-sept-2026 with injected stats that force the moved cases (none of the
  // fixtures reaches a chip): said under the compare with the points cue next (a chip on a busy
  // stage); said under it with another stat said just after it (a moved figure on the next
  // figure); two said under it (two moved figures queue).
  const reels = [];
  const rbaPub = join(vids, "rba-sept-2026");
  const forced = [
    ["busy stage", [{ atMs: 25800, durMs: 3000, big: "3.675 đô", label: "Trả mỗi tháng" }], [{ atMs: 37484, title: "Rủi ro" }]],
    ["moved on the next figure", [{ atMs: 30000, durMs: 3000, big: "3.675 đô", label: "Trả mỗi tháng" }, { atMs: 37100, durMs: 3000, big: "290 đô", label: "Thêm mỗi tháng" }]],
    ["two moved", [{ atMs: 28000, durMs: 3000, big: "3.388 đô", label: "Trước" }, { atMs: 31000, durMs: 3000, big: "3.675 đô", label: "Sau" }]],
  ];
  for (const slug of readdirSync(vids).sort()) {
    const editPath = join(vids, slug, "edit.json");
    if (!existsSync(editPath)) continue;
    const edit = JSON.parse(readFileSync(editPath, "utf8"));
    const wordsPath = join(ROOT, "public", recordingPath(slug, edit.source, "words.json"));
    if (!existsSync(wordsPath)) continue;
    reels.push([slug, JSON.parse(readFileSync(wordsPath, "utf8")), edit]);
    if (slug === "rba-sept-2026")
      for (const [what, stats, chapters] of forced)
        reels.push([`${slug} + ${what}`, JSON.parse(readFileSync(wordsPath, "utf8")), { ...edit, ...(chapters && { chapters }), cues: edit.cues.filter((c) => c.kind !== "points" || what === "busy stage"), stats: [...(edit.stats ?? []), ...stats].sort((a, b) => a.atMs - b.atMs) }]);
  }
  check("rba-sept-2026 present for the forced chip reels", existsSync(join(rbaPub, "edit.json")));
  let replayed = 0;
  const chips = { blueprint: 0, orbit: 0 };
  for (const [slug, wordList, edit] of reels) {
    const raw = reelOf(wordList, edit);
    const reel = { ...raw, edit: golden.readingFloor(raw, FPS).edit };
    const at = outFrameOf(reel.timeline, FPS);
    const cues = (reel.edit.cues ?? []).filter((c) => c.kind !== "emoji").map((c) => [at(c.fromMs), at(c.toMs), c.kind]);
    const core = figuresOf(reel, FPS);
    if (!slug.includes(" + ")) replayed++;
    for (const [name, stageFigures] of stages) {
      const shown = stageFigures(reel, FPS);
      chips[name] += shown.filter((f) => f.chip).length;
      // (3b) a moved figure vs the next: no two figures in one place at once.
      const place = placeOf[name](shown, reel);
      const clash = shown.flatMap((f, i) => shown.slice(i + 1).filter((g) => place(g) === place(f) && g.fromFrame < f.fromFrame + f.frames && f.fromFrame < g.fromFrame + g.frames)
        .map((g) => `${f.big}@${f.fromFrame} and ${g.big}@${g.fromFrame} on the ${place(f)}`));
      if (name === "orbit") {
        // A chip moon and a chapter pill up at once (2.5 s from each chapter): the pill (content-box:
        // maxWidth 470 + padding 42 + circle 46 + gap 16 + border 3, text ~0.6 em at 32 px) must end
        // left of the moon. ponytail: estimated text width; measure it if a title lands near the edge.
        const moonLeft = orbitMod.CHIP_MOON.x - orbitMod.CHIP_MOON.r - 15;
        const hits = shown.filter((f) => f.chip).flatMap((f) => (reel.edit.chapters ?? []).filter((c) => {
          const a = at(c.atMs);
          return a < f.fromFrame + f.frames && f.fromFrame < a + Math.round(2.5 * FPS)
            && golden.SAFE.left + 16 + 46 + 16 + 26 + 3 + Math.min(470, 0.6 * 32 * c.title.length) > moonLeft;
        }).map((c) => `${f.big}@${f.fromFrame} under chapter "${c.title}"`));
        check(`orbit ${slug}: no chip moon under a chapter pill`, hits.length === 0, hits.join("; "));
      }
      // orbit's in-stage moon is only for a figure that lands while the core holds another.
      const lone = shown.filter((f) => place(f) === "moon" && !shown.some((g) => place(g) === "core" && g.fromFrame <= f.fromFrame && f.fromFrame < g.fromFrame + g.frames));
      check(`${name} ${slug}: no two figures in one place at once, a moon only beside a figure on the core`, clash.length === 0 && lone.length === 0, clash.join("; ") || shown.map((f) => `${f.big}@${f.fromFrame}+${f.frames} ${place(f)}`).join(", "));
      const missing = core.filter((f) => !shown.some((g) => g.saidFrame === f.saidFrame)).map((f) => f.big);
      const onCompare = shown.filter((f) => cues.some(([a, b, k]) => k === "compare" && f.fromFrame < b && a < f.fromFrame + f.frames && !(f.fromFrame < a && f.fromFrame + f.frames - a <= 10)));
      const onCue = shown.filter((f) => !f.chip && !core.some((g) => g.saidFrame === f.saidFrame && g.fromFrame === f.fromFrame) && cues.some(([a, b]) => f.fromFrame < b && a < f.fromFrame + f.frames));
      check(`${name} ${slug}: every figure on the stage, none on a compare cue, a moved one a chip on a busy stage`,
        missing.length === 0 && onCompare.length === 0 && onCue.length === 0 && shown.every((f) => f.frames >= hold),
        `${spans(shown)}${missing.length ? `; missing ${missing}` : ""}${onCompare.length ? `; on compare ${spans(onCompare)}` : ""}${onCue.length ? `; on a cue ${spans(onCue)}` : ""}`);
    }
  }
  check("blueprint/orbit replay: fixtures found", replayed >= 10, `${replayed}`);
  check("blueprint/orbit: the forced reels reach chips", chips.blueprint >= 3 && chips.orbit >= 3, JSON.stringify(chips));
  if (rba) {
    const shown = (await design("orbit/Stage.tsx")).stageFigures(rba, FPS);
    check("rba-sept-2026: 2027 shows at 705, held its floor over the compare drop-in", shown.some((f) => f.big === "2027" && f.fromFrame === 705 && f.frames === hold), spans(shown));
  }
  // How a chip is drawn (source): blueprint's small FigureChip under the stage, never the full
  // FigureSheet; orbit's moon, never the hero on the core. FigureChip is smaller than any sheet number.
  const bp = code("blueprint/Stage.tsx").js.replace(/\s/g, "");
  check("blueprint (source): a chip figure is drawn as the small FigureChip, others as FigureSheet",
    /children:f\.chip\?jsx\(FigureChip,\{figure:f\}\):jsx\(FigureSheet,\{figure:f\}\)/.test(bp) && /constFigureChip=[\s\S]*?fontSize:48,/.test(bp));
  check("orbit (source): a chip figure is drawn as the moon in CHIP_MOON, never on the core",
    /children:f\.chip\?jsx\(FigureMoon,\{figure:f,at:CHIP_MOON\}\):moons\.has\(f\)\?jsx\(FigureMoon,\{figure:f\}\):jsx\(FigureHero,\{figure:f\}\)/.test(code("orbit/Stage.tsx").js.replace(/\s/g, "")));
  // Where a chip sits (evaluated on the exported places): inside SAFE, clear of everything that
  // can be up with it. blueprint: under the title block, over the stage top (where cue panels
  // rest), left of the logo, above a two-line caption page; orbit: the chip moon (with its ring)
  // right of the chapter pill, left of the logo, over the stage top (panels, the points title).
  const { CHIP } = await design("blueprint/Stage.tsx");
  const paper = await design("blueprint/Paper.tsx");
  const bpIdx = code("blueprint/index.tsx", { SAFE: golden.SAFE }).env;
  const { LOGO_CLEAR } = await design("classic/Infographics.tsx");
  const chipBox = { left: CHIP.left, right: CHIP.left + CHIP.width, top: CHIP.top, bottom: CHIP.top + CHIP.size };
  const captionTop = bpIdx.CAPTION_BOTTOM - (2 * bpIdx.CAPTION_SIZE * 1.3 + 12 + 14 + 4) - 6; // two lines, padding, border, corner ticks
  const inSafe = (b) => b.left >= golden.SAFE.left && b.right <= golden.SAFE.right && b.top >= golden.SAFE.top && b.bottom <= golden.SAFE.bottom;
  check("blueprint: the chip sits in SAFE, under the title block, over the stage top, left of the logo, above a two-line caption",
    inSafe(chipBox) && chipBox.top >= golden.SAFE.top + paper.TB_H && chipBox.bottom <= paper.STAGE.top && chipBox.right <= LOGO_CLEAR && chipBox.bottom <= captionTop,
    `${JSON.stringify(chipBox)}; stage top ${paper.STAGE.top}, caption top ${captionTop.toFixed(0)}`);
  const space = await design("orbit/Space.tsx");
  const m = orbitMod.CHIP_MOON;
  const ring = m.r + 12 + 3; // Gauge R = r + 12, stroke 6
  const moonBox = { left: m.x - ring, right: m.x + ring, top: m.y - ring, bottom: m.y + ring };
  const orbitIdx = code("orbit/index.tsx", { STAGE_TOP: space.STAGE_TOP }).env;
  check("orbit (source): the chapter pill is still maxWidth 470 at SAFE.left (the per-reel pill check's model)",
    /constChapterNode=[\s\S]*?top:SAFE\.top\+10,left:SAFE\.left,maxWidth:470,/.test(code("orbit/Stage.tsx").js.replace(/\s/g, "")));
  check("orbit: the chip moon sits in SAFE, left of the logo, over the stage top (panels, points title)",
    inSafe(moonBox) && moonBox.right <= LOGO_CLEAR && moonBox.bottom <= space.STAGE_TOP && moonBox.bottom <= 110 + orbitIdx.PANEL_OFFSET && moonBox.bottom <= space.DOCK.y - 32,
    `${JSON.stringify(moonBox)}; stage top ${space.STAGE_TOP}`);
  const { yieldToCompare } = await bundle("src/elements/yieldToCompare.ts");
  const f = (fromFrame, frames) => ({ fromFrame, frames });
  const r = yieldToCompare([f(0, 90), f(100, 90), f(300, 60), f(500, 60), f(600, 90)], [[60, 120], [320, 400], [640, 700]], [[60, 120], [320, 400], [400, 430], [640, 700]], 45);
  const want = [f(0, 60), { ...f(120, 90), chip: false }, { ...f(400, 60), chip: true }, f(500, 60), f(600, 45)];
  check("yieldToCompare: cut after its floor, held over a short drop-in, moved after the cue (a chip on a busy stage), never dropped", JSON.stringify(r) === JSON.stringify(want), JSON.stringify(r));
}

// phoneapp's checklist bar: said / n, empty before the first item ("0/2" was half full).
{
  const { checklistProgress } = await design("phoneapp/Cues.tsx");
  const starts = [40, 100];
  const seen = [0, 39, 45, 70, 105, 130].map((f) => checklistProgress(f, starts));
  check("phoneapp: the checklist bar shows what has been said (0, then 1/2, then 2/2)", seen[0] === 0 && seen[1] === 0 && seen[2] === 0 && seen[3] === 0.5 && seen[4] === 0.5 && seen[5] === 1, seen.join(" | "));
}

// (h) the hook-time branches deleted from kinetic, whiteboard, retro, receipt, paper and blueprint
// stay unreachable: on every fixture in public/videos with words (its reading-time floor applied,
// as a render does), a reel with a hook has no figure before HOOK_FRAMES. A reel without a hook
// never took them (each needed a hook). Every fixture: no two core figures overlap.
{
  const { recordingPath } = await bundle("src/mortgage/recording.ts");
  const vids = join(ROOT, "public", "videos");
  let replayed = 0;
  for (const slug of readdirSync(vids).sort()) {
    const editPath = join(vids, slug, "edit.json");
    if (!existsSync(editPath)) continue;
    const edit = JSON.parse(readFileSync(editPath, "utf8"));
    const wordsPath = join(ROOT, "public", recordingPath(slug, edit.source, "words.json"));
    if (!existsSync(wordsPath)) continue;
    const raw = reelOf(JSON.parse(readFileSync(wordsPath, "utf8")), edit);
    const reel = { ...raw, edit: golden.readingFloor(raw, FPS).edit };
    replayed++;
    // Every fixture, hook or not: no two core figures at once (ty-do-explainer: "400" at 280 and
    // "~$400" at 297), each held >= the number hold.
    const all = figuresOf(reel, FPS);
    const overlap = all.filter((f, i) => i > 0 && f.fromFrame < all[i - 1].fromFrame + all[i - 1].frames);
    check(`replay ${slug}: figures never overlap, each held >= ${hold} frames`, overlap.length === 0 && all.every((f) => f.frames >= hold), spans(all));
    if (!reel.edit.hook) continue;
    const early = figuresOf(reel, FPS).filter((f) => f.fromFrame < HOOK);
    check(`replay ${slug}: no figure before the hook ends`, early.length === 0, spans(early));
  }
  check("replay: fixtures with words found", replayed >= 10, `${replayed} replayed`);
  // A stat card timed from edit.json itself skips the core's staging (explainer, classic, studio
  // drew "~$400" over the automatic "400"): no design reads a durMs (source, comment-stripped).
  const own = ["designs", "youtube"].flatMap((d) => readdirSync(join(ROOT, "src", d), { recursive: true }).map((f) => `${d}/${f.replace(/\\/g, "/")}`))
    .filter((f) => /\.tsx?$/.test(f) && /\bdurMs\b/.test(code(`../${f}`).js));
  check("no design times a stat card from edit.json (stats come from figuresOf)", own.length === 0, own.join(", "));
  // classic, explainer and studio draw their stat cards from statSequences: each Sequence (read from
  // the returned elements) starts and lasts as the core's stat figure, on every fixture with stats and
  // on the two-stats-in-the-hook reel (staged: shown after the hook, not when said); each component
  // renders statSequences.
  const statReels = [...reels];
  for (const slug of readdirSync(vids).sort()) {
    const edit = existsSync(join(vids, slug, "edit.json")) ? JSON.parse(readFileSync(join(vids, slug, "edit.json"), "utf8")) : null;
    const wordsPath = edit && join(ROOT, "public", recordingPath(slug, edit.source, "words.json"));
    if (!edit?.stats?.length || !existsSync(wordsPath)) continue;
    const raw = reelOf(JSON.parse(readFileSync(wordsPath, "utf8")), edit);
    statReels.push([slug, { ...raw, edit: golden.readingFloor(raw, FPS).edit }]);
  }
  for (const [file, component] of [["classic/Captions.tsx", "StatCards"], ["explainer/Overlay.tsx", "StatNotes"], ["studio/index.tsx", "Overlay"]]) {
    const { statSequences } = await design(file);
    const bad = statReels.flatMap(([name, reel]) => {
      const want = figuresOf(reel, FPS).filter((f) => f.source === "stat").map((f) => `${f.fromFrame}+${f.frames}`).join(" ");
      const got = statSequences(reel, FPS).map((el) => `${el.props.from}+${el.props.durationInFrames}`).join(" ");
      return got === want ? [] : [`${name}: ${got} vs core ${want}`];
    });
    check(`${file}: every stat Sequence starts and lasts as the core's figure (${statReels.length} reels)`, bad.length === 0 && statReels.length >= 8, bad.slice(0, 2).join("; "));
    check(`${file} (source): ${component} renders statSequences(reel, fps)`, new RegExp(`const${component}=[\\s\\S]*?statSequences\\(reel,fps\\)(?=[,}\\]])`).test(code(file).js.replace(/\s/g, "")));
  }
}

if (only === null) {
  const typo = spawnSync(process.execPath, [import.meta.filename, "--only", "zz-no-such-design"], { encoding: "utf8" });
  check("--only <typo> exits non-zero at once", typo.status === 1 && /not a design id/.test(typo.stdout), `exit ${typo.status}`);
}
if (only !== null && !matched) {
  console.log(`FAIL --only ${only}: no check names it (a typo, or no design by that id)`);
  failed = true;
}
console.log(failed ? "design figures: FAILED" : `design figures ok (${passed} checks${verbose ? "" : "; --verbose prints each"})`);
process.exit(failed ? 1 : 0);
