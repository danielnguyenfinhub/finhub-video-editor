# Team runs (append-only)

One row per team run, appended in the team's Deliver phase, newest last. Never edit an old row: a later run that reverses something adds its own row. Ids and one-liners only, no client data (ground rule 2). `out/teams/` is git-ignored, so this file is the only record a new session sees. Facts come from `git log` and the run's PR.

| Date | Team | Scope | Outcome | PR | What Daniel must verify |
|---|---|---|---|---|---|
| 2026-10-01 | teams built | four repo teams (build, maintain, efficiency, style production with six style directors); `config/style-teams.json`; `check-teams.mjs` in `npm test` (03b9cca, CRLF fix 67f1e1d) | built | 116 | nothing run yet |
| 2026-10-01 | repo-maintenance run 1 | whole repo | fixed: RG 234 fold (NFC, whitespace), `captionFixes[].to` scanned, listing price guard, explainer bar contrast, doc and manifest drift (47d5712); round 3: one slug validator, research.py host guard, `.gitignore` for `.env*`/`*.pt`, renderers exit 3 when publish copy is refused, promote-design order (0f2f228) | 117, 118 (round 3) | text-size floor (`MIN_TEXT_PX`) was left for Daniel |
| 2026-10-01 | template-improvement build | Team 5 added: `template-improvement-team` and four agents (3fae21b) | built | 118 | nothing run yet |
| 2026-10-01 | template-improvement run 1 | all designs, by style family; no render possible (Google font fetch refused) | A fixes built (d486aad); kinetic A5, blueprint A6, phoneapp A7-A8 reverted after re-check; reports in `docs/audit/templates-2026-10-01/` | 119 | held: faceless data stage scheduler (A0-A11), `theme-exempt` markers, every B and C item, every D ruling; nothing seen on a still; re-run `promote-design.mjs` for changed designs where renders work |
| 2026-10-01 | repo-maintenance run 2 | whole repo | fixed: publish-listing staleness by content hash, sweep `--out` guard, listing compliance fold, `check-spoken-phrases.mjs`, `npm test` on clean Linux, six more checks in `npm test` (4b9e211); sweep `-fps_mode` (333a799) | 120 | not recorded in the commit |
| 2026-10-01 | decisions while Daniel was away | Python checks in CI, text-size ratchet, repo `compliance.ts` canonical, YouTube preview-only (5009bc5) | decided | none (commit 5009bc5) | each decision is his to reverse |
| 2026-10-01 | repo-maintenance run 3 | whole repo; reports `out/teams/maintain/` | fixes in progress | pending | see the run's report |
