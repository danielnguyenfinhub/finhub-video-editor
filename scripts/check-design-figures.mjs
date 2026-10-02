// Check the design-side number and caption rules from the viewed critiques (02/10/2026),
// on the core and the designs' real exported helpers. Run: node scripts/check-design-figures.mjs
//   (a) a calendar year or a date is shown as said, never counted up or spun: the core's
//       `asSaid` and every design's own counter of a figure (each file that defines a
//       `counted` must be listed here, so a new one cannot skip the check);
//   (b) the core's `figuresOf` makes a figure said during the hook wait for its end, never
//       overlapping the next, each held >= the number hold, a stat its reading time; figures
//       said after the hook (or with no hook) are untouched; faceless `stagedFigures` builds
//       on it (rba-sept-2026 and a synthetic reel with two stats said during the hook);
//   (c) the eleven faceless-data designs: ten stage plans show each core figure, none before
//       the hook end (ticker, which has no plan, by source); faceless StageLayer / index.tsx
//       still use the staged helper;
//   (d) the hook count-up never starts from 0: each of the eight counting designs' hook
//       text, evaluated at count progress 0, 0.5 and 1;
//   (e) every design whose said caption word grows keeps a non-zero `saidRoom` margin, in use
//       ("ThángHai"); kinetic fits its lines to FIT_W, narrower than SAFE_W;
//   (f) evaluated: no meter, bar, ring or needle for a year (flash, ticker, kinetic, faceless,
//       gauge, orbit, phoneapp, journey), every hook count through hookCount (source), a neutral kicker not "CON SỐ" for a year or date, a level scale beam for a lone
//       hook value and plaques off the pillar, no "TỔNG" on a rate, the calendar title page torn
//       before a points notepad, headline units kept together (keepUnits);
//   (g) classic cue panels (Panel) in every design that places one: clipped at their rest top,
//       inside SAFE at every drop-in / fly-out frame, right edge clear of the measured LogoMark
//       tile while it shows;
//   (h) replay of every public/videos fixture with words: with a hook, no figure before
//       HOOK_FRAMES (the hook-time branches deleted from six designs stay unreachable).
//   (i) blueprint and orbit: a figure yields to a compare cue on the same stage; phoneapp's
//       checklist bar is said / n; (d) also runs every hook text on "4,1 TỶ ĐÔ", "10%", "2026".
// Source checks (marked "source" below) read comment-stripped, whitespace-free code, so a
// commented-out use does not pass; they cannot see a render, so what they guard is a `rule`
// in corrections.md, not `checked`.
// esbuild is not a direct dependency: it ships with @remotion/bundler, so it is resolved from
// there (works hoisted or nested, no package.json change).
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

let failed = false;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed = true;
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
check("no hook: figures start when said", noHook.every((f) => f.fromFrame === f.saidFrame), spans(noHook));
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
}

