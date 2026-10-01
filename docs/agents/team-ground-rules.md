# Ground rules for the five repo teams

Every team agent reads this first. A subagent does not see `AGENTS.md` or the chat, so the rules that matter are here, short.

1. **Lean ladder.** Needed? → already here (`src/showcase`, `.claude/elements/CATALOG.md`, `public/badges/`, `scripts/README.md`)? → an installed `@remotion/*` package does it? → only then new code. Mark a shortcut `// ponytail: <limit>, <when to upgrade>`.
2. **Public repo.** No client names, figures, documents, keys or voice profiles in any file, report or commit. Reports go in `out/teams/<team>/` (git-ignored).
3. **Recordings are never moved or deleted** by an agent. `scripts/migrate-assets.py --apply`, run by Daniel, is the only mover.
4. **Shortest diff.** Fix what the finding says; no drive-by rewrites. Users edit files between sessions: a surprising diff is intentional.
5. **Prove it.** `npm run lint` and `npm test` before reporting a code change done; for a render-affecting change, a still (`npx remotion still … --scale=0.5`) not a full render. Quote the command and its last lines. No render here? Probe first (`docs/agents/rendering-without-gpu.md`, "Probe first"); if the probe fails, audit and critique from code and previews, mark every look claim "not viewed", and list the stills for Daniel.
6. **Check before asserting.** A claim about the repo cites a file and line, a command's output, or says "unverified". Never invent a number, flag or API: grep `docs/findings.md` or the installed package. Verify every finding you are handed against the code before editing; if it is wrong, skip it with the reason.
7. **Scripts index.** A new file in `scripts/` gets a line in `scripts/README.md` (`check-scripts-index.mjs` fails otherwise). A new agent or skill is registered by `node scripts/check-teams.mjs` passing.
8. **Videos are bilingual** (Vietnamese + English, real diacritics, NFC). RG 234 words stay out of on-screen copy. The golden rules in `src/designs/README.md` are locked.
9. **Corrections loop.** A repeated or "always/never" lesson goes to `.claude/skills/vietnamese-finance-video-editor/references/corrections.md`, promoted to a check where it can be measured.
10. **Report shape.** First line: `done`, `partly done` or `blocked`, then findings with evidence, then what Daniel must verify. A subagent returns its report path and a five-line summary, not the report.
