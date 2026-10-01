done

# Concepts: faceless-data (bigdigit, flash, gauge, pulse, ticker, scale, receipt, calendar, timelapse, splitscreen, flipcard)

Creative director, 2026-10-01. This is a plan only. No project file was edited and nothing was rendered: the sandbox refuses the Google font fetch, so no item here has been seen on a still.
Inputs: `docs/agents/team-ground-rules.md`, `src/designs/README.md` (golden rules, locked), `01_golden_audit_faceless-data-{a,b}.md`, `01_critique_faceless-data-{a,b}.md`, and each design's planner, which I read again to pin the line numbers below.

Every item is in exactly one class:
- **A FIX-PROVABLE.** The audit proved a rule break from code or from the bundled planner harness. The fix can be verified by a repo check or by the same harness, without a still.
- **B FIX-NEEDS-RENDER.** The fix is correct, but its layout effect must be seen on a still before it is trusted.
- **C OPTION.** A look change. Daniel picks from stills.
- **D RULING.** A question only Daniel can answer.

**Counts: A 17 · B 13 · C 25 · D 6.**

---

## 0. The one shared fix: a stage scheduler for all eleven

**Does the code support one pattern? Yes.** All eleven planners have the same shape. Each has:
- a `taken`/`busy`/`blocks` span list seeded with the hook `[0, HOOK_FRAMES]`;
- own cues and classic panels added to that list;
- figures (`figuresOf`) and banks (`lenderMentionsOf`) sorted by start time, each placed on the stage if it is free, or after waiting up to `WAIT = 15`, or else as a chip.

gauge (`Scenes.tsx:67-131`), scale (`Plan.ts:300-366`) and splitscreen (`Plan.ts:50-125`) are near copies of each other: the same `freeFrom` loop and the same `WAIT` test. The faults all sit at the same four joints, in different designs:

| joint | where it breaks today (rule) | what the scheduler does instead |
|---|---|---|
| J1: stage item with a cue coming | bigdigit `Plan.ts:74-80`; flash `Stage.tsx:61-67`; flipcard `Stage.tsx:73-77`. Each shortens the card to `next - from` (5b, "hold wins") | Never shorten. If the full hold does not fit before the next block, the item rides as a chip in its own place. |
| J2: item that waits for the stage | receipt `Stage.tsx:113-115`; calendar `Plan.ts:92`; timelapse `Plan.ts:146-161`; flash/flipcard `place()` `frames - shift`. Each keeps the old end and loses up to 0.5 s (5b; measured, scenario E: 101 of 110 frames) | A waited item keeps its full `frames` from its new start. gauge/scale/splitscreen already do this. |
| J3: two chips up together | bigdigit `Plan.ts:97-103` and receipt `Stage.tsx:119-125` trim to as little as 1 frame; flipcard `laneOf` `Stage.tsx:84-95` trims to MIN_HOLD; gauge `Scenes.tsx:130`, scale `Plan.ts:365`, flash, flipcard banks `:103-109` and calendar tabs `Side.tsx:178-201` share one spot; splitscreen wraps with `lane % 3`. (Rules 1, 2, 3b; measured, scenario A) | Each chip takes the first lane that is free for its whole span. `lanes` is a number the design passes in, from its own geometry. When every lane is taken, the chip **queues** until the earliest lane frees. Never trim, never overlap. |
| J4: own cue said under the hook | bigdigit `Plan.ts:45-47` drops it; flash `Cues.tsx:47`, receipt `Cues.tsx:58` and flipcard `Cues.tsx:56` give it 1 to 12 frames; pulse `Plan.ts:65-66` draws it over the hook; timelapse `Plan.ts:89` starts it at frame 30 and hides the hook; gauge, scale and splitscreen give `from + 2 s`, which is 60 frames against a need of 66 (rules 1, 5b, 6; measured, scenario C) | It starts at `max(said, hookEnd)` and keeps its held length (`to - said`, which `readingFloor` has already stretched to its reading need). Later own cues shift by `freeFrom` and keep their length too. |

Plus `minHold(fps) = Math.round(READING.minNumberHoldMs / 1000 * fps)`. That replaces the `MIN_HOLD = 45` literal in bigdigit:20, flash:41, ticker:311, receipt:53, calendar:11 and flipcard:51. blueprint `Stage.tsx:516` already derives it this way.

