# finhub CLI: one local entry point over the existing scripts

Date: 2026-11-04. Status: design approved by Daniel in chat (shape, commands, interface). Next: implementation plan.

## Goal

The repo runs on Daniel's PC and is driven from Claude Code chat. Today it has 20 npm scripts, about 90 files in `scripts/` (13 Python) and no `bin`, so an agent or Daniel must already know each script name and its flags. One `finhub` command makes the local workflow discoverable, checkable and scriptable. Judge it by AGENTS.md's test: does it make the next video better or faster to edit.

## Decisions (Daniel, 2026-11-04)

- Shape: one `finhub` command, a thin dispatcher. No logic is rewritten; it calls what exists.
- First version: `doctor`, `status`, `render`, `clean`.
- Interface: non-interactive, flags and `--json`, no prompts.

## Architecture

- `scripts/finhub.mjs`: shebang, `node:util` `parseArgs`, a command table, `--help`. No new dependency.
- `scripts/finhub-cli/`: `doctor.mjs`, `status.mjs`, `render.mjs`, `clean.mjs`, `lib.mjs` (print text or JSON, exit codes, repo root). Listed in `scripts/README.md` as `finhub-cli/` (a folder row satisfies `check-scripts-index.mjs`).
- `package.json`: `"bin": {"finhub": "scripts/finhub.mjs"}` and the script `"finhub": "node scripts/finhub.mjs"`. `npm run finhub -- <cmd>` always works. A bare `finhub` on the PC needs one `npm link` (the Windows shim is unverified from the cloud).
- Child processes: `process.execPath` for Node, `process.env.PYTHON ?? "python"` for Python, as `video-status.mjs` does. Paths are compared after `path.relative` and `\\` to `/` normalising.

## Contract for every command

- Default output is a few lines of text. `--json` prints exactly one JSON object on stdout; nothing else goes to stdout.
- Exit codes: 0 ok, 1 problem found or blocked, 2 usage error (unknown command, missing or invalid argument), 3 passed through from `render-video.py` (rendered, not published).
- `finhub --help` and `finhub <cmd> --help` list every command and flag.
- A slug is validated with the existing `assertSlug` (`listing-prep.mjs`) before any path is built.

## Commands

### doctor
Reuses `readinessOf(root, "")` from `video-status.mjs` (ffmpeg, Python, git state) and adds: Node >= 22; `node_modules` present and `remotion` version equal to the pinned `@remotion/cli` version; free disk on the repo drive (`fs.statfs`; warn under 10 GB, block under 2 GB); `.env` and the environment checked for the API key *names* in a `KEYS` constant (reported as set or unset, a value is never read into output); `FINHUB_BROWSER` validated only if set. Remotion's own browser downloads on first render, so `doctor` reports `chrome: remotion-managed (downloaded on first render)` and does not probe it. Exit 1 if any item is `blocked`; warnings exit 0.

### status [slug]
No slug: every video (stage, next step) plus library stats. Slug: readiness, what is done, usage per agent, what is next. Calls `nextOf`, `readinessOf`, `usageOf` from `video-status.mjs` and the `stats` export of `library.mjs`. `--json` returns the same data. Read-only.

### render <slug>
1. Refuse if `readinessOf` reports `blocked` (print its fixes, exit 1).
2. Unless `--force`, skip when `out/videos/<slug>/<slug>.mp4` exists and `<slug>.inputs` equals `node scripts/publish-video.mjs <slug> --inputs-hash --public-dir public`. Print `up to date` and exit 0.
3. Run `preflight.mjs <slug>` (which already runs `check-speech-cuts` and `check-pacing`), then `check-schema.mjs <slug>`, stopping at the first failure. These are the three checks AGENTS.md prescribes before a render.
4. Run `python scripts/render-video.py <slug>` and pass its exit code through.
5. `--still <frame>`: instead of steps 2 to 4, run `remotion still` for the slug's composition at `--scale=0.5` into `out/videos/<slug>/check-<frame>.png`. `--dry-run` prints the commands and runs none of them.

### clean
Dry run by default; `--apply` deletes. `--older-than <days>` (default 30) applies to render outputs.

Allow-list, the only places `clean` can delete from:
- `node_modules/.cache/finhub-tmp/`
- `out/videos/*/team/qc/sweep/`
- `out/videos/*/<slug>.mp4`, `-mobile.mp4`, `-feed.mp4`, `thumbnail.png`, `.srt`, `.inputs`, only when older than `--older-than` days

Anything not matching the allow-list is never a candidate, so these are unreachable even with `--apply`: `public/recordings/`, `public/library/`, `public/videos/`, `1 - PUT FOOTAGE HERE/`, `2 - FINISHED VIDEOS/`, every `edit.json`, `out/videos/*/team/` ledgers. Each candidate is resolved with `realpath` and must still lie inside the repo root (a symlink out is skipped). Output lists each candidate with size and the total; `--json` returns the same list.

## Testing

`scripts/check-finhub-cli.mjs`, added to `npm test` and marked **test** in `scripts/README.md`. It runs the dispatcher against a temp tree (`repoTmp`) and asserts:
- `--help` names all four commands; an unknown command exits 2; a bad slug exits 2.
- `clean` without `--apply` deletes nothing; with `--apply` it deletes exactly the allow-listed old files; a recordings path, a `team/` ledger and a symlink to outside the root survive. (Mutation to prove it: widening the allow-list to `out/` must fail this test.)
- `doctor` with `FAL_KEY=sentinel-value-123` in the environment never prints the sentinel, in text or JSON.
- Every `process.env.<NAME>` ending in `_KEY` or `_TOKEN` found in `scripts/` and `mcp/` is in `KEYS` (drift guard).
- `--json` output parses and has the documented fields.
- `render --dry-run` prints `preflight`, `check-schema`, then the render command, in that order, and runs none.

Not testable in the cloud and tagged `verify on PC`: a real `render`, the Windows `npm link` shim, `doctor` on a machine missing ffmpeg.

## Docs and wiring

`scripts/README.md` rows for `finhub.mjs` and `finhub-cli/`; one line under AGENTS.md "Commands" (`npm run finhub -- doctor | status | render <slug> | clean`); `docs/agents/skills-and-harnesses.md` is untouched (no harness change).

## Out of scope (YAGNI, add when asked)

`library`, `overlay` and `listing` subcommands, shell completions, interactive prompts, a publish subcommand (`render-video.py` already publishes and exits 3 when it cannot).

## Risks and unverified

- Allow-list drift: a future script that writes new files under `out/` is not cleaned until added. Safe direction; the failure is leftover disk, not lost files.
- `render-video.py` itself calls `preflight.mjs` first (toolkit.md says so), so `render` runs preflight twice. Accepted in v1 because it is cheap and fails fast before the slow render starts; if it proves slow, drop the call from `render.mjs`, not from the scripts.
- Windows behaviour is inferred from the existing `win32` handling in this repo; it is not exercised in the cloud.
