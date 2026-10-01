// Speech lost at the automatic cuts, found BEFORE the first render.
//
//   node scripts/check-speech-cuts.mjs <slug> [--public-dir <dir>] [--json]
//
// The timeline (src/mortgage/timeline.ts buildTimeline) takes every cut point
// from words.json word times. When Whisper leaves speech out of words.json, or
// times a word short, the cut drops real speech ("nếu như" vanished at 115.5 s in
// doi-nha-mua-truoc-ban-sau, "gần" cut mid-word, 200 ms out of "emotion"). This
// builds the same timeline, measures the SOURCE audio in 10 ms frames and
// reports voiced speech inside a cut and kept edges that sit in a word.
// Exit 1 on any ERROR (2 on bad input). scripts/preflight.mjs can call
// checkSpeechCuts(slug) (or findSpeechCuts on data it already has).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
const FPS = 30; // MortgageReel's frame rate
const FRAME_MS = 10; // RMS window
const SOUND_DB = -30; // a 10 ms frame at or above this is sound
// Sound is not speech: breaths before a sentence reach -19 dB on Daniel's mic. A
// voiced frame is also periodic (normalised autocorrelation at a 70-400 Hz pitch
// lag); measured on doi-nha-mua-truoc-ban-sau, breaths score <= 0.45, vowels >= 0.7.
const PERIODIC = 0.6;
const BRIDGE_FRAMES = 2; // dips this short (20 ms) inside a word don't split it
const MIN_VOICED_MS = 60; // less voiced sound than this in a cut is ignored
const ERROR_VOICED_MS = 250; // this much voiced speech lost next to kept speech is a word or more
// Speech with a pause on both sides, inside a cut, is usually a false start or a
// "dạ" left out on purpose (four in doi-nha-mua-truoc-ban-sau, up to ~300 ms
// voiced); a phrase Whisper dropped whole is longer.
const ISOLATED_ERROR_MS = 500;
// Voiced sound this close to a listed remove edge may be the removed phrase itself.
const REMOVE_NEAR_MS = 150;
const QUIET_DB = -33; // a kept edge should find a dip this quiet...
const EDGE_WINDOW_MS = 40; // ...within this of the edge
const LOUD_EDGE_DB = -25; // an edge at or above this is inside a word
const CLIP_ERROR_MS = 80; // voiced sound cut off past a loud edge

// Chapter transitions: Remotion's TransitionSeries plays BOTH segments' audio for
// the transition's frames, so the outgoing tail and the incoming head overlap.
// bao-dam-vay-duoc-nha-refinance garbled "nhiều. / Thì thường" that way.
const OVERLAP_ERROR_MS = 100; // both sides voiced at the same moments this long: two voices at once
const OVERLAP_WARN_MS = 40;

const { buildTimeline, toOutMs, TALK_START_FRAME, CHAPTER_TRANSITION_FRAMES } = await import(
  pathToFileURL(join(ROOT, "src", "mortgage", "timeline.ts")).href
);
const { recordingPath } = await import(pathToFileURL(join(ROOT, "src", "mortgage", "recording.ts")).href);

// Mono 16 kHz PCM from ffmpeg -> { db: dB per 10 ms frame, voiced(frame) }.
export const loadAudio = (file) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], {
    maxBuffer: 1 << 30,
  });
  if (r.error || r.status !== 0)
    throw new Error(`ffmpeg could not read the audio of ${file}: ${r.error?.message ?? r.stderr.toString().trim()}`);
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
  const n = 16 * FRAME_MS;
  const db = new Float32Array(Math.floor(pcm.length / n));
  for (let f = 0; f < db.length; f++) {
    let sum = 0;
    for (let i = f * n; i < (f + 1) * n; i++) sum += pcm[i] * pcm[i];
    db[f] = 20 * Math.log10(Math.sqrt(sum / n) / 32768 + 1e-9);
  }
  // Periodicity over a 30 ms window centred on the frame, computed only where
  // asked (cuts and edges), so a 7-minute video stays a few seconds.
  const memo = new Map();
  const periodic = (f) => {
    if (memo.has(f)) return memo.get(f);
    const W = 480, s = f * n + n / 2 - W / 2;
    let best = 0;
    if (s >= 0 && s + W + 228 <= pcm.length)
      for (let lag = 40; lag <= 228; lag++) {
        let xy = 0, xx = 0, yy = 0;
        for (let i = 0; i < W; i++) {
          const a = pcm[s + i], b = pcm[s + i + lag];
          xy += a * b; xx += a * a; yy += b * b;
        }
        best = Math.max(best, xy / Math.sqrt(xx * yy + 1));
      }
    memo.set(f, best);
    return best;
  };
  return { db, voiced: (f) => f >= 0 && f < db.length && db[f] >= SOUND_DB && periodic(f) >= PERIODIC };
};

