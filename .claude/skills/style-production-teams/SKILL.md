---
name: style-production-teams
description: >-
  Team 4. A production team for each video style. Routes a video to the team that owns its style
  - talking-head data, talking-head story, faceless data and news, faceless explainer, YouTube 16:9,
  or Global RE listing - where a style director writes the design brief and the shared builder, QC
  and compliance agents make the video. Use when Daniel says "which team makes this", "make a
  <style> video" (kinetic, classic, ticker, whiteboard, cards, newsroom, a listing...), "make these
  three videos", "batch of videos", "run the style team", "team 4". For one ordinary video with no
  style preference, video-production-team already runs it end to end; use this skill when the style
  matters or several videos are in play. NOT for repo changes (teams 1-3) or footage-free rate
  alerts.
---

# Style production teams (Team 4)

**User story:** Daniel names a style, or a batch of videos, and each video goes to the team that knows that style's limits, failure modes and pipeline; he decides only at the gates `video-production-team` already has (script lock in B, a wrongly spoken number in A, posting).

Pattern: expert pool, then the existing production pipeline. The registry is `config/style-teams.json` (every design is in exactly one team; `node scripts/check-teams.mjs` enforces it). Ground rules: `docs/agents/team-ground-rules.md`.

## The team

Six style teams share one build crew. Style knowledge lives in the director and its recipe; the crew does the work.

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `talkinghead-data-director` | brief for classic, datalab, series, studio, cards, newsroom, scenario | `references/talkinghead-data.md` |
| `talkinghead-story-director` | brief for editorial, explainer, chatstory, kitchen, checklist, neon, reaction | `references/talkinghead-story.md` |
| `faceless-data-director` | brief for bigdigit, flash, gauge, pulse, ticker, scale, receipt, calendar, timelapse, splitscreen, flipcard | `references/faceless-data.md` |
| `faceless-explainer-director` | brief for blueprint, faceless, isometric, journey, kinetic, orbit, paper, phoneapp, retro, whiteboard | `references/faceless-explainer.md` |
| `youtube-director` | brief for base, ytstudio, ytslides, ytdashboard, ytcinema, ytsidebar (1920x1080) | `references/youtube-16x9.md` |
| `listing-director` | brief for ListingReel (Global RE) | `references/listing.md` |
| `video-script-writer` | faceless scripts, written to the director's card limits (B) | `references/faceless-script.md` |
| `video-story-editor` | paper edit of Daniel's footage (A) | editor skill, Step 2 |
| `video-editor` | builds and renders from the locked words and the brief | `vietnamese-finance-video-editor` |
| `video-qc` | independent technical QC | `video-qc` skill |
| `video-compliance-reviewer` | independent compliance check (RG 234; listing rules for Global RE) | `video-compliance-review` skill |

**Execution mode: subagents.** Directors are an expert pool: only the matching one runs. The crew, the gates and the runbook step ownership are exactly `video-production-team`'s; this skill adds the director before the build and does not copy that skill. Agent files register at session start; if one isn't found use `general-purpose` with "Read and adopt `.claude/agents/<name>.md`".

A subagent sees neither this chat nor `AGENTS.md`: put the slug, pipeline, team, recipe path, brief path, `--public-dir` if media lives outside the repo, and Daniel's words in its prompt.

## Phase 0 — Route

Run `node scripts/sandbox-facts.mjs` once at the start and pass its short table (`out/teams/sandbox-facts.md`, about 300 tokens) in every subagent prompt (not a re-explanation); agents probe only what it says is unprobed (ground rule 5).

1. A style Daniel named → look it up in `config/style-teams.json` (`styles` arrays). No style named → run `node scripts/brief.mjs <slug>` then `node scripts/select-template.mjs <slug>`, and take the top pick's team. A YouTube request or a Global RE listing folder routes by the request, not the selector (the selector reads `src/designs` only).
2. Several videos → group by team; run each group's directors in one message (one Agent call per video), then the crew per video using `video-production-team`'s own sequencing. Never run two renders at once.
3. `npm run video-status` for where each run stands; a run already past the design step skips to the phase that owns Daniel's follow-up.

## Phase 1 — Director

Run the team's director with the slug, pipeline and recipe path. Outcomes:

- `ready` → `out/teams/style/<slug>/design_brief.md` is the brief for the build.
- `wrong_team` → re-route to the team it names, once. A second `wrong_team` goes to Daniel with both reasons.
- `blocked` → relay the reason in plain words.

For a faceless team, give the director's card limits to `video-script-writer` before it writes (the script is written to them, not trimmed later).

## Phase 2 — Produce

Invoke the `video-production-team` skill's flow from the step after design selection, passing the brief as the design decision: its Phase 0, prep, paper edit or script, compliance, script lock, voice (the orchestrator holds the paid-call gate), build, QC ‖ compliance, render, verify list. For Global RE use `globalre-listing-video`'s pipeline instead, with `video-qc` and a compliance review briefed with the real-estate rules.

## Phase 3 — Learn

Daniel's corrections go to `corrections.md` under the design id as scope (the editor's rule), and the recipe for that team gets the failure mode once it repeats. Report what was logged. Append a row to `docs/agents/team-runs.md` (date, team, scope, outcome, PR or `pending`, what Daniel must verify). Fill in the row's outcome at the end of the run, not left `in progress` (`check-teams.mjs` fails on an open row that is not the last).

## Files

`out/teams/style/<slug>/design_brief.md` (director); everything else is `video-production-team`'s own run folder.

## Errors

| Situation | Action |
|---|---|
| A style is in no team or two | `check-teams.mjs` fails; fix the registry before routing |
| Director picks outside its team | Not allowed; it returns `wrong_team` |
| Selector top pick is "unproven" (not promoted) | Use it only if Daniel asked; else take the best promoted one and say so |
| Two videos want the same render slot | Queue them; one render at a time |
| Client data in any file | Stop; path only |

## Test scenarios

- **Normal:** "make the RBA decision video, kinetic" → registry: `faceless-explainer` → director confirms `kinetic` fits, brief written with 60-character cards → script written to those limits → compliance PASS → Daniel locks → voice → build → QC ‖ compliance PASS.
- **Wrong team:** footage about a stamp-duty change routed to `talkinghead-story` → director finds mostly numbers → `wrong_team: talkinghead-data` → re-routed once.
- **Batch:** three recordings, two data-led and one story → two `talkinghead-data-director` runs in one message and one story run, then three builds one after the other.
