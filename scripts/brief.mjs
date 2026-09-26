// What a video is about, as numbers the template selector can score:
//   node scripts/brief.mjs <slug> [--public-dir <dir>]   -> out/videos/<slug>/brief.json
// --public-dir: where the media (recordings, voice) lives when it is not in this
// checkout's public/ (a worktree); edit.json and script.json still come from here.
// Mode A (Daniel on camera): words.json + edit.json. Mode B (faceless, the
// slug has script.json): script.json + facts.json, plus words.json once voiced.
// Number and bank detection is check-golden.mjs's (golden.ts), not a copy.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { FPS, buildTimeline, figuresOf, lenderMentionsOf, reelOf, words } from "./check-golden.mjs";
import { POLICY_RE, readLedger } from "./facts.mjs";

const COMPARE_CUES = ["compare", "bars", "kinetic"];
const NEWS_RE = /\b(RBA|ASIC|APRA)\b|thông báo|tin mới|vừa công bố/giu;
const WARN_RE = /cẩn thận|cảnh báo|sai lầm|đừng|coi chừng|bẫy/giu;
const BEAT_S = 20; // ponytail: a data beat every ~20 s makes a data video; untuned.
const SYLLABLES_PER_S = 3.5; // ponytail: unvoiced script length guess; words.json wins once voiced.

const nfc = (s) => String(s ?? "").normalize("NFC");
const count = (re, text) => (nfc(text).match(new RegExp(re.source, `${re.flags.replace("g", "")}g`)) ?? []).length;

