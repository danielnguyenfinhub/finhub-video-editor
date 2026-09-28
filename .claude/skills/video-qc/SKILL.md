---
name: video-qc
description: >-
  Independent technical QC of a Finance Hub video built in this repo: stills at the runbook's
  frames, the golden report (every number charted, every bank badged, safe zones, face-hidden
  time), caption pages, the automatic cut list read against the words, and after the render a
  re-transcription around each cut. Returns PASS / FIX / BLOCK with a frame or timestamp as
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

1. **Schema (A6.1 / B5.1).** Fails → BLOCK with the last lines; nothing else can be judged.
2. **Frames.** From `edit.json` (`coverFrameMs`, `hook`, `stats`, `cues`, `visuals`, `cta`,
   `chapters`) and the composition length, list the frames the row names: A6.2 for A (cover,
   hook, each signature moment, each B-roll visual, CTA, compliance card in the last 5 s),
   B5.2 for B (cover, hook, each element, two footage scenes, CTA, compliance card).
   `edit.json` times are *source* ms; `--frame` is on the *output* clock (cuts removed, cover
   card added). Map with the SRT that `export-srt.mjs` writes (already on the output clock):
   the caption holding the moment's words starts at t s → frame round(t × 30). Cover: frame 30.
   Compliance card: the duration `npx remotion compositions` prints, minus 75 frames.
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

## Stage `render` (A7.2, after the full render)

For each cut (from `remove` and the export-srt cut list), take about 15 s of the rendered
`out/videos/<slug>/<slug>.mp4` around it, from the talk, never the end cards:
`ffmpeg -ss <t−7.5> -t 15 -i <mp4> -vn -ac 1 -ar 16000 out/videos/<slug>/team/qc/cut-<n>.wav`,
then transcribe it with faster-whisper as `scripts/prep-video.py` does (`large-v3`, CPU,
int8, `language="vi"`). Compare with `words.json`. A clipped or missing word at the cut → FIX
(owner editor). Also check the durations and that audio is present (`ffprobe`). Whisper
inventing "cảm ơn các bạn đã theo dõi" on silence is not a finding.

Then the **sweep**: `render-video.py` leaves one small frame per visual change in
`out/videos/<slug>/team/qc/sweep/` (`sweep.json` lists them with their times; re-make with
`node scripts/sweep-render.mjs <slug>`). **Open every frame and look.** These are the moments
nobody named in `edit.json`: a cutaway that lands late, an element up over a spoken number, a
card that never finished animating. Anything wrong → FIX with the frame's time as evidence.

## Verdict

- **BLOCK** — schema fails, compliance card missing or unreadable, a file needed can't be
  opened or a check can't run. Never PASS what you couldn't check.
- **FIX** — any other finding, each with an owner: `story-editor` (cuts, caption words),
  `editor` (layout, timing, numbers on screen), `writer` (B script text).
- **PASS** — no findings; verify notes only.

## Report (`04_qc_stills.json` / `05_qc_render.json`)

```json
{"slug": "", "stage": "stills | render", "verdict": "PASS | FIX | BLOCK",
 "checks": {"schema": "passed | failed: <msg>", "golden": "", "captions": "", "cut_list": "", "retranscribe": ""},
 "stills": [{"frame": 0, "ms": 0, "moment": "cover | hook | … | compliance card", "path": "", "ok": true}],
 "findings": [{"severity": "BLOCK | FIX", "evidence": "frame 1234 still qc/f1234.png | 01:02.3",
   "what": "", "fix": "the exact change", "owner": "story-editor | editor | writer"}],
 "verify_for_daniel": [], "previous_findings": [{"what": "", "status": "resolved | open"}]}
```

A re-run reads the previous report first and marks each earlier finding resolved or open.