// Sound spans [fromMs, toMs) over the whole recording, short dips bridged. A
// span is the unit of "connected": sound that runs on into kept speech.
const soundSpans = (db) => {
  const spans = [];
  let start = -1, lastLoud = -1;
  for (let f = 0; f <= db.length; f++) {
    if (f < db.length && db[f] >= SOUND_DB) {
      if (start < 0) start = f;
      lastLoud = f;
    } else if (start >= 0 && f - lastLoud > BRIDGE_FRAMES) {
      spans.push([start * FRAME_MS, (lastLoud + 1) * FRAME_MS]);
      start = -1;
    }
  }
  return spans;
};

const frames = (a, b, len) => {
  const out = [];
  for (let f = Math.max(0, Math.floor(a / FRAME_MS)); f < Math.min(len, Math.ceil(b / FRAME_MS)); f++) out.push(f);
  return out;
};
const frameDb = (db, ms) => db[Math.min(db.length - 1, Math.max(0, Math.floor(ms / FRAME_MS)))];

// [a, b) minus a list of intervals -> the parts left.
const subtract = ([a, b], cuts) =>
  cuts.reduce(
    (parts, [x, y]) => parts.flatMap(([p, q]) => (y <= p || x >= q ? [[p, q]] : [[p, x], [y, q]].filter(([s, e]) => e > s))),
    [[a, b]],
  );

/**
 * Pure check on already-loaded data; returns { findings, errors, warnings }.
 * words: words.json array; edit: edit.json; audio: loadAudio(source.mp4).
 */
