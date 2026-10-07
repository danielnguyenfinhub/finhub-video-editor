// Pre-edit clean-up of a talking-head recording, run after prep (A1.1) and
// BEFORE background removal (A1.3), so the matte (~13x clip length) only
// processes footage that is kept.
//   node scripts/clean-clip.mjs <slug> [--max-pause-ms 3000] [--json] [--apply] [--assemble-plan]
//   node scripts/clean-clip.mjs --selftest
// Reads words.json (the slug's recording, src/mortgage/recording.ts) and
// edit.json, and finds, each with source times, words, reason and confidence:
//   auto      fillers/stutters/bad words the timeline already cuts (buildTimeline
//             autoCuts; listed only, so the saving shows)
//   pause     silence >= --max-pause-ms between words (or at head/tail): high
//   repeat    a 3+ word run said again within REPEAT_WINDOW_MS: the EARLIER take
//             is the drop; high only when exact (nothing but fillers between)
//             and no number/rate word and no low-confidence word inside
//   restart   an abandoned fragment, then a new phrase with the same first two
//             words: low, propose only
//   marker    a correction phrase ("à không", "ý tôi là", "sorry", ...) with the
//             phrase before it: medium/low, propose only
// Default is a DRY RUN: writes out/clean-clip/<slug>.md and prints a summary.
// --apply: adds the high `repeat` spans to edit.json `remove` (edit.json.bak
//   first, then check-schema). Pauses are not written there: the timeline
//   already cuts silence over MAX_GAP_MS; they only shorten the footage.
// --assemble-plan: writes public/videos/<slug>/clean-clips.plan.json (clips.json
//   shape: the kept footage as a-roll spans of one recording) and prints the
//   prep-video.py command that joins it into <slug>-assembly; edit.json is not
//   touched then. An existing plan is only replaced with --apply (.bak kept).
// Nothing under public/recordings or the original footage is ever written.
// Exit 0 ok, 1 bad input or a failed write/selftest.
// HEURISTIC: precision/recall on real speech is unmeasured; Daniel reads the
// report against the video before --apply.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { slugOk } from "./listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");
const TIMELINE_TS = join(ROOT, "src", "mortgage", "timeline.ts");
const { buildTimeline } = await import(pathToFileURL(TIMELINE_TS).href);
const { recordingPath } = await import(pathToFileURL(join(ROOT, "src", "mortgage", "recording.ts")).href);

const FPS = 30;
// Mirrors of timeline.ts constants it does not export; --selftest pins them.
const MAX_GAP_MS = 380; // silence the timeline cuts (a new run, a punch-in)
const MIN_STUTTER_CONFIDENCE = 0.6; // below it Whisper may have doubled a word
export const DEFAULT_MAX_PAUSE_MS = 3000;
const MARGIN_MS = 80; // kept around every word cut, never into a kept word
// Kept on each side of a trimmed pause: the leftover silence stays over
// MAX_GAP_MS, so the timeline still cuts (and punches in) at the seam.
const PAUSE_KEEP_MS = 250;
const REPEAT_MIN_WORDS = 3;
const REPEAT_WINDOW_MS = 6000; // end of the first take to start of the retake
const RESTART_MAX_WORDS = 12; // longest abandoned fragment proposed
const MARKER_BACK_WORDS = 15; // how far a marker reaches back for its phrase
const MATTE_X = 13; // matte time / clip length on Daniel's PC (runbook A1.3)

// Numbers and rate words: a span with one is never auto-applied (a "repeat"
// may be a corrected figure). Over-inclusive on purpose ("một", "năm").
const NUMBER_WORDS = new Set(
  ("không một mốt hai ba bốn tư năm lăm sáu bảy tám chín mười mươi linh lẻ trăm nghìn ngàn " +
    "triệu tỷ tỉ rưỡi nửa phần phẩy chấm đô đồng lãi suất điểm " +
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fifteen " +
    "twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion " +
    "percent rate rates point dollar dollars k").split(" "),
);
// Correction phrases. Medium: a clear "I'll say that again"; low: words with
// ordinary meanings too ("nhầm" = mistaken, "nói lại" = tell again).
const MARKERS = [
  ...["để tôi nói lại", "để mình nói lại", "để em nói lại", "tôi nói lại", "mình nói lại",
    "ý tôi là", "ý mình là", "ý em là", "let me say that again", "let me start again",
    "let me start over"].map((p) => [p, "medium"]),
  ...["à không", "à nhầm", "nhầm", "lộn", "nói lại", "sorry", "xin lỗi", "i mean"].map((p) => [p, "low"]),
];

