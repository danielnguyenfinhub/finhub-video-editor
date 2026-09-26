# remocn recipes — how FinHub uses them

`anatomy.md` and `archetypes/*.md` are remocn's video-composition recipes (MIT, copied
verbatim from `remocn-remotion-resoure/skills/remocn/references` so they re-sync cleanly).
They answer "how should this whole video be structured?"; the element catalogs answer
"which component plays each beat?". This file adapts both to FinHub. Where the two
disagree, this file wins.

## Read order

1. `anatomy.md` — strategy (reuse a template / compose / build new), the 6-beat spine
   (Hook → Positioning → Reveal → Features → Proof → CTA), the good-vs-slop bar.
2. `archetypes/index.md` → the recipe that fits (table below).
3. Pick each beat's component from the local catalogs, not remocn.dev:
   `.claude/elements/remocn/CATALOG.md` (remocn) and `.claude/elements/CATALOG.md`
   (Remotion Elements). For props, read the component's own `.tsx` (its `Props`
   interface and defaults); `https://remocn.dev/docs/<section>/<name>.md` is only a
   fallback when the source is unclear.

## Which recipe, which FinHub skill

| Recipe | FinHub use | Built by |
|---|---|---|
| `pricing-reveal` | Rate / product comparison (fixed vs variable, 3 loan options), one recommended column | `finhub-rate-alert-reel`, or the `faceless` design |
| `year-in-review` | Market recap in numbers (cash-rate moves, a quarter in review) | `finhub-rate-alert-reel`, `faceless` design |
| `feature-announcement` | One lender policy or product change | `finhub-rate-alert-reel`, `faceless` design |
| `changelog` | "What changed this month" — several policy updates as a list | `faceless` design |
| `product-demo` | Process explainer: how pre-approval / refinancing works, step by step | `vietnamese-finance-video-editor` (a design's infographic beats) |
| `testimonial-reel` | Real client reviews (consented, verbatim, e.g. Google reviews) | `vietnamese-finance-video-editor`, `faceless` design |
| `logo-bumper` | FinHub intro / outro sting | `finhub-branded-reel`, a design's cover/CTA |
| `oss-showcase`, `cli-tool-demo` | Not FinHub content — structure reference only | — |

For a talking-head edit, a recipe shapes the design's graphic beats around Daniel; it
never replaces the locked core (cuts, captions, compliance card).

**Numbers kit is live** (edit.json cues `change` and `trend`): `value-swap` and
`strikethrough-replace` are vendored in `src/elements/remocn/` and drawn by
`src/elements/ChangeCard.tsx`; `trend` reuses `src/elements/LineGraph.tsx` via `TrendCard`,
not remocn's `animated-line-chart`. Counters stay as they are (`rolling-number` and
`number-wheel` are integer-only).

## Overrides — these beat the recipes

- **Canvas**: recipes assume 1280×720 16:9. FinHub is 1080×1920 @ 30 fps, 4:5-safe
  (feed crop): re-lay every beat vertically; tier columns become stacked rows.
- **Length**: a catalog entry's length is the component's own motion — the `Sequence`
  floor, not the beat; add hold time on top. Time beats in a talking-head edit from
  `words.json` `startMs`, not the recipe's frame table.
- **Brand**: Be Vietnam Pro (Vietnamese diacritics), `src/brand/theme.ts` colours as the
  "one accent", FinHub logo. Never the recipe's demo palette.
- **Content contract**: real figures only. Ask Daniel for any rate, fee or date — the
  recipes' sample data (plans, prices, stars) is never used for FinHub; no invented
  numbers.
- **Compliance**: every on-screen string passes the RG 234 guard. An advertised interest
  rate carries its comparison rate and the "general information only" disclaimer;
  "recommended" means the column the video explains, never "best rate" or advice.
  Testimonials must be real, unedited and consented.
- **Brand mock-ups**: third-party UI cards (GitHub stars, X, ChatGPT…) the recipes name
  are reference only; substitute a FinHub-owned visual.
- **Audio**: recipes never add sound; keep it that way (Daniel's recorded voice or his
  cloned OmniVoice narration is the only voice; sfx per the design).

## remocn component conventions (from its skill)

- Two tiers: animation components are frame-driven with `speed` (time multiplier) plus
  `fontSize`/`color`/`fontWeight` on text; UI primitives (`remocn-ui`) are state-driven
  (`state`, `variant`, `theme`) with no `speed`.
- Transitions are lowercase factories (`whipPan(props)`) passed to
  `TransitionSeries.Transition` `presentation`, paced with `linearTiming`/`springTiming`.
  `slide-swap` and `spring-settle` are scene sequencers instead.
- `vibe` tags (`tech`/`premium`/`data`/`clean`/`playful`/`social`/`paper`): FinHub
  defaults to `premium`, `data`, `clean`. `paper` components form one stop-motion world —
  don't mix them with smooth ones.
- Own additions stay restrained: sentence case, default tracking, solid text colour, no
  gradient text or glow halos (`anatomy.md` §3).
- Deterministic only: no `Math.random()`/intervals; cursor blink from `frame`; static
  files through `staticFile()` in `public/`.