**Where it lives.** `src/mortgage/` and other design folders are off limits to me. The proposal is a pure, string-free module, `src/elements/stageSchedule.ts`. `src/elements/useCoveredAudioData.ts` is the precedent for a non-visual helper there. It takes `{ fps, hookEnd, blocks, ownCues, items, lanes }` and returns `{ cues, stage, chips(+lane), queuedFrames }`. Each design keeps its own item types, its own `WAIT`, and its own idea of what counts as a block. For example, gauge treats a classic panel as a block and calendar treats `fullDesk` cues as hidden. So the identities do not move. Only the four joints become shared.

**Proof without a still.** Add `scripts/check-stage-schedule.mjs`:
1. It esbuild-bundles the module and the eleven planners, as `check-golden.mjs:17` already does.
2. It replays the audit's scenarios A (three banks in one breath), C (hook plus a change cue), D (bank during change) and E (stat 9 frames before a panel ends) through `buildTimeline` + `readingFloor`.
3. It asserts:
   - no two stage spans overlap, hook included;
   - no two chips in one lane overlap;
   - every placed item shows ≥ its input `frames`;
   - every own cue starts ≥ `hookEnd` and shows ≥ its held length;
   - no `MIN_HOLD` literal is left in these eleven folders.
4. It prints each chip's queue delay.

The script gets a line in `scripts/README.md` (ground rule 7) and a place in `npm test`.
`// ponytail: checks time only, not x/y; lane geometry is the B items.`

**What A alone guarantees, and what it costs.** With only one lane per design, A removes every overlap and every early cut. The price is that a second concurrent chip is shown **late**. In scenario A, NAB would wait for Westpac's chip to end, a delay of about 2 s (estimate from scenario A spans; the self-test reports the real figure). The B lane items buy that delay back. A is safe on its own. B makes it timely.

**Applies to:** all eleven. calendar uses only J2 and J3 (its date page is the stage, its notes and lender tabs are chip lanes). ticker has no scheduler at all today, so it adopts the whole thing.

---

## 1. A: FIX-PROVABLE (17)

Order: the module first, then by measured severity.

