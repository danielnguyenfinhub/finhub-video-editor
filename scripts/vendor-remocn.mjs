// Adds each remocn component's `length` and first `avoidWhen` line to
// .claude/elements/remocn/CATALOG.md, from the docs frontmatter of remocn
// (https://remocn.dev, MIT; content/docs/**/*.mdx, schema lib/docs-schema.ts).
// length = own-motion frames at 30 fps (the Sequence floor, not the beat) or
// "state-driven"/"sustained". Joins on the entry's first path: components/remocn/<name>.tsx or templates/<name>/.
// Fails (exit 1, list) when an avoidWhen substitute is not a catalog entry.
// Idempotent. Reads a sibling checkout, so it is a manual step, not in npm test.
//
// Usage: node scripts/vendor-remocn.mjs [--check] [path-to-remocn]
// Default source is ../remocn-remotion-resoure. --check: exit 1 if stale, write nothing.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const check = args.includes("--check");
const root = resolve(import.meta.dirname, "..");
const src = resolve(args.find((a) => a !== "--check") ?? join(root, "..", "remocn-remotion-resoure"));
const catalogPath = join(root, ".claude/elements/remocn/CATALOG.md");

const unquote = (s) => {
  s = s.trim();
  try { return s.startsWith('"') ? JSON.parse(s) : s; } catch { return s.slice(1, -1); }
};

// component -> { length, avoid } from the mdx frontmatter (flat YAML: scalars and "- " lists).
const pages = new Map();
for (const file of readdirSync(join(src, "content/docs"), { recursive: true })) {
  if (!file.endsWith(".mdx")) continue;
  const fm = readFileSync(join(src, "content/docs", file), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1];
  const name = fm?.match(/^component:\s*(\S+)/m)?.[1];
  if (!name) continue;
  const avoid = fm.match(/^avoidWhen:\s*\n\s+-\s+(.+)$/m)?.[1];
  pages.set(name, { length: unquote(fm.match(/^length:\s*(.+)$/m)?.[1] ?? ""), avoid: avoid && unquote(avoid) });
}
if (!pages.size) { console.error(`no component pages under ${src}/content/docs`); process.exit(1); }

const before = readFileSync(catalogPath, "utf8");
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

if (bad.length) { console.error(`avoidWhen substitutes not in CATALOG.md:\n  ${bad.join("\n  ")}`); process.exit(1); }
if (after === before) { console.log(`remocn catalog up to date (${joined} entries joined)`); process.exit(0); }
if (check) { console.error("CATALOG.md is out of date: run node scripts/vendor-remocn.mjs"); process.exit(1); }
writeFileSync(catalogPath, after);
console.log(`CATALOG.md updated (${joined} entries joined of ${pages.size} remocn pages)`);