export const findSpeechCuts = (words, edit, audio) => {
  const { db } = audio;
  const tl = buildTimeline(words, edit, FPS);
  const ms = (frame) => Math.round((frame * 1000) / FPS);
  const segs = tl.segments.map((s) => [ms(s.srcFrom), ms(s.srcTo)]);
  // Cut gaps in source ms (plus the recording's head and tail), and whether kept
  // speech is on each side.
  const gaps = [[0, segs[0][0]], ...segs.slice(1).map((s, i) => [segs[i][1], s[0]]), [segs.at(-1)[1], db.length * FRAME_MS]]
    .map(([a, b], i) => ({ a, b, keptBefore: i > 0, keptAfter: i < segs.length }))
    .filter((g) => g.b > g.a);
  // Deliberate: remove spans, cut.words and bad words. Fillers and stutters are
  // automatic guesses (a stutter cut once took a real "tôi"), so they report as WARN.
  const timed = words.filter((w) => w.endMs > w.startMs);
  const endOf = (c) => timed.find((w) => w.startMs === c.atMs)?.endMs ?? c.atMs;
  const excused = [
    ...(edit.remove ?? []),
    ...tl.autoCuts.filter((c) => c.reason === "cut.words" || c.reason === "bad word").map((c) => [c.atMs, endOf(c)]),
  ];
  const guessed = tl.autoCuts.filter((c) => c.reason === "filler" || c.reason === "stutter");
  const outS = (srcMs) => Math.round(((toOutMs(tl.segments, srcMs, FPS) ?? ms(tl.talkFrames)) + ms(TALK_START_FRAME)) / 100) / 10;
  const word = (w) => (w ? `${w.text.trim()} ${w.startMs}-${w.endMs}` : "");
  const before = (t) => word(timed.filter((w) => w.startMs < t).at(-1));
  const after = (t) => word(timed.find((w) => w.endMs > t));
  const voiced = (a, b) => frames(a, b, db.length).filter(audio.voiced);
  const findings = [];
  const edgeSeen = new Set();
  const spans = soundSpans(db);
  for (const g of gaps)
    for (const [sa, sb] of spans) {
      if (sb <= g.a || sa >= g.b) continue;
      // Sound running on across a kept edge = a word clipped there. Past a kept
      // END that sound is the kept word's tail, so a remove span starting inside
      // it does not excuse it ("gần" ran on 300 ms into remove [234240, …]).
      // Before a kept START it is usually the removed false start running into
      // the retake ("việc là, | trước" at 37.0 s), so remove spans excuse it.
      const tail = g.keptBefore && sa < g.a;
      const onset = !tail && g.keptAfter && sb > g.b;
      const edge = tail ? g.a : onset ? g.b : null;
      const inGap = [Math.max(sa, g.a), Math.min(sb, g.b)];
      const parts = tail ? [inGap] : subtract(inGap, excused);
      for (const [a, b] of parts) {
        const v = voiced(a, b);
        const lost = v.length * FRAME_MS;
        if (lost < MIN_VOICED_MS) continue; // breath, click or room noise
        if (edge !== null) edgeSeen.add(edge);
        const edgeLoud = edge !== null && frameDb(db, onset ? edge : edge - FRAME_MS) >= LOUD_EDGE_DB;
        const from = v[0] * FRAME_MS, to = (v.at(-1) + 1) * FRAME_MS; // the voiced part
        const auto = guessed.find((c) => c.atMs < to && endOf(c) > from);
        const inWords = timed.filter((w) => w.startMs < to && w.endMs > from);
        const error = edge !== null ? lost >= ERROR_VOICED_MS || (edgeLoud && b - a > CLIP_ERROR_MS) : lost >= ISOLATED_ERROR_MS;
        const kept = tail ? timed.filter((w) => w.startMs < g.a).at(-1) : onset ? timed.find((w) => w.endMs > g.b) : null;
        const missing = `add the missing words to words.json with times from the audio (${from}-${to} ms)`;
        const over = inWords.slice(0, 3).map((w) => `"${w.text.trim()}" ${w.startMs}-${w.endMs}`).join(", ");
        let fix;
        // Next to a listed remove edge, the sound may be the removed restart running
        // straight into/out of the kept words (normal editing): WARN, not ERROR.
        const nearRemove = (edit.remove ?? []).some(([x, y]) => [x, y].some((e) => from < e + REMOVE_NEAR_MS && to > e - REMOVE_NEAR_MS));
        if (nearRemove) fix = `adjacent to a listed remove: listen, is this the kept word's tail or the removed phrase? If the kept word is cut, retime its endMs/startMs into the dip`;
        else if (auto) fix = `auto-cut ${auto.reason} "${auto.text}": check it is not real speech, else set cut.${auto.reason === "filler" ? "fillers" : "stutters"}=false`;
        else if (kept && over) fix = `retime word "${kept.text.trim()}" ${tail ? `endMs ${kept.endMs} -> ~${to}` : `startMs ${kept.startMs} -> ~${from}`} and move ${over} off its sound`;
        else if (kept) fix = `retime word "${kept.text.trim()}" ${tail ? `endMs ${kept.endMs} -> ~${to}` : `startMs ${kept.startMs} -> ~${from}`}, or ${missing} if more was said`;
        else if (over) fix = `retime ${over} from the audio (timed into the cut)`;
        else fix = `${missing}, or add a remove span [${from}, ${to}] if it is a false start`;
        findings.push({
          severity: error && !auto && !nearRemove ? "ERROR" : "WARN",
          kind: tail ? "tail clipped" : onset ? "onset clipped" : "speech in cut",
          outS: outS(from), srcFromMs: from, srcToMs: to, voicedMs: lost,
          peakDb: Math.round(Math.max(...v.map((f) => db[f]))),
          before: before(from), after: after(to), fix,
        });
      }
    }
  // Chapter transition joins: the last T output ms of segment i and the first T
  // of segment i+1 play at once, each side at its own playback rate.
  const T = (CHAPTER_TRANSITION_FRAMES * 1000) / FPS;
  const srcMs = (frame) => (frame * 1000) / FPS;
  let chapter = 0;
  tl.segments.forEach((s, i) => {
    const next = tl.segments[i + 1];
    if (!s.transitionAfter || !next) return;
    chapter++;
    const aFrom = srcMs(s.srcTo) - T * s.rate, aTo = srcMs(s.srcTo);
    const bFrom = srcMs(next.srcFrom), bTo = bFrom + T * next.rate;
    const side = (a, b) => {
      const fs = frames(a, b, db.length);
      return { voiced: fs.filter(audio.voiced).length * FRAME_MS, loud: fs.filter((f) => db[f] >= SOUND_DB).length * FRAME_MS };
    };
    const A = side(aFrom, aTo), B = side(bFrom, bTo);
    // Output ms where both sides are voiced at the same moment.
    let together = 0;
    for (let t = 0; t < T; t += FRAME_MS)
      together += audio.voiced(Math.floor((aFrom + t * s.rate) / FRAME_MS)) && audio.voiced(Math.floor((bFrom + t * next.rate) / FRAME_MS)) ? FRAME_MS : 0;
    const both = Math.min(A.voiced, B.voiced);
    const oneVoicedOtherLoud = (X, Y) => X.voiced >= OVERLAP_ERROR_MS && Y.loud - Y.voiced >= OVERLAP_ERROR_MS;
    // ERROR on voices truly at the same moment: each side alone being voiced
    // 100+ ms flagged doi-nha 05:42 (210/170 ms per side, 80 ms together),
    // which QC heard as a ~120 ms overlap with no word lost.
    const severity = together >= OVERLAP_ERROR_MS ? "ERROR"
      : both >= OVERLAP_WARN_MS || oneVoicedOtherLoud(A, B) || oneVoicedOtherLoud(B, A) ? "WARN" : null;
    if (!severity) return;
    const said = (a, b) => timed.filter((w) => w.startMs < b && w.endMs > a).map((w) => w.text.trim()).join(" ") || "…";
    const out = (s.outFrom + s.outDuration - CHAPTER_TRANSITION_FRAMES + TALK_START_FRAME) / FPS;
    findings.push({
      severity, kind: `chapter ${chapter} transition overlap`, outS: Math.round(out * 10) / 10,
      srcFromMs: Math.round(aFrom), srcToMs: Math.round(bTo), voicedMs: together, peakDb: Math.round(Math.max(...frames(aFrom, bTo, db.length).map((f) => db[f]))),
      before: `${Math.round(aFrom)}-${Math.round(aTo)} voiced ${A.voiced} ms`, after: `${Math.round(bFrom)}-${Math.round(bTo)} voiced ${B.voiced} ms`,
      fix: `chapter ${chapter} transition at out ${mmss(out)}: two pieces of speech play together for ${together} ms ('${said(aFrom, aTo)}' over '${said(bFrom, bTo)}'): widen the pause between them (retime the later word's startMs / move chapters[i].atMs to a pause >= 0.5 s); a pause-only remove shorter than the transition cannot fix it`,
    });
  });
  // Kept edges with no quiet dip nearby and voiced sound just past them.
  const edges = segs.flatMap(([a, b], i) => [...(i > 0 ? [[a, "start"]] : []), ...(i < segs.length - 1 ? [[b, "end"]] : [])]);
  for (const [e, side] of edges) {
    if (edgeSeen.has(e) || excused.some(([x, y]) => e >= x && e <= y)) continue;
    if (Math.min(...frames(e - EDGE_WINDOW_MS, e + EDGE_WINDOW_MS, db.length).map((f) => db[f])) <= QUIET_DB) continue;
    if (!voiced(...(side === "end" ? [e, e + EDGE_WINDOW_MS] : [e - EDGE_WINDOW_MS, e])).length) continue;
    const level = Math.round(frameDb(db, side === "end" ? e - FRAME_MS : e));
    const w = side === "end" ? timed.filter((x) => x.startMs < e).at(-1) : timed.find((x) => x.endMs > e);
    findings.push({
      severity: "WARN", kind: `kept ${side} in sound`, outS: outS(e), srcFromMs: e, srcToMs: e, voicedMs: 0, peakDb: level,
      before: before(e), after: after(e),
      fix: `retime word "${w?.text.trim()}" ${side === "end" ? "endMs" : "startMs"} into the nearest quiet dip (none within ${EDGE_WINDOW_MS} ms)`,
    });
  }
  findings.sort((x, y) => x.srcFromMs - y.srcFromMs);
  return {
    findings,
    errors: findings.filter((f) => f.severity === "ERROR").length,
    warnings: findings.filter((f) => f.severity === "WARN").length,
  };
};

