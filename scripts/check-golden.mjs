// Check for src/mortgage/golden.ts. Run: node scripts/check-golden.mjs [slug]
// [--public-dir dir] (exit 1 on failure). Synthetic captions prove the number gluing, the
// bare-count filter, stat coverage, bank detection and the reading-time floor;
// with a slug it also prints what that video's captions would produce, and
// every card, cue or caption page shown for less than its reading time. scripts/brief.mjs imports
// the exports below; the checks run only when this file is the entry point.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// golden.ts imports sibling .ts files without extensions (Bundler resolution),
// which Node's type stripping cannot follow, so bundle it first.
const bundle = join(mkdtempSync(join(tmpdir(), "golden-")), "golden.mjs");
execFileSync(process.execPath, [
  "node_modules/esbuild/bin/esbuild", "src/mortgage/golden.ts", "src/mortgage/timeline.ts",
  "src/mortgage/captionPages.ts",
  "--bundle", "--format=esm", "--platform=node", "--out-extension:.js=.mjs",
  `--outdir=${join(bundle, "..")}`,
]);
const url = (p) => new URL(`file:///${p.replace(/\\/g, "/")}`);
export const { figuresOf, lenderMentionsOf, faceHiddenOf, CUTAWAY_MAX_MS, READING, readingMs, readingFloor } =
  await import(url(bundle));
export const { buildTimeline, TALK_START_FRAME } = await import(url(join(bundle, "..", "timeline.mjs")));
const { captionPages } = await import(url(join(bundle, "..", "captionPages.mjs")));
export const FPS = 30;

// Reading-time findings: holds the floor stretched, holds it could not
// stretch (the next card of the same kind starts first), and caption pages
// faster than READING.captionCharsPerSec. Pages already last until the next
// page, so they can only be fixed by paging or a remove: reported, not
// changed, and not a failure. Paging as classic does it (900 / 350 ms); frames are video frames.
// ponytail: one paging setting for every design; pass the design's own
// combine window if a design with longer pages gets false alarms.
const TOL_MS = 1000 / FPS;
export const readingFindings = (reel) => {
  const video = (talkFrame) => TALK_START_FRAME + talkFrame;
  const { holds } = readingFloor(reel, FPS);
  const extended = holds.filter((h) => h.heldMs > h.shownMs + 1);
  const short = holds.filter((h) => h.heldMs + TOL_MS < h.needMs);
  const pages = captionPages({ captions: reel.timeline.captions, combineWithinMs: 900, breakOnSilenceAfterMs: 350 });
  const slowPages = pages.flatMap((p, i) => {
    const next = pages[i + 1]?.startMs ?? Infinity;
    const shownMs = Math.min(p.durationMs + 400, next - p.startMs);
    const needMs = readingMs([p.text], false, READING.captionCharsPerSec);
    const cps = (needMs / 1000) * READING.captionCharsPerSec / (shownMs / 1000);
    return shownMs + TOL_MS < needMs
      ? [{ frame: video(Math.round((p.startMs / 1000) * FPS)), text: p.text, shownMs, needMs, cps }]
      : [];
  });
  const framed = (hs) => hs.map((h) => ({ ...h, frame: video(h.atFrame) }));
  return { extended: framed(extended), short: framed(short), slowPages, pages: pages.length };
};
const ms = (x) => `${Math.round(x)} ms`;

export const words = (text) =>
  text.split(" ").map((w, i) => ({
    text: ` ${w}`, startMs: i * 400, endMs: i * 400 + 300, timestampMs: null, confidence: null,
  }));