// (e) said-word scale keeps the word space; kinetic fits to the narrower width.
for (const file of ["journey/Captions.tsx", "orbit/Stage.tsx", "isometric/Captions.tsx", "retro/index.tsx", "kinetic/Captions.tsx"]) {
  const { js, env } = code(file);
  const room = typeof env.saidRoom === "function" ? env.saidRoom(1.12, "Tháng") : 0;
  check(`${file}: said word keeps a saidRoom margin`, room > 0 && /margin:`[^`]*saidRoom\(/.test(js), `saidRoom(1.12, "Tháng") = ${room}`);
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
// A ring, orbit or road meter is drawn only for a non-null fill (the prop types make a null
// fill a tsc error, so every call site has to gate it).
for (const [name, file, fn] of [["orbit", "orbit/Stage.tsx", "arcFill"], ["phoneapp", "phoneapp/Phone.tsx", "ringFill"], ["journey", "journey/Stage.tsx", "roadFill"]]) {
  const fill = (await design(file))[fn];
  check(`${name}: no ring or road meter for a year or a date`, SAID.every((b) => fill(b) === null) && fill("4,35%") > 0, SAID.map(fill).join(","));
}
// Comment-stripped, whitespace-free: a count from 0 (`countTo * t`, `[0, hook.countTo]`) or a
// hand-rolled hook number (`hookCount(hook.countTo`, `hook.countTo.toLocaleString`) fails.
const fromZero = readdirSync(join(ROOT, "src", "designs"), { recursive: true })
  .filter((f) => /\.tsx?$/.test(f))
  .filter((f) => /countTo\*|\[0,hook\.countTo|hookCount\(hook\.countTo|hook\.countTo\.toLocaleString/.test(code(f).js.replace(/\s/g, "")));
check("every design's hook text goes through the core hookText (source: no count from 0, no own formatter)", fromZero.length === 0, fromZero.join(", "));
const yearView = gaugeMod.figureView({ big: "2026", label: "", source: "auto", fromFrame: 0, frames: 45 }, 20, FPS);
const rateView = gaugeMod.figureView({ big: "4,35%", label: "", source: "auto", fromFrame: 0, frames: 45 }, 20, FPS);
check("gauge: a year is a plain readout (dial dimmed, no lit arc), a rate keeps its needle", yearView.plain === true && !yearView.lit && yearView.readout.text === "2026" && !rateView.plain && Boolean(rateView.lit));
const kickers = [["ticker", "ticker/Stage.tsx"], ["receipt", "receipt/Figures.tsx"], ["splitscreen", "splitscreen/Chip.tsx"], ["bigdigit", "bigdigit/Stage.tsx"], ["flash", "flash/Figures.tsx"], ["retro", "retro/Stage.tsx"]];
for (const [name, file] of kickers) {
  const { kickerOf } = await design(file);
  const k = ["2026", "29/9", "4,35%"].map(kickerOf);
  check(`${name}: a year or a date gets a neutral kicker, not "CON SỐ"`, k[0] === "NĂM" && k[1] === "NGÀY" && k[2] === "CON SỐ", k.join(" | "));
}
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
    if (/const POINTS_OFFSET\b/.test(src)) found.push({ expr: "POINTS_OFFSET", column: false, logo: true });
    if (!found.length) return [];
    const exprs = found.map((h) => h.expr);
    const outfile = join(out, `${f.replace(/\W/g, "_")}-offsets.mjs`);
    buildSync({ stdin: { contents: `${src}\nexport const __offsets = [${exprs.join(", ")}];`, loader: f.endsWith("x") ? "tsx" : "ts", resolveDir: join(ROOT, "src", "designs", f, "..") },
      bundle: true, format: "esm", platform: "node", jsx: "automatic", packages: "external", logLevel: "error", outfile });
    const offs = (await import(pathToFileURL(outfile).href)).__offsets;
    return found.map((h, i) => ({ offset: offs[i], logo: h.logo, width: h.column ? columnWidth : 1080 }));
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
  for (const [f, { offset, width, logo: logoOn }] of hosts) {
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
      const edgeAt = (fr) => width - (1080 - golden.SAFE.right) - (logoOn ? info.logoClear(offset, fr, talk, FPS) * info.logoInset(width) : 0);
      const hit = [...Array(talk).keys()].filter((fr) => golden.logoVisible(fr, talk, FPS)).filter((fr) => !(edgeAt(fr) < logo.left));
      check(`${name}: right edge clear of the LogoMark whenever it shows`, hit.length === 0, hit.length ? `${hit.length} logo frames overlap, first ${hit[0]}` : `layer ${width}, right edge ${edgeAt(HOOK + 1)} < logo ${logo.left.toFixed(0)}`);
    }
  }
  check("panel hosts found", hosts.length >= 30, `${hosts.length}`);
}

// (i) blueprint and orbit: a figure never shares the stage with a compare cue (the cue wins), each
// keeps its reading floor; one that cannot have its floor before the cue and has no free slot
// after it is dropped from these stages only (rba-sept-2026: 2027 at 705, compare 749-1059,
// points from 1062, so 2027 is dropped here; the core still has it).
if (rba) {
  const { outFrameOf } = await bundle("src/mortgage/schema.ts");
  const at = outFrameOf(rba.timeline, FPS);
  const spansC = (rba.edit.cues ?? []).filter((c) => c.kind === "compare").map((c) => [at(c.fromMs), at(c.toMs)]);
  for (const name of ["blueprint", "orbit"]) {
    const shown = (await design(`${name}/Stage.tsx`)).stageFigures(rba, FPS);
    const clash = shown.filter((f) => spansC.some(([a, b]) => f.fromFrame < b && a < f.fromFrame + f.frames));
    const core = figuresOf(rba, FPS);
    const dropped = core.filter((f) => !shown.some((g) => g.saidFrame === f.saidFrame)).map((f) => f.big);
    const moved = shown.filter((f) => !core.some((g) => g.saidFrame === f.saidFrame && g.fromFrame === f.fromFrame));
    const allC = (rba.edit.cues ?? []).filter((c) => c.kind !== "emoji").map((c) => [at(c.fromMs), at(c.toMs)]);
    const movedClash = moved.filter((f) => f.fromFrame !== core.find((g) => g.saidFrame === f.saidFrame).fromFrame && allC.some(([a, b]) => f.fromFrame < b && a < f.fromFrame + hold));
    check(`${name}: no figure on the stage with a compare cue, a moved one on a free stage, each held its floor, only 2027 dropped`,
      spansC.length > 0 && clash.length === 0 && movedClash.length === 0 && shown.every((f) => f.frames >= hold) && dropped.join() === "2027",
      `${spans(shown)} vs compare ${spansC.map((x) => x.join("-")).join(", ")}; dropped ${dropped.join(",") || "none"}`);
  }
  {
    const { yieldToCompare } = await bundle("src/elements/yieldToCompare.ts");
    const f = (fromFrame, frames) => ({ fromFrame, frames });
    const r = yieldToCompare([f(0, 90), f(100, 90), f(300, 60), f(500, 60)], [[60, 120], [320, 400]], [[60, 120], [320, 400], [410, 420]], 45);
    check("yieldToCompare: cut after its floor, moved to a free stage after the cue, dropped when no free slot", JSON.stringify(r) === JSON.stringify([f(0, 60), f(120, 90), f(500, 60)]), JSON.stringify(r));
  }
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
// never took them (each needed a hook).
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
    if (!reel.edit.hook) continue;
    const early = figuresOf(reel, FPS).filter((f) => f.fromFrame < HOOK);
    check(`replay ${slug}: no figure before the hook ends`, early.length === 0, spans(early));
  }
  check("replay: fixtures with words found", replayed >= 10, `${replayed} replayed`);
}

console.log(failed ? "design figures: FAILED" : "design figures ok");
process.exit(failed ? 1 : 0);
