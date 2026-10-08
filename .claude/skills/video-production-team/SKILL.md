---
name: video-production-team
description: >-
  Runs Finance Hub's whole video production process end to end with a team of agents, for both
  pipelines: A, editing Daniel's own footage (talking-head or several takes), and B, a faceless
  video from a document or topic. Intake, marketing review and plan, paper edit or script,
  visual plan, compliance, build, QC, render and a verify list; Daniel decides only at the gates.
  ALWAYS use when Daniel says: "edit my video", "I recorded a video about…", "make a video from
  this document", "faceless video about…", "what should I make a video about", "run the video
  team", "what's wrong with my video", "plan the edit"; and for follow-ups: "redo the paper edit /
  marketing review / visual plan", "too many effects", "re-run QC", "fix what QC or compliance
  flagged", "redo the script only", "update the video from the last run". NOT for rate-alert
  reels, branding an existing clip, a compliance check of a script alone, or repo refactors.
---

# Video production team

**User story:** Daniel hands over a recording or a document and gets back a finished, QC'd,
compliance-checked video and one verify list, having decided only at the gates: the script
lock (B), a wrongly spoken number (A), and posting (both). For his own footage the team first
watches the talk as a viewer, plans the edit around the one message it must land, and puts every
effect on screen for a stated reason (`purposeful-motion`); the background is removed only from
the footage that survives the cut.

The process is `vietnamese-finance-video-editor/references/runbook.md`. Every step id below
(0.3, A2.2, B5.3 …) is a runbook row: read the row for its command and gate. This skill only
says who runs each step, in what order, and where the run stops. It never copies the runbook.

## The team

| Agent (`.claude/agents/`) | Runbook steps | Standard |
|---|---|---|
| `marketing-manager` | A2.0: watches the raw talk, message, strengths and weaknesses, clarity map, production plan | this skill, `purposeful-motion` (purposes) |
| `video-script-writer` | B1.1–B1.4, B2.1–B2.3 | `vietnamese-finance-video-editor/references/faceless-script.md` |
| `video-story-editor` | A1.2 `clips.json` (kept spans), A2.1–A2.4 | editor skill, Workflow Step 2 |
| `motion-designer` | A3.5: the visual plan, one purpose and element per beat | `purposeful-motion` |
| `video-editor` | A3, A4 (from the plan), A5.3, A6.1, A7.1, A7.3; B4, B5.1, B5.4 | `vietnamese-finance-video-editor` |
| `video-qc` | A5.1–A5.2, A6.2–A6.3 (+ plan trace), A7.2; B5.2 | `video-qc` skill |
| `video-compliance-reviewer` | B2.4, A6.4, B5.3 | `video-compliance-review` skill |

A style director from `style-production-teams` joins only when Daniel names a style or several
videos are in play; the marketing manager's plan then names it as the owner of the brief.

You (the orchestrator) run Phase 0, prep (A1.1), the assembly (A1.2), the matte request (A1.3),
voicing (B3, because it is the paid call and you hold the cost gate), every gate, and delivery.
You do no editing, reviewing or planning yourself: the marketing manager plans, you assign.

