done (from code, template.json and corrections.md only; none of the seven designs was viewed at phone size)

# Design critique: talking-head story group

Scope: editorial, explainer, chatstory, kitchen, checklist, neon, reaction (all `facePolicy: face-required`, Daniel's matted cut-out).

**What I could not see.** I made no renders: the sandbox blocks the Google font fetch, and there is no `source.mp4`. None of the seven has a `src/designs/<id>/preview.png`; every `template.json` in scope has `"preview": null`, and there are no stills under `out/`. Every look described below comes from the code. **Not viewed at phone size**, for any design. When I give a size "on a phone", I scaled 1080 px down to a phone about 390 pt wide (about ×0.36). That is my own arithmetic, not a measurement.

**Yardstick.** I used the craft rules in `editing-principles.md` (1 message first, 3 muted viewing, 4 change but let text be read, 7 guide the eye, 11 end on one action) and `corrections.md`. The two entries that count most here:
- 25/09 kitchen "text too small" is open (`noted`, no size floor set yet).
- 27/09 explainer bar contrast is `checked`, and its fix is in place at `explainer/Cues.tsx:344`.

`node scripts/check-text-size.mjs` (report only, 30 px placeholder floor) lists, for this group:
- editorial 9 hits
- checklist 4
- reaction 3
- chatstory 2
- kitchen 1
- explainer and neon 0

The tool undercounts. It cannot see sizes passed as props (for example `captionSize={22}` in `chatstory/Figures.tsx:130`), and it cannot see text drawn at a legal size and then scaled down (`explainer/Paper.tsx` `NoteBand`, ×0.7 to 0.8).

"Touches golden rules: yes" means the auditor rules on it. I suggest nothing that breaks a rule. Some findings are cases where the code already looks to be over a line, and I flag those for the auditor.

---

## Problems shared by the whole group (fix once, helps several designs)

1. **A one-line `fitText` shrinks long Vietnamese strings to tiny type.** Several places size a string so it fits on one row, with a cap but no minimum. A long string therefore gets small instead of wrapping:
   - reaction artefact headline: `reaction/Artefact.tsx:62-70`, cap 64, width 550
   - checklist hook: `checklist/index.tsx` Hook, cap 90, width 880
   - neon cover: `neon/index.tsx:105-111`, cap 88
   - editorial chapter title: `editorial/Overlay.tsx:316-322`, cap 56, `nowrap`

   For a 40 to 56 character string the result is roughly 16 to 40 px. A shared "fit to N lines with a minimum size" helper would fix all four. Effort medium. Golden rules: no.
2. **The figure (golden rule 1) is often the smallest thing on screen.** The number is the money fact (craft rule 1), but in chatstory, checklist and editorial the figure card's number is smaller than the captions, and its label is 18 to 22 px. Details are under each design.
3. **The skins repeat in two places.** Six of the seven use `classic/Outro.tsx` for the CTA, and five use the core chapter transitions. `design-space.md:63` asks consecutive videos to differ on 4 or more of the 7 skin axes. With `cta` and `transitions` the same, every story-group pick spends two axes before it starts. This is not a viewer problem inside one video, so I have not ranked it per design.
4. **Some template.json text no longer matches the code.**
   - neon `captions: "one big glowing word"`: the code draws 2 to 4 word phrases on a dark pill (`neon/Captions.tsx:1-5`).
   - neon `numbers: "gauge ring halo behind the head"`: the code puts a number above the head, with a ring only for percentages (`neon/Pieces.tsx:40-48`).
   - editorial cover "giant headline behind Daniel": in the talk this is the static word "FINANCE HUB" (`editorial/Masthead.tsx:60-85`, a ponytail).

   The selector and the improvement team read these fields. Effort small. Golden rules: no.

---

## editorial

**Identity (keep):** cream page with the navy masthead rule ("FINANCE HUB · GÓC NHÌN"); the giant two-line stacked headline cover with Daniel standing under it; amber highlighter underline on keywords; the navy figure panel sliding in from the left. It looks like a magazine, not a Reel.

**Strengths**
1. The cover is a real thumbnail. Each line is fitted to the full 900 px width (`index.tsx:84-110`) and capped at 130 px. Daniel is scaled from the bottom (0.64) so the whole headline sits above his head (`index.tsx:42-46, 139-160`).
2. Captions stay readable over his dark shirt. A paper-coloured strip at 0.92 sits behind 62 px ink (`Overlay.tsx:70-84`), like a printed pull quote, and keywords get the amber underline as they are spoken (`Overlay.tsx:92-107`).
3. Cut-out framing is careful: Daniel at 0.85 with soft side and bottom fades (`index.tsx:162-185`), room made under cue panels, and the room-mode photo resized from each panel's bottom edge (`index.tsx:198-215`).

**Improvements (ranked by effect on a viewer)**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The figure panel's kicker and label are unreadable on a phone. "CON SỐ" is 16 px and the label 20 px in pale `textDim` on navy (about 6 to 7 pt on a phone), and the number is capped at 86 px. The words saying what the number *is* are lost. Give the label 32 px or more, either by widening the band or by moving the label beside the number. | `Behind.tsx:99, 111, 124`; band only 160 px tall, `Behind.tsx:31-37` | medium | no |
| 2 | The lender sidebar sits beside his face. It starts at x 700, y ≥ 670 (`Overlay.tsx:41-47`). At 0.85 framing his face spans about x 293 to 786 and y 498 to 1152 (my arithmetic from `index.tsx:174-177`), so the sidebar's left 80 px fall on his right cheek or ear. Its 24 px grey line "được nhắc tới trong đoạn này" is also too small. | `Overlay.tsx:41-47, 236, 249, 261` | small | **yes (3b)** |
| 3 | Vietnamese marks risk colliding on the cover. The headline uses `lineHeight: 0.86` and `letterSpacing: -0.03em` at up to 130 px (`index.tsx:104-107`). Stacked marks on line 2 (ể, ỗ, ấ) can touch the descenders of line 1 (g, y, p, as in "giảm", "vay"). Not seen. Check a still with a 40-character title (`maxChars.vi: 40`) and go to about 0.98 if they touch. | `index.tsx:104-107` | small | no |
| 4 | Too little motion between beats. Daniel only drifts 1.02 over a segment (`index.tsx:225`) and has no punch-in on cuts. Craft rule 6 (hide a jump cut with a change of framing) is not met. A 1.0/1.06 alternation per cut, like chatstory's, keeps the calm look. Pacing is unverified: run `check-pacing`. | `index.tsx:221-226` | small | no |
| 5 | The masthead wordmark "FINANCE HUB" stays on screen through the talk (it only fades under a cue panel, `index.tsx:232-235`). That is a second always-on brand mark beside LogoMark, which rule 3c limits to the first and last 10 s. It is text, not the logo, so the auditor should rule. If it must go, keep the rule line and change the text to "GÓC NHÌN" only. | `Masthead.tsx:28-56`, `index.tsx:232-235` | small | **yes (3c)** |

---

## explainer

**Identity (keep):** ruled paper with a red margin; Daniel in a white-bordered, taped photo card tilted −1°; highlighter marker sweeping each word as it is spoken; sticky notes for numbers; pen-drawn rough-notation circles, boxes and underlines; "PHẦN n" chapter tabs. It is the only design where everything draws itself.

**Strengths**
1. The captions are the best muted-viewing device in the group: each word gets a marker stroke 180 ms after it is spoken, and keywords also get a blue underline (`Overlay.tsx:77-112`). The eye can follow speech without sound (craft rule 3).
2. Jump cuts are hidden on purpose. Cuts alternate between 1.0 and 1.1 framing, with a small spring punch on each (`index.tsx:67-77`), which is craft rule 6 done right.
3. The open contrast correction is properly closed. The bar hatch is now 80%/100% ink with a comment back to corrections 27/09 (`Cues.tsx:342-345`), and `check-contrast` guards it.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | Every card in the notes band is drawn at a legal size, then shrunk. `NoteBand` scales cards to ≤0.8, and to about 0.70 while the logo is up (band width 644 px, `Paper.tsx:72-79, 99-121`). The 914 px compare card ends at 0.70, so 36 px labels become about 25 px (`Cues.tsx:197, 252`). Bar labels go 34 → about 24 px (`Cues.tsx:364`), venn labels 30 → about 21 px (`Cues.tsx:522`), and the auto-figure label 42 → 34 px (`Figures.tsx:29`). This is the same problem as the open kitchen correction, and `check-text-size` cannot see it. Draw cards at band width (scale 1), or set a minimum effective size. | `Paper.tsx:99-121`, `Cues.tsx:197, 252, 364, 522` | medium | no |
| 2 | The cover shows Daniel's face in a 320 px porthole (`index.tsx:142`), about 115 pt across on a phone. That is small for a face-required story design. The arrow and red circle work hard, but the face is what stops a scroll. Grow it to about 440 px and shorten the title band if needed. | `index.tsx:142, 239-272` | small | no |
| 3 | Captions can spill onto the video card. The card ends at about y 1328 (`index.tsx:35`: top 150 + 1150 + border). Captions grow up from y 1473 at 66 px × 1.35, so two lines reach about y 1285 and three about y 1190. The marker-on-paper look then lies over his chest. Either limit pages to two lines or shorten the card by about 60 px. | `index.tsx:35`, `Overlay.tsx:60-75` | small | no |
| 4 | One data shape, two looks. A stat number is a centred 760 px sticky note (`Overlay.tsx:139, 216`); an auto number is a 440 px note pinned left (`Figures.tsx:29-33, 87-92`). A viewer sees the same thing, a number Daniel said, drawn two ways. Keep one note style and vary only the size. | `Overlay.tsx:139`, `Figures.tsx:29-33` | small | no |
| 5 | The pencil progress line (y 1860, `Overlay.tsx:421`) and the oscilloscope (y 1560 to 1760, `index.tsx:125-134`) both sit under the Reels bottom UI, outside SAFE. They are decoration, not text, so they are not a rule breach, but the viewer never sees them. Move the progress line inside SAFE, or drop both and save render cost. | `Overlay.tsx:418-430`, `index.tsx:125-134` | small | no |

---

## chatstory

**Identity (keep):** the only light template, with ice-blue paper; an iMessage question (grey, left) and Daniel's reply (blue, right) on the cover with typing dots; white rounded-box captions with an amber halo on keywords and the spoken word in blue; polaroid stickers for numbers and banks.

**Strengths**
1. A clear premise. The cover reads as "someone asked, Daniel answers" in one glance (`Cover.tsx:20-35`), and the "CÂU HỎI MINH HOẠ" label stops the question looking like a real client's (`Bubbles.tsx:130-150`).
2. Caption craft: measured rounded boxes (`ChatCaption.tsx`, `createRoundedTextBox`, real-font measure). The halo is a box-shadow so line widths never change (`ChatCaption.tsx:1-6`), and the spoken word turns brand blue.
3. Good framing rhythm. Cuts alternate 0.85 and 0.92 with a spring punch, and the layer fades at its sides and bottom (`index.tsx:43-105`).

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The number is the smallest thing on screen. The figure polaroid is 220 px wide (`Figures.tsx:105`). A stat number is capped at **40 px**, an auto number at 60 px (`Figures.tsx:81-89`), and the label is 22 px (`Figures.tsx:130`), while the captions are 62 px. The hierarchy is upside down (craft rules 1 and 7). The width is set to stay left of `FACE.left` (250). Instead, place the card in the free band above his head (he is at 0.85, hair at about y 600) at about 600 px wide, so the number can be 90 px or more. | `Figures.tsx:81-89, 102-108, 130` | medium | yes (3b placement; the auditor should confirm the band) |
| 2 | The cover title is 38 px (`Cover.tsx:32-33`). As a feed thumbnail, that is about 14 pt before the feed shrinks it further. The question is the hook, so it should be the largest text: 60 px or more, fitted to 2 or 3 lines within the 726 px column. | `Cover.tsx:24, 32-33` | small | no |
| 3 | Bank stickers are 180 px with a 40 px logo and a 22 px name caption (`Lenders.tsx:24, 120-124`). On a phone the logo is about 14 pt tall, and rule 2 is only met in letter. | `Lenders.tsx:24, 113-124` | medium | no |
| 4 | Cover lettering is small. The "CÂU HỎI MINH HOẠ" label is 26 px (`Bubbles.tsx:143`) and the compare callout 28 px (`Lenders.tsx:79`). This one is low priority, after items 1 and 2. | `Bubbles.tsx:143`, `Lenders.tsx:79` | small | no |
| 5 | `renderCost: high` for a light design. The paper shader re-seeds through frame 240 (`Backdrop.tsx:26-38`) at 0.05 opacity, which is barely visible. A static paper after frame 0 would look the same. This is not a viewer issue; it is cost only. | `Backdrop.tsx:26-38` | small | no |

---

## kitchen (open correction 25/09: "text too small")

**Identity (keep):** warm cream with pale amber liquid contours and faint grain; white chat-style message bubbles with typing dots for the cover and hook; slow fades, no punch-ins; a soft cream caption strip; a tilted white polaroid for numbers. It feels like a story told across the kitchen table.

**Strengths**
1. A distinct, calm voice that matches its intent (`story`). The hook's typing dots, then a bubble landing (`Bubbles.tsx:426-546`), are the warmest opening in the group.
2. The captions answer the correction directly: 70 px, the largest caption in the group, on a cream strip at 0.9 so warm grey stays readable over his shirt (`Captions.tsx:22-41`).
3. The figure polaroid was laid out as one row to stay above his head (`Pieces.tsx:23-30`), with a 36 px label marked "readable on a phone (Daniel, 27/09/2026)" (`Pieces.tsx:88`). That earlier lesson was applied.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The open correction is still open around the captions. The bank tag's "Ngân hàng ·" is 26 px warm grey `#8C8271` on white (`Pieces.tsx:129`), with roughly 3.6:1 contrast (my estimate, unverified) and about 9 pt on a phone. The chapter title is 48 px (`Pieces.tsx:161`), the hook subline 40 px (`Bubbles.tsx:540`), the cover subtitle 40 px (`index.tsx:125`) and the polaroid number ≤88 px. Next to 70 px captions, every bit of design text reads as secondary. Suggested floor for this design: 44 px secondary, 56 px titles, label colour `slate` or darker. It needs Daniel's floor (corrections 25/09). | `Pieces.tsx:129, 161`, `Bubbles.tsx:540`, `index.tsx:125` | small | no |
| 2 | Hook bubbles overlap when the main line wraps. The subline sits at a fixed `top + 150` (`Bubbles.tsx:535`). The main bubble is 64 px × 1.28 plus 44 px padding, so one line is about 126 px tall, two lines about 208 px. Any hook over about 20 characters (`maxChars.vi: 48`) wraps inside the 740 px bubble and the subline lands on it. Stack the two in a flex column, as the Cover already does (`index.tsx:105-115`). | `Bubbles.tsx:519-544` | small | yes (3b "nothing overlaps") |
| 3 | Chapter card, figure polaroid and hook all anchor at (SAFE.left, SAFE.top) (`Pieces.tsx:55-56, 156-157`; `index.tsx:259`). A chapter beat while a number is up stacks two white cards. The chapter card also has no `maxWidth`, so a long title runs past SAFE.right toward the logo. Give the chapter its own place, for example bottom-left above the captions, where the bank tag sits, and add `maxWidth: SAFE.right - SAFE.left`. | `Pieces.tsx:153-172`, `index.tsx:248-256` | small | **yes (3, 3b)** |
| 4 | It may be the most static design in the repo. There are no punch-ins (by design), a 1.5% drift over each segment (`index.tsx:171-176`), fades only, and `minHoldMs: 3000`. Daniel's "too static" correction (25/09, rule 5b) applies. Keep the slowness, but add one gentle change per beat, for example a 3% slow push-in that resets on every cut. That changes framing (craft rule 6) without punching. Unverified: run `check-pacing`. | `index.tsx:171-176`, `template.json` `minHoldMs` | small | yes (5b, measured by check-pacing) |
| 5 | The 8-frame amber multiply wash on chapters at 0.3 peak (`Pieces.tsx:142-152`) is likely invisible at phone size on cream. Either commit to it (a longer and stronger wash) or drop it. Not seen. | `Pieces.tsx:142-152` | small | no |

---

## checklist

**Identity (keep):** notebook paper; a left column of numbered step cards with a k/N progress bar; the current step in an amber border; finished steps ticked in green (not struck through, `StepColumn.tsx` comment at the done tick); Daniel bottom-right at 0.6. It is the clearest "process" grammar in the repo.

**Strengths**
1. Strong orientation. The viewer always knows where they are: the progress bar, the current card highlighted, done cards at 0.55 and future cards at 0.35 (`StepColumn.tsx` StepCard `opacity`).
2. Grammar consistency is good. Figures and banks appear *inside* the current step card (`StepColumn.tsx:1-4`), so a number always sits in the same place.
3. Cover: up to 110 px title fitted to 3 balanced lines (`index.tsx` `coverLines`, `COVER_TITLE_WIDTH` 600), with an empty progress bar that promises a list.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The most "too small" design in the group. Step titles are 28 px (`StepColumn.tsx:265`), the figure number ≤38 px (`StepColumn.tsx:76-84`), the figure label 18 px, "ví dụ minh hoạ" 14 px (`StepColumn.tsx:119, 131`) and step numbers 22 px (`StepColumn.tsx:239`). On a phone that is about 10, 14, 6.5 and 5 pt. The column is 482 px wide (`ColumnCues.tsx:40`), so there is room. Show only the current card full size (title 48 px or more, number 72 px or more) and collapse the others to number chips. | `StepColumn.tsx:76-131, 239, 265` | medium | no |
| 2 | The 14 px "ví dụ minh hoạ" is an illustrative-example marker. At 14 px it marks nothing on a phone. If it exists for compliance it must be readable; that is for the auditor and compliance to rule. | `StepColumn.tsx:124-136` | small | **yes (8)** |
| 3 | Daniel is small. A 0.6 cut-out bottom-right (`index.tsx` `SCALE = 0.6`) makes his face about 125 pt wide on a phone, and his face is the design's required anchor. Try 0.68 to 0.7, moving the column cue room to suit. | `index.tsx` `SCALE`, `framing()` | medium | no |
| 4 | The hook number can be smaller than the captions. It is `fitText` on one line within 880 px, capped at 90 (Hook in `index.tsx`), so a 36-character hook (`maxChars.vi.hook: 36`) lands at about 40 px, smaller than the 66 px captions. Allow two lines with a 72 px minimum. | `index.tsx` Hook `size` | small | no |
| 5 | Future steps at 0.35 opacity on cream are probably too faint to read on a phone. They preview the list, so they should be readable or not shown at all. Not seen. | `StepColumn.tsx` StepCard `opacity` | small | no |

---

## neon

**Identity (keep):** a dark navy-and-blue rotating starburst with drifting amber sparks; a voice-driven glowing audio ring behind Daniel; cream text with an amber neon glow and a flicker-on; ring chapter cards; star-wipe transitions. It is the fastest, loudest design, meant for "3 điều cần biết".

**Strengths**
1. The energy matches the intent (`process`, `warn`). The spring punch on every cut (`index.tsx` Talk, 1.06 → 1), flicker-on titles (`NeonTitle.tsx:24`) and the voice ring give it constant life within the rules.
2. The captions are readable for a dark design: 72 px, weight 900, on a navy pill at about 62%, with the spoken word popping in amber (`Captions.tsx:21-80`).
3. The figure rule is thoughtful. A ring appears only for percentages, filled to the value ("a ring always filling to 100% said nothing", `Pieces.tsx:40-48`), and the number (up to 120 px) sits above his head.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The chapter card is drawn over his head. A 200 px ring centred at x 540 from y 460, plus a title of up to 64 px below it (about y 686 to 780) (`Pieces.tsx:255-322`), sits in the Overlay. `useCueRoom` only reacts to cues (`cueRoom.ts:21-35`), so Daniel does not move. For 2.5 s per chapter it covers his hair and forehead (hair at about y 600 at full scale). This repeats Daniel's 27/09 correction "panels cover my head". Make the chapter card full-screen (a star-wipe interstitial) or put it in the band above SAFE.top + 180. | `Pieces.tsx:255-322`, `index.tsx` chapters in Overlay | medium | **yes (3b)** |
| 2 | Glow can eat legibility. Cream `#FFF4DA` letters carry a white 6 px plus an amber 14 to 30 px plus a 28 to 60 px halo (`NeonTitle.tsx:25, 39`) over a blue starburst with sparks. On a phone, thin Vietnamese marks (dấu hỏi, dấu ngã) can bloom into the glow. Cut the inner white halo and set the outer glow to about 18 px for text under 80 px. Not seen. | `NeonTitle.tsx:25-39`, `Captions.tsx:74-76` | small | no |
| 3 | The hook size is guessed from length (`big.length > 10 ? 96 : 130`, `index.tsx` Hook) with no measuring. It starts at `scale(1.3)` with no `transformOrigin` limit, so a 24-character hook wraps to 2 lines and is briefly about 1180 px wide, past SAFE. Use `fitText` over 2 lines and set the origin. | `index.tsx:183-200` | small | yes (3, briefly) |
| 4 | The template.json text has drifted from the code (see the shared section): "one big glowing word" versus a 2 to 4 word pill. Decide which is the identity. The pill reads better for Vietnamese syllable tokens (`Captions.tsx:1-5` explains why). | `template.json` `skinAxes.captions`, `grammar.numbers` | small | no |
| 5 | The cover title is fitted to one line, capped at 88 (`index.tsx:105-111`). A cover title is not bound by the 24-character hook limit, so a 40-character title drops to about 38 px. Fit to 2 or 3 lines with a 64 px minimum. | `index.tsx:105-111` | small | no |

---

## reaction

**Identity (keep):** a navy desk; a tilted white "artefact" card (headline highlighted in amber, grey paper lines) filling the top-left; Daniel cut out bottom-right at 62% in front of it; white stroked captions left-aligned; a blue "NGHĨA LÀ" so-what card breaking out of the artefact's bottom edge. It works like a green-screen news reaction.

**Strengths**
1. Clear staging for `news`. What he reacts to is top-left and he is bottom-right, so the eye goes from story to face. The artefact sits behind his cut-out (`index.tsx:85-103`), the intended look.
2. "NGHĨA LÀ" ("which means") is the best message-first device in the group (craft rule 1). It appears only over Daniel's own stats, never over auto numbers (`Pieces.tsx:147-149`), with a count-up (`Pieces.tsx:117-128`).
3. Cue handling is clean. The artefact fades out while a cue panel is up and returns after (`Artefact.tsx` `cueUp`), so the two never stack.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The artefact headline, the thing he is reacting to, shrinks to tiny type for any real title. It is `fitText` on one line within 550 px, capped at 64 (`Artefact.tsx:62-70`), so a 40 to 56 character title (`maxChars.vi: 56`) lands at about 16 to 23 px. `lineHeight: 1.15` shows the intent was to wrap. Fit to 3 lines with a 52 px minimum. | `Artefact.tsx:62-70, 88-95` | small | no |
| 2 | The hook can run through the captions and out of SAFE. The hook is at top 1150, width 500, 74 px × 1.1, no fit (`Pieces.tsx:60-70`). Captions grow up from y 1473 (`Captions.tsx:38`) and run during the hook. A hook longer than about 12 characters takes 2 or more lines (about y 1150 to 1330), plus the subline, and meets a two-line caption page. A 56-character hook would end around y 1560. | `Pieces.tsx:60-104`, `Captions.tsx:38-50` | small | **yes (3, 3b)** |
| 3 | The captions are the smallest in the group: 52 px in a 500 px column (`Captions.tsx:24, 41`). About 3 words per line, so pages run to 3 or 4 lines and the eye zig-zags. Daniel's face starts at about x 565 (my arithmetic, FACE × 0.62 from the bottom-right), so the column could be about 500 px at 60 px with shorter pages. | `Captions.tsx:24, 41` | small | no |
| 4 | Chapters are nearly invisible. They show only as the artefact kicker "PHẦN n · title" at 26 px, uppercase, letter-spaced 5, grey `#7B8AA0` on white (`Artefact.tsx:75-84, 205-207`), plus a 10-frame amber wipe. On a phone that is about 9 pt, and uppercase Vietnamese (Ữ, Ả) at that size crowds its marks. Give the chapter title a moment as the artefact headline itself. | `Artefact.tsx:75-84, 200-207` | small | no |
| 5 | The grey "paper lines" (`Artefact.tsx:30-50`) say "document" but carry nothing, and the "· được nhắc" tag is 24 px grey (`Pieces.tsx:213-219`). Use the line space for one real sub-point from `reel.edit` (subtitle or first chapter), and set the tag to 32 px or more. | `Artefact.tsx:30-50`, `Pieces.tsx:213-219` | medium | no |

---

## What Daniel must verify

- Every finding above comes from code. Render the four stills per design (frames 20, 120, 400, 900, per `src/designs/README.md` "Rules of the build") at `--scale=0.5` before acting on the size, glow, diacritic and overlap points. That especially covers editorial's 0.86 line height, neon's glow and kitchen's hook overlap.
- Set the minimum text size (corrections 25/09, `check-text-size.mjs` `MIN_TEXT_PX`). The top fix in five of the seven designs depends on it. Measure effective size (literal × parent scale) or explainer will pass while being small.
- Auditor rulings needed:
  - editorial sidebar against FACE (3b)
  - editorial masthead wordmark (3c)
  - kitchen chapter/figure collision (3, 3b)
  - kitchen and reaction hook overlaps (3b)
  - neon chapter card over his head (3b)
  - neon hook overflow (3)
  - checklist 14 px "ví dụ minh hoạ" (8)
  - chatstory figure relocation (3b)
