// Check for the numbers-kit cues (change, trend) and the page cue in src/mortgage/schema.ts.
// Run: node scripts/check-numbers-kit.mjs (exit 1 on failure). Proves the
// rateType and advertised-rate refines, swapAtMs bounds, the test edits
// parse, and that the new cue strings reach the RG 234 guard exactly as a
// kinetic cue's text does. Also the RG 234 scan itself: NFD text, odd
// whitespace and captionFixes[].to (round 2 maintain fixes C1, C2), and the
// advisory spoken-phrase scan (check-spoken-phrases.mjs) on synthetic words.
// Page cues: designs get designReelOf(reel) (no page), and YouTubeReel refuses them.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { bundleTs, repoTmp } from "./tmp-dir.mjs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = repoTmp("numbers-kit-");
bundleTs(["src/mortgage/schema.ts", "src/mortgage/compliance.ts"], { logLevel: "warning", outdir: dir });
const { editSchema, onScreenCopy, designReelOf, refusePageCues } = await import(pathToFileURL(join(dir, "schema.mjs")).href);
const { assertCompliantCopy } = await import(pathToFileURL(join(dir, "compliance.mjs")).href);

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
  if (!ok) failed++;
};
const issues = (edit) => {
  const r = editSchema.safeParse(edit);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

const change = {
  kind: "change", fromMs: 1000, toMs: 5000, label: "Lãi suất", from: "5,89%", to: "5,64%", swapAtMs: 3000,
};
const trend = {
  kind: "trend", fromMs: 6000, toMs: 9000, title: "Lãi suất", unit: "%",
  points: [{ label: "A", value: 1 }, { label: "B", value: 2 }],
};
const edit = (cues, extra = {}) => ({ title: "Test", cues, ...extra });
const advertisedRate = { rateFigure: "5,64%", comparisonRate: "5,70%", ratesAsAt: "01/01/2026" };

let e = issues(edit([change]));
check('change with "%" and no rateType fails, naming rateType', e.some((m) => m.startsWith("cues.0.rateType")), e.join(" | "));
e = issues(edit([trend]));
check('trend with unit "%" and no rateType fails, naming rateType', e.some((m) => m.startsWith("cues.0.rateType")), e.join(" | "));
e = issues(edit([{ ...change, from: "$2.400", to: "$2.250" }]));
check('change without "%" needs no rateType', e.length === 0, e.join(" | "));
e = issues(edit([{ ...change, rateType: "cash", swapAtMs: 6000 }]));
check("swapAtMs outside fromMs–toMs fails", e.some((m) => m.startsWith("cues.0.swapAtMs")), e.join(" | "));
e = issues(edit([{ ...change, rateType: "advertised" }]));
check('rateType "advertised" without compliance.advertisedRate fails', e.some((m) => m.includes("compliance.advertisedRate")), e.join(" | "));
e = issues(edit([{ ...trend, rateType: "advertised" }]));
check('trend rateType "advertised" without compliance.advertisedRate fails', e.some((m) => m.includes("compliance.advertisedRate")), e.join(" | "));
e = issues(edit([{ ...change, rateType: "advertised" }], { compliance: { advertisedRate } }));
check("the same edit with compliance.advertisedRate passes", e.length === 0, e.join(" | "));

// The `page` cue: a library image and its pixel size; no on-screen copy of its own.
const page = { kind: "page", fromMs: 1000, toMs: 9000, asset: "library/pages/sample-page.png", width: 1265, height: 10022 };
e = issues(edit([page]));
check("page cue with a library image and its size passes", e.length === 0 && onScreenCopy(editSchema.parse(edit([page])))["cues[0]"].length === 0, e.join(" | "));
for (const [why, bad, at] of [
  ["an asset outside public/library/", { ...page, asset: "../lender/page.png" }, "cues.0.asset"],
  ["no height", { ...page, height: undefined }, "cues.0.height"],
  ["toMs before fromMs", { ...page, toMs: 500 }, "cues.0"],
  ["an unknown field", { ...page, src: "x.png" }, "cues.0"],
]) {
  e = issues(edit([bad]));
  check(`page cue with ${why} fails at ${at}`, e.some((m) => m.startsWith(at)), e.join(" | "));
}
// Designs never see a page cue (MortgageReel draws it in Visuals), and YouTubeReel refuses one.
{
  const parsed = editSchema.parse(edit([page, { ...change, rateType: "cash" }]));
  const kinds = designReelOf({ edit: parsed, timeline: {} }).edit.cues.map((c) => c.kind);
  check("designReelOf drops the page cue and keeps the rest", kinds.join() === "change", kinds.join());
  const src = readFileSync("src/mortgage/MortgageReel.tsx", "utf8");
  const props = [...src.matchAll(/<design\.\w+\s+reel=\{(\w+)\}/g)].map((m) => m[1]);
  check("MortgageReel hands every design designReelOf(reel)",
    /designReel = designReelOf\(reel\)/.test(src) && props.length >= 3 && props.every((p) => p === "designReel"), props.join());
  let msg = "";
  try { refusePageCues(parsed, "x"); } catch (err) { msg = err.message; }
  check("refusePageCues names the page cue", msg.includes('cues[0] is a "page" cue'), msg || "not refused");
  check("refusePageCues passes an edit without one", refusePageCues(editSchema.parse(edit([{ ...trend, rateType: "cash" }])), "x") !== undefined);
  check("YouTubeReel refuses page cues", /refusePageCues\(\s*parseEdit\(/.test(readFileSync("src/youtube/YouTubeReel.tsx", "utf8")));
}

for (const slug of ["_test-numbers-kit", "_test-numbers-kit-faceless"]) {
  e = issues(JSON.parse(readFileSync(`public/videos/${slug}/edit.json`, "utf8")));
  check(`public/videos/${slug}/edit.json is valid`, e.length === 0, e.join(" | "));
}

// RG 234: a banned phrase in a change label is flagged like the same phrase in a kinetic cue.
const banned = "lãi suất tốt nhất"; // PROMOTIONAL_VI in src/mortgage/compliance.ts
const guard = (cue) => {
  const parsed = editSchema.parse(edit([cue]));
  try {
    assertCompliantCopy(onScreenCopy(parsed), []);
    return "not flagged";
  } catch (err) {
    return err.message.split("\n")[1].trim();
  }
};
const viaChange = guard({ ...change, rateType: "cash", label: `Đây là ${banned}` });
const viaKinetic = guard({
  kind: "kinetic", fromMs: 1000, toMs: 5000,
  struck: [{ text: `Đây là ${banned}`, atMs: 1000, strikeMs: 2000 }], slam: { text: "OK", atMs: 3000 },
});
check("a banned phrase in change.label is flagged", viaChange.includes(`"${banned}"`), viaChange);
check("… the same way as in a kinetic cue", viaChange === viaKinetic, `change: ${viaChange}\n      kinetic: ${viaKinetic}`);
const viaTrend = guard({ ...trend, rateType: "cash", points: [{ label: banned, value: 1 }, { label: "B", value: 2 }] });
check("a banned phrase in a trend point label is flagged", viaTrend.includes(`"${banned}"`), viaTrend);

// RG 234 scan sees a phrase however it is encoded or spaced (compliance.ts fold).
const flagged = (fields) => { try { assertCompliantCopy(fields, []); return ""; } catch (err) { return err.message.split("\n")[1].trim(); } };
for (const [name, body, term] of [
  ["NFD Vietnamese", "Dịch vụ miễn phí".normalize("NFD"), "dịch vụ miễn phí"],
  ["two spaces", "no  obligation", "no obligation"],
  ["a newline", "financial\nadvice", "financial advice"],
  ["a non-breaking space", "You will\u00A0qualify", "will qualify"],
  ["a narrow no-break space in Vietnamese", "lãi suất\u202Ftốt nhất", "lãi suất tốt nhất"],
  ["a zero-width space inside a word", "Dịch vụ miễn ph\u200Bí", "dịch vụ miễn phí"],
  ["a soft hyphen inside a word", "guaran\u00ADteed approval", "guaranteed approval"],
]) {
  const got = flagged({ body });
  check(`a banned phrase with ${name} is flagged`, got.includes(`"${term}" — promotional`), got || "not flagged");
}
check("an exemption still clears the folded phrase", (() => {
  try {
    const a = assertCompliantCopy({ body: "LMI is not\u00A0free" }, [{ field: "body", term: "free", reason: "negation", note: "says it is not free" }]);
    return a.cleared.length === 1 && a.unused.length === 0;
  } catch { return false; }
})());
check("clean copy with odd whitespace stays clean", flagged({ body: "Lãi suất\u00A0cạnh tranh,\n  tuỳ hồ sơ".normalize("NFD") }) === "");
const fixed = flagged(onScreenCopy(editSchema.parse(edit([], { captionFixes: [{ from: "vay", to: "guaranteed approval" }] }))));
check("a banned phrase in captionFixes[].to is flagged under captionFixes", fixed.startsWith('captionFixes: "guaranteed approval"'), fixed || "not flagged");

// The end card's policy date (faceless videos built from a policy document).
const { policyAsAtLine } = await import(pathToFileURL(join(dir, "compliance.mjs")).href);
const line = policyAsAtLine("2026-08-01");
check("policy date line carries the date in both languages", line.split("01/08/2026").length === 3, line);
check("the policy date line passes the RG 234 guard", (() => { try { assertCompliantCopy([line], []); return true; } catch { return false; } })(), line);
check("compliance.policyAsAt accepts YYYY-MM-DD", issues(edit([], { compliance: { policyAsAt: "2026-08-01" } })).length === 0);
check("compliance.policyAsAt rejects DD/MM/YYYY", issues(edit([], { compliance: { policyAsAt: "01/08/2026" } })).some((i) => i.includes("policyAsAt")));

// Spoken watch phrases (scripts/check-spoken-phrases.mjs, advisory): words.json is one
// syllable per entry, so the words are joined and folded before the lists are matched.
{
  const { spokenHits } = await import("./check-spoken-phrases.mjs");
  const said = [" Bên", " em", " tư", " vấn", " miễn".normalize("NFD"), "\u200B phí", " cho", " bạn,", " rất", "\u00A0đơn", " giản."];
  const words = said.map((text, i) => ({ text, startMs: 1000 + i * 300, endMs: 1250 + i * 300 }));
  const hits = spokenHits(words);
  const promo = hits.find((h) => h.term === "tư vấn miễn phí");
  check("spoken: a promotional phrase split over syllables (NFD, zero-width) is found", promo?.tier === "promotional" && promo.startMs === 1600, JSON.stringify(hits));
  check("spoken: a context phrase after an NBSP is found at its own time", hits.some((h) => h.term === "đơn giản" && h.startMs === 3700), JSON.stringify(hits));
  check("spoken: clean speech has no hits", spokenHits([" Lãi", " suất", " cạnh", " tranh."].map((text, i) => ({ text, startMs: i * 300 }))).length === 0);
  const pub = repoTmp("spoken-");
  mkdirSync(join(pub, "videos", "_test-spoken"), { recursive: true });
  writeFileSync(join(pub, "videos", "_test-spoken", "words.json"), JSON.stringify(words));
  const r = spawnSync(process.execPath, ["--no-warnings", "scripts/check-spoken-phrases.mjs", "_test-spoken", "--public-dir", pub], { encoding: "utf8" });
  check("spoken: the CLI prints the hits with times and exits 0 (never a gate)", r.status === 0 && /0:01\.6 {2}\[promotional\] "tư vấn miễn phí"/.test(r.stdout), `exit ${r.status}: ${r.stdout}${r.stderr}`);
  rmSync(pub, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall numbers-kit checks passed");
process.exit(failed ? 1 : 0);