| # | design | file:line | change (one or two sentences) | rule | verify |
|---|---|---|---|---|---|
| A0 | shared | new `src/elements/stageSchedule.ts`, new `scripts/check-stage-schedule.mjs`, `scripts/README.md`, `package.json` test | Add the scheduler (J1 to J4, `minHold`) and its self-test as above. | 1, 2, 3b, 5b, 6 | `node scripts/check-stage-schedule.mjs`, `npm run lint`, `npm test` |
| A1 | ticker | `ticker/Stage.tsx:313-362`; `ticker/index.tsx:35`, `:202` | Route the hook, board cues (`BoardCueTrack` spans, `Cues.tsx:406`), classic panels (`index.tsx:352-357`), figure boards and lender quotes through the scheduler. Minis in the hook board become lanes that are never replaced before `minHold` (`:134`). The captions' busy level comes from ticker's own plan, not `faceless/Stage` `busyFrames`. | 3b (worst in the group), 5b | harness on faceless-test: `ANZ` no longer shares frames 247-254 with `6,2%` |
| A2 | receipt | `receipt/Stage.tsx:53`, `:112-115`, `:119-125`; `receipt/Cues.tsx:52-60` | Waited items keep their full `frames` (J2). Chips get lanes or a queue instead of `max(1, next.from - p.from)` (J3). A hook-delayed own cue keeps its length (J4). | 1, 2, 5b | scenario A: Westpac ≥ 75 frames (not 24); C ≥ 66 (not 12); E ≥ 110 (not 101) |
| A3 | calendar | `calendar/Plan.ts:11`, `:88-94`, `:96-104`; `calendar/Side.tsx:76`, `:178-201` | A date keeps `f.frames` from its waited start (J2). Notes and lender `TabCard`s are scheduled into lanes or a queue, not a fixed 0/1 and one shared TAB spot (J3). | 2, 3b, 5b | scenario A: no two tabs in one lane overlap |
| A4 | flipcard | `flipcard/Stage.tsx:51`, `:59-78`, `:84-95`, `:103-109`; `flipcard/Cues.tsx:50-58` | `place()` stops shortening (J1, J2). `laneOf` queues instead of cutting the previous figure. Banks get lanes. Hook-delayed cues keep their length (J4). | 1, 2, 3b, 5b | scenario A (Westpac/NAB 156-207 no longer co-mounted), C ≥ 66 |
| A5 | flash | `flash/Stage.tsx:41`, `:49-67`, `:53-59`; `flash/Cues.tsx:43-49` | Same J1, J2 and J4 as flipcard (same `place()` code). Figure chips use scheduler lanes. | 1, 3b, 5b | C ≥ 66 (not 1 frame), E full hold |
| A6 | bigdigit | `bigdigit/Plan.ts:20`, `:45-47`, `:74-80`, `:97-103` | An own cue inside the hook is no longer dropped (`continue`): it starts at `hookEnd` with its length (J4). A stage item is never shortened for a coming cue (J1). Chips are never trimmed (J3). | 1, 5b | C: cue present with ≥ 66 frames; two-chip case ≥ `frames` each |
| A7 | timelapse | `timelapse/Plan.ts:89`, `:146-161`; hook gate `index.tsx:217-220` | An own cue never starts before `hookEnd` and keeps its length, so `hookShow` holds to 3.5 s (J4). A waited figure keeps its frames (J2). A `TopBox` scene title counts as an occupant of mini lane 0 (J3, timing part). | 6, 5b, 3b | C: hook up through frame 105; D: ANZ mini not co-timed with the change title in one lane |
| A8 | pulse | `pulse/Plan.ts:65-66`, `:111` | An own cue under the hook starts at `hookEnd` with its length, not `max(a, min(105, b-60))` (J4). `lane` is capped at the design's lane count, with a queue beyond it (J3). | 3b, 6 | C: no frame where the hook and an own cue are both mounted |
| A9 | gauge | `gauge/Scenes.tsx:101-102`, `:130` | A hook-clipped change keeps its held length, not `from + 2*fps` (J4). Chips get lanes or a queue (J3). | 5b, 3b | C ≥ 66 |
| A10 | scale | `scale/Plan.ts:336-337`, `:365` | Same as A9 (same code). | 5b, 3b | C ≥ 66 |
| A11 | splitscreen | `splitscreen/Plan.ts:80-83`, `:114-119`; `splitscreen/Chip.tsx:115` | Same J4. The lane count is bounded (3), with a queue, not a `lane % 3` wrap onto an occupied lane. | 5b, 2 | C ≥ 66; a 4th concurrent chip queued, not stacked |
| A12 | ticker | `ticker/index.tsx:96` | `height: 120` becomes `LOGO_HEIGHT`. | 3 (constants) | grep, lint |
| A13 | ticker | `ticker/index.tsx:75` | Measure the cover title only after `reelFontReady()` with `useDelayRender`, as `ticker/Board.tsx:269` does. | 5 (measure after font) | code; lint |
| A14 | bigdigit | `bigdigit/Paper.tsx:72-84` (`giantSize`), `bigdigit/Stage.tsx:91` | Fit the giant number to `W / PUSH` and export `PUSH = 1.035` for the push-in. A width-bound number then ends at ≤ SAFE.right at full push (now about x 992). | 3 (SAFE) | arithmetic: `SAFE.left + W/PUSH*PUSH ≤ SAFE.right` |
| A15 | timelapse | `timelapse/Scenes.tsx:885` (and the `TRACK.x0 - 64` left next to it) | `right: 1080 - 960` becomes `W - SAFE.right`, and `left` becomes `SAFE.left`. The pixel result is identical today. | 3 (constants) | grep, lint |
| A16 | gauge, pulse, scale | `gauge/Stage.tsx:211`, `pulse/index.tsx:258`, `scale/Captions.tsx:200` | Chapter plate length becomes `max(2.5 s, readingMs([title]))` instead of a fixed 2.5 s. This is latent: all 68 fixture titles fit today, so nothing changes now. | 5b (INFO) | harness over fixture titles: unchanged durations |

---

## 2. B: FIX-NEEDS-RENDER (13)

These are correct fixes whose x/y placement must be seen on a still.

