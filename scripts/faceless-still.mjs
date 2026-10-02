// A MortgageReel still of a faceless video without its recording, for sessions that
// have no foreground.webm or source.mp4 (docs/agents/rendering-without-gpu.md).
//
//   node scripts/faceless-still.mjs <slug> <design> [--frame 150] [--scale 0.5] [--out out/stills/<design>.png]
//
// Reads public/videos/<slug> (edit.json, script.json, words.json), builds a scratch public
// folder (scripts/scratch-public.mjs) that links everything else in public/, sets
// "background": "vignette" (no matte needed) and adds a black VP9-in-MP4 placeholder
// source.mp4, which a headless shell decodes (it has no H.264). The repo is not touched.
// Needs ffmpeg and, here, an installed headless shell (FINHUB_BROWSER, else /opt/pw-browsers).
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { browserArgs, scratchPublic } from "./scratch-public.mjs";

const ROOT = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const [slug, design] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!slug || !design || !/^[\w-]+$/.test(slug) || !/^[\w-]+$/.test(design)) {
  console.error("usage: node scripts/faceless-still.mjs <slug> <design> [--frame 150] [--scale 0.5] [--out file.png]");
  process.exit(1);
}
const frame = flag("--frame", "150");
const scale = flag("--scale", "0.5");
const out = flag("--out", join("out", "stills", `${slug}-${design}.png`));

let pub, browser;
try {
  pub = scratchPublic(slug);
  browser = browserArgs();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
mkdirSync(join(ROOT, out, ".."), { recursive: true });
const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@remotion/cli/remotion-cli.js"), "still", "src/index.ts", "MortgageReel", out, `--public-dir=${pub}`, `--props=${JSON.stringify({ slug, design })}`, `--frame=${frame}`, `--scale=${scale}`, ...browser], { cwd: ROOT, encoding: "utf8" });
if (r.status !== 0) {
  const lines = `${r.stdout}${r.stderr}`.trim().split("\n");
  console.error(`still failed (exit ${r.status}):\n${lines.slice(-4).map((l) => l.slice(0, 200)).join("\n")}`);
  process.exit(1);
}
console.log(`wrote ${out} (${slug}, design ${design}, frame ${frame}, scale ${scale}${browser.length ? ", installed headless shell" : ""})`);
