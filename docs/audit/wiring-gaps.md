# Remotion APIs and elements: what is wired, what is not (28 September 2026, AEST)

Verdict: the pipeline has no broken wiring. Every cue kind, every chapter transition and
the B-roll visuals are rendered for every design through the core or classic's shared
components, and every design implements the contract. The gaps are of the other kind:
capability that sits installed or catalogued and has never been used by a real video,
plus five small doc and review-page holes. Measured on `main` at `f3680fe` by grepping
imports in the real-video code (`src/mortgage`, `src/designs`, `src/listing`,
`src/elements`, `src/brand`) against `src/showcase`, `scripts` and `review`.

## What is wired (checked, no action)

- **Cue kinds.** `edit.json` cues have 8 kinds (compare, bars, points, verdict, venn,
  kinetic, emoji, lenders). Classic's `Cues.tsx` renders all 8 and 22 of the 24 designs
  import it (`from "../classic/Cues"`); the two that don't (checklist, editorial) carry
  their own for the kinds they accept, and `cueRoom.ts` moves Daniel out of the way.
- **Chapter transitions.** All 19 `@remotion/transitions` presentations map from
  `chapters[].effect` in `timeline.ts` and `transitions.ts`; the schema enum matches.
- **B-roll visuals.** `visuals` (cutaway, pip, overlay) render in the core
  (`MortgageReel.tsx` line 347, `Visuals.tsx`), so no design has to.
- **Behind layer.** Every face-required design exports `Behind`; the 10 faceless designs
  don't need it. Quick mode is handled in the core.
- **Promotion.** 13 of 24 designs are promoted; the 11 unpromoted (chatstory, checklist,
  datalab, editorial, kitchen, neon, newsroom, reaction, scenario, series, studio) still
  render and rank, marked "unproven".

## Installed but never used by a real video

| Package | Real-video files | Where it does appear | Verdict |
|---|---|---|---|
| `@remotion/light-leaks` | 0 | nowhere, not even showcase | Superseded: classic's `LeakFlash` uses `@remotion/effects/light-leak`. Drop the package and the `toolkit.md` line that names it. |
| `@remotion/starburst` | 0 | nowhere | Same: `@remotion/effects/starburst` exists. Drop, fix `toolkit.md`. |
| `@remotion/rive` | 0 | nowhere | No `.riv` assets in the repo. Drop. |
| `@remotion/effects` (74 effects) | 1 (light-leak) | showcase `EffectsCatalog` | Available, unused: duotone, halftone, paper, scanlines, vignette, glow, rings, dot-grid, tint, lut would give designs texture without custom code. Not a defect; a menu nobody has ordered from. |
| `@remotion/skia` | 0 | showcase | Needs `--gl=angle`; `findings.md` documents a fragile 2.x web build. Leave for a design that wants shaders. |
| `@remotion/three` | 1 (`ImageCarousel`, itself unused) | showcase (4) | In effect unused. |
| `@remotion/gsap`, `gsap` | 0 | showcase | Unused. |
| `@remotion/animated-emoji` | 0 | showcase | Emoji come from `public/emoji` Lottie via `@remotion/lottie`; fine as is. |
| `@remotion/sfx` | 0 | showcase | `public/sfx` wavs play through `<Audio>`; the package's own library is unused. Fine. |
| `@remotion/motion-blur` | 1 | showcase | Used once (retro). |
| `@remotion/maptiler` | 1 (`listing/LocationScene`) | showcase | Wired for listings only; no Finance Hub design maps a suburb. |
| `@remotion/svg-3d-engine`, `@remotion/gif`, `@remotion/mac-cursors` | 0 | showcase | Unused. |
| `@remotion/lambda`, `@remotion/cloudrun`, `@remotion/vercel`, `@remotion/licensing` | 0 | `renderer-apis.mjs` | Cloud render helpers; nothing renders in the cloud. Harmless. |
| `@remotion/whisper-web`, `@remotion/whisper-webgpu`, `@remotion/install-whisper-cpp`, `@remotion/openai-whisper` | 0 | showcase | Transcription is faster-whisper in Python. Four packages for a path not taken. |
| `@paper-design/shaders-react`, `culori`, `opentype.js`, `date-fns` | 0 | remocn components only (`.claude/elements`, outside the build) | Kept so the vendored remocn tree type-checks. Fine. |

Used and load-bearing: `@remotion/captions` (30 files), `@remotion/layout-utils` (52),
`@remotion/media` (32), `@remotion/rough-notation` (16), `@remotion/paths` (14),
`@remotion/media-utils` (8), `@remotion/transitions` (8), `@remotion/effects` (7),
`@remotion/shapes` (5), `@remotion/rounded-text-box` (4), `@remotion/noise` (2),
`@remotion/fonts` (2), `@remotion/video-matting` (review/matte), `@remotion/player`
(review page), `lucide-react` (8).

