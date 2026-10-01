// Text legibility check for designs: every style object that sets both a text
// colour and a background (`color:` with `background:` or `backgroundColor:`
// in the same `{ ... }`) must reach WCAG contrast 3.0 (AA for large text; video
// text is large) and is noted under 4.5. Colours are hex/rgb literals or
// src/brand/theme.ts tokens (`brand.text`); anything else (a variable, a
// translucent rgba under 0.6, hsl) is skipped, not guessed. promote-design.mjs
// runs this as its "contrast" check; the idea is OpenMontage's playbook
// validator (styles/playbook_loader.py), which checks a palette's pairs.
//
//   node scripts/check-contrast.mjs [design-id ...]   every design by default; --brand prints the token matrix
//
// A line with `// contrast-exempt: <why>` inside the object is skipped.
//
// Chart fills: a `background:` with see-through `${colour}NN` stops and no
// literal colour (a bar's hatch) has no text pair, so it is checked on its own:
// its weakest stop, laid over white and over brand.background, must reach MIN_RATIO against
// the better of the two. A local variable (`${ink}`) stands for every colour
// constant in its file, worst one counts; with none it is a note, not skipped.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");
export const MIN_RATIO = 3.0;
export const GOOD_RATIO = 4.5;

export const COLOUR = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1,5})?\b|\b(?:rgba?|hsla?)\([^)]*\)/g;
// A colour literal as lower-case 6-digit hex of its rgb part (alpha ignored), or null (hsl).
export const hexOf = (lit) => {
  const h = lit.match(/^#([0-9a-f]+)$/i)?.[1];
  if (h) return `#${(h.length <= 4 ? [...h.slice(0, 3)].map((c) => c + c).join("") : h.slice(0, 6)).toLowerCase()}`;
  const rgb = lit.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return rgb ? `#${rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : null;
};
// Alpha of a literal (1 when it has none); a see-through colour can't be judged.
const alphaOf = (lit) => {
  const h = lit.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i)?.[1];
  if (h) return parseInt(h.length === 4 ? h[3] + h[3] : h.slice(6), 16) / 255;
  const a = lit.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)/i)?.[1];
  return a === undefined ? 1 : Number(a);
};

// WCAG 2 relative luminance and contrast ratio.
const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
};

// src/brand/theme.ts: token name -> hex (rgba tokens keep their rgb).
export const brandTokens = (file = join(root, "src", "brand", "theme.ts")) =>
  Object.fromEntries(
    [...readFileSync(file, "utf8").matchAll(/^\s*(\w+):\s*"([^"]+)"/gm)]
      .map(([, k, v]) => [k, hexOf(v)])
      .filter(([, v]) => v),
  );

// One property value -> hex, or null when it can't be known from the text.
export const resolveColour = (value, tokens) => {
  const v = value.trim().replace(/^[`'"]|[`'",]$/g, "");
  const lit = v.match(COLOUR)?.[0];
  if (lit && v.startsWith(lit) && !/gradient/i.test(v)) return alphaOf(lit) < 0.6 ? null : hexOf(lit);
  const tok = v.match(/^\$?\{?brand\.(\w+)\}?$/)?.[1] ?? v.match(/^brand\.(\w+)$/)?.[1] ?? v.match(/^\$?\{?([A-Z][A-Z0-9_]*)\}?$/)?.[1];
  if (tok) return tokens[tok] ?? null;
  // A gradient or a template string: its first known colour stands for it.
  const first = v.match(/brand\.(\w+)/)?.[1];
  // A translucent first colour (faint ruled lines) is not the surface: use the first solid one, else skip.
  const solid = (v.match(COLOUR) ?? []).find((l) => alphaOf(l) >= 0.6);
  if (/gradient/i.test(v)) return first ? (tokens[first] ?? null) : solid ? hexOf(solid) : null;
  return null;
};

// Every `{ ... }` in the code with, at its own depth, a `color:` and a
// background property: [{ line, color, background }] with the raw values.
export const pairsIn = (code) => {
  const pairs = [];
  for (let i = 0; i < code.length; i++) {
    if (code[i] !== "{") continue;
    let depth = 0;
    let end = -1;
    for (let j = i; j < code.length; j++) {
      if (code[j] === "{") depth++;
      else if (code[j] === "}" && --depth === 0) {
        end = j;
        break;
      }
    }
    if (end < 0) break;
    // The object's lines, so an exemption comment after the closing brace counts.
    const lines = code.slice(code.lastIndexOf("\n", i) + 1, (code.indexOf("\n", end) + 1 || code.length + 1) - 1);
    if (/contrast-exempt:/.test(lines)) continue;
    // Blank out nested objects so only this object's own properties are read;
    // `${...}` in a template string is not an object, its content stays.
    const body = code.slice(i + 1, end).replace(/\$\{([^{}]*)\}/g, "$1");
    let own = "";
    let d = 0;
    for (const ch of body) {
      if (ch === "{") d++;
      own += d > 0 ? " " : ch;
      if (ch === "}") d--;
    }
    const color = propertyValue(own, "color");
    const background = propertyValue(own, "backgroundColor") ?? propertyValue(own, "background");
    if (color && background) pairs.push({ line: code.slice(0, i).split("\n").length, color, background });
  }
  return pairs;
};

// The value of `name:` at this depth, up to the comma that ends it (commas
// inside parentheses, as in rgba(...) and gradients, belong to the value).
export const propertyValue = (own, name) => {
  const m = own.match(new RegExp(`(?:^|[,\\s])${name}\\s*:\\s*`));
  if (!m) return undefined;
  let depth = 0;
  let out = "";
  for (const ch of own.slice(m.index + m[0].length)) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if ((ch === "," && depth === 0) || ch === "\n") break;
    out += ch;
  }
  return out.trim() || undefined;
};

