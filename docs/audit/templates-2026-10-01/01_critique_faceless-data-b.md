partly done

# Design critique: faceless-data-b (receipt, calendar, timelapse, splitscreen, flipcard)

Critic: design-critic. Date: 2026-10-01. No project files edited.

## What was and was not seen

- **No render possible** (sandbox refuses the Google font fetch). Each design was seen in
  only one frame: its `preview.png`. `scripts/promote-design.mjs:33,126` renders that at
  frame 120 with `--scale=0.5`, so the preview is 540x960, which is phone size. Calendar
  **does** have a preview (`src/designs/calendar/preview.png`, written 2026-10-01 14:38),
  so the brief's "calendar has none" is out of date.
- All five previews come from the fixture `public/videos/faceless-test/edit.json`. That
  fixture has **no hook, no stats and no cues**, only a title and three subtitles. So each
  preview shows only the idle state (title or empty stage, plus captions). **No cue,
  figure, compare, change, points, lender or cover was viewed for any design.** Every
  remark on those comes from the code and is marked "not viewed at phone size".
- `corrections.md` has no entries naming these five designs. Two "all" entries apply:
  "text too small" (25/09, `noted`, judge at phone size) and "too static" (golden rule 5b).
- Pixel sizes are canvas px (1080 wide). On a typical phone, 1 canvas px is about 0.36 pt,
  so 26 px is about 9 pt.

## Problems shared by four or five designs (fix once, gain everywhere)

| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| A keyword is the dimmest word on the caption until it is spoken. An unspoken keyword is drawn gold at 35-55% opacity, which shows as muddy olive on navy ("tỷ đô" in the timelapse and splitscreen previews, "tỷ" in flipcard) or as grey on beige highlighter (receipt slip). On a muted phone the most important word is the hardest to read. Calendar gets this right: it adds the highlight only once the word is spoken. | receipt/Captions.tsx:84-89; timelapse previews; splitscreen/Text.tsx:76-77; flipcard/Captions.tsx:68-74; calendar/index.tsx:200-202 (the good pattern) | small | no (rule 5 is still met; this changes only the pre-spoken state) |
| The English line is 26-27 px (about 9 pt on a phone) in dim colours, and in calendar and flipcard it is cut by `maxHeight` plus `overflow: hidden`. A 140-char English line (the `maxChars.en` limit) needs roughly 2.1-2.2 lines at 24-26 px across 906 px (estimate, not measured), but only 2 lines fit, so the end of the sentence can vanish silently. | calendar/index.tsx:245-252 (maxHeight 73 px); flipcard/Captions.tsx:118-125 (maxHeight 81 px); receipt/Captions.tsx:147; splitscreen/Text.tsx:131 | small | no |

## receipt

**Identity (keep):** a thermal printer on a dark navy counter-top under a warm lamp pool. Paper feeds out line by line with zig-zag torn edges and dotted leaders. The motion vocabulary is the tear-off stub, the stamp thump and the pen strike.

Strengths
1. The free-stage caption **is** the skin. When nothing prints, the words print on a torn paper slip out of the printer mouth at 70 px weight 900 (Captions.tsx:19,52-69). That is the biggest Vietnamese caption in the group and reads cleanly in the preview.
2. The comparison grammar is honest. The gold difference stamp lands only when both totals are numbers in one unit, and red/green appear only when tone or direction gives them (template.json grammar `comparisons`, `change`). The same data shape always draws the same way.
3. Numbers use `TABULAR` figures, and Vietnamese grouping is parsed carefully (Paper.tsx:98-104: "3.388", "4,35%", years and dates left as said). Count-ups will not jitter or misread.

