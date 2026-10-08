# Purpose → data shape → first-choice element

First choice is always the lowest rung that fits. Paths are repo paths; remocn names are the
registry component names (read each page's `useWhen` / `avoidWhen` before naming one).

| Purpose | Data shape | Rung 1 (cue grammar, no code) | Rung 2–4 (needs a design that has it) | Hold rule | Failure mode to name in `risk` |
|---|---|---|---|---|---|
| anchor | one number Daniel says | automatic figure (golden rule 1), or `stats` when the label matters | `src/elements` ProgressBar/CountdownRing for a share or a limit; Elements `data/number-counter`; remocn `number-wheel`, `rolling-number` | ≥ `READING.minNumberHoldMs`; a stat its whole hold | counted or spun year/date (`asSaid`); number up while the hook is up |
| anchor | a year or date | automatic figure, shown as said | none (plain text only) | as the figure | any roll, flip or thousands dot |
| compare | A vs B, before/after | `cues` `compare` | `src/elements` BeforeAfter; remocn `value-swap` | both values readable together | the "winner" styled as a recommendation |
| compare | 2–4 values | `cues` `bars` | Elements `data/horizontal-bar-chart`, `data/vertical-bar-chart`; remocn `animated-bar-chart` | bars finish before the next number is said | more than 4 bars; unlabelled axis; lender names as bars with a tick |
| compare | a share of a whole | `cues` `bars` (2 values) | Elements `data/pie-chart` | as bars | a pie with more than 3 slices on a phone |
| trend | a value over time | `cues` `bars` by period, or `stats` for the end value | `src/elements` LineGraph, TrendCard; Elements `data/line-chart`; remocn `animated-line-chart` | the whole line drawn within the sentence | a forecast drawn as fact; no date axis |
| sequence | 2–5 steps | `cues` `points` | remocn `check-list`, `staggered-fade-up`; `src/elements` ProgressBar as a step meter | each step readable before the next lands; no empty points card over 2 s | steps the talk does not say in that order |
| sequence | a timeline / deadline | `cues` `points` with dates | `src/elements` CountdownRing, ChangeCard | as points | a date counted |
| emphasise | one word in a sentence | `hook` (opening) or the design's caption keyword highlight (`keywords`) | `src/elements` BehindWord (rule 6 band), WordHighlight; Elements `text/text-marker`, `text/circle-marker`; remocn `inline-highlight`, `marker-highlight`, `ink-underline` | on while the word is said, off within the sentence | a watch-word emphasised (tốt nhất, rẻ nhất, miễn phí, đảm bảo) |
| emphasise | a myth or wrong belief | `cues` `kinetic` (strike-through) or `verdict` | Elements `text/strike-through`, `text/crossed-off`; remocn `strikethrough-replace` | the strike lands on the word "không" / "sai" | a lender or product name struck through |
| emphasise | a quote or a client-style question | `cues` `verdict` or the design's card | `src/elements` QuoteCard, NotificationStack; Elements `storytelling/on-screen-messages` | reading time of the quote | a real person's name or figure (BLOCK) |
| breathe | topic change | `chapters` (the design's own transition, 12-frame light-leak lead where it has one) | `@remotion/transitions` fade/slide inside a design; remocn `shared-axis-y`, `fade-through` | at a sentence boundary only | a transition mid-sentence; a flashy wipe (`whip-pan`, `glitch-cut`) in a finance talk |
| brand | a bank named | automatic logo (golden rule 2) / `cues` `lenders` | none | as the core | a tick, rank or colour next to a logo |
| brand | who is talking, what next | the design's intro / outro / CTA, `SocialHandle` | Elements `overlays/name-lower-third`; `src/elements` SocialHandle, ReviewStamp | outro length as the design sets | a CTA that promises an outcome |
| none | story, feeling, an aside | nothing | nothing | — | an effect added "to keep it moving" |

## Reading time

Rule 5b lives in `src/mortgage/golden.ts` (`READING`) and is measured by `scripts/check-pacing.mjs`.
A plan states `holdMs` as what the viewer needs; the editor fits it to the clip. If the talk is
too fast for the hold, the plan says so in `risk` and the editor's only moves are: a shorter
element from the same row, or `open_questions` ("the 3-bar comparison at 1:12 has 1.8 s; drop to
compare or accept a 2.6 s hold over the next sentence").

## Vietnamese and bilingual text

Every string an element shows is Vietnamese with full diacritics (NFC), English only for proper
nouns and the EN line of a bilingual plate; fonts must carry the Vietnamese subset (Be Vietnam Pro
is local; the vendored Elements' Figtree does not).