// `const INK = "#111"` and `const WHITE = brand.card` at file level count as tokens.
export const fileTokens = (code, tokens) =>
  Object.fromEntries(
    [...code.matchAll(/^(?:export )?const (\w+)\s*=\s*([^;\n]+);?$/gm)]
      .map(([, k, v]) => [k, resolveColour(v, tokens)])
      .filter(([, v]) => v),
  );

// `hex` at `alpha` laid over `bg` (both 6-digit hex).
export const over = (hex, alpha, bg) =>
  `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;

// See-through chart fills (header): [{ line, fill, ratio, level }].
// ponytail: line-based and backdrop-blind (white or brand.background); give a
// design's own backdrop if a dark-card chart fill gets misjudged.
export const fillProblems = (code, tokens) => {
  const local = fileTokens(code, tokens);
  const all = { ...tokens, ...local };
  const backs = ["#ffffff", tokens.background ?? "#0b1f3d"];
  return code.split("\n").flatMap((text, i) => {
    if (/contrast-exempt:/.test(text)) return [];
    const fill = propertyValue(text, "backgroundColor") ?? propertyValue(text, "background");
    if (!fill) return [];
    // `${name}` stops (bare = opaque); only a fill with a `${name}NN` stop and no literal colour.
    const stops = [...fill.matchAll(/\$\{(?:brand\.)?(\w+)\}([0-9a-fA-F]{2}\b)?/g)];
    if (!stops.some(([, , a]) => a) || (fill.replace(/\$\{[^}]*\}/g, "").match(COLOUR) ?? []).length) return [];
    const alpha = Math.min(...stops.map(([, , a]) => (a ? parseInt(a, 16) / 255 : 1)));
    const name = stops[0][1];
    const colours = all[name] ? [all[name]] : Object.values(local);
    if (!colours.length) return [{ line: i + 1, fill, ratio: null, level: "note" }];
    const ratio = Math.min(...colours.map((c) => Math.max(...backs.map((b) => contrast(over(c, alpha, b), b)))));
    return ratio < MIN_RATIO ? [{ line: i + 1, fill, ratio, level: "fail" }] : [];
  });
};

// Problems in one file's code: [{ line, color, background, ratio, level }].
export const contrastProblems = (code, tokens) => {
  const all = { ...tokens, ...fileTokens(code, tokens) };
  return pairsIn(code)
    .map((p) => {
      const c = resolveColour(p.color, all);
      const b = resolveColour(p.background, all);
      if (!c || !b) return null;
      const ratio = contrast(c, b);
      const level = ratio < MIN_RATIO ? "fail" : ratio < GOOD_RATIO ? "note" : null;
      return level ? { ...p, hex: [c, b], ratio, level } : null;
    })
    .filter(Boolean);
};

const designFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .map((f) => ({ name: f, code: readFileSync(join(dir, f), "utf8") }));

// Every problem across a design folder, with file names.
export const checkDesign = (dir, tokens = brandTokens()) =>
  designFiles(dir).flatMap((f) =>
    [...contrastProblems(f.code, tokens), ...fillProblems(f.code, tokens)].map((p) => ({ ...p, file: f.name })),
  );

export const describe = (p) =>
  p.fill
    ? `${p.file}:${p.line} see-through fill ${p.fill.trim()} ${p.ratio === null ? "not judged (no colour known)" : `= ${p.ratio} on its backdrop (needs ${MIN_RATIO})`}`
    : `${p.file}:${p.line} ${p.color.trim()} on ${p.background.trim()} = ${p.ratio} (${p.hex.join(" on ")}; ${p.level === "fail" ? `needs ${MIN_RATIO}` : `under ${GOOD_RATIO}, fine for large text`})`;

const selftest = () => {
  const tokens = { text: "#ffffff", background: "#0b1f3d", accent: "#f5a524", card: "#ffffff" };
  const code = `const INK = "#111111";
