// Temp folders for scripts and checks, made inside the repo
// (node_modules/.cache/finhub-tmp, git-ignored) instead of os.tmpdir(): a bundle
// written there imports `remotion` and other packages, which resolve only when a
// node_modules sits above it. /tmp on Linux has none; Windows worked only by luck.
// Each folder is removed when its process exits, also when an uncaught error or
// unhandled rejection ends it (a caller's `finally` never runs then: check-schema's
// browser-download error left 177 MB per run). A process killed by a signal or a
// timeout skips 'exit' too: prune removes those folders after 6 h.
// repoTmp(prefix, { keep: true }): the folder outlives the process (no caller needs that today).
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = join(import.meta.dirname, "..", "node_modules", ".cache", "finhub-tmp");

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