| # | design | file:line | change | why a still |
|---|---|---|---|---|
| B1 | ticker | `ticker/Stage.tsx` StageBox `:42-72` | Give ticker a chip place, which it lacks today: one flap row at the stage's top edge, built with the existing `FlipTiles` (`Board.tsx:120`). A1 needs it, or else banks queue. | new placement next to the board and the tape |
| B2 | gauge | `gauge/Dial.tsx:26` (CHIP_TOP 600); `gauge/index.tsx:271-272` (paint order); `gauge/Readouts.tsx:127-180` | While a classic panel is up, chips need a place clear of the panel (which runs from 600 down), for example under it above the captions. Add a 2nd lane on the opposite side. | the panel height varies per cue |
| B3 | pulse | `pulse/Chip.tsx:11`, `:17-18`; `pulse/Scope.tsx:21-27` | Header lane 1 must not enter `PLOT.top` 740 (stack sideways, not down). The foot chip (1160-1236) must clear a 2-line VI caption (top 1217). | measured 19 px overlap; horizontal overlap depends on line width |
| B4 | flash | `flash/Stage.tsx:255`, `:333-341` | Add a 2nd figure-chip lane (the CHIP band's right half when no bank is up). | band width vs chip width |
| B5 | scale | `scale/MiniPan.tsx:30`, `:248-253`; `scale/Captions.tsx:141-146` | Add a 2nd chip lane. Move the chip row below the chapter plate's worst case (measured bottom 552), or cap the plate at 2 lines. | measured 21-50 px overlap |
| B6 | splitscreen | `splitscreen/Chip.tsx:104-118`; `splitscreen/index.tsx:141` | Make the three lanes disjoint: halfW ≤ 151, or two lanes left and right. Arithmetic: figures overlap by 57 px and banks by 147 px today. Move the cover logo tile from `SAFE.top - 20` (y 400, outside SAFE) to ≥ SAFE.top. That rule 3 part holds whatever D1 decides. | narrower chips must still hold a 64 px number and logo; logo vs cover title |
| B7 | flipcard | `flipcard/Stage.tsx:415-503` | Keep the bank chip clear of the figure chip and its label (out to about x 764). Cap the label width, or drop the bank chip to a 2nd row. | depends on logo width |
| B8 | timelapse | `timelapse/Scenes.tsx:698-873`; `timelapse/Captions.tsx:157-224` | A mini figure or bank gets its own slot apart from `TopBox` titles and the points stopwatch. Cap the chapter flag at 2 lines so it cannot climb into the dial (CLOCK y 790, r 205). | corner composition |
| B9 | calendar | `calendar/Side.tsx:76-89`, `Desk.tsx:30`, `:369`; `Notepad.tsx:11` | Notes must clear the notepad, compare pages and MotionTrack panels (for example by taking the side the desk cue leaves free). Anchor the slap-in scale at the note's right edge so 1.35x stays ≤ SAFE.right (about x 990 today). Add a 2nd tab lane. | inferred overlaps, not yet seen |
| B10 | receipt | `receipt/Compare.tsx:64-127`; chip lane in `receipt/Stage.tsx` | Cap the compare receipt height at `STAGE_H`, as points does at `Cues.tsx:192`, by tightening rows or moving the question off the paper. Add a 2nd chip lane. | about 860 px tall today (estimate) |
| B11 | bigdigit | `bigdigit/Stage.tsx:158-199`, `:291-309` | Confirm first whether a tall points panel reaches the chip spot (y about 1005-1150). If it does, chips move above the panel's end or into a 2nd lane. | unverified even as a fault |
| B12 | gauge, pulse, scale, flash, calendar, flipcard | gauge `Stage.tsx:20`, `:103-118`; pulse `index.tsx:351-366`; scale `Captions.tsx:21`, `:104-118`; flash `Captions.tsx:17-18`, `:130-131`; calendar `index.tsx:251-252`; flipcard `Captions.tsx:125-126` | One shared pattern: size the EN line, and flash's VI page, by **measured line count**, extending flash's own `sizeFor` precedent, so the caption pair always fits its zone. Measured overlaps today: EN over VI by 19 px (gauge), 15 px (pulse), 35 px (scale); VI into stage by 25 px (flash); silent EN clip (flash, calendar, flipcard). **Note:** raising or lowering `template.json` `maxChars` would not fix this. The selector applies it to cards only (`select-template.mjs:63-67`, `longestCard`), not to subtitle lines, so the audit's "maxChars.en 140 allows it" line points at the wrong lever. | size changes are visible |
| B13 | receipt, calendar, flipcard | `receipt/Stage.tsx:270`, `calendar/Side.tsx:132`, `flipcard/Stage.tsx:628` | Single-line chapter slots shrink a 60-char title to about 12-13 px (estimate). Allow 2 lines with `fitTextOnNLines` (pattern at `ticker/Cues.tsx:74`), with a floor of about 26 px. | slot height grows |

---

## 3. D: RULINGS (6). Only Daniel can answer these.

| # | question | reading 1: what it costs | reading 2: what it costs |
|---|---|---|---|
| **D1** | Does rule 3c's "the Cover keeps its own logo at the same size and place" bind faceless covers? 10 of 11 fail it. bigdigit and flash put the logo top-left. gauge, pulse and ticker put it top-centre. receipt, calendar, timelapse, splitscreen and flipcard centre it. Only scale complies. | **Strict:** 10 cover edits, each a B (the titles are composed around a centred logo; bigdigit's own template.json says "logo tile top-left"). It touches cover identity in about 5 designs, with 10 stills to approve. | **Size binds, place is free on covers:** no cover moves. The README rule text needs Daniel's amendment (it is locked, so I cannot do it). A12 and B6's SAFE part still apply. |
| **D2** | Rule 8, "a template adds no claims of its own": may a design show a **computed** difference the reel never said, when it is pure arithmetic on two values the reel did say in one unit? This applies to **five** designs, not the two the audit named: flash `diff.ts` (change chip), scale `Plan.ts:84-96` (pan tag), receipt `Compare.tsx:44` (`differenceOf` stamp), splitscreen `Cues.tsx:258-263`, `:321` (difference bar), flipcard `Cues.tsx:20` (`changeDiff` ribbon). | **Allowed (arithmetic, not a claim):** no change. Compliance notes the derivation once. | **Not allowed:** remove five computed chips. Each design keeps showing a difference only when the reel states it (splitscreen and flipcard already prefer a stated one). This costs part of the signature moment in flash (strike plus diff chip), receipt (gold stamp) and scale (tag; the tilt still shows the size). Each is a small code change plus a still. |
| D3 | Is the "FINANCE HUB" **text** in calendar's header band (`Page.tsx:51`, `:321`, up for most of the talk) and on every receipt header (`receipt/Paper.tsx:25`, `Rows.tsx:49`) "another always-on logo" under 3c? | **Yes:** replace it with the chapter title (calendar) or a neutral receipt header from `copy`. Small; 2 stills. | **No (it is set type, not the logo file):** keep it. It is part of both props' realism. |
| D4 | flash's alert bar says "CẬP NHẬT LÃI SUẤT" (rate update) on every video (`flash/Frame.tsx:24`, `AlertBar.tsx:74`), including the bank-fee preview. Is a fixed topic label template copy that makes a claim under rule 8? | **Yes:** use the chapter or title, or a neutral "TIN NHANH". Small; 1 still. | **No (it passed the copy scan):** keep it, and restrict flash's `intents` to rate moves (C-fl2) so the label is true. |
| D5 | Does the 30 px placeholder in `check-text-size.mjs` (report only) become a floor for faceless labels and the EN line? 20 literals under 30 px in group a and 27 in group b (check-text-size, per audits). | **Floor:** every under-30 literal is raised, a B per design; it interacts with B12. | **Stays a report:** only the critic's targeted raises (C options) happen. |
| D6 | No faceless design is in `QUICK_FALLBACK` (`MortgageReel.tsx:87`). A faceless edit.json with `"background": "vignette"` would play the source picture over these backdrops (audit-a §2, unverified). Should faceless designs refuse quick mode? | **Add them to the fallback list or refuse at select time:** a core change (`src/mortgage/` or `select-template.mjs`), outside my lane. The integrator does it. | **Leave it:** rely on edit discipline. Risk: one wrong flag shows the raw room, a rule 4 break. |

