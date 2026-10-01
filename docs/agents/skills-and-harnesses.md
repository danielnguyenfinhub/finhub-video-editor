# Skills and harnesses

Part of the project guide; [AGENTS.md](../../AGENTS.md) is the core and routes here. The harness triggers stay in AGENTS.md "Harnesses"; goals and change logs are here.

## Skills

`.claude/skills/` contains the official Remotion agent skills (vendored from Remotion's `packages/skills`, matching the pinned Remotion version). Start with `remotion-best-practices` — it routes to the specific skill for the task (creating compositions, markup/animation, captions, maps, rendering, Studio). Follow them when writing any Remotion markup.

Whatever skill is driving (Remotion's, the editor skill, or a scene written by hand), build from the element libraries before writing an effect from scratch: `.claude/elements/CATALOG.md` and `.claude/elements/remocn/CATALOG.md` for components, and `.claude/elements/remocn/recipes/FINHUB.md` for whole-video structures (remocn's composition recipes mapped to FinHub content, with the FinHub overrides). This rule lives here rather than inside the Remotion skills because re-vendoring replaces those.

`.claude/skills/vietnamese-finance-video-editor/` is the owner's own skill, not Remotion's: use it whenever Daniel asks to edit a new talking-head video. It holds the locked-core/new-design-every-video workflow, the design log (`public/videos/design-log.json`, through its `scripts/main.py`) and the compliance rules. Re-vendoring replaces only Remotion's skills and keeps this one.

### Harness: video production team

**Goal:** a recording (Pipeline A) or a document (Pipeline B) becomes a finished video through the whole runbook, built by one agent and checked by two independent ones (technical QC, compliance), with Daniel deciding only at the gates: the script lock (B), a wrongly spoken number (A), and posting.

**Trigger:** when Daniel asks to edit his footage ("edit my video", "I recorded a video about…") or for a video from a document or topic (faceless), including follow-ups on one ("redo the paper edit", "re-run QC", "fix what compliance flagged"), use the `video-production-team` skill. It runs the whole runbook for both pipelines with its agents in `.claude/agents/`; `vietnamese-finance-video-editor` is the standard its editor follows.

**Change log:**
| Date | Change | Files | Why |
|---|---|---|---|
| 2026-09-26 | Initial team | the three agents, `video-production-team`, `video-compliance-review` | Independent compliance check; scripts written from documents |
| 2026-09-30 | Leaner run: QC ‖ final compliance in parallel; one combined FIX round for both reviewers; `video-qc` on sonnet (scripted checks), the other four stay opus; agents grep their runbook rows instead of reading 24 KB | `video-production-team`, the five `video-*` agents | Daniel: "the team need to be productive and efficient" |
| 2026-09-30 | Process fixes: render once (`check-schema` / `check-speech-cuts` / `check-pacing`), one round for cosmetic findings, single definition of rule 5b, faster QC re-transcription, early report writes, Daniel's spoken words advisory (verify notes only; team-written text and B scripts stay gated) | `video-production-team`, `video-qc` (agent and skill), `video-compliance-reviewer`, `video-compliance-review`, `video-story-editor`, `video-editor`, editor `SKILL.md`, `runbook.md`, `landmines.md`, `corrections.md`, `src/designs/README.md`, `AGENTS.md` | Daniel: "this edit took a whole day" |
| 2026-09-26 | Team v2: both pipelines end to end; story-editor and video-qc added; editor narrowed; tooling wired | `video-production-team` (rewritten), `video-story-editor`, `video-qc` (agent and skill), `video-editor`, `video-script-writer`, `video-compliance-reviewer`, `video-compliance-review`, editor `SKILL.md` (one line), `AGENTS.md` trigger | Daniel asked for a team to run the whole process |

### Harness: refactor team

**Goal:** the repo wastes less — duplicated recordings, tokens per session, render minutes — measured before and proved after, with Daniel's recordings moved only by a script he runs himself.

**Trigger:** when Daniel asks to refactor, dedupe, audit or speed up this repo ("where are the tokens going", "run the refactor pipeline", "make rendering faster", "did the dedup work"), use the `refactor-team` skill. It runs `architecture-auditor`, `asset-refactorer`, `pipeline-optimizer` and `quality-reviewer` from `.claude/agents/`, measuring with the `repo-audit-tools` skill. A one-line fix needs no team.

**Change log:**
| Date | Change | Files | Why |
|---|---|---|---|
| 2026-09-26 | Initial team | the four agents, `refactor-team`, `repo-audit-tools`, `.claude/settings.json` (Read-deny rules for the emoji, typeface and country JSON blobs) | Five copies of one 273 MB recording across slug folders; nothing measured the token cost of a session |

### Harness: repo and style teams

**Goal:** five teams run the repo's own work (the fifth improves the templates): build from existing resources (1), maintain by finding bugs and gaps (2), find faster and cheaper ways to work (3), and one production team per video style family (4).

**Trigger:** see the table in [AGENTS.md](../../AGENTS.md) ("Harness: repo and style teams"). Rules every team agent reads: [team-ground-rules](team-ground-rules.md). Style ownership: `config/style-teams.json`. Every run is recorded in [team-runs](team-runs.md) (append-only ledger).

**Change log:**
| Date | Change | Files | Why |
|---|---|---|---|
| 2026-10-01 | Maintenance run 3: run ledger `team-runs.md` appended by every team; reviewers get Write and run 2's "prove the checks bite" method; ground rules: five teams, no-render probe, verify before editing; template team A/B/C/D classes and per-group file names; maintenance reads the previous run and keeps a carried-over list | `team-runs.md`, `team-ground-rules.md`, the five team skills, `quality-reviewer`, `video-compliance-reviewer`, `creative-director`, `golden-rules-auditor`, `design-critic`, `template-improver` | Agent files had drifted from what the runs actually did (gap analysis, run 3) |
| 2026-10-01 | Team 5 added: `template-improvement-team` with `golden-rules-auditor`, `design-critic`, `creative-director`, `template-improver`; reuses `quality-reviewer` | the skill, four agents, `check-teams.mjs` | Daniel asked for a creative team experienced in golden rules, logic and design to improve the existing templates |
| 2026-10-01 | Initial four teams. New agents: `resource-scout`, `repo-builder`, `bug-hunter`, `gap-analyst`, `repo-fixer`, `workflow-analyst`, `automation-builder`, six style directors. Reused: `code-architect`, `code-reviewer`, `quality-reviewer`, `architecture-auditor`, `pipeline-optimizer`, the `video-*` crew | the four team skills, `config/style-teams.json`, `scripts/check-teams.mjs` (in `npm test`), `team-ground-rules.md`, six recipes under `style-production-teams/references/` | Daniel asked for teams to build, maintain and speed up the repo and to produce each video style |

`.claude/` also holds 18 other subagents in `.claude/agents/` and 7 skills (accessibility, bun-runtime, codebase-onboarding, error-handling, react-patterns, react-performance, search-first) imported from ECC (see `.claude/ECC.md`), and the `ponytail-review`, `ponytail-audit` and `ponytail-debt` skills from ponytail (see `.claude/PONYTAIL.md`). They run only when asked; AGENTS.md, these docs and the Remotion and owner skills win where they conflict.

When upgrading Remotion, re-vendor the skills so guidance matches the installed version:

```console
node scripts/vendor-skills.mjs   # defaults to ../remotion/packages/skills/skills; pass another source path if needed
```

The default source is a Remotion checkout in a `remotion` folder next to this one (GitHub Desktop clones `danielnguyenfinhub/remotion` there); check out the Remotion version you're upgrading to first. The script copies the skills without their symlinks (which break on Windows checkouts and inflate zip bundles), rewrites sibling-skill links accordingly, and fails if any relative link is broken. Do not copy the skills by hand.

`node scripts/build-chat-skill.mjs` packages `chat-skill/SKILL.md` plus these skills into `remotion-video-skill.zip` for upload to claude.ai (Claude Chat and account-wide Cowork). Rebuild it after re-vendoring.

