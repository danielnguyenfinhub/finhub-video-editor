partly done

# Golden rules audit: faceless-data-a (bigdigit, flash, gauge, pulse, ticker, scale)

Auditor: golden-rules-auditor. Date 2026-10-01. Read-only: no project file was edited.
I could not render anything in this sandbox (the headless browser cannot fetch the Google font), so every visual claim here comes from a code reading, a check script or a font-metric measurement. Nothing was confirmed on a still. That is why the report opens with "partly done".

Sources read: `docs/agents/team-ground-rules.md`; `src/designs/README.md` (contract and golden rules, read verbatim); `corrections.md` entries scoped `all` (25/09 rules 1, 2, 3, 3b, 3c, 5b; 27/09 cue room and background; 30/09 render-once and pacing). No entry is scoped to any of these six ids. Also read: `src/mortgage/golden.ts` (SAFE, FACE, READING, readingMs, readingFloor, AUTO_MS), `design.ts`, `LogoMark.tsx`, `PagedCaptions.tsx`, `classic/Cues.tsx` + `classic/Infographics.tsx` (MotionTrack / Panel geometry), and each design's index.tsx, plan/stage files and template.json.

## 1. Commands and their last lines (measured)

| command | last line(s) |
|---|---|
| `node scripts/check-golden.mjs` | self-tests all `ok` (number gluing, banks, reading floor, cue room); exit 0 |
| `node scripts/check-golden.mjs faceless-test` | `1 figures (0 stats)` `5.9s auto 6,2%`; `1 bank mentions` `8.2s ANZ`; `FLAG ... foreground.webm is missing`; exit 0 |
| `node scripts/check-contrast.mjs` | `contrast ok (35 design(s))`: none of the six is listed |
| `node scripts/check-text-size.mjs` (report only, floor is Daniel's) | `bigdigit: 1 under 30px index.tsx:353=25` · `flash: 2 Compare.tsx:71=28 Stage.tsx:335=26` · `gauge: 3 Readouts.tsx:86=20 Stage.tsx:107=27 Stage.tsx:190=20` · `pulse: 3 Beats.tsx:73=26 Cues.tsx:260=28 index.tsx:236=24` · `ticker: 4 Board.tsx:318=28 Board.tsx:329=28 Stage.tsx:114=28 index.tsx:313=28` · `scale: 7 Captions.tsx:108=28 Captions.tsx:164=24 Captions.tsx:176=24 Captions.tsx:184=18 Stage.tsx:191=22 Stage.tsx:258=27 Stage.tsx:305=24` |
| `node scripts/check-selector.mjs` | `selector ok` |
| `node scripts/promote-design.mjs <id> --dry-run` × 6 | each one: `note Mode A (_test-cards) skipped: facePolicy "faceless" forbids it`, then `FAIL still B: faceless-test frame 400 did not render: at readFile (...)`, then `promote <id>: NOT promoted, 1 failed check(s)` |

What the promote dry-runs prove: a failure returns early, and lint, registration, template.json fields, `copy` (every hard-coded string is listed), the RG 234 scan, theme-only colours and contrast all run before the stills (promote-design.mjs:145-245). The only FAIL was the still, so **all six passed lint, copy, RG 234, colours and contrast**. The still failure comes from the sandbox (no font), not from a design.

Extra measurements (scratch scripts, nothing in the repo):
- **Real font metrics.** I used `opentype.js` with `public/fonts/BeVietnamPro-*.ttf` and greedy word wrap at each design's caption font size, weight and width. The samples were the longest real `subtitles` in `public/videos/*/edit.json` (110, 115, 117 chars), one 136-char English line and two 60-char Vietnamese lines (60 = template.json `maxChars.vi`). Browser wrapping can differ by a word. Treat these figures as measured geometry, not a render.
- **faceless-test spans.** Taken from the check-golden exports (`reelOf`, `figuresOf`, `lenderMentionsOf`): figure `6,2%` runs frames 176→254 and `ANZ` runs 247→322 (30 fps). They overlap for 7 frames.
- **Chapter titles.** All 68 fixture chapter titles need ≤ 2.5 s at READING 15 chars/s (`PHẦN n ` included). This matters for the fixed-length chapter plates below.

## 2. What does not apply to these six, and why

- **Rule 3b FACE and the `Behind` / `cueRoom` contract.** All six are `facePolicy: "faceless"`. `select-template.mjs:69-70` never offers them for an on-camera video, and promote skips Mode A ("facePolicy faceless forbids it"). None exports `Behind` or sets `cueRoom`, which is correct for designs with no presenter. The part of 3b that still applies is "two elements that can be up at the same time must have their own places". Most findings below fall under it.
- **Rule 4.** All six draw only through `PacedVideo` with `foreground` and `backdrop="none"` over their own backdrop. No raw room is ever shown: compliant from the code. One core observation, not a design fault: none of the six is in `QUICK_FALLBACK` (`MortgageReel.tsx:87`). If someone set `"background": "vignette"` on a faceless edit.json, PacedVideo would play source.mp4's picture over these backdrops. Unverified: needs a render.

## 3. Contract (all six)

| design | Cover | Talk → PacedVideo + foreground | Overlay | Outro | chapterTransition | copy | verdict |
|---|---|---|---|---|---|---|---|
| bigdigit | index.tsx:72 | index.tsx:160-175 | :373 | classic | core | :407-421 | ok |
| flash | index.tsx:68 | index.tsx:168-183 | :222 | classic | core | :264-279 | ok |
| gauge | index.tsx:60 | index.tsx:166-181 | :269 | classic | core | :287-296 | ok |
| pulse | index.tsx:79 | index.tsx:173-191 | :377 | classic | core | :405-414 | ok |
| ticker | index.tsx:71 | index.tsx:181-193 | :334 | classic | core | :375-393 | ok |
| scale | index.tsx:48 | index.tsx:158-173 | :177 | classic | core | :214-229 | ok |

All six render `<LogoMark talkFrames/>` in the Overlay. All six use `PagedCaptions` + `CaptionZone` + `emphasised`. All six take colours from `brand` (promote colour check passed). All six have `minHoldMs: 1500`, which equals `READING.minNumberHoldMs`.

## 4. Per design

Rows: `rule | file:line | what breaks | how you know`. **M** = measured (a command, a font-metric calculation or a fixture span). **C** = proven by reading the code (deterministic). **I** = inferred: it happens only when the reel has a certain shape, and needs a render or a fixture to confirm.

### ticker: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b own places (worst in the group) | ticker/Stage.tsx:313-362, StageBox :42-72 | The stage has **no scheduler**. Every figure board and every bank quote mounts on the same `STAGE` box at its own time, with no check against each other, the board cues (`BoardCueTrack`, Cues.tsx:406) or the classic panels (MotionTrack at `STAGE.top - 110`, index.tsx:352-357). A figure and a bank named close together draw on top of each other. So does a figure inside a points/compare cue, or a board cue said during the hook. | **M**+**C**: on faceless-test the `6,2%` board (frames 176-254) and the `ANZ` quote (247-322) are both mounted in the same box for 7 frames. The other five designs move ANZ to 254 (their WAIT logic). |
| 3c cover logo place | ticker/index.tsx:85-97 | The cover logo is top-centre (`left: 50%`). Rule 3c says the Cover keeps its logo "at the same size and place" as LogoMark (top-right inside SAFE). | **C** |
| 3 constants not literals | ticker/index.tsx:96 | `height: 120` instead of `LOGO_HEIGHT`. | **C** (grep) |
| 5 measure after font | ticker/index.tsx:75 | The Cover calls `fitText` with no `useFontReady`/`reelFontReady`, so the title size is measured on the fallback font. Every other ticker measurement waits for the font (Board.tsx:269, Cues.tsx:411). | **C** |
| 3b captions vs stage | ticker/index.tsx:35, :202 → faceless/Stage.tsx:59-76 | The caption "busy" level comes from the **faceless** design's `busyFrames`, which uses unshifted figure spans. ticker moves a figure said under the hook to frame 105 with `max(45, frames - shift)` (Stage.tsx:320-330), which can end later than the original span. In that tail the captions rise back to the big on-stage size (`IDLE_BOTTOM` 990, 78 px) while the figure board is still up. | **I** (needs a reel with a hook and a figure said in its last 1.5 s) |
| 5b reading time | ticker/Stage.tsx:134 | During the hook only the latest `mini` figure shows. An earlier mini is replaced as soon as the next one starts, possibly before its reading time. | **I** |
| logic | ticker/Stage.tsx:311 | `MIN_HOLD = 45 // READING.minNumberHoldMs at 30 fps` is a literal, not derived from `READING` and `fps`. | **C** |

### gauge: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 1 + 3b | gauge/Dial.tsx:26 `CHIP_TOP = 600`; index.tsx:56 `PANEL_OFFSET = 600 - 110`; Scenes.tsx:69-72, :133; index.tsx:271-272 | Classic-cue spans count as "taken" (Scenes.tsx:72), so a figure or bank said while a classic panel is up becomes a chip. The chip sits at y 600, at SAFE.left or SAFE.right. The classic Panel spans SAFE.left→SAFE.right from top 110 + 490 = 600 (classic/Infographics.tsx:39-43). Overlay draws `Stage` (chips) **before** `ClassicCues`, so the panel paints over the chip and that figure is not seen. | **C** (geometry and paint order) |
| 3b chips | gauge/Readouts.tsx:127-180 | All figure chips take one spot on the right and all bank chips one spot on the left. There is no lane or trim, so two chips up at once overlap. | **I** |
| 3c cover logo place | gauge/index.tsx:102-115 | The cover logo is top-centre. | **C** |
| 3b EN vs VI captions / maxChars | gauge/Stage.tsx:20 (`CAPTION_BOTTOM 1378`), :103-118 (EN 27 px) | A 136-char English line wraps to 3 lines. Its top is at 1359, so it overlaps the Vietnamese caption's bottom (1378) by **19 px**. `maxChars.en: 140` allows such a line. Lines of 110-117 chars wrap to 2 lines and clear by 16 px. | **M** (font metrics) |
| 5 reading time (INFO) | gauge/Stage.tsx:211 | The chapter plate is fixed at 2.5 s and never asks `readingMs`. Every current fixture title fits (68/68), so this is latent. | **M** |

### pulse: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b own places | pulse/Plan.ts:65-66, index.tsx:388-389 | An own cue (change/trend) that starts under the hook gets `from = max(a, min(105, b - 60))`. Nothing checks that against the hook span. A cue that starts before frame 105 and ends before frame 165 is drawn on the monitor **while the hook spike is still up**. | **C** (arithmetic; needs such a cue to occur) |
| 3b foot chip vs captions | pulse/Scope.tsx:26-27 (`FOOT_TOP 1160`, `CAPTION_BOTTOM 1352`), Chip.tsx:11, :17-18 (`CHIP_H 76`) | While a classic panel is up, a chip sits at 1160-1236, right-aligned to SAFE.right. A 60-char Vietnamese caption wraps to 2 lines at 54 px, with its top at **1217**. The two overlap by 19 px vertically, in the right part of the line. | **M** (vertical), **I** (horizontal: depends on the line width) |
| 3b header chips into plot | pulse/Chip.tsx:17-18, Scope.tsx:21-23 | Chips that are up together stack downward from 600 in steps of 86. The second one (686-762) already enters `PLOT.top` 740, where the current beat is drawn. | **C** (geometry), **I** (needs two chips at once) |
| 3c cover logo place | pulse/index.tsx:108-121 | The cover logo is top-centre. | **C** |
| 3b EN vs VI captions / maxChars | pulse/index.tsx:351-366 (EN 30 px) | English lines of 117 and 136 chars wrap to 3 lines. Their top is at 1338, overlapping the Vietnamese bottom (1352) by **15 px**. | **M** |
| 5 reading time (INFO) | pulse/index.tsx:258 | The chapter tag is fixed at 2.5 s. Latent: every current title fits. | **M** |

### flash: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b captions into stage / maxChars | flash/Captions.tsx:17-18 (`sizeFor`, comment "Two lines at most"), Frame.tsx:32-34 (`STAGE.bottom 1182`, `CAPTION_BOTTOM 1384`) | The 60-char page "Người Úc trả hàng tỷ đô phí ngân hàng mỗi năm, bạn có biết k" is drawn at 50 px Black in 836 px and wraps to **3 lines**. The navy strip's top is then at 1157, **25 px into the stage card**. `maxChars.vi: 60` allows a page the component cannot hold in 2 lines. | **M** (font metrics) |
| 5b hold wins | flash/Stage.tsx:61-67 | A figure followed by a cue is cut to `next - from`. The only floor is `MIN_HOLD` 45 frames (1.5 s), not the figure's own `frames`. That floor undoes `readingFloor`'s stretch of a stat with a label. The README says "never by cutting the card early". | **C** |
| 1 / 5b own cue in hook | flash/Cues.tsx:47 | An own cue that ends inside the first 105 frames gets `from = b - 1`, so it is shown for 1 frame. Its number is also not an auto figure (`figuresOf` skips numbers a cue covers), so that number gets no visual. | **C** (needs such a cue) |
| 3b chips | flash/Stage.tsx:53-59, :333-341 | Every figure chip uses `side="left"` in the single CHIP lane, with no lane or trim. Two figure chips up at once overlap. | **I** |
| 3c cover logo place | flash/index.tsx:89-101 | The cover logo is top-**left**. | **C** |
| logic | flash/Stage.tsx:41 | `MIN_HOLD = 45` is a 30 fps literal. | **C** |
| note | flash/Captions.tsx:130-131 | The English line has `maxHeight` 81 + `overflow: hidden`, so a 3rd line would be cut silently. Every measured sample (110-136 chars) wraps to 2 lines, so this does not happen today. | **M** |
| note (rule 8, for compliance) | flash/diff.ts, template.json "change" | The change cue shows a **computed** difference chip: a number the reel never said. It is only arithmetic on the reel's own values, but the compliance reviewer should rule on it. | **C** |

### bigdigit: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 5b hold wins | bigdigit/Plan.ts:74-80 (floor :20) | A figure or bank with a cue coming is shortened to `room` (≥ 45 frames), the same pattern as flash. | **C** |
| 1 / 5b chips | bigdigit/Plan.ts:97-103 | "A newer chip ends the one before it" with `Math.max(1, next.from - c.from)`. A figure chip can therefore be cut to as little as **1 frame**. | **C** (needs two chips within a figure's span) |
| 1 own cue in hook | bigdigit/Plan.ts:45-47 | An own cue (change/trend/points/compare) said entirely inside the hook gets `from = hookEnd ≥ to` and is dropped (`continue`). Its number is not an auto figure either. | **C** (needs such a cue) |
| 3 SAFE right edge | bigdigit/Stage.tsx:91 with Paper.tsx:72-84 | `giantSize` fits a long number to the full W (906). The held push-in then scales it 1 → 1.035 from the left edge, so the right edge reaches about **x 992**, past SAFE.right 960, for the whole hold. This applies to the hook and to stat figures whose width, not the 300 px cap, sets the size. | **C**/**I** (only for width-bound numbers) |
| 3c cover logo place | bigdigit/index.tsx:91-102 (template.json says "logo tile top-left") | The cover logo is top-**left**. | **C** |
| 3b chip vs classic panel | bigdigit/Stage.tsx:158-199 (`CHIP` bottom 1150, about 145 px tall), :291-309 | A classic panel starts at y 614. A tall points panel could reach the chip's spot (y ~1005-1150). The chip is painted on top of the panel. | unverified: needs a render |
| logic | bigdigit/Plan.ts:20 | `MIN_HOLD = 45` is a 30 fps literal. | **C** |

### scale: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b chapter plate vs chip | scale/Captions.tsx:141-146 (top SAFE.top+8, maxWidth 236, title 24 px), MiniPan.tsx:30 (`CHIP_TOP 502`), :248-253 | The plate leaves about 154 px for the title. 7 of the first 8 fixture chapter titles wrap to 2-3 lines, which puts the plate's bottom at **523-552**. The chip row starts at 502, in the same top-left column. A chapter and a chip up together overlap by 21-50 px. | **M** (font metrics on real titles), **I** (needs both at once) |
| 3b EN vs VI captions / maxChars | scale/Captions.tsx:21 (`CAPTION_BOTTOM 1386`), :104-118 (EN 28 px italic) | A 136-char English line wraps to 3 lines, with its top at 1351: a **35 px** overlap with the Vietnamese caption. 2-line English clears by **1 px**. | **M** |
| 3b chips | scale/Plan.ts:365, MiniPan.tsx:248-253 | All chips sit at one spot with no lane or trim. Two up at once overlap. | **I** |
| 5 reading time (INFO) | scale/Captions.tsx:200 | The chapter plate is fixed at 2.5 s. Latent: every current title fits. | **M** |
| note (rule 8, for compliance) | scale/Plan.ts:84-96, :237-239, :280-285 | The pan tag shows a **computed** difference ("+0,75 điểm %") that the reel never said. Compliance should rule on it. | **C** |
| 3c | scale/index.tsx:88-100 | Compliant: cover logo top-right, `LOGO_HEIGHT`. | **C** |

## 5. Violations by rule number

- **Rule 1 (every figure seen):** gauge (chip hidden under the classic panel); bigdigit (chip cut to 1 frame; own cue inside the hook dropped); flash (own cue inside the hook shown for 1 frame).
- **Rule 3 (SAFE / constants):** bigdigit (push-in past SAFE.right on width-bound numbers); ticker (literal `120` for the logo).
- **Rule 3b (own places):** ticker (no stage scheduler; measured on faceless-test); gauge (chip under panel; chips stack; EN/VI 19 px); pulse (own cue over hook; foot chip vs captions; chips into plot; EN/VI 15 px); flash (VI strip 25 px into stage; figure chips stack); scale (chapter plate vs chip; EN/VI 35 px; chips stack); bigdigit (chip vs panel, unverified).
- **Rule 3c (cover logo same size and place):** bigdigit and flash (top-left); gauge, pulse and ticker (top-centre). scale complies.
- **Rule 5 (measure after font):** ticker Cover.
- **Rule 5b (hold wins / reading time):** bigdigit and flash cut figures early for a coming cue; ticker swaps mini figures. Chapter plates fixed at 2.5 s in gauge, pulse and scale: INFO, latent.
- **Logic (template.json vs components):** `maxChars.vi 60` is too long for flash; `maxChars.en 140` is too long for gauge, pulse and scale; `MIN_HOLD` hard-coded at 30 fps in bigdigit, flash and ticker.
- **Rule 2:** no violation. All six use `LenderLogo` with a neutral label ("ĐANG NHẮC TỚI" / "Ngân hàng") and brand-coloured frames, never bank colours.

**Single worst:** ticker has no stage scheduling (ticker/Stage.tsx:313-362). It is the only one of the six where figures, banks, board cues, classic panels and the hook can share the one STAGE box at once. The overlap already happens on the promote fixture faceless-test: `6,2%` and `ANZ` are both mounted for frames 247-254.

## 6. Not verified, and why

- **Every visual claim needs a still.** Renders fail in this sandbox (Google font fetch refused), and promote's still B failed for all six for the same reason. The committed `preview.png` files (540×960, faceless-test frame 120) show only idle captions and the English line. That fixture has no hook, cues, stats or chapters and only one figure and one bank, so the previews cannot confirm or rule out any finding above. In those frames the captions sit inside SAFE.
- **Rule 5b pacing is not measurable for these designs.** `scripts/check-pacing.mjs` follows a design's own plan only for `cards` (check-pacing.mjs:94, :116-117 `ponytail`). For everything else it counts "the punch-in at every cut", and on a faceless design that punch-in is applied to a fully transparent foreground, so nobody sees it. A pacing pass would over-count. Idle stretches (gauge needle wobble, pulse idle trace, scale sway, flash idle headline glint, bigdigit baseline sweep) are unverified against the 3 s rule.
- **Inferred rows.** Rows marked I depend on reel shapes the repo fixtures do not contain: cues under the hook, figures during classic panels, two chips at once. They need a purpose-built faceless fixture.
- **Font-metric rows.** Rows marked M come from greedy wrapping with opentype.js. The browser's `text-wrap: balance` does not change the line count, but kerning and hyphenation can move a word, so treat a 1 px margin (scale's 2-line English) as fragile.

## 7. What Daniel must verify

1. Rule 3c on covers: is a top-left or top-centre cover logo acceptable for faceless designs, or does "same size and place" hold as written? As written, five of the six fail.
2. Computed differences in flash (change) and scale (pan tag): are they allowed under rule 8, "a template adds no claims of its own"?
3. Once a render is possible, look at a still of ticker on faceless-test around talk frame 250 (figure + ANZ), and of gauge with a stat said during a points cue.
