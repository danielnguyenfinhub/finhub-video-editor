# What the sibling repos have that finhub-video could use (28 September 2026, AEST)

Verdict: eight features are worth bringing over; three are cheap and pay back on the next
video. The rest of the three repos is either already here (often in a stronger form) or
built for a different product (AI-generated film, GPU video models, HyperFrames).

**Status (29 September 2026): all eight implemented on this branch.** Where each landed:
1 `scripts/sweep-render.mjs` (run by `render-video.py`; check `check-sweep.mjs`) · 2
`scripts/research.py transcript` · 3 `scripts/reframe.py` (called by `prep-video.py`; check
`check-reframe.py`) · 4 `scripts/music-start.mjs` + `edit.json` `music.startMs` · 5
`scripts/check-contrast.mjs` (a `promote-design.mjs` gate) · 6 `visuals.mjs` `generateStill`
(`AI_CANDIDATES`, Gemini judge; check `check-visuals.mjs`) · 7 `scripts/clip-score.mjs` (in
`visuals.mjs` `downloadStock`; `CLIP_MIN`) · 8 `video-status.mjs --check` as the SessionStart
hook in `.claude/settings.json`. Untested here for lack of keys, network or a landscape
recording: the Gemini judge and fal call, the CLIP model download, OpenCV on real footage.

Repos read: `danielnguyenfinhub/claude-video` (the `watch` skill, stdlib Python over
yt-dlp + ffmpeg + Whisper API), `danielnguyenfinhub/ViMax` (LangChain multi-agent
idea → film pipeline over Veo/Seedance), `danielnguyenfinhub/OpenMontage` (about 150
Python tools plus a Remotion composer, agent-orchestrated). Every claim below was checked
against the code, not the READMEs. Line numbers are as read on this date. Nothing has been
implemented; this is the list to pick from.

## Ranked

| # | Feature | From | Gap in finhub-video today | Effort | Payback |
|---|---|---|---|---|---|
| 1 | Scene-change frame sweep of the finished render (+ 16×16 dedup) | claude-video | QC only looks at frames edit.json names; nothing sweeps the mp4 for what it didn't expect | small (ffmpeg + ~60 lines) | every video's QC |
| 2 | Whisper fallback when a YouTube video has no subtitles | claude-video | `research.py transcript` exits with "no subtitles" | small (faster-whisper is already installed) | research for Mode B |
| 3 | Face-tracked auto-reframe 16:9 → 9:16 | OpenMontage | a landscape recording is centre-cropped; the face can leave frame | medium | any landscape footage |
| 4 | Music start-point from loudness ("where the track gets interesting") | OpenMontage | music always starts at 0:00 | small (ffmpeg ebur128) | every video with music |
| 5 | Contrast and colour-blind checks in `promote-design` | OpenMontage | promotion checks manifest, stills, copy, RG 234; not legibility | small | every new template |
| 6 | Pick-best-of-N for AI stills (vision judge) | ViMax | `aiClip` takes the one image it gets | small, costs ~US$0.03 × N per still | faceless AI scenes |
| 7 | CLIP scoring for stock-clip relevance | OpenMontage | word overlap only; already a `ponytail:` note in `visuals.mjs:41` | medium (transformers.js, CPU) | fewer wrong B-roll hits |
| 8 | SessionStart dependency hook | claude-video | readiness is checked by `video-status`, but only when someone runs it | small | fewer dead runs |

## Detail

### 1. Scene-change sweep of the render (claude-video)

What it is: one ffmpeg pass `select='eq(n,0)+gt(scene,0.20)'` with `showinfo` lists every
visual cut; if fewer than 8 are found it falls back to uniform sampling; near-duplicates are
dropped by comparing 16×16 grey thumbnails (mean absolute difference ≤ 2). The output is a
short list of JPEGs at 512 px plus their timestamps, which the agent then looks at.
`skills/watch/scripts/frames.py:217-280` (scene), `:424-507` (dedup), `:122-138` (frame
budget by duration: ≤30 s → max(12, seconds), ≤60 s → 40, ≤180 s → 60, ≤600 s → 80, 2 fps cap).

Why here: `video-qc` A6.2 renders stills at the frames edit.json names (cover, hook, stats,
cues, CTA, compliance card). It cannot see a B-roll cutaway that lands a second late, an
element that pops during a spoken number, or a template artefact between chapters, because
nobody named that frame. A sweep of `out/videos/<slug>/<slug>.mp4` at A7.2 would show every
visual change in about 40–80 half-price images, and the dedup keeps a 3-minute talking head
from producing 200 near-identical frames.

Fit: add a `sweep` step to `scripts/` (Node, calling ffmpeg like `render-video.py` does) and one
row in the runbook at A7.2 / B5.2. Their tests use lavfi colour-bar clips with forced
keyframes per cut (`tests/conftest.py`), which the repo's `check-*.mjs` pattern can copy.