// timeline.ts `key` (mirrored; pinned by --selftest): letters and digits only.
const key = (s) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const numeric = (w) => /[\d%$]/.test(w.text) || NUMBER_WORDS.has(key(w.text));
const sentenceEnd = (w) => /[.?!…]$/.test(w.text.trim());

// timeline.ts prepareWords' merge: a token with no leading space ("4" ".1")
// belongs to the previous word; untimed words are dropped.
export const mergeWords = (raw) => {
  const m = [];
  for (const w of raw) {
    const p = m[m.length - 1];
    if (p && !w.text.startsWith(" ")) m[m.length - 1] = { ...p, text: p.text + w.text, endMs: w.endMs };
    else m.push({ ...w });
  }
  return m.filter((w) => w.endMs > w.startMs);
};

/**
 * Pure detection. raw: words.json; edit: edit.json; rawEndMs: footage length.
 * Returns { findings, rawMs, cutMs, keptMs, applySpans }.
 */
export const detect = (raw, edit = {}, { maxPauseMs = DEFAULT_MAX_PAUSE_MS, rawEndMs } = {}) => {
  const all = mergeWords(raw).map((w, idx) => ({ ...w, idx, text: w.text.normalize("NFC") }));
  if (!all.length) throw new Error("words.json has no timed words.");
  const rawMs = Math.max(rawEndMs ?? 0, all[all.length - 1].endMs);
  const removed = (w) => (edit.remove ?? []).some(([a, b]) => w.startMs >= a && w.endMs <= b);
  let autoCuts = [];
  try {
    autoCuts = buildTimeline(raw, edit, FPS).autoCuts;
  } catch {
    // every word removed already: nothing for the timeline to cut
  }
  const autoAt = new Map(autoCuts.map((c) => [c.atMs, c.reason]));
  const findings = [];
  const said = (ws) => ws.map((w) => w.text.trim()).join(" ");

  // (a) the timeline's own automatic cuts, listed only.
  for (const w of all)
    if (autoAt.has(w.startMs))
      findings.push({ kind: "auto", reason: autoAt.get(w.startMs), startMs: w.startMs, endMs: w.endMs, text: w.text.trim(),
        confidence: autoAt.get(w.startMs) === "stutter" ? "medium" : "high", apply: false, cut: null, why: "the timeline cuts it already" });

  // (b) long pauses, head and tail included.
  const edges = [{ endMs: 0, head: true }, ...all, { startMs: rawMs, tail: true }];
  for (let i = 1; i < edges.length; i++) {
    const a = edges[i - 1], b = edges[i];
    if (b.startMs - a.endMs < maxPauseMs) continue;
    const cut = [a.head ? 0 : a.endMs + PAUSE_KEEP_MS, b.tail ? rawMs : b.startMs - PAUSE_KEEP_MS];
    findings.push({ kind: "pause", reason: a.head ? "silence before the first word" : b.tail ? "silence after the last word" : "pause",
      startMs: a.endMs, endMs: b.startMs, text: "", confidence: "high", apply: true, cut });
  }

  // Word-based candidates work on the words edit.json does not remove yet.
  const live = all.filter((w) => !removed(w));
  const k = live.map((w) => key(w.text));
  const isFiller = (w) => autoAt.get(w.startMs) === "filler";
  // The cut for live[i..j-1]: MARGIN_MS around it, never into a neighbour word
  // (any word, removed or not). null if word times overlap (it would cut a word).
  const spanFor = (i, j) => {
    const first = live[i], last = live[j - 1], prev = all[first.idx - 1], next = all[last.idx + 1];
    const a = Math.max(first.startMs - MARGIN_MS, prev ? Math.min(prev.endMs + MARGIN_MS, first.startMs) : 0);
    const b = Math.min(last.endMs + MARGIN_MS, next ? Math.max(next.startMs - MARGIN_MS, last.endMs) : rawMs);
    const ok = (!prev || a >= prev.endMs) && (!next || b <= next.startMs) && a <= first.startMs && b >= last.endMs;
    return ok ? [a, b] : null;
  };
  const covered = new Set(); // live indices already in a repeat/restart candidate
  const wordCandidate = (kind, i, j, confidence, reason, extra = {}) => {
    const ws = live.slice(i, j);
    const cut = spanFor(i, j);
    const hasNumber = ws.some(numeric);
    let why = extra.why;
    if (confidence === "high" && hasNumber) [confidence, why] = ["medium", "contains a number or rate word"];
    if (confidence === "high" && !cut) [confidence, why] = ["medium", "word times overlap a neighbour"];
    for (let x = i; x < j; x++) covered.add(x);
    findings.push({ kind, reason, startMs: ws[0].startMs, endMs: ws[ws.length - 1].endMs, text: said(ws),
      confidence, apply: confidence === "high" && !!cut, cut, ...extra, why });
  };

  // (c) repeats: the longest run from i said again at j, the earlier take dropped.
  for (let i = 0; i < live.length; i++) {
    let best = null;
    for (let j = i + REPEAT_MIN_WORDS; j < live.length && live[j].startMs - live[i].endMs <= REPEAT_WINDOW_MS + 60000; j++) {
      let L = 0;
      // A run ends at a full stop ("…phần trăm. Tháng" twice is two sentences).
      while (L < j - i && j + L < live.length && k[i + L] && k[i + L] === k[j + L] && !(L && sentenceEnd(live[i + L - 1]))) L++;
      if (L < REPEAT_MIN_WORDS || live[j].startMs - live[i + L - 1].endMs > REPEAT_WINDOW_MS) continue;
      if (!best || L > best.L) best = { j, L };
    }
    if (!best) continue;
    const { j, L } = best;
    // The timeline's stutter cut already takes it.
    if (live.slice(i, j).every((w) => autoAt.has(w.startMs))) continue;
    const between = live.slice(i + L, j);
    const exact = between.every(isFiller);
    // Other words between the takes: a retake only if short and in one sentence.
    if (!exact && (between.length > RESTART_MAX_WORDS || live.slice(i, j - 1).some(sentenceEnd))) continue;
    const unsure = [...live.slice(i, i + L), ...live.slice(j, j + L)].some((w) => (w.confidence ?? 1) < MIN_STUTTER_CONFIDENCE);
    wordCandidate("repeat", i, j, exact && !unsure ? "high" : "medium",
      exact ? `said twice: "${said(live.slice(j, j + L))}"` : `"${said(live.slice(j, j + L))}" restarted after other words`,
      { why: unsure ? "a low-confidence word (Whisper may have doubled it)" : exact ? undefined : "not an exact repeat" });
    i = j - 1;
  }

  // (d1) restarts: phrase starts (after a pause or a full stop) two words alike,
  // the first phrase abandoned (no full stop before the restart).
  const starts = live.map((w, x) => x).filter((x) => x === 0 || sentenceEnd(live[x - 1]) || live[x].startMs - live[x - 1].endMs > MAX_GAP_MS);
  for (let s = 0; s + 1 < starts.length; s++) {
    const a = starts[s], b = starts[s + 1];
    if (b - a < 2 || b - a > RESTART_MAX_WORDS || sentenceEnd(live[b - 1]) || covered.has(a)) continue;
    if (!k[a] || !k[a + 1] || k[a] !== k[b] || k[a + 1] !== k[b + 1]) continue;
    wordCandidate("restart", a, b, "low", `abandoned, restarted with "${said(live.slice(b, b + 2))}"`);
  }

  // (d2) correction markers, longest first, with the phrase before them.
  const marked = new Set();
  for (const [phrase, confidence] of [...MARKERS].sort((x, y) => y[0].length - x[0].length)) {
    const p = phrase.split(" ").map(key);
    for (let m = 0; m + p.length <= live.length; m++) {
      if (!p.every((t, x) => k[m + x] === t) || marked.has(m)) continue;
      for (let x = 0; x < p.length; x++) marked.add(m + x);
      let from = m;
      while (from > 0 && m - from < MARKER_BACK_WORDS && !starts.includes(from)) from--;
      wordCandidate("marker", from, m + p.length, confidence, `correction marker "${phrase}"`);
    }
  }

  findings.sort((x, y) => x.startMs - y.startMs || x.kind.localeCompare(y.kind));
  const applySpans = mergeSpans(findings.filter((f) => f.apply).map((f) => f.cut));
  const cutMs = applySpans.reduce((s, [a, b]) => s + b - a, 0);
  return { findings, rawMs, cutMs, keptMs: rawMs - cutMs, applySpans };
};