---

## 4. C: OPTIONS (25). Daniel picks from stills.

Format: `name | what changes | axis | resources reused | golden rules touched | effort | risk | what Daniel will see`. None of these touches a golden rule, so that column reads "none" unless stated otherwise.

### Shared options (count once each, apply per design)

| name | what changes | axis | reused | rules | effort | risk | Daniel will see |
|---|---|---|---|---|---|---|---|
| CX1 cover title floor | Fit cover titles to 3 lines with a floor of about 72 px (64 for timelapse and splitscreen, which share the cover with a prop) instead of one line × 1.6 to 1.9. Raise gauge's 84 px cap. | cover | `fitTextOnNLines` (`@remotion/layout-utils`, as in `ticker/Cues.tsx:74`) | none (rule 6 still uses layout-utils fitting) | small ×11 | 3 lines may crowd the prop on calendar and timelapse | thumbnails whose title reads at feed size, with long titles no longer about 40 px |
| CX2 keyword lights only when spoken | Unsaid words at solid dim colour (not 35-55 % opacity), and the keyword highlight added at the word's moment, as calendar does (`calendar/index.tsx:197-202`) | captions | calendar's own pattern | none (rule 5 kept) | small ×9 (not calendar; ticker already uses a solid LED block) | less read-ahead "preview" of the keyword | the most important word is never the dimmest; no olive "tỷ đô" |
| CX3 number keeps its noun | No-break space between a numeral and the next word in titles ("3 điều") | type | none, string transform | none | small | none | no orphaned "3" at a line end (flash, calendar, flipcard previews) |

