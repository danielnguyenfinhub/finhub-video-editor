// Temp folders for scripts and checks, made inside the repo
// (node_modules/.cache/finhub-tmp, git-ignored) instead of os.tmpdir(): a bundle
// written there imports `remotion` and other packages, which resolve only when a
// node_modules sits above it. /tmp on Linux has none; Windows worked only by luck.
// Each folder is removed when its process exits, also when an uncaught error or
// unhandled rejection ends it (a caller's `finally` never runs then: check-schema's
// browser-download error left 177 MB per run). A process killed by a signal or a
// timeout skips 'exit' too: prune removes those folders after 6 h.
// repoTmp(prefix, { keep: true }): the folder outlives the process (no caller needs that today).
// bundleTs(entries, options): esbuild bundles .ts for Node into those folders (see below).
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const BASE = join(ROOT, "node_modules", ".cache", "finhub-tmp");

// Folders nobody has touched for 6 h are crashed runs: the OS used to clear /tmp, nothing clears this.
const prune = () => {
  const cutoff = Date.now() - 6 * 3600 * 1000;
  for (const name of readdirSync(BASE)) {
    try {
      const p = join(BASE, name);
      if (statSync(p).mtimeMs < cutoff) rmSync(p, { recursive: true, force: true });
    } catch {
      // another run is using or removing it: leave it
    }
  }
};

const owned = new Set();
process.once("exit", () => {
  for (const dir of owned)
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // still open (Windows): prune removes it later
    }
});

export const repoTmp = (prefix, { keep = false } = {}) => {
  mkdirSync(BASE, { recursive: true });
  prune();
  const dir = mkdtempSync(join(BASE, prefix));
  if (!keep) owned.add(dir);
  return dir;
};

// .ts entries bundled to .mjs for Node (`--bundle --format=esm --platform=node --out-extension:.js=.mjs`)
// through esbuild's JS API: `node node_modules/esbuild/bin/esbuild` worked only on Windows, where that
// file is JS; on Linux/macOS npm swaps it for the native binary. esbuild is found through
// @remotion/bundler (works hoisted or nested). Relative paths are the repo's. Throws on a build error.
export const bundleTs = (entryPoints, options) => {
  const req = createRequire(join(ROOT, "package.json"));
  const { buildSync } = createRequire(req.resolve("@remotion/bundler/package.json"))("esbuild");
  return buildSync({ entryPoints, bundle: true, format: "esm", platform: "node", outExtension: { ".js": ".mjs" }, absWorkingDir: ROOT, ...options });
};
