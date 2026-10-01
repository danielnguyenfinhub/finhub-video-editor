partly done

# Design critique, group faceless-data-a: bigdigit, flash, gauge, pulse, ticker, scale

Scope: faceless voiced videos about a rate move, a policy change or a comparison; Vietnamese + English; viewed on a phone.

**How this was judged.** No render was possible: the sandbox network refuses the Google font fetch. The critique comes from code, `template.json` and each `src/designs/<id>/preview.png`. The previews are 540x960, which is phone scale, but each is one idle frame: the caption plus the empty hero, and for flash a title card. **Number, change and compare moments were not viewed at phone size in any design.** Everything said about them comes from reading the code. Font-size estimates assume Be Vietnam Pro 900 at about 0.6 em per character. They are marked "estimate" and are unverified until a still is rendered.

**corrections.md.** None of the six designs has its own entry. Two general entries apply. The first (25/09, "text too small": judge on a phone-size still; `check-text-size.mjs` placeholder 30 px) bears on item X1 and on the English line in every design. The second (25/09, "too static", rule 5b) bears on bigdigit #4. There is no open correction for this group.

## Cross-design findings (apply to several designs, listed once)

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| X1 | **Cover titles shrink to near caption size at the 60-char limit.** Every cover sizes the title with a single-line `fitText` times a multiplier (x1.7 to x1.9). There is a cap but no floor and no line limit. A 60-char Vietnamese title therefore lands at about 45-50 px (estimate), no bigger than the 50-54 px captions, on the frame that serves as the thumbnail. Gauge also caps short titles at 84 px. Fix: use `fitTextOnNLines` (already used in `bigdigit/Tables.tsx:386`) with 3 lines and a floor of about 72 px. | `bigdigit/index.tsx:77-87` (x1.9, cap 128), `flash/index.tsx:73-83` (x1.8, cap 112), `gauge/index.tsx:66-76` (x1.7, cap 84), `pulse/index.tsx:93`, `scale/index.tsx:62`, `ticker/index.tsx:75` | small | no (rule 6 is met by `fitText`; this is size only) |
| X2 | **The English line is 24-30 px everywhere, at or under the repo's 30 px placeholder floor.** That is about 9-11 pt on a phone. Each design styles it differently: italic in scale, a left rule in bigdigit, a top rule in the others. In flash, a 140-char line at 24 px is likely to wrap to 3 lines (estimate), but the box has `maxHeight` 81 px and `overflow: hidden`, so the third line is cut. | `bigdigit/index.tsx:353` (25), `gauge/Stage.tsx:107` (27), `flash/Captions.tsx:124-131` (24/28 + clip), `ticker/index.tsx:313` (28), `scale/Captions.tsx:108` (28 italic), `pulse/index.tsx:355` (30); corrections.md 25/09 "text too small" | small | no |
| X3 | **Words not yet said sit at 40-50 % opacity.** A muted viewer reads ahead, and on a phone in daylight those words are hard to read. This is worst on bigdigit's white page: slate at 50 % renders as about #ADB5BF on white, roughly 2.1:1, and the unsaid accent blue is about 2.3:1 (computed from `brand.slate`/`brand.primary`). In the preview, "tỷ đô" is pale. | `bigdigit/index.tsx:316`, `pulse/index.tsx:305` (0.4), `scale/Captions.tsx` Page (0.45); `bigdigit/preview.png` | small | no (rule 5 keyword colour is kept) |

## bigdigit

**Identity (keep):** white Swiss paper, one enormous black number that assembles hollow and then fills, hairline rules, calm semi-bold captions. It is the only light design in the group and the only one that never counts up.

Strengths
1. It has the clearest hierarchy of the six. A stat gets up to 300 px, an automatic figure half that, and anything said while the stage is busy shrinks to a chip (`bigdigit/Stage.tsx:115-119`, `:183-186`). One thing to look at per moment is built into the code.
2. The change grammar is the strongest "rate move" moment in the group. An odometer roll in the data's direction, an arrow only when the data gives one, and the old value demoted to a small "trước: …" caption (`template.json` grammar.change). Old and new are never on screen at equal weight.
3. Restraint. There is no glow and no shake, and tone colour appears only for good/bad rows. A slow 3.5 % push-in carries motion through a hold without fighting the reading (`bigdigit/Stage.tsx:91`).

