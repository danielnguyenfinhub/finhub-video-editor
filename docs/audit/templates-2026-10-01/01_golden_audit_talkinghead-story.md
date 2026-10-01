partly done

# Golden rules audit: talkinghead-story (01)

Designs: editorial, explainer, chatstory, kitchen, checklist, neon, reaction.
Auditor: golden-rules-auditor. Read-only: no project file was edited.
Rule text: `src/designs/README.md` (read verbatim), `src/mortgage/golden.ts`, corrections.md entries scoped `all`, `design:kitchen`, `design:explainer`.

**Why "partly done":** no still could be made. Every promote still and preview failed with the same environment error (`_test-cards frame 120/400 did not render: at readFile …`). No preview.png is committed for any of the seven designs (`"preview": null`), and no source.mp4 exists. Every claim about how something looks is therefore a code reading or arithmetic on the code's constants, and is labelled **inferred**. Only the rows labelled **measured** come from a command.

## Commands run (last lines kept)

| command | last line / result |
|---|---|
| `node scripts/check-golden.mjs` | all unit checks `ok` (last: `ok caption page at 25 chars/s flagged`), exit 0 |
| `node scripts/check-contrast.mjs` | `contrast ok (35 design(s))`; notes: `editorial/RoomCues.tsx:329 3.04`, `checklist/ColumnCues.tsx:228 see-through fill … not judged` |
| `node scripts/check-text-size.mjs` (report only, threshold is Daniel's) | `103 literal(s) under it in 35 design(s)`; in scope: editorial 9, checklist 4, reaction 3, chatstory 2, kitchen 1, explainer 0, neon 0 |
| `node scripts/check-selector.mjs` | `selector ok` |
| `node scripts/promote-design.mjs <id> --dry-run` ×7 | all exit 1. editorial `NOT promoted, 4 failed`; explainer `13`; chatstory `10`; kitchen `16`; checklist `7`; neon `5`; reaction `5` |
| `node scripts/check-golden.mjs <slug>` for the 5 real videos on these designs | see rule 4 and 3b rows |
| `node scripts/check-pacing.mjs <slug>` (same 5) | all exit 2: chon-ngan-hang (checklist) `17 gap(s), 99.3 s static; 2 empty card(s)`; interest-in-advance (explainer) `7 gap(s), 33.0 s`; ty-do-explainer `11 gap(s), 91.1 s`; khong-tra-noi-khoan-vay (kitchen) `8 gap(s), 45.6 s`; pre-approval-tu-dong (editorial) `12 gap(s), 76.8 s` |

What the promote dry-run failures are (measured):
- Every design has **2 render failures** (preview and still A). These come from the environment, not the design.
- **Colours** (`off-brand colour … add // theme-exempt`):
  - editorial: 2 (Masthead.tsx:15 `#F7F2E7`, Overlay.tsx:79)
  - explainer: 11 (Cues.tsx:33,34,56,233; Overlay.tsx:381; Paper.tsx:16,19,40,45; index.tsx:49,249)
  - chatstory: 8
  - kitchen: 14
  - checklist: 4
  - neon: 3
  - reaction: 3
- **checklist copy:** 1 failure, `"| CueOf" is on screen but not in copy`. This is a false positive in the scanner. ColumnCues.tsx:47 is a TypeScript type union (`CueOf<"kinetic"> | CueOf<"points"> …`), not text shown on screen. It still blocks promotion.
- **explainer** has `"promoted": "2026-09-27"` ("grandfathered") but fails the gate today on 11 colours.

---

## editorial: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b | Overlay.tsx:41-47, 221-229 | The lender sidebar is an Overlay element at x 700–960, y 670 to about 900. FACE is x 250–830, y 480–1250, so x 700–830 is inside FACE, beside his cheek at the 0.85 framing. | inferred: code arithmetic (`SIDEBAR.left 700`, `top = max(590, MASTHEAD_BOTTOM 650 + 20)`) |
| 3b / logic | Overlay.tsx:326-333 vs Behind.tsx:31, 83-93 vs Overlay.tsx:414 | Three things share the y 420–580 band at SAFE.left and nothing keeps them apart: the chapter banner, the figure panel (Behind) and the MotionTrack cue panels (`panelOffset SAFE.top-110`). The hook (frames 0–105) uses the same band, so any figure that starts before 3.5 s collides with it. | inferred: same coordinates, no mutual exclusion in code |
| 3c | Masthead.tsx:54 (`FINANCE HUB`), drawn every talk frame by index.tsx:265-267 | A text wordmark is on screen for the whole talk (it fades only under cue panels). The rule says "No other always-on logo." Daniel needs to say whether a wordmark counts as a logo. | inferred: code reading |
| 4 | index.tsx:215-237, 282, 294 (room path) | With `"background": "room"`, the raw room plays while he talks, with no vignette and no removal. README rule 4.3 says it is "never shown as-is". pre-approval-tu-dong uses room mode (edit.json:206). | measured: `grep background public/videos/*/edit.json`; code: PacedVideo.tsx `if (!foreground \|\| quick) return player(shared)` adds the vignette only when `quick` |
| 5b (reading hold) | Overlay.tsx:375 | The chapter card is fixed at 2.5 s. maxChars 40 allows "PHẦN n" + 40 characters, which `readingMs` puts at about 3.1 s. Titles over about 31 characters are cut before their reading time. Core `readingFloor` does not hold chapters. | inferred: arithmetic with READING.charsPerSec 15 |
| 5b | pre-approval-tu-dong | 12 gaps, 76.8 s static (longest 11.4 s). This is edit data. The design's 1.02 drift is not counted as an event. | measured: check-pacing |
| 7 | Masthead.tsx:15, Overlay.tsx:79 | Off-theme cream colour. | measured: promote dry-run |
| info | Behind.tsx:99, 124 | The figure's kicker is 16 px and its label 20 px, the smallest text in the group. | measured: check-text-size |

Contract: met. Cover, Talk (PacedVideo with `foreground`, `behind` passed), Overlay, Behind, Outro (classic), chapterTransition and copy are all present. `useCueRoom` is in Talk and `cueRoom: true` is set. Rules 1 and 2 are met (figuresOf drawn in Behind, every mention drawn with LenderLogo, label "NGÂN HÀNG"). Cover logo is at LogoMark's size and place.

## explainer: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| contract | index.tsx:391-397, 58-64 | The design is `face-required` but exports no `Behind`, and Talk drops the `behind` prop. Every figure is drawn in the Overlay, on top of the video card. | measured: grep (no `Behind` in explainer/) |
| contract / 3b | template.json `"cueRoom": true`; no `useCueRoom` anywhere in explainer/ | The flag tells check-golden that room is made under cue panels, but nothing makes room. check-golden reports `face hidden 0.0 s` for ty-do-explainer, which has 5 non-emoji cues covering about 51.7 s (source ms). The cue cards sit in BAND, y 420 to about 900 (Paper.tsx:97-122). Arithmetic on the card framing puts his hair line at about y 606 and his eyebrows at about y 884. So the cards cover his hair and forehead down to the eyebrows. | measured: check-golden ty-do-explainer / interest-in-advance, grep; inferred: framing arithmetic (index.tsx:35, 100-118) |
| 3b | Paper.tsx:76-80, 102-122; Figures.tsx:30-33; Overlay.tsx:241 | Stat notes, automatic figures, chapter tabs, cue cards and lender logos are all Overlay elements in BAND (from y 420, x 54–698 or 54–960). That is inside the FACE rectangle. | inferred: code |
| logic | Figures.tsx:8-10 (its own ponytail), Overlay.tsx:241 | A chapter tab (BAND top-left) and an automatic figure (pinned to BAND's left end) can be up at the same time in the same place. A stat note or cue card is also centred in that band. | inferred: code plus its own comment |
| 3 | Overlay.tsx:421 | The ProgressLine sits at y 1860, x 60–1020, outside SAFE (bottom 1473, right 960), and uses literals. | inferred: code |
| 3 | index.tsx:125 | The Oscilloscope voice line is at y 1560–1760, outside SAFE. It is decorative; Daniel to say whether it counts as a "chart". | inferred: code |
| 3c | index.tsx:150-296 | The Cover has no logo. The rule says "The Cover keeps its own logo at the same size and place." | measured: grep (`Img` appears only in Outro, index.tsx:316) |
| 3 / 7 | index.tsx:316-318, 389 | The design's own Outro puts the logo at y 150–300, outside SAFE, directly on the Paper background rather than on white. BadgeRow sits at `bottom: 150`, also outside SAFE. Classic Outro keeps everything inside SAFE. | inferred: code; compared with classic/Outro.tsx:47-54 |
| 5b (reading hold) | Overlay.tsx:292 | The chapter tab is fixed at 2.6 s. maxChars 44 means "PHẦN n" + 44 characters, about 3.4 s of reading. | inferred: arithmetic |
| 5b | ty-do-explainer, interest-in-advance | 11 gaps, 91.1 s static, including a single 26.4 s gap (25.2 s outside reading time). 7 gaps, 33.0 s. | measured: check-pacing |
| 7 | 11 colour literals (listed above) | Off-theme colours, despite the "promoted" status. | measured: promote dry-run |

Rules 1 and 2 are met in substance. StatNotes draws `edit.stats` from the reel after the reading floor (MortgageReel.tsx:149), and Figures draws automatic figures and every mention. Rule 4: Talk uses the default brand backdrop. The Cover uses the recorded frame, which is allowed, but it needs the privacy check from rule 4.5.

## chatstory: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b | Bubbles.tsx:254-262 | The chapter bubble is at `right` SAFE.right and `top` SAFE.top+170 (y 590), up to 420 px wide, so x 540–960. That is inside FACE. At the 0.85 framing his hair line is at about y 600, so the bubble sits on the right side of his head for 2.5 s. | inferred: arithmetic (index.tsx:43-45, 87) |
| 3b | Bubbles.tsx:209-216 | The hook bubbles start at y 550 and span the full SAFE width; the 66 px bubble is right-aligned. They are inside FACE for the first 3.5 s. | inferred: code |
| logic | Bubbles.tsx:256 vs index.tsx:136 | The chapter bubble (y 590 and down) and MotionTrack cue panels (SAFE.top to about 930) can be up together in the same region. | inferred: code |
| logic (maxChars) | template.json maxChars vi 60 | The components cannot show 60 characters cleanly. The chapter bubble is 44 px within 420 px (about 17 characters per line), so about 4 lines, ending near y 830, deep in FACE. The hook bubble is 66 px. The polaroid label is 22 px in a 220 px card. | inferred: arithmetic |
| 5b (reading hold) | index.tsx:30 | Chapters are fixed at 2.5 s. "PHẦN n · " + 60 characters needs about 4.6 s. | inferred: arithmetic |
| 2 (edge) | Lenders.tsx:96 | `.slice(0, 2)`: a third bank named while two are up is not drawn. | inferred: code |
| 7 | Backdrop.tsx:22, 32; Bubbles.tsx:20, 21, 115, 146; ChatCaption.tsx:31 | Off-theme colours (iMessage greys). | measured: promote |

Contract: met (Behind = Figures, useCueRoom in Talk, cueRoom true, Cover logo via LogoBadge). Rules 1 and 2 are met: every figure is drawn as a polaroid in Behind at x 54–274, and lenders are drawn left of FACE at y 800 and below.

## kitchen: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 4 | RoomVideo.tsx:63-72; index.tsx:166-174 | Room mode shows the raw room while he talks, with no vignette. khong-tra-noi-khoan-vay uses it (edit.json:4 `"background": "room"`). | measured: grep; code as for editorial |
| 3b / logic | Pieces.tsx:55-56 (figure polaroid, Behind, 646 px wide), Pieces.tsx:156-157 (ChapterCard), index.tsx:259 (hook), index.tsx:230 (MotionTrack) | Four elements are anchored at SAFE.left/SAFE.top and can be up together. Nothing separates them. | inferred: code |
| 3 | Pieces.tsx:154-170 | ChapterCard has no width or maxWidth and uses 48 px text. A 48-character title (maxChars 48) is roughly 1,100 px wide and would run past SAFE.right 960. | inferred: arithmetic; needs a still |
| logic | Pieces.tsx:117 | LenderTag sits at y 1250 and is about 80 px tall, so it spans y 1250–1330. A two-line caption page (70 px) starts at about y 1268 (RoomVideo.tsx:7 comment). The tag overlaps the caption strip over x 54 to about 400. | inferred: arithmetic |
| 5b (reading hold) | index.tsx:252 | Chapter cards are 2.5 s. A 48-character title needs about 3.2 s. | inferred: arithmetic |
| 5b | khong-tra-noi-khoan-vay | 8 gaps, 45.6 s static. The template is "slowest on purpose" with no punch-ins. | measured: check-pacing |
| 7 | 14 colour literals (Backdrop, Bubbles, Captions, Pieces, index) | Warm off-theme palette. | measured: promote |

Contract: met. useCueRoom is used in both the cut-out path and the room path, and Behind is present. Rules 1 and 2 are met. The bank tag reads "Ngân hàng ·" on white.

## checklist: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| **1 + 2** | StepColumn.tsx:355 | `if (chapters.length === 0) return null;` comes before the loose-card fallback. In a checklist video with no chapters, no figure and no bank logo is ever drawn. The comment at :282 says the fallback covers "no chapters at all", but that code cannot be reached. | inferred: code reading (explicit early return) |
| **1 + 2** | StepColumn.tsx:338-351, 398; index.tsx:296 | `cueFade` sets the opacity of the whole column, figures and lender polaroids included, to 0 for every cue span, emoji cues too. figuresOf skips only automatic numbers under cues. Stats and bank mentions are not skipped, so one that lands during a cue is invisible. | inferred: code reading |
| 1 | StepColumn.tsx:365 | `activeFigureFor` uses `.find`, so only one figure per step is shown. Two overlapping stats in the same step show only one. | inferred: code |
| 3b (as written) | index.tsx:204-240 | The hook is at x 54–954, from y 420, with 90 px text, the sub line and a progress track, so it sits inside the FACE rectangle. In this design Daniel is framed on the right (face x about 700–1000, hair about y 766, index.tsx:47-77), so the hook probably ends above his head. The FACE constant does not describe this framing. | inferred: arithmetic |
| 3 | StepColumn.tsx:411 | The step column adds a card for every chapter reached, growing down from y 420. With many chapters it may pass SAFE.bottom or run into the captions. | inferred; needs a still |
| copy | ColumnCues.tsx:47 | Scanner false positive (see above). It blocks promotion. | measured: promote |
| info | StepColumn.tsx:119 (18 px), 131 (14 px "ví dụ minh hoạ") | The "illustrative" disclaimer is 14 px. | measured: check-text-size |
| 5b | chon-ngan-hang | 17 gaps, 99.3 s static; 2 empty cards, with a points card's first beat landing 5.3 s after it appears. | measured: check-pacing |
| 7 | Paper.tsx:11, 12, 26; StepColumn.tsx:132 | Off-theme colours. | measured: promote |

Contract: met (Behind, `useSideCueRoom` in Talk, cueRoom true, Cover logo). In chon-ngan-hang today (4 chapters, 1 stat at 134.2 s, no cue overlapping it, 0 banks) neither rule 1/2 bug fires. Both are latent.

## neon: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b | Pieces.tsx:245, 267-291 | The chapter card is centred at y SAFE.top+40: a 200 px ring, then the 64 px title, ending around y 770. The talk is full frame with his hair at about y 600 (HEAD_Y), so the card covers the top of his head for 2.5 s. | inferred: arithmetic |
| 3b / 3 | index.tsx:228-242 | The hook is a 96 or 130 px NeonTitle with no fitText, at SAFE.top, under a `scale(1.3)` spring. A hook that wraps to two lines reaches about y 700, over his head. The 1.3× entrance spreads it past the SAFE sides. | inferred: code |
| logic | Pieces.tsx:179-180 (lender card), 116-118 (gauge in Behind), 267 (chapter), index.tsx:274 (MotionTrack) | The lender card, gauge figure, chapter card, hook and cue panels are all anchored at SAFE.top. A lender card over a gauge number is possible. | inferred: code |
| 5 / template | template.json `"minHoldMs": 1000` | This is below `READING.minNumberHoldMs` 1500, so the manifest claims holds shorter than the core's floor. | measured: file versus golden.ts |
| copy | index.tsx:368-375 | `copy` leaves out "Daniel Nguyen", which the reused classic Outro renders (classic/Outro.tsx:108). | inferred: code |
| 3c (style) | Pieces.tsx:39 | The Cover logo uses the literal `120` instead of `LOGO_HEIGHT`. | measured: grep |
| 7 | Backdrop.tsx:78; NeonTitle.tsx:15; Pieces.tsx:311 | Off-theme colours. | measured: promote |

Contract: met. Rules 1 and 2 are met (gauge drawn in Behind and kept clear of the logo, every mention drawn as a flip card on white).

## reaction: **violations**

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| logic / 3 | Pieces.tsx:61-67 vs Captions.tsx:38-41 | The hook (y 1150, 500 px wide, 74 px text, literal `1150`) and the left-aligned captions (52 px, bottom at 1473 and growing up, about 1263 for 3 lines) share x 54–554. They overlap during frames 0–105. At maxChars 56 (about 9 characters per line at 74 px) the hook runs to about 6 lines, past SAFE.bottom. | inferred: arithmetic |
| contract | template.json `"cueRoom": true`; Talk has no `useCueRoom` (index.tsx:58-81) | The flag is set without the move it stands for. The 0.62 bottom-right framing puts his head at about y 1100–1500, below the panels (which end about 930), so the claim probably holds. | inferred: arithmetic; needs a still |
| 5b (reading hold) | Artefact.tsx:209, 221 | The chapter title shows only as the artefact's kicker, for 2.5 s. The artefact returns `null` while a cue is up, so a chapter that starts during a cue is never shown. "PHẦN n · " + 56 characters needs about 4.3 s. | inferred: code |
| 7 | Artefact.tsx:43, 81; Pieces.tsx:25 | Off-theme colours. | measured: promote |

Contract otherwise met: Behind is present and holds the artefact and SoWhat figures, and the Cover has a logo. Rules 1 and 2 are met. Figures sit left of his face, and the bank tag reads "· được nhắc" on white.

---

## Core and tooling findings (outside the designs, reported because they decide rule outcomes)

1. **Rule 4 contradiction.**
   - What the core allows: `"background": "room"` (schema.ts:252-255, MortgageReel.tsx:264-267). PacedVideo.tsx then plays source.mp4 unvignetted when `foreground` is undefined.
   - What the README says: rule 4.3 forbids it ("raw room never shown as-is … no tinted room").
   - Who uses it: 2 real videos, khong-tra-noi-khoan-vay (kitchen) and pre-approval-tu-dong (editorial).
   - What the check says: check-golden.mjs:188-192 never looks for `"room"`. It labels both videos "background: removed" and FLAGs a missing foreground.webm, which the render does not need. **Measured.** Daniel to decide which text is current.
2. **LogoMark overlaps FACE.** The 2000×1215 logo at 120 px plus 44 px padding makes a tile at x ~718–960, y 420–568. That crosses FACE (x ≤ 830, y ≥ 480). This is core geometry and every design inherits it. Inferred by arithmetic.
3. **Promote copy scanner** reads a TS generic union as on-screen text (checklist). Tool bug. Measured.
4. **check-pacing** sees only edit data and figure/mention events. It cannot credit template motion (drift, punch-ins inside a segment), so all five 5b results above describe the edit as well as the template.
5. **Text measured before the font is ready.** editorial, explainer and kitchen call `fitText` with no `reelFontReady`/`useDelayRender` gate (README rule 5 asks for one). Inferred, low risk.

## Violations by rule

| rule | designs |
|---|---|
| contract | explainer (no Behind; cueRoom without useCueRoom), reaction (cueRoom without useCueRoom) |
| 1 | checklist (2 latent bugs, 1 partial) |
| 2 | checklist (same 2 bugs), chatstory (3rd concurrent mention dropped) |
| 3 | explainer (ProgressLine, Oscilloscope, Outro), kitchen (chapter overflow), neon (hook zoom), reaction (hook past SAFE.bottom), checklist (column growth, unverified) |
| 3b | editorial (lender sidebar), explainer (whole BAND, cards over hair and forehead), chatstory (chapter, hook), neon (chapter, hook), checklist (hook, by the letter only) |
| 3b / logic (shared places) | all seven |
| 3c | explainer (no cover logo), editorial (always-on wordmark, Daniel to rule), neon (literal 120) |
| 4 | editorial and kitchen (room mode in use; core contradiction) |
| 5b reading hold | editorial, explainer, chatstory, kitchen, reaction (fixed 2.5–2.6 s chapter cards below `readingMs` at their own maxChars); neon minHoldMs 1000 |
| 5b cadence | all 5 measured videos fail check-pacing (edit-level) |
| 7 | all seven fail the theme colour gate (3 to 14 literals each); explainer Outro logo is not on white |

**Single worst:** checklist, StepColumn.tsx:355. `if (chapters.length === 0) return null;` silently removes every figure (rule 1) and every bank logo (rule 2) from any checklist video without chapters, and no check catches it. Next worst: explainer's `cueRoom: true` with no room-making. It hides about 52 s of cue cards over Daniel's hair and forehead from check-golden in ty-do-explainer.

## Not verified (needs a render)

- Every "covers his head" claim (editorial sidebar; explainer cue cards; chatstory chapter and hook; neon chapter and hook): stills at a chapter, a cue and a lender mention.
- kitchen chapter overflow, lender tag over captions; reaction hook over captions; checklist column height with 5 or more chapters.
- Room-mode privacy (rule 4.5) on khong-tra-noi-khoan-vay and pre-approval-tu-dong, and explainer's cover (it shows the recorded frame).
- The reason: the promote stills fail (`readFile` error, sandbox), no preview.png is committed, and no source.mp4 or foreground.webm is in public/.