const mergeSpans = (spans) => {
  const out = [];
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
};

// The kept footage as clips.json a-roll entries (prep-video.py read_clips shape).
export const keptClips = (recording, rawMs, applySpans) => {
  const clips = [];
  let at = 0;
  for (const [a, b] of [...applySpans, [rawMs, rawMs]]) {
    if (Math.round(a) > Math.round(at)) clips.push({ recording, inMs: Math.round(at), outMs: Math.round(a), role: "a-roll" });
    at = b;
  }
  return clips;
};

const ms = (t) => `${String(Math.floor(t / 60000)).padStart(2, "0")}:${((t % 60000) / 1000).toFixed(1).padStart(4, "0")}`;
const sec = (t) => `${(t / 1000).toFixed(1)} s`;
const min = (t) => `${((t * MATTE_X) / 60000).toFixed(1)} min`;
const count = (fs, kind, conf) => fs.filter((f) => f.kind === kind && (!conf || conf(f))).length;

const summaryOf = (slug, r, note) => {
  const f = r.findings;
  const auto = f.filter((x) => x.kind === "auto");
  return [
    `clean-clip ${slug}: raw ${sec(r.rawMs)}, kept ${sec(r.keptMs)} (${((100 * r.keptMs) / r.rawMs).toFixed(1)}%)${note ? ` ${note}` : ""}`,
    `  matte ESTIMATE at ~${MATTE_X}x: ${min(r.rawMs)} -> ${min(r.keptMs)} (saves ~${min(r.cutMs)}; only if the kept footage is assembled before the matte)`,
    `  auto-apply (high): ${count(f, "pause", (x) => x.apply)} pause(s), ${count(f, "repeat", (x) => x.apply)} repeat(s)`,
    `  propose only: ${count(f, "repeat", (x) => !x.apply)} repeat(s), ${count(f, "restart")} restart(s), ${count(f, "marker")} marker(s)`,
    `  timeline cuts already: ${auto.length} word(s) (${sec(auto.reduce((s, x) => s + x.endMs - x.startMs, 0))})`,
  ];
};