### Per design

| design | name | what changes | axis | reused | effort | risk | Daniel will see |
|---|---|---|---|---|---|---|---|
| bigdigit | C-bd1 | EN line 25 to 30 px, solid slate (keep the left rule) | captions | none | small | needs B12 room check | an English line readable on a phone; Swiss calm kept |
| flash | C-fl1 | Title card with `textWrap: balance` and one weight step under the caption strip, so there is one landing point | hierarchy | CX3 | small | none | a clear title vs strip order |
| flash | C-fl2 | Narrow `intents` to rate and policy moves (metadata only) | fit | template.json | small | fewer videos get flash | the alarm look only where alarm is true |
| gauge | C-ga1 | Readout moves into the dial's open bottom at about 120 px, twice as wide | number size | `Readouts.tsx` | medium | crowds the ghost needle label on a change | the figure as big as the needle is loud |
| gauge | C-ga2 | Idle dial shows the last said value faintly, or dims | idle | `Dial.tsx` | small | a stale number could read as current | the dial no longer looks decorative when idle |
| pulse | C-pu1 | The current-word glow becomes a tight shadow plus a gold underline | captions | none | small | less "monitor" glow | sharp diacritics on the live word |
| pulse | C-pu2 | Hook sub on up to 2 lines with `fitTextOnNLines`, not one `nowrap` line | hook | layout-utils | small | taller hook block | the hook sub at about 40 px, not about 25 |
| ticker | C-ti1 | The tape adds an item only after it is said (or scrolls the title only) | pacing / spoilers | `NewsTicker` logic in `Board.tsx:357-377` | small | tape is sparse early | no rate move given away before the voice says it |
| ticker | C-ti2 | `change` as one flap row flipping old to new, not the classic swap card | change grammar | `FlipTiles` (`Board.tsx:120`) | medium | long values need tile fitting | the rate move stays in the board's own language |
| ticker | C-ti3 | Drop the running "00:01" clock in the status header | noise | none | small | header feels emptier | one less moving thing next to the title |
| scale | C-sc1 | Tone colour (good/bad) on the difference tag, only when data gives a direction | meaning | `tone` exists (`Stage.tsx:273`) | small | depends on D2 (the tag may go) | "heavier" no longer reads as "better" |
| scale | C-sc2 | Falling-weight number cap 78 to about 110 px | number size | `MiniPan.tsx:52-57` | small | wide values hit the pan width | the number outranks the caption |
| receipt | C-re1 | Idle stage shows a standing "receipt so far" (title, chapter, items printed), with the slip kept for live words | idle | `Paper.tsx` rows | medium | more on screen idle; check against 5b | the top 55 % is no longer bare counter |
| receipt | C-re2 | Row labels wrap to 2 lines before shrinking, floor about 26 px | type floor | `fit`, `Rows.tsx:132-133` | small | taller receipts (watch B10) | labels readable, not about 12-14 px |
| calendar | C-ca1 | A figure goes on the top page when it is free; the sticky note only for a second, overlapping number | hierarchy | `Page.tsx` date path | medium | page flips more often | the said number is the biggest thing on screen |
| calendar | C-ca2 | VI caption 46 to 52 px | captions | none | small | wraps sooner | the smallest caption in the group stops being the smallest |
| timelapse | C-tl1 | The disc shows the chapter or title, not the running `mm:ss`, with the hands kept | idle | `Scenes.tsx:495-513` | small | less "clock" feel idle | no fake data in the hero |
| timelapse | C-tl2 | Clock icon on a figure only when it is a time or date | meaning | `Scenes.tsx:438-439` | small | none | money no longer marked as a duration |
| splitscreen | C-ss1 | Idle divider parked at the stage edge (as for the hook), so the caption sits on one pane | idle | `Slider.tsx:21-26` | small | less slider presence idle | no gold line through the words |
| splitscreen | C-ss2 | Chip kicker 15-18 px raised to ≥ 24 px, or dropped | type | `Chip.tsx:136`, `:147` | small | fits with B6's narrower lanes | a readable "CON SỐ" label |
| flipcard | C-fc1 | Pause the idle hero turn-over while a lane figure is up (`blocks` include figures) | hierarchy | `Stage.tsx:241-255` | small | quieter hero during figures | the said number is not out-moved by an older hook value |
| flipcard | C-fc2 | Current-word card: keep the padding, drop the `-8px` margin | captions | `Captions.tsx:70-73` | small | line a little wider | word gaps back ("trả hàng") |

