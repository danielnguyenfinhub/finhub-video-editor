#!/usr/bin/env node
// finhub: one local entry point over the scripts in this folder. It parses arguments and calls what
// already exists; no logic lives here. Commands are in scripts/finhub-cli/, one module each, loaded
// only when used (status and doctor pull in video-status.mjs, which loads a .ts file).
//   npm run finhub -- doctor | status [slug] | render <slug> | clean      (--json on each)
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { USAGE, UsageError } from "./finhub-cli/lib.mjs";
import { PASSTHROUGH, runPassthrough } from "./finhub-cli/passthrough.mjs";

export const COMMANDS = ["doctor", "status", "render", "clean"];

export const HELP = `finhub <command> [options]

  doctor            check this PC: Node, ffmpeg, Python, node_modules, disk, API key names
  status [slug]     where each video stands; with a slug, readiness and what is next
  render <slug>     render one video (python scripts/render-video.py); --still <frame>, --dry-run
  clean             list, and with --apply delete, old regenerable files; --older-than <days>
  library <step>    the source library: find, add, index, stats, resolve (scripts/library.mjs)
  overlay <dir>     render a HyperFrames overlay into the library (scripts/hf-overlay.mjs)
  listing <step>    Global RE listing video: prep, voice, render
  prep <video> <slug>   prepare a recording: Whisper words, proxy, matte (scripts/prep-video.py)
  sweep <slug>      contact frames of a finished render for QC (scripts/sweep-render.mjs)
  research <step>   trending, topic, read, transcript, watch, comments, audience (scripts/research.py)
  voice <slug>      voice an approved faceless script (scripts/voice-video.mjs)

doctor, status, render and clean take --json (one JSON object on stdout) and --help.
library, overlay, listing, prep, sweep, research and voice pass their arguments to the script
untouched: no --json, the command must come first, and the exit code is the script's own.
Exit codes: 0 ok, 1 problem found, 2 usage error, 3 rendered but not published.`;

const OPTIONS = {
  json: { type: "boolean" },
  help: { type: "boolean" },
  "dry-run": { type: "boolean" },
  still: { type: "string" },
  apply: { type: "boolean" },
  "older-than": { type: "string" },
};

// A bad argument is a UsageError: print it and exit 2.
const guarded = async (cmd, fn) => {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`finhub ${cmd}: ${e.message}`);
    return USAGE;
  }
};

export const main = async (argv, root = join(import.meta.dirname, "..")) => {
  // library, overlay and listing hand every argument to their script, so they are decided before parseArgs.
  if (Object.hasOwn(PASSTHROUGH, argv[0])) return guarded(argv[0], () => runPassthrough(root, argv[0], argv.slice(1)));
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    console.error(`finhub: ${e.message}\n\n${HELP}`);
    return USAGE;
  }
  const [cmd, ...positionals] = parsed.positionals;
  if (!cmd) {
    console.log(HELP);
    return parsed.values.help ? 0 : USAGE;
  }
  if (!COMMANDS.includes(cmd)) {
    console.error(`finhub: unknown command "${cmd}"\n\n${HELP}`);
    return USAGE;
  }
  const mod = await import(`./finhub-cli/${cmd}.mjs`);
  if (parsed.values.help) {
    console.log(mod.help);
    return 0;
  }
  return guarded(cmd, () => mod.run(root, { positionals, values: parsed.values }));
};

// realpath: a bare `finhub` from `npm link` is a symlink, and argv[1] keeps the link's path.
const isMain = () => {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
};
if (isMain()) process.exitCode = await main(process.argv.slice(2));
