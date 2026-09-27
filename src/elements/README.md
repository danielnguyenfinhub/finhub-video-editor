# Elements

Reusable, checked building blocks for designs and one-off videos, each one file,
brand-coloured by default, Vietnamese-safe (letters keep their marks, line
heights leave room for them). Every element renders in the `ElementCatalog`
composition (Studio → "Elements"), which is how each was verified. After adding
or changing an element, run `node scripts/check-element-copy.mjs`: it puts every
string in this folder (catalog samples, built-in text) through the RG 234 guard.

| Element | What it does | Remotion APIs |
|---|---|---|
| `Typewriter` | types text out, blinking caret | `interpolate` |
| `LineReveal` | headline lines slide up out of clipped rows | `spring` |
| `StaggerTitle` | letters spring in one by one | `spring` |
| `NeonTitle` | neon flicker-on, then glow pulse | `random`, `spring` |
| `RgbSplitText` | glitch red/cyan channel split | `random` |
| `CountdownRing` | 5…4…3 countdown with emptying ring | `spring` |
| `LineGraph` | trend line that draws itself, points pop as it arrives; axis spans the data with its end values printed | `evolvePath` (`@remotion/paths`), `spring` |
| `SlashIntro` | diagonal split title card | `spring`, CSS `clip-path` |
| `KenBurns` | pan-and-zoom over a still | `Img`, `interpolate` |
| `TiltFrame` | 2.5D camera swing around any content | `spring`, CSS 3D |
| `ImageCarousel` | 3D ring of photo cards turning one card at a time; not for lender logos (use `LenderRow`) | `@remotion/three` `ThreeCanvas`, `useDelayRender`, `spring` |
| `FocusCrop` | reframes wide footage to 9:16 following the subject | `OffthreadVideo`, `interpolate` |
| `BeforeAfter` | sweeping split between two layers (e.g. graded vs not) | CSS `clip-path` |
| `TextMatte` | content shows through big letters | blend modes |
| `VideoGrid` | up to 9 clips in a grid with name tags | `OffthreadVideo` |
| `NewsTicker` | seamless scrolling ticker | `@remotion/layout-utils` `measureText`, `useDelayRender` |
| `CaptionBox` | boxed captions, the word being said lit in amber (takes `words.json` words) | `createTikTokStyleCaptions` (`@remotion/captions`) |
| `SocialHandle` | "follow us" pill with the logo | `Img`, `spring` |
| `ProgressBar` | reels-style progress bar | `useVideoConfig` |
| `ReviewStamp` | "draft" watermark + burnt-in timecode for review copies | `useCurrentFrame` |
| `Particles` | seeded drifting particles | `random` |
| `PulseBadge` | badge that pulses every N frames | `Loop` |
| `AudioRing` | frequency ring around a logo/face | `@remotion/media-utils` `useAudioData`, `visualizeAudio` |
| `FrequencyBars` | equaliser bars with falling peak markers; silent unless `playAudio` (the voice is already playing) | `useAudioData`, `visualizeAudio` |
| `Oscilloscope` | live waveform line of the voice; `frame` = moment in the audio, so it follows the paced cut (explainer design, under the captions) | `useCoveredAudioData` (useWindowedAudioData that holds the frame until its window is in), `getWaveformPortion`, `createSmoothSvgPath` |
| `MirroredSpectrum` | frequency bars mirrored from the centre, same `frame` rule (classic design, low on the frame) | `useCoveredAudioData`, `visualizeAudio` |
| `NoiseField` | breathing dot-grid background | `@remotion/noise` `noise3D` |
| `WordHighlight` | hook line lit word by word; words in *asterisks* fill amber | `interpolate` |
| `NotificationStack` | phone-style alerts sliding in (hook), count badge on the first; up to 4 | `spring` |
| `QuoteCard` | client review quoted word for word; DRAFT watermark (`ReviewStamp`) and a do-not-publish line until `consentConfirmed` | `interpolate` |
| `starWipe` | custom transition presentation: next scene grows from a star | `@remotion/transitions`, `@remotion/shapes` `makeStar`, `@remotion/paths` `translatePath` |
| `BehindWord` | a spoken keyword drawn huge behind Daniel (render it from a design's `Behind` layer; his cut-out covers part of it); `pickBehindWords()` shows which words it will use. Needs a cut-out, so it isn't in `ElementCatalog` | `@remotion/layout-utils` `fitText`, `spring` |
| `beats.ts` | `useAudioMap("music/<name>.mp3")` loads the track's beat map from `scripts/analyze-beats.py`; `snapToBeat(ms, beats)` moves a moment onto the nearest beat (within 150 ms) | `useDelayRender`, `staticFile` |

Script: `node scripts/export-chapters.mjs <slug>` prints a YouTube/Facebook
chapter list (timed on the rendered video) from `edit.json` chapters.

Adapted from snippets Daniel collected; each was fixed against Remotion
4.0.527 before landing here (e.g. text is measured only after the brand font
has loaded, at a weight that is loaded; clip paths avoid shared SVG ids;
sample text is RG 234-clean). Snippets not taken: editor UI (timeline,
gizmos, snapping), AWS/Lambda/server code, and ones that duplicate what
exists (captions, ducking, loudness, 3D, Lottie, grain/vignette via `look`).

Design concepts for `WordHighlight`, `NotificationStack` and `QuoteCard`
inspired by reactvideoeditor/remotion-templates (MIT). The pack's other seven
map to what exists: lower third → `src/brand/LowerThird` (+ finhub-lower-third
skill); stat counter → the hook's `countTo` (`HookTitle`), stat cards and
`ChangeCard`; comparison chart → the `compare` / `bars` cues; line chart →
`LineGraph` (`trend` cue); animated list and progress steps → the `points` cue
and the checklist design's `StepColumn`; end card → each design's `Outro` and
the locked `ComplianceCard`.
