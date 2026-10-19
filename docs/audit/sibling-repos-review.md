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

## Upgrade run 1 (18 October 2026, upgrade-team)

All nine sibling repos were read by one `sibling-repo-analyst` each, alongside `bug-hunter` and `gap-analyst`. Every candidate was checked by two refuters against the code: 33 of 37 survived. Daniel picked 16, plus 2 automatic fixes. The full backlog, with reasons for the dropped ones, is in `out/teams/upgrade/02_backlog.md` (git-ignored); this section is the record.

**Licences:** OpenMontage is **AGPL-3.0**: its ideas only, never its code (U8 was written fresh). remocn is MIT, and its reactbits-derived code must never be ported. Scrapling is BSD-3-Clause. Agent-Reach, paperclip and claude-video are MIT. harness and harness-100 are Apache-2.0. Remotion is under its own licence (see `docs/agents/mediabunny-and-licence.md`).

| U | Source | Ported | Licence |
|---|---|---|---|
| U4 | HARN-1 | Freeze reviewed artefacts by hash: QC/compliance verdicts record the inputs hash; video-status and publish-post treat a PASS on changed inputs as stale | Apache-2.0 (practice only, no code) |
| U5 | REMOTION-1 | Re-run calculateMetadata in Studio when edit.json / words.json change (watchStaticFile + reevaluateComposition) | Remotion licence (owner on the free tier |
| U6 | H100-1 | VI-EN finance glossary + do-not-translate list + MQM-lite pass for the English subtitles line | Apache-2.0 (port with attribution |
| U7 | REMOCN-1 | CSS-only remocn transitions as the fallback for finhub's 12 HtmlInCanvas chapter transitions (instead of fade) | MIT (port with attribution) |
| U8 | OPEN-1 | Per-scene delivery for TTS narration: optional style line and pauseAfterMs per script.json scene | AGPL-3.0: idea only, no code |
| U9 | REMOTION-2 | premountFor (plus name) on the B-roll and pip Sequences in Visuals | Remotion licence (owner on the free tier |
| U10 | PAPER-2 | FIX-loop round count saved in the reviewer JSON, with a gate when the rounds run out | MIT (port with attribution) |
| U12 | AGENT-REACH-1 | Turn on Node as yt-dlp's JS runtime and install yt-dlp-ejs in research.py | MIT (idea plus a yt-dlp option |
| U13 | SCRAP-1+SCRAP-3 | Local fallback for research.py read when Jina fails (direct GET with browser headers, body only, noise tags dropped, stdlib html.parser to text) | BSD-3-Clause: port with attribution |
| U14 | HARN-2 | No retry for usage-limit, auth or permission failures; record what finished and the reset time; never blind-resend a paid voice/image call | Apache-2.0 (practice only) |
| U15 | CV-1 | Timestamped caption transcripts in research.py transcript | MIT, port with attribution |
| U16 | HARN-3 | Give Edit to agents that fix their own artefacts in FIX rounds (motion-designer, repurpose writers, yt writers) | Apache-2.0 (practice only) |
| U17 | HARN-4 | Trigger checks (10 should-fire, 10 near-miss) for video-production-team, overlap cleanup between refactor-team and dev-efficiency-team, and a check-teams assertion that team skills keep Test scenarios and Trigger checks | Apache-2.0 (practice only) |
| U18 | REMOCN-2 | Restore length (own-motion frames) and first avoidWhen (with a named substitute) in the remocn CATALOG via a vendor-remocn.mjs re-sync script with a substitute-exists check | MIT (port with attribution) |

**Not picked, kept for a later run:** U19 OPEN-2, U20 AGENT-REACH-3, U21 PAPER-3, U22 G4, U23 G8, U24 CV-3, U25 CV-2, U26 OPEN-3, U27 AGENT-REACH-2, U28 H100-2, U29 G6, U30 G5, U31 REMOCN-3.

**Dropped by the refuters:** SCRAP-2, SCRAP-4, PAPER-1, HARN-3.

## Upgrade run 2 (19 October 2026, upgrade-team)

Daniel picked all 12 items that run 1 had left unbuilt (U19 to U31; U25 and U26 were built as one). Each was checked again against main before it was built. A Railway deployment of the repo had failed at build, so it was fixed in the same run: the MCP server now has an HTTP mode for Railway. An independent quality review and a security review covered the whole run; every blocking finding, and the optional findings that had a real path to a failure, were fixed (PRs 154 and 155).

| U | Source | Built | Licence |
|---|---|---|---|
| U19 | OPEN-2 | Voice chain on TTS narration in voice-video.mjs (high-pass, presence lift, light compression, limiter; `--no-chain` to A/B) | AGPL-3.0: idea only, written fresh |
| U20 | AGENT-REACH-3 | `video-status --check` warns when yt_dlp or feedparser is missing | MIT (pattern only) |
| U21 | PAPER-3 | Per-agent time and tokens in `team/usage.jsonl`, totals in video-status | MIT (idea) |
| U22 | G4 | `uses`/`lastUsed` removed from template.json (the design-log is the record of use) | n/a |
| U23 | G8 | One shared `src/elements/saidRoom.ts` for six designs (stills unchanged) | n/a |
| U24 | CV-3 | `sweep-render --start/--end` focus window | MIT (port with attribution) |
| U25+26 | CV-2, OPEN-3 | `research.py watch`: a reference video's pacing (cuts per minute, mean shot, first cut), contact sheets and captions | MIT glue; AGPL-3.0 pacing idea only |
| U27 | AGENT-REACH-2 | `research.py comments`: most-liked comments, text and likes only, reply @handles removed | MIT (idea) |
| U28 | H100-2 | `research.py audience` plus the "Audience questions" step in yt-youtube-metadata | Apache-2.0 (idea) |
| U29 | G6 / OD-22 | The 11 standalone remotion-* skills removed; the remotion-best-practices router is the only copy | n/a |
| U30 | G5 | `select-template.mjs --report`; weights unchanged until Daniel answers OD-29 on his PC | n/a |
| U31 | REMOCN-3 | `page` cue: a long page scrolled on remocn's tilted stage (vertical video only; YouTubeReel refuses it) | MIT (port with attribution) |

**Railway:** `railway.json` builds `mcp/Dockerfile`, which runs `mcp/http.mjs`. That serves `list_designs` and `research` (trending, topic, comments) behind `MCP_TOKEN`, with research files kept under `out/`, YouTube links only, at most 2 research jobs at once and a 16 KB body cap.
