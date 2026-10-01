partly done: concepts written from the two 01 reports and a re-read of the cited code. Nothing could be rendered (the sandbox refuses the Google font fetch and there is no source.mp4), so every layout item is class B or C until it has a still.

# Concepts: talkinghead-data (classic, datalab, series, studio, cards, newsroom, scenario)

Creative director. Date 2026-10-01. Inputs: `01_golden_audit_talkinghead-data.md`, `01_critique_talkinghead-data.md`, `src/designs/README.md` (golden rules, locked), `src/brand/theme.ts`, `corrections.md`, `.claude/elements/CATALOG.md`, remocn index, `src/elements/`.

Every item has exactly one class:
- **A FIX-PROVABLE.** A rule break proven from code, whose correction a repo check can verify with no still.
- **B FIX-NEEDS-RENDER.** A correct fix, but its layout effect has to be seen on a still before anyone trusts it.
- **C OPTION.** A look change. Daniel picks it from stills.
- **D RULING.** A question only Daniel can answer.

None of these items bends a golden rule. A concept that needed one bent was dropped (see "Would not do").

Counts: **A 7 · B 22 · C 18 · D 6**.

## Re-checks I made (so the improver does not need to)

- Rule 7 already allows tints: "Colours from `src/brand/theme.ts` (tints/gradients of them are fine)" (README:120). The gate also accepts a line marked `// theme-exempt: <why>` (promote-design.mjs:235). There is a precedent for the same sky tint: `src/designs/ticker/Board.tsx:25`. So a marker on a real brand tint is the rule working as written, not an exemption. The non-tint colours (classic's green bills, cyan RGB split) do not get a marker. They are B4.
- datalab `Figures.tsx:139-142`: `left: 60, top: 1080, width: 200, height: 200`. With FACE `left: 250` (golden.ts:164), the PiP overlaps FACE by 10 px. The comment at :198-199 says it does not.
- scenario `Compare.tsx:21-22` and `Pieces.tsx:184-185`: `580 + 380 = 960`, which is SAFE.right. `Compare.tsx:152-153` has `right: 120`, which is `1080 - 960`. So these literals can become constants with zero pixel change.
- check-pacing's generic path counts "the punch-in at every cut" (check-pacing.mjs:11-12). datalab's Talk has no punch-in (critique, `datalab/index.tsx:150-166`), so check-pacing gives datalab events it does not draw.
- studio NameTag's role bar is `nowrap` at 34 px weight 800 (studio/Pieces.tsx:86-93). A longer Vietnamese role can reach LogoMark's tile. That is why the studio role fix is B, not A.
- The brand kit already has a Vietnamese role: `roleVi="Chuyên viên tư vấn vay"` (src/brand/BrandKitDemo.tsx:16).

## A: FIX-PROVABLE (do first; no choice needed)

Verify each one with `npm run lint`, `npx tsc --noEmit` and `node scripts/promote-design.mjs <id> --dry-run`. The colour section must stop listing the line. The sandbox still/preview FAILs stay, and they are the sandbox, not the design. Where the proof is geometry, it comes from `golden.ts` constants, as noted.

| # | design | file:line | change | proof |
|---|---|---|---|---|
| A1 | datalab | `src/designs/datalab/Backdrop.tsx:12` and `:18` | Append `// theme-exempt: tint of brand.primary (light sky)` to line 12. Append `// theme-exempt: tint between brand.background and brand.primary (vignette centre)` to line 18. Pixels do not change. | promote dry-run: no `Backdrop.tsx` colour FAIL |
| A2 | datalab | `src/designs/datalab/LenderLabel.tsx:79` | `color: "#9fb3d1"` becomes `color: brand.textDim` (`#c9d3e6`, already imported via `brand`). It is lighter on the dark backdrop, so contrast only rises. The 14 px size is a ruling (D3), not this item. | promote dry-run colours; `node scripts/check-contrast.mjs` still ok |
| A3 | series | `src/designs/series/Waves.tsx:18` | Append `// theme-exempt: tint of brand.background toward brand.primary`. | promote dry-run colours |
| A4 | studio | `src/designs/studio/Pieces.tsx:41` | Append `// theme-exempt: tint of brand.background toward brand.primary (contour band)`. | promote dry-run colours |
| A5 | newsroom, classic | `src/designs/newsroom/Pieces.tsx:158`, `:198`; `src/designs/classic/Outro.tsx:42` | Append `// theme-exempt: pale tint of brand.card for a bar track` to both newsroom lines. Append `// theme-exempt: pale tint of brand.primary under white` to the Outro gradient. Pixels do not change. This clears classic's shared Outro FAIL, which every design in the group inherits on screen. | promote dry-run colours for newsroom and classic |
| A6 | datalab | `src/designs/datalab/Figures.tsx:139-142`, `:154-155`, `:198-199` | Rule 3b, 10 px into FACE. Set `left: SAFE.left`, `width` and `height` to `FACE.left - SAFE.left - 6` (= 190), and the Oscilloscope `width`/`height` 180 to 170. The PiP then spans x 54-244, clear of FACE x 250, and its left edge is a SAFE constant. Fix the comment at :198-199 so it states the arithmetic. If Daniel picks C-datalab-2 (drop the PiP), skip this. | tsc/lint; arithmetic from golden.ts:154, :164 |
| A7 | scenario | `src/designs/scenario/Compare.tsx:21-22`, `:152-153`; `src/designs/scenario/Pieces.tsx:184-185` | Rule 3 "use the constants, never literals", with zero pixel change: `left: 60` becomes `SAFE.left + 6`; `left: 580` becomes `SAFE.right - 380`; `right: 120` becomes `1080 - SAFE.right`. | tsc/lint; values identical, so no still is needed |

Capped here on purpose. Every other rule break in the audit moves something Daniel will see. Those are B.

## B: FIX-NEEDS-RENDER (rule breaks; correct, but each needs a still at frames 20/120/400/900 before it is trusted)

Ordered by reach: shared first, then by how often a viewer meets them.

| # | design | rule | what changes (file:line) | resources reused | effort | risk |
|---|---|---|---|---|---|---|
| B1 | all 7 (shared) | 3, 3b | MotionTrack emoji `classic/Cues.tsx:200-204`: 240 px at `left/right: 60` reaches x 1020 and about 50 px into FACE. Clamp to SAFE and keep it out of FACE x. The right third (x 830-960) is only 130 px wide, so either shrink the emoji to ≤ 130 px on the right, or treat emoji as a panel cue (`isCuePanel`) so `useCueRoom` makes room. | `cueRoom.ts`, `SAFE`/`FACE` constants | medium | touches every design that mounts MotionTrack; one still per design |
| B2 | all 7 (shared) | 3b logic | LogoMark vs MotionTrack panel at SAFE.top in the first and last 10 s. Narrow the panel's right edge to the logo tile's left while the logo is up. That is the same move datalab's FigureCard already makes. | `datalab/Figures.tsx:179-205` pattern | small | panel text reflow; still at a cue under 10 s |
| B3 | classic, studio | 3, 3b | `HookTitle` (`classic/Frame.tsx:185-195`): `top: 150`, fixed 150/190 px. Move to `top: SAFE.top`, `left/right` SAFE, and size with `fitText` to 2 lines. studio imports the same component (`studio/index.tsx:237`), so one fix covers both. Depends on D1 for classic's top. | `datalab/Hook.tsx:44-52` (fitText already used there), `@remotion/layout-utils` | small | hook number gets smaller on long hooks |
| B4 | classic | 7, 3b | Money rain `Frame.tsx:254-257` (green bills, `#FFE89A #8A6A1E #6B4E10 #CFF5DD`) and RGB split `:202`. Bills use brand.primary/brand.navy, coins brand.accent/brand.highlight/brand.navy. The split uses brand.bad and brand.primary. Stop the rain above FACE.top (480). | `brand` tokens | small | the hook's mood changes; the colour pick must be seen |
| B5 | classic | 1, 3 | Stat cards `Captions.tsx:121-128` (y 120-420) into SAFE: draw them in classic's existing `Behind` at SAFE.top, with room made for his head over the stat window (same mechanism as `useCueRoom`). Only if D1 = "rules bind". | classic `Behind.tsx` (auto figures already there), `cueRoom.ts` | medium | changes the reference reel's look |
| B6 | classic | 3, 3c | Chapter banner `Captions.tsx:206-209` to SAFE (top, left, right bound). Chrome logo `Frame.tsx:343-354` replaced by `<LogoMark talkFrames/>`. Cover title `Frame.tsx:91` bottom to ≥ 1080 - SAFE.bottom. Only if D1 / D2 = "rules bind". | `LogoMark.tsx` | small | logo gone mid-video (that was Daniel's 25/09 ask) |
| B7 | datalab | 3b, 2 | Name-badge banks overflow the 156 px column into FACE (`LenderLabel.tsx:62-71`). Give the inner tile `maxWidth: TILE_MAX_WIDTH` and size the badge down for name badges instead of clipping it. Rule 2 needs the bank readable, not cut. | `LenderLogo.tsx` height prop | small | long names shrink; still with "Great Southern Bank" |
| B8 | datalab | 3b logic | Chapter card, figure panel and cue panel share SAFE.top (`Chapters.tsx:27-29`, `Figures.tsx:58-64`, `index.tsx:184`). Use one slot planner: chapter waits or a figure drops below the panel while a cue is up. | cards `Plan.ts` single-scene idea (not the file) | medium | timing shifts; check-pacing re-run |
| B9 | datalab | 5b | Punch-in on cuts: Talk ignores `index`/`seg.zoomed` (`index.tsx:150-166`), while check-pacing credits a punch at every cut. Copy studio's spring punch (`studio/index.tsx:144-149`). | studio Talk | small | the cut-out edge must stay off frame; still at a cut |
| B10 | series | 1, 2 | Sidebar to opacity 0 during any cue (`Sidebar.tsx:42-52`, `index.tsx:324-326`). Fade only for `isCuePanel` cues (not emoji), ease over 10 frames, and push an auto figure that overlaps a cue to start after it. | `isCuePanel` (golden.ts) | small | a stat said during a panel still waits; check per reel |
| B11 | series | 3, logic | Hook `index.tsx:287-293` (`top: SAFE.top - 20`, `left: 60`, `right: 340`, 70 px) lands on the strip. Put it under the strip (SAFE.top + strip height + gap), at `SAFE.left`, and fit it to 2 lines with `fitText`. This also lifts the critique's "weakest hook". | `StaggerTitle` (kept), `fitText` | small | must clear the LogoMark at SAFE.top + 70 |
| B12 | series | 3 | Bank stack `Sidebar.tsx:225-229, 242`: name badges cross SAFE.right. Cap the card width at `SAFE.right - left`, and shrink the badge. | `LenderLogo` | small | long names |
| B13 | studio | 3b | Stat callout in front of his face (`index.tsx:213-222`, `Pieces.tsx:122-162`). Keep the bubble and its pointer (identity). Extend studio's own room factor to stat windows, the way `useCueRoom` reads cues, so he eases down, and draw the bubble at SAFE.top pointing down at him. Fit `big` with `fitText` (`Pieces.tsx:191`). This repeats Daniel's 25/09 and 27/09 corrections, so it is the highest-value B in the group. | `cueRoom.ts` (CUE_SCALE, CUE_HEAD_Y, cueRoomStyle), studio `Behind.tsx` | medium | he moves on every stat; still at ty-do 3.9 s |
| B14 | studio | 3 | ChapterMark `Pieces.tsx:214-217` (top 160), cover title `index.tsx:69-74` (top 200) and subtitle pill `:107-112` (top 1680) into SAFE. The covers depend on D2. | SAFE constants | small | cover recomposes |
| B15 | studio | build rule | ROLE `index.tsx:50` "Mortgage Broker · Finance Hub" is English that is not a proper noun. Use "Tư vấn vay · Finance Hub". The brand kit's "Chuyên viên tư vấn vay" is longer and may reach the LogoMark tile in the nowrap 34 px bar. | `BrandKitDemo.tsx:16` wording | small | bar width near the logo tile; still at 4-7 s |
| B16 | cards | 3, logic | Header chips `Text.tsx:112` with no lane cap: lane 2 hits LogoMark and SAFE.right, and lane 3+ is off frame. Cap at lanes 0-1 in `Plan.ts:128-130`. A third chip waits for the first free lane (a number shown late is better than one not shown). Add a planner assertion via check-pacing's `planOf` import. | `Plan.ts` | small | rare case; seen only on a busy reel |
| B17 | cards | 5 (keywords must read) | Cover keywords gold `#C9A84C` on white, about 2.3:1 (`Card.tsx:232`). Use NAVY text with a gold underline bar. check-contrast does not see this pair today. | explainer bar fix precedent (`corrections.md`, 27/09) | small | the thumbnail changes |
| B18 | newsroom | 3 | Figures ticker (`index.tsx:356-365`) and lender bar label (`Pieces.tsx:243-262`) have text at x 0-26. Keep the full-width bar (backdrops may fill the frame) and put the text in an inner box at `SAFE.left`..`SAFE.right` with overflow hidden. Do this in newsroom's own wrapper; `src/elements/NewsTicker.tsx` stays untouched. | NewsTicker as is | small | the ticker scroll window narrows |
| B19 | newsroom | 3, 3b | Hook `index.tsx:274` fixed 140 px uppercase with maxChars 56: fit it to SAFE width and 2 lines. Cover strap `Pieces.tsx:66-68` (top 330) into SAFE (D2). | `fitText` | small | the glitch effect at a smaller size |
| B20 | newsroom, scenario | 3b logic | No exclusion at SAFE.top: newsroom chapter (`Pieces.tsx:321-324`) / FigureCard (`index.tsx:312-315`) / cue panel; scenario FigureCard (`Pieces.tsx:125`) / lender slot b (`:185`) / ChapterStrip (`:252-255`). Give each its own slot or a wait, as in B8. | B8's approach | medium | timing shifts |
| B21 | scenario | 1, 2 | `index.tsx:269` returns null for the whole Behind during the hook. Hide only the A/B idle placeholders during the hook, and start any figure or bank mention that begins inside the first 105 frames at HOOK_FRAMES (it is then shown late, not dropped). | `HOOK_FRAMES` | small | check-pacing's ponytail at :116 still over-counts scenario |
| B22 | scenario | 3, 3b | Hook `Pieces.tsx:52-77` has no horizontal bounds and fixed sizes, and can reach his face. Bound it to SAFE x and fit it to 2 lines. The compare question (`Compare.tsx:148-166`) is hidden behind his head while room is made. Move it above the columns. | `fitText` | small | the compare card regroups |

## C: OPTIONS (Daniel picks by stills; identity kept, one or two weak axes each)

Format: name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see.

### classic (keep: frozen-frame cover, karaoke captions with blue pill, navy stat cards with amber border, zoom-cuts, money rain)
- **C-classic-1 Quiet floor** | the voice spectrum (`index.tsx:80-96`) shows only during holds longer than 3 s, or is removed | focus (Craft 7: one moving thing under the captions) | MirroredSpectrum as is | none; it is decorative, outside SAFE either way | small | low | no white waveform under the captions for most of the talk
- **C-classic-2 One number grammar** | auto figures (`Behind.tsx:61-77`) drawn in the stat card's look at a smaller scale | grammar consistency (design-space.md) | `StatCardView` | none (in Behind) | medium | low | every number looks like the same kind of card

### datalab (keep: blueprint grid, number as hero, centred Daniel with the panel behind)
- **C-datalab-1 Thin stroke** | caption stroke 9 px becomes 3 px, or none, over the navy box (`Captions.tsx:42-48`) | legibility of Vietnamese marks | n/a | none | small | low | cleaner ễ/ậ/ở
- **C-datalab-2 PiP only in the hook** | the voice-oscilloscope PiP is dropped from figures (makes A6 moot) | focus on the number | Oscilloscope | none | small | low | the number owns the moment
- **C-datalab-3 Dark outro** | datalab's own Outro on the navy grid, logo still on a white tile, same contacts | end-frame continuity | `classic/Outro.tsx` structure, `DataLabBackdrop` | 7 kept (logo on white) | medium | low | no white flash in the last seconds

### series (keep: episode ring cover, amber strip, HÀNH TRÌNH sidebar memory, lender stack)
- **C-series-1 Keyword cover** | the cover lights `emphasised(words, keywords)` instead of always the last word (`index.tsx:168`) | thumbnail meaning | `emphasised` (style.ts) | none | small | low | a finance word lit, not "không"
- **C-series-2 One number look** | stats and auto figures both as sidebar rows; manifest wording changed to match | grammar | `Sidebar.tsx` rows | none | small | low | numbers stack in one list

### studio (keep: liquid-contour cover, pointing speech bubble, moving pill, circle chapter marks, voice note)
- **C-studio-1 Balanced cover title** | `fitTextOnNLines` to 3 lines with `textWrap: balance` in place of `fitText * 1.9` capped at 96 (`index.tsx:58-66`) | cover typography | `cards/Card.tsx:178-186` | none | small | low | titles break evenly
- **C-studio-2 Name tag later** | name tag starts about 1 s after the hook leaves instead of at frame 105 | rhythm of the first 7 s | n/a | 5b (adds an event, does not remove one) | small | low | hook and name do not run back to back

### cards (keep: split stage, cream cards, navy/gold, his card below, slide-away full screens)
- **C-cards-1 Bigger captions** | caption 44 px becomes 52-56 px; the box has room between y 915 and 1012 (`Text.tsx:53`) | muted legibility | n/a | none | small | low | larger caption text
- **C-cards-2 Two-line chip** | chip label at 24-26 px over two lines, no ellipsis (`Text.tsx:157-168`) | legibility | n/a | none | small | medium (chip height) | late figures keep their words
- **C-cards-3 Breathing hold** | slow push-in or a dot-grid shimmer inside a held card (rule 5b says motion inside the scene carries the change) | stillness on 110 s talks | dot grid already in cards | 5b, helps; does not count in check-pacing until D5 | medium | low | held cards move gently

### newsroom (keep: TIN NÓNG slash bar, striped studio, RGB-glitch hook, amber caption boxes, honest ticker, lender lower-third)
- **C-newsroom-1 Stat as headline** | the curated stat's number becomes the big element and the false 100% bar goes (`Pieces.tsx:142-178`) | number hierarchy | the auto figure's 64 px style (`:179-212`) | none | small | low | the main number is the biggest
- **C-newsroom-2 Still ticker** | the ticker shows only the newest figure (no scroll while captions run) | focus (one moving text stream) | NewsTicker | none | medium | low | one text stream at a time
- **C-newsroom-3 Counting hook** | pass `hook.countTo` through to a counter, as datalab does | hook energy | `datalab/Hook.tsx` count-up | none | small | low | the number counts up in the first 3 s

### scenario (keep: Nếu… thì…, split with amber divider, grapheme typing, illustrative note)
- **C-scenario-1 Level table** | A and B columns at the same top (SAFE.top + 170) and the same width (`Compare.tsx:16-23`, `Pieces.tsx:183-185`) | comparability | SAFE constants | none (both clear the logo row) | small | low | rows read straight across
- **C-scenario-2 Even fields** | both halves navy, with the A/B tint on the header only (`Backdrop.tsx:30-31`) | neutrality ("never best") | brand tokens | none | small | low | B no longer looks preferred
- **C-scenario-3 Fixed divider** | the divider holds still during a compare (`Backdrop.tsx:18-25`) | polish | n/a | 5b: removes a small motion only while a cue is up (the cue is the event) | small | low | the divider lines up with the gutter

## D: RULINGS (Daniel only)

| # | question | reading 1 and cost | reading 2 and cost |
|---|---|---|---|
| D1 | Is classic's grandfathered placement still accepted (stat cards y 120, chapter y 140, hook y 150, always-on Chrome logo)? | **Still accepted.** No change, and classic keeps its look. Cost: the 4:5 feed crop cuts every stat card on the default and QUICK_FALLBACK design, a 78 px logo stays on for the whole talk against the 25/09 correction, and classic cannot pass promotion honestly. | **Rules bind.** B3, B5, B6 go ahead. Cost: medium work, and ty-do (the reference reel) changes look. Stat cards move into the band where his head is, so room has to be made for him. |
| D2 | Do rules 3 (SAFE) and 3c bind Covers? ("The Cover keeps its own logo at the same size and place.") | **Yes.** Classic cover logo 96 px top-left becomes 120 px top-right in SAFE. Studio's cover logo 78 px becomes 120 px. Classic cover title, studio cover title and pill, and newsroom strap move into SAFE. Cost: four covers recompose; thumbnails survive the 4:5 crop. | **"Own logo" means covers may differ.** No cover change. Cost: the feed thumbnail can crop titles and straps, and the rule text keeps saying "same size and place". |
| D3 | The text-size floor (30 px placeholder, corrections.md:47) | **30 px.** In this group about 17 literals go up: cards 8, series 5, datalab 2 (14 px kicker), newsroom 1, scenario 1. Layout knock-ons are possible in chips and sidebars. | **A lower floor (for example 20 px).** Only datalab 14 and series 16 move. Cost: Daniel's "text too small" may come back on stills. |
| D4 | Is cards' relocated face an accepted exception (FACE rectangle, captions ≥ y 1300, no `Behind` while `face-required`, `"cueRoom": true` without `useCueRoom`)? | **Accept and record it** (corrections.md and a cards note in check-golden). Cost: one check special-case; no visual change. | **Hold cards to the letter.** Add an empty Behind and `useCueRoom`. Cost: code that does nothing visible, and moving his card under panels may break the split identity. |
| D5 | Rule 5b on classic/studio short talks (ty-do 91.1 s static): does ambient motion inside a held card or shot (a slow push-in) count as a design-level change? | **Yes.** check-pacing must model it per design (its generic path has no hook for it today, ponytail at :116). Then C-cards-3 and a classic/studio slow push carry 5b. Cost: a check change plus the motion. | **No, it is the reel's job.** The edit adds cues and chapters. Cost: every short talk needs more editing time, and the designs stay as they are. |
| D6 | Compliance-flavoured look calls: series' 16 px "ví dụ minh hoạ" at 60% opacity, scenario's brighter B half, newsroom's "TIN NÓNG" on an evergreen explainer | **The compliance reviewer rules.** These then become B fixes (a readable disclaimer, even fields, a neutral strap label). | **Daniel treats them as taste.** They stay C options (C-scenario-2 and so on). Cost: a possible "implies urgency / preference" finding later. |

## Order of work

1. A1-A7 (rule 7 markers and tokens, the PiP, scenario constants). One lint/tsc/promote dry-run pass.
2. Rulings D1 and D2. They decide whether B3/B5/B6/B14/B19 (covers) happen.
3. B13 (studio bubble off his face) and B1/B2 (shared MotionTrack). Highest reach, and they repeat corrections Daniel already gave.
4. B3/B11/B19/B22 (hooks fitted into SAFE). One pattern, four designs.
5. B21, B10 (figures and banks that are never drawn, or vanish), then B7/B12/B16/B18 (overflow), then B8/B20 (slot exclusion), then B4, B9, B15, B17.
6. C options by effect over effort: C-newsroom-1, C-scenario-1, C-series-1, C-cards-1, C-studio-1, C-datalab-1 (all small), then the medium ones.

## Would not do

- **English on screen for all seven** (critique "Across" row 4). It is a manifest and grammar change across the group (`languages`, `maxChars.en`), large effort, and not a weak skin axis of any one template. It belongs in a separate bilingual-overlay brief.
- **Change the shared `classic/Outro.tsx` for everyone.** It would alter six designs at once. A per-design dark Outro (C-datalab-3) is the scoped way.
- **Edit `src/elements/NewsTicker.tsx` or `src/mortgage/*`.** B18 wraps the ticker in newsroom. B13 and B1 reuse `cueRoom.ts` as is.
- **Put `theme-exempt` on the classic money-rain greens or the cyan split.** They are not brand tints, so a marker there would bend rule 7. B4 replaces them.
- **No new dependency.** Every fit uses `@remotion/layout-utils`, which is already used in datalab, cards and studio.

## What Daniel must verify

- Every B item and every C option on stills at frames 20/120/400/900 (README "Rules of the build"). None was seen here.
- The six rulings, with D1 first.
