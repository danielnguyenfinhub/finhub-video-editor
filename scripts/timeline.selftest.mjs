// Characterization test for src/mortgage/timeline.ts on synthetic words (no media, no
// client data): pins what the cuts, pacing, chapter overlap and time maps do TODAY, so a
// change to them fails here instead of in a render. The pacing numbers are "current", not
// "correct": on 30/09/2026 auto pacing (the default) shifted Daniel's pitch, which is why
// footage uses {"mode":"off"} (preflight enforces it).
// Run: node scripts/timeline.selftest.mjs (exit 1 on failure).
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const { buildTimeline, toOutMs, toSrcMs } = await import(
  pathToFileURL(join(import.meta.dirname, "..", "src", "mortgage", "timeline.ts")).href
);

// Three runs of 10 words: fast (6.25 w/s), slow (2.5 w/s), near target (4.3 w/s),
// each followed by a 1.4 s silence that the timeline cuts.
const names = "amber basil cedar delta ember fable glade harbor indigo juniper kestrel lantern meadow nectar orchid pebble quartz ripple sable tundra umber velvet willow xenon yarrow zephyr acorn birch clover dune".split(" ");
let i = 0, t = 500;
const words = [];
const run = (n, wordMs, gapMs) => {
  for (let k = 0; k < n; k++) {
    words.push({ text: ` ${names[i++]}`, startMs: t, endMs: t + wordMs, timestampMs: t, confidence: 0.9 });
    t += wordMs + gapMs;
  }
};
run(10, 120, 40); t += 1400;
run(10, 250, 150); t += 1400;
run(10, 180, 50);

const FPS = 30;
const build = (edit) => buildTimeline(words, edit, FPS);
const shape = (tl) => tl.segments.map((s) => [s.srcFrom, s.srcTo, s.outFrom, s.outDuration, s.rate]);

// Pacing off: every segment plays at 1x; the silences are cut.
const off = build({ pacing: { mode: "off" } });
assert.deepEqual(shape(off), [[12, 67, 0, 55, 1], [102, 225, 55, 123, 1], [264, 347, 178, 83, 1]], "pacing off: segments");
assert.equal(off.talkFrames, 261, "pacing off: talkFrames");
assert.equal(off.captions.length, 30, "every word keeps a caption");

// Pacing auto: rates stay inside 0.9-1.2; the fast run is slowed, the rest stay at 1.
const auto = build({ pacing: { mode: "auto" } });
assert.deepEqual(auto.segments.map((s) => s.rate), [0.9, 1, 1], "pacing auto: rates");
assert.ok(auto.segments.every((s) => s.rate >= 0.9 && s.rate <= 1.2), "pacing auto: inside 0.9-1.2");
assert.equal(auto.talkFrames, 267, "pacing auto: talkFrames");

// No pacing field means auto. This is the default that altered Daniel's voice.
assert.deepEqual(shape(build({})), shape(auto), "default pacing is auto");

// A 500 ms pause inside a talk is cut (the limit is 380 ms); a 300 ms one is kept.
const gapWords = (gapMs) => [0, 1, 2, 3, 4, 5].map((k) => {
  const startMs = 500 + k * 200 + (k >= 3 ? gapMs : 0);
  return { text: ` ${names[k]}`, startMs, endMs: startMs + 150, timestampMs: startMs, confidence: 0.9 };
});
const segs = (gapMs) => buildTimeline(gapWords(gapMs), { pacing: { mode: "off" } }, FPS).segments.length;
assert.equal(segs(500), 2, "500 ms pause is cut");
assert.equal(segs(300), 1, "300 ms pause is kept");

// A remove span splits its segment and drops its words' captions.
const cut = build({ pacing: { mode: "off" }, remove: [[words[3].startMs, words[4].endMs]] });
assert.deepEqual(cut.segments.map((s) => s.words), [3, 5, 10, 10], "remove: words per segment");
assert.equal(cut.captions.length, 28, "remove: two captions gone");
assert.equal(cut.talkFrames, 253, "remove: talkFrames");

// A chapter puts a transition on a cut and overlaps both segments by 10 frames (CHAPTER_TRANSITION_FRAMES, pinned as a literal).
const ch = build({ pacing: { mode: "off" }, chapters: [{ atMs: words[10].startMs, effect: "slide" }] });
assert.equal(ch.segments[0].transitionAfter, "slide", "chapter: transition on the segment before");
assert.equal(ch.segments[0].outFrom + ch.segments[0].outDuration - ch.segments[1].outFrom, 10, "chapter: overlap");
assert.equal(ch.talkFrames, 263, "chapter: talkFrames");

// Time maps: source -> output -> source round-trips on a kept moment (pacing off).
assert.equal(Math.round(toOutMs(off.segments, words[0].startMs, FPS)), 100, "toOutMs: first word");
assert.equal(Math.round(toOutMs(off.segments, words[10].startMs, FPS)), 1933, "toOutMs: first word after a cut");
assert.equal(toSrcMs(off.segments, 100, FPS), words[0].startMs, "toSrcMs: inverse");
assert.equal(toOutMs(off.segments, 999999, FPS), null, "toOutMs: past the end is null");

// Nothing to keep is an error, not an empty video.
assert.throws(() => buildTimeline([], {}, FPS), /no speech to keep/, "empty words throw");

console.log("timeline selftest ok (off, auto, default=auto, remove, chapter overlap, time maps, empty)");