Improvements
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The idle stage is empty. At 4 s the top ~55% of the frame is bare counter, and the printer and slip sit at y ~1030-1180. A faceless video spends most of its runtime idle, so a viewer gets one short line low on the screen and nothing to anchor the topic. Give the free stage a standing "receipt so far": the title, then the chapter, then each item already printed, at the stage's centre. Keep the slip for the live words. | preview.png; Paper.tsx:31-32 (STAGE 596-1166, SLOT_Y at its bottom); index.tsx:327-333 (idle = only slip + tongue + LED) | medium | no |
| 2 | Compare/receipt row labels have no size floor. Inline labels are fit to one line in 36% of the receipt's inner width (`fit(label, inner*0.36, 1, 30)`), and `fit` never clamps upward. A 30-char Vietnamese label ("Phí duy trì tài khoản hằng tháng") on a 700 px receipt would come out around 12-14 px (estimate). Allow two lines, or stack, before shrinking below about 26 px. | Rows.tsx:132-133; Paper.tsx:59-79 | small | no |
| 3 | Unspoken words on the slip sit at opacity 0.35, which also fades the gold highlighter under them, so "tỷ đô" reads as pale grey on beige (preview). See the shared finding. | Captions.tsx:84-89 | small | no |
| 4 | The fixed small sizes are under the "text too small" correction's 30 px placeholder: the receipt header at 24 px, the stamp kicker at 22 px, the figure sub-labels at 22-26 px. These are the labels that tell a viewer what a number is. | Rows.tsx:44,355; Figures.tsx:224,251; Stage.tsx:295 | small | no |
| 5 | Every printed receipt carries a "FINANCE HUB" text header. Together with the cover logo and LogoMark, that repeats the brand on every cue. The auditor should rule on whether it is an "other always-on logo". | Paper.tsx:25; Rows.tsx:49 | small | yes (rule 3c, for the auditor) |

Not viewed at phone size: cover, figures, compare, change, steps, lender slip.

## calendar

**Identity (keep):** the only **light** design in the group: an off-white desk with a dot grid, a tear-off wall calendar with binder rings and a navy header, and the gold marker that circles a landed date. The calendar is also the only one of the five where the topic is always on screen.

Strengths
1. The idle state carries the message. The top page holds the video title under a gold highlighter, so a muted viewer arriving mid-video knows the topic (preview; Page.tsx:326). This idle state is the best in the group.
2. Keywords light only once spoken, on a solid gold highlighter, with navy type on a white strip (index.tsx:197-202). This has the highest caption contrast of the five, and it is the pattern the others should copy.
3. The date grammar is meaningful motion: pages flip through and land on the date with a ding and a gold circle (Plan.ts:9, Page.tsx `PageSfx`). Dates and years never count up, which is correct for a date.

Improvements
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | Hierarchy is inverted for figures. Any figure other than the hook or a date becomes a 228 px sticky note on the calendar's edge, with the number capped at 84 px in 188 px of width ("$650.000" comes out around 40 px, estimate). Meanwhile the calendar only shrinks 14% and keeps the title as the largest thing on screen. When a number is said, it should be the one thing to look at: put it on the top page (as the date stat already does) when the page is free, and keep the note for a second, overlapping number. | Side.tsx:41-46; Desk.tsx:30 (NOTE width 228); Page.tsx:55 (SIDE_SCALE 0.14) | medium | no |
| 2 | The title breaks the number from its noun: "Phí ngân hàng: 3 / điều nên biết" leaves "3" alone at a line end (preview). Bind a numeral to the next word with a no-break space, or use `textWrap: balance` on the title page. | preview.png; index.tsx:110-118 (word spans, no balance) | small | no |
| 3 | At 46 px, the Vietnamese caption is the smallest in the group (others are 50-70), and it sits on a busy light desk. Raise it to 50-54 px; the strip has room. | index.tsx:184 | small | no |
| 4 | The English line is clipped to 2 lines (`maxHeight` 73 px, `overflow: hidden`). The 140-char limit likely needs about 2.2 lines at 26 px (estimate). See the shared finding. | index.tsx:245-252 | small | no |
| 5 | The navy header band reads "FINANCE HUB" for the whole video whenever no change cue owns it, which makes it an always-on text brand mark. The auditor should rule on it. A chapter name there would be more useful to the viewer. | Page.tsx:51,323 | small | yes (rule 3c, for the auditor) |

