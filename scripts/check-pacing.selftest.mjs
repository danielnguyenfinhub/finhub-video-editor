// Self-test for check-pacing.mjs on synthetic edit.json + words (no media).
// Run: node scripts/check-pacing.selftest.mjs (exit 1 on failure).
import { pacingOf, reelFrom } from "./check-pacing.mjs";

// Distinct letter words, 400 ms apart, 300 ms long: one run, no cuts.
const words = (n) =>
  Array.from({ length: n }, (_, i) => ({
    text: ` từ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26) % 26)}`,
    startMs: i * 400, endMs: i * 400 + 300, timestampMs: null, confidence: null,
  }));
const edit = (extra) => ({ title: "Thử", design: "classic", pacing: { mode: "off" }, ...extra });
const points = (items, title = "Ba ý") => ({
  kind: "points", fromMs: 0, toMs: 8000, title, items: items.map((atMs, i) => ({ text: `Ý số ${"một hai ba bốn".split(" ")[i]}`, atMs })),
});
const run = (e, n = 20) => pacingOf(reelFrom(e, words(n)));

let failed = false;
const check = (name, ok, detail) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  (${JSON.stringify(detail)})`}`);
  if (!ok) failed = true;
};

const bare = run(edit({}));
check("no visuals for 8 s: one gap flagged", bare.gaps.length === 1 && bare.gaps[0].staticMs > 7000, bare.gaps);

const clean = run(edit({ cues: [points([1000, 3000, 5000, 7000])] }));
check("a beat every 2 s: clean", clean.gaps.length === 0 && clean.empty.length === 0, { gaps: clean.gaps, empty: clean.empty });

const late = run(edit({ cues: [points([2600, 3600, 5600, 7000])] }));
check("first item 2.6 s after the card: empty card body", late.empty.length === 1, late.empty);

const long = "Một tiêu đề dài để đọc: người làm hồ sơ, người chủ, người kế toán và cả hệ sinh thái";
const read = run(edit({ cues: [points([500, 1000], long)] }));
check("gap inside the card's reading time: excused", read.gaps.length === 0, read.gaps);

const cards = run(edit({ design: "cards" }), 460);
check("cards, talk > 180 s: accepted exception", cards.accepted && cards.gaps.length > 0, { accepted: cards.accepted, talkMs: cards.talkMs });

process.exitCode = failed ? 1 : 0;