const reportOf = (slug, r, opts, note) => [
  `# clean-clip: ${slug}`, "",
  "Generated by `node scripts/clean-clip.mjs`. HEURISTIC: precision and recall on real speech are unmeasured.",
  "Read every row against the video before `--apply`; check every repeat that contains a number by ear.", "",
  ...summaryOf(slug, r, note).map((l) => `- ${l.trim()}`),
  `- max pause: ${opts.maxPauseMs} ms; margin around word cuts ${MARGIN_MS} ms; ${PAUSE_KEEP_MS} ms kept each side of a trimmed pause`, "",
  "| # | src time | span ms | kind | confidence | auto-apply | words | reason |",
  "|---|---|---|---|---|---|---|---|",
  ...r.findings.map((x, n) =>
    `| ${n + 1} | ${ms(x.startMs)} | ${x.cut ? `${x.cut[0]}-${x.cut[1]}` : `${x.startMs}-${x.endMs}`} | ${x.kind} | ${x.confidence} | ${x.apply ? "yes" : "no"} | ${x.text.replace(/\|/g, "/") || "(silence)"} | ${x.reason}${x.why ? `; ${x.why}` : ""} |`),
  "",
].join("\n");

// --apply's new edit.json remove spans: high word cuts only (the timeline cuts
// silence itself), none already inside an existing span.
export const newRemoves = (findings, have = []) =>
  findings.filter((f) => f.apply && f.kind !== "pause").map((f) => f.cut)
    .filter(([a, b]) => !have.some(([x, y]) => x <= a && y >= b));

