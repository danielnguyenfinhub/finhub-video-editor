# FinHub Video — Production Runbook (for Claude Code)

**What this is.** The exact order Claude Code follows to produce a video in this repo
(`danielnguyenfinhub/finhub-video-editor`). There are two pipelines: **A. Edit footage** and
**B. Faceless video**. Phases run in order, and no phase starts until the gate before it passes.

**Checked against the code** on 26 Sep 2026 at `main` d269e59: every script, flag, design, cue kind
and `edit.json` field named below exists or is marked as a build step. Corrections made in that check:
the cue kinds are `kinetic`, `compare`, `bars`, `verdict`, `venn`, `emoji`, `lenders`, `points` (there
is no `table` cue); `check-caption-fixes.mjs` is a self-test of the caption-fix logic, not a per-video
check.

**How to read each step.**

- **Who** says who acts. **Claude** means Claude Code. **Daniel** means a human decision or action.
- **Run** gives the exact command, from the repo root.
- **Makes** lists the files the step produces.
- **Gate** is the condition to pass before moving on.
- **[TODAY]** marks a step that works on `main` now.
- **[BUILD WPn]** marks a step that needs tooling from the action plan. Until that work package is
  merged, use the **Until built** line. Merged: WP1 (fact ledger), WP2 (library), WP3 (visuals),
  WP4 (multi-clip), WP5 (reading floor, grammar vs skin), WP6 (brief and selector), WP7 (promotion, PR #46), WP9 (token diet). Nothing left to build. When one
  merges, change its tag here to **[TODAY]** and delete its *Until built* line.

**Rules on every run.** Keep command output short: pipe commands through `| tail -n 5`. Check stills,
not full renders, until the final render. Use `--scale=0.5` for stills. State the count and cost before
any paid API call (Gemini, fal, ElevenLabs). Never change Daniel's meaning, a number or a disclaimer.

---

## PHASE 0 — Intake (both pipelines)

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| 0.1 | Check the repo is clean and current | Claude | `git status` · `git log -1 --oneline` | — | If there is uncommitted work, **stop and tell Daniel** (GitHub Desktop stashes it on pull or branch switch) |
| 0.2 | Classify the job | Claude | Footage supplied → Pipeline **A**. Document or topic only → Pipeline **B**. Footage plus "with compliance check" → A, run under the `video-production-team` skill | — | Pipeline stated in one line |
| 0.3 | Name it | Claude | Slug in kebab-case ASCII, e.g. `lmi-explained`. For A, also a recording id (defaults to the slug; reuse an existing id if the same recording was prepped before) | — | `ls public/videos/<slug>` must not exist, unless this is a re-edit |
| 0.4 | Load only what's needed | Claude | Read the editor `SKILL.md` Workflow, `references/landmines.md` and the design log (`python .claude/skills/vietnamese-finance-video-editor/scripts/main.py log`). Pipeline B also reads `references/faceless-script.md`. Nothing else yet | — | — |
| 0.5 | State the plan | Claude | Pipeline, slug, source file(s), topic in one line, expected paid calls and cost | — | Proceed |

---

## PIPELINE A — Edit footage (talking-head or multi-clip)

Professional order: **ingest → transcript → paper edit → assembly → rough cut → design → graphics &
B-roll → captions → sound → QC → render → deliver.** Words are locked before visuals are built, so
graphics are never timed to text that later changes.

### A1. Ingest & prep

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A1.1 | Single recording **[TODAY]** | Claude | `python scripts/prep-video.py "<C:\path\video.mp4>" <slug> --recording <id>`. Run in the background. Add `--no-clean` for a studio-quality recording. For a re-edit of an existing recording: `python scripts/prep-video.py <slug> --recording <id>` (no file; writes only `edit.json`). If the recording already exists and a file is given, the script stops and lists the options | `public/recordings/<id>/source.mp4`, `words.json`; `public/videos/<slug>/edit.json` (starter); pace table in console | Script finishes; aspect ratio reported; a non-9:16 source is cover-cropped, so confirm the face stays in frame |
| A1.2 | Multi-clip **[TODAY]** | Claude | Prep each take with A1.1 first. Write `public/videos/<slug>/clips.json` (ordered `recording`, `inMs`, `outMs`, `role`: a-roll or b-roll), then `python scripts/prep-video.py <slug> --clips public/videos/<slug>/clips.json`. Per-take cut-outs are joined with the same spans; a take without one means the assembly needs its own matte (A1.3). Changing `clips.json` later shifts every time already in `edit.json` | Assembled recording `public/recordings/<slug>-assembly/` (proxy, merged `words.json` with clip boundaries); `edit.json` `source` points at it | Duration equals the sum of kept spans (±1 frame) |
| A1.3 | Background removal **[TODAY]** (start early; it's the slowest step) | Claude + Daniel | `npm run review`, then open `http://localhost:4100/matte.html?slug=<slug>` in the Claude app browser and wait for **Saved**. Takes about 13× the video length. Skip if `public/recordings/<id>/foreground.webm` already exists | `foreground.webm` | File exists; render refuses to start without it |

Run A1.3 in parallel with A2–A4. It doesn't depend on the edit.

### A2. Understand the talk (paper edit)

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A2.1 | Read the transcript cheaply | Claude | Use the pace table from A1.1 plus `jq` over `words.json` for text only. Do not open the full JSON | — | — |
| A2.2 | One-paragraph summary | Claude | Cover problem, example and conclusion. Mark: the hook sentence, topic changes, **every number** (recompute its maths), false starts and repeated takes, misheard words, RG 234 watch-words **spoken** (tốt nhất, rẻ nhất, miễn phí, đảm bảo …), tax talk, and bank names | Notes into `edit.json` `notes` | A wrongly spoken number → **flag to Daniel with its timestamp**. It is never shown, and Daniel chooses to re-record or cut it |
| A2.3 | Paper edit | Claude | Decide what stays, in order, from the transcript: `remove` spans for bad takes, `captionFixes` bound to context (never a flat word swap) | `edit.json` `remove`, `captionFixes` | Nothing removed changes a claim, number or disclaimer; unsure means keep it |
| A2.4 | Scene brief **[TODAY]** | Claude | `node scripts/brief.mjs <slug>` (`--public-dir <dir>` when the media lives elsewhere) | `out/videos/<slug>/brief.json` (intent, data shapes, numbers, banks, steps, comparisons) | — |

### A3. Choose the template

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A3.1 | Daniel named a template? | — | If yes, use it; the choice is logged as an override (`select-template.mjs <slug> --pick <id>` once WP6 merges). Skip to A3.4 | — | — |
| A3.2 | Selector **[TODAY]** | Claude | `node scripts/select-template.mjs <slug>` (`--public-dir <dir>` when the media lives elsewhere) | `out/videos/<slug>/selection.json` (top 3 and scores; promoted designs rank above `unproven` ones) | Take the top pick unless a hard reason is written down; when `confident` is false, show Daniel the `closeCall` pair and let him choose |
| A3.3 | Variety check | Claude | `python .claude/skills/vietnamese-finance-video-editor/scripts/main.py check <axes.json>`. Novelty applies to **skin** only (≥ 4 of 7: cover, captions style, framing, transitions, texture, sound, cta). Keep **grammar** (the graphics axis: how numbers, comparisons and steps are shown; caption position) consistent per data shape | Check output | Pass, or change skin axes; never edit the log to pass |
| A3.4 | Set design | Claude | `"design": "<id>"` in `edit.json` | — | — |

### A4. Graphics, B-roll and hook (the build)

Build order goes from most important to least: **hook → numbers → comparisons/steps → banks → B-roll →
chapters → CTA.** Every graphic lands on a signature moment (hook, key number, turn, conclusion) or
makes a point clearer. Anything else is cut.

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A4.1 | Hook | Claude | `hook` shows the single strongest number or question, read in 3.5 s | `edit.json` `hook`, `title`, `subtitle`, `coverFrameMs` | Hook text passes RG 234 |
| A4.2 | Numbers | Claude | Spoken numbers chart automatically (golden rule). Add `stats` only for labelled figures. Time from `words.json` `startMs` | `stats` | `node scripts/check-golden.mjs <slug>` lists every number and bank found; each one must match the maths check in A2.2 |
| A4.3 | Comparisons, steps, verdicts | Claude | `cues`: `compare` (A vs B), `bars` (2–4 values), `points` (2–5 steps), `verdict`, `venn`, `kinetic` (myth strike-through), `emoji`, `lenders`. Pick by data shape, not taste | `cues` | One idea per cue; the cue appears within the spoken phrase |
| A4.4 | Banks | Claude | Automatic from bank names. Check `public/lenders/` for the logo | — | No logo implies endorsement |
| A4.5 | B-roll, cutaway, PiP, overlay **[TODAY]** | Claude | 1) `node scripts/library.mjs find <keywords EN> <keywords VI>` **first**. 2) On a miss, get the asset into the library through the faceless tooling (Pixabay → Pexels, then fal FLUX only if stock fails, cost stated); Mode A itself never downloads. 3) Add an entry to the top-level `visuals` list in `edit.json`: `mode` cutaway / pip / overlay, `atMs`, `durMs`, `asset` (a `library/...` path or `{"find": "<keywords>"}`). 4) `node scripts/library.mjs resolve <slug>` turns every `{find}` into a path; it stops and names any unmatched keyword | `edit.json` `visuals` | B-roll for jump cuts and abstract ideas only; never over a spoken number; each cutaway ≤ 4 s and total face-hidden time reported by `check-golden` |
| A4.6 | Chapters and keywords | Claude | `chapters` at topic changes; `keywords` highlight at most 1–2 words per sentence | — | — |
| A4.7 | CTA | Claude | One `cta`. Only one ask | — | — |
| A4.8 | Compliance fields | Claude | Advertised rate → `compliance.advertisedRate` (rate, comparison rate, as-at date) or no rate at all. Tax talk → `taxNote` | `compliance` | Missing → the rate does not appear |
| A4.9 | New visual concept needed? | Claude | Only if no existing design or cue does it. Build `src/designs/<id>/` per `src/designs/README.md`, register it in `index.ts`, list hard-coded strings in `copy`, and use theme tokens only. Then **[TODAY]** `node scripts/promote-design.mjs <id>` to save it as a template | New template with manifest and preview | Promotion checks pass |

