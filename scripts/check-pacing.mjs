// Golden rule 5b pacing (src/designs/README.md: a visual change every 1.5-3 s),
// checked from the data, no render:
//   node scripts/check-pacing.mjs <slug> [--public-dir <dir>] [--json] [--max 3]
// Exit 0 clean, 2 warnings (gaps or empty card bodies), 1 error (bad slug).
//
// DEFINITION. A visual event is something new appearing or moving on the stage
// or full screen: a chapter card / chapter transition, a cue appearing or
// leaving (edit.json cues fromMs/toMs, as held by readingFloor), each cue beat
// landing (items[].atMs and every other atMs / strikeMs / highlightAtMs /
// vsAtMs inside a cue), a stat or automatic figure (figuresOf) and a named
// bank's logo appearing or leaving, the hook card, a b-roll visual, and the
// punch-in at every cut (segment start of buildTimeline). In "cards" this is
// the design's own plan (Plan.ts planOf: scenes, header chips, classic panels);
// a cut is not counted while his card is away (full-screen scene). Caption page
// turns and Daniel's own head movement do NOT count. Times are output (video)
// time; only the talk is checked (not the 75-frame cover or the outro and
// compliance tail).
// A gap longer than --max between two events is flagged unless a card with
// text is still inside its reading time (golden.ts READING / readingMs, from
// when it appears): a card held to be read may stay, so only the part of the
// gap outside every reading window counts as static.
// Also flagged: a points / kinetic cue whose first beat lands more than 2 s
// after the card appears (an empty card body).
// DANIEL EXCEPTION: the cards design on talks longer than ~3 minutes holds
// chapter/points cards for long stretches; Daniel accepted that on
// 30/09/2026 -> for cards and a talk > 180 s the gaps print as INFO
// ("accepted exception") and do not fail.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { recordingPath } from "../src/mortgage/recording.ts";

const ROOT = join(import.meta.dirname, "..");
const FPS = 30; // MortgageReel's
const EMPTY_BODY_MS = 2000;
const CARDS_LONG_TALK_MS = 180000;

// The .ts sources import siblings without extensions: bundle them for Node
// (as check-golden.mjs does), once per run.
const lib = repoTmp("pacing-");
execFileSync(process.execPath, [
  join(ROOT, "node_modules/esbuild/bin/esbuild"),
  "src/designs/cards/Plan.ts", "src/mortgage/golden.ts", "src/mortgage/timeline.ts", "src/mortgage/schema.ts",
  "--bundle", "--format=esm", "--platform=node", "--out-extension:.js=.mjs", "--log-level=error",
  "--outbase=src", `--outdir=${lib}`,
], { cwd: ROOT });
const imp = (p) => import(pathToFileURL(join(lib, p)).href);
const { planOf } = await imp("designs/cards/Plan.mjs");
const { figuresOf, lenderMentionsOf, readingMs, readingFloor, HOOK_FRAMES } = await imp("mortgage/golden.mjs");
const { buildTimeline, toOutMs, toSrcMs, TALK_START_FRAME } = await imp("mortgage/timeline.mjs");
const { parseEdit, onScreenCopy } = await imp("mortgage/schema.mjs");
rmSync(lib, { recursive: true, force: true });

// The reel as MortgageReel's buildReel makes it (cards held to reading time).
export const reelFrom = (editJson, words, slug = "t") => {
  const edit = parseEdit(editJson, slug);
  const timeline = buildTimeline(words, edit, FPS);
  return { edit: readingFloor({ edit, timeline }, FPS).edit, timeline };
};

const fMs = (f) => (f * 1000) / FPS;
const nameOf = (c) =>
  `${c.kind}${c.title ? ` "${c.title}"` : c.slam ? ` "${c.slam.text}"` : c.text ? ` "${c.text}"` : ""}`;
// Every beat time inside a cue (points items, kinetic struck/slam, compare rows...).
const beatsOf = (v, out = []) => {
  if (Array.isArray(v)) v.forEach((x) => beatsOf(x, out));
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v))
      if (/^(atMs|strikeMs|highlightAtMs|vsAtMs)$/.test(k) && typeof x === "number") out.push(x);
      else beatsOf(x, out);
  return out;
};

