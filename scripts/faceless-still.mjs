// A MortgageReel still of a faceless video without its recording, for sessions that
// have no foreground.webm or source.mp4 (docs/agents/rendering-without-gpu.md).
//
//   node scripts/faceless-still.mjs <slug> <design> [--frame 150] [--scale 0.5] [--out out/stills/<design>.png] [--production]
//   (flags anywhere, also --flag=value; --selftest: the argument parsing)
//
// Reads public/videos/<slug> (edit.json, script.json, words.json), builds a scratch public
// folder (scripts/scratch-public.mjs) that links everything else in public/, sets
// "background": "vignette" (no matte needed) and adds a black VP9-in-MP4 placeholder
// source.mp4, which a headless shell decodes (it has no H.264). The repo is not touched.
// Needs ffmpeg and, here, an installed headless shell (FINHUB_BROWSER, else /opt/pw-browsers).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { browserArgs, scratchPublic } from "./scratch-public.mjs";

const ROOT = join(import.meta.dirname, "..");
const USAGE = "usage: node scripts/faceless-still.mjs <slug> <design> [--frame 150] [--scale 0.5] [--out file.png] [--production]";

/** The command line as { slug, design, frame, scale, out, production }; throws (with the usage) on an
 * unknown flag, a flag missing its value, a value starting with "-" (use --out=-x), a third
 * positional, a bad slug or design, or a frame/scale that is not a number. Flags go anywhere. */
export const parseStillArgs = (args) => {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: {
      frame: { type: "string", default: "150" }, scale: { type: "string", default: "0.5" },
      out: { type: "string" }, production: { type: "boolean", default: false } } });
  } catch (e) {
    throw new Error(`${e.message}\n${USAGE}`);
  }
  const { values, positionals: [slug, design, ...extra] } = parsed;
  const bad = extra.length ? `unexpected argument ${extra[0]}`
    : !slug || !design || !/^[\w-]+$/.test(slug) || !/^[\w-]+$/.test(design) ? "need <slug> <design>"
    : !/^\d+$/.test(values.frame) ? `--frame ${values.frame} is not a frame number`
    : !(Number(values.scale) > 0) ? `--scale ${values.scale} is not a positive number` : "";
  if (bad) throw new Error(`${bad}\n${USAGE}`);
  return { slug, design, frame: values.frame, scale: values.scale, out: values.out ?? join("out", "stills", `${slug}-${design}.png`), production: values.production };
};

const selftest = () => {
  const p = (s) => parseStillArgs(s.split(" "));
  const base = { slug: "s", design: "d", frame: "150", scale: "0.5", out: join("out", "stills", "s-d.png") };
  for (const s of ["--production s d", "s --production d", "s d --production"])
    assert.deepEqual(p(s), { ...base, production: true }, s);
  assert.deepEqual(p("s d"), { ...base, production: false });
  assert.deepEqual(p("--frame 90 s --scale 1 d --out x.png"), { ...base, frame: "90", scale: "1", out: "x.png", production: false });
  assert.deepEqual(p("s d --scale=1 --frame=30 --out=-x.png"), { ...base, frame: "30", scale: "1", out: "-x.png", production: false });
  for (const s of ["s d --out -x.png", "s d --frame -5", "s d --scale", "s d e", "s d --prod", "s", "s d --frame 1.5", "s d --scale 0", "s d/x"])
    assert.throws(() => p(s), /usage:/, s);
  console.log("faceless-still selftest ok");
};

const main = () => {
  let a;
  try {
    a = parseStillArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const { slug, design, frame, scale, out } = a;
  let pub, browser;
  try {
    pub = scratchPublic(slug, { vignette: !a.production }); // --production: navy picture + transparent cut-out, the path a talking-head design takes
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
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.argv[2] === "--selftest" ? selftest() : main();
