// Self-test for scripts/tmp-dir.mjs: a repoTmp folder is removed when its process exits, also
// when an error thrown from a timer, an unhandled rejection or a rejected top-level await ends
// it (check-schema's browser-download error left 177 MB per run); { keep: true } keeps it.
//   node scripts/check-tmp-dir.mjs -> "tmp-dir ok"
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const lib = pathToFileURL(join(import.meta.dirname, "tmp-dir.mjs")).href;
const child = (tail) => spawnSync(process.execPath, ["--input-type=module", "-e",
  `import { writeFileSync } from "node:fs"; import { repoTmp } from ${JSON.stringify(lib)};
const dir = repoTmp("tmp-dir-test-"); writeFileSync(dir + "/f", "x"); console.log(dir); ${tail}`], { encoding: "utf8" });

for (const [how, tail] of [
  ["a normal exit", ""],
  ["an error thrown from a timer", 'setTimeout(() => { throw new Error("boom"); }, 10);'],
  ["an unhandled rejection", '(async () => { await null; throw new Error("boom"); })();'],
  ["a rejected top-level await", 'await Promise.reject(new Error("boom"));'],
]) {
  const r = child(tail);
  const dir = r.stdout.trim();
  assert.ok(dir, `${how}: no folder printed: ${r.stderr}`);
  assert.equal(r.status === 0, how === "a normal exit", `${how}: exit ${r.status}`);
  assert.ok(!existsSync(dir), `${how} must remove ${dir}`);
}
const r = child('console.log(repoTmp("tmp-dir-keep-", { keep: true }));');
const [dir, kept] = r.stdout.trim().split("\n");
assert.ok(!existsSync(dir) && existsSync(kept), "keep: true outlives the process; the other folder does not");
rmSync(kept, { recursive: true });
console.log("tmp-dir ok");
