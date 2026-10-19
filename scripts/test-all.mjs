// Every `npm test` step, run to the end instead of stopping at the first failure:
// a table of step, ok/FAIL and seconds, then the last 5 output lines of each failure.
// Exits 1 if any step failed. `npm test` keeps its && chain for CI.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const steps = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts.test.split(" && ");
const rows = [];
for (const step of steps) {
  const t = Date.now();
  // the steps are the repo's own `node <file> [--flag]` commands: shell only for Windows' PATH lookup
  const r = spawnSync(step, { cwd: ROOT, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0;
  const tail = ok ? "" : `${r.stdout ?? ""}${r.stderr ?? ""}`.trimEnd().split("\n").slice(-5).join("\n");
  rows.push({ step, ok, s: ((Date.now() - t) / 1000).toFixed(1), tail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${rows.at(-1).s.padStart(6)}s  ${step}`);
}
const failed = rows.filter((r) => !r.ok);
for (const f of failed) console.log(`\n--- FAIL ${f.step}\n${f.tail}`);
console.log(`\n${steps.length - failed.length}/${steps.length} steps passed.`);
process.exit(failed.length ? 1 : 0);