## Elements: catalogued vs adopted

- **Remotion Elements** (`.claude/elements/CATALOG.md`, 41 blocks): 12 have been copied
  into a design or `src/elements` (waveform-progress, liquid-contours, moving-waves,
  notebook-paper, rotating-starburst, moving-pill-captions, popping-word-captions,
  product-collection, product-discount-callout, shine, name-lower-third,
  on-screen-messages, polaroid-pictures). 29 have not. Of those, the five `data/*` charts
  are covered by `figuresOf` and classic's `Infographics`, the `youtube/*` and `maps/*`
  ones don't fit a Reel, and `overlays/social-safe-zones` is the one worth wiring (below).
- **remocn** (300+ items): 2 used (value-swap, strikethrough-replace). It is a library to
  grep, not a backlog; nothing to do.
- **The repo's own `src/elements/`** (36 files): 15 are imported by a design or the
  listing reel; **21 are verified in `ElementCatalog` and used by nothing**: AudioRing,
  BeforeAfter, BehindWord, CaptionBox, CountdownRing, FocusCrop, FrequencyBars,
  ImageCarousel, LineGraph, LineReveal, NeonTitle, NotificationStack, PulseBadge,
  QuoteCard, ReviewStamp, SlashIntro, TextMatte, TiltFrame, VideoGrid, WordHighlight,
  `beats.ts`. `src/designs/README.md` line 120 lists them as the palette, so this is
  intentional stock; two are now stale:
  - `FocusCrop` (reframe wide footage to 9:16 in the render) duplicates what
    `scripts/reframe.py` now does at prep, better (one crop, matte runs on it).
  - `beats.ts` reads `public/music/<name>.audiomap.json`; no design reads a beat grid, and
    `public/music/` holds only a README, so nothing has ever exercised it.
  - `BehindWord` is missing from `ElementCatalog.tsx`, the one place elements are verified.

## Documentation and review-page holes

1. `refs/edit-json.md` documents 24 of the 27 top-level `edit.json` fields. Missing:
   `source` (only in `mortgage-reel.md`), `subtitles` (the English lines; nowhere) and the
   `points` cue kind (2 mentions, no table row).
2. `refs/toolkit.md` names `@remotion/light-leaks` and `@remotion/starburst` as the leak
   and burst sources; the installed effects package has both and classic uses that. It
   also says `@remotion/effects` is "applied through `<Solid effects>`"; the designs call
   the functions (`lightLeak({...})`) directly.
3. The review page (`npm run review`) has lanes for chapters, stats and cues only.
   `visuals` (B-roll) cannot be dragged there, though it has an `atMs` like the others.
4. `runbook.md` A3.1 still says the override is logged "once WP6 merges"; `--pick` has
   been in `select-template.mjs` since WP6. A7.4 says "B-roll gaps (until WP3)"; WP3 is
   merged. Two stale parentheses.
5. `overlays/social-safe-zones` (an Instagram/TikTok safe-zone overlay) is catalogued but
   QC checks safe zones only by numbers (`check-golden.mjs`). Rendering the stills at
   A6.2 with this overlay on would let the reviewer see the band, not compute it.
   **Done** (`241190c`): `"safeZones": true` in the still's `--props` draws the SAFE band
   and FACE box from `golden.ts` (`src/mortgage/SafeZones.tsx`, never in a render;
   runbook A6.2, video-qc step 3). It draws this repo's own rule, not the catalogued
   Instagram/TikTok element.

## Recommended order

1. Docs first, one commit: `edit-json.md` rows for `source`, `subtitles`, `points`;
   `toolkit.md` leak/starburst lines; the two runbook parentheses.
2. `BehindWord` into `ElementCatalog`; delete `FocusCrop` (superseded) and, unless a
   music-driven design is planned, `beats.ts` with its `analyze-beats.py`.
3. Remove `@remotion/light-leaks`, `@remotion/starburst`, `@remotion/rive`, `gsap`,
   `@remotion/gsap` and the four whisper packages from `package.json` (lockstep rule
   still holds for what remains). Saves install time; changes no video.
4. A `visuals` lane on the review timeline (same drag logic as cues).
5. A `--safe-zones` flag on the QC still step using the catalogued overlay. Done as the
   `safeZones` prop (item 5 above).

Sources: `package.json`, `src/`, `.claude/elements/`, `review/`, the editor skill's
references, read 28 September 2026 at `f3680fe`.
