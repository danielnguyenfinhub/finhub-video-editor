partly done

# Golden-rules audit: faceless-data-b (receipt, calendar, timelapse, splitscreen, flipcard)

Auditor: golden-rules-auditor, 01/10/2026. Read-only; no project file edited.
Scope: faceless designs (no cut-out, no Behind). Rule 3b's FACE zone does not apply (no face);
its "two elements that can be up together have their own places" clause does.
No render was possible (the headless browser cannot fetch the Google font), so every visual claim is
either proved from code or marked "unverified: needs a render".

## How this was measured

| what | command | last lines |
|---|---|---|
| core golden self-test | `node scripts/check-golden.mjs` | all `ok`, exit 0 (core only; no per-design check) |
| per-fixture golden | `node scripts/check-golden.mjs faceless-test` | `1 figures (0 stats)`, `1 bank mentions`, `FLAG ... foreground.webm is missing`, exit 0 |
| pacing (rule 5b) | `node scripts/check-pacing.mjs faceless-test` | `2 gap(s), 8.7 s static; 0 empty card(s)` (3.7 s at 00:02.2, 5.0 s at 00:12.9), exit 2 |
| contrast | `node scripts/check-contrast.mjs` | `contrast ok (35 design(s))`, none of the five listed |
| text size (report only) | `node scripts/check-text-size.mjs` | receipt 6, calendar 4, timelapse 9, splitscreen 6, flipcard 2 literals under the 30 px placeholder |
| selector | `node scripts/check-selector.mjs` | `selector ok` |
| promote dry run (x5) | `node scripts/promote-design.mjs <id> --dry-run` | each: `FAIL still B: faceless-test frame 400 did not render ... read-file.js` / `NOT promoted, 1 failed check(s)` |

promote-design lists every failure at once (`scripts/promote-design.mjs:299`), so for all five the lint,
registration, template.json, copy (every hard-coded string listed), RG 234, theme-only colours and
contrast checks PASSED; only the still failed, which is the sandbox (no render), not the design.

Planner measurements: I bundled each design's own planner (calendar/Plan.ts `planPage`,
timelapse/Plan.ts `planOf`, splitscreen/Plan.ts `planOf`, receipt/Stage.tsx `planOf` + Cues.tsx `ownSpans`,
flipcard/Stage.tsx `stagePlan` + Cues.tsx `cueSpans`) with esbuild into the session scratchpad (not the repo)
and fed synthetic reels built with the core's `buildTimeline` + `readingFloor`, the same way
check-golden builds reels. Scenarios:
- **A** three banks named in one breath, stage otherwise free (`... là ANZ Westpac và NAB ...`):
  `lenderMentionsOf` gives ANZ 4000–6500, Westpac 4400–6900, NAB 5200–7700 ms (talk frames 120–195, 132–207, 156–231).
- **C** hook set + a `change` cue 1000–3900 ms (core need 2200 ms = 66 frames, held 2900 ms by readingFloor).
- **D** a bank named during a `change` cue (cue frames 60–240, ANZ 132–207).
- **E** a stat (need 110 frames) starting 9 frames before a classic verdict panel ends.
Frames below are talk frames at 30 fps. These are measured outputs of the design code; whether the
result looks wrong on screen is inferred from the positions in code and is unverified without a render.

Fixture limits: `faceless-test` has no hook, stats, cues or chapters, and the committed previews are
frame 120 of that fixture, so neither exercises figures, cues or banks. `_test-numbers-kit-faceless`
cannot run here (`public/recordings/rba-sept-2026/words.json` missing).

## Contract (all five)

Exports Cover, Talk (`<PacedVideo ... foreground backdrop="none">`, backdrop drawn before it), Overlay,
Outro (classic), `chapterTransition` (core), `copy`. No Behind (faceless: correct). No `cueRoom` needed
(no cut-out). `LogoMark` in every Overlay. `PagedCaptions` + `CaptionZone` + `emphasised` in every
caption layer. No `console.log`, `Interactive.*` or network fonts in the five folders (grep).
Copy and colours: measured clean by promote dry run.

---

