// Every top-level file in scripts/ must be named in scripts/README.md (the index agents
// read first), and the README's **test** marks must match what `npm test` runs.
// Run: node scripts/check-scripts-index.mjs (exit 1 and the missing names on failure).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dirname;
const readme = readFileSync(join(dir, "README.md"), "utf8");
const missing = readdirSync(dir).filter((f) => f !== "README.md" && !/^[._]/.test(f) &&!readme.includes(statSync(join(dir, f)).isDirectory() ? `${f}/` : f));
if (missing.length) {
  console.error(`scripts/README.md does not list: ${missing.join(", ")}`);
  process.exit(1);
}

// README table rows ending "| **test** |" vs the scripts/ files package.json "test" runs.
const names = (text) => [...text.matchAll(/[\w.-]+\.(?:mjs|py)\b/g)].map((m) => m[0]);
const marked = new Set(readme.split("\n").filter((l) => /\|\s*\*\*test\*\*\s*\|\s*$/.test(l)).flatMap((l) => names(l.split("|")[1])));
const { scripts } = JSON.parse(readFileSync(join(dir, "..", "package.json"), "utf8"));
const run = new Set([...scripts.test.matchAll(/(?:node|python3?)\s+scripts\/([\w.-]+\.(?:mjs|py))/g)].map((m) => m[1]));
const drift = [
  ...[...marked].filter((f) => !run.has(f)).map((f) => `${f} is marked **test** in scripts/README.md but npm test does not run it`),
  ...[...run].filter((f) => !marked.has(f)).map((f) => `npm test runs ${f} but scripts/README.md does not mark it **test**`),
];
if (drift.length) {
  console.error(drift.join("\n"));
  process.exit(1);
}
console.log("scripts index ok");
