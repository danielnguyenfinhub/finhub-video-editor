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
