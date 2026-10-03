# Designs — the brief for building a template

A design is everything a MortgageReel video looks like. The core (`src/mortgage/`) is
locked: cuts, pacing, captions data, RG 234 guard, compliance card, and the golden rules
below. A design decides HOW things look, never WHETHER they appear.

## Contract (`src/mortgage/design.ts`)

```ts
export const <id>: Design = { id, Cover, Talk, Overlay, Outro, chapterTransition, copy };
```

- `Cover({ src, coverFrame, title, subtitle, keywords })` — 75 frames, crossfades into
  the talk. For Daniel's cut-out on your backdrop: `<CoverCutOut src={src}
  trimBefore={coverFrame} style={…}/>` (`src/mortgage/PacedVideo.tsx`); add `room` for
  the recorded frame instead. It freezes the frame and handles quick mode (rule 4).
- `Talk({ seg, index, src, look, foreground })` — MUST render
  `<PacedVideo seg src look foreground style={…} />`. PacedVideo owns audio and pacing.
  With `foreground` it draws the brand gradient behind Daniel's cut-out; pass
  `backdrop="none"` and render your own backdrop behind it (in Talk, before PacedVideo).
- `Overlay({ reel, keywords, talkFrames, src })` — frame 0 = first spoken word of the
  talk. Captions, hook, chapters, figures, lender logos, cues, sound effects live here.
- `Outro({ question })` — CTA + contact. Reuse `src/designs/classic/Outro.tsx` unless the
  concept needs its own; if you write one it shows the question, phone 0430 11 11 88,
  daniel@finhub.net.au, finhub.net.au and the logo on white.
- `chapterTransition(kind)` — reuse `src/mortgage/transitions.ts` or map the four kinds
  (`TRANSITIONS` in timeline.ts) onto your own `@remotion/transitions` presentations.
- `copy` — every hard-coded on-screen string; RG 234 scans it (no "tốt nhất", "miễn phí",
  "đảm bảo", "best", "free", "guaranteed"…; see `src/mortgage/compliance.ts`).

Timing: source ms → talk frame with `outFrameOf(reel.timeline, fps)(srcMs)` (schema.ts)
or `toOutMs` (timeline.ts). Reel data: `reel.edit` (edit.json), `reel.timeline.captions`
(talk-timeline ms, one Whisper token each, a leading space marks a word start),
`reel.timeline.segments`.

## Golden rules (computed by the core — you render them)

1. **Numbers → a visual.** `figuresOf(reel, fps)` (`src/mortgage/golden.ts`) returns
   every figure to show: edit.json `stats` (`source: "stat"`) plus automatic ones for
   each number Daniel says that no stat or cue covers (`source: "auto"`, `big` = the
   number as said, `label` = the words around it). Render EVERY figure in the template's
   chart/counter language: `<Sequence from={f.fromFrame} durationInFrames={f.frames}>`.
   Auto figures are short (2.6 s): a counter or a one-bar chart, not a full card.
   Exception (Daniel, 02/10/2026): **a year or a date is shown as said.** It stays a
   figure, but `asSaid(f.big)` (golden.ts) is true for it: never counted up, never
   flipped or spun through other digits, no thousands dot, no bar, ring, meter or
   needle; plain text, with no rate label (an automatic year or date gets `label: ""`;
   a neutral word such as "NĂM" / "NGÀY" is fine, `saidKind`). `asSaid` is for years
   and dates only: a year is 19xx/20xx alone or after "năm" ("2026", "năm 2026", not
   "2000 đô"); a date is day/month, day 1-31 and month 1-12 ("29/9", not the ratio
   "20/80"). **A figure said during the hook waits for it:** with a hook, `figuresOf`
   starts such a figure at `HOOK_FRAMES`, and one said while that wait is still held
   waits for it in turn, so they never overlap; each keeps its reading time (a stat its
   whole hold, an automatic figure what is left of its span, never under
   `READING.minNumberHoldMs`). `saidFrame` is when it was said (a stable key). Figures
   said after the hook keep their time unless an earlier figure is still held: they
   wait for a waiting one; one shown when said ends when they are said, never under its
   reading time nor past its own length, and if that is still too short they wait for
   it. No two figures are ever up at once.
2. **Bank named → its logo.** `lenderMentionsOf(reel)` returns
   `{ lender, startMs, endMs }` (talk-timeline ms). Render each with
   `<LenderLogo lender={m.lender} height={…}/>` (`src/mortgage/LenderLogo.tsx`: official
   logo on a white tile, or a name badge when no file) inside your own animated frame.
   Never suggest the bank made or endorses the video: no "partner", no bank colours as
   the frame, a neutral label at most ("Đang nhắc tới", "Ngân hàng").
3. **Safe band.** Every text, chart, logo and caption sits inside `SAFE`
   (`golden.ts`): y 420–1473, x 54–960 (the strictest of the Reels and the 4:5 feed
   safe zones). Backdrops and Daniel may fill the frame. Use the constants, never
   literals, so a change to SAFE moves everything.
3b. **Nothing covers Daniel's face, nothing overlaps.** No overlay element inside
   `FACE` (`golden.ts`: x 250–830, y 480–1250). Charts and figures render BEHIND him:
   export `Behind` (same props as Overlay; the core draws it between the backdrop and
   the cut-out, so pass `behind` through in Talk: `<Backdrop/>{behind}<PacedVideo …/>`)
   and put every `figuresOf` card there, sized so its top and label are visible above
   his head or beside his shoulders (y 420–700 for cards, or the left/right thirds).
   Captions sit below the face (y ≥ 1300). Two elements that can be up at the same
   time (figure + lender logo + chapter + cue card) must have their own places.
   MotionTrack cue panels (every cue but emoji) sit at SAFE.top and end by
   y ~930: a full-frame design makes room under them with `useCueRoom(seg)` +
   `cueRoomStyle(k)` (`src/mortgage/cueRoom.ts`) on the layer holding his
   cut-out, and sets `"cueRoom": true` in template.json; without it
   check-golden counts every cue panel as face-hidden time.
3c. **Logo.** `<LogoMark talkFrames={talkFrames}/>` (`src/mortgage/LogoMark.tsx`) in the
   Overlay: 120 px high on a white tile, top-right inside SAFE, visible only for the
   first and last 10 s of the talk. No other always-on logo. The Cover keeps its own
   logo at the same size and place.
4. **Background: removed, or quick mode (Daniel, 27/09/2026).** `foreground` is always
   set; design the backdrop.
   1. Default: background removed. The recording is matted once (modnet →
      `public/recordings/<id>/foreground.webm`, reused by every video from that
      recording) and Daniel sits on the design's brand backdrop. Every standard video.
   2. Quick mode, opt-in only: edit.json `"background": "vignette"`. No matting: the
      full frame plays with its edges darkened to near-black (`vignette()` in
      `PacedVideo.tsx`), Daniel bright and sharp in the centre. Use when speed matters
      (rate/RBA news, time-sensitive posts) or when a recording has no cut-out yet.
      Behind layers draw on top of him; designs that can't work this way (editorial,
      checklist, datalab, kitchen: `QUICK_FALLBACK` in `MortgageReel.tsx`) render in
      classic, with a warning in the render log.
   3. While Daniel talks, the raw room is never shown as-is: removed (1) or
      vignetted (2). One exception (Daniel, 27/09/2026): a cover may use the recorded
      frame as its still photo (classic, explainer and studio do). No blur mode, no
      tinted room.
   4. Quick mode needs Daniel centred when recording: face inside the middle ~60% of
      the frame.
   5. Privacy: in quick mode, and on any cover that shows the recorded frame, the room
      is visible, so before render the compliance reviewer checks the cover still (and,
      in quick mode, a mid-video still) for anything
      client-identifying in the background (documents, screens, names, other people).
      Anything found → BLOCK; switch to (1) or re-record.
   6. `check-golden <slug>` labels quick-mode videos "background: vignette (quick
      mode, not removed)"; they never count as background-removed.
   A design draws Daniel only through `PacedVideo` and `CoverCutOut`, which do all of this.
5. **Keywords light up.** In captions use `emphasised(tokens, keywords)` (style.ts) to
   colour finance keywords and numbers with `brand.highlight`. Captions go through
   `src/mortgage/PagedCaptions.tsx`: `<PagedCaptions reel render={(page) => …}/>` owns
   the sentence-aware pages and their timing (never copy the loop:
   `scripts/check-captions.mjs` fails on it), and the page draws inside
   `<CaptionZone>` (bottom edge at `SAFE.bottom`, grows upward; `left`/`right`/`bottom`
   to narrow it). Measure text only after `reelFontReady()` with `useDelayRender` (see
   studio/PillCaptions.tsx).
5b. **A visual change every 1.5–3 s.** A visual change is something new appearing or
   moving on the stage or full screen: a chapter card or transition, a cue appearing or
   leaving, each cue item landing, a stat or figure, a keyword pop, a punch-in on a cut.
   Caption page turns and Daniel's own movement do not count. The template must never sit
   still for more than 3 s (Daniel's rule), except while a card or cue is held for its
   reading time. A text or number hold wins over this: the core holds each card and cue
   for its reading time (`READING` in `golden.ts`), and the change is carried by motion
   inside the scene (a count-up, a highlight, a slow push-in), never by cutting the card
   early. Measured by `node scripts/check-pacing.mjs <slug>` (deterministic, no render),
   never by ffmpeg scene detection (it cannot see a points row appear in the cards design)
   and never by eye. Exception (Daniel, 30/09/2026): the cards design on talks longer than
   about 3 minutes holds chapter and points cards for long stretches; accepted, reported
   as INFO.
6. **Hook in 3 s.** `reel.edit.hook` (`{big, sub?, countTo?, suffix?}`) shows in the first
   105 frames of the Overlay; the Cover title uses `fitText` (`@remotion/layout-utils`).
7. **Brand only.** Colours from `src/brand/theme.ts` (tints/gradients of them are fine).
   Font `FONT` (Be Vietnam Pro). The logo always on white.
8. **Compliance.** A template adds no claims of its own. Copy in `copy` is scanned.

## Elements to reuse

- `src/elements/*.tsx` (README there): Oscilloscope, MirroredSpectrum, FrequencyBars,
  AudioRing (voice-driven: pass `src` and `frame={seg.srcFrom + frame * seg.rate}` inside
  Talk), LineGraph, ProgressBar, CountdownRing, PulseBadge, NeonTitle, StaggerTitle,
  Typewriter, NewsTicker, RgbSplitText, SlashIntro, TextMatte, Particles, NoiseField,
  KenBurns, TiltFrame, BeforeAfter, ImageCarousel, VideoGrid, ReviewStamp,
  SocialHandle, CaptionBox, LineReveal, starWipe.
- `.claude/elements/<category>/<slug>/*.tsx` (CATALOG.md): Remotion Elements to adapt:
  swap their Google font for `FONT`, their colours for brand tokens, drop
  `Interactive.*` wrappers (plain divs) and any `<Audio>` of their own.
- `src/designs/classic/`: `Cues.tsx` `MotionTrack` (kinetic/compare/bars/verdict/venn/
  emoji/lenders cues, already compliant), `Frame.tsx` `HookTitle`, `Outro.tsx`.
- `src/designs/studio/PillCaptions.tsx`, `src/designs/classic/BoxCaption.tsx`,
  `Captions.tsx`: caption styles to copy from.

## Rules of the build

- One folder `src/designs/<id>/` (id lowercase, e.g. `newsroom`), `index.tsx` exporting
  the `Design`; split pieces into a few files. Do not edit `src/mortgage/`, `src/brand/`
  or other designs. Do not register the design in `src/designs/index.ts` (the integrator
  does).
- No `Interactive.*`, no own `<Audio>` of the voice, no network fonts (Be Vietnam Pro is
  local), no `console.log`.
- Text that can reach a viewer is Vietnamese with proper diacritics; English only for
  proper nouns.
- Prove it: `npx tsc --noEmit` and `npx eslint src/designs/<id>` clean; then stills at
  three moments with the preview override:
  `node node_modules/@remotion/cli/remotion-cli.js still src/index.ts MortgageReel out/stills/<id>-<n>.png --props="{\"slug\":\"ty-do\",\"design\":\"<id>\"}" --frame=<n> --gl=angle`
  for frames 20 (cover), 120 (hook + captions), 400 and 900 (ty-do says "4.1 tỷ" near
  4 s and "400" near 13 s, so figures show). Look at the PNGs. With no `source.mp4` (the
  sandbox): `node scripts/faceless-still.mjs rba-sept-2026 <id> --frame <n> [--production]`
  (`--production` for a talking-head design: navy picture, cut-out, no face). Then
  `node scripts/check-design-figures.mjs --only <id>`.
- Every string on screen is either from the reel or in `copy`.
- Finish with `node scripts/promote-design.mjs <id>` once it is registered and has a
  `template.json` (fields as `MANIFEST_FIELDS` in `scripts/select-template.mjs`): it runs
  lint, renders the preview and Mode A/B stills, checks `copy` (every hard-coded string,
  RG 234) and theme-only colours (`// theme-exempt: <why>` on a line allows one), and
  only then makes it a template the selector can pick. It lists every failure at once.
  A pass writes `"promoted": "<YYYY-MM-DD>"` into `template.json`; the selector ranks every
  promoted design above every unpromoted one, which it lists as `unproven`.
