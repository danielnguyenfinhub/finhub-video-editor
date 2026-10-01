---
name: repo-maintenance-team
description: >-
  Team 2. Keeps the finhub-video repo healthy: hunts bugs (failing checks, silent failures, doc and
  schema drift, golden-rule breakers), finds gaps (corrections never promoted to checks, shortcuts
  past their upgrade point, installed-but-unused capability), fixes the confirmed ones with minimal
  diffs, and has an independent reviewer prove it. Use when Daniel says "check the repo for bugs",
  "maintain the repo", "what's broken", "find gaps and improve", "run the maintenance team",
  "weekly repo check", "team 2". NOT for building something new (repo-build-team), render speed or
  token cost (dev-efficiency-team), or a single known bug (fix it directly).
---

# Repo maintenance team (Team 2)

**User story:** Daniel says "maintain the repo" and gets a ranked list of real defects and real gaps, the confirmed bugs already fixed and proven, and the improvements that need his decision laid out with their payback per video.

Pattern: fan-out / fan-in, then producer-reviewer. Ground rules: `docs/agents/team-ground-rules.md`.

## The team

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `bug-hunter` | runs the repo's own checks, drift and golden-rule greps, reproduces each finding | its own file |
| `silent-failure-hunter` | swallowed errors and bad fallbacks in the paths the hunter flags | its own file |
| `typescript-reviewer` | type safety and async correctness in `src/` | its own file |
| `security-reviewer` | secrets, injection, unsafe shell in `scripts/` and `src/` | its own file |
| `gap-analyst` | what is missing, ranked by payback per video | `corrections.md`, `ponytail-debt` |
| `repo-fixer` | fixes approved ids with before and after evidence | `docs/agents/code-changes.md` |
| `build-error-resolver` | build or type errors with no design question | its own file |
| `quality-reviewer` | independent PASS / FIX / BLOCK on the fixes | its own file |

**Execution mode: subagents with one fan-out.** Reasoning as the other repo teams: the reviewer must start clean; the only parallelism is independent reads.

Prompts carry the repo root, `out/teams/maintain/`, the scope (whole repo / last N commits / named paths), and "read `docs/agents/team-ground-rules.md` first".

## Phase 0 — Scope

Ask nothing if Daniel gave a scope; default is the whole repo. `git status` first. Check `out/teams/maintain/` as the other teams do (new, partial re-run, fresh run → move to `maintain_prev/`). Then read the previous run (`out/teams/maintain_prev/` and the last maintenance rows of `docs/agents/team-runs.md`): ids it fixed or Daniel decided are closed, and every prompt carries that list so nothing is re-found.

## Phase 1 — Find (parallel)

One message: `bug-hunter` and `gap-analyst`. When the bug list names paths that need judgement, a second message fans those paths to `silent-failure-hunter`, `typescript-reviewer` and `security-reviewer` (read-only, report findings as lines for `01_bugs.md`). Merge and de-duplicate by file and line yourself. `01_bugs.md` ends with a **carried over** list: each id the previous run left open, with its status now (still open, fixed since, or Daniel's).

## Phase 2 — Gate

Show Daniel: bug counts by severity (worst one named), the top gaps with payback, and which ids the fixer will take. **Bugs rated "breaks a render or compliance guard" and "wrong output silently" go to the fixer without asking.** Gaps and anything that changes how videos look need his pick. If nothing is found, say so; that is a valid result.

## Phase 3 — Fix

`repo-fixer` with the approved ids. Type or build errors go to `build-error-resolver`. `blocked` → show Daniel. Two fixers run in parallel only on disjoint paths (for example scripts/config and review/docs), each writing its own `03_fixes_<A|B>.md` and, in a later round, appending its own `Round 2` section to it.

## Phase 4 — Review

`quality-reviewer` (phase `refactor`) with the `03_fixes*.md` files. FIX → back to the fixer, at most 2 rounds: after the independent review returns FIX, one more fix round, then a second, lighter review on that round's delta only (the new findings' `clears_when`, plus lint and tests). BLOCK → stop, plain words. PASS → Phase 5. No PR for a fixer's work until this review has run and its verdict is in `04_review.json`.

## Phase 5 — Deliver and learn

Report: fixed (id, one line, evidence), not fixed (why), gaps awaiting Daniel, what to verify. Lessons that repeated go to `corrections.md` and, where measurable, become a check (the fixer already added it). Add a change-log line to `docs/agents/skills-and-harnesses.md` only if a team file changed. Append a row to `docs/agents/team-runs.md` (date, team, scope, outcome, PR or `pending`, what Daniel must verify).

## Files

`out/teams/maintain/`: `01_bugs.md` · `02_gaps.md` · `03_fixes.md` (or `03_fixes_A.md` / `03_fixes_B.md` with two fixers) · `04_review.json`.

## Errors

| Situation | Action |
|---|---|
| A bug does not reproduce | Mark `unreproduced`; do not fix; list it |
| Fixer would loosen or skip a check | Refuse; the check stays |
| Fix needs a design decision | Stop that id; ask Daniel |
| Reviewer and fixer disagree | Show Daniel both |
| Client data in any file | Stop; path only |

## Test scenarios

- **Normal:** a doc names `scripts/old.mjs`, deleted two weeks ago → hunter's backtick-path check finds it → fixer updates the doc → lint passes → PASS.
- **No findings:** all checks green, no gaps over threshold → report says so; no fix phase.
- **Error:** the fixer "fixes" a failing check by editing its expectation → reviewer BLOCK.
