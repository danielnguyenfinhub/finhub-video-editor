// RG 234 scan of every piece of text written into src/elements/ (the
// ElementCatalog's sample copy and any text an element prints on its own, such
// as a DRAFT line). Reel copy is scanned at render through onScreenCopy; this
// covers what no reel carries. Run: node scripts/check-element-copy.mjs (exit 1
// on a hit). A planted banned phrase proves the guard still fires.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = join(import.meta.dirname, "..");
const dir = mkdtempSync(join(tmpdir(), "element-copy-"));
execFileSync(process.execPath, [
  join(root, "node_modules/esbuild/bin/esbuild"), join(root, "src/mortgage/compliance.ts"),
  "--bundle", "--format=esm", "--platform=node", "--out-extension:.js=.mjs", "--log-level=warning",
  `--outdir=${dir}`,
]);
const { assertCompliantCopy } = await import(pathToFileURL(join(dir, "compliance.mjs")).href);

const files = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
  });

// Every string literal, template text and JSX text in a file. Imports and CSS
// values ride along; the guard only matches promotional phrases, so they pass.
const textsOf = (file) => {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
    else if (ts.isTemplateExpression(node)) out.push(node.head.text, ...node.templateSpans.map((s) => s.literal.text));
    else if (ts.isJsxText(node) && node.text.trim()) out.push(node.text.trim());
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out.map((s) => s.normalize("NFC")).filter((s) => /\p{L}{2}/u.test(s));
};

let failed = 0;
const blockedOf = (fields) => {
  try {
    assertCompliantCopy(fields);
    return null;
  } catch (err) {
    return err.message.split("\n")[1]?.trim() ?? err.message;
  }
};

const elements = join(root, "src", "elements");
let scanned = 0;
for (const file of files(elements)) {
  const texts = textsOf(file);
  scanned += texts.length;
  const hit = blockedOf({ [relative(root, file)]: texts });
  if (hit) {
    failed++;
    console.log(`FAIL  ${relative(root, file)}: ${hit}`);
  }
}

// Control: the same path must block a known promotional phrase.
const control = blockedOf({ control: ["Book your free consultation today"] });
if (!control) {
  failed++;
  console.log("FAIL  control: a banned phrase was not blocked, so the guard isn't running");
}

if (failed) process.exit(1);
console.log(`element copy ok (${scanned} strings in src/elements, control blocked)`);