### A5. Captions and sound

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A5.1 | Caption check | Claude | `node scripts/check-caption-pages.mjs <slug>` for this video's caption pages. `node scripts/check-caption-fixes.mjs` only when `src/mortgage/timeline.ts` was changed (it self-tests the caption-fix logic on a synthetic transcript; exit 1 = failure) Then `node scripts/check-golden.mjs <slug>` lists cards and cues held to the reading floor and any it could not hold, and notes caption pages faster than 22 chars/s | Report | No SHORT card or cue; a noted caption page is report-only (consider paging or a remove); diacritics intact |
| A5.2 | Cut list review | Claude | `node scripts/export-srt.mjs <slug>` lists every automatic cut (ờ/ừm, stutters) | Cut list | Read it against the words: no sentence meaning changed |
| A5.3 | Music | Claude | `music` from `public/music/` only (licensed). The render ducks it under the voice and normalises to −14 LUFS | — | — |

### A6. QC on stills (before any full render)

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A6.1 | Schema and RG 234 | Claude | `npx remotion compositions src/index.ts --props='{"slug":"<slug>"}' \| tail -n 5` | — | No schema or RG 234 error; fix the text, never loosen the schema or add a fake exemption |
| A6.2 | Stills | Claude | `npx remotion still MortgageReel out/check-<n>.png --props='{"slug":"<slug>"}' --frame=<n> --scale=0.5 --gl=angle` at: cover, hook, each signature moment, each B-roll visual, CTA, and the **compliance card (last 5 s)** | PNGs | Look at them. Fix clipped text, overlaps, face covered for more than 3 s, and anything that looks like the previous video's skin |
| A6.3 | Golden report | Claude | `node scripts/check-golden.mjs <slug>` | Report | Every number charted, every bank badged, safe zones respected, face-hidden time within limits |
| A6.4 | Independent compliance (if the team harness or "with compliance check" was asked) | Claude | `video-compliance-reviewer` agent on the stills and `words.json` | PASS / FIX / BLOCK | BLOCK stops the run; FIX is applied, then re-checked |

