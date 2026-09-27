// Checks the caption slip fixes in src/mortgage/timeline.ts on a synthetic
// transcript. Run: node scripts/check-caption-fixes.mjs (exit 1 on failure).
const t = await import(new URL("../src/mortgage/timeline.ts", import.meta.url));
const words = ["Gói", " vai", " này", " tiền", " giống", " như", " tiền", " giống."];
const ws = words.map((text, i) => ({ text, startMs: i * 400, endMs: i * 400 + 350, timestampMs: null, confidence: 1 }));
const got = t.buildTimeline(ws, {}, 30).captions.map((c) => c.text).join("");
const want = " Gói vay này tiền giống như tiền gốc.";
if (got !== want) {
  console.error(`caption fixes: got "${got}", want "${want}"`);
  process.exit(1);
}
console.log("caption fixes ok");

// Vietnamese decimal comma: Whisper's "4" ".1" -> "4,1"; a dot before three
// digits is Vietnamese thousands and stays ("100.000"). The English line
// (edit.subtitles) is typed text, never built here, so it keeps "4.1".
const nums = [" là", " 4", ".1", " tỷ", " và", " 100", ".000", "%", " hay", " 0", ".4%"];
const ns = nums.map((text, i) => ({ text, startMs: i * 400, endMs: i * 400 + 350, timestampMs: null, confidence: 1 }));
const reel = { subtitles: [{ fromMs: 0, toMs: 4000, text: "4.1 billion" }] };
const numGot = t.buildTimeline(ns, reel, 30).captions.map((c) => c.text).join("");
const numWant = " là 4,1 tỷ và 100.000% hay 0,4%";
if (numGot !== numWant || reel.subtitles[0].text !== "4.1 billion") {
  console.error(`decimal comma: got "${numGot}", want "${numWant}"`);
  process.exit(1);
}
console.log("decimal comma ok");

// A fix with atMs changes only the word spoken then; "" hides a misheard extra
// word. The same word elsewhere stays ("gọi là" is right, "gọi hồ sơ" is "gửi").
const at = [" gọi", " là", " không", " trả", " lời", " phí", " gọi", " hồ", " sơ"];
const as = at.map((text, i) => ({ text, startMs: i * 400, endMs: i * 400 + 350, timestampMs: null, confidence: 1 }));
const fixes = [{ from: "trả", to: "tính", atMs: 1200 }, { from: "lời", to: "", atMs: 1600 }, { from: "gọi", to: "gửi", atMs: 2450 }];
const atGot = t.buildTimeline(as, { captionFixes: fixes }, 30).captions.map((c) => c.text).join("");
const atWant = " gọi là không tính phí gửi hồ sơ";
if (atGot !== atWant) {
  console.error(`timed caption fixes: got "${atGot}", want "${atWant}"`);
  process.exit(1);
}
console.log("timed caption fixes ok");

// The last word keeps a longer tail (LAST_PAD_AFTER_MS) than words mid-talk.
const tail = [" Vậy", " thôi."].map((text, i) => ({ text, startMs: 1000 + i * 300, endMs: 1250 + i * 300, timestampMs: null, confidence: 1 }));
const tl = t.buildTimeline(tail, {}, 30);
const lastSeg = tl.segments[tl.segments.length - 1];
if (lastSeg.srcTo < Math.floor((1550 + 390) * 30 / 1000)) {
  console.error(`last word tail: segment ends at frame ${lastSeg.srcTo}, want >= ~${Math.floor(1940 * 30 / 1000)}`);
  process.exit(1);
}
console.log("last word tail ok");

// Cut joins (27/09/2026). Whisper word timings run ~0.1 s loose.
// 1. A word right after a cut keeps a lead-in even when the cut word ends
//    exactly where it starts ("Thì tùy" played as "thì").
const word = (text, startMs, endMs, confidence = 1) => ({ text, startMs, endMs, timestampMs: null, confidence });
const joinWords = [word(" quan", 0, 300), word(" trọng.", 300, 600), word(" Thì", 900, 1100), word(" tùy", 1100, 1400), word(" thuộc", 1400, 1700)];
const joinSegs = t.buildTimeline(joinWords, { remove: [[900, 1100]] }, 30).segments;
const afterCut = joinSegs.find((s) => s.srcFrom * 1000 / 30 > 700);
if (!afterCut || afterCut.srcFrom * 1000 / 30 > 1100 - 50) {
  console.error(`cut join: the run after the cut starts at ${afterCut && Math.round(afterCut.srcFrom * 1000 / 30)} ms, want <= 1050 (lead-in before "tùy" at 1100)`);
  process.exit(1);
}
console.log("cut join lead-in ok");

// 2. A doubled word Whisper half-heard (confidence < 0.6) isn't cut as a stutter;
//    a confident one still is.
const stutterCut = (conf) => t.buildTimeline(
  [word(" là", 0, 150), word(" chỉ", 150, 290), word(" làm", 290, 460, 0.97), word(" làm", 470, 690, conf), word(" sao", 700, 900)],
  {}, 30).autoCuts.filter((c) => c.reason === "stutter").length;
if (stutterCut(0.455) !== 0 || stutterCut(0.95) !== 1) {
  console.error(`stutter confidence: cut ${stutterCut(0.455)} at 0.455 (want 0), ${stutterCut(0.95)} at 0.95 (want 1)`);
  process.exit(1);
}
console.log("stutter confidence ok");
