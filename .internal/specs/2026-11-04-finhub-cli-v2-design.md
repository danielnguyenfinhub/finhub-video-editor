# finhub CLI v2: library, overlay, listing

Date: 2026-11-04. Status: design approved by Daniel in chat. Builds on `2026-11-04-finhub-cli-design.md` (v1, merged in PR #169). Next: implementation plan.

## Goal

v1 gave `finhub` the four commands that need judgement (`doctor`, `status`, `render`, `clean`). The three remaining script families Daniel and the agents reach for, the source library, the HyperFrames overlay and the Global RE listing pipeline, still need their script names and flags remembered. v2 adds them under the same `finhub` entry point without re-declaring any flag.

## Commands

| Command | Runs |
|---|---|
| `finhub library find\|add\|index\|stats\|resolve ...` | `node scripts/library.mjs ...` |
| `finhub overlay <project-dir> --en "..." [--vi "..."] [--slug ...]` | `node scripts/hf-overlay.mjs ...` |
| `finhub listing prep "<folder>"` | `node scripts/listing-prep.mjs ...` |
| `finhub listing voice <slug> [--lang vi\|en] [--dry-run]` | `node scripts/voice-video.mjs --listing ...` |
| `finhub listing render <slug> [--lang vi\|en]` | `python scripts/listing-render.py ...` (`PYTHON` overrides `python`) |

These are the same invocations as the existing `npm run listing`, `listing-voice` and `listing-render` aliases.

## Behaviour

- **Pass-through.** The arguments after the command go to the script untouched, so the script's own flags (`--en`, `--kind`, `--dry-run`, `--selftest`) are never rejected by the dispatcher. `finhub.mjs` checks for these three names before it parses options.
- **Output and exit codes are the script's own.** stdout and stderr are inherited and the exit code is returned unchanged (so `listing render` still returns 3 for "rendered, not published"). A spawn failure returns 1.
- **No `--json`** for these three: each script prints its own format. The wrapper command must come first (`finhub library stats`, not `finhub --json library stats`); a leading flag is a usage error from the v1 parser.
- **Usage errors exit 2**, as for v1: `library` without one of `find add index stats resolve`, `listing` without one of `prep voice render`. `overlay` with no arguments is the script's own usage message and its exit code 1.
- **`--help`** as the only argument prints the wrapper's help (what it runs and the script's flags). With any other arguments `--help` goes to the script.
- Children are spawned with an argument array and never through a shell. Slugs and paths are validated by the scripts themselves, exactly as when run directly.

## Architecture

- New `scripts/finhub-cli/passthrough.mjs`: a table `PASSTHROUGH = { library, overlay, listing }`, each `{ help, argv(root, rest) }`, plus `runPassthrough(root, name, rest)`. One file, no per-command module.
- `scripts/finhub.mjs`: one check before `parseArgs` (`Object.hasOwn(PASSTHROUGH, argv[0])`), the `UsageError` handling shared with the v1 path, three new lines in `HELP`.

## Testing

Added to `scripts/check-finhub-cli.mjs`:
- The exact argument list built for all five invocations, including that `listing voice` inserts `--listing` and `listing render` uses Python.
- `passthroughArgv` throws `UsageError` for a missing or unknown `library` step and a missing or unknown `listing` step, including `constructor` (a prototype key must not pass).
- Through the real CLI: those cases exit 2; `--help` on each exits 0 and names the command; `finhub library stats` exits 0 and prints `total`; `finhub overlay --selftest` exits 0 and prints `hf-overlay selftest: ok` (proves an unknown-to-the-dispatcher flag reaches the script); `finhub overlay` with no arguments exits 1 with the script's usage text (proves the exit code passes through).

Not testable in the cloud and tagged `verify on PC`: a real `listing prep|voice|render` (needs a listing folder, a voice engine and footage).

## Docs and wiring

`finhub --help`; the `finhub.mjs` and `finhub-cli/` rows of `scripts/README.md`; the AGENTS.md "Commands" line.

## Out of scope

Aliases for the other scripts (`prep-video.py`, `sweep-render.mjs`, `voice-video.mjs` outside listing, `research.py`), `--json` for these three, shell completions.

## Risks

- A script renamed or moved breaks its wrapper. The argument-list test names each script path, and the real `library stats` and `overlay --selftest` runs fail if one disappears.
- `listing voice` puts `--listing` before the slug, mirroring the existing npm alias; `voice-video.mjs` finds `--listing` anywhere in its arguments, so the order is not load-bearing.
