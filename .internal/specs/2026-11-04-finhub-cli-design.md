# finhub CLI: one local entry point over the existing scripts

Date: 2026-11-04. Status: design approved by Daniel in chat (shape, commands, interface), then stress-tested (see the end). Next: implementation plan.

## Goal

The repo runs on Daniel's PC and is driven from Claude Code chat. Today it has 20 npm scripts, about 90 files in `scripts/` (13 Python) and no `bin`, so an agent or Daniel must already know each script name and its flags. One `finhub` command makes the local workflow discoverable, checkable and scriptable. Judge it by AGENTS.md's test: does it make the next video better or faster to edit.

## Decisions (Daniel, 2026-11-04)

- Shape: one `finhub` command, a thin dispatcher. No logic is rewritten; it calls what exists.
- First version: `doctor`, `status`, `render`, `clean`.
- Interface: non-interactive, flags and `--json`, no prompts.
- After the stress test: `render` never skips (no "up to date" shortcut, no `--force`); `clean` only touches renders of delivered videos.

## Architecture

- `scripts/finhub.mjs`: shebang, `node:util` `parseArgs`, a command table, `--help`. No new dependency.
- `scripts/finhub-cli/`: `doctor.mjs`, `status.mjs`, `render.mjs`, `clean.mjs`, `lib.mjs` (print text or JSON, exit codes). Listed in `scripts/README.md` as `finhub-cli/` (a folder row satisfies `check-scripts-index.mjs`).
- Every command is a function `run(root, args)`. Only `finhub.mjs` supplies the repo root, so tests pass a temp root, as `nextOf(root, slug)` already allows.
- `package.json`: `"bin": {"finhub": "scripts/finhub.mjs"}` and the script `"finhub": "node --no-warnings scripts/finhub.mjs"`. Importing `video-status.mjs` loads `recording.ts`, and Node prints a typeless-module warning to stderr; `--no-warnings` hides it for `npm run finhub -- <cmd>`. A bare `finhub` (after one `npm link`) may show that warning on stderr; stdout and `--json` are unaffected. The Windows shim is unverified from the cloud.
- Child processes: `process.execPath` for Node, `process.env.PYTHON ?? "python"` for Python, as `video-status.mjs` does. Paths are compared after `path.relative` and `\\` to `/` normalising, and lower-cased on `win32`.

## Contract for every command

- Default output is a few lines of text. `--json` prints exactly one JSON object on stdout; nothing else goes to stdout.
- Exit codes: 0 ok, 1 problem found or blocked, 2 usage error (unknown command, missing or invalid argument), 3 passed through from `render-video.py` (rendered, not published).
- `finhub --help` and `finhub <cmd> --help` list every command and flag.
- A slug is validated with the existing `assertSlug` (`listing-prep.mjs`) before any path is built.
- Children are spawned with an argument array and never through a shell. Secrets: only API key *names* are ever read into output.

## Commands

### doctor
Reuses `readinessOf(root, "")` from `video-status.mjs` (ffmpeg, Python, git state) and adds: Node satisfies `engines.node` read from `package.json` (currently `>=24`; only the `>=N` form is parsed, anything else is a warning "cannot parse engines"); `node_modules` present and installed `remotion` equal to the pinned `@remotion/cli` version; free disk on the repo drive (`fs.statfs`; warn under 10 GB, block under 2 GB); `.env` and the environment checked for the API key *names* in a `KEYS` constant (reported as set or unset, a value is never read into output); `FINHUB_BROWSER` validated only if set. Remotion's own browser downloads on first render, so `doctor` reports `chrome: remotion-managed (downloaded on first render)` and does not probe it. Exit 1 if any item is `blocked`; warnings exit 0.

### status [slug]
No slug: every video (stage, next step) plus library stats. Slug: readiness, what is done, usage per agent, what is next. Calls `nextOf`, `readinessOf`, `usageOf` from `video-status.mjs` and the `stats` export of `library.mjs`. `--json` returns the same data. Read-only.

### render <slug>
Passes through to `python scripts/render-video.py <slug>`, which already stops on a missing cut-out, runs `preflight.mjs` (edit.json mistakes, `check-schema`, `check-speech-cuts`, `check-pacing`), renders, and stages the finished copy. `render` adds no checks of its own, so nothing runs twice. The exit code passes through (0, 1, 3). On a non-zero code other than 3 it prints one line: `see: finhub status <slug>` (readiness with fixes).

If `out/videos/<slug>/<slug>.inputs` equals `node scripts/publish-video.mjs <slug> --inputs-hash --public-dir public`, it first prints one info line: `on-screen text unchanged since the last render (design, media and music changes are not tracked)`. It always renders: that hash covers only `edit.json` (minus `post`), `script.json` and `words.json` (`publish-video.mjs:76-86`), so it is a staleness signal for publishing, not a render cache key.

- `--still <frame>`: instead of the full render, run Remotion `still` the way `render-video.py` does (`node node_modules/@remotion/cli/remotion-cli.js still src/index.ts MortgageReel <out> --props={"slug":"<slug>"} --frame=<n> --scale=0.5 --gl=angle`) into `out/videos/<slug>/check-<frame>.png`. `<frame>` must be a non-negative integer.
- `--dry-run`: print the command that would run and run nothing.

### clean
Dry run by default; `--apply` deletes. `--older-than <days>` is an integer >= 1 (default 30); anything else exits 2.

