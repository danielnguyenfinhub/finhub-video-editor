// finhub library | overlay | listing: pass-through wrappers. The script's own flags go through untouched
// (finhub.mjs decides these names before it parses options) and so does its exit code, so each flag has
// one home. Children are spawned with an argument array, never through a shell.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { OK, PROBLEM, UsageError } from "./lib.mjs";

const node = (root, script, ...fixed) => [process.execPath, "--no-warnings", join(root, "scripts", script), ...fixed];

const LIBRARY_STEPS = ["find", "add", "index", "stats", "resolve"];
// The same invocations as the npm aliases listing, listing-voice and listing-render.
const LISTING = {
  prep: (root) => node(root, "listing-prep.mjs"),
  voice: (root) => node(root, "voice-video.mjs", "--listing"),
  render: (root) => [process.env.PYTHON ?? "python", join(root, "scripts", "listing-render.py")],
};

const RESEARCH_STEPS = ["trending", "topic", "read", "transcript", "watch", "comments", "audience", "selftest"];
const python = (root, script, ...fixed) => [process.env.PYTHON ?? "python", join(root, "scripts", script), ...fixed];

export const PASSTHROUGH = {
  library: {
    help: `finhub library <step> [args]   (runs node scripts/library.mjs)
  find <keywords...> [--kind k]   add <file> <meta.json>   index   stats   resolve <slug> [--public-dir dir]
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => {
      if (!LIBRARY_STEPS.includes(rest[0])) throw new UsageError(`needs one of: ${LIBRARY_STEPS.join(", ")}`);
      return node(root, "library.mjs", ...rest);
    },
  },
  overlay: {
    help: `finhub overlay <project-dir> --en "keywords" [--vi "từ khóa"] [--slug <slug>]   (runs node scripts/hf-overlay.mjs)
  Renders one HyperFrames composition (1080x1920) to a transparent WebM and files it in the library.
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => node(root, "hf-overlay.mjs", ...rest),
  },
  listing: {
    help: `finhub listing <prep|voice|render> [args]
  prep "<folder>"                           node scripts/listing-prep.mjs
  voice <slug> [--lang vi|en] [--dry-run]   node scripts/voice-video.mjs --listing
  render <slug> [--lang vi|en]              python scripts/listing-render.py   (exit 3: rendered, not published)
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => {
      if (!Object.hasOwn(LISTING, rest[0])) throw new UsageError(`needs one of: ${Object.keys(LISTING).join(", ")}`);
      return [...LISTING[rest[0]](root), ...rest.slice(1)];
    },
  },
  prep: {
    help: `finhub prep "<video>" <slug> [--recording <id>] [--no-clean]   (runs python scripts/prep-video.py)
  Also: prep <slug> --recording <id>   and   prep <slug> --clips public/videos/<slug>/clips.json
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => python(root, "prep-video.py", ...rest),
  },
  sweep: {
    help: `finhub sweep <slug> [--file <mp4>] [--max <n>] [--out <dir>] [--sheet] [--start <s>] [--end <s>]   (runs node scripts/sweep-render.mjs)
  Contact frames of a finished render, for QC.
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => node(root, "sweep-render.mjs", ...rest),
  },
  research: {
    help: `finhub research <${RESEARCH_STEPS.join("|")}> [args]   (runs python scripts/research.py)
  Trending topics, topic research, page and YouTube reads, before a faceless script is written.
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => {
      if (!RESEARCH_STEPS.includes(rest[0])) throw new UsageError(`needs one of: ${RESEARCH_STEPS.join(", ")}`);
      return python(root, "research.py", ...rest);
    },
  },
  voice: {
    help: `finhub voice <slug> [--dry-run] [--engine google|omnivoice|elevenlabs] [--voice <profile>] [--no-chain]   (runs node scripts/voice-video.mjs)
  Voices an approved faceless script. For Global RE listings use: finhub listing voice
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => node(root, "voice-video.mjs", ...rest),
  },
};

/** The command line a wrapper would run. Throws UsageError for a missing or unknown step. */
export const passthroughArgv = (root, name, rest) => PASSTHROUGH[name].argv(root, rest);

export const runPassthrough = (root, name, rest) => {
  if (rest.length === 1 && (rest[0] === "--help" || rest[0] === "-h")) {
    console.log(PASSTHROUGH[name].help);
    return OK;
  }
  const argv = passthroughArgv(root, name, rest);
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, stdio: "inherit" });
  if (r.error) console.error(r.error.message);
  return r.status ?? PROBLEM;
};