Improvements (ranked)
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | Raise the contrast of unsaid caption words on white. Use solid slate instead of slate at 0.5 opacity; the current state is about 2.1:1 (X3). | `bigdigit/index.tsx:315-316`; `preview.png` ("tỷ đô" pale blue) | small | no |
| 2 | Cover title floor and line fit (X1). At the 60-char limit the black title on white falls to about 46 px (estimate). | `bigdigit/index.tsx:77-87` | small | no |
| 3 | Risk of clipped diacritics in `Assemble`. Each glyph slot is `overflow: hidden` with `lineHeight: 1` and height `size*1.18`. A hook `big` that holds Vietnamese letters (for example "tỷ", "triệu") may lose its top marks during the rise. Digits are safe. Unverified; needs a still of a lettered hook. | `bigdigit/Paper.tsx:226-237` | small | no |
| 4 | Between figures the page is almost empty: only the caption and a faint grid. Rule 5b does not count a caption page turn as a visual change, so a long stretch with no figure may sit too still. Unverified; run `check-pacing` on a real reel. | `bigdigit/preview.png` (empty page, caption only); `src/designs/README.md` rule 5b | medium | yes (rule 5b, auditor to rule) |
| 5 | The English line is 25 px slate on white with a 4 px rule, the smallest in the group (X2). | `bigdigit/index.tsx:353` | small | no |

## flash

**Identity (keep):** a breaking-news alarm. Navy with gold hazard stripes, numbers that slam in with a 6-frame shake and a shockwave ring, a navy caption strip with a hazard edge.

Strengths
1. The change moment has a clear story. A gold strike line crosses the old value, the old value shrinks away, and the new one slams in. A difference chip appears only when both values parse with the same unit (`flash/Change.tsx`, `flash/diff.ts`), so it never invents a difference.
2. The motion budget is disciplined despite the loud look. The shake lasts 6 frames, is at most 7 px and then holds still (`flash/Frame.tsx:115-127`). Hazard sweeps are at least 20 frames apart and alternate high and low (`flash/Frame.tsx:261-276`).
3. The caption type scales with page length (56/50/44 px by character count, `flash/Captions.tsx:18`). Long Vietnamese pages shrink instead of wrapping into the stage.

Improvements (ranked)
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | **A hard-coded topic label.** When no chapter is up, the alert bar shows "CẬP NHẬT LÃI SUẤT" (rate update) on every video. The preview is a bank-fee video and still says "rate update". Fix: use the reel's title or a neutral "CẬP NHẬT" / "TIN NHANH". | `flash/Frame.tsx:24`, `flash/AlertBar.tsx:74`; `flash/preview.png` | small | yes (rule 8: a template adds no claims or copy of its own; auditor to rule) |
| 2 | The 140-char English line is clipped. The box has `maxHeight` 81 px with `overflow: hidden`, and 3 lines at 24 px need about 94 px (estimate) (X2). | `flash/Captions.tsx:124-131` | small | no |
| 3 | Two headline-weight elements compete. A big title card and the bold caption strip are stacked with the same weight and size class, so the eye has no single landing point. The title card also breaks "3 \| điều", leaving the number orphaned at a line end. Fix: `textWrap: balance` on that card, or keep the number with its noun. | `flash/preview.png` | small | no |
| 4 | The alarm aesthetic on non-urgent news. Siren glow, hazard tape and a shake on every card read as "danger" even for a fee explainer. Use the design for genuine rate or policy moves only, through `intents`, rather than on everything tagged news/data. | `flash/template.json` intents; `flash/Frame.tsx:56` (siren pulse) | small (metadata) | no |
| 5 | Cover title floor (X1). | `flash/index.tsx:73-83` | small | no |

## gauge

**Identity (keep):** a brushed-metal instrument panel with one big analogue dial. The needle swings to each number, and on a change it leaves a ghost needle and a lit arc between old and new.

