---
name: dev-efficiency-team
description: >-
  Team 3. Finds how to work effectively on finhub-video: measures where a video run and an agent
  session lose time and tokens (phases, retries, re-reads, re-renders), then cuts them - earlier
  checks, scripts for repeated steps, tighter read lists, faster renders - keeping each change only
  if the number moves. Use when Daniel says "make production quicker", "why did this take so long",
  "save tokens", "where is the time going", "work more efficiently", "run the efficiency team",
  "team 3". NOT for deduping recordings only (refactor-team), bugs (repo-maintenance-team), or
  making a video (video-production-team).
---

# Dev efficiency team (Team 3)

**User story:** Daniel asks why production is slow or expensive and gets numbers per phase, the biggest costs cut with before and after figures, and the cuts that were tried and reverted listed honestly.

Pattern: measure → decide → change one thing → re-measure (pipeline with a number gate). It extends `refactor-team`; it does not replace it. Ground rules: `docs/agents/team-ground-rules.md`.

## The team

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `workflow-analyst` | per-phase baseline of a run and of agent sessions, ranked cuts | `repo-audit-tools` skill |
| `architecture-auditor` | tokens and disk by file and folder (reused from refactor-team) | `repo-audit-tools` skill |
| `automation-builder` | early checks, scripts, hooks, tighter prompts and read lists | `docs/agents/code-changes.md` |
| `pipeline-optimizer` | render speed with timings (reused from refactor-team) | `remotion-render` skill |
| `quality-reviewer` | independent PASS / FIX / BLOCK that nothing broke and the savings are real | its own file |

**Execution mode: subagents in sequence**, with the two measuring agents in parallel in Phase 1. Reviewer starts clean.

Prompts carry the repo root, media root, `out/teams/efficiency/`, the slug to time if any, and "read `docs/agents/team-ground-rules.md` first".

## Phase 0 — Context

`git status`. Media root: the cwd's `public/` if it holds a recording, else the main checkout's. Check `out/teams/efficiency/` (new / partial re-run / fresh → `efficiency_prev/`). If there are no run records under `out/videos/` and no recording to time, say so and run only the token side.

## Phase 1 — Measure (parallel, read-only)

One message: `workflow-analyst` and `architecture-auditor` (it writes under `out/refactor/`; pass the media root). Show Daniel the three biggest costs with their numbers and the ranked cut table. **Gate:** he picks cuts, except that early-failing checks and shorter read lists (no behaviour change) go ahead without asking. Compliance and QC steps are never on the table.

## Phase 2 — Cut

`automation-builder` with the approved cuts. If a render-speed cut is approved, `pipeline-optimizer` takes it with the slug to time. Each keeps a change only if its number improved.

## Phase 3 — Review

`quality-reviewer` (phase `speed` for render changes, `refactor` otherwise) with both reports. FIX → one round back to the owner; BLOCK → stop.

## Phase 4 — Deliver

Before → after for each kept cut (minutes, tokens, or "unmeasured" with the reason), reverted cuts and why, files changed, what Daniel must verify, and one next step. Add the change to the `AGENTS.md` "Work lean" list only if it is a rule agents must follow every session. Append a row to `docs/agents/team-runs.md` (date, team, scope, outcome, PR or `pending`, what Daniel must verify).

## Files

`out/teams/efficiency/`: `01_baseline.md` · `02_changes.md` · `03_review.json`; raw tool output in `out/refactor/raw/`.

## Errors

| Situation | Action |
|---|---|
| No baseline obtainable | Report `blocked` with what to run first; never estimate |
| A cut worsens a number | Revert it; list it as tried |
| A cut touches compliance or QC | Refuse |
| Saving cannot be measured here (no GPU, no key) | Say "unmeasured"; do not keep the change on theory alone unless the reviewer confirms it is a pure removal of repeated work |

## Test scenarios

- **Normal:** baseline shows three QC FIX rounds each caused by a caption-page error found after the render → builder adds the check to `preflight.mjs` → next run's FIX rounds fall to one → reviewer PASS.
- **Revert:** a prompt shortened to save tokens makes the editor skip a corrections read → quality drops in the check → reverted, listed as tried.
- **Blocked:** a fresh clone, no `out/videos/` → token side only; the report names the run Daniel needs to do first.
