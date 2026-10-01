// Temp folders for scripts and checks, made inside the repo
// (node_modules/.cache/finhub-tmp, git-ignored) instead of os.tmpdir(): a bundle
// written there imports `remotion` and other packages, which resolve only when a
// node_modules sits above it. /tmp on Linux has none; Windows worked only by luck.
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = join(import.meta.dirname, "..", "node_modules", ".cache", "finhub-tmp");

// Folders nobody has touched for a day are old runs: the OS used to clear /tmp, nothing clears this.
const prune = () => {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  for (const name of readdirSync(BASE)) {
    try {
      const p = join(BASE, name);
      if (statSync(p).mtimeMs < cutoff) rmSync(p, { recursive: true, force: true });
    } catch {
      // another run is using or removing it: leave it
    }
  }
};

export const repoTmp = (prefix) => {
  mkdirSync(BASE, { recursive: true });
  prune();
  return mkdtempSync(join(BASE, prefix));
};