export const reelOf = (wordList, edit = {}) => {
  const timeline = buildTimeline(wordList, { title: "t", ...edit }, FPS);
  return { edit: { title: "t", ...edit }, timeline };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let failed = false;
  const check = (name, ok, detail = "") => {
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
    if (!ok) failed = true;
  };

  // "4" ".1" glue; "1 năm" and "2 người" are counts, "5 triệu" is a figure;
  // "100" ".000" "%" glues. Words 400 ms apart, so figures 4 s apart survive.
  // Distinct fillers: a repeated word would be auto-cut as a stutter.
  const w = words("dân Úc trả 4 .1 tỷ đô trong 1 năm với 2 người rồi sau đó họ thấy 5 triệu là con số mà nhiều người hay quên mất đi khi tính tổng chi phí 100 .000 % xong");
  // Whisper glues: no leading space on the continuation tokens.
  w[4].text = ".1";
  w[36].text = ".000";
  w[37].text = "%";
  const figs = figuresOf(reelOf(w), FPS);
  check("glued 4 .1 -> 4,1 (Vietnamese decimal comma)", figs.some((f) => f.big === "4,1"), figs.map((f) => f.big).join(" | "));
  check("1 năm dropped", !figs.some((f) => f.big === "1"));
  check("bare 2 dropped", !figs.some((f) => f.big === "2"));
  check("5 triệu kept", figs.some((f) => f.big === "5"), JSON.stringify(figs.map((f) => [f.big, f.fromFrame])));
  check("100.000% glued", figs.some((f) => f.big === "100.000%"));
  check("all auto", figs.every((f) => f.source === "auto"));
  const pct = figuresOf(reelOf(words("lãi suất hiện là 6 phần trăm mỗi năm")), FPS);
  check("6 phần trăm -> 6%", pct.some((f) => f.big === "6%"), pct.map((f) => f.big).join(" | "));
  // An automatic figure's label is the short phrase after it, not a transcript fragment.
  check("auto label: phrase after the unit", pct[0]?.label === "mỗi năm", JSON.stringify(pct[0]?.label));
  const cut = figuresOf(reelOf(words("thiếu chỉ có 100.000 nhưng mà các")), FPS);
  check("auto label: omitted at a clause break", cut[0]?.big === "100.000" && cut[0].label === "", JSON.stringify(cut[0]));
  const unit = figuresOf(reelOf(words("người Úc trả 5 triệu đô mỗi năm cho ngân hàng rồi")), FPS);
  check("auto label: unit plus up to 3 words", unit[0]?.label === "triệu đô mỗi năm", JSON.stringify(unit[0]?.label));

  // A stat over the number replaces the automatic figure.
  const covered = figuresOf(
    reelOf(w, { stats: [{ atMs: 1000, durMs: 3000, big: "4,1 tỷ", label: "mỗi năm" }] }),
    FPS,
  );
  check("stat covers 4.1", !covered.some((f) => f.source === "auto" && f.big === "4.1"));
  check("stat present", covered.some((f) => f.source === "stat"));

  // Banks: aliases, multi-word, a repeat inside the 2.5 s window merges, a
  // later repeat (4 s on) is its own mention.
  const b = reelOf(words("vay ở ANZ ANZ hoặc Commonwealth Bank, St George thì sao, rồi mình xem lại ANZ nữa"));
  const m = lenderMentionsOf(b);
  check("ANZ + CommBank + St.George + ANZ", m.map((x) => x.lender.name).join(",") === "ANZ,CommBank,St.George,ANZ", m.map((x) => x.lender.name).join(","));
  check("adjacent ANZ merged", m.filter((x) => x.lender.name === "ANZ").length === 2);
  check("mention >= 2.5 s", m.every((x) => x.endMs - x.startMs >= 2500));

  // Visuals: a cutaway hides the face, pip does not; too long fails, over a
  // spoken number is flagged ("4" ".1" is said at 1.2 s source, "5 triệu" at
  // 7.2 s, "100.000%" at 14 s).
  const cutaway = (atMs, durMs, mode = "cutaway") => ({ mode, atMs, durMs, asset: "library/stock-video/x.mp4" });
  const fh = (visuals) => faceHiddenOf(reelOf(w, { visuals }), FPS);
  const overNum = fh([cutaway(1000, 1000)]);
  check("cutaway over 4.1 flagged", overNum.overNumbers.some((n) => n.big === "4,1"), JSON.stringify(overNum));
  check("pip hides nothing", fh([cutaway(1000, 3000, "pip")]).totalMs === 0);
  const long = fh([cutaway(7800, CUTAWAY_MAX_MS + 500)]);
  check("long cutaway fails", long.tooLong.length === 1 && long.overNumbers.length === 0, JSON.stringify(long));
  const two = fh([cutaway(8000, 2000), cutaway(9000, 2000)]);
  // Output ms: pacing speeds the talk up, so the second starts < 1 s after the first.
  check("overlapping cutaways merge", two.longestMs === two.totalMs && two.longestMs > 2000 && two.longestMs < 4000, JSON.stringify(two));
  // A cue panel hides the face unless the design makes room; an emoji never does.
  const cueReel = reelOf(w, { cues: [
    { kind: "verdict", fromMs: 2000, toMs: 5000, ok: true, text: "Đúng" },
    { kind: "emoji", fromMs: 6000, toMs: 8000, name: "fire", position: "left" },
  ] });
  const panel = faceHiddenOf(cueReel, FPS);
  check("cue panel counted as face-hidden", panel.cueMs > 2000 && panel.totalMs === panel.cueMs && panel.tooLong.length === 0, JSON.stringify(panel));
  check("cueRoom design: panels not counted", faceHiddenOf(cueReel, FPS, { cueRoom: true }).totalMs === 0);

  // Reading-time floor: NFC length (a decomposed "ộ" counts once), the number
  // minimum, a short stat stretched into free time, a cue boxed in by the next
  // cue reported short, and a caption page flagged only past the caption cap
  // (one page, then a pause, pacing off so output time = source time).
  check("chars / charsPerSec", readingMs(["Lãi suất đã tăng"]) === (16 / READING.charsPerSec) * 1000);
  check("NFD counts as NFC", readingMs(["Lãi suất tăng".normalize("NFD")]) === readingMs(["Lãi suất tăng"]));
  check("number held >= min", readingMs(["5%"]) === READING.minNumberHoldMs && readingMs(["5%"], false) < 1000);
  const sw = words("một hai ba bốn năm sáu bảy tám chín mười mươi một mươi hai mươi ba mươi bốn mươi lăm");
  const statText = ["4,1 tỷ đô", "phí người Úc trả ngân hàng trong một năm"];
  const statReel = reelOf(sw, { stats: [{ atMs: 400, durMs: 500, big: statText[0], label: statText[1] }] });
  const floored = readingFloor(statReel, FPS);
  const need = readingMs(statText);
  check("short stat stretched to its reading time", Math.abs(floored.edit.stats[0].durMs - need) < 1 && readingFindings(statReel).short.length === 0,
    `${floored.edit.stats[0].durMs} vs ${need}`);
  check("speech timing untouched", floored.edit.stats[0].atMs === 400 && statReel.timeline.talkFrames === reelOf(sw).timeline.talkFrames);
  const verdict = (fromMs, toMs, text) => ({ kind: "verdict", fromMs, toMs, ok: true, text });
  const boxed = reelOf(sw, { cues: [
    verdict(400, 1000, "Phí thường niên cao hơn lãi suất bạn tiết kiệm được"),
    verdict(1200, 5000, "Đúng"),
  ] });
  const bf = readingFindings(boxed);
  check("boxed-in cue reported short", bf.short.length === 1 && bf.short[0].what === "cues[0] verdict" && bf.short[0].frame > 0, JSON.stringify(bf.short));
  const bfe = readingFloor(boxed, FPS).edit.cues[0];
  check("boxed-in cue grows only to the next cue", bfe.toMs > 1000 && bfe.toMs <= 1201, JSON.stringify(bfe));
  const pageAt = (cps) => {
    const page = "Lãi suất tăng rồi."; // 18 chars, one page (sentence end)
    const nextMs = Math.round((page.length / cps) * 1000);
    const ws = words(`${page} xong`).map((x, i) => (i < 4
      ? { ...x, startMs: i * 150, endMs: i * 150 + 120 }
      : { ...x, startMs: nextMs, endMs: nextMs + 300 }));
    return readingFindings(reelOf(ws, { pacing: { mode: "off" } })).slowPages;
  };
  check("caption page at 20 chars/s passes", pageAt(20).length === 0, JSON.stringify(pageAt(20)));
  const at25 = pageAt(25);
  check("caption page at 25 chars/s flagged", at25.length === 1 && at25[0].text.startsWith("Lãi suất") && at25[0].frame > 0, JSON.stringify(at25));

  const [slug, dirFlag, dirArg] = process.argv.slice(2);
  const pub = dirFlag === "--public-dir" ? dirArg : "public";
  if (slug) {
    const { recordingPath } = await import(url(join(process.cwd(), "src", "mortgage", "recording.ts")));
    const edit = JSON.parse(readFileSync(`${pub}/videos/${slug}/edit.json`, "utf8"));
    const src = JSON.parse(readFileSync(`${pub}/${recordingPath(slug, edit.source, "words.json")}`, "utf8"));
    const reel = reelOf(src, edit);
    const f = figuresOf(reel, FPS);
    console.log(`\n${slug}: ${f.length} figures (${f.filter((x) => x.source === "stat").length} stats)`);
    for (const x of f) console.log(`  ${(x.fromFrame / FPS).toFixed(1)}s ${x.source} ${x.big}  — ${x.label}`);
    const l = lenderMentionsOf(reel);
    console.log(`${slug}: ${l.length} bank mentions`);
    for (const x of l) console.log(`  ${(x.startMs / 1000).toFixed(1)}s ${x.lender.name}`);
    const design = edit.design ?? "classic";
    const { cueRoom = false } = JSON.parse(readFileSync(`src/designs/${design}/template.json`, "utf8"));
    const h = faceHiddenOf(reel, FPS, { cueRoom });
    console.log(`${slug}: face hidden ${(h.totalMs / 1000).toFixed(1)} s in total, longest ${(h.longestMs / 1000).toFixed(1)} s (limit ${CUTAWAY_MAX_MS / 1000} s per cutaway, untuned)`);
    console.log(cueRoom
      ? `${slug}: ${design} makes room under cue panels (template.json cueRoom)`
      : `${slug}: of which cue panels ${(h.cueMs / 1000).toFixed(1)} s: ${design} does not make room (template.json cueRoom), so they count as covering his face; check a still at each (report only)`);
    for (const x of h.tooLong) check(`cutaway at ${x.atMs} ms is ${(x.durMs / 1000).toFixed(1)} s, over the face limit`, false);
    for (const x of h.overNumbers) console.log(`FLAG cutaway at ${x.atMs} ms covers the spoken number ${x.big}: a figure drawn behind Daniel is hidden with him; move or shorten it`);
    const r = readingFindings(reel);
    console.log(`${slug}: reading floor ${READING.charsPerSec} chars/s, numbers >= ${READING.minNumberHoldMs} ms (untuned)`);
    for (const x of r.extended) console.log(`  HELD frame ${x.frame} ${x.what}: ${ms(x.shownMs)} -> ${ms(x.heldMs)} (needs ${ms(x.needMs)})  "${x.text}"`);
    for (const x of r.short) console.log(`  SHORT frame ${x.frame} ${x.what}: held ${ms(x.heldMs)} < ${ms(x.needMs)}; the next one starts first  "${x.text}"`);
    console.log(`${slug}: ${r.slowPages.length} of ${r.pages} caption pages faster than ${READING.captionCharsPerSec} chars/s (report only)`);
    for (const x of r.slowPages) console.log(`  NOTE frame ${x.frame}: caption faster than speech-readable: consider paging or a remove (${x.cps.toFixed(1)} chars/s, ${ms(x.shownMs)})  "${x.text}"`);
  }

  process.exit(failed ? 1 : 0);
}