**Execution mode: sub-agent delegation (Mode C), a pipeline of one-shot agents** (Agent tool,
`subagent_type` = agent name; pass no `model`, so each agent's own `model:` applies), with two
parallel fan-outs: in A the motion designer plans while Daniel's matte renders, and in both
pipelines QC and final compliance review the same build at the same time (one message, two Agent
calls). Not a persistent team, because the flow stops for Daniel mid-run and both reviewers
(`video-qc`, `video-compliance-reviewer`) must judge the artefacts from a clean context, not the
builder's reasoning. Agents report to you; you relay questions to Daniel. **Target surface:
Claude Code** (Agent tool). In Claude chat or Cowork there is no Agent tool: run the same steps in
this context in order, writing each role's file yourself under its name, and say so in `00_intake.md`.

## Delegation gate

- Independent units and hand-offs: A2.0 review → A2 paper edit (`01_marketing_review.md` → `01_story_edit.json`, `clips.json`) → A1.2 assembly → A1.3 matte ‖ A3.5 plan (`02_visual_plan.json`) → A4 build (`03_editor_report.json`) → QC ‖ compliance (`04_*.json`) → render → render QC (`05_qc_render.json`). Pipeline B as before.
- What splitting buys: a separate context per judgement (viewer, cutter, designer, builder, two independent reviewers) so no one marks their own work; parallel speed only for the two fan-outs.
- Write ownership: the Writers table below; every role writes its own `team/` file and the runbook files its rows name, nothing else.
- Tools: each agent file's `tools:` line; reviewers have no Edit; all run on Claude Code.
- Synthesis and acceptance: you, at each gate and at delivery; a stage is accepted when its file exists, parses, and its `STATUS` line is `done` (a `partly done` or `blocked` is carried as such, never papered over).
- Partial, blocked, conflicting: the Errors table; two reviewers disagreeing go to Daniel with both verdicts.
- Outcome: **delegate** (Daniel asked for this team). Risk stated: the marketing manager's plan is advisory to the pipeline order; it adds instructions to the fixed steps, it does not reorder gates.

## Writers

| Batch | Role | Writes | Label | Wanted | Mechanism or reason |
|---|---|---|---|---|---|
| 1 | marketing-manager | `out/videos/<slug>/team/01_marketing_review.md`, `out/videos/<slug>/team/mm/**` | serialised | serialised | |
| 2 | video-story-editor | `public/videos/<slug>/edit.json` (`notes`, `remove`, `captionFixes`), `public/videos/<slug>/clips.json`, `out/videos/<slug>/team/01_story_edit.json` | serialised | serialised | |
| 3 | motion-designer | `out/videos/<slug>/team/02_visual_plan.json` | serialised | serialised | the matte running beside it is Daniel's browser, not a writer agent |
| 4 | video-editor | `public/videos/<slug>/edit.json` (design, hook, stats, cues, chapters, visuals, post), `out/videos/<slug>/**` except `team/0[1245]_*`, `out/videos/<slug>/team/03_editor_report.json` | serialised | serialised | |
| 5 | video-qc | `out/videos/<slug>/team/04_qc_stills.json`, `out/videos/<slug>/team/05_qc_render.json`, `out/videos/<slug>/team/qc/**` | advisory | advisory | disjoint files; no path hook exists in this repo |
| 5 | video-compliance-reviewer | `out/videos/<slug>/team/02_compliance_script.json`, `out/videos/<slug>/team/04_compliance_final.json` | advisory | advisory | disjoint files; no path hook exists in this repo |

Agent files register at session start. If an agent type isn't found (files added mid-session),
use `subagent_type: "general-purpose"` and begin the prompt "Read and adopt
`.claude/agents/<name>.md` as your role"; give reviewers only the tools their file lists.

A subagent sees neither this chat nor `AGENTS.md`. Its prompt carries: slug, pipeline, recording id, the runbook step
ids it owns, file paths, `--public-dir` if media lives outside the repo, and Daniel's words verbatim. Agents grep
their runbook rows (Grep tool, pattern `^\| A2\.`) and never read the runbook whole (24 KB).

**Models, by the work, not the rank:** opus for the four roles that judge meaning, money or design (story-editor,
script-writer, editor, compliance: the hard ceiling); sonnet for `video-qc`, whose checks are scripts plus looking at
stills. Haiku can't load this repo's tool list; never use it here.

**Tooling check.** A runbook row tagged **[BUILD WPn]** runs as written when its script exists
(`ls scripts/<name>`; `library.mjs resolve` needs the `resolve` command in its header); only if
it doesn't, the agent follows that row's *Until built* line and says so in its report.

## Phase 0 — Intake (runbook 0.1–0.5)

1. **0.1** `git status`. Uncommitted work → stop and tell Daniel.
2. **0.2** Pipeline: footage → **A**; document or topic → **B**. One line.
3. **0.3** Slug (kebab-case ASCII) and, for A, the recording id. Check `out/videos/<slug>/team/`:
   none → **new run**; exists and Daniel wants one part changed → **partial re-run** (table
   below); exists and new footage or document for the same slug → move it to `team_prev/`, new run.
4. **B only, B1.1 up front:** document name and date; older than ~3 months → warn; "broker use
   only" → ask about public use; a person, address, account or client figure → **stop the run**.
5. **0.4–0.5** You read only this skill and the runbook rows in play. Cost plan: sources, topic, paid calls with US$.
6. Write `team/00_intake.md` with all of the above. **A:** ask Daniel now to start the matte
   (below), unless `foreground.webm` exists.

## Pipeline A — edit footage

Order matters: the review comes before any cut, the matte after the cut, the plan before the build.

1. **Prep (A1.1)** in the background; several takes: prep each take the same way first. Run
   `node scripts/sandbox-facts.mjs` once; its table goes into every agent prompt.
2. **Clean-clip report (A1.2b):** `node scripts/clean-clip.mjs <slug>`; show Daniel the summary. Do **not** ask for
   the matte yet.
3. **Marketing review (A2.0):** `marketing-manager` → `team/01_marketing_review.md` and its JSON. `blocked` (client
   data) → stop. Its `plan` rows become the instructions you paste, verbatim, into each later agent's prompt under
   "Your task from the production plan"; its `compliance_notes` go to the compliance reviewer's prompt. Show Daniel
   the message line and the plan table (no gate; he can redirect in one message).
4. **Paper edit, pass `cuts` (A2.1–A2.4):** `video-story-editor` with the review → `team/01_story_edit.json`.
   - `flags` not empty (a wrongly spoken number, a meaning-changing cut) → **gate: stop for Daniel** with each
     flag's timestamp and quote; pass his answer back. Unsure words alone don't stop the run; they go to the verify list.
   - `clips` is a path (kept spans; `kept_ratio` < 0.9 or several takes) → **assembly (A1.2):**
     `python scripts/prep-video.py <slug> --clips public/videos/<slug>/clips.json`, then the story editor again, pass
     `words`, on the assembled words. `clips` is `none` → the recording stays as prepped.
5. **Matte (A1.3) ‖ visual plan (A3.5).** Now ask Daniel: "Please run `npm run review`, open
   `http://localhost:4100/matte.html?slug=<slug>` in the Claude app browser and leave it until it says Saved (about 13×
   the kept footage's length)." The page mattes the assembly when one exists. Don't wait. In the same breath run the
   template pick if Daniel named none (`node scripts/select-template.mjs <slug>`, A3.1–A3.2 as the editor would; the
   editor keeps A3.3–A3.4) and spawn `motion-designer` → `team/02_visual_plan.json`. `open_questions` naming an
   element no design has → show Daniel the beat and its fallback; the fallback is built unless he says otherwise.
6. **Build (A3.3–A3.4, A4 from the plan, A5.3, A6.1):** `video-editor` → `team/03_editor_report.json` with its
   `plan_trace`. Check for `foreground.webm` before step 8; still missing → ask once more, then wait.
7. **Review, in parallel:** `video-qc`, stage `stills` (incl. the plan trace) → `team/04_qc_stills.json`, and, only
   if Daniel asked for it, the marketing review listed a compliance note, or the video states a rate or a number
   claim taken from a document, **compliance (A6.4)**: `video-compliance-reviewer`, stage `final` →
   `team/04_compliance_final.json`. Both in one message. FIX/BLOCK loop below; a plan finding goes to the designer,
   the editor rebuilds that beat.
8. **Render once** (below): matte present → `video-editor` (A7.1, A7.3).
9. **Post-render QC:** `video-qc`, stage `render` (A7.2) → `team/05_qc_render.json`.
10. **Deliver** (A7.4, below). **Gate: Daniel approves before posting.**

Quick mode (`"background": "vignette"`, Daniel's choice) skips the matte in step 5 and nothing else.

## Pipeline B — faceless from a document or topic

0. **Research (B1.0), only for a topic with no document or "what's trending?":**
   `video-script-writer` runs `scripts/research.py` and returns `topics` → Daniel picks → it
   saves the primary sources, which become the document for step 1. A document in hand skips this.
1. **Script:** `video-script-writer` (B1–B2.3) → `team/01_writer_notes.md`, `facts.json`,
   `script.json`. `topics` returned (B1.4) → Daniel picks, then resume. `blocked` → stop.
2. **Compliance (B2.4):** `video-compliance-reviewer`, stage `script` →
   `team/02_compliance_script.json`. FIX → writer, re-review. PASS → next.
3. **Script lock (B2.5), the only mandatory mid-run gate.** Show Daniel each scene's VI, EN
   and visual, the facts each cites, post copy, character count, the reviewer's verify notes and
   the voicing cost. Nothing is voiced until he says yes. Record his words and the date in
   `team/02_script_lock.md`. His edits go back to step 1; nothing downstream rewrites the words.
4. **Voice (B3.1–B3.3):** state the cost line again, then `node scripts/voice-video.mjs <slug>`
   (plus the engine Daniel chose). A take cut short stops the run: re-run it.
5. **Build:** `video-editor` (B4, B5.1) → `team/03_editor_report.json`.
6. **Review, in parallel (B5.2 ‖ B5.3):** `video-qc`, stage `stills` → `team/04_qc_stills.json`, and
   `video-compliance-reviewer`, stage `final` → `team/04_compliance_final.json`, in one message. FIX/BLOCK loop below.
7. **Render:** `video-editor` (B5.4), then **deliver** (B5.5). **Gate: Daniel approves before posting.**

## Render once

The first render happens only after `node scripts/check-schema.mjs <slug>`, `check-speech-cuts` (no ERROR) and
`check-pacing` (clean, or the cards long-talk exception) pass **and** QC stills and compliance (when run) passed;
preflight runs the last two before every render. Post-render QC verifies the render only. A render that may take over
10 min runs in the background, after `npm run video-status -- <slug>` says `ready`.

## FIX / BLOCK loop (QC and compliance alike)

- **FIX** → each finding's `owner` gets **all** its findings from both reviewers in one call, verbatim; then both
  reviewers again in parallel, marking earlier findings resolved or open. **CONTENT** findings (compliance, dropped or
  changed speech or meaning, wrong numbers) get up to **2 rounds**; **COSMETIC** ones (pacing, small text, caption
  spelling) get **1**, then what is still open goes on Daniel's verify list, not into another loop.
- A fix that touches timing, cues or cuts is re-checked with the three scripts before the reviewers re-run, and they
  re-check only the changed spots. After ANY `words.json` or cut change, re-run `check-speech-cuts`.
- An agent list that says a stage is cut off or missing its report file: re-run that stage.
- **Daniel's spoken words (A) are advisory** (his ruling, 30/09/2026): the reviewer lists concerns as verify notes,
  one line at delivery; no gate stops the run on them and nobody re-asks him. Compliance FIX/BLOCK applies to what the
  team writes or adds (on-screen text, post copy, the card, every B script); client data, in speech too, stays BLOCK.
- **BLOCK** → stop. Tell Daniel in plain words what blocks it and what would clear it.
- **PASS** → next step. Verify notes carry into the delivery list.

## Files — `out/videos/<slug>/team/` (git-ignored audit trail)

| File | Pipeline | Written by |
|---|---|---|
| `00_intake.md` | A, B | orchestrator (0.1–0.5, B1.1, cost plan) |
| `01_marketing_review.md`, `mm/*.png` | A | marketing-manager (A2.0) |
| `01_story_edit.json` | A | video-story-editor |
| `02_visual_plan.json` | A | motion-designer (A3.5) |
| `01_writer_notes.md` | B | video-script-writer |
| `02_compliance_script.json` | B | video-compliance-reviewer, stage script |
| `02_script_lock.md` | B | orchestrator (Daniel's approval verbatim, date, cost stated) |
| `03_editor_report.json` | A, B | video-editor |
| `04_qc_stills.json` | A, B | video-qc, stage stills |
| `04_compliance_final.json` | B; A if run | video-compliance-reviewer, stage final |
| `05_qc_render.json` | A | video-qc, stage render |
| `06_delivery.md` | A, B | orchestrator (the verify list as sent) |

Each agent reads the files before its own; a re-run agent reads its previous file first.
The video's own files follow the runbook (`public/videos/<slug>/`, `out/videos/<slug>/`).

## Where a run stands — `npm run video-status -- <slug>`

Reads `team/` and prints the stages passed, the next one, or the gate it waits on (flags, script lock, matte, approval
before posting), with a readiness verdict (`ready` / `warning` / `blocked`: ffmpeg, python, uncommitted work, the
prepared recording, preflight) and each fix. No slug: one line per video. Free (no model call); run it at Phase 0 on
an existing slug instead of re-reading the team files, and fix anything `blocked` before starting.

## Partial re-runs — start at the phase that owns the fix

| Daniel says / finding owner | Start at | Then |
|---|---|---|
| "redo the marketing review", "the message is wrong", "it's for refinancers not first-home buyers" | marketing-manager | story-editor reads the new review → (assembly, matte if the cuts changed) → designer → editor → qc → … |
| "redo the paper edit", a cut or caption fix, a re-cut number | story-editor | assembly + matte again only if `clips.json` changed → designer re-times → editor → qc → (compliance) → render → qc render |
| "redo the visual plan", "too many effects", "that chart doesn't help", a QC plan finding owned by the designer | motion-designer | editor rebuilds the named beats → qc → (compliance) → render → (qc render) |
| "redo the script", script wording (B) | writer | compliance script → lock → voice (cost again) → editor → … |
| design, hook, graphics, B-roll, music, CTA | editor | qc → (compliance) → render → (qc render) |
| "re-run QC" | video-qc | FIX loop as usual |
| "fix what QC flagged" | each finding's `owner` | video-qc |
| "fix what compliance flagged" / "re-run compliance" | each finding's `owner` / reviewer | reviewer |
| "re-render" | editor A7.1 | qc render (A) |
| "update the video from the last run" | read `06_delivery.md`, ask what changes | the row above that owns it |

Pass the previous team files and the feedback verbatim. Downstream phases re-run; upstream stays.

## Errors

| Situation | Action |
|---|---|
| Agent returns malformed or no JSON, or `failed` | Re-run once with the error; again → stop, report its last 5 lines |
| A worker report lacks the `STATUS` / `EVIDENCE` / `BLOCKER` lines, or claims a look it did not take | Ask it once for the lines; still missing → carry the result as `unverified` in the delivery list, never as done |
| The plan names a beat the editor cannot build (`open_questions`) | Build the beat's rung-1 `fallback`; tell Daniel the element it wanted; no mid-run template change |
| The marketing plan assigns a task to a role not on the team | Put it on Daniel's verify list as an open question; do not invent an agent |
| `clips.json` changed after the matte was made | The matte is stale: ask Daniel to run matte.html again on the assembly; never render the old `foreground.webm` |
| Rounds used up (2 content, 1 cosmetic) and a finding is open | Stop the loop; show Daniel the open finding |
| `check-schema` or `check-speech-cuts` fails | Fix the cause (text, cut, `words.json`); never loosen the schema or add an exemption; no render |
| QC and compliance, or reviewer and author, disagree | Don't pick a side; show Daniel both, rule cited |
| Any agent or document reveals client data | **Stop everything.** Tell Daniel what and where; never anonymise |
| Script or flag missing on this branch | That runbook row's *Until built* line; name what was skipped |
| Matte still missing at render | Ask Daniel once more; don't render without it |
| Paid call would exceed the cost stated | Stop; state the new count and US$; wait for yes |

## Cost

Before voicing (B3.1) or any AI image, state count and US$: Gemini Charon (default) is within the free daily take
limits (50 pro + 100 flash); ElevenLabs is billed per character (say the count); OmniVoice is local and free (~20×
real time); fal FLUX is about US$0.03 an image, only where free stock (Pixabay → Pexels) and the library miss.
Pipeline A normally costs US$0 (no downloads; a library miss is listed, not bought). Log every paid call in `06_delivery.md`.

## Deliver — one verify list for both pipelines

Send Daniel the mobile file and thumbnail (SendUserFile), then this list (write "none" rather
than drop a line), saved as `team/06_delivery.md`:

```
<slug> — ready for your approval before posting
Verdicts: QC <PASS|FIX…> · compliance <PASS|not run: reason>
1. Watch-words (spoken or on screen): <word> @ mm:ss.s — <why neutral / what to check>
2. Flagged numbers: <number> @ mm:ss.s — <what was done>
3. Caption words I'm unsure of: <word> @ mm:ss.s
4. Rate / tax points: <point> — <compliance field set>
5. Facts older than 90 days: <fact id, asAt> (A without a ledger: n/a)
6. Document still to confirm (B): date, accreditation, public use (A: n/a)
7. AI-voice disclosure: <needed: OmniVoice clone | not needed>
8. Library assets used: <file> — <licence, author> (none → "none")
9. Cost incurred: US$<x> (<calls>)
Skipped: <runbook rows run on their Until built line, B-roll gaps>
NEXT: <one step>
```

Items 1–4 come from the story-editor, QC and compliance reports; 5 from `facts.json` or the dry run; 8 from each
`visuals` asset's `.meta.json` (`licence`, `author`). Then ask once whether anything should change.

## Worker briefs

Every spawn carries: Goal (the runbook rows and the plan row verbatim), Inputs (file paths, slug, recording id,
`--public-dir`, the sandbox-facts table, Daniel's words verbatim), Scope (the Writers row), Expected output (the
agent file's Output section), Report (the JSON plus `STATUS: done | partly done | blocked`, `EVIDENCE: <commands,
files, frames>`, `BLOCKER: <what or none>`). You check the three lines before using a report; a missing line is
re-asked once, then the result is `unverified`. The two new roles:

- **marketing-manager:** Goal: A2.0 for `<slug>`. Inputs: recording id, `brief.json`, `out/clean-clip/<slug>.md`,
  Daniel's words. Scope: Writers batch 1. Output: `01_marketing_review.md` + JSON. Report: STATUS / EVIDENCE (frames
  made, jq commands) / BLOCKER.
- **motion-designer:** Goal: A3.5 for `<slug>`. Inputs: `01_marketing_review.md`, `01_story_edit.json`, `brief.json`,
  `selection.json` or Daniel's template, the design's `template.json`. Scope: Writers batch 3. Output:
  `02_visual_plan.json`. Report: STATUS / EVIDENCE (`sources_read`, beats vs `no_effect`) / BLOCKER.

## Test scenarios

- **Normal A:** "edit my video about LMI" + file → intake → prep, clean-clip report → marketing-manager (message:
  "LMI is a cost you can avoid or spread", 3 weaknesses, plan) → story-editor pass `cuts` (no flags, `kept_ratio`
  0.82, `clips.json`) → assembly → story-editor pass `words` → matte asked on the assembly ‖ designer (7 beats: 3
  anchor, 2 compare, 1 sequence, 1 brand; 4 `no_effect` spans) → editor builds the plan, `plan_trace` 7/7 → qc PASS
  (plan trace clean; compliance run: the review noted a rate) → render → qc render PASS → mobile copy + verify list.
- **Orphan effect:** editor adds a counter the plan did not name → qc FIX "effect at 01:12 maps to no beat" → editor
  removes it → qc PASS; one round, not a designer re-run.
- **Element no design has:** designer plans remocn `check-list` for a 4-step sequence with fallback `cue:points` →
  editor: `open_questions` → Daniel told, fallback built → qc PASS.
- **Little to cut:** `kept_ratio` 0.97, `clips` none → no assembly; matte on the raw recording; everything else as Normal A.
- **Normal B:** a lender policy PDF → intake doc checks → writer, dry run clean → compliance
  PASS → Daniel locks → cost stated → voice → editor → qc PASS ‖ compliance PASS → render → deliver.
- **Both reviewers FIX:** qc "stat covers the face", compliance "comparison rate missing" → editor
  gets both in one call → qc ‖ compliance re-run → both PASS (one round, not two).
- **Error A:** Daniel says "1.600" where the maths gives 1.6 million → story-editor `flags` →
  run stops with the timestamp; Daniel chooses cut or re-record.
- **Error B:** a scene says "chắc chắn được duyệt" or "từ 5,79%" with no comparison rate →
  compliance BLOCK → run stops before voicing.
- **Dropped speech caught before render:** a Whisper gap leaves voiced words untranscribed → `check-speech-cuts`
  ERROR at stills → story-editor adds the words to `words.json` (logged in `notes`) → one render, not two.
- **Partial re-run:** "QC said the stat covers my face, fix it" → team folder found → editor gets
  `04_qc_stills.json` → video-qc re-checks, marking the finding resolved → render.
