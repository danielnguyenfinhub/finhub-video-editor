---
name: video-production-team
description: >-
  Runs Finance Hub's whole video production process end to end with a team of agents, for both
  pipelines: A, editing Daniel's own footage (talking-head or several takes), and B, a faceless
  video from a document or topic. Intake, paper edit or script, compliance, build, technical QC,
  render and a verify list, with Daniel deciding only at the gates. ALWAYS use when Daniel says:
  "edit my video", "edit this video", "I recorded a video about…", "new talking-head video",
  "make a video from this document/policy", "faceless video about…", "turn this RBA announcement
  into a video", "what's trending", "what should I make a video about", "research … for a
  video", "run the video team", "produce this with the team", "with a compliance check",
  and for follow-ups on a video the team made: "redo the paper edit", "re-run QC", "fix what QC
  flagged", "fix what compliance flagged", "re-run compliance", "redo the script only", "update
  the video from the last run". NOT for footage-free rate-alert reels (finhub-rate-alert-reel),
  branding an existing clip (finhub-branded-reel), a compliance check of a script on its own
  (video-compliance-review), or repo refactors and speed-ups (refactor-team).
---

# Video production team

**User story:** Daniel hands over a recording or a document and gets back a finished, QC'd,
compliance-checked video and one verify list, having decided only at the gates: the script
lock (B), a wrongly spoken number (A), and posting (both).

The process is `vietnamese-finance-video-editor/references/runbook.md`. Every step id below
(0.3, A2.2, B5.3 …) is a runbook row: read the row for its command and gate. This skill only
says who runs each step, in what order, and where the run stops. It never copies the runbook.

## The team

| Agent (`.claude/agents/`) | Runbook steps | Standard |
|---|---|---|
| `video-script-writer` | B1.1–B1.4, B2.1–B2.3 | `references/faceless-script.md` |
| `video-story-editor` | A1.2 `clips.json`, A2.1–A2.4 | editor skill, Workflow Step 2 |
| `video-editor` | A3, A4, A5.3, A6.1, A7.1, A7.3; B4, B5.1, B5.4 | `vietnamese-finance-video-editor` |
| `video-qc` | A5.1–A5.2, A6.2–A6.3, A7.2; B5.2 | `video-qc` skill |
| `video-compliance-reviewer` | B2.4, A6.4, B5.3 | `video-compliance-review` skill |

You (the orchestrator) run Phase 0, prep (A1.1), the matte request (A1.3), voicing (B3, because
it is the paid call and you hold the cost gate), every gate, and delivery. You do no editing.

**Execution mode: subagents in a pipeline** (Agent tool, `subagent_type` = agent name,
`model: "opus"`), with one parallel fan-out: in A the paper edit runs while Daniel's matte
renders. Not an agent team, because the flow stops for Daniel mid-run and both reviewers
(`video-qc`, `video-compliance-reviewer`) must judge the artefacts from a clean context, not
the builder's reasoning. Agents report to you; you relay questions to Daniel.

Agent files register at session start. If an agent type isn't found (files added mid-session),
use `subagent_type: "general-purpose"` and begin the prompt "Read and adopt
`.claude/agents/<name>.md` as your role"; give reviewers only the tools their file lists.

A subagent sees neither this chat nor `AGENTS.md`. Its prompt carries: slug, pipeline, recording
id, the runbook step ids it owns, file paths, `--public-dir` if media lives outside the repo, and
Daniel's words verbatim.

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
5. **0.4** You read only this skill and the runbook rows in play; each agent reads its own list.
6. **0.5** Cost plan: pipeline, slug, sources, topic, paid calls expected with US$ (see Cost).
7. Write `team/00_intake.md` with all of the above. **A:** ask Daniel now to start the matte
   (below), unless `foreground.webm` exists.

## Pipeline A — edit footage

