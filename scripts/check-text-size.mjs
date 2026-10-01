// Ratchet on small text: counts the fontSize literals under MIN_TEXT_PX in each design and fails
// when a design has MORE than config/text-size-baseline.json records (a new or longer list of small
// text). Existing small text is not failed: it is the baseline, to be reduced by design work
// (corrections 25/09 "text too small"). Fewer than the baseline is fine; run with --update-baseline
// to lower it. Limit: sizes computed at run time (fitText, scales) are invisible to a grep.
//   node scripts/check-text-size.mjs [design-id ...]       report; whole-repo run enforces the ratchet
//   node scripts/check-text-size.mjs [design-id ...] --update-baseline   rewrite the baseline (named designs: only theirs)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Minimum on-screen text size in px at 1080x1920 (decided 2026-10-01 in Daniel's absence; he can change it):
// the frame is shown at about 390 pt wide on a phone, so 30 px is about 11 pt, the smallest size
// platforms treat as readable. DERIVED from that assumed width, not measured on a phone.
export const MIN_TEXT_PX = 30;
const baselinePath = join(import.meta.dirname, "..", "config", "text-size-baseline.json");

const designsDir = join(import.meta.dirname, "..", "src", "designs");

// The value after `fontSize:` / `fontSize=`, which may run over several lines: up to the first
// `,` `;` `)` `]` `}` outside brackets (a JSX `{...}` or a "..." value is taken whole).
const valueAt = (code, from) => {
  const at = code.slice(from).match(/^\s*/)[0].length + from;
  if (code[at] === '"') return code.slice(at, code.indexOf('"', at + 1) + 1);
  let depth = 0;
  for (let k = at; k < code.length && k < at + 300; k++) {
    const c = code[k];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c) && depth-- === 0) return code.slice(at, k);
    else if (",;".includes(c) && depth === 0) return code.slice(at, k);
    if (depth === 0 && code[at] === "{" && k > at) return code.slice(at, k + 1);
  }
  return code.slice(at, at + 300);
};

// A value split at its top-level `?`, `:`, `??` and `||` (outside brackets and strings): [[text, offset]].
const alternatives = (value) => {
  const parts = [];
  let depth = 0, quote = null, from = 0;
  for (let k = 0; k < value.length; k++) {
    const c = value[k];
    if (quote) quote = c === quote ? null : quote;
    else if ("\"'`".includes(c)) quote = c;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (depth === 0 && (c === ":" || (c === "?" && value[k + 1] !== ".") || (c === "|" && value[k + 1] === "|"))) {
      parts.push([value.slice(from, k), from]);
      if (value[k + 1] === c) k++; // ?? and ||
      from = k + 1;
    }
  }
  return [...parts, [value.slice(from), from]];
};