### A7. Render, verify, log, deliver

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| A7.1 | Render | Claude | `python scripts/render-video.py <slug>` (runs `scripts/preflight.mjs` first) | `out/videos/<slug>/<slug>.mp4` (9:16), `-feed.mp4` (4:5), `-mobile.mp4` (~27 MB), `thumbnail.png`, `.srt` | Durations right, audio present |
| A7.2 | Post-render check | Claude | Re-transcribe about 15 s around each cut, taken from the talk, not the end cards (Whisper invents "cảm ơn các bạn đã theo dõi" on silence) | — | No clipped word at any cut |
| A7.3 | Log | Claude | `python .claude/skills/vietnamese-finance-video-editor/scripts/main.py add <entry.json>`. `library.mjs` records `usedIn` for library assets | Design log entry | — |
| A7.4 | Deliver | Claude | Send Daniel: the mobile file, the thumbnail, and the **verify list**: spoken watch-words with timestamps, flagged numbers, caption words Claude is unsure of, tax or rate points, and the B-roll gaps (until WP3) | — | **Daniel approves before posting** |

---

## PIPELINE B — Faceless video (document or topic, no presenter)

Professional order: **source → fact ledger → one idea → script → compliance → script lock → voice →
storyboard → template → visuals → build → QC → render.** Accuracy gates come before any money is spent
on voice or images.