Count: CX 3 + bigdigit 1 + flash 2 + gauge 2 + pulse 2 + ticker 3 + scale 2 + receipt 2 + calendar 2 + timelapse 2 + splitscreen 2 + flipcard 2 = 25.

---

## 5. Order of work

1. **A0, then A1 (ticker).** A1 is the only fault measured on the promote fixture itself.
2. **A2 to A11** in this order, by measured severity: receipt, calendar, flipcard, flash, bigdigit, timelapse (rule 6), pulse, gauge, scale, splitscreen. The last three already have correct J1 and J2.
3. **A12 to A16.** Trivial, any time.
4. **When stills work:** B1 (ticker needs a chip place), B12 (captions; shared), B6, B2, B3, then the rest. Re-run `check-stage-schedule` after each lane added, and pass each design's real lane count.
5. **D1 to D4** before any cover or difference-chip work. D2 decides whether C-sc1 exists.
6. **C options**, best effect for effort first: CX2, CX1, C-ti1, C-fc1, C-tl1, C-ss1, C-ga1, C-ca1, C-re1, then the small type raises.

## 6. What I would not do, and why

- **Not eleven local patches.** The four joints are the same code. A shared module plus one self-test turns the audit's synthetic scenarios into a regression gate.
- **Not change `maxChars`** to cure caption overlaps. It does not govern subtitle lines (B12 note).
- **Not shorten anything to make room.** Every fix either moves an item to its own place or delays it whole (rule 5b, "hold wins").
- **Not fix compare/steps/trend that fall back to classic panels** (gauge #3, pulse #5). These are large builds with no rule at stake; wait until the A and B work has settled.
- **Not touch** `src/mortgage/` (QUICK_FALLBACK is D6, for the integrator), `src/brand/`, or the `faceless` design (ticker stops importing its `busyFrames` instead).
- **Not add a pacing claim.** `check-pacing.mjs` cannot see these designs' plans (`:94`, `:116` ponytail), so idle-motion compliance stays unverified until a per-design pacing hook exists.

## 7. What Daniel must verify

1. D1 to D6 (above). **D2 matters most:** it decides whether the signature change/compare moment of five designs keeps its computed difference.
2. On the first working render: stills of ticker at talk frame 250 on faceless-test (after A1 and B1), gauge with a stat during a points cue (B2), and one still per B item.
3. Unverified critic risks to check on those stills: diacritic clipping in bigdigit `Assemble` (`Paper.tsx:226-237`) and the ticker tiles (`Board.tsx:129-165`), using a lettered hook such as "2 tỷ đô".
