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

export const COMMANDS = ["doctor", "status", "render", "clean"];

export const HELP = `finhub <command> [options]

  doctor            check this PC: Node, ffmpeg, Python, node_modules, disk, API key names
  status [slug]     where each video stands; with a slug, readiness and what is next
  render <slug>     render one video (python scripts/render-video.py); --still <frame>, --dry-run
  clean             list, and with --apply delete, old regenerable files; --older-than <days>

Every command: --json (one JSON object on stdout) and --help.
Exit codes: 0 ok, 1 problem found, 2 usage error, 3 rendered but not published.`;

const OPTIONS = {
  json: { type: "boolean" },
  help: { type: "boolean" },
  "dry-run": { type: "boolean" },
  still: { type: "string" },
  apply: { type: "boolean" },
  "older-than": { type: "string" },
};

export const main = async (argv, root = join(import.meta.dirname, "..")) => {
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
  try {
    return await mod.run(root, { positionals, values: parsed.values });
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`finhub ${cmd}: ${e.message}`);
    return USAGE;
  }
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
