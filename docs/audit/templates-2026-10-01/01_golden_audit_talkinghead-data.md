partly done

# Golden rules audit: talkinghead-data (classic, datalab, series, studio, cards, newsroom, scenario)

Auditor: golden-rules-auditor. Date 2026-10-01. Read only: no project file edited.
Sources: `docs/agents/team-ground-rules.md`, `src/designs/README.md` (rule text), `corrections.md`
entries scoped `all`, `A`, `design:classic`, `design:cards`; `src/mortgage/golden.ts` (SAFE y 420–1473
x 54–960, FACE x 250–830 y 480–1250, READING 15 chars/s, numbers >= 1500 ms, LOGO_HEIGHT 120,
HOOK_FRAMES 105), `cueRoom.ts`, `LogoMark.tsx`, `LenderLogo.tsx`, `MortgageReel.tsx` (Overlay is
mounted full-frame with no offset, line ~376; readingFloor applied to the reel at line 149).

Partly done because no still can be rendered here (Google font fetch refused, no source.mp4): every
promote-design still/preview FAIL below is the sandbox, not the design, and every "covers" or
"overlaps" claim is from code geometry unless a committed preview is cited.

## Measured (commands and their last lines)

| command | last line(s) | reading |
|---|---|---|
| `node scripts/check-golden.mjs` | all `ok`, exit 0 | core self-tests pass |
| `node scripts/check-golden.mjs ty-do` (classic) | `5 figures (4 stats)`, `0 bank mentions`, `FLAG ty-do: background: removed, but foreground.webm is missing in public`, `face hidden 0.0 s`, `classic makes room under cue panels`, `HELD frame 2237 cues[3] bars 4294 -> 4800 ms`, `38 of 163 caption pages faster than 22 chars/s (report only)`, exit 0 | rule 4 cut-out absent in this checkout (git-ignored); reading floor stretched one cue |
| `node scripts/check-contrast.mjs` | `contrast ok (35 design(s))` | notes only: classic Captions.tsx:214, Infographics.tsx:262 primary-on-accent 3.04 (large text); Cues.tsx:140, Infographics.tsx:371 see-through fills not judged |
| `node scripts/check-text-size.mjs` (report only, 30 px placeholder, Daniel's threshold) | `103 literal(s) under it in 35 design(s)` | in scope: cards 8 (min 20), series 5 (min 16), datalab 2 (LenderLabel.tsx:76 = 14), newsroom 1 (24), scenario 1 (22); classic, studio 0 |
| `node scripts/check-selector.mjs` | `selector ok` | |
| `node scripts/promote-design.mjs <id> --dry-run` | classic `NOT promoted, 12 failed`; datalab 5; series 3; studio 3; cards 1; newsroom 4; scenario 2 | every design: `FAIL still A: _test-cards frame 400 did not render` (+ `FAIL preview` except cards, which has preview.png) = sandbox. Real FAILs are colours only (below). No copy / RG 234 / lint failure in any of the seven. |
| `node scripts/check-pacing.mjs <slug>` (rule 5b, per reel) | ty-do (classic) and studio-preview (studio): `11 gap(s), 91.1 s static`, exit 2; rui-ro-ho-so-khong-trung-thuc (cards, talk 110 s, no exception): `7 gap(s), 43.2 s static`, exit 2; doi-nha (410 s) and bao-dam (251 s) cards: gaps INFO (accepted exception) | rule 5b breaks on real reels in classic, studio and short cards talks; check-pacing's generic path does not model series' sidebar fade or scenario's hook blackout (its own `ponytail` at line 116), so for those two it over-counts events |

Promote colour FAILs (rule 7, brand only), exact:
- classic: Frame.tsx:202 `rgba(255,40,80,0.8)`, `rgba(0,220,255,0.8)` (hook RGB split); Frame.tsx:254–257 `#FFE89A #8A6A1E #2E8B57 #1E5E3A #6B4E10 #CFF5DD` (MoneyRain); Outro.tsx:42 `#EEF5FB` (the shared Outro, so datalab, series, studio, newsroom, scenario, cards inherit it on screen).
- datalab: Backdrop.tsx:12 `#7FC4FF` (commented as a tint but no `// theme-exempt:` marker), Backdrop.tsx:18 `#10305C`, LenderLabel.tsx:79 `#9fb3d1`.
- series: Waves.tsx:18 `#123A66`. studio: Pieces.tsx:41 `#0B2F5E`. newsroom: Pieces.tsx:158, 198 `#EEF2F7`. scenario, cards: none.

## Verdicts

| design | verdict | why in one line |
|---|---|---|
| classic | violations | rule 3c always-on logo, stat cards / chapter / hook above SAFE, cover logo wrong size and place, rule 7 colours |
| datalab | violations | voice PiP and long-name bank badges reach into FACE in the Overlay; chapter / cue panel / figure share SAFE.top; rule 7 colours |
| series | violations | sidebar (stats, auto figures, bank logos) goes to opacity 0 during any cue; hook starts above SAFE and on the strip; rule 7 |
| studio | violations | every stat callout drawn in the Overlay inside FACE over his head; chapter mark and cover above SAFE; cover logo 78 px; rule 7 |
| cards | violations (contract, minor) + unverified | no `Behind`; `cueRoom: true` without `useCueRoom`; header chip lane 2+ leaves SAFE; 5b gaps on a 110 s talk |
| newsroom | violations | ticker and lender bar text outside SAFE x; lender bar covers the figure ticker; cover strap at y 330; rule 7 |
| scenario | violations | Behind returns null during the hook, so a figure or bank named in the first 3.5 s is not shown; SAFE literals |

All seven: unverified on screen (needs a render). Contract exports present in all: Cover, Talk (PacedVideo with `foreground`, `backdrop="none"`, own backdrop first), Overlay, Outro, chapterTransition, copy; Behind in all but cards. Rule 4 (removed or quick mode): every design draws Daniel only through PacedVideo / CoverCutOut (grep found no own `<Video>`/`<OffthreadVideo>`; the `<Audio>` hits are sfx: classic Frame.tsx:140, 313, 315, Cues.tsx:427, cards Stage.tsx:184). Covers using the recorded frame: classic, studio (allowed by name in rule 4.3), cards (`room={!foreground}`, only when there is no cut-out). Captions: all seven use PagedCaptions + CaptionZone + `emphasised`. Hook: all render `reel.edit.hook` in the first 105 frames. minHoldMs: 1500 everywhere, scenario 2000, all >= READING.minNumberHoldMs.

## Findings per design

Columns: rule | file:line | what breaks | how you know. M = measured (command output or exact arithmetic from constants in code); I = inferred (depends on a reel's content or on glyph widths; needs a render).

### classic (default design and the QUICK_FALLBACK target, so these reach every fallback video)

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3c | classic/Frame.tsx:343–354, index.tsx:106 | No `LogoMark`. Chrome draws the logo on every talk frame at top 36 / right 36, 78 px high: always on, outside SAFE, not 120 px. Matches Daniel's 25/09 correction "logo too big / always there". | M: code; Behind.tsx:7–8 states it ("its logo sits in Chrome, above SAFE") |
| 3c | classic/Frame.tsx:73–84 | Cover logo at top 60 / left 60, 96 px: not "the same size and place" as LogoMark (120 px, top-right in SAFE). | M: code |
| 3, 1 | classic/Captions.tsx:121–128 (StatCardView `top: 120, left: 90, right: 90`), mounted by index.tsx:107 | Every edit.json stat (figuresOf `source: "stat"`) is drawn at y 120 to about 420, entirely above SAFE.top 420. In the 4:5 feed crop it is cut, so the number's visual is lost there. Also drawn in the Overlay, where rule 3b says figure cards go in Behind (it does not reach FACE, so this half is the letter only). | M: Overlay mounts unshifted (MortgageReel.tsx ~376); I for the feed crop |
| 3 | classic/Captions.tsx:206–209 | Chapter banner `top: 140, left: 0`: above SAFE and left of SAFE.left; 62 px title with no right bound wraps against x 1080, past SAFE.right. | M: code |
| 3 | classic/Frame.tsx:185–190 | HookTitle `top: 150, width: 100%`: the hook is above SAFE. studio reuses it (studio/index.tsx:35, 237). | M: code |
| 3 | classic/Frame.tsx:91 | Cover title block `bottom: 190`: below SAFE.bottom. | M: code |
| 3 (borderline) | classic/index.tsx:80–96 | Voice spectrum at x 120–960, y 1640–1790, outside SAFE. A decorative waveform, not text or a chart, so I report it, not count it. | M: code |
| 3 / 3b (shared) | classic/Cues.tsx:200–204 | MotionTrack emoji at `top: 520` + panelOffset, `left/right: 60`, 240 px: the right one spans x 780–1020 (past SAFE.right 960) and both overlap FACE x by about 50 px. Emoji is not counted by cueRoom. Every design using MotionTrack inherits this. | M: arithmetic from code |
| 7 | Frame.tsx:202, 254–257; Outro.tsx:42 | off-brand colours, no theme-exempt | M: promote-design dry run |
| 5b | (reel) ty-do | 11 gaps, 91.1 s static (longest 26.4 s, 01:38.8–02:05.3) | M: check-pacing ty-do |

### datalab

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b | datalab/Figures.tsx:136–147, mounted in the Overlay (index.tsx:185) | Voice PiP circle at left 60, top 1080, 200 px: x 60–260, y 1080–1280, so x 250–260 by y 1080–1250 is inside FACE, in front of Daniel. The comment at Figures.tsx:198–199 ("it sits outside FACE") is wrong by 10 px. Also left 60 is a literal for SAFE.left. | M: arithmetic |
| 3b, 2 | datalab/LenderLabel.tsx:25–27, 71 | Bank tile in the Overlay at x 54, y 724 with `maxWidth` 156, but LenderLogo is `inline-flex` with a `nowrap` name badge (fontSize 33.6 at height 48), so it overflows its box. A file logo fits (widest about 148 px), but name-badge banks (Macquarie, Great Southern Bank, Bank of Melbourne, Bendigo Bank, Pepper Money) reach past x 250 into FACE at y 724–800. | I: glyph-width estimate from LenderLogo.tsx:14–45 and lenders.ts:53–63 |
| logic | datalab/Chapters.tsx:27–29, Figures.tsx:58–64, index.tsx:184 | Chapter card (Overlay, SAFE.top-left, 2.5 s), figure panel (Behind, SAFE.top, full width, to y 700) and MotionTrack panels (SAFE.top, full width) have no mutual exclusion. Any two up together share one place, and a Behind figure under a cue panel is hidden (rule 1). | M: no avoidance in code; I: whether a reel triggers it |
| logic (shared) | index.tsx:184 + 194 | MotionTrack panel spans SAFE x at SAFE.top while LogoMark is up (3.5–10 s, last 10 s): the logo tile lands on the panel's top-right. A cue that early is realistic (`_test-cards` has a `change` at 3.8 s). Same in series, studio, newsroom, scenario, cards. | M: no avoidance in LogoMark.tsx or MotionTrack; I: still needed |
| 7 | Backdrop.tsx:12, 18; LenderLabel.tsx:79 | off-brand colours | M: promote dry run |
| text size | LenderLabel.tsx:76 = 14 px kicker | smallest in the group (report only) | M: check-text-size |

### series

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 1, 2 | series/Sidebar.tsx:42–52, index.tsx:324–326 | `useSidebarFade` sets the whole Behind layer (stats tracker, auto-figure card, bank stack) to opacity 0 whenever any cue is on, emoji included. A stat or bank named during a cue has no visual for that time. An auto figure starts outside cues (golden.ts:298, 500 ms margin), but its 2.6 s hold can run into a cue and vanish. The change is a hard 0/1 cut. | M: code; I: per reel |
| 3 | series/index.tsx:287–293 | Hook at `top: SAFE.top - 20` (y 400, above SAFE), `left: 60`, `right: 340` literals. | M: code |
| logic | index.tsx:282 + 286–293; Strip.tsx:36–48 | The episode strip (y 420–480, amber, persistent) and the hook (from y 400, white 70 px) are up together in the first 105 frames: the hook's first line sits on the strip. | M: geometry; I: legibility needs a still |
| 3 | Sidebar.tsx:225–229, 242 | Bank stack offsets each card by `index * 12`; a name badge at height 48 is up to about 420 px wide from x 620, so it crosses SAFE.right 960. File logos fit. | I: glyph estimate |
| 3c | index.tsx:283 | LogoMark moved to SAFE.top + 70: still top-right inside SAFE, so allowed; noted only. | M |
| 7 | Waves.tsx:18 | `#123A66` | M: promote dry run |
| text size | Sidebar.tsx:154, 199 = 16 px ("ví dụ minh hoạ", auto-figure label) | report only | M |

### studio

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b | studio/index.tsx:213–222 (Overlay), Pieces.tsx:122–123, 138–139, 155–162 | Every edit.json stat is a StatCallout in the Overlay, in front of Daniel. Defaults x 260, y 570 at scale 0.8: the drawn bubble is x 260–820, y 570–818, entirely inside FACE. His hair line at this zoom is about y 534–589 (index.tsx:159–161, HEAD_Y 600), so the 110 px number sits over his hair and forehead. useCueRoom does not move him for stats. This repeats Daniel's 25/09 "charts cover my face" and 27/09 "panels cover my head" corrections. | M: arithmetic from constants |
| 3 | Pieces.tsx:214–217 | ChapterMark `left: 60, top: 160`: above SAFE. | M |
| 3 | index.tsx:237 (HookTitle from classic Frame.tsx:187) | hook at y 150, above SAFE | M |
| 3 | index.tsx:69–74, 107–112 | Cover title at top 200 (above SAFE), subtitle pill at top 1680 (below SAFE). | M |
| 3c | Pieces.tsx:50–62, used by the Cover (index.tsx:130) | Cover logo at top 28 / right 36, 78 px: not LogoMark's size or place. | M |
| 3 (borderline) | Pieces.tsx:277 | VoiceNote waveform at y 1790, x 90–990: outside SAFE, decorative. | M |
| logic | Pieces.tsx:103–108 (NameTag at SAFE.top-left, 3.5–7.5 s, Overlay) vs Behind.tsx:87–93 (auto callout at SAFE.left / SAFE.top) | An auto figure in 3.5–7.5 s shares the top-left with the name tag. | M: geometry; I: per reel |
| logic | Pieces.tsx:191 | Stat `big` at a fixed 110 px in a 700 px bubble with no fitText: "TỔNG CHI PHÍ" (a real ty-do stat) is about 818 px at 110 px, so it overflows or wraps past the 250 px bubble height. template.json maxChars vi 44 bounds labels, not this. | I: needs a still |
| 7 | Pieces.tsx:41 | `#0B2F5E` | M |
| build rule | index.tsx:50 | ROLE "Mortgage Broker · Finance Hub": English that is not a proper noun, on screen (README "Rules of the build"); in `copy`, passes RG 234. | M |
| 5b | (reel) studio-preview | 11 gaps, 91.1 s static | M: check-pacing |

### cards

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| contract | cards/index.tsx:39–56 | No `Behind`, although `facePolicy` is `face-required` (template.json). Talk passes `behind` through (Card.tsx:145), so the slot exists but is empty. Figures go on the stage above his card instead, by design. | M: code |
| contract | template.json `"cueRoom": true`; Card.tsx has no `useCueRoom` / `cueRoomStyle` | The flag stops check-golden counting cue-panel time as face-hidden, but no cut-out layer makes room. The layout makes it true in practice: panels end about y 930 (Stage.tsx:146 panelOffset = SAFE.top - 110) and his card starts at y 1012 (tokens.ts:37). But check-golden's trust rests on a layout claim, not on the mechanism the rule names. | M: code |
| 3b (letter) | tokens.ts:22–31 | Stage cards at y 590–915, x 54–960 lie inside the FACE rectangle. His face is moved to his card (hair about y 1030, chin about 1606, tokens.ts:33–36), so the rule's purpose holds: the committed `src/designs/cards/preview.png` shows the hook card and caption above his card with the face clear (one frame only). FACE in golden.ts does not model this layout. Captions in split mode sit at bottom y 1000, above his face, against the letter of "captions at y >= 1300". | M: preview.png + code |
| 3, logic | Text.tsx:102, 112–113 | Header chips at y 440, `left = 54 + lane * 334`, with no lane cap: lane 2 spans x 722–1042 (past SAFE.right) and overlaps LogoMark (x ~719–960, y 420–568) while the logo is up; lane 3+ is off-frame. Three chips at once need three figures or banks while the stage is busy. | M: arithmetic; I: per reel |
| 5b | (reel) rui-ro-ho-so-khong-trung-thuc | 7 gaps, 43.2 s static on a 110 s talk; the long-talk exception (> 180 s) does not apply | M: check-pacing exit 2 |
| text size | Scenes.tsx:276, 311, Text.tsx:159 = 20 px (8 literals under 30) | report only | M |

### newsroom

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3 | newsroom/index.tsx:356–365 + elements/NewsTicker.tsx:37–39 | The figures ticker is full width (`left: 0, width: 100%`). Its "SỐ LIỆU" label starts at x 26 and its scrolling numbers cross x 0–1080, so the text is outside SAFE x. | M: code |
| 3 | Pieces.tsx:243–262 | Lender bar is full width; the "ĐANG NHẮC TỚI" label block starts at x 0 with 26 px padding, so the text is at x 26, left of SAFE.left. | M |
| logic | Pieces.tsx:223–226 | The lender bar deliberately covers the figures ticker while a bank is named, so two elements share one place. The FigureCard (Behind) still carries rule 1. | M |
| logic | Pieces.tsx:321–324 (ChapterCard SAFE.top + 10, Overlay) vs index.tsx:312–315 (FigureCard SAFE.top, Behind) vs MotionTrack | No exclusion between chapter, figure and cue panel at SAFE.top. | M: code; I: per reel |
| 3 | Pieces.tsx:66–68 (NewsBar `top: 330`, Cover) | cover strap above SAFE | M |
| 7 | Pieces.tsx:158, 198 | `#EEF2F7` | M |

### scenario

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 1, 2 | scenario/index.tsx:269 | `if (reel.edit.hook && frame < HOOK_FRAMES) return null;` blanks the whole Behind layer for the first 105 frames: every figuresOf figure and lenderMentionsOf mention starting there is not drawn (an auto figure is 78–90 frames, so one said in the first second never shows). The hook card is a different element and does not stand in for a figure. | M: code; I: needs a reel with a number or bank in the first 3.5 s |
| 3 (literals) | Pieces.tsx:183–185, Compare.tsx:20–22, 152–153 | `left: 60` (about SAFE.left 54), `580 + 380` = 960 (SAFE.right as a literal), `right: 120`: a change to SAFE would not move them. | M |
| logic | Pieces.tsx:125 (FigureCard SAFE.top + 170, full width) vs Pieces.tsx:185 (lender slot b at SAFE.top + 170, x 580–960), both Behind | A figure and an odd-numbered bank mention up together overlap. ChapterStrip (Pieces.tsx:252–255, SAFE.top, full width, Overlay) also lands on lender slot a / compare column A, and on LogoMark in the logo windows. | M: geometry; I: per reel |
| text size | Pieces.tsx:169 = 22 px | report only | M |

## Violations by rule number (count of distinct findings)

- Contract: cards x2 (no Behind; cueRoom flag without useCueRoom).
- Rule 1: series (sidebar fade), scenario (hook blackout), classic (stat cards above SAFE, lost in the 4:5 crop; inferred). Plus the shared risk of Behind figures hidden under a cue panel.
- Rule 2: series (fade), scenario (hook blackout), datalab (badge into FACE, inferred).
- Rule 3 (outside SAFE or literals): classic x5, studio x4, newsroom x3, series x2, scenario x1, cards x1, shared MotionTrack emoji x1.
- Rule 3b (inside FACE): studio stat callouts (measured), datalab PiP (measured, 10 px), datalab badge (inferred), MotionTrack emoji (measured, all), cards (letter only).
- Rule 3c: classic always-on logo; classic cover logo; studio cover logo.
- Rule 4: no design violation. ty-do's foreground.webm is missing in this checkout (check-golden FLAG), a recording state, not a design defect.
- Rule 5 (captions): none found.
- Rule 5b: ty-do / classic and studio-preview / studio 91.1 s static; rui-ro / cards 43.2 s static. Reel and design together; a design-only fix would be ambient motion during holds.
- Rule 6 (hook): none.
- Rule 7: classic 9 colours, datalab 3, newsroom 2, series 1, studio 1 (promote FAIL), plus the shared Outro `#EEF5FB`.
- Logic (two elements, one place): datalab, series, studio, cards, newsroom, scenario, and the shared LogoMark vs MotionTrack panel collision.

## Single worst

**classic stat cards above SAFE (Captions.tsx:121–128), with the always-on Chrome logo (Frame.tsx:343–354).**

classic is the default design and the quick-mode fallback, and ty-do, the reference reel, uses it with 4 stats. Every stat card (the main visual for rule 1) sits at y 120–~420, outside the band, so the 4:5 feed crop loses it. Meanwhile a 78 px logo is on screen for the whole talk, the exact "always there" Daniel corrected on 25/09.

Close second, and the worst for his face: studio's stat callouts (Pieces.tsx:122–162), drawn in front of him at y 570–818 inside FACE.

## Not verified, and why

- Every on-screen claim, including overlaps, legibility, studio's big-number overflow, the name-badge widths and the series hook on the strip, needs a render. The sandbox browser cannot fetch the Google font every composition loads, and there is no source.mp4 (promote-design's `FAIL still A` / `FAIL preview` are this). The one visual evidence used is the committed `src/designs/cards/preview.png` (cards, one frame, date unknown).
- Rule 4 on screen: the matte (foreground.webm) is absent in this checkout. Code paths only.
- Rule 5b per design: check-pacing is per reel and models only cards' own plan. Series and scenario hide elements it counts as events, so their real static time is higher than it would report. No reel in `public/videos` uses datalab, series, newsroom or scenario, so those four have no pacing measurement.
- Inferred items depend on reel content (a cue in a logo window, three concurrent chips, a number in the first 3.5 s, a long bank name). For each I cite the code path that allows it, not a reel that shows it, except the early cue (`_test-cards` change at 3.8 s).

## What Daniel must verify

1. Whether classic's grandfathered placement (stats, chapter, hook at y 120–150, Chrome logo) is still accepted. It contradicts rules 3 and 3c as written.
2. Whether cards' relocated face is an accepted exception to FACE / "captions at y >= 1300" and to "Behind for face-required", and whether `cueRoom: true` without `useCueRoom` is acceptable there.
3. The text-size floor (30 px placeholder): datalab's 14 px bank kicker and series' 16 px notes are the smallest.
4. A still of studio at a stat (e.g. ty-do 3.9 s) to confirm the callout over his hair and forehead.
