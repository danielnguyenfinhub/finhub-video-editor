// Self-test for scripts/promote-design.mjs on fixture designs in a temp copy of
// the src/designs layout (no lint, no renders, no media):
//   node scripts/check-promote.mjs -> "promote ok", exit 1 on failure.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { join } from "node:path";
import { hardCodedStrings, missingMedia, promote } from "./promote-design.mjs";
import { loadManifests } from "./select-template.mjs";
import { driftLine, parseLog, shallowBoundary } from "./report-promotion-drift.mjs";

const dir = repoTmp("promote-");
const put = (path, text) => {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), text);
};
const manifest = (id, over = {}) => ({
  id, intents: ["explain"], dataShapes: ["narrative"], grammar: {}, skinAxes: {},
  aspects: ["9:16"], languages: ["vi"], maxChars: { vi: 40, en: 0 }, minHoldMs: 1500,
  facePolicy: "face-optional", renderCost: "low", preview: join(dir, "preview.png"),
  uses: 5, lastUsed: "2026-01-01", ...over,
});

put("preview.png", "not really a png");
put("index.ts", [
  'import type { Design } from "../mortgage/design";',
  'import { good } from "./good";',
  'import { partial } from "./partial";',
  'import { oddcopy } from "./oddcopy";',
  "const DESIGNS: Record<string, Design> = {",
  "  good,",
  "  partial,",
  "  oddcopy,",
  "};",
  "",
].join("\n"));
// Unregistered, no template.json, a hex colour, an unlisted string, a banned phrase in copy.
put("bad/index.tsx", [
  "export const bad = {",
  '  id: "bad",',
  '  copy: ["lãi suất tốt nhất", "PHẦN"],',
  '  Cover: () => <div style={{ color: "#ff0000" }}>Xin chào bạn</div>,',
  "};",
  "",
].join("\n"));
// Registered, but template.json has no facePolicy and a mistyped cueRoom.
put("partial/index.tsx", 'export const partial = { id: "partial", copy: ["PHẦN"] };\n');
const { facePolicy, ...noFace } = manifest("partial", { cueRoom: "yes" });
put("partial/template.json", JSON.stringify(noFace, null, 2));
// Everything in order: promotes.
put("good/index.tsx", [
  "// A colour in a comment (#123456) is not code.",
  'const WORD = "PHẦN";',
  "const shake = (frame) => (frame > 40 && frame < 48 ? 1 : 0); // a comparison is not on-screen text",
  'type T = A<"x"> | B<"y">; // a union of generics is not on-screen text (checklist ColumnCues.tsx)',
  'type U = A<"x"> & B<"y">;',
  "export const good = {",
  '  id: "good",',
  "  copy: [WORD],",
  '  Cover: () => <div style={{ color: "#123456" }}>{WORD} 1</div>, // theme-exempt: fixture for the allowlist',
  // White/black at any alpha and theme.ts colours (any case, rgba of one) pass.
  '  Talk: () => ({ a: "#fff", b: "#000000", c: "rgba(255, 255, 255, 0.4)", d: "rgba(0,0,0,0.25)", e: "#f5a524", f: "rgba(11, 31, 61, 0.5)" }),',
  "};",
  "",
].join("\n"));
put("good/template.json", JSON.stringify(manifest("good", { cueRoom: true }), null, 2));
// Registered, valid manifest, but copy the RG 234 guard cannot read (a number): it once passed.
put("oddcopy/index.tsx", 'export const oddcopy = { id: "oddcopy", copy: ["x", 42] };\n');
put("oddcopy/template.json", JSON.stringify(manifest("oddcopy"), null, 2));

let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) {
    failed = true;
    console.log(`FAIL ${name}${detail ? `  (${detail})` : ""}`);
  }
};
const opts = { designsDir: dir, skipLint: true };

