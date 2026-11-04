# finhub CLI v3: prep, sweep, research, voice

Date: 2026-11-04. Status: design approved by Daniel in chat. Extends `2026-11-04-finhub-cli-v2-design.md` (v2, merged in PR #170). Next: implementation plan.

## Goal

v1 and v2 put `doctor`, `status`, `render`, `clean`, `library`, `overlay` and `listing` behind `finhub`. The editing pipeline still has four script families that must be reached by their file names: preparing a recording, sweeping a render, researching a topic and voicing a faceless script. v3 adds them as the same pass-through wrappers.

## Commands

| Command | Runs |
|---|---|
| `finhub prep "<video>" <slug> [--recording <id>] [--no-clean]` (also `<slug> --recording <id>` and `<slug> --clips <file>`) | `python scripts/prep-video.py ...` |
| `finhub sweep <slug> [--file <mp4>] [--max <n>] [--out <dir>] [--sheet] [--start <s>] [--end <s>]` | `node scripts/sweep-render.mjs ...` |
| `finhub research trending\|topic\|read\|transcript\|watch\|comments\|audience\|selftest ...` | `python scripts/research.py ...` (same as `npm run research`) |
| `finhub voice <slug> [--dry-run] [--engine google\|omnivoice\|elevenlabs] [--voice <profile>] [--no-chain]` | `node scripts/voice-video.mjs ...` (faceless; Global RE listings stay `finhub listing voice`) |

## Behaviour

Identical to v2: arguments after the command go to the script untouched, its stdout, stderr and exit code come back unchanged, no `--json`, the command must come first, children are spawned with an argument array and never through a shell, `PYTHON` overrides `python`, `--help` as the only argument prints the wrapper's help.

- `research` needs one of `trending topic read transcript watch comments audience selftest`; anything else (including none, or a prototype key such as `constructor`) is a usage error and exits 2.
- `prep`, `sweep` and `voice` forward everything, like `overlay`: each script prints its own usage. Their no-argument exit codes today are `sweep` 2, `voice` 1 and `prep` 2 (Python argparse); a script exit code of 2 is therefore not always a wrapper usage error.

## Not wrapped, on purpose

- `clone-voice` and `setup-voice`: AGENTS.md says a voice is cloned only after Daniel says in chat that it is his own or he has written permission, and never with `--consent` added by an agent. A wrapper would make that easier to run by accident; it stays an explicit `npm run clone-voice`.
- `music-start` and the `check-*` scripts: too small, or already run by `npm test`.

## Architecture

Four new entries in the `PASSTHROUGH` table in `scripts/finhub-cli/passthrough.mjs`, plus four lines in the `HELP` text in `scripts/finhub.mjs` (`prep`, `sweep`, `research`, `voice`). No new file, no dispatcher logic change.

## Testing

Added to `scripts/check-finhub-cli.mjs`:
- The exact command line for each of the four, including `python` for `prep` and `research`.
- `research` without a sub-command, with an unknown one and with `constructor` throws `UsageError` and exits 2 through the real CLI.
- `--help` on each of the four exits 0 and names the command; `finhub --help` names all eleven commands.
- Through the real CLI with Node scripts only (no Python in `npm test`): `finhub voice` with no arguments returns the script's exit 1 and its usage text; `finhub sweep` with no arguments returns the script's own usage (exit 2).

Not testable in the cloud and tagged `verify on PC`: a real `prep` (needs a recording and Whisper), `sweep` (needs a render), `research` (network), `voice` (needs a voice engine and key).

## Docs and wiring

`finhub --help`; the `finhub.mjs` row of `scripts/README.md`; the AGENTS.md "Commands" line.

## Risks

- A wrapped script that changes its flags is covered by the script itself, since nothing is re-declared. A renamed or moved script fails the real `voice` and `sweep` runs.
- Exit code 2 from a wrapped script is ambiguous with a wrapper usage error. Documented here and in `--help`; the stderr text tells them apart.
