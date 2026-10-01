// Self-test for scripts/promote-design.mjs on fixture designs in a temp copy of
// the src/designs layout (no lint, no renders, no media):
//   node scripts/check-promote.mjs -> "promote ok", exit 1 on failure.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promote } from "./promote-design.mjs";
import { loadManifests } from "./select-template.mjs";

const dir = mkdtempSync(join(tmpdir(), "promote-"));
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
  "const DESIGNS: Record<string, Design> = {",
  "  good,",
  "  partial,",
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

const good = await promote("good", opts);
check("good: promoted", good.promoted, good.failures.join(" | "));
const saved = JSON.parse(readFileSync(join(dir, "good", "template.json"), "utf8"));
check("good: uses 0, lastUsed null", saved.uses === 0 && saved.lastUsed === null, JSON.stringify(saved));
check("good: promoted date written", /^\d{4}-\d{2}-\d{2}$/.test(saved.promoted ?? ""), JSON.stringify(saved));
check("partial: no promoted date", !readFileSync(join(dir, "partial", "template.json"), "utf8").includes('"promoted"'));
check("good: in the selector pool", loadManifests(dir).some((t) => t.id === "good"));

if (failed) process.exit(1);
console.log("promote ok");