### 2. Whisper fallback in `research.py transcript` (claude-video)

What it is: captions first (`--write-subs --write-auto-subs`), and only when none exist
download audio only (`ba/bestaudio`) and transcribe, splitting audio over 24 MB into
offset-shifted chunks. `download.py:fetch_captions`, `whisper.py:40-62` (chunking),
`watch.py:239-266` (the decision).

Why here: `scripts/research.py:389-408` stops with "has no 'vi' subtitles (try --lang en)".
Many small Vietnamese channels have no captions at all, which is exactly the sample B1.0
wants ("hear how Vietnamese channels explain it"). faster-whisper `large-v3` is already what
`prep-video.py` runs, so the fallback is an audio download plus the existing call. Their VTT
dedupe of YouTube's rolling cues is already covered by `vtt_text()`.

Skip from the same repo: the Groq/OpenAI Whisper client (local model is better and free),
the English-only caption filter, the `.env` parser, the `.skill` build.

### 3. Face-tracked auto-reframe (OpenMontage)

What it is: MediaPipe face tracking (Haar cascade fallback), a moving-average smoothed
trajectory, then a static or dynamic ffmpeg crop to the target aspect.
`tools/video/auto_reframe.py:403-480`, `tools/analysis/face_tracker.py`.

Why here: the runbook (A1.1) says a non-9:16 source is cover-cropped and Daniel must
"confirm the face stays in frame". A tracked crop removes that check and lets him record
landscape when a phone stand only holds that way. The matte (`review/matte.ts`) already runs
per frame on the proxy, so the crop belongs in `prep-video.py` step 1, before the matte.

Fit: Python (MediaPipe installs into the same venv as faster-whisper). Only worth doing if
landscape footage actually arrives; today every recording is vertical.

### 4. Music start offset from loudness (OpenMontage)

What it is: read the track's momentary loudness with ffmpeg `ebur128`, find the first
sustained rise, return that offset (and whether the track must loop).
`tools/analysis/audio_energy.py`.

Why here: `edit.json` `music` is `{file, volume}`; `MortgageReel.tsx:59-65` loops the file
from its start and ducks it. A track with a 12-second intro plays its quietest bars under
the hook, the loudest moment of the video. A `startMs` on the music object, filled by
`analyze-beats.py` (which already opens the track with librosa) is the smallest change.
Their sidechain ducking numbers (music 0.15 while speaking, 200/500 ms attack/release,
`audio_mixer.py:340-420`) are close to what the reel does in React (0.3 × 0.3, 700 ms hold,
10-frame ramp); nothing to change there.

### 5. Contrast and colour-blind checks at promotion (OpenMontage)

What it is: WCAG contrast of every text/background pair in a style, plus a colour-blind
safety pass over the palette. `styles/playbook_loader.py:210-400`.

Why here: `scripts/promote-design.mjs` checks the manifest, renders stills, matches copy and
runs RG 234, but a design can pass with light-grey captions on a light card. The
`corrections.md` loop says "measurable → a check script fails on it"; text legibility is
measurable. The theme tokens in `src/brand/` and each design's theme give the pairs; `culori`
is already a dependency and computes WCAG contrast.

### 6. Best-of-N for AI stills (ViMax)

What it is: generate N candidates, ask a vision model to rank them on subject accuracy,
consistency with the style anchor and absence of borders/text, keep the index it returns.
`agents/best_image_selector.py:12-147` (written, but never wired into a ViMax pipeline).

Why here: `visuals.mjs aiClip` makes one FLUX still per scene and the agent only sees it at
QC. Three candidates at about US$0.03 each plus one Gemini vision call catches the still
with a mangled house or a readable fake logo before it is animated. The library's `add()` stays
the single write path; only the chosen file is added.

### 7. CLIP relevance for stock clips (OpenMontage)

What it is: 5 thumbnails per candidate clip, CLIP `vit-base-patch32` embeddings (CPU,
150–300 ms each), fused with tag similarity, ranked per slot; a global cache with licence
provenance. `tools/video/corpus_builder.py`, `tools/video/clip_search.py:10-22`,
`lib/clip_embedder.py`, `tools/video/clip_cache.py`.