Allow-list, the only places `clean` can delete from:
- `node_modules/.cache/finhub-tmp/` (temp; no age or delivery gate)
- `out/videos/*/team/qc/sweep/` (regenerable QC frames; no age or delivery gate)
- Render outputs of one slug: `out/videos/<slug>/<slug>.mp4`, `-mobile.mp4`, `-feed.mp4`, `thumbnail.png`, `<slug>.srt`, `<slug>.inputs`. These are candidates only when **all three** hold: `out/videos/<slug>/team/06_delivery.md` exists (the video was handed over); the files are older than `--older-than` days; `unfinishedRender` is false. Otherwise they are listed under `kept` with the reason (`not delivered`, `too new`, `render unfinished`) and size. A video with no `team/` folder is never cleaned.

Why delivery, not the published ledger: `render-video.py` exits 3 when a video is rendered but not published, and then `out/` holds the only copy. `07_published.json` is written only when `publish-post.mjs` posts, so videos Daniel posts by hand would never be cleaned.

Anything not matching the allow-list is never a candidate, so these are unreachable even with `--apply`: `public/recordings/`, `public/library/`, `public/videos/`, `1 - PUT FOOTAGE HERE/`, `2 - FINISHED VIDEOS/`, every `edit.json`, `out/videos/*/team/` ledgers. Each candidate is resolved with `realpath` and must still lie inside the root; a symlink out is skipped, and deleting a symlink removes the link, never its target. Output lists each candidate and each kept item with size and the totals; `--json` returns the same lists.

## Testing

`scripts/check-finhub-cli.mjs`, added to `npm test` and marked **test** in `scripts/README.md`. It builds a temp tree with `repoTmp` and calls the commands with that root. It asserts:
- `--help` names all four commands; an unknown command exits 2; a bad slug exits 2; `--older-than 0` and `--older-than abc` exit 2.
- `clean` without `--apply` deletes nothing; with `--apply` it deletes exactly the old, delivered, finished renders plus the temp and sweep folders. Survivors: a recordings file, a `team/` ledger, a render with no `06_delivery.md`, a render newer than the cutoff, a render whose `.inputs` says `rendering`, and a symlink to outside the root. (Mutation to prove it: widening the allow-list to `out/`, or dropping the delivery gate, must fail this test.)
- `doctor` with `FAL_KEY=sentinel-value-123` in the environment never prints the sentinel, in text or JSON; with a temp `package.json` whose `engines.node` is `>=999` it reports `blocked`.
- Every `process.env.<NAME>` ending in `_KEY` or `_TOKEN` found in `scripts/` and `mcp/` is in `KEYS` (drift guard).
- `--json` output parses and has the documented fields.
- `render --dry-run` prints the `render-video.py` command and runs nothing; `render --still 45 --dry-run` prints the Remotion still command with `--scale=0.5`.

Not testable in the cloud and tagged `verify on PC`: a real `render` and `--still`, the Windows `npm link` shim, `doctor` on a machine missing ffmpeg.

## Docs and wiring

`scripts/README.md` rows for `finhub.mjs` and `finhub-cli/`; one line under AGENTS.md "Commands" (`npm run finhub -- doctor | status | render <slug> | clean`); `docs/agents/skills-and-harnesses.md` is untouched (no harness change).

## Out of scope (YAGNI, add when asked)

`library`, `overlay` and `listing` subcommands, shell completions, interactive prompts, a publish subcommand (`render-video.py` already publishes and exits 3 when it cannot), a render cache or "up to date" skip.

## Risks and unverified

- Allow-list drift: a future script that writes new files under `out/` is not cleaned until added. Safe direction; the failure is leftover disk, not lost files.
- Delivered but not yet approved by Daniel: after `--older-than` days a render could be cleaned while its `2 - FINISHED VIDEOS/` copy still waits. The copy in that folder is untouched, so the loss is a re-render, not the video.
- `--still` needs the same cut-out `render-video.py` needs; if it is missing, Remotion fails and the exit code says so.
- Windows behaviour is inferred from the existing `win32` handling in this repo; it is not exercised in the cloud.

## Stress Test Results: finhub CLI design

### Resolved Decisions
- Render skip-if-up-to-date: removed. `--inputs-hash` covers only `edit.json` (minus `post`), `script.json` and `words.json`, not design code, source video, cut-out, music or library assets, so a skip could keep a stale video silently. Agreed by Daniel.
- `clean` and renders: only delivered (`06_delivery.md`), old enough, finished renders are candidates; undelivered renders are listed as kept. Agreed by Daniel.
- Security: slug via `assertSlug`; argument-array spawns, no shell; key names only; `realpath` containment; `--older-than` integer >= 1.
- Import side effects: `video-status.mjs` is guarded and safe to import; `--no-warnings` in the npm script.
- Relationship to the MCP server: complementary, kept.
- Scale, interrupted render (`unfinishedRender`), Windows path case, test root injection: resolved from code.
- Reflexion: Node requirement is read from `package.json` `engines.node` (`>=24`), not hardcoded 22; `render` is a pass-through because `preflight.mjs` already runs the schema, speech-cut and pacing checks and `render-video.py` runs `preflight.mjs` itself.

### Changes Made
- doctor: Node check source; render: rewritten as pass-through, skip and `--force` removed; clean: delivery gate and `kept` list; tests, risks and architecture updated to match.

### Deferred / Parking Lot
- README row "Node.js 18+" (`README.md:25`) disagrees with `engines.node >=24`. Not part of this change; fix separately.
- `library`, `overlay`, `listing` subcommands.

### Confidence Assessment
- Overall: High on the design; Medium on Windows and real renders, which need the PC.
- Areas of concern: `--still` and the bare `finhub` shim are unverified until run on the PC.