Strengths
1. The change grammar suits a rate move. The scale spans both values, the needle swings with a spring overshoot, a ghost needle stays on the old value, and the lit arc shows the size of the move (`gauge/template.json` grammar.change).
2. Its scales are honest. `niceScale` uses round 1/2/2.5/5 ticks, and `parseValue` refuses to put a year or a date on a scale and reads Vietnamese number format correctly (`gauge/Dial.tsx:48-80`).
3. The composition is strong and centred: dial at y 890, caption strip below, nothing fighting it (`gauge/preview.png`, `gauge/Dial.tsx:19-26`).

Improvements (ranked)
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | **The number is smaller than the caption's neighbour.** The readout box is 268x94 px and its font is capped at 70 px (58 px with a kicker; less with an arrow, since `room` is 268-90). The needle is the hero, but the viewer needs the figure. Fix: use the open bottom of the dial for a readout of about 120 px, about 2x wider. | `gauge/Dial.tsx:23`, `gauge/Readouts.tsx:51-60`; captions are 50 px (`gauge/Stage.tsx:21`) | medium | no |
| 2 | The dial idles with no numerals. In the preview the needle rests on an unlabelled arc, which reads as decoration on a phone. Fade the dial down or show the last value while idle. | `gauge/preview.png` | small | no |
| 3 | Compare, steps and trend fall back to classic MotionTrack panels, so the dial look disappears for those moments. Restrict them through `dataShapes` (already numbers/narrative), or give compare a two-needle dial. | `gauge/template.json` grammar.comparisons/steps/trend | large | no |
| 4 | Cover title capped at 84 px even for short titles (X1). | `gauge/index.tsx:66-76` | small | no |
| 5 | The English line is 27 px sky-blue (X2). | `gauge/Stage.tsx:107` | small | no |

## pulse

**Identity (keep):** a navy monitor with a gold line that draws a heartbeat and spikes up into each number. A change is a flat line that steps to a new level, with the gap shaded.

Strengths
1. The spike and the number are tied in time. The number pops exactly when the line head crosses the peak (`pulse/Beats.tsx:131-134`), so the line points the eye at the figure.
2. The change and trend grammar is honest data drawing: dashed guides and labels at both levels, the y-axis labelled at the data's own low and high, every point printed (`pulse/template.json`).
3. The figure is sized for a phone: up to 190 px for the hook and 160 px for figures, fitted to 720 px (`pulse/Beats.tsx:120`, `:192`, `:239`). It also has the largest English line in the group (30 px with balanced wrap).