Not viewed at phone size: cover, sticky notes, compare pages, notepad, week planner, tear-off change.

## timelapse

**Identity (keep):** a glowing clock dial on deep navy, with a timeline track under it whose playhead tracks the talk's progress. The before-to-after **fast-forward** has motion-blurred hands, speed lines and a number that scrubs through the values in between. That scrub is the signature.

Strengths
1. The playhead doubles as an honest progress bar (Machine.tsx:88-92) and is pulled to the pins on each reveal. Motion here always means something.
2. The change scrub runs only when both values are clean numbers in one unit, and otherwise falls back to a blur swap (template.json `comparisons`; Scenes.tsx `Smear`). It never fakes an interpolation.
3. The caption strip has a gold ruler edge that ties the captions to the timeline metaphor without a second visual language (Captions.tsx; preview).

Improvements
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The idle hero shows a meaningless number. With the stage free, the dial's only content is a running `mm:ss` timecode ("00:01" in the preview) and ticking hands. In a design about numbers, a viewer reads that as data. Replace the timecode with the title or current chapter on the disc, and keep the hands running. | preview.png; Scenes.tsx:495-513 | small | no |
| 2 | Every figure gets a clock icon ("$650.000" followed by a clock icon), which says "a time or duration" when the number is money or a rate. That breaks message-first. Keep the timestamp chip shape and drop the icon unless the figure is a time or date. | Scenes.tsx:438-439; template.json `numbers` | small | no |
| 3 | The data is squeezed into the dial. Figures are fit to 220 px wide and the change values to 290 px, with labels in a 270 px box that can shrink to 20 px (about 7 pt). A long Vietnamese label becomes unreadable on a phone. Let labels sit under the dial at full width (≥ 30 px) instead of inside it. | Scenes.tsx:234,246,388,415,461-465 | medium | no |
| 4 | The cover title shrinks hard on long titles. The size is a one-line `fitText` × 1.6, so a 60-char Vietnamese title gets about 40 px (estimate), placed under a 410 px clock. In the feed the clock wins and the title becomes a footnote. Fit the title to 3 lines with a floor of about 64 px, and shrink the clock if needed. | index.tsx:92-102,137-145 | small | no |
| 5 | Unspoken keywords render as dark olive ("tỷ đô" in the preview). See the shared finding. | Captions.tsx; preview.png | small | no |

Not viewed at phone size: cover, figures on the disc, fast-forward compare, milestones, lender disc.

## splitscreen

**Identity (keep):** the before/after **slider**: a cool steel BEFORE pane with diagonal hatch and a navy AFTER pane with gold light, split by a gold divider with a glowing round handle. The divider parks right, then sweeps left with an overshoot on each comparison.

Strengths
1. It gives a comparison the most legible grammar in the group: the uncovering *is* the change, and the AFTER value climbs from the BEFORE value (template.json `comparisons`). It teaches the viewer once and reads the same way every time.
2. Captions move to where the eye is: big (70 px) on the free stage, sliding down to the strip at 50 px when a cue takes the stage (Text.tsx:24-26,47-58). The current-word gold bar wipes in over 160 ms, which keeps the eye moving without frantic word pops.
3. The cover turns the title from muted steel to bright as the handle sweeps (index.tsx:76-140), so the design's signature move appears in the first second.