const bad = await promote("bad", opts);
const named = (re) => bad.failures.some((f) => re.test(f));
check("bad: unregistered named", named(/^registered: "bad" is not/), bad.failures.join(" | "));
check("bad: no template.json named", named(/^template\.json: .*does not exist/), bad.failures.join(" | "));
check("bad: off-brand hex named", named(/^colours: index\.tsx:4 .*#ff0000/), bad.failures.join(" | "));
check("bad: unlisted string named", named(/^copy: index\.tsx: "Xin chào bạn"/), bad.failures.join(" | "));
check("bad: RG 234 phrase named", named(/^RG 234: .*lãi suất tốt nhất/), bad.failures.join(" | "));
check("bad: not promoted", !bad.promoted);

const partial = await promote("partial", opts);
check("partial: missing field named", partial.failures.some((f) => f === 'template.json: missing field "facePolicy"'), partial.failures.join(" | "));
check("partial: mistyped cueRoom named", partial.failures.some((f) => f.startsWith('template.json: field "cueRoom"')), partial.failures.join(" | "));
check("partial: registered", !partial.failures.some((f) => f.startsWith("registered")), partial.failures.join(" | "));
check("partial: not promoted", !partial.promoted && readFileSync(join(dir, "partial", "template.json"), "utf8").includes('"uses": 5'));

// The union exemption is narrow: text that starts with | or & but sits in JSX is still on screen.
for (const [code, want] of [
  ['<span>| Vay ngay</span>', ["| Vay ngay"]],
  ['<b>& Partners</b>', ["& Partners"]],
  ['type T = A<"x"> | B<"y">;', []],
  ['type U = A<"x"> & B<"y">;', []],
]) {
  const got = hardCodedStrings(code);
  check(`scan: ${code}`, got.length === want.length && want.every((w, i) => got[i] === w), JSON.stringify(got));
}

const good = await promote("good", opts);
check("good: no copy failure from a type union", !good.failures.some((f) => f.startsWith("copy: ")), good.failures.join(" | "));
check("good: promoted", good.promoted, good.failures.join(" | "));
const saved = JSON.parse(readFileSync(join(dir, "good", "template.json"), "utf8"));
check("good: uses 0, lastUsed null", saved.uses === 0 && saved.lastUsed === null, JSON.stringify(saved));
check("good: promoted date written", /^\d{4}-\d{2}-\d{2}$/.test(saved.promoted ?? ""), JSON.stringify(saved));
check("partial: no promoted date", !readFileSync(join(dir, "partial", "template.json"), "utf8").includes('"promoted"'));
check("good: in the selector pool", loadManifests(dir).some((t) => t.id === "good"));

const odd = await promote("oddcopy", opts);
check("oddcopy: unreadable copy fails RG 234", odd.failures.some((f) => f.startsWith("RG 234: the guard could not check")), odd.failures.join(" | "));
check("oddcopy: not promoted", !odd.promoted && !readFileSync(join(dir, "oddcopy", "template.json"), "utf8").includes('"promoted"'));

// A pool check that fails (a sibling's broken template.json) writes nothing: the manifest
// once said promoted (uses 0) while the CLI printed NOT promoted.
writeFileSync(join(dir, "good", "template.json"), JSON.stringify({ ...saved, uses: 7, promoted: "2026-01-02" }, null, 2));
put("broken/template.json", "{ not json");
const again = await promote("good", opts);
check("pool failure named", again.failures.some((f) => f.startsWith("pool: ")), again.failures.join(" | "));
const kept = JSON.parse(readFileSync(join(dir, "good", "template.json"), "utf8"));
check("pool failure: manifest unchanged", !again.promoted && kept.uses === 7 && kept.promoted === "2026-01-02", JSON.stringify(kept));

// report-promotion-drift.mjs (P1, run 4): its pure parts. A shallow clone's cut-off commit looks like it
// set every line, so an anchor on it is "no history", never "unchanged".
const log = parseLog("abc1234 fix: one\n\ndef5678 feat: two words\n");
check("drift: parses sha and subject", JSON.stringify(log) === '[{"sha":"abc1234","subject":"fix: one"},{"sha":"def5678","subject":"feat: two words"}]', JSON.stringify(log));
const anchor = "a".repeat(40);
check("drift: lists the commits", /^x: changed since promotion \(aaaaaaa, 2026-09-28\), 2 commit\(s\):\n    abc1234 fix: one\n    def5678 feat: two words$/.test(driftLine({ id: "x", promoted: "2026-09-28", anchor, commits: log })));
check("drift: unchanged", driftLine({ id: "x", promoted: "d", anchor, commits: [] }) === "x: unchanged since promotion (aaaaaaa, d)");
check("drift: shallow boundary is no history", /no history \(shallow clone/.test(driftLine({ id: "x", promoted: "d", anchor, commits: [], boundary: [anchor] })));
{
  // CR3 (run 4, round 2): in a linked worktree `git rev-parse --git-path shallow` is absolute.
  const dir = repoTmp("drift-shallow-");
  writeFileSync(join(dir, "shallow"), "aaaa\nbbbb\n");
  check("drift: absolute shallow path (linked worktree)", JSON.stringify(shallowBoundary(import.meta.dirname, join(dir, "shallow"))) === '["aaaa","bbbb"]');
  check("drift: relative shallow path", JSON.stringify(shallowBoundary(dir, "shallow")) === '["aaaa","bbbb"]');
  check("drift: no shallow file", JSON.stringify(shallowBoundary(dir, "none")) === "[]");
  rmSync(dir, { recursive: true });
}
check("drift: no anchor is no history", /no history/.test(driftLine({ id: "x", promoted: "d", anchor: null, commits: [] })));
{
  // Fixture media: a talking-head fixture lacks its recording and matte (Mode A is then
  // INCOMPLETE, never rendered), a quick-mode one needs no matte, present files are not missing.
  const pub = repoTmp("promote-media-");
  const put2 = (rel, text) => {
    mkdirSync(join(pub, rel, ".."), { recursive: true });
    writeFileSync(join(pub, rel), text);
  };
  put2("videos/th/edit.json", JSON.stringify({ source: "rec" }));
  put2("videos/quick/edit.json", JSON.stringify({ source: "rec", background: "vignette" }));
  put2("videos/fl/edit.json", "{}");
  put2("videos/fl/source.mp4", "x");
  check("media: talking-head fixture lacks source and cut-out", missingMedia(pub, "th").join() === "recordings/rec/source.mp4,recordings/rec/foreground.webm", missingMedia(pub, "th").join());
  check("media: quick mode needs no cut-out", missingMedia(pub, "quick").join() === "recordings/rec/source.mp4", missingMedia(pub, "quick").join());
  check("media: a faceless fixture's own files", missingMedia(pub, "fl").join() === "videos/fl/foreground.webm", missingMedia(pub, "fl").join());
}

if (failed) process.exit(1);
console.log("promote ok");