// Write `file` (a .bak of the old one first); refuse to replace it without --apply.
export const writeSafe = (file, text, apply) => {
  if (existsSync(file)) {
    if (!apply) throw new Error(`${file} exists; pass --apply to replace it (a .bak is kept).`);
    copyFileSync(file, `${file}.bak`);
  }
  writeFileSync(file, text, "utf8");
};

const durationMs = (file) => {
  if (!existsSync(file)) return undefined;
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  const s = Number(r.stdout?.trim());
  return r.status === 0 && s > 0 ? Math.round(s * 1000) : undefined;
};

const main = (args) => {
  const FLAGS = ["--apply", "--json", "--assemble-plan"];
  let slug, maxPauseMs = DEFAULT_MAX_PAUSE_MS;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--max-pause-ms") {
      maxPauseMs = Number(args[++i]);
      if (!Number.isInteger(maxPauseMs) || maxPauseMs < MAX_GAP_MS)
        throw new Error(`--max-pause-ms must be a whole number of ms >= ${MAX_GAP_MS}, got "${args[i]}".`);
    } else if (a.startsWith("--") && !FLAGS.includes(a)) throw new Error(`Unknown option ${a}.`);
    else if (!a.startsWith("--")) {
      if (slug) throw new Error(`One slug only, got "${slug}" and "${a}".`);
      slug = a;
    }
  }
  if (!slug) throw new Error("Usage: node scripts/clean-clip.mjs <slug> [--max-pause-ms 3000] [--json] [--apply] [--assemble-plan] | --selftest");
  if (!slugOk(slug)) throw new Error(`slug "${slug}" must be lowercase letters, digits, ".", "_" or "-".`);
  const apply = args.includes("--apply"), plan = args.includes("--assemble-plan");
  const videoDir = join(ROOT, "public", "videos", slug);
  const editPath = join(videoDir, "edit.json");
  const editText = existsSync(editPath) ? readFileSync(editPath, "utf8") : null;
  const edit = editText ? JSON.parse(editText) : {};
  const rel = (f) => join(ROOT, "public", recordingPath(slug, edit.source, f));
  if (!existsSync(rel("words.json"))) throw new Error(`No words.json for "${slug}" (${rel("words.json")}); run prep-video.py first.`);
  const raw = JSON.parse(readFileSync(rel("words.json"), "utf8"));
  const sourceMs = durationMs(rel("source.mp4"));
  const r = detect(Array.isArray(raw) ? raw : raw.words, edit, { maxPauseMs, rawEndMs: sourceMs });
  const note = sourceMs ? "" : "(raw = last word's end: no source.mp4 here)";

  const outDir = join(ROOT, "out", "clean-clip");
  mkdirSync(outDir, { recursive: true });
  const report = join(outDir, `${slug}.md`);
  writeFileSync(report, reportOf(slug, r, { maxPauseMs }, note), "utf8");
  const lines = [...summaryOf(slug, r, note), `  report: ${report}`];

  if (plan) {
    if (!edit.source) throw new Error(`edit.json has no "source": prep-video.py --clips needs a recording id (prep with --recording <id> first).`);
    if (existsSync(rel("foreground.webm"))) lines.push(`  NOTE: ${rel("foreground.webm")} exists: the matte is already made, so the plan saves no matte time.`);
    if ((edit.remove ?? []).length || (edit.cues ?? []).length || (edit.chapters ?? []).length)
      lines.push("  WARNING: edit.json already has remove/cues/chapters; the assembly moves every time onto a new clock.");
    const planPath = join(videoDir, "clean-clips.plan.json");
    writeSafe(planPath, `${JSON.stringify(keptClips(edit.source, r.rawMs, r.applySpans), null, 2)}\n`, apply);
    lines.push(`  plan: ${planPath} (review it, then:)`, `  python scripts/prep-video.py ${slug} --clips public/videos/${slug}/clean-clips.plan.json`);
  } else if (apply) {
    const have = edit.remove ?? [];
    const add = newRemoves(r.findings, have);
    if (!editText) lines.push("  --apply: no edit.json, nothing written.");
    else if (!add.length) lines.push("  --apply: no new high-confidence word spans; edit.json unchanged.");
    else {
      writeSafe(editPath, `${JSON.stringify({ ...edit, remove: [...have, ...add].sort((x, y) => x[0] - y[0]) }, null, 2)}\n`, true);
      const s = spawnSync(process.execPath, [join(ROOT, "scripts", "check-schema.mjs"), slug], { encoding: "utf8", cwd: ROOT });
      const out = `${s.stdout ?? ""}${s.stderr ?? ""}`.trim().split("\n");
      const last = out.find((l) => /^(Error|MortgageReel)/.test(l.trim())) ?? out[out.length - 1];
      lines.push(`  --apply: ${add.length} remove span(s) added to ${editPath} (old copy: edit.json.bak)`,
        `  check-schema exit ${s.status}: ${last}${/foreground\.webm is missing/.test(last) ? " (expected: the matte comes after this step)" : ""}`);
    }
  }
  if (args.includes("--json")) console.log(JSON.stringify({ slug, ...r, report }, null, 2));
  else console.log(lines.join("\n"));
};