### B1. Source and facts

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| B1.1 | Check the document | Claude | Record the document name and date. Older than about 3 months → warn Daniel. Marked "for broker use only" → ask whether public use is allowed. Names a person, address, account or client figure → **stop**; don't anonymise it yourself | — | Daniel confirms: accreditation current, policy current, public use allowed |
| B1.2 | Read without skimming | Claude | For a large file: `wc -w`, a keyword census with `grep -ci`, then read only the relevant sections with `grep -n` and `sed -n 'A,Bp'` | — | Never state a rule you haven't read |
| B1.3 | Fact ledger **[TODAY]** | Claude | Write `public/videos/<slug>/facts.json`: `id`, `claim_vi`, `claim_en`, `verbatim`, `doc`, `locator` (page or section), `asAt`, `kind` (shape in `references/faceless-script.md`) | `facts.json` | Every claim you intend to use has a verbatim source line |
| B1.4 | Topic choice (if the document supports several videos) | Claude → Daniel | Table of topics, each framed as a **customer problem**, ranked for a Vietnamese-Australian audience | — | **Daniel picks.** Stop until he does |

### B2. Script

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| B2.1 | One idea | Claude | What the viewer should know or do after 45–75 s. Everything else is a different video | — | — |
| B2.2 | Write `script.json` **[TODAY]** | Claude (`video-script-writer` agent under the team skill) | Title; scenes with `vi` narration and an `en` line; the first sentence is the hook (a number, surprise or question, under 3 s); numbers written as spoken; general information only. **Per scene, choose the visual:** data, comparison or steps → an **element** (edit.json, free); otherwise a `"footage"` stock phrase (2–5 English words, which is also the library keyword), with `"ai"` only as a paid fallback. Each scene cites `facts: ["F1"]`, or `facts: []` when it makes no claim | `script.json` | — |
| B2.3 | Dry run **[TODAY]** | Claude | `node scripts/voice-video.mjs <slug> --dry-run` | RG 234 result, character count, fact trace (untraced number or missing `facts` fails; fact older than 90 days warns), and per scene `library hit`, `would download` / `would generate`, or a stem-match candidate to confirm | Clean pass |
| B2.4 | Compliance review of the script | Claude (`video-compliance-reviewer`) | Every number and rule traced to the ledger's verbatim line, including numbers spelled out in words; no advice ("bạn nên vay…"); advertised rate only with comparison rate and as-at date | PASS / FIX / BLOCK | PASS before Daniel sees it |
| B2.5 | **Script lock** | Daniel | Send the script, VI plus EN, with the source-trace summary | — | **Daniel approves. Nothing is voiced before this.** After approval nothing downstream rewrites the wording; any change goes back to B2.3 |

