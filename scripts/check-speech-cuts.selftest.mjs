// Self-check for scripts/check-speech-cuts.mjs on a generated recording.
// Run: node scripts/check-speech-cuts.selftest.mjs (exit 1 on failure).
// Three 1 s "words" (a 200 Hz tone: loud and periodic like a vowel) with 1 s of
// silence between. Timed right, every cut lands in silence: no findings. With the
// middle word timed 700 ms late (Whisper missing its start), the cut drops
// 700 ms of voiced sound before a kept start: an ERROR. A chapter transition
// plays both sides' audio: over the 1 s pause it is silent (no finding); over a
// 100 ms pause split by a pause-only remove, two "words" play at once: an ERROR.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findSpeechCuts, loadAudio } from "./check-speech-cuts.mjs";

const dir = mkdtempSync(join(tmpdir(), "speech-cuts-"));
// A 200 Hz tone gated on during each [fromS, toS].
const tone = (name, spans) => {
  const wav = join(dir, name);
  const gate = spans.map(([a, b]) => `between(t\\,${a}\\,${b})`).join("+");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=0.25*sin(2*PI*200*t)*(${gate}):s=16000:d=6`, wav]);
  return loadAudio(wav);
};
try {
  const audio = tone("tone.wav", [[0.5, 1.5], [2.5, 3.5], [4.5, 5.5]]);
  const close = tone("close.wav", [[0.5, 1.5], [1.6, 2.6], [4.5, 5.5]]);
  const w = (text, startMs, endMs) => ({ text: ` ${text}`, startMs, endMs, timestampMs: null, confidence: 1 });
  const edit = { pacing: { mode: "off" } };

  const clean = findSpeechCuts([w("một", 500, 1500), w("hai", 2500, 3500), w("ba.", 4500, 5500)], edit, audio);
  const bug = findSpeechCuts([w("một", 500, 1500), w("hai", 3200, 3500), w("ba.", 4500, 5500)], edit, audio);
  // A remove span over the late word's missing part makes the loss deliberate.
  const excused = findSpeechCuts(
    [w("một", 500, 1500), w("hai", 3200, 3500), w("ba.", 4500, 5500)],
    { ...edit, remove: [[2400, 3150]] },
    audio,
  );
  // A remove ending 200 ms short of the kept start: the leftover sound sits next to a
  // deliberate remove, so it is a WARN to listen to, not an ERROR.
  const nearRemove = findSpeechCuts(
    [w("một", 500, 1500), w("hai", 3200, 3500), w("ba.", 4500, 5500)],
    { ...edit, remove: [[2400, 2900]] },
    audio,
  );
  const fade = [{ atMs: 2500, effect: "fade" }];
  const chapterClean = findSpeechCuts([w("một", 500, 1500), w("hai", 2500, 3500), w("ba.", 4500, 5500)], { ...edit, chapters: fade }, audio);
  const overlap = findSpeechCuts(
    [w("một", 500, 1500), w("thì", 1500, 1600), w("hai", 1600, 2600), w("ba.", 4500, 5500)],
    { ...edit, remove: [[1500, 1600]], chapters: [{ atMs: 1600, effect: "fade" }] },
    close,
  );
  const both = overlap.findings.find((f) => f.kind.includes("transition overlap"));
  const hit = bug.findings.find((f) => f.severity === "ERROR");
  const ok =
    clean.errors === 0 && clean.warnings === 0 &&
    bug.errors === 1 && hit.kind === "onset clipped" && Math.abs(hit.srcFromMs - 2500) <= 20 && hit.voicedMs >= 550 &&
    excused.errors === 0 &&
    nearRemove.errors === 0 && nearRemove.findings.some((f) => f.fix.startsWith("adjacent to a listed remove")) &&
    chapterClean.errors === 0 && chapterClean.warnings === 0 &&
    both?.severity === "ERROR" && both.voicedMs >= 200 && overlap.errors === 1;
  if (!ok) {
    console.error("check-speech-cuts self-check failed", JSON.stringify({ clean, bug, excused, nearRemove, chapterClean, overlap }, null, 1));
    process.exit(1);
  }
  console.log(`check-speech-cuts ok (clean: 0 findings; late word: ERROR ${hit.kind} ${hit.srcFromMs}-${hit.srcToMs} ms; remove span excuses it; next to a remove: WARN; transition over a pause: clean, over a 100 ms pause: ERROR ${both.voicedMs} ms together)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
