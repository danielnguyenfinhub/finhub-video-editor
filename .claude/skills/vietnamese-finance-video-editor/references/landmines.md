# Landmines — each one already cost a render (symptom → cause → fix)

- Frame-fetch timeouts at random frames → phone source has 8 s keyframes → always render
  the prep proxy `public/recordings/<id>/source.mp4` (short GOP; `public/videos/<slug>/` for
  an `edit.json` without `"source"`).
- Files change on disk mid-task, render 404s on edit.json → GitHub Desktop pull or branch
  switch stashed uncommitted work (one stash per branch, replaced on each switch) →
  `git stash list`; untracked files sit in the stash's main tree
  (`git show "stash@{0}:<path>"`), not `^3`. Work on a branch Daniel isn't switching.
- A long headline runs off its card ("INTEREST IN ADVANCE", "CLAIM NĂM NAY") → fixed
  font size → `fitText` to the box width.
- A stat card and a chapter banner overlap → both timed near the same word → start the
  card after the banner (~1 s) or move the banner.
- The auto stutter cut removed "các bạn." before "Các bạn hãy…" → repeats across a
  sentence end matched → core fix in design-architecture.md; always read the auto-cut
  list printed by render-video.py.
- A caption fix broke a correct phrase ("tiền giống" → "gốc" would also hit "giống như")
  → flat `captionFixes` swap → context-bound rule in `fixWord`.
- Compare-card row text collides with the VS badge → label + value share one line →
  keep each row under ~18 characters.
- Re-transcribing the last seconds returned "Cảm ơn các bạn đã theo dõi" → Whisper
  hallucinates on silence/end cards → take the window from the talk; use `vad_filter=True`.
- A 4:5 (1080×1350) source → `objectFit: cover` zooms 1.42× and crops the sides → check
  the face stays inside ~15–85% of the width before designing.
- WebGL leaks/3D/effects render black → missing `--gl=angle` → render via render-video.py.
- `trimAfter` with `playbackRate` blanks a slowed segment's tail → only `trimBefore`
  (PacedVideo does this).
- A paced video in a `<Sequence>` with a negative `from` plays out of sync (the pip lagged the
  voice by 0.5 s) → Remotion skips the frames before 0 at rate 1, not `playbackRate` → start
  the Sequence at 0 and move `trimBefore` on by `skip * rate` instead (Visuals.tsx pip).
- Tax talk with no tax disclaimer → a credit rep isn't a tax agent → `compliance.taxNote`.
- Moving-pill caption drawn beside the words in renders (fine in the Player) → words measured with offsetLeft/Top before Be Vietnam Pro loaded, so the line wrapped differently → measure only after reelFontReady() and hold the frame with useDelayRender (studio PillCaptions; same class as NewsTicker/BoxCaption). Applies to every Remotion Element that measures text.
- Background removal (review/matte.html) took 44.5 min for a 3.5-min video on this PC (about 13x, not the 9x measured on the shorter interest-in-advance). Start it first, before any other work on the video, and keep the browser tab open.
- Speech disappears, or chopped words ("gai gai") after render → the Whisper transcript has a gap or a wrong word time and the timeline cuts at word times → `node scripts/check-speech-cuts.mjs <slug>` before render; add the missing words or retime in `words.json` (hand edits are lost if prep is re-run: log old/new in `edit.json` `notes`).
- `remotion compositions` fails with a ListingReel error for a talking-head slug → every composition receives the same props → use `node scripts/check-schema.mjs <slug>`.
- QC re-transcription invents "Hãy subscribe cho kênh …" or an early "Thì" → Whisper hallucinates in short or silent windows and places a sentence-initial "Thì" early → confirm with the 10 ms RMS of the source, never Whisper alone.
- `edit.json` omits `pacing` or says `auto` → the render plays segments at 0.9-1.2× and shifts Daniel's pitch and tone (30/09/2026) → footage always has `"pacing": {"mode": "off"}`; `preflight` blocks otherwise (`scripts/timeline.selftest.mjs` pins that no field means auto).
- A `check-*` script passes here but fails on a clean machine or in CI with "Cannot find package 'remotion'" or a SyntaxError on `node_modules/esbuild/bin/esbuild` → ~18 scripts bundle into `os.tmpdir()` and import `remotion` from there; it only resolves because `C:\Users\Daniel\node_modules` (527 packages) sits above Daniel's temp dir, and `bin/esbuild` is a native binary off Windows. CI therefore runs `checks` on Windows with `TEMP` inside the workspace (`.github/workflows/check.yml`). Do not delete that stray folder; to remove the dependency, make the scripts bundle under the repo.
- Chapter transitions jump seconds when `cut.fillers:false` is set → it removes the cut they were snapped to → keep a pause-only `remove` at the chapter's join.
- Two phrases garbled together at a chapter slide ("nhiều. / Thì thường" heard as nonsense) → the transition plays BOTH segments' audio for 10 frames, and a pause-only `remove` shorter than that leaves speech on both sides of the join → `node scripts/check-speech-cuts.mjs <slug>` flags "chapter N transition overlap"; widen the pause (retime the later word's startMs, or move `chapters[i].atMs` to a pause >= 0.5 s).