Improvements (ranked)
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The current-word glow blurs the caption. White text with a 16 px white glow plus a 38 px gold halo softens letter edges and diacritics. "hàng" in the preview is fuzzier than its neighbours. Fix: keep the lift and use a gold underline or a tighter shadow. | `pulse/index.tsx:306-309`; `pulse/preview.png` | small | no |
| 2 | Unsaid words at 0.4 opacity (X3). | `pulse/index.tsx:305` | small | no |
| 3 | The hook sub line is `nowrap` with fit to one line, so a 60-char sub drops to about 25 px (estimate). Allow 2 lines with `fitTextOnNLines`. | `pulse/Beats.tsx:203-207` | small | no |
| 4 | A heartbeat monitor reads as health or alarm. Fine for a rate move, odd for a calm policy explainer. Keep it to news intents. | `pulse/template.json` skinAxes.cover | small (metadata) | no |
| 5 | Compare and steps borrow classic panels (as in gauge #3). | `pulse/template.json` | large | no |

## ticker

**Identity (keep):** an exchange departure board. Split-flap tiles flip into each figure, steps form a board with every slot shown from the start, and the current word is an amber LED block.

Strengths
1. The steps grammar is excellent for an explainer. Every slot is visible from the start, so the viewer sees the length of the list; rows flip in and light amber as they are said, and finished rows turn sky (`ticker/template.json` grammar.steps).
2. The amber LED block on the current word is the most legible "word being said" marker in the group (`ticker/preview.png`).
3. The tape is built only from the reel's own headlines, never invented data (`ticker/Board.tsx:357-377`).

Improvements (ranked)
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | **The tape gives away the numbers and splits attention.** It scrolls every stat, `change` ("label from → to") and compare question from frame 0. The viewer can read the rate move on the tape before Daniel says it and before the board flips it. A moving text line next to the caption also pulls the eye (in the preview the tape and the caption are both bold white). Fix: add an item only after it has been said, or scroll the title only. | `ticker/Board.tsx:359-376`, `ticker/index.tsx:361`; `ticker/preview.png` | small | no |
| 2 | **The rate move is drawn in another design's language.** `change` is the classic value-swap card and `trend` is the classic line graph. On a rate-move video, the key moment leaves the board. Fix: flip one tile row from old to new using `FlipTiles`. | `ticker/template.json` grammar.change/trend; `ticker/Board.tsx:120` (`FlipTiles` exists) | medium | no |
| 3 | Risk of clipped diacritics on tiles. A tile is `overflow: hidden`, with height 1.38x and the glyph at 1.02x tile width; stacked marks such as "ệ" may touch the top edge. Unverified; needs a still. | `ticker/Board.tsx:129-165` | small | no |
| 4 | The status header shows a running clock ("00:01") next to the title. It is a second moving element with no meaning for the viewer. | `ticker/preview.png`; `ticker/Board.tsx:255` | small | no |
| 5 | Cover title (X1); the cover puts the title on the tape too (`ticker/index.tsx:172`), so the same text appears twice. | `ticker/index.tsx:75-172` | small | no |

## scale

**Identity (keep):** a brass balance scale on a marble floor, the hero of every comparison. Coin stacks are as tall as their values, and the beam tips by an angle proportional to the difference.

Strengths
1. It is the best comparison metaphor in the group, and it is honest. The tilt is proportional, capped at 14°, with a 2.5° floor so any real difference is visible. Stacks are proportional only when both values share a unit, and equal otherwise (`scale/Plan.ts:32-34`, `:98-118`).
2. The comparison builds suspense. The first weight alone tips the beam fully, and the second sets the real tilt (`scale/Plan.ts:272-295`), which is a payoff a viewer feels.
3. In the preview it reads clearly at phone scale: one gold object, centred, with a calm navy room behind. The idle state sways gently, so it is never fully still (`scale/template.json` transitions).

Improvements (ranked)
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | "Heavier" means "higher value", with no sense of good or bad. For rates, the heavier pan is the worse deal, and a viewer may read "heavier = better". Use the existing tone colour (good/bad rows) on the gold difference tag, or a short label, only when the data gives a direction. | `scale/template.json` grammar.comparisons; `scale/Stage.tsx:273` (`tone` exists) | small | no |
| 2 | The number on a falling weight is capped at 78 px, fitted to 380 px. It is the only number on screen in a numbers beat, while captions are 52 px. Raise the cap. | `scale/MiniPan.tsx:52-57`; `scale/Captions.tsx:22` | small | no |
| 3 | The English line is italic 28 px in `textDim`. Italic lowers legibility at that size (X2). | `scale/Captions.tsx:104-113`; `scale/preview.png` | small | no |
| 4 | Steps are drawn as stacked brass discs with text on dark plaques, while the scale dims behind. That is a second hero metaphor; check on a still that 3+ discs with 2-line Vietnamese stay readable. Unverified. | `scale/template.json` grammar.steps; `scale/Cues.tsx:102-118` | medium | no |
| 5 | Unsaid words at 0.45 opacity (X3). | `scale/Captions.tsx` Page | small | no |

## What Daniel must verify
- One still per design of a numbers moment and a change moment at `--scale=0.5`, once fonts load (frames per `src/designs/README.md` "Rules of the build"). Nothing above about those moments has been seen.
- Whether flash's "CẬP NHẬT LÃI SUẤT" label counts as template copy under golden rule 8 (auditor).
- Diacritic clipping in bigdigit `Assemble` and the ticker tiles, using a lettered hook such as "2 tỷ đô".