## receipt: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 2, 5b | receipt/Stage.tsx:119-125 | "One chip at a time: a later chip cuts the earlier one short" to `max(1, next.from - p.from)` frames. Scenario A: Westpac chip 132–156 = 24 frames (0.8 s), under the 2.5 s mention and the 1.5 s number floor. Can reach 1 frame. Same path for figure chips (rule 1). | measured (A) + code |
| 5b | receipt/Cues.tsx:52-60 | An own cue (compare/change/points) starting under the hook is moved to `min(hookEnd, b-1)` but keeps its end. Scenario C: shown frames 105–117 = 12 frames (0.4 s) against a need of 66. | measured (C) |
| 5b | receipt/Stage.tsx:112-115 | A figure that waits up to WAIT=15 frames for the stage keeps its old end (`frames = max(MIN_HOLD, end - free)`), so it loses up to 0.5 s of reading time. Scenario E: 101 frames shown, need 110. | measured (E) |
| 3 | receipt/Compare.tsx:64-127 | Compare receipts grow with every row and have no height cap (points has one: Cues.tsx:192 `STAGE_H`). They rise from SLOT_Y 1166. A card with a 2-line title, 3 rows and the question is ~860 px tall, so its top reaches y≈300, above SAFE.top 420 and over the top band (chips, chapter tag, LogoMark). Row heights from Rows.tsx:122-130. | inferred from code; unverified: needs a render |
| 3c | receipt/index.tsx:187-200 | The cover logo is centred at SAFE.top. The rule says top-right, same place as LogoMark. The same pattern is in all five (classic's own cover differs too). | code |
| info | receipt/Paper.tsx:328-330 | The printer bar spans SAFE.left-24 to SAFE.right+24. It is a prop, not text, chart or logo, so allowed as backdrop. | code |

## calendar: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 2, 3b | calendar/Side.tsx:178-201 | Every lender mention draws an opaque `TabCard` at the same TAB position, with no lane or queue. Scenario A: all three overlap in time (ANZ/Westpac, ANZ/NAB, Westpac/NAB), and each later card covers the earlier one. ANZ is readable ~12 frames, Westpac ~24 frames. | measured (A) + code |
| 3b | calendar/index.tsx:291-300 with Side.tsx:76-89, Desk.tsx:30 | Sticky notes (x 722–950, y 772+) are mounted whatever else is up. The calendar shrinks aside for them (Page.tsx:310-330), but the desk cues do not: points notepad (Notepad.tsx:11, x 104–904), compare pages and MotionTrack panels (`panelOffset CAL.top-110`). A stat said during one of these lands on top of it. | inferred from code; unverified: needs a render |
| 3 | calendar/Desk.tsx:369 | The note slaps in at scale 1.35 around x≈836, so for its first frames it reaches x≈990, past SAFE.right 960. | inferred from code; unverified |
| 5b | calendar/Plan.ts:88-94 | A date figure that waits up to 15 frames keeps its end (`max(start+MIN_HOLD, fromFrame+frames)`), so it loses up to 0.5 s of reading time. This is the receipt pattern. | code |
| 3c (ask) | calendar/Page.tsx:51, 321 | A "FINANCE HUB" wordmark sits in the calendar header band whenever the idle page shows, i.e. most of the talk (see preview.png). Rule 3c: "No other always-on logo". It is text, not the logo file. Daniel to rule. | code + committed preview |
| 3c | calendar/index.tsx:82-90 | Cover logo centred, not top-right. | code |

## timelapse: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b, 2 | timelapse/Scenes.tsx:698-832 | `ChangeTitle`, `Question`, `MiniFigure` and `MiniLender` all render in one `TopBox` at (SAFE.left, TOP). A figure or bank becomes "mini" exactly when a scene holds the dial. Scenario D: ANZ mini at 132–207 during the change scene at 60–240, so the bank chip and the cue's kicker/label draw on top of each other. Scenario A: Westpac and NAB minis overlap each other. Points: the stopwatch at MINI and the title (Scenes.tsx:858-873) share that corner too. | measured (A, D) + code |
| 6 | timelapse/Plan.ts:89 + index.tsx:217-220 | An own cue under the hook that would have ≤30 frames after it keeps its own start, and `hookShow` is 0 whenever a scene is up. Scenario C: the change scene starts at frame 30, so the hook is hidden from 1.0 s instead of holding to 3.5 s. | measured (C) + code |
| 5b | timelapse/Plan.ts:146-161 | A figure that waits for the dial keeps its end. Scenario E: 101 frames, need 110. | measured (E) |
| 3 | timelapse/Scenes.tsx:885 | `right: 1080 - 960` is a SAFE.right literal, not `SAFE.right`. `left: TRACK.x0 - 64` (=54) only equals SAFE.left because two literals happen to line up (Machine.tsx:20). | code (grep) |
| 3b | timelapse/Captions.tsx:157-224 | The chapter flag is 440 px wide and grows upward from TRACK.y-30 = 1088. A long title (maxChars 60 at 30 px is ~4 lines) reaches the dial disc (CLOCK y 790, r 205) where a figure can be up. | inferred; unverified: needs a render |
| 3c | timelapse/index.tsx:121-130 | Cover logo centred, not top-right. | code |

## splitscreen: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b, 2 | splitscreen/Chip.tsx:104-118 | Chip lanes overlap each other. Centre lane spans `507±halfW`, left lane starts at SAFE.left, right lane ends at SAFE.right. Figures (halfW 170): centre 337–677 against left 54–394 (57 px) and right 620–960 (57 px). Banks (halfW 200): centre 307–707 against left 54–454 (147 px). All share `top: STAGE.top - 31`. Scenario A puts Westpac in lane 0 and NAB in lane 1 at the same time (frames 156–207). A 4th concurrent chip wraps (`lane % 3`) onto lane 0. | measured (A) + arithmetic from code |
| 3, 3c | splitscreen/index.tsx:141 | The cover logo tile sits at `top: SAFE.top - 20` (y 400), outside SAFE, and centred instead of top-right. | code |
| 5b | splitscreen/Plan.ts:80-83 | A cue clipped by the hook gets `max(toMs, from + 2 s)`. Scenario C: 60 frames, need 66 (0.2 s short). Other splitscreen holds kept their length (E: 110/110). | measured (C, E) |

## flipcard: violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b, 2 | flipcard/Stage.tsx:103-109, 486-503 | Every bank chip goes to the lane's right side, one fixed place, with no queue. Scenario A: Westpac and NAB chips overlap in time (frames 156–207), one drawn over the other. | measured (A) + code |
| 3b | flipcard/Stage.tsx:415-484 vs 486-503 | The left figure chip plus its stat label (230–~350 px card + 18 + 340 px label, so out to x≈764) and a right bank chip (from x≈546–674, depending on logo width, `LenderLogo` maxWidth = 5×64) can be up together and meet. | inferred from code; unverified: needs a render |
| 5b | flipcard/Cues.tsx:50-58 | The same hook-delay as receipt. Scenario C: own cue shown 12 frames (0.4 s), need 66. | measured (C) |
| 3c | flipcard/index.tsx:96-104 | Cover logo centred, not top-right. | code |

---

## Cross-design: rule 5b, measured vs inferred

- Measured: `check-pacing faceless-test` shows 2 gaps over 3 s (3.7 s, 5.0 s). check-pacing is design-agnostic for
  everything except `cards` (`scripts/check-pacing.mjs:94,133`), so the same result holds for all five designs.
- Inferred: check-pacing counts a "cut (punch-in)" at every segment start (`check-pacing.mjs:12`). In these faceless
  designs PacedVideo carries only the transparent voice track, so no punch-in shows. The real gaps are likely
  longer than reported; its own ponytail at line 116 names this over-count. The designs' idle motion (receipt
  paper tongue every 45 frames, Paper.tsx:297; flipcard idle card float; timelapse timecode and grid) is not
  counted either way. Unverified: needs a render or a per-design pacing hook.
