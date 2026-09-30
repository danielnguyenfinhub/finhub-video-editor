# Core / design architecture

## Contents
- The contract
- One-time bootstrap (when `src/designs/` does not exist)
- Core fixes to carry in the bootstrap
- Regression proof

## The contract

LOCKED CORE — `src/mortgage/` and `src/brand/`:
`MortgageReel.tsx` (loads edit.json + words.json, RG 234 guard, rate gate, timeline,
sequencing: cover → talk segments → outro → compliance card, music), `timeline.ts`
(cuts, auto-cuts, pacing, caption remap), `schema.ts`, `compliance.ts`, `EndCards.tsx`
(ComplianceCard only), `style.ts` (shared helpers designs may import), `PacedVideo.tsx`,
`design.ts`. Brand tokens in `src/brand/theme.ts`.

DESIGN — `src/designs/<id>/index.tsx` exports a `Design`:

```ts
// src/mortgage/design.ts
export type CoverProps = { src: string; coverFrame: number; title: string; subtitle: string; keywords: string[] };
export type TalkProps = { seg: Segment; index: number; src: string };      // must render <PacedVideo seg src />
export type OverlayProps = { reel: Reel; keywords: string[]; talkFrames: number }; // frame 0 = first word
export type Design = {
  id: string;
  Cover: React.FC<CoverProps>;          // COVER_FRAMES long, crossfades into the talk
  Talk: React.FC<TalkProps>;            // frames one paced segment: scale, mask, matte, split, PiP
  Overlay: React.FC<OverlayProps>;      // captions, hook, chapters, stats, cues, sound effects
  Outro: React.FC<{ question: string }>;// CTA + contact (0430 11 11 88, daniel@finhub.net.au, finhub.net.au)
  chapterTransition: (kind: TransitionKind) => TransitionPresentation<Record<string, unknown>>;
  copy: string[];                       // every hard-coded on-screen string, RG 234-scanned
};
```

`PacedVideo` owns pacing and audio: `<OffthreadVideo trimBefore={seg.srcFrom}
playbackRate={seg.rate} {...retryVideoFetch} volume={2-frame edge ramps}>` with a `style`
prop for framing and `muted` for a second visual-only copy (blurred backdrop, mirror).
Never set `trimAfter` with `playbackRate` (it is applied in timeline frames and blanks
the tail below rate 1).

Registry `src/designs/index.ts`: `const DESIGNS: Record<string, Design> = { classic, … }`,
`getDesign(id)` throws "not a design. Available: …". edit.json `"design"` (optional,
default `"classic"`) is a string in `editSchema`.

Core wiring in `MortgageReel.tsx`:
- calculateMetadata: `const design = getDesign(edit.design ?? "classic")`, then
  `assertCompliantCopy({ ...onScreenCopy(edit), ["design:" + design.id]: design.copy }, exemptions)`.
- component: `design.Cover` in the cover sequence; `design.Talk` per segment;
  `design.chapterTransition(seg.transitionAfter)`; `design.Outro`; then the locked
  `ComplianceCard`; `<Sequence from={TALK_START_FRAME} durationInFrames={talk - OUTRO_TRANSITION}
  layout="none"><design.Overlay …/></Sequence>`.

## One-time bootstrap (DONE 24/09/2026)

Done on branch `refactor/design-architecture`: steps 1–6 below, proven pixel-identical
(PSNR ∞ on 5 stills, same frame count) against the pre-refactor render. Kept for the
record; do not repeat. Differences from the plan: `TalkProps` also carries `look`
(edit.json colour grade, applied by `PacedVideo`); the default chapter transitions live
in `src/mortgage/transitions.ts` (`chapterTransition`), which designs reuse or override.

1. `git mv src/mortgage/{Captions,Cues,Frame,Infographics}.tsx src/designs/classic/`;
   fix imports (`./schema|style|timeline|compliance` → `../../mortgage/…`,
   `../brand/` → `../../brand/`).
