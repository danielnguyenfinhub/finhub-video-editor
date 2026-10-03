---
name: template-improvement-team
description: >-
  Team 5, the creative design team. Improves the existing Finance Hub video templates (src/designs):
  a golden-rules and logic auditor and a design critic review them in parallel, a creative director
  turns that into fixes and options, Daniel picks the look changes from stills, an improver builds
  them, and the auditor and critic re-check the result independently. Use when Daniel says "improve
  the templates", "make the <design> template better", "audit the designs", "golden rules check on
  all templates", "the cards design looks weak", "creative team", "design review", "team 5". NOT for
  making a video (style-production-teams, video-production-team), a brand-new design from scratch
  (repo-build-team), or repo bugs (repo-maintenance-team).
---

# Template improvement team (Team 5)

**User story:** Daniel asks for better templates and gets a rule-by-rule audit, a design critique in plain words, a few concrete options per template with stills to choose from, and the chosen ones built and re-checked by people who did not build them; the golden rules never bend.

Pattern: fan-out → producer → independent re-check (harness fan-out/fan-in, then producer-reviewer). Ground rules: `docs/agents/team-ground-rules.md`. Which template belongs to which style team: `config/style-teams.json`.

## The team

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `golden-rules-auditor` | audits contract, golden rules 1–5b and the logic behind them; runs the measurable checks; re-checks after the build | `src/designs/README.md`, `src/mortgage/golden.ts` |
| `design-critic` | judges hierarchy, type, contrast, composition, motion, grammar consistency; ranks improvements | `editing-principles.md` craft rules, `design-space.md` |
| `creative-director` | concepts: fixes and one to three options per template, reusing elements and installed packages | `.claude/elements/CATALOG.md`, `docs/findings.md` |
| `template-improver` | builds the approved changes with proof | `src/designs/README.md` "Rules of the build" |
| `quality-reviewer` | independent PASS / FIX / BLOCK that lint, bundle and paths still hold | its own file |

**Execution mode: subagents.** Parallel only where reads are independent (auditor ‖ critic; re-check auditor ‖ critic ‖ reviewer). The re-checkers must not have built anything, so they start from a clean context. Agent files register at session start; if one isn't found use `general-purpose` with "Read and adopt `.claude/agents/<name>.md`".

A subagent sees neither this chat nor `AGENTS.md`. Every prompt carries: the repo root, `out/teams/templates/`, the design ids in scope, a slug that has `words.json` for stills (with no `source.mp4`, `node scripts/faceless-still.mjs <slug> <id> [--production]` renders it in the sandbox: docs/agents/rendering-without-gpu.md; else "no render possible here"), the `--public-dir` if media lives elsewhere, and Daniel's words verbatim.

## Phase 0 — Scope

Design ids from Daniel's words; "the templates" or no id → all, grouped by style team so each agent gets one family at a time (≤ 10 designs per agent; a dozen designs in one prompt dilutes the audit). `git status`; tell Daniel about uncommitted work. `out/teams/templates/`: none → new run; present and Daniel changes one part → partial re-run from the phase that owns it; fresh request → move to `templates_prev/`. Note whether stills can be rendered here (Chrome and `source.mp4`); if not, the run still audits and critiques from code and previews and says the look is unviewed. Run `node scripts/sandbox-facts.mjs` once at the start and pass its short table (`out/teams/sandbox-facts.md`, about 300 tokens) in every subagent prompt (not a re-explanation); agents probe only what it says is unprobed (ground rule 5).

## Phase 1 — Audit and critique (parallel)

One message: `golden-rules-auditor` and `design-critic` on the same scope. Show Daniel the rule violations by number and the top improvement per design.

## Phase 2 — Concepts

`creative-director` per group with both reports → `02_concepts_<group>.md`, every item in one class: **A** fix-provable from code and checks, **B** fix-needs-render, **C** option for Daniel, **D** ruling for Daniel.

## Phase 3 — Daniel's gate (the only one)

A fixes go ahead without asking; B fixes go ahead only where a still can be rendered, else they wait flagged unviewed; D rulings are Daniel's questions, asked in plain words. For each look option Daniel picks by stills (the pack: `node scripts/review-pack.mjs <slug> --designs <ids>`, his recording on his PC; `--sandbox` here gives the same frames with no face) (or by description if no render is possible, and then the look is flagged unviewed). A pick that touches a golden rule is refused back to the creative director, not built. Nothing visible changes without a pick.

## Phase 4 — Build

`template-improver` with the fixes, Daniel's picks word for word and the concept file. `blocked` → relay.

## Phase 5 — Independent re-check (parallel)

First, when the run touched shared code or the core, run `node scripts/stills-diff.mjs <slug> --before origin/main` and hand its `diff.md` to the re-checkers: a design nobody meant to change that "differs" is a regression to explain. Then one message: `golden-rules-auditor` (re-check; compare with each `01_golden_audit_<group>.md`), `design-critic` (did each chosen option land, did anything regress) and `quality-reviewer` (phase `refactor`). Fan-in:

- Any rule violation left or introduced, or **FIX** → back to the improver in one combined round; re-check only what changed. At most 2 rounds, then show Daniel the open findings.
- **BLOCK** → stop, plain words.
- All pass → Phase 6.

## Phase 6 — Deliver and learn

Plain-words report: violations fixed (rule number), options built, designs now promotable, what is unviewed or unproven, the exact stills for Daniel to look at, and one next step. Logged lessons go to `corrections.md` and become checks where measurable. Add a line to the change log in `docs/agents/skills-and-harnesses.md` if a team file changed. Append a row to `docs/agents/team-runs.md` (date, team, scope, outcome, PR or `pending`, what Daniel must verify). Fill in the row's outcome at the end of the run, not left `in progress` (`check-teams.mjs` fails on an open row that is not the last). Commit only if Daniel asked.

## Files

`out/teams/templates/` (git-ignored), one file per group (`<group>` = the style-team family from Phase 0): `01_golden_audit_<group>.md` · `01_critique_<group>.md` · `02_concepts_<group>.md` · `03_improver_report_<group>.md` · `04_golden_recheck.md` · `04_critique_recheck.md` · `04_review.json`.

## Errors

| Situation | Action |
|---|---|
| A chosen option needs a golden rule bent | Refuse; back to the creative director for an option that stays inside it |
| No render possible | Audit and critique from code and previews; every look claim marked "not viewed"; never claim a look is fixed |
| Auditor and improver disagree | Show Daniel both with the evidence |
| A check is red after 2 rounds | Stop; show the failing line; do not loosen the check |
| Template needs a change in `src/mortgage/` or `src/brand/` | Stop; that is the locked core: Daniel decides, and the repo-build-team builds it |
| Client data in any file | Stop; path only |

## Test scenarios

- **Normal:** "improve the explainer template" → auditor finds the bars fill under contrast (rule-adjacent, measured by `check-contrast`), critic ranks the pale bars first → creative director marks it a fix and offers two cover options → Daniel picks one → improver builds → re-check clean.
- **Rule conflict:** Daniel picks a full-width stat banner at y 300 → above `SAFE.top` → refused back to the creative director, who offers the same banner inside the band.
- **No render:** the sandbox has no Chrome → the run audits, critiques and builds fixes that checks can prove; look options wait, flagged "unviewed", for Daniel's machine.
