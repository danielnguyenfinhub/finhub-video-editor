// Check for src/mortgage/PagedCaptions.tsx, the caption layer every design shares.
// Run: node scripts/check-captions.mjs -> "captions ok", exit 1 on failure.
// Proves CaptionZone never ends below SAFE.bottom, and that no design under
// src/designs carries its own copy of the pager (captionPages + the
// "durationMs + <tail>" Sequence loop) instead of <PagedCaptions>.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");
// PagedCaptions imports golden.ts, whose sibling imports have no extension
// (Bundler resolution): bundle it first, as check-golden.mjs does.
const out = mkdtempSync(join(tmpdir(), "captions-"));
execFileSync(process.execPath, [
  join(root, "node_modules/esbuild/bin/esbuild"),
  join(root, "src/mortgage/PagedCaptions.tsx"), join(root, "src/mortgage/golden.ts"),
  "--bundle", "--format=esm", "--platform=node", "--packages=external", "--jsx=automatic",
  "--out-extension:.js=.mjs", `--outdir=${out}`, "--log-level=warning",
]);
const { captionZoneBottom } = await import(pathToFileURL(join(out, "PagedCaptions.mjs")).href);
const { SAFE } = await import(pathToFileURL(join(out, "golden.mjs")).href);

let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) {
    failed = true;
    console.log(`FAIL ${name}${detail ? `  (${detail})` : ""}`);
  }
};

check("default bottom is SAFE.bottom", captionZoneBottom() === SAFE.bottom, captionZoneBottom());
check("a bottom below SAFE.bottom is clamped", captionZoneBottom(SAFE.bottom + 200) === SAFE.bottom, captionZoneBottom(SAFE.bottom + 200));
check("a bottom above SAFE.bottom is kept", captionZoneBottom(SAFE.bottom - 120) === SAFE.bottom - 120, captionZoneBottom(SAFE.bottom - 120));

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
for (const f of files(join(root, "src/designs"))) {
  const src = readFileSync(f, "utf8");
  const name = relative(root, f).replace(/\\/g, "/");
  check(`${name}: no copied pager loop (use <PagedCaptions>)`, !/durationMs\s*\+/.test(src));
  check(`${name}: no direct captionPages() (use <PagedCaptions>)`, !/\bcaptionPages\s*\(/.test(src));
}

if (failed) process.exit(1);
console.log("captions ok");