const a = { color: brand.text, background: brand.background };
const b = { color: "#fff", backgroundColor: "rgba(255, 255, 255, 0.9)" };
const c = { style: { color: INK, background: \`linear-gradient(180deg, \${brand.card} 0%, #000 100%)\` } };
const d = { color: brand.text, background: "rgba(0, 0, 0, 0.3)" };
const e = { color: brand.accent, background: brand.card }; // contrast-exempt: decorative
const f = { color: brand.accent, background: brand.card };
const g = { color: INK, background: \`repeating-linear-gradient(180deg, transparent 0 62px, rgba(0, 100, 168, 0.08) 62px 64px), #fff\` }; // faint lines are not the surface: skipped
`;
  const got = contrastProblems(code, tokens);
  const want = [
    { line: 3, ratio: 1, level: "fail" }, // white on a solid-enough white
    { line: 7, ratio: 2.04, level: "fail" }, // amber on white; line 6 is exempt
  ]; // line 4: INK on the gradient's first colour (card) passes; line 5: translucent, skipped
  const ok = got.length === want.length && want.every((w, i) => got[i].line === w.line && got[i].ratio === w.ratio && got[i].level === w.level);
  const pairs = pairsIn(code).length; // a, b, c (inner), d, f, g; e is exempt
  if (!ok || pairs !== 6) {
    console.error(`contrast selftest failed: ${pairs} pairs, ${JSON.stringify(got)}`);
    process.exit(1);
  }
  const fills = fillProblems(`const BAD = "#c8322b";
const p = { background: \`repeating-linear-gradient(135deg, \${ink}33 0 10px, \${ink}66 10px 14px)\` };
const q = { background: \`repeating-linear-gradient(135deg, \${ink}CC 0 10px, \${ink} 10px 14px)\` };
const r = { background: \`\${BAD}CC\` };
`, tokens);
  // line 2: the old explainer bar (BAD at 20%) fails; 3 (weakest 80%) and 4 pass.
  if (fills.length !== 1 || fills[0].line !== 2 || fills[0].level !== "fail" || fillProblems("const s = { background: `${x}33` };", tokens)[0]?.level !== "note") {
    console.error(`contrast selftest: chart fills ${JSON.stringify(fills)}`);
    process.exit(1);
  }
  if (contrast("#ffffff", "#000000") !== 21 || contrast("#0064a8", "#ffffff") !== 6.2) {
    console.error("contrast selftest: ratio maths");
    process.exit(1);
  }
  console.log("contrast selftest ok");
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) selftest();
  const tokens = brandTokens();
  if (args.includes("--brand")) {
    const backs = ["background", "navy", "panel", "card"];
    console.log(`brand tokens on ${backs.join(", ")} (WCAG ratio; ≥ ${MIN_RATIO} large text, ≥ ${GOOD_RATIO} body):`);
    for (const [k, v] of Object.entries(tokens)) {
      if (backs.includes(k)) continue;
      console.log(`  ${k.padEnd(11)} ${backs.map((b) => `${b} ${String(contrast(v, tokens[b])).padStart(5)}`).join("   ")}`);
    }
  }
  const designsDir = join(root, "src", "designs");
  const ids = args.filter((a) => !a.startsWith("--"));
  const all = ids.length ? ids : readdirSync(designsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let fails = 0;
  for (const id of all) {
    const problems = checkDesign(join(designsDir, id), tokens);
    for (const p of problems) {
      if (p.level === "fail") fails++;
      console.log(`${p.level === "fail" ? "FAIL" : "note"} ${id}/${describe(p)}`);
    }
  }
  if (fails) {
    console.error(`contrast: ${fails} pair(s) under ${MIN_RATIO}`);
    process.exit(1);
  }
  console.log(`contrast ok (${all.length} design(s))`);
}
