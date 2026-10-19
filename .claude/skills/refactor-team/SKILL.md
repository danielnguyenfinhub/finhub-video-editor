---
name: refactor-team
description: >-
  Runs the finhub-video refactor team end to end: architecture audit → Daniel approves the
  target layout → asset refactor → independent review → render-speed pass → independent
  review → summary. Use when Daniel wants this repo leaner with the team: "refactor
  the video repo", "dedupe the recordings", "audit the disk and recordings", "run the refactor
  pipeline", "run the harness", "Phase 1 audit", "re-run the audit",
  "redo the asset refactor", "fix what the reviewer flagged", "update the refactor from the
  last run", "did the dedup work". For a single code fix, edit directly; use this skill when
  Daniel wants measurement before a change and an independent check after it. NOT for token use or
  render speed ("where are the tokens going", "make rendering faster": dev-efficiency-team) or
  making videos (video-production-team, vietnamese-finance-video-editor).
---

# Refactor team

**User story:** Daniel asks for the video repo to waste less (duplicated recordings, tokens
per session, render minutes) and gets back a measured audit, one decision to make (the target
layout), and changes an independent reviewer has proved still render, with his recordings
untouched until he runs the migration himself.

## The team

| Agent (`.claude/agents/`) | Does | Standard it follows |
|---|---|---|
| `architecture-auditor` | measures, ranks, proposes the layout and each change's blast radius | `repo-audit-tools` skill |
| `asset-refactorer` | resolver, schema, every caller, docs, migration script (dry run only) | `references/asset-contract.md` |
| `pipeline-optimizer` | timed render-speed changes, one at a time | `remotion-best-practices/remotion-render` guide plus measured evidence |
| `quality-reviewer` | independent PASS / FIX / BLOCK after the refactor and after the speed pass | its own file |

**Execution mode: subagents**, called in sequence with the Agent tool (`subagent_type` = the
agent name, `model: "opus"`). Why not an agent team: the flow is a pipeline with a human gate
after the audit, each phase's input is the previous phase's file, and the reviewer must start
from a clean context so it judges the artefacts, not the author's reasoning. Same reasoning as
`video-production-team`.

Agent files register when a session starts. If the Agent tool says an agent type isn't found
(the files arrived mid-session), use `subagent_type: "general-purpose"` and start the prompt
with "Read and adopt `.claude/agents/<name>.md` as your role"; give the reviewer only the
read-only tools its file lists.

A subagent doesn't see this conversation or `AGENTS.md`. Put everything it needs in its
prompt: repo root, media root, `out/refactor/`, the contract path, the approved change ids,
the slug to time, and Daniel's feedback word for word. Repeat the rules that matter: Remotion
serves `public/` only; recordings are git-ignored originals that no agent moves; `out/` stays;
shortest diff; lint before reporting.

## Phase 0 — Context

Work from the repository root. In a worktree the recordings are absent, so the media root is
the main checkout's `public/` (`C:/Users/Daniel/finhub-video/public`) whenever the cwd's
`public/videos/` has no `source.mp4`. Check `out/refactor/`:

- No folder → **new run**.
- Folder exists and Daniel asks to change one part ("fix what the reviewer flagged", "redo the
  speed pass") → **partial re-run**: start at the phase that owns it, passing the previous
  files and the feedback.
- Folder exists and Daniel asks for a fresh audit → **fresh run**: move the folder to
  `out/refactor_prev/` first.

Run `git status`; if there's uncommitted work, tell Daniel before touching anything.

## Phase 1 — Audit (read-only)

1. Run the tools yourself so the agent spends its context on analysis, not on waiting:
   `node .claude/skills/repo-audit-tools/scripts/audit.mjs --media-root <path>` (about six
   minutes the first time; repowise indexing is most of it). Check
   `out/refactor/raw/status.json`; a skipped tool is fine, note it.
2. `architecture-auditor` with the repo root, media root and output folder.
   - `blocked` (client data, no recordings) → stop; tell Daniel what it found.
3. Show Daniel the five-line summary and the change table (id, saves, touches, risk) with the
   proposed layout. Nothing is edited until he picks.

## Phase 2 — Daniel approves the layout (the only gate)

Daniel picks change ids. If his choice differs from `references/asset-contract.md`, update
that file and its approval log first, so the refactorer and the reviewer read the same
contract. If he declines everything, the audit report is the deliverable; stop here.

## Phase 3 — Asset refactor

1. `asset-refactorer` with the approved ids, the contract path, the media root and any feedback.
   - `blocked` (contract and audit disagree) → show Daniel both quotes; he decides.
2. `quality-reviewer`, phase `refactor`, with the refactorer's report path.
   - **FIX** → back to the refactorer with the findings; re-review. At most 2 rounds, then show Daniel the open findings.
   - **BLOCK** → stop; show Daniel the finding in plain words and what would clear it.
   - **PASS** → Phase 4.

## Phase 4 — Render speed

1. `pipeline-optimizer` with the slug to time (Daniel's choice, or the smallest slug that has a
   recording), the media root and the refactorer's report.
2. `quality-reviewer`, phase `speed`. Same FIX / BLOCK / PASS loop.

## Phase 5 — Deliver

Re-run `audit.mjs --only media` for the after-number. Report in plain words: MB and tokens
saved (before → after), render time before → after, files changed, the exact command Daniel
runs in the main checkout to move his recordings (`python scripts/migrate-assets.py --dry-run`,
then `--apply` once the dry run reads right), what the reviewer asked him to verify himself
(`verify_for_daniel`), anything left out, and one next step. Then ask once whether anything in
the result or the team should change.

## Files

All team files live in `out/refactor/` (git-ignored, kept as the audit trail):

| File | Written by |
|---|---|
| `raw/` | `audit.mjs` (tool output, `status.json`) |
| `01_auditor_report.md` | architecture auditor |
| `02_refactorer_report.md` | asset refactorer |
| `03_review_refactor.json` | reviewer, after the refactor |
| `04_optimizer_report.md` | pipeline optimizer |
| `05_review_speed.json` | reviewer, after the speed pass |

## Errors

| Situation | Action |
|---|---|
| A tool in `status.json` is skipped | Continue; the auditor says so in its summary; never fill the gap with a guess |
| An agent returns malformed or no JSON | Re-run it once with the error; then stop and report |
| Reviewer and producer disagree on a finding | Don't pick a side; show Daniel both with the evidence |
| Two FIX rounds didn't clear a finding | Stop the loop; show Daniel the open finding |
| Any agent reports client data in a file | Stop the whole run; tell Daniel the path only |
| An agent wants to move a recording | Refuse; only `migrate-assets.py --apply`, run by Daniel, moves recordings |

## Test scenarios

- **Normal:** five slug folders share one 273 MB `source.mp4` → auditor reports 1.1 GB
  duplicated and a two-file resolver change → Daniel approves → refactorer adds the resolver and
  the migration dry run passes → reviewer PASS → optimizer cuts the mobile-copy pass with an
  encoder `ffmpeg -encoders` lists → reviewer PASS → Daniel gets the migration command.
- **Error:** the refactorer's `migrate-assets.py --apply` would delete a file whose hash it
  didn't verify → reviewer BLOCK → the run stops before Daniel is handed the command.
- **Partial re-run:** "the reviewer flagged the Python path rule, fix it" → Phase 0 finds
  `out/refactor/` → refactorer gets `03_review_refactor.json` → reviewer re-checks, marking the
  old finding resolved.
