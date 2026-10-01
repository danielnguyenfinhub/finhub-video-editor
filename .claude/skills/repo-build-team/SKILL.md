---
name: repo-build-team
description: >-
  Team 1. Builds or extends the finhub-video repo from new and existing resources: scout what the
  repo, its vendored Remotion elements and the sibling repos already have, blueprint the smallest
  build, implement it, then review it independently. Use when Daniel says "build X into the repo",
  "add a new design / element / script / scene", "bring feature Y over", "use what we already have
  to make Z", "run the build team", "team 1". NOT for fixing bugs or improving existing code
  (repo-maintenance-team), speed or token work (dev-efficiency-team), or making a video
  (style-production-teams, video-production-team).
---

# Repo build team (Team 1)

**User story:** Daniel names something the repo should do. He gets it built from what already exists, proven with lint, tests and stills, and reviewed by someone who did not build it, with one decision for him: what to build when the scout finds a real gap.

Pattern: pipeline with a producer-reviewer loop (harness patterns). Ground rules for every agent: `docs/agents/team-ground-rules.md`.

## The team

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `resource-scout` | reuse map: what exists, how much fits, what is missing | `search-first` skill |
| `code-architect` | blueprint: files, interfaces, build order, from the repo's own patterns | `docs/agents/code-changes.md` |
| `repo-builder` | implements, registers, proves with lint, tests, stills | `src/designs/README.md` for designs |
| `quality-reviewer` | independent PASS / FIX / BLOCK that paths resolve and lint and bundle pass | its own file |
| `code-reviewer` | correctness and maintainability of the diff, in parallel with the above | its own file |

**Execution mode: subagents in sequence** (Agent tool, `subagent_type` = agent name). Not an agent team: each phase's input is the previous phase's file, the gate is Daniel's, and the reviewers must judge the artefacts from a clean context. If an agent type isn't found (files added mid-session) use `general-purpose` and open the prompt with "Read and adopt `.claude/agents/<name>.md` as your role".

A subagent sees neither this chat nor `AGENTS.md`. Every prompt carries: the repo root, `out/teams/build/`, Daniel's request word for word, and "read `docs/agents/team-ground-rules.md` first".

## Phase 0 — Context

`git status`; tell Daniel about uncommitted work before touching anything. Check `out/teams/build/`: none → new run; present and Daniel asks to change one part → partial re-run from the phase that owns it; fresh request → move the folder to `out/teams/build_prev/`. Run `node scripts/sandbox-facts.mjs` once at the start and pass its short table (`out/teams/sandbox-facts.md`, about 300 tokens) in every subagent prompt (not a re-explanation); agents probe only what it says is unprobed (ground rule 5).

## Phase 1 — Scout (read-only)

`resource-scout` with the request. Show Daniel the reuse map's summary line: needs covered / partly / missing. **Gate (only one):** if anything is missing and building it adds a dependency, a new script family or touches `src/mortgage`, ask Daniel before Phase 2. Otherwise continue.

## Phase 2 — Blueprint

`code-architect` with the reuse map: the smallest set of files, which existing component each is copied from, order of work. Write it to `out/teams/build/02_blueprint.md`.

## Phase 3 — Build

`repo-builder` with the reuse map and blueprint. `blocked` → show Daniel the reason.

## Phase 4 — Review (parallel)

One message, two Agent calls: `quality-reviewer` (phase `refactor`, with the builder report) and `code-reviewer` (the diff). Fan-in:

- **FIX** → back to `repo-builder` with both findings in one round; re-review only what changed. At most 2 rounds, then show Daniel the open findings.
- **BLOCK** → stop; plain words and what would clear it.
- **PASS** → Phase 5.

## Phase 5 — Deliver

Report in plain words: what was built, what was reused from where, files changed, commands that passed (quote the last lines), what is unproven (a design not yet promoted stays "unproven"), what Daniel must verify, and one next step. Append a row to `docs/agents/team-runs.md` (date, team, scope, outcome, PR or `pending`, what Daniel must verify). Fill in the row's outcome at the end of the run, not left `in progress` (`check-teams.mjs` fails on an open row that is not the last). Commit only if Daniel asked.

## Files

`out/teams/build/` (git-ignored): `01_reuse_map.md` scout · `02_blueprint.md` architect · `03_builder_report.md` builder · `04_review_*.json` reviewers.

## Errors

| Situation | Action |
|---|---|
| Scout finds the thing already exists | Stop; tell Daniel where; building a duplicate is not the job |
| Builder wants a new dependency | Back to the scout's "installed package" check; if it holds, no dependency |
| Reviewer and builder disagree | Show Daniel both with evidence; do not pick |
| Lint or tests red after 2 rounds | Stop; show the failing lines |
| Any agent finds client data in a file | Stop the run; path only |

## Test scenarios

- **Normal:** "add a design for rate-change news with a ticker look" → scout finds `ticker` and `flash` already cover it → stop with where, no build.
- **Gap:** "an element that animates a stamp-duty bracket table" → scout finds the `data` elements and `receipt` grammar, nothing for brackets → architect copies the nearest element → builder adds it in `src/showcase/`, stills pass → both reviewers PASS.
- **Error:** the builder adds a design but not its `config/style-teams.json` entry → `check-teams.mjs` fails → FIX round → PASS.
