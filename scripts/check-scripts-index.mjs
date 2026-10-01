// Every top-level file in scripts/ must be named in scripts/README.md (the index agents
// read first). Run: node scripts/check-scripts-index.mjs (exit 1 and the missing names on failure).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dirname;
const readme = readFileSync(join(dir, "README.md"), "utf8");
const missing = readdirSync(dir).filter((f) => f !== "README.md" && !/^[._]/.test(f) &&!readme.includes(statSync(join(dir, f)).isDirectory() ? `${f}/` : f));
if (missing.length) {
  console.error(`scripts/README.md does not list: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("scripts index ok");