// Every string edit.json puts on a card (hook, chapters, stats, cues).
const SKIP_KEYS = new Set(["kind", "tone", "name", "position", "effect"]);
const cardTexts = (v, key = "", out = []) => {
  if (typeof v === "string") {
    if (!SKIP_KEYS.has(key)) out.push(nfc(v));
  } else if (Array.isArray(v)) v.forEach((x) => cardTexts(x, key, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) cardTexts(x, k, out);
  return out;
};
// facts.mjs's policy words, less bare "phải": it is everyday Vietnamese ("không
// phải", "phải không") and would make every talk read as eligibility-heavy.
const policyHits = (text) =>
  (nfc(text).match(new RegExp(POLICY_RE.source, "giu")) ?? []).filter((m) => m.toLowerCase() !== "phải").length;
const longest = (texts) => Math.max(0, ...texts.map((t) => [...t].length));

// Ranked intents (first = primary); mirrors the editor skill's decision tree.
export const intentsOf = (c, stats, text, durationS) => {
  const perMin = durationS ? (c.numbers * 60) / durationS : 0;
  const out = [];
  if (count(NEWS_RE, text) >= 2) out.push("news");
  if (stats >= 3 || (c.numbers >= 3 && perMin >= 1.5)) out.push("data");
  if (c.steps >= 3) out.push("process");
  if (c.comparisons >= 2) out.push("compare");
  if (count(WARN_RE, text) >= 2) out.push("warn");
  if (c.hookAsks) out.push("qa"); // the premise is one question (chatstory's brief)
  if (!out.length) out.push("explain"); // only when nothing more specific matched
  return out;
};

async function main() {
  const [slug, dirFlag, dirArg] = process.argv.slice(2);
  if (!slug) throw new Error("Usage: node scripts/brief.mjs <slug> [--public-dir <dir>]");
  const root = join(import.meta.dirname, "..");
  const pub = resolve(dirFlag === "--public-dir" ? dirArg : join(root, "public"));
  const dir = join(root, "public", "videos", slug);
  const read = (path, what) => {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      throw new Error(`Cannot read ${what} for "${slug}" (${path}): ${err.message}`);
    }
  };
  const { recordingPath } = await import(pathToFileURL(join(root, "src", "mortgage", "recording.ts")).href);
  const edit = read(join(dir, "edit.json"), "edit.json");
  const faceless = existsSync(join(dir, "script.json"));
  const wordsPath = join(pub, recordingPath(slug, edit.source, "words.json"));
  const spoken = existsSync(wordsPath) ? read(wordsPath, "words.json") : null;
  const cues = edit.cues ?? [];
  const steps =
    cues.filter((c) => c.kind === "points").reduce((n, c) => n + (c.items?.length ?? 0), 0) +
    (edit.chapters ?? []).filter((c) => /^\s*(bước|step|\d)/iu.test(nfc(c.title))).length;
  const comparisons = cues.filter((c) => COMPARE_CUES.includes(c.kind)).length;
  // Longest string per kind, so a template's per-kind maxChars compares like with like.
  const longestVi = {
    hook: longest(cardTexts(edit.hook)),
    chapter: longest(cardTexts(edit.chapters)),
    stat: longest(cardTexts(edit.stats)),
    cue: longest(cardTexts(cues)),
  };
  const hookAsks = /\?\s*$/.test(nfc(edit.hook?.big));

  let text, numbers, banks, eligibility, durationS, longestEn;
  if (!faceless) {
    if (!spoken) throw new Error(`No words.json for "${slug}" at ${wordsPath}: run prep-video.py first.`);
    const reel = reelOf(spoken, edit);
    text = spoken.map((w) => w.text).join("");
    numbers = figuresOf(reel, FPS).length;
    banks = lenderMentionsOf(reel).length;
    eligibility = policyHits(text);
    durationS = reel.timeline.talkFrames / FPS;
    longestEn = 0;
  } else {
    const script = read(join(dir, "script.json"), "script.json");
    const ledger = readLedger(dir);
    const scenes = script.scenes ?? [];
    const vi = scenes.map((s) => nfc(s.vi)).join(" ");
    const reel = reelOf(words(vi.replace(/\s+/g, " ").trim()), { title: script.title ?? slug });
    text = `${vi}\n${scenes.map((s) => nfc(s.en)).join(" ")}`;
    numbers = figuresOf(reel, FPS).length;
    banks = lenderMentionsOf(reelOf(words(text.replace(/\s+/g, " ").trim()))).length;
    eligibility = ledger
      ? ledger.filter((f) => f.kind === "rule" || f.kind === "condition").length
      : policyHits(vi);
    durationS = spoken
      ? buildTimeline(spoken, { title: slug, ...edit }, FPS).talkFrames / FPS
      : vi.split(/\s+/).length / SYLLABLES_PER_S;
    longestEn = longest(scenes.map((s) => nfc(s.en)));
  }

  durationS = Math.round(durationS);
  const counts = { numbers, comparisons, steps, banks, eligibility };
  // Talk time with no data beat reads as narrative: one beat per BEAT_S seconds.
  counts.narrative = Math.max(0, Math.round(durationS / BEAT_S) - Object.values(counts).reduce((a, b) => a + b, 0));
  const shapes = { ...Object.fromEntries(Object.keys(counts).map((k) => [k, k])), comparisons: "comparison" };
  const dataShapes = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([k]) => shapes[k]);
  const intents = intentsOf({ ...counts, hookAsks }, (edit.stats ?? []).length, text, durationS);
  // Emoji cues carry no text to read, so they don't count as a hold.
  const holds = [...cues.filter((c) => c.kind !== "emoji").map((c) => c.toMs - c.fromMs), ...(edit.stats ?? []).map((s) => s.durMs)].filter((n) => n > 0);
  const brief = {
    slug,
    mode: faceless ? "B" : "A",
    intent: intents[0],
    intents,
    dataShapes: dataShapes.length ? dataShapes : ["narrative"],
    counts,
    durationS,
    aspect: "9:16", // ponytail: every render is 1080x1920; read edit.json when another aspect exists.
    languages: faceless ? ["vi", "en"] : ["vi"],
    longestCard: { vi: longestVi, en: longestEn },
    shortestHoldMs: holds.length ? Math.min(...holds) : null,
    assets: {
      foreground: existsSync(join(pub, recordingPath(slug, edit.source, "foreground.webm"))),
      voice: existsSync(join(pub, "videos", slug, "voice")),
      script: faceless,
    },
  };
  const out = join(root, "out", "videos", slug);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "brief.json"), `${JSON.stringify(brief, null, 2)}\n`);
  console.log(`brief ${slug}: ${brief.intent} · ${brief.dataShapes.join(", ")} · ${durationS}s -> out/videos/${slug}/brief.json`);
}

// Exports above are for scripts/check-selector.mjs; run only as the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