export const pacingOf = (reel, { maxMs = 3000 } = {}) => {
  const { edit, timeline } = reel;
  const segs = timeline.segments;
  const talkMs = fMs(timeline.talkFrames);
  const out = (ms) => toOutMs(segs, ms, FPS);
  const copy = onScreenCopy(edit);
  const cues = edit.cues ?? [];
  const design = edit.design ?? "classic";
  const events = [];
  const windows = []; // [from, to] a card with text is inside its reading time
  const ev = (ms, what) => ms !== null && ms >= 0 && ms <= talkMs && events.push({ ms, what });
  const held = (ms, texts) => ms !== null && windows.push([ms, ms + readingMs(texts.filter(Boolean))]);
  const cueText = (c) => copy[`cues[${cues.indexOf(c)}]`] ?? [];

  ev(0, "talk starts");
  ev(talkMs, "talk ends");
  let full = [];
  let appearOf = (c) => out(c.fromMs);
  if (design === "cards") {
    const plan = planOf(reel, FPS);
    full = plan.full.map(([a, b]) => [fMs(a), fMs(b)]);
    for (const s of plan.scenes) {
      const [label, texts] =
        s.kind === "hook" ? ["hook card", copy.hook]
        : s.kind === "cue" ? [nameOf(s.cue), cueText(s.cue)]
        : s.kind === "figure" ? [`figure "${s.figure.big}"`, [s.figure.big, s.figure.label]]
        : [`bank ${s.lender.name}`, [s.lender.name]];
      ev(fMs(s.from), `${label} appears`);
      ev(fMs(s.to), `${label} leaves`);
      held(fMs(s.from), texts);
    }
    for (const c of plan.chips) {
      const label = c.figure ? `chip "${c.figure.big}"` : `chip ${c.lender.name}`;
      ev(fMs(c.from), `${label} appears`);
      ev(fMs(c.to), `${label} leaves`);
    }
    // Own cues appear when their scene does (after the hook, if it held the stage).
    appearOf = (c) => fMs(plan.scenes.find((s) => s.kind === "cue" && s.cue === c)?.from ?? 0);
    held(0, [edit.title]); // the topic card before the first chapter
  } else {
    // ponytail: the generic path assumes every design shows these; a design
    // that hides one over-counts. Add a planOf-style hook per design if so.
    if (edit.hook) {
      ev(0, "hook card appears");
      ev(fMs(HOOK_FRAMES), "hook card leaves");
      held(0, copy.hook);
    }
    for (const f of figuresOf(reel, FPS)) {
      ev(fMs(f.fromFrame), `figure "${f.big}" appears`);
      ev(fMs(f.fromFrame + f.frames), `figure "${f.big}" leaves`);
      held(fMs(f.fromFrame), [f.big, f.label]);
    }
    for (const m of lenderMentionsOf(reel)) {
      ev(m.startMs, `bank ${m.lender.name} appears`);
      ev(m.endMs, `bank ${m.lender.name} leaves`);
    }
  }
  const own = (c) => design === "cards" && ["points", "compare", "change", "trend", "bars"].includes(c.kind);
  for (const c of cues) {
    if (!own(c)) {
      ev(out(c.fromMs), `${nameOf(c)} appears`);
      ev(out(c.toMs), `${nameOf(c)} leaves`);
      held(out(c.fromMs), cueText(c));
    }
    for (const b of beatsOf(c)) ev(out(b), `${nameOf(c)} beat`);
  }
  (edit.chapters ?? []).forEach((c, i) => {
    ev(out(c.atMs), `chapter ${i + 1} "${c.title}"`);
    held(out(c.atMs), [c.title]);
  });
  for (const v of edit.visuals ?? []) {
    const a = out(v.atMs);
    ev(a, `visual ${v.mode} appears`);
    if (a !== null) ev(a + v.durMs, `visual ${v.mode} ends`);
  }
  segs.forEach((s, i) => {
    const ms = fMs(s.outFrom);
    if (i === 0 || full.some(([a, b]) => ms >= a && ms < b)) return;
    ev(ms, segs[i - 1].transitionAfter ? "chapter transition" : "cut (punch-in)");
  });
  events.sort((a, b) => a.ms - b.ms);

  const gaps = [];
  for (let i = 1; i < events.length; i++) {
    const [a, b] = [events[i - 1], events[i]];
    if (b.ms - a.ms <= maxMs) continue;
    // Part of the gap covered by some reading window (merged), the rest is static.
    const cover = windows
      .map(([x, y]) => [Math.max(x, a.ms), Math.min(y, b.ms)])
      .filter(([x, y]) => y > x)
      .sort((p, q) => p[0] - q[0]);
    let covered = 0;
    let end = a.ms;
    for (const [x, y] of cover) {
      covered += Math.max(0, y - Math.max(x, end));
      end = Math.max(end, y);
    }
    const staticMs = b.ms - a.ms - covered;
    if (staticMs > maxMs)
      gaps.push({
        fromMs: a.ms, toMs: b.ms, staticMs, after: a.what, before: b.what,
        srcMs: [toSrcMs(segs, a.ms, FPS), toSrcMs(segs, b.ms, FPS)],
      });
  }

  const empty = cues.flatMap((c, i) => {
    const first = c.kind === "points" ? Math.min(...c.items.map((x) => x.atMs))
      : c.kind === "kinetic" ? Math.min(...c.struck.map((x) => x.atMs)) : null;
    if (first === null) return [];
    const appear = own(c) ? appearOf(c) : out(c.fromMs);
    const delayMs = out(first) - appear;
    return delayMs > EMPTY_BODY_MS ? [{ cue: `cues[${i}] ${nameOf(c)}`, appearMs: appear, delayMs }] : [];
  });
  const accepted = design === "cards" && talkMs > CARDS_LONG_TALK_MS && gaps.length > 0;
  return { design, talkMs, maxMs, events, gaps, empty, accepted, flaggedMs: gaps.reduce((t, g) => t + g.staticMs, 0) };
};