/** Load a slug the way brief.mjs does and check it. publicDir defaults to <repo>/public. */
export const checkSpeechCuts = (slug, publicDir = join(ROOT, "public")) => {
  const read = (path, what) => {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      throw new Error(`Cannot read ${what} for "${slug}" (${path}): ${err.message}`);
    }
  };
  // This checkout's edit.json; failing that, publicDir's (a fixture: scripts/check-preflight.mjs).
  const edit = read([join(ROOT, "public"), publicDir].map((d) => join(d, "videos", slug, "edit.json")).find(existsSync) ?? join(ROOT, "public", "videos", slug, "edit.json"), "edit.json");
  const raw = read(join(publicDir, recordingPath(slug, edit.source, "words.json")), "words.json");
  const source = join(publicDir, recordingPath(slug, edit.source, "source.mp4"));
  if (!existsSync(source)) throw new Error(`No source.mp4 for "${slug}" at ${source}; the cut check measures the source audio.`);
  return findSpeechCuts(Array.isArray(raw) ? raw : raw.words, edit, loadAudio(source));
};

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2);
  const slug = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--public-dir");
  const dirAt = args.indexOf("--public-dir");
  if (!slug) {
    console.error("Usage: node scripts/check-speech-cuts.mjs <slug> [--public-dir <dir>] [--json]");
    process.exit(2);
  }
  let res;
  try {
    res = checkSpeechCuts(slug, dirAt >= 0 ? resolve(args[dirAt + 1]) : undefined);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (args.includes("--json")) console.log(JSON.stringify(res, null, 2));
  else {
    for (const f of res.findings)
      console.log(
        `${f.severity.padEnd(5)} out ${mmss(f.outS)}  src ${f.srcFromMs}-${f.srcToMs} ms  ${String(f.voicedMs).padStart(4)} ms voiced  ${String(f.peakDb).padStart(3)} dB  ${f.kind}\n` +
          `      [${f.before}] | [${f.after}]\n      fix: ${f.fix}`,
      );
    console.log(`${slug}: ${res.errors} error(s), ${res.warnings} warning(s) in the speech cuts.`);
  }
  process.exit(res.errors ? 1 : 0);
}