// Small fontSize literals in one file's code: `fontSize: 26`, `fontSize={26}`, `fontSize="26"`, each
// branch of `fontSize: big ? 40 : 20` (also `??`, `||`) and a value on the next line: [{ line, px }].
export const smallTextIn = (source, min = MIN_TEXT_PX) => {
  const code = source
    .replace(/^[ \t]*\/\/.*$/gm, (line) => " ".repeat(line.length)) // comment lines, offsets kept
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " ")); // block comments, lines kept
  // A branch's leading number; a parenthesised branch is split again; `12 * scale` is computed, not a size.
  const sizes = (part, at) => {
    const t = part.trim();
    let d = 0; // one group: the "(" closes at the last character, not "(a) * (b)"
    const group = t.startsWith("(") && [...t].findIndex((c) => (d += c === "(" ? 1 : c === ")" ? -1 : 0) === 0) === t.length - 1;
    if (group) return alternatives(t.slice(1, -1)).flatMap(([p, a]) => sizes(p, at + part.indexOf("(") + 1 + a));
    const n = part.match(/^\s*["'`]?(\d+(?:\.\d+)?)(?![\d.]|\s*\*)/);
    if (!n || Number(n[1]) >= min || Number(n[1]) === 0) return []; // 0: no text shown
    return [{ line: code.slice(0, at + n[0].length).split("\n").length, px: Number(n[1]) }];
  };
  return [...code.matchAll(/fontSize\s*(?::|=(?!=))/g)].flatMap((m) => {
    const value = valueAt(code, m.index + m[0].length);
    const start = m.index + m[0].length + code.slice(m.index + m[0].length).indexOf(value);
    return alternatives(value.replace(/^\{([\s\S]*)\}$/, " $1 ")).flatMap(([part, at]) => sizes(part, start + at));
  });
};

// smallTextIn over every .ts/.tsx/.js/.jsx file under dir: [{ file, line, px }].
export const smallText = (dir, min = MIN_TEXT_PX) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .flatMap((file) => smallTextIn(readFileSync(join(dir, file), "utf8"), min).map((h) => ({ file, ...h })));

// The scanner on known code, so a broken pattern cannot pass as "0 literals". [] when it works.
export const scannerProblems = () => {
  const code = [
    "const a = { fontSize: 26, color: x };", // 1: 26
    'const b = <text fontSize={22} fill="#fff" />;', // 2: 22
    'const c = <tspan fontSize="18">x</tspan>;', // 3: 18
    "const d = { fontSize: big ? 40 : 20 };", // 4: 20 (40 is fine)
    "const e = {", // 5
    "  fontSize:", // 6
    "    24,", // 7: 24
    "  width: 10,", // 8: not a font size
    "  // fontSize: 12,", // 9: a comment
    "  fontSize: 30,", // 10: at the floor, fine
    "  fontSize: wide", // 11
    "    ? 28", // 12: 28
    "    : 48,", // 13
    "};",
    "if (fontSize === 12) {}", // 15: a comparison
    "const f = { fontSize: size ?? 16 };", // 16: 16
    "const g = { fontSize: on ? fit({ text, maxLines: 1 }).fontSize : 0 };", // 17: computed, and 0 is no text
    "const h = { fontSize: 12 * scale }; const k = { fontSize: wide ? 40 : 12.5 * s };", // 18: computed sizes
    "/* fontSize: tiny ? 12 : 14", // 19: a block comment
    "   fontSize: 20 */ const i = { fontSize: a ? 40 : (b ? 22 : 36) };", // 20: 22, in parentheses
    "const j = { fontSize: (a ? 110 : 150) * (b ? 0.6 : 1) };", // 21: computed
  ].join("\n");
  const got = smallTextIn(code).map((h) => `${h.line}:${h.px}`).join(" ");
  const want = "1:26 2:22 3:18 4:20 7:24 12:28 16:16 20:22";
  return got === want ? [] : [`scanner self-check: found "${got}", expected "${want}"`];
};

/** Designs whose count of small literals grew past the baseline (a missing design has baseline 0). */
export const ratchetProblems = (counts, baseline) =>
  Object.entries(counts)
    .filter(([id, n]) => n > (baseline[id] ?? 0))
    .map(([id, n]) => `${id}: ${n} fontSize literal(s) under ${MIN_TEXT_PX}px, baseline ${baseline[id] ?? 0}`);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const ids = args.filter((a) => !a.startsWith("--"));
  const all = ids.length ? ids : readdirSync(designsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  // The scanner and the ratchet's own logic first, so a broken check cannot pass vacuously.
  const broken = scannerProblems();
  const t = ratchetProblems({ a: 2, b: 0, c: 1 }, { a: 2, b: 5 });
  if (t.length !== 1 || !t[0].startsWith("c: 1")) broken.push(`ratchet self-check failed: ${JSON.stringify(t)}`);
  if (broken.length) {
    console.error(`text size: ${broken.join("; ")}`);
    process.exit(1);
  }
  const counts = {};
  let total = 0;
  for (const id of all) {
    const hits = smallText(join(designsDir, id));
    counts[id] = hits.length;
    total += hits.length;
    if (hits.length && (ids.length || args.includes("--list"))) console.log(`${id}: ${hits.length} under ${MIN_TEXT_PX}px  ${hits.map((h) => `${h.file}:${h.line}=${h.px}`).join(" ")}`);
  }
  if (args.includes("--update-baseline")) {
    // Named designs: only theirs change; the rest of the baseline stays.
    const kept = ids.length ? JSON.parse(readFileSync(baselinePath, "utf8")) : {};
    const next = Object.fromEntries(Object.entries({ ...kept, ...counts }).filter(([, n]) => n > 0).sort());
    writeFileSync(baselinePath, JSON.stringify(next, null, 2) + "\n");
    console.log(`text size: baseline written for ${ids.length ? ids.join(", ") : "every design"} (${Object.values(next).reduce((a, b) => a + b, 0)} literal(s) under ${MIN_TEXT_PX}px in the baseline)`);
  } else if (!ids.length) {
    if (!total) {
      console.error("text size: 0 small literals in every design is not believable; the scanner is not reading the designs.");
      process.exit(1);
    }
    const problems = ratchetProblems(counts, JSON.parse(readFileSync(baselinePath, "utf8")));
    if (problems.length) {
      console.error(`text size: more small text than the baseline allows (raise the text, or if intended run --update-baseline):\n${problems.map((p) => `  ${p}`).join("\n")}`);
      process.exit(1);
    }
    console.log(`text size ok: ${total} literal(s) under ${MIN_TEXT_PX}px, none beyond the baseline (${all.length} design(s))`);
  } else console.log(`text size: ${total} literal(s) under ${MIN_TEXT_PX}px in ${all.length} design(s)`);
}