1. **Prep (A1.1)** in the background; several takes: prep each take the same way first.
2. **Matte (A1.3), asked at the start, runs in parallel.** Say to Daniel: "Please run
   `npm run review`, open `http://localhost:4100/matte.html?slug=<slug>` in the Claude app
   browser and leave it until it says Saved (about 13× the video's length)." Don't wait; carry
   on. Check for `foreground.webm` before render (step 6); still missing → ask once more, then wait.
3. **Paper edit ‖ matte:** `video-story-editor` → `team/01_story_edit.json`. Several takes: it
   writes `clips.json`, you run the A1.2 assembly, it finishes A2 on the assembled words.
   - `flags` not empty (a wrongly spoken number, a meaning-changing cut) → **gate: stop for
     Daniel** with each flag's timestamp and quote; pass his answer back. Unsure words alone
     don't stop the run; they go to the verify list.
4. **Build:** `video-editor` (A3, A4, A5.3, A6.1) → `team/03_editor_report.json`.
5. **QC:** `video-qc`, stage `stills` → `team/04_qc_stills.json`. **Compliance (A6.4)** only if
   Daniel asked for it, or the video states a rate or a number claim taken from a document:
   `video-compliance-reviewer`, stage `final` → `team/04_compliance_final.json`. FIX/BLOCK loop below.
6. **Render:** matte present → `video-editor` (A7.1, A7.3).
7. **Post-render QC:** `video-qc`, stage `render` (A7.2) → `team/05_qc_render.json`.
8. **Deliver** (A7.4, below). **Gate: Daniel approves before posting.**

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
6. **QC:** `video-qc`, stage `stills` (B5.2) → `team/04_qc_stills.json`.
7. **Final compliance (B5.3):** `video-compliance-reviewer`, stage `final` →
   `team/04_compliance_final.json`.
8. **Render:** `video-editor` (B5.4), then **deliver** (B5.5). **Gate: Daniel approves before posting.**

## FIX / BLOCK loop (QC and compliance alike)

- **FIX** → the finding's `owner` (story-editor, writer or editor) with the findings verbatim;
  then the same reviewer again, told to mark earlier findings resolved or open. At most **2
  rounds**; then stop and show Daniel the open findings.
- **BLOCK** → stop. Tell Daniel in plain words what blocks it and what would clear it.
- **PASS** → next step. Verify notes carry into the delivery list.

## Files — `out/videos/<slug>/team/` (git-ignored audit trail)

| File | Pipeline | Written by |
|---|---|---|
| `00_intake.md` | A, B | orchestrator (0.1–0.5, B1.1, cost plan) |
| `01_story_edit.json` | A | video-story-editor |
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

## Partial re-runs — start at the phase that owns the fix

| Daniel says / finding owner | Start at | Then |
|---|---|---|
| "redo the paper edit", a cut or caption fix, a re-cut number | story-editor | editor re-times → qc → (compliance) → render → qc render |
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
| Two FIX rounds didn't clear a finding | Stop the loop; show Daniel the open finding |
| QC and compliance, or reviewer and author, disagree | Don't pick a side; show Daniel both, rule cited |
| Any agent or document reveals client data | **Stop everything.** Tell Daniel what and where; never anonymise |
| Script or flag missing on this branch | That runbook row's *Until built* line; name what was skipped |
| Matte still missing at render | Ask Daniel once more; don't render without it |
| Paid call would exceed the cost stated | Stop; state the new count and US$; wait for yes |

## Cost

Before voicing (B3.1) or any AI image, state count and US$: Gemini Charon (default) is within
the free daily take limits (50 pro + 100 flash); ElevenLabs is billed per character (say the
count); OmniVoice is local and free (~20× real time); fal FLUX is about US$0.03 an image, only
where free stock (Pixabay → Pexels) and the library miss. Pipeline A normally costs US$0: it
never downloads, and a library miss is listed for Daniel rather than bought. Log every paid
call in `06_delivery.md`.

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

Items 1–4 come from the story-editor, QC and compliance reports; 5 from `facts.json` or the dry
run; 8 from each `visuals` asset's `.meta.json` (`licence`, `author`). Then ask once whether
anything should change in the video or the team.

## Test scenarios

- **Normal A:** "edit my video about LMI" + file → intake, matte asked → prep → story-editor
  (no flags) ‖ matte → editor → qc PASS (compliance skipped: no document claim) → render → qc
  render PASS → mobile copy with the verify list.
- **Normal B:** a lender policy PDF → intake doc checks → writer, dry run clean → compliance
  PASS → Daniel locks → cost stated → voice → editor → qc PASS → compliance PASS → render → deliver.
- **Error A:** Daniel says "1.600" where the maths gives 1.6 million → story-editor `flags` →
  run stops with the timestamp; Daniel chooses cut or re-record.
- **Error B:** a scene says "chắc chắn được duyệt" or "từ 5,79%" with no comparison rate →
  compliance BLOCK → run stops before voicing.
- **Partial re-run:** "QC said the stat covers my face, fix it" → team folder found → editor gets
  `04_qc_stills.json` → video-qc re-checks, marking the finding resolved → render.
