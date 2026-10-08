# Remotion APIs by agent

Which Remotion APIs each agent in `.claude/agents/` needs, taken from what this repo's code
actually imports (checked 2026-09-26 against the installed **4.0.527**). Look one up in the
saved docs, never read them whole:

```bash
n=OffthreadVideo   # the API name, without < > or ()
grep -n -E "^#{3,4} \`?<?$n([>(\`]|$)" docs/remotion/remotion-examples-all.md   # short example
grep -n -E "^#{3,4} \`?<?$n([>(\`]|$)" docs/remotion/remotion-full-docs.md      # full page
sed -n '<line>,+60p' docs/remotion/remotion-full-docs.md
```

The docs are 4.0.529. Before you use an API, confirm it in `node_modules/<package>/dist/*.d.ts`;
known gaps are in [README.md](README.md). CLI flags (`npx remotion render|still --help`) and
`remotion.config.ts` are not in these files: read the installed `@remotion/cli`.

## video-editor (builds the video)

| Job | APIs |
|---|---|
| Timing and layout | `remotion`: `Sequence`, `Series`, `AbsoluteFill`, `Loop`, `Freeze`, `interpolate`, `spring`, `Easing`, `useCurrentFrame`, `useVideoConfig`, `random` (never `Math.random`) |
| Loading before a frame | `delayRender()` / `useDelayRender`, `staticFile` (serves `public/` only) |
| Footage and sound | `@remotion/media`: `Video`, `Audio`; `remotion`: `OffthreadVideo`; `@remotion/sfx`: URL constants (`whoosh` …) played with `Audio` |
| Captions | `@remotion/captions`: `createTikTokStyleCaptions`, `Caption`, `TikTokPage` |
| Transitions | `@remotion/transitions`: `TransitionSeries`, `linearTiming`, `springTiming`, `fade`, `slide`, `wipe`, `flip`, `clockWipe`, `iris` |
| Text that must fit | `@remotion/layout-utils`: `fitText`, `measureText`, `fitTextOnNLines`, `fillTextBox` (the font must be loaded first) |
| Charts, lines, shapes | `@remotion/paths`: `evolvePath`, `getLength`, `getPointAtLength`; `@remotion/shapes`: `makeRect`, `makeStar`, `makeCallout` |
| Motion and texture | `@remotion/motion-blur`: `CameraMotionBlur`, `Trail`; `@remotion/noise`: `noise2D`/`noise3D`; `@remotion/animation-utils`: `interpolateStyles`, `makeTransform` |
| Audio-reactive visuals | `@remotion/media-utils`: `visualizeAudio`, `useWindowedAudioData`, **but call it through `src/elements/useCoveredAudioData.ts`** (the raw hook draws flat frames, see `docs/BUG-remotion-media-utils-flat-waveform.md`) |
| Highlights and callouts | `@remotion/rough-notation`: `Highlight`, `Underline`, `Circle`, `Box` |
| Other elements | `@remotion/gif`: `Gif`; `@remotion/lottie`: `Lottie`; `@remotion/three`: `ThreeCanvas`; `@remotion/animated-emoji`; `remotion` effects via `@remotion/effects/*` |
| Fonts | `@remotion/fonts`: `loadFont`, or `src/brand/font.ts` `useTyDoFont()` for Be Vietnam Pro. `@remotion/google-fonts` crashes offline renders (`docs/agents/rendering-without-gpu.md`) |
| Metadata from files | `Composition` `calculateMetadata`; `@remotion/media-utils`: `getAudioDurationInSeconds`, `getVideoMetadata` |

## video-qc (checks what the editor built)

| Job | APIs |
|---|---|
| Stills and renders | CLI `npx remotion still` / `render` (flags from `--help`); programmatic: `@remotion/renderer` `renderStill`, `selectComposition`, `getCompositions` |
| File facts (duration, tracks, fps) | `@remotion/media-parser`: `parseMedia`; `@remotion/media-utils`: `getVideoMetadata` |
| Caption pages | `@remotion/captions`: `createTikTokStyleCaptions` (how pages are built, what `combineTokensWithinMilliseconds` does), `serializeSrt` for the `.srt` |
| Why a frame is blank or flat | `delayRender()` timeouts; `useWindowedAudioData` (see the bug file above) |

## video-story-editor (paper edit)

| Job | APIs |
|---|---|
| What `words.json` is | `@remotion/captions`: `Caption` (`text`, `startMs`, `endMs`, `timestampMs`, `confidence`); `@remotion/install-whisper-cpp`: `toCaptions` |
| Subtitles in and out | `@remotion/captions`: `parseSrt`, `serializeSrt` |
| Transcripts from other engines | `@remotion/openai-whisper`: `openAiWhisperApiToCaptions`; `@remotion/elevenlabs`: `elevenLabsTranscriptToCaptions` |
| Take lengths for `clips.json` | `@remotion/media-utils`: `getVideoMetadata`, `getAudioDurationInSeconds` |

## motion-designer (plans the visuals)

Reads, never imports: the plan names elements by rung (`.claude/skills/purposeful-motion/references/element-sources.md`).

| Job | APIs |
|---|---|
| Hold and timing vocabulary | `remotion`: `Sequence`, `interpolate`, `spring` (to read what an element does, not to write it) |
| Transitions (`breathe`) | `@remotion/transitions`: `TransitionSeries`, `fade`, `slide`, `linearTiming`, `springTiming`; `@remotion/light-leaks` |
| Emphasis and annotation | `@remotion/rough-notation`, `@remotion/rounded-text-box`, `@remotion/layout-utils`: `fitText` |
| Shapes and charts | `@remotion/shapes`, `@remotion/paths`: `evolvePath` |

## pipeline-optimizer (render speed)

| Job | APIs |
|---|---|
| Render options to time | `@remotion/renderer` `renderMedia`: `concurrency`, `offthreadVideoCacheSizeInBytes`, `hardwareAcceleration`, `x264Preset`, `jpegQuality`, `chromiumOptions` (all present in 4.0.527); the same as CLI flags via `npx remotion render --help` |
| Bundle once, render many | `@remotion/bundler`: `bundle`; `@remotion/renderer`: `selectComposition`, `ensureBrowser` |
| Footage decoding | `OffthreadVideo` vs `@remotion/media` `Video` |

## quality-reviewer (after refactors)

| Job | APIs |
|---|---|
| The bundle builds and every composition registers | `@remotion/bundler`: `bundle`; `@remotion/renderer`: `getCompositions`; CLI `npx remotion compositions` |
| Asset paths resolve | `remotion`: `staticFile`, `getStaticFiles` |

## asset-refactorer and architecture-auditor (asset layout)

| Job | APIs |
|---|---|
| What a composition can load | `remotion`: `staticFile` (maps to `public/` only), `getStaticFiles`; `Composition` `calculateMetadata` (MortgageReel reads `edit.json` and `words.json` through it) |

## video-script-writer and video-compliance-reviewer

No Remotion API. They write and check words; `scripts/voice-video.mjs` and the editor turn them into video.
