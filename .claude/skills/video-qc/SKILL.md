---
name: video-qc
description: >-
  Independent technical QC of a Finance Hub video built in this repo: stills at the runbook's
  frames, the golden report (every number charted, every bank badged, safe zones, face-hidden
  time), caption pages, the automatic cut list read against the words, the dropped-speech and
  pacing checks, and after the render a check that the render matches what the stills passed. Returns PASS / FIX / BLOCK with a frame or timestamp as
  evidence. Used by the video-qc agent under video-production-team, which owns "re-run QC"
  and "fix what QC flagged"; use directly only for a one-off technical check ("check the
  stills", "did the render clip a word"). NOT a compliance review (video-compliance-review),
  and NOT for building or fixing the video.
---

# Video QC

Checks the video looks and sounds right; compliance is a separate review. You did not build
this video; judge the files, not the builder's report. Every step id is a row in
`.claude/skills/vietnamese-finance-video-editor/references/runbook.md`: run its command there.
Pipe output through `tail -n 15`. Media outside the repo: add `--public-dir <dir>` to Remotion
commands and to `check-golden.mjs`.

## Stage `stills` (before any full render)

1. **Schema (A6.1 / B5.1).** `node scripts/check-schema.mjs <slug>`. Fails → BLOCK with the last
   lines; nothing else can be judged. Its frame count is the composition length.
2. **Frames.** From `edit.json` (`coverFrameMs`, `hook`, `stats`, `cues`, `visuals`, `cta`,
   `chapters`) and the composition length, list the frames the row names: A6.2 for A (cover,
   hook, each signature moment, each B-roll visual, CTA, compliance card in the last 5 s),
   B5.2 for B (cover, hook, each element, two footage scenes, CTA, compliance card).
   `edit.json` times are *source* ms; `--frame` is on the *output* clock (cuts removed, cover
   card added). Map with the SRT that `export-srt.mjs` writes (already on the output clock):
   the caption holding the moment's words starts at t s → frame round(t × 30). Cover: frame 30.
   Compliance card: the frame count `check-schema` prints (`MortgageReel <slug>: <frames> frames`), minus 75.
3. **Stills** at `--scale=0.5 --gl=angle` with `"safeZones":true` in `--props` (the SAFE band and FACE box drawn over the frame, as A6.2 shows), into `out/videos/<slug>/team/qc/`. Anything but backdrop and Daniel outside the SAFE band, or an overlay inside the FACE box, is a finding you can point at. **Open every
   PNG and look.** FIX: clipped or overlapping text, a card over the face for more than 3 s, a
   number on screen that differs from the words (A) or the locked script and `facts.json` (B).
   BLOCK: the compliance card missing, cut off or unreadable.
4. **Golden (A6.3; B too).** `node scripts/check-golden.mjs <slug>`. Every number said and
   every bank named must appear; each number must match the story-editor's maths
   (`01_story_edit.json`) or the ledger. Face-hidden time and safe zones within the limits it
   prints. A miss → FIX.
5. **Captions (A5.1).** `node scripts/check-caption-pages.mjs <slug>`; `check-caption-fixes.mjs`
   only if `src/mortgage/timeline.ts` changed (`git diff --stat origin/main -- src/mortgage`).
   Diacritics broken or a page over the floor → FIX.
6. **Cut list (A5.2, A only).** `node scripts/export-srt.mjs <slug>`, then read each automatic
   cut against the words around it (`jq` on `words.json` by `startMs`). A cut that changes a
   sentence's meaning, a number or a condition → FIX, owner story-editor.
7. **Dropped speech (A).** `node scripts/check-speech-cuts.mjs <slug>` and read its output. ERROR
   → FIX, owner story-editor (missing words or a wrong word time in `words.json`); WARN lines
   go in the report. It runs before the first render so dropped speech is never found by a
   22-minute render.
8. **Pacing (A).** `node scripts/check-pacing.mjs <slug>` and read its output. Gaps over 3 s → FIX,
   owner editor, unless the cards long-talk exception applies (`src/designs/README.md` 5b: reported
   as INFO). This is the only way rule 5b is measured: never ffmpeg scene detection, never by eye.

## Stage `render` (A7.2, after the full render)

Verify that the render matches what the stills stage passed. Invent no new category of
finding here. Check: the files exist; durations match `check-schema`'s frame count and audio is
present (`ffprobe`); the cuts are as built (`remove` and the export-srt cut list); the captions
match the SRT; `caption.txt` matches `post`. Re-listen only at joins that changed since
`04_qc_stills.json` (none changed → none); with no earlier report, at every join. Pacing is not
re-measured here.

**Re-transcription recipe.** Cut a window of 3–6 s around the join from the rendered mp4, from
the talk, never the end cards: `ffmpeg -ss <t−3> -t 6 -i <mp4> -vn -ac 1 -ar 16000
out/videos/<slug>/team/qc/cut-<n>.wav`. Transcribe with faster-whisper (CPU, int8,
`language="vi"`, `condition_on_previous_text=False`, `vad_filter=True`): model `medium` for
the pre-screen of all joins, `large-v3` only on the windows `medium` flags. Compare with
`words.json`. Never trust a Whisper-only finding: confirm it with the 10 ms RMS of the source
audio (voiced sound at the cut, or none where a word is said to be missing). Whisper invents
"Hãy subscribe…" and other stock phrases in short windows and puts a sentence-initial "Thì" early;
those are not findings. A clipped or missing word at the cut, confirmed → FIX (owner editor).

Then the **sweep**: `render-video.py` leaves one small frame per visual change in
`out/videos/<slug>/team/qc/sweep/` (`sweep.json` lists them with their times; re-make with
`node scripts/sweep-render.mjs <slug> --sheet`). **Open every frame and look.** These are the
moments nobody named in `edit.json`: a cutaway that lands late, an element up over a spoken
number, a card that never finished animating. Anything wrong → FIX with the frame's time as
evidence.

The same folder holds `sheet-01.jpg`, `sheet-02.jpg`, … : the kept frames tiled 12 to a sheet
(4×3), each stamped with its time. Read the sheets first to see the flow of the whole video in a
few images (pacing, a repeated picture, a colour or style jump between scenes), then open single
frames only where a tile looks wrong or a number and its element need checking at full size.
A sheet never replaces the frames for text: a tile is 320 px wide, too small to read a figure.

For a faceless video (stock and AI pictures) also read the sheets against this rubric, adapted
from crisng95/flowkit's `fk-review-video`. Score nothing; list findings with a severity and the
tile times:
- **CRITICAL** (BLOCK/FIX, never ship): a picture that could pass for a real client, document or
  brand; readable text or a logo inside an AI still; a picture that contradicts the spoken fact
  (a house for a car loan, a rising arrow on a rate cut).
- **HIGH** (FIX): AI artefacts (extra fingers, melted hands, warped objects); a scene whose
  style breaks from its neighbours (the fixed style is navy and amber, no text, people from
  behind); the same clip or still shown twice within 10 s.
- **MINOR** (note): a soft or cropped subject, a dull frame, a cut that lands a beat late.
- Also check: does each picture match its line (prompt adherence), does it move or hold sensibly
  (motion), is the subject clear inside the safe band (composition).

## Verdict

- **BLOCK** — schema fails, compliance card missing or unreadable, a file needed can't be
  opened or a check can't run. Never PASS what you couldn't check.
- **FIX** — any other finding, each with an owner: `story-editor` (cuts, `words.json`, caption words),
  `editor` (layout, timing, numbers on screen), `writer` (B script text).
- **PASS** — no findings; verify notes only.

## Report (`04_qc_stills.json` / `05_qc_render.json`)

```json
{"slug": "", "stage": "stills | render", "verdict": "PASS | FIX | BLOCK",
 "checks": {"schema": "passed | failed: <msg>", "speech_cuts": "", "pacing": "", "golden": "", "captions": "", "cut_list": "", "retranscribe": ""},
 "stills": [{"frame": 0, "ms": 0, "moment": "cover | hook | … | compliance card", "path": "", "ok": true}],
 "findings": [{"severity": "BLOCK | FIX", "evidence": "frame 1234 still qc/f1234.png | 01:02.3",
   "what": "", "fix": "the exact change", "owner": "story-editor | editor | writer"}],
 "verify_for_daniel": [], "previous_findings": [{"what": "", "status": "resolved | open"}]}
```

**Write the report file early**: a draft verdict as soon as the main checks are done, then refine
and overwrite it, so a cut-off session loses nothing. A re-run reads the previous report first and
keeps `previous_findings`, marking each earlier finding resolved or open.