Why here: `visuals.mjs:41` already records this as the known limit ("word overlap, not
meaning; add a CLIP score (as OpenMontage does)"). The library in `public/library/` with its
`meta.json` per asset is the corpus; what is missing is the embedding and the score. The
provenance cache is already covered by `library.mjs`. Medium effort because it adds a model
download (about 350 MB) and a Python or transformers.js step to the download path.

### 8. SessionStart dependency hook (claude-video)

What it is: `hooks/hooks.json` runs a 5-second shell check at session start; silent when
ffmpeg, yt-dlp and the key file are in place, one status line otherwise. Their `setup.py
--check` returns distinct exit codes (2 missing binaries, 3 no key, 4 both) and `--json`.

Why here: `scripts/video-status.mjs:101-113` already knows how to say "blocked: ffmpeg is
missing", but only when run. A SessionStart hook in `.claude/settings.json` that runs
`node scripts/video-status.mjs --check` (quiet on success) tells the agent before it spends
tokens on a video that cannot render. The docs say a subagent "did not see this file";
the same applies to a missing Python package.

## Already here, so not proposed

| Sibling feature | Where finhub-video has it |
|---|---|
| Silence cutter (OpenMontage `silence_cutter.py`, ffmpeg silencedetect) | `src/mortgage/timeline.ts:86-87` cuts gaps over 380 ms from word timings, plus hesitations, stutters and swear words; stronger than dB-based cutting |
| Colour-grade presets and LUTs (`color_grade.py`) | `edit.json` `look` (`schema.ts:190`, recipes in `MortgageReel.tsx`), switchable on the review page |
| Loudness normalisation (`audio_mixer.py` loudnorm −16) | `render-video.py:81-91` two-pass loudnorm to −14 LUFS |
| Music ducking (sidechain) | `MortgageReel.tsx:59-65` |
| Pre-render validator (`composition_validator.py`) | `scripts/preflight.mjs` (fonts, cues outside the talk, overlaps, long text) and `check-golden.mjs` (safe zones, face-hidden time) |
| Karaoke captions with past/active/future colours | `src/mortgage/PagedCaptions.tsx` and per-design caption styles |
| Stage manifests with approval gates, checkpoints, reviewer (OpenMontage `pipeline_defs/`, `lib/checkpoint.py`) | `references/runbook.md` rows with gates, `video-production-team` agents, `out/videos/<slug>/team/*.json`, `video-status.mjs` |
| Slideshow-risk / variation checker | `main.py check <axes.json>` (A3.3 variety check on 7 skin axes) |
| Chart, comparison, stat, end-tag Remotion components (`remotion-composer/`) | `cues` (compare, bars, points, verdict, venn, kinetic), `figuresOf` charts, 24 designs under `src/designs/`, remocn and Elements catalogues |
| Screenshot scene with animated cursor | `src/designs/phoneapp/` (Phone, Screens, Chrome) plus `@remotion/mac-cursors` |
| Stock first, AI only on a miss; one seed per video; never mix stock and AI in a scene | already borrowed from OpenMontage: `visuals.mjs`, `voice-video.mjs:125,477`, `faceless-script.md:74` |
| Beat grid for music | `scripts/analyze-beats.py` (HyperFrames' analyser) |
| Re-transcription QC at cuts (claude-video transcript-cue frames) | runbook A7.2 |
| TTS provider chain (13 providers, weighted ranker) | three engines that matter here: Google Charon, OmniVoice, ElevenLabs; a ranker for three options is overhead |
| Cost tracker (estimate → reserve → reconcile) | the orchestrator holds the cost gate (B3) and states paid calls at 0.5; add only if paid generation grows |

## Not a fit

- **ViMax as a whole**: character portraits, storyboard → first/last-frame decomposition,
  camera tree with transition-video cuts, reference-image selection. All of it exists to
  keep AI-generated people consistent across generated shots. Finance Hub videos are Daniel
  on camera or stock/element scenes with nobody identifiable (`visuals.mjs:30`). If faceless
  videos ever move from slow-zoom stills to image-to-video clips, ViMax's
  `variation_type` rule (only generate a last frame for medium/large motion) and the Veo
  first+last-frame call are the two things to reread. Its novel pipeline is broken
  (`novel2movie_pipeline.py:562` passes the wrong kwarg) and its rate-limited Yunwu configs
  raise at start-up; nothing to copy there.
- **OpenMontage HyperFrames runtime, Ink Theater, Backlot**: a second render runtime, a
  GSAP doodle engine, and a FastAPI storyboard viewer. The review page (`npm run review`)
  already does the part Daniel uses. Ink Theater's spring and IK maths are pure functions if
  a hand-drawn faceless style is ever wanted; niche.
- **GPU video and image generators, avatars, lip-sync, upscalers**: cost, GPU, and no
  place in a talking-head or stock-footage reel.
- **claude-video packaging** (`.skill` build, `SKILL_DIR` resolution, dev-sync): only
  matters for shipping a skill to other hosts, which `scripts/build-chat-skill.mjs` already
  handles for this repo's own chat skill.

## Suggested order

1 (render sweep) and 2 (Whisper fallback) first: both are a day, reuse installed tools, and
touch the two runbook steps that run on every video. Then 5 (contrast check) because the
corrections loop wants measurable rules. 4 (music offset) when the next video uses music.
3, 6, 7 and 8 when their trigger arrives (landscape footage, an AI still that fails QC, a
wrong stock hit, a dead run from a missing dependency).

Sources: the three repos at `/home/user/{claude-video,ViMax,OpenMontage}` and this checkout
at commit `70a9a34`, read 28 September 2026.