- `template.json` `minHoldMs: 1500` matches each design's `MIN_HOLD = 45` frames. But the WAIT and hook-delay paths
  above can drop a held card below its `readingMs` need, which the template promise does not cover.

## maxChars vs what the components show (logic)

All five declare `maxChars: { vi: 60, en: 140 }`, and the selector applies it to hook, chapter, stat and cue texts
(`scripts/select-template.mjs:63-67`). Several single-line slots shrink text to fit with no floor, so a 60-character
chapter title prints tiny:
- receipt chapter tag: `fit(title, CHIP_W - 200 = 436, 1, 34)` (Stage.tsx:270)
- calendar tab: `lines(title, TAB.width - 220 = 420, 1, 38)` (Side.tsx:132)
- flipcard chapter: `fit1(title, CHAPTER.maxWidth - 200 = 420, 34)` (Stage.tsx:628)

Estimate (not measured; fitText needs a browser): ~0.55–0.6 em per Be Vietnam Pro Black glyph puts 60 characters
in 420–436 px at about 12–13 px. The splitscreen chapter pill wraps instead (maxWidth 500, 30 px), and the
timelapse flag wraps upward (see above). Unverified: needs a render.

## Not verified (and why)

- Every on-screen position, overlap and readability claim above marked "inferred": no still. The browser cannot
  fetch the Google font, and promote's still B failed for all five for that reason.
- Rule 4 (background): code is correct (PacedVideo with `foreground`, own backdrop), but `faceless-test` has no
  `foreground.webm` (check-golden FLAG), so no render proves it.
- Rule 6 hook on screen in the first 105 frames: proved for timelapse only by the planner (C). Others are by code only.
- Text-size literals under 30 px: reported, not judged (the floor is Daniel's).