### B3. Voice

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| B3.1 | State cost | Claude | Scene count; Gemini daily take limits (50 pro + 100 flash); ElevenLabs is billed per character | — | Proceed |
| B3.2 | Voice | Claude | `node scripts/voice-video.mjs <slug>`. Default voice is Charon. `--engine omnivoice [--voice daniel]` for the cloned voice (about 20× real time on CPU; a 60 s video ≈ 20 min). `--engine elevenlabs` for ElevenLabs. Cached scenes are reused | `source.mp4` (narration), transparent `foreground.webm`, `words.json`, starter `edit.json` with `"design": "faceless"`, footage for gap scenes | Any take cut short is deleted and the run stops; re-run to voice it again |
| B3.3 | Visual resolution **[TODAY]** (automatic in `visuals.mjs`) | Claude | Library lookup first (keyword EN/VI; exact and synonym hits reused, stem matches only suggested), then Pixabay → Pexels → fal. New assets saved to `public/library/` with licence and author | Library entries | Zero repeat downloads for keywords already in the library |

### B4. Build the video

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| B4.1 | Scene brief and template **[TODAY]** | Claude | `node scripts/brief.mjs <slug>`, then `node scripts/select-template.mjs <slug>` (`--public-dir <dir>` when the media lives elsewhere) | `brief.json`, `selection.json` | Faceless stays on `faceless` unless the selector finds a better-fitting faceless-capable template |
| B4.2 | Hook, chapters, stats, cues | Claude | Add to `edit.json`, timed from `words.json` (available only after voicing): `hook`, `chapters`, `stats` for labelled numbers, `cues` (`compare`, `bars`, `points`, `verdict`) per the scene visuals chosen in B2.2 | `edit.json` | Elements carry the facts; footage only fills; the navy veil hides footage whenever an element is up |
| B4.3 | Compliance fields | Claude | `compliance.advertisedRate` if a rate is presented as available, `taxNote` for tax talk | — | — |
| B4.4 | New concept? | Claude | As A4.9, then promote **[TODAY]** | Template | — |

### B5. QC, render, deliver

| # | Step | Who | Run / do | Makes | Gate |
|---|---|---|---|---|---|
| B5.1 | Schema and RG 234 | Claude | As A6.1 | — | Pass |
| B5.2 | Stills | Claude | As A6.2 at: cover, hook, each element, two footage scenes, CTA, compliance card | PNGs | Every on-screen number matches the locked script and the ledger |
| B5.3 | Final compliance | Claude (`video-compliance-reviewer`) | Final stage review on the stills, `script.json` and `facts.json` | PASS / FIX / BLOCK | PASS |
| B5.4 | Render | Claude | `python scripts/render-video.py <slug>` | Same outputs as A7.1 | — |
| B5.5 | Deliver | Claude | Mobile file, thumbnail, the `post` copy if written, and the **verify list**: document date, accreditation or public-use points still unconfirmed, any fact tagged `asAt` older than 90 days, the AI-voice disclosure if OmniVoice was used, and cost incurred | — | **Daniel approves before posting** |

---

## After every video (both pipelines)

1. **Design log:** add the entry (A7.3).
2. **Landmines:** any failure you hit that isn't already in `references/landmines.md` gets one line:
   symptom → cause → fix.
3. **Library:** check `node scripts/library.mjs stats`. New assets are there with their licence
   recorded.
4. **Template:** any new concept is promoted (WP7), or listed as "not promoted" with the reason.
5. **Report to Daniel** in five lines: status, files, cost, what was skipped, and what he must verify.

## Which steps still need building

None: every work package listed above is built and merged.