2. Move `Outro` out of `src/mortgage/EndCards.tsx` into `src/designs/classic/Outro.tsx`
   (EndCards keeps ComplianceCard only).
3. Create `src/mortgage/design.ts` and `src/mortgage/PacedVideo.tsx` as above.
4. `src/designs/classic/index.tsx`: `Talk` = the old `TalkSegment` framing (first segment
   scales 1.3→1 over 24 frames; alternate segments 1.13 zoom; spring punch 0.05 on
   each cut; 2% drift; transformOrigin 50% 30%) around `<PacedVideo>`; `Overlay` =
   MotionTrack, Chrome, StatCards, Chapters, Captions, then the hook group (MoneyRain,
   HookTitle, HookBurst, HookSfx) in a 105-frame Sequence; `chapterTransition` = the old
   `presentation()` switch; `copy` = ["PHẦN", "VS", "Các ngân hàng Finance Hub làm việc
   cùng", "Daniel Nguyen", "Điện thoại", "Email", "Website"].
5. Registry, schema field, core wiring as above.
6. `python .claude/skills/vietnamese-finance-video-editor/scripts/main.py log` creates the design log seeded with ty-do and
   interest-in-advance (both `classic`).
7. Regression proof (below). Only then build the new video's design.

## Core fixes to carry in the bootstrap

Proven on the interest-in-advance edit, lost when that branch was dropped; re-apply:
- **Tax note**: `compliance.ts` `TAX_NOTE = "Thông tin chung, không phải tư vấn thuế. Hãy hỏi
  kế toán hoặc đại lý thuế đã đăng ký. General information only, not tax advice."`;
  `schema.ts` `compliance.taxNote: z.boolean().optional()`; ComplianceCard adds the line
  (base 38, colour #33445A) when set.
- **Stutter across a sentence end**: already in the core (`timeline.ts`
  `autoCutReasons`, 24/09/2026): a repeat whose first copy ends a sentence is not cut, so
  "…cho các bạn. Các bạn hãy…" keeps "các bạn". Nothing to re-apply.
- **Caption slips** in `fixWord`: "vai" after "gói" → "vay"; "giống" after "tiền" → "gốc"
  (leaves "giống như" alone).
- **Stat headline fit** (classic design): `fitText({ text, withinWidth: 800, fontFamily:
  FONT, fontWeight: 900, letterSpacing: "-2px" })`, capped at 120 px, `whiteSpace: nowrap`.

## Regression proof

- `npx tsc --noEmit` and `npx eslint src/mortgage src/designs` clean.
- `node scripts/check-schema.mjs <slug>` prints the same frame count as before for a previous slug.
- Stills at 5 frames (cover, 3 talk moments, compliance) vs the previous render of the
  same slug: `ffmpeg -i old.png -i new.png -lavfi psnr -f null -` average ≥ 38 dB
  (encode noise only). The 24/09/2026 split measured 38–41 dB.
- The previous render must come from the same edit.json; a stale out/ file is not a baseline.

## Designs available (25/09/2026)

Thirteen designs are registered in `src/designs/index.ts`: `classic`, `explainer`,
`studio`, and the ten Facebook-first templates built to `src/designs/README.md` (the
golden rules: number → chart via `figuresOf`, bank → logo via `lenderMentionsOf`, 4:5
`SAFE` band, background always removed): `newsroom` (rate/market news), `datalab`
(cost explainers), `chatstory` (FAQ, light), `editorial` (deep dives), `neon` (short
tip lists), `reaction` (react to an article/email), `checklist` (step-by-step; chapters
= steps), `scenario` (A vs B; compare cues), `kitchen` (warm story, slow), `series`
(episodes; subtitle "Tập N/M · Name"). Preview any video in any design without editing
it: `--props={"slug":"<slug>","design":"<id>"}`. Concept board with the intended look
of each: https://claude.ai/artifact/81ciortUN9xjrzbzh3EMPx.
