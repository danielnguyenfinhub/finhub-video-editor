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

**Trigger:** see the table in [AGENTS.md](../../AGENTS.md) ("Harness: repo and style teams"). Rules every team agent reads: [team-ground-rules](team-ground-rules.md). Style ownership: `config/style-teams.json`. Every run is recorded in [team-runs](team-runs.md) (append-only ledger). Decisions waiting on Daniel, with defaults: [open-decisions](open-decisions.md).

**Change log:**
| Date | Change | Files | Why |
|---|---|---|---|
| 2026-10-02 | Efficiency run 1 (builder B): the previous maintenance run is read by section (unfixed / carried-over lines, ledger row, gap titles), not whole; gap-analyst greps D-ruling rows instead of reading the concept reports; video-qc reads `words.json` through `jq`; New design reads only the "Craft rules" section of `editing-principles.md` and the remocn index; ground rule 5 and every team Phase 0: run `sandbox-facts.mjs` once and pass its summary; efficiency team: stills do render here, a second lighter review after FIX, prefer a handshake over a sleep in race tests; OD-22 to OD-26 | `team-ground-rules.md`, the five team skills, `gap-analyst`, `bug-hunter`, `video-qc`, editor `SKILL.md` and `toolkit.md`, AGENTS.md read list, `open-decisions.md`, `team-runs.md` | Baseline: up to 38,937 tokens per maintenance run re-reading the previous run, up to 73,936 per QC words.json read, sandbox facts re-explained in 28 of 32 reports (`out/teams/efficiency/01_baseline.md`) |
| 2026-10-02 | Efficiency run 1 (builder A, and the stale copy): `npm test` ~66.5 s -> ~42 s (re-measured by the reviewer; check-publish race once with a handshake instead of a sleep, check-preflight second case uses the clean stub); temp folders removed on process exit (`scripts/tmp-dir.mjs`, prune after 6 h; was 375 MB left per run); `check-schema` accepts `FINHUB_BROWSER`/`FINHUB_CHROME_MODE` so it runs with an installed browser; `scripts/sandbox-facts.mjs`; chat-skill bundle fixed (140 entries); deny rule for the four `country-meta.json` copies; `video-status` resolver fix; the stale `.agents/skills/remocn` copy removed (one import line different from `.claude/skills/remocn`; `USAGE.md` repointed) | `scripts/tmp-dir.mjs`, `check-tmp-dir.mjs`, `check-publish.mjs`, `check-preflight.mjs`, `check-schema.mjs`, `sandbox-facts.mjs`, `build-chat-skill.mjs`, `video-status.mjs`, `.claude/settings.json`, `.agents/` (removed) | Daniel asked to continue; Team 3's first run, measured by the workflow analyst and the auditor, re-measured by an independent reviewer |
| 2026-10-01 | Maintenance run 4: a team fills in its ledger row at the end (`check-teams.mjs` fails on an open row that is not the last); maintenance Errors table: a check whose own tool failed may warn if a later step re-checks it, and post-review commits get their own review; `gap-analyst` and `bug-hunter` read the previous run; `open-decisions.md` added | the five team skills, `team-runs.md`, `check-teams.mjs`, `gap-analyst`, `bug-hunter`, `open-decisions.md`, `team-ground-rules.md` | Run 3's row was left open and two CI commits went in unreviewed (gap analysis, run 4) |
| 2026-10-01 | Maintenance run 3: run ledger `team-runs.md` appended by every team; reviewers get Write and run 2's "prove the checks bite" method; ground rules: five teams, no-render probe, verify before editing; template team A/B/C/D classes and per-group file names; maintenance reads the previous run and keeps a carried-over list | `team-runs.md`, `team-ground-rules.md`, the five team skills, `quality-reviewer`, `video-compliance-reviewer`, `creative-director`, `golden-rules-auditor`, `design-critic`, `template-improver` | Agent files had drifted from what the runs actually did (gap analysis, run 3) |
| 2026-10-01 | Team 5 added: `template-improvement-team` with `golden-rules-auditor`, `design-critic`, `creative-director`, `template-improver`; reuses `quality-reviewer` | the skill, four agents, `check-teams.mjs` | Daniel asked for a creative team experienced in golden rules, logic and design to improve the existing templates |
| 2026-10-01 | Initial four teams. New agents: `resource-scout`, `repo-builder`, `bug-hunter`, `gap-analyst`, `repo-fixer`, `workflow-analyst`, `automation-builder`, six style directors. Reused: `code-architect`, `code-reviewer`, `quality-reviewer`, `architecture-auditor`, `pipeline-optimizer`, the `video-*` crew | the four team skills, `config/style-teams.json`, `scripts/check-teams.mjs` (in `npm test`), `team-ground-rules.md`, six recipes under `style-production-teams/references/` | Daniel asked for teams to build, maintain and speed up the repo and to produce each video style |
| 2026-10-03 | Review pack (maintenance gap 2): Phase 3 picks come from `scripts/review-pack.mjs` (a sheet per family, the frames and questions per design, then the promote commands) | `template-improvement-team` SKILL.md, `scripts/review-pack.mjs` | Daniel: "Build the review pack" |

`.claude/` also holds 18 other subagents in `.claude/agents/` and 7 skills (accessibility, bun-runtime, codebase-onboarding, error-handling, react-patterns, react-performance, search-first) imported from ECC (see `.claude/ECC.md`), and the `ponytail-review`, `ponytail-audit` and `ponytail-debt` skills from ponytail (see `.claude/PONYTAIL.md`). They run only when asked; AGENTS.md, these docs and the Remotion and owner skills win where they conflict.

When upgrading Remotion, re-vendor the skills so guidance matches the installed version:

```console
node scripts/vendor-skills.mjs   # defaults to ../remotion/packages/skills/skills; pass another source path if needed
```

The default source is a Remotion checkout in a `remotion` folder next to this one (GitHub Desktop clones `danielnguyenfinhub/remotion` there); check out the Remotion version you're upgrading to first. The script copies the skills without their symlinks (which break on Windows checkouts and inflate zip bundles), rewrites sibling-skill links accordingly, and fails if any relative link is broken. Do not copy the skills by hand.

`node scripts/build-chat-skill.mjs` packages `chat-skill/SKILL.md` plus the `remotion-best-practices` router and the guides inside it (140 entries, under the 200 limit; the standalone copies are left out, and `browser-transcription.md` and `video-matting.md` exist only as standalone skills, so the bundle lacks them: see OD-22) into `remotion-video-skill.zip` for upload to claude.ai (Claude Chat and account-wide Cowork). Rebuild it after re-vendoring.