Improvements
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The free-stage caption sits across the divider. The gold line runs through the words (through "trả" in the preview), and half the sentence is on hatched steel while half is on glowing navy, so two backgrounds fight under one line. Park the idle divider at the stage edge (as for the hook), or give the caption a solid plate. | preview.png; Text.tsx:47-58; Slider.tsx:21-26 | small | no |
| 2 | The compact-chip kicker ("CON SỐ" or "ĐANG NHẮC TỚI") is 15-18 px with 3 px tracking, about 5-6 pt on a phone, and the logo in it is 30 px high. This is the label telling a viewer what the rider number is. Raise it to ≥ 24 px, or drop it and let the number stand. | Chip.tsx:136,147 | small | no |
| 3 | In the idle state, the band between the stage and the English line (y ~1170-1420) is empty dark navy (preview), and the stage holds only the caption. The design looks unfinished between cues. Use the free strip for the chapter or title, or move the stage down to centre the composition. | preview.png; Slider.tsx:21-27,35 (STRIP_TOP 1172) | medium | no |
| 4 | The cover title shrinks hard on long titles. The size is a one-line `fitText` × 1.7, capped at 92, so a 60-char title gets about 37 px (estimate) inside a 540 px tall stage. The cover also shows TRƯỚC / SAU tags on a title that may not be a comparison. Fit to 3 lines with a floor, and show the tags only when the video's first cue is a compare or change. | index.tsx:83-93,140-152 | small | no |
| 5 | Unspoken keyword "tỷ" reads as olive on the stage (preview). See the shared finding. | Text.tsx:76-77 | small | no |

Not viewed at phone size: cover sweep, compare/change slider, mini-slider points, split chips, lender slide-out.

## flipcard

**Identity (keep):** one hero card with a 3D Y-axis turn-over, a sheen, a stretching shadow and navy/gold foil guilloche faces, on a navy stage with parallax bokeh. Also keep the tilted gold card that carries the word being said.

Strengths
1. The turn-over is a clean metaphor for before-to-after: one object, front to back (template.json `change`, `comparisons`). It gives the change grammar a physical "reveal" moment that lands on the swap.
2. The idle state keeps the title on the hero card, with a slow tilt and a sheen every 2.5 s (Stage.tsx:241-246). The topic is always visible and the picture never sits still, which matches golden rule 5b without a hard cut.
3. The current-word gold card (preview: "hàng") is the strongest "where am I in the sentence" cue in the group, and the caption is 54 px weight 900 on a near-opaque strip (Captions.tsx:18,40-55).

Improvements
| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | Two numbers compete. Figures never take the stage; they go into a 104 px lane with the number capped at 64 px. Meanwhile the idle hero card keeps turning over every 3.5 s to the **hook value**, because `blocks` does not include figures. When "4,1 tỷ" is said, the biggest moving thing on screen is a different, older number. Pause the idle turn-over while a lane figure is up, or let a free-stage figure turn the hero card over. | Stage.tsx:1-6,96-101,114-123,241-255,415-425; Look.tsx:33-35 | medium | no |
| 2 | The current-word card eats the word gaps. `padding: 0 8px` with `margin: 0 -8px` makes its gold edge touch the neighbours ("trả" runs into "hàng" in the preview). Keep the padding and drop the negative margin, or add letter-space around the card. | preview.png; Captions.tsx:70-73 | small | no |
| 3 | The title breaks "3" from "điều" ("Phí ngân hàng: 3 / điều nên biết", preview). Bind numerals to the next word. | preview.png; Stage.tsx:288 | small | no |
| 4 | The English line is clipped at 81 px (`overflow: hidden`). A 140-char line at 24 px italic is borderline at 2 lines (estimate). See the shared finding. | Captions.tsx:118-125 | small | no |
| 5 | Unspoken keyword "tỷ" reads as olive (preview). See the shared finding. | Captions.tsx:68-74 | small | no |

Not viewed at phone size: cover deal, hero turn-over compare/change, dealt points deck, lane chips, lender white face.

## What Daniel must verify

- The estimated sizes (cover titles of about 37-40 px on 60-char titles, English clipping at 140 chars, receipt labels of about 12-14 px) are arithmetic from the code, not measured. One phone-size still per design, using a fixture **with a hook, a stat, a compare and a change**, would confirm or kill them. The current faceless fixture exercises none of these.
- Whether the "FINANCE HUB" text headers (receipt, calendar) count as an always-on logo under rule 3c is for the auditor.