// Output (video) time of a talk-timeline ms: the talk starts after the cover.
const video = (ms) => fMs(TALK_START_FRAME) + ms;
const clock = (ms) => {
  const s = video(ms) / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
  const slug = args.find((a, i) => !a.startsWith("--") && !["--public-dir", "--max"].includes(args[i - 1]));
  try {
    if (!slug) throw new Error("Usage: node scripts/check-pacing.mjs <slug> [--public-dir <dir>] [--json] [--max 3]");
    const maxS = Number(flag("--max") ?? 3);
    if (!(maxS > 0)) throw new Error(`--max must be a positive number of seconds, got "${flag("--max")}".`);
    // This checkout's edit.json; failing that, the --public-dir one (a fixture: scripts/check-preflight.mjs).
    const editPath = [join(ROOT, "public"), resolve(flag("--public-dir") ?? join(ROOT, "public"))]
      .map((d) => join(d, "videos", slug, "edit.json")).find(existsSync) ?? join(ROOT, "public", "videos", slug, "edit.json");
    if (!existsSync(editPath)) throw new Error(`No edit.json for "${slug}" (${editPath}).`);
    const editJson = JSON.parse(readFileSync(editPath, "utf8"));
    const rel = recordingPath(slug, editJson.source, "words.json");
    const wordsPath = [resolve(flag("--public-dir") ?? join(ROOT, "public")), join(ROOT, "public")]
      .map((d) => join(d, rel)).find(existsSync);
    if (!wordsPath) throw new Error(`No words.json for "${slug}" (public/${rel}); in a worktree pass --public-dir <main checkout>/public.`);
    const r = pacingOf(reelFrom(editJson, JSON.parse(readFileSync(wordsPath, "utf8")), slug), { maxMs: maxS * 1000 });
    const code = r.empty.length || (r.gaps.length && !r.accepted) ? 2 : 0;
    if (args.includes("--json")) {
      const at = (ms) => ({ talkMs: Math.round(ms), video: clock(ms) });
      console.log(JSON.stringify({
        slug, design: r.design, talkS: r.talkMs / 1000, maxS, acceptedException: r.accepted,
        events: r.events.length,
        gaps: r.gaps.map((g) => ({ from: at(g.fromMs), to: at(g.toMs), lengthS: (g.toMs - g.fromMs) / 1000,
          staticS: g.staticMs / 1000, after: g.after, before: g.before, srcMs: g.srcMs })),
        emptyCards: r.empty.map((e) => ({ cue: e.cue, appears: at(e.appearMs), firstBeatAfterS: e.delayMs / 1000 })),
        flaggedGaps: r.gaps.length, flaggedS: r.flaggedMs / 1000, exit: code,
      }, null, 2));
    } else {
      console.log(`Pacing ${slug}: design ${r.design}, talk ${sec(r.talkMs)}, ${r.events.length} visual events, gaps over ${maxS} s:`);
      const tag = r.accepted ? "INFO (accepted exception, cards talk > 180 s)" : "GAP";
      for (const g of r.gaps)
        console.log(`  ${tag} ${clock(g.fromMs)}-${clock(g.toMs)}  ${sec(g.toMs - g.fromMs)}` +
          `${Math.abs(g.staticMs - (g.toMs - g.fromMs)) > 50 ? ` (static ${sec(g.staticMs)} after reading time)` : ""}` +
          `  after: ${g.after}  before: ${g.before}  source ${g.srcMs[0]}-${g.srcMs[1]} ms`);
      for (const e of r.empty)
        console.log(`  EMPTY CARD ${e.cue} at ${clock(e.appearMs)}: first beat lands ${sec(e.delayMs)} after it appears`);
      console.log(`  ${r.gaps.length} gap(s), ${sec(r.flaggedMs)} static${r.accepted ? " (accepted)" : ""}; ${r.empty.length} empty card(s)`);
    }
    process.exitCode = code;
  } catch (err) {
    console.error(err instanceof Error ? err.message.split("\n").slice(0, 5).join("\n") : err);
    process.exitCode = 1;
  }
}
