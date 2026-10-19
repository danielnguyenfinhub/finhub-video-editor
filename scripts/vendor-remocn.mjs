// Adds each remocn component's `length` and first `avoidWhen` line to
// .claude/elements/remocn/CATALOG.md, from the docs frontmatter of remocn
// (https://remocn.dev, MIT; content/docs/**/*.mdx, schema lib/docs-schema.ts).
// length = own-motion frames at 30 fps (the Sequence floor, not the beat) or
// "state-driven"/"sustained". Joins on the entry's first path: components/remocn/<name>.tsx or templates/<name>/.
// Fails (exit 1, list) when an avoidWhen substitute is not a catalog entry.
// Idempotent. Reads a sibling checkout, so the real run is a manual step; --selftest is in npm test.
//
// Usage: node scripts/vendor-remocn.mjs [--check|--selftest] [path-to-remocn]
// Default source is ../remocn-remotion-resoure. --check: exit 1 if stale, write nothing.
// --selftest: offline, inline fixtures (CRLF frontmatter and catalog); in npm test.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const root = resolve(import.meta.dirname, "..");
const src = resolve(args.find((a) => !a.startsWith("--")) ?? join(root, "..", "remocn-remotion-resoure"));
const catalogPath = join(root, ".claude/elements/remocn/CATALOG.md");

const unquote = (s) => {
  s = s.trim();
  try { return s.startsWith('"') ? JSON.parse(s) : s; } catch { return s.slice(1, -1); }
};

// [component, { length, avoid }] from an mdx file's frontmatter (flat YAML: scalars and "- " lists); null when none.
const pageOf = (text) => {
  const fm = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/)?.[1];
  const name = fm?.match(/^component:\s*(\S+)/m)?.[1];
  if (!name) return null;
  const avoid = fm.match(/^avoidWhen:\s*\n\s+-\s+(.+)$/m)?.[1];
  return [name, { length: unquote(fm.match(/^length:\s*(.+)$/m)?.[1] ?? ""), avoid: avoid && unquote(avoid) }];
};

// A Windows checkout may have CRLF files: read with LF, write the catalog back with the line endings it had.
const rewrite = (raw, pages) => {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const before = raw.replace(/\r\n/g, "\n");
  const entry = /^- \*\*.+?\*\* \(`components\/remocn\/(?:templates\/([\w-]+)\/|([\w-]+)\.tsx`)/;
  const known = new Set([...before.matchAll(/(?:components\/remocn|lib\/remocn[\w-]*)\/(?:templates\/([\w-]+)\/|([\w-]+)\.tsx?\b)/g)].map((m) => m[1] ?? m[2]));
  const bad = [];
  let joined = 0;
  const after = before.split("\n").map((line) => {
    const m = line.match(entry);
    const name = m && (m[1] ?? m[2]);
    const page = name && pages.get(name);
    if (!page) return line;
    joined++;
    // Same token rule as remocn's lib/docs-meta.test.ts, plus single-word component names.
    for (const [, t] of (page.avoid ?? "").matchAll(/`([a-z][a-z0-9-]*)`/g)) {
      if ((t.includes("-") || pages.has(t)) && !known.has(t) && !page.avoid.includes("not shipped")) bad.push(`${name}: \`${t}\``);
    }
    const base = line.replace(/ · len \S+( · avoid: .*)?$/, "");
    return `${base}${page.length ? ` · len ${page.length}` : ""}${page.avoid ? ` · avoid: ${page.avoid}` : ""}`;
  }).join("\n");
  return { bad, joined, same: after === before, out: after.replace(/\n/g, eol) };
};

if (args.includes("--selftest")) {
  const lf = '---\ntitle: Fade\ncomponent: fade-in\nlength: "30"\navoidWhen:\n  - "Use `blur-in` for depth"\n---\nbody\n';
  const page = pageOf(lf);
  assert.deepEqual(page, ["fade-in", { length: "30", avoid: "Use `blur-in` for depth" }]);
  assert.deepEqual(pageOf(lf.replace(/\n/g, "\r\n")), page, "CRLF frontmatter parses like LF");
  const cat = "# remocn\n- **Fade** (`components/remocn/fade-in.tsx`) fades\n- **Blur** (`components/remocn/blur-in.tsx`) blurs\n";
  const want = cat.replace("fades", "fades · len 30 · avoid: Use `blur-in` for depth");
  for (const eol of ["\n", "\r\n"]) {
    const r = rewrite(cat.replace(/\n/g, eol), new Map([page]));
    assert.deepEqual([r.bad, r.joined, r.out], [[], 1, want.replace(/\n/g, eol)], `catalog round-trip keeps ${JSON.stringify(eol)}`);
    assert.ok(rewrite(r.out, new Map([page])).same, "second run is a no-op");
  }
  console.log("vendor-remocn selftest ok");
  process.exit(0);
}

const pages = new Map();
for (const file of readdirSync(join(src, "content/docs"), { recursive: true })) {
  const page = file.endsWith(".mdx") && pageOf(readFileSync(join(src, "content/docs", file), "utf8"));
  if (page) pages.set(...page);
}
if (!pages.size) { console.error(`no component pages under ${src}/content/docs`); process.exit(1); }

const { bad, joined, same, out } = rewrite(readFileSync(catalogPath, "utf8"), pages);
if (bad.length) { console.error(`avoidWhen substitutes not in CATALOG.md:\n  ${bad.join("\n  ")}`); process.exit(1); }
if (same) { console.log(`remocn catalog up to date (${joined} entries joined)`); process.exit(0); }
if (check) { console.error("CATALOG.md is out of date: run node scripts/vendor-remocn.mjs"); process.exit(1); }
writeFileSync(catalogPath, out);
console.log(`CATALOG.md updated (${joined} entries joined of ${pages.size} remocn pages)`);
