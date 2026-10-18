---
name: upgrade-team
description: >-
  Team 8. Upgrades finhub-video in one run: finds bugs and gaps in this repo, mines the sibling repos
  cloned next to it (Scrapling, Agent-Reach, paperclip, harness, harness-100, remotion, remocn,
  OpenMontage, claude-video) for capability worth porting, verifies every candidate against the code,
  lets Daniel pick from one ranked backlog, then builds, fixes and independently reviews the picks.
  Use when Daniel says "upgrade the repo", "what's missing and what can we take from the other repos",
  "add missing features and fix gaps", "mine the sibling repos", "run the upgrade team", "team 8",
  or follows one up ("re-run the sibling scan", "only Scrapling this time", "build U3 only",
  "continue the upgrade run", "redo the review"). NOT for: bugs alone (repo-maintenance-team), one
  known build request (repo-build-team), template looks (template-improvement-team), speed or token
  cost (dev-efficiency-team), editing a video (video-production-team).
---

# Upgrade team (Team 8)

**User story:** Daniel says "upgrade the repo" and gets one ranked backlog: real bugs, real gaps and features from the sibling repos, each proven against the code with its licence and payback per video. He picks; the picks come back built, reviewed and tagged with what only his PC can prove.

Ground rules: `docs/agents/team-ground-rules.md` (every prompt says "read it first"). Sibling repos, licences and focus questions: `references/sibling-repos.md`.

**Local only.** Videos are edited and rendered on Daniel's PC (the `finhub-video` MCP server and the plugin run there). A cloud session proves a change with lint, tests and at most `--scale=0.5` stills; anything needing a full render, footage, WebGPU matting or a cloned voice is tagged `verify on PC` in the backlog and in the PR. No step uploads footage, calls a cloud render or posts anything.

## The team

| Agent (`.claude/agents/`) | Does | Model |
|---|---|---|
| `bug-hunter` | runs the repo's checks and greps, reproduces each bug | opus (its file) |
| `gap-analyst` | what this repo lacks, ranked by payback per video | opus (its file) |
| `sibling-repo-analyst` | one per sibling repo: what it has worth porting, with licence | opus: cross-repo judgement |
| `resource-scout` | reuse map for a picked port | sonnet (its file) |
| `code-architect` | blueprint for a port that is more than a copy | its file |
| `repo-builder` | builds a picked port or feature | its file |
| `repo-fixer` | fixes picked bugs and gaps | its file |
| `security-reviewer` | any change that fetches from the network, scrapes, or touches `mcp/` | its file |
| `quality-reviewer` | independent PASS / FIX / BLOCK on everything built | its file |

Verifiers in Phase 2 are the built-in `general-purpose` type with a schema (single use, no agent file), on sonnet: "does the code say this?" is a scripted check.

**Execution mode: mixed.** Phases 1-2 are one Workflow (a fixed list of finders, each candidate checked by two refuters: code decides the flow). Phase 3 is Daniel. Phases 4-5 are subagents one item at a time (builders touch overlapping files; the reviewer must start clean).

## Phase 0 — Scope (main session)