// Synthetic Vietnamese cases; also pins the timeline.ts mirrors.
const selftest = () => {
  const assert = (ok, msg) => {
    if (!ok) throw new Error(`selftest: ${msg}`);
  };
  const src = readFileSync(TIMELINE_TS, "utf8");
  assert(src.includes(`const MAX_GAP_MS = ${MAX_GAP_MS};`), "MAX_GAP_MS differs from timeline.ts");
  assert(src.includes(`const MIN_STUTTER_CONFIDENCE = ${MIN_STUTTER_CONFIDENCE};`), "MIN_STUTTER_CONFIDENCE differs from timeline.ts");
  assert(src.includes('.replace(/[^\\p{L}\\p{N}]/gu, "")'), "timeline.ts key() changed");
  assert(2 * PAUSE_KEEP_MS > MAX_GAP_MS, "a trimmed pause must stay a timeline cut");
  // Words from "a b c" text, 300 ms each, 100 ms apart; `gaps` adds silence before word i.
  const say = (text, gaps = {}, conf = {}) => {
    let t = 0;
    return text.split(" ").map((w, i) => {
      t += gaps[i] ?? 100;
      const word = { text: ` ${w}`, startMs: t, endMs: t + 300, timestampMs: null, confidence: conf[i] ?? 1 };
      t += 300;
      return word;
    });
  };
  const run = (words, edit = {}, o = {}) => detect(words, { pacing: { mode: "off" }, ...edit }, o);
  const of = (r, kind) => r.findings.filter((f) => f.kind === kind);

  // Merge mirror equals the timeline's (split number tokens).
  const split = [...say("lãi suất"), { text: "4", startMs: 900, endMs: 1000, confidence: 1 }, { text: ".1", startMs: 1000, endMs: 1100, confidence: 1 }];
  assert(mergeWords(split).length === buildTimeline(split, { pacing: { mode: "off" }, cut: { fillers: false, stutters: false } }, FPS).captions.length, "merge mirror");

  // Clean clip: no findings at all.
  const clean = run(say("Hôm nay mình nói về lãi suất cố định. Cảm ơn các bạn."));
  assert(clean.findings.length === 0 && clean.keptMs === clean.rawMs, `clean clip has findings: ${JSON.stringify(clean.findings)}`);

  // Filler: listed from the timeline, never applied.
  const filler = of(run(say("Hôm nay ừm mình nói về vay")), "auto");
  assert(filler.length === 1 && filler[0].text === "ừm" && filler[0].reason === "filler" && !filler[0].apply, "filler listed");

  // 3.2 s pause: high, trimmed to PAUSE_KEEP_MS each side; 2999 ms stays.
  const p = run(say("Mình nói về vay. Tiếp theo là lãi suất", { 4: 3200 }));
  const [pause] = of(p, "pause");
  assert(pause && pause.apply && pause.confidence === "high" && pause.endMs - pause.startMs === 3200, "3.2 s pause found");
  assert(pause.cut[0] === pause.startMs + PAUSE_KEEP_MS && pause.cut[1] === pause.endMs - PAUSE_KEEP_MS, "pause keeps its edges");
  assert(p.cutMs === 3200 - 2 * PAUSE_KEEP_MS, "kept duration subtracts the pause");
  assert(of(run(say("Mình nói về vay. Tiếp", { 4: 2999 })), "pause").length === 0, "2999 ms is not a pause");
  assert(of(run(say("Mình nói về vay. Tiếp", { 4: 3000 })), "pause").length === 1, "3000 ms is a pause");
  assert(of(run(say("Mình nói về vay. Tiếp", { 4: 3000 }), {}, { maxPauseMs: 3001 }), "pause").length === 0, "--max-pause-ms");

  // Exact repeat: earlier take dropped, high, with the margin, inside the gaps.
  const rep = run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về vay mua nhà"));
  const [r1] = of(rep, "repeat");
  assert(r1 && r1.apply && r1.text === "Hôm nay mình sẽ nói về" && r1.confidence === "high", `exact repeat: ${JSON.stringify(r1)}`);
  // 100 ms to the kept word: the cut stops MARGIN_MS short of it; 400 ms: full margin.
  assert(r1.cut[0] === 100 - MARGIN_MS && r1.cut[1] === r1.endMs + 100 - MARGIN_MS, `margin, tight gap: ${r1.cut}`);
  const [r2] = of(run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về vay", { 6: 400 })), "repeat");
  assert(r2 && r2.cut[1] === r2.endMs + MARGIN_MS, `margin, wide gap: ${r2?.cut}`);
  assert(of(run(say("vay mua nhà vay mua căn")), "repeat").length === 0, "2-word repeat is below REPEAT_MIN_WORDS");
  assert(of(run(say("tăng phần trăm. Tháng Hai giữ phần trăm. Tháng Sáu")), "repeat").length === 0, "a run stops at a full stop");
  const twice = of(run(say("Ngân hàng xét hồ sơ. Ngân hàng xét hồ sơ. Vậy thôi.")), "repeat");
  assert(twice.length === 1 && twice[0].apply && twice[0].text === "Ngân hàng xét hồ sơ.", "the same sentence twice");
  assert(of(run(say("vay mua nhà vay mua nhà")), "auto").length === 3, "a 3-word stutter is the timeline's");
  assert(of(run(say("Hôm nay mình Hôm nay mình vay")), "repeat").length === 0, "...and not double-listed");
  // Fillers between the takes still count as exact.
  const rf = of(run(say("mình sẽ nói ờ mình sẽ nói về vay")), "repeat");
  assert(rf.length === 1 && rf[0].apply && rf[0].text === "mình sẽ nói ờ", "filler between takes");
  // Window: retake 6.1 s after the first take ends is not a repeat; 6.0 s is.
  assert(of(run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về", { 6: 6100 })), "repeat").length === 0, "outside window");
  assert(of(run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về", { 6: 6000 })), "repeat").length === 1, "inside window");
  // A low-confidence word: proposed, not applied.
  const lc = of(run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về", {}, { 6: 0.4 })), "repeat");
  assert(lc.length === 1 && !lc[0].apply && lc[0].confidence === "medium", "low-confidence repeat is medium");

  // Repeat with a number: never auto-applied.
  const num = of(run(say("khoản vay 600 nghìn đô khoản vay 600 nghìn đô trong 30 năm")), "repeat");
  assert(num.length === 1 && !num[0].apply && num[0].confidence === "medium", `number repeat applied: ${JSON.stringify(num)}`);
  assert(of(run(say("vay sáu trăm nghìn vay sáu trăm nghìn")), "repeat").every((f) => !f.apply), "spoken number word");
  const digits = of(run(say("gói 2024 rất tốt gói 2024 rất tốt nhé")), "repeat");
  assert(digits.length === 1 && !digits[0].apply, "digits alone block auto-apply");
  assert(of(run(say("nhà đẹp lắm. Rồi nhà đẹp lắm. Rồi sao")), "repeat").length === 0, "exact run stops at a full stop");
  // The repeat crosses a number (a corrected figure): proposed only.
  const cross = of(run(say("lãi suất là 5 phần trăm lãi suất là 6 phần trăm")), "repeat");
  assert(cross.length === 1 && !cross[0].apply && cross[0].text === "lãi suất là 5 phần trăm", `crossing number: ${JSON.stringify(cross)}`);
  // Not exact (other words between the takes): medium.
  const ne = of(run(say("Hôm nay mình sẽ nói về thì thôi Hôm nay mình sẽ nói về vay")), "repeat");
  assert(ne.length === 1 && !ne[0].apply && ne[0].confidence === "medium", "inexact repeat is medium");
  assert(of(run(say("các bạn có thể vay. Rồi sau đó các bạn có thể bán")), "repeat").length === 0, "inexact across a full stop");
  assert(of(run(say("các bạn có thể a b c d e f g h i j k l m các bạn có thể bán")), "repeat").length === 0, "inexact, 13 words between");
  assert(of(run(say("các bạn có thể a b c d e f g h i j k l các bạn có thể bán")), "repeat").length === 1, "inexact, 12 words between");

  // False-start marker: proposed, never applied, with the phrase before it.
  const mk = of(run(say("lãi suất cố định à không lãi suất thả nổi")), "marker");
  assert(mk.length === 1 && !mk[0].apply && mk[0].confidence === "low" && mk[0].text.startsWith("lãi suất cố định"), `marker: ${JSON.stringify(mk)}`);
  const mk2 = of(run(say("Mình đi Sydney. Ý tôi là Melbourne.")), "marker");
  assert(mk2.length === 1 && mk2[0].confidence === "medium" && !mk2[0].apply && mk2[0].text === "Ý tôi là", "medium marker");
  assert(of(run(say("Để tôi nói lại nhé")), "marker").length === 1, "longest marker wins, no double");
  // Abandoned fragment + restart with the same two words: low.
  const rs = of(run(say("Nếu bạn muốn vay Nếu bạn có thu nhập ổn định.", { 4: 600 })), "restart");
  assert(rs.length === 1 && !rs[0].apply && rs[0].confidence === "low" && rs[0].text === "Nếu bạn muốn vay", `restart: ${JSON.stringify(rs)}`);
  assert(of(run(say("Nếu bạn muốn vay. Nếu bạn có thu nhập.")), "restart").length === 0, "a finished sentence is not abandoned");

  // Never cut inside a word: overlapping word times downgrade to medium.
  const ov = say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về vay");
  ov[6] = { ...ov[6], startMs: ov[5].endMs - 50 };
  const ovr = of(run(ov), "repeat");
  assert(ovr.length === 1 && !ovr[0].apply && ovr[0].cut === null, "overlap is never cut");
  // Words already in edit.json remove are not re-proposed.
  const done = run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về vay"), { remove: [[0, 2500]] });
  assert(of(done, "repeat").length === 0, "already removed");

  // --apply: only high word spans go to edit.json, not pauses, not medium, no duplicates.
  const mix = run(say("Hôm nay mình sẽ nói về Hôm nay mình sẽ nói về vay 5 phần trăm vay 5 phần trăm", { 12: 3200 }));
  const adds = newRemoves(mix.findings);
  assert(adds.length === 1 && adds[0][0] === r1.cut[0], `newRemoves: ${JSON.stringify(adds)}`);
  assert(newRemoves(mix.findings, [[0, 99999]]).length === 0, "newRemoves skips covered spans");
  // Never overwrite without --apply; with it, a .bak of the old file.
  const dir = mkdtempSync(join(tmpdir(), "clean-clip-"));
  try {
    const f = join(dir, "x.json");
    writeSafe(f, "old", false);
    let refused = false;
    try {
      writeSafe(f, "new", false);
    } catch {
      refused = true;
    }
    assert(refused && readFileSync(f, "utf8") === "old", "overwrote without --apply");
    writeSafe(f, "new", true);
    assert(readFileSync(f, "utf8") === "new" && readFileSync(`${f}.bak`, "utf8") === "old", "no .bak on --apply");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // Plan clips cover only the kept footage.
  const clips = keptClips("rec", 10000, [[0, 500], [3000, 4000]]);
  assert(JSON.stringify(clips) === JSON.stringify([
    { recording: "rec", inMs: 500, outMs: 3000, role: "a-roll" },
    { recording: "rec", inMs: 4000, outMs: 10000, role: "a-roll" },
  ]), `plan clips: ${JSON.stringify(clips)}`);
  console.log("clean-clip selftest ok");
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes("--selftest")) selftest();
    else main(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