1. `git status`; `node scripts/sandbox-facts.mjs` once, its table (`out/teams/sandbox-facts.md`) goes in every prompt.
2. If the last `docs/agents/team-runs.md` row is `in progress` / `pending`, replace it with the facts from `git log` (the ledger's own rule) before adding this run's row.
3. Read `docs/agents/open-decisions.md` row titles: an item waiting on Daniel is not re-proposed.
4. Which run is this?
   - `out/teams/upgrade/` missing → new run, all repos in `references/sibling-repos.md` that exist on disk.
   - present and Daniel names a part ("only Scrapling", "build U3", "redo the review") → re-run that phase or item only.
   - present and a new request → move it to `out/teams/upgrade_prev/`, new run; closed ids from the previous `02_backlog.md` go in every prompt.
   - a Workflow `runId` from this session and the script unchanged → `resumeFromRunId`.
5. Scope default: whole repo, every sibling repo. "Quick" = two sibling repos Daniel names, no bug-hunter.

## Phases 1-2 — Find and verify (Workflow)

Invoking this skill is Daniel's opt-in to the Workflow tool. Pass `args`:
`{ repos: ["Scrapling", ...], withRepoFinders: true, facts: "<sandbox-facts table>", closed: ["B3", ...] }`.

```js
export const meta = {
  name: 'upgrade-team-find',
  description: 'Find bugs, gaps and sibling-repo features for finhub-video; verify each against the code',
  phases: [{ title: 'Find' }, { title: 'Verify', model: 'sonnet' }],
}
const CANDIDATES = {
  type: 'object',
  properties: {
    report: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partly done', 'blocked', 'skipped'] },
    candidates: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, kind: { type: 'string', enum: ['bug', 'gap', 'port'] },
      title: { type: 'string' }, evidence: { type: 'string' }, gapHere: { type: 'string' },
      licence: { type: 'string' }, effort: { type: 'string', enum: ['small', 'medium', 'large'] },
      payback: { type: 'string' }, runs: { type: 'string' },
    }, required: ['id', 'kind', 'title', 'evidence', 'gapHere', 'effort', 'payback', 'runs'] } },
  },
  required: ['report', 'status', 'candidates'],
}
const VERDICT = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, why: { type: 'string' } },
  required: ['refuted', 'why'],
}
const common = `Read docs/agents/team-ground-rules.md first. Sandbox facts:\n${args.facts}\nClosed ids, do not re-find: ${(args.closed || []).join(', ') || 'none'}.\nWrite reports under out/teams/upgrade/. Return your candidates in the schema; the report path in "report".`
const finders = [
  ...(args.withRepoFinders ? [
    { label: 'bug-hunter', agentType: 'bug-hunter', prompt: `${common}\nScope: whole repo. Report: out/teams/upgrade/01_bugs.md. Candidates are reproduced bugs, kind "bug", ids B<n>, licence "n/a".` },
    { label: 'gap-analyst', agentType: 'gap-analyst', prompt: `${common}\nReport: out/teams/upgrade/01_gaps.md. Candidates are gaps, kind "gap", ids G<n>, licence "n/a".` },
  ] : []),
  ...args.repos.map((r) => ({ label: `sibling:${r}`, agentType: 'sibling-repo-analyst', prompt: `${common}\nYour repo: ${r} (row "${r}" in .claude/skills/upgrade-team/references/sibling-repos.md). Candidates are kind "port".` })),
]
phase('Find')
const results = await pipeline(
  finders,
  (f) => agent(f.prompt, { label: f.label, phase: 'Find', agentType: f.agentType, schema: CANDIDATES }),
  (found, f) => {
    if (!found) { log(`${f.label}: no result (failed or skipped)`); return null }
    return parallel(found.candidates.map((c) => () =>
      parallel([1, 2].map((n) => () => agent(
        `Try to refute this ${c.kind} finding for the finhub-video repo (cwd). Open the cited files and lines yourself; refuted=true if the evidence is wrong, the feature already exists here, the licence forbids what is proposed, or you cannot confirm it. Default to refuted=true when unsure.\n${JSON.stringify(c)}`,
        { label: `verify:${c.id}#${n}`, phase: 'Verify', agentType: 'general-purpose', model: 'sonnet', schema: VERDICT })))
        .then((vs) => ({ ...c, from: f.label, report: found.report, votes: vs.filter(Boolean),
          confirmed: vs.filter(Boolean).filter((v) => !v.refuted).length === 2 }))))
  },
)
const all = results.filter(Boolean).flat().filter(Boolean)
log(`${finders.length - results.filter(Boolean).length} finder(s) returned nothing; ${all.length} candidates checked`)
return { confirmed: all.filter((c) => c.confirmed), dropped: all.filter((c) => !c.confirmed).map((c) => ({ id: c.id, why: c.votes.map((v) => v.why) })) }
```

Two of two refuters must fail to refute for a candidate to stand: a port costs Daniel review time, so a 1-1 split is dropped and listed with both reasons.

## Phase 3 — Gate (main session)

Write `out/teams/upgrade/02_backlog.md`: confirmed candidates ranked by payback per video, ids `U1..Un` mapped to their source ids, columns `U | source id | kind | title | licence | effort | payback | runs / verify on PC`; then the dropped list with reasons. Show Daniel the top ten with AskUserQuestion (multi-select). **Bugs that break a render or a compliance guard go to the fixer without asking** (as Team 2). Ports with an AGPL, GPL or no-licence source are idea-only: the builder writes it fresh and says so in the file header. Nothing else is built without his pick.

## Phase 4 — Build and fix (subagents, one item at a time)

| Kind | Route |
|---|---|
| bug, small gap | `repo-fixer` with the U id and its evidence |
| port, feature | `resource-scout` → (`code-architect` if more than a copy) → `repo-builder` |
| template look | hand to `template-improvement-team`; this team does not edit designs |

Every builder prompt carries: the U id, the source evidence, the licence rule, "local only: prove with lint, tests and half-scale stills; list what needs a render as verify on PC", and "a new script gets a `scripts/README.md` line; a new agent goes in `.claude-plugin/plugin.json` `agents`". A port records its origin in the file header (repo, path, licence).

## Phase 5 — Review (subagents, clean start)

`quality-reviewer` on everything built; `security-reviewer` too when a change fetches from the network, scrapes, or touches `mcp/`. FIX → back to the builder once, then a lighter re-review of that delta; a second FIX or any BLOCK → Daniel, in plain words. Verdicts in `out/teams/upgrade/04_review.json`.

## Phase 6 — Deliver (main session)

`npm run lint`, `npm test` (and `npm run test:py` if Python changed), last lines quoted. Append the ported features as a dated section of `docs/audit/sibling-repos-review.md`. Append the `docs/agents/team-runs.md` row (date, team, scope, outcome, PR, what Daniel must verify, including every `verify on PC` item) and fill it in before the run ends. Change-log line in `docs/agents/skills-and-harnesses.md` only if a team file changed. Commit, push, draft PR.

## Data passing

| From → to | How |
|---|---|
| finders → verifiers → Phase 3 | Workflow structured return (`CANDIDATES`, `VERDICT` schemas) |
| finders' detail | files `out/teams/upgrade/01_*.md` |
| Daniel's picks → builders | `02_backlog.md` plus the U ids in the prompt |
| builders → reviewer | `03_build_<U>.md` (diff summary, commands run, last lines) |
| reviewer → main | `04_review.json` |

## Errors

| Situation | Action |
|---|---|
| A finder returns nothing | Logged by the script; the backlog says which repo or finder is missing; retry it once alone |
| A sibling repo is not cloned | The analyst reports `skipped: not cloned`; say so; on his PC GitHub Desktop clones it next to this repo |
| Usage limit, auth or permission failure | Do not retry; record what finished (open the reports), tell Daniel, with the reset time for a limit |
| Licence forbids copying | Idea only, written fresh; never paste the source |
| Change needs a render to prove | Build it, prove what tests can, tag `verify on PC`; never call it done |
| Builder would loosen a check | Refuse; the check stays (Team 2 rule) |
| Client data in a report | Stop; path only |

## Test scenarios

- **Normal:** "upgrade the repo, only Scrapling and remocn" → Workflow with two analysts and no repo finders → each candidate twice-verified → backlog of, say, 4 → Daniel picks U2 (a remocn transition) → scout finds it partly in the catalog → builder adds it with a half-scale still → quality-reviewer PASS → ledger row, PR, "verify on PC: none".
- **Error:** paperclip is not cloned and the bug-hunter hits a usage limit → script logs one finder missing; backlog says "paperclip: not cloned; bug-hunter: usage limit, resets at …"; no retry of the limit; the rest of the run goes on.

## Trigger checks

Should fire: "upgrade the repo" · "what can we take from the sibling repos" · "add what's missing and fix the gaps" · "mine Scrapling and Agent-Reach for us" · "run team 8" · "continue the upgrade run" · "re-run the sibling scan" · "build U3 from the backlog" · "is there anything in remocn we don't have yet" · "improve the editor using the other repos".
Should not fire: "check the repo for bugs" (Team 2) · "add a design for rate moves" (Team 1) · "make the cards better" (Team 5) · "why did that render take so long" (Team 3) · "edit my video" (video-production-team) · "blog post from this video" (repurpose) · "YouTube title" (yt-) · "refactor the recordings folder" (refactor-team) · "install the plugin" (docs/agents/plugin-and-mcp.md) · "what does Scrapling do" (answer directly).
