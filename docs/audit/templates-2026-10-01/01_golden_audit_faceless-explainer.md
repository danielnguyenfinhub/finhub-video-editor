partly done

# Golden rules audit: faceless-explainer group (01/10/2026)

Scope: blueprint, faceless, isometric, journey, kinetic, orbit, paper, phoneapp, retro, whiteboard
(all `facePolicy: "faceless"`, no cut-out, no `Behind` required). Read: `docs/agents/team-ground-rules.md`,
`src/designs/README.md` (contract + golden rules, rule text read in full), `corrections.md` entries scoped
`all` (lines 37-77; no entry is scoped to any of these ten ids). Audit only: no project file was edited.

No render was possible: `promote-design --dry-run` fails "still B: faceless-test frame 400 did not render
... at readFile (@remotion/renderer/dist/assets/read-file.js:59:15)" for all ten (the font fetch the caller
described). Every claim that needs a still is marked **unverified: needs a render**.

Rule 3b's FACE box and `cueRoom` do not apply: no person is drawn (every Talk passes a fully transparent
`foreground.webm`). The part of 3b that still applies is "two elements that can be up at the same time must
have their own places".

## What I measured (commands, last lines)

| Command | Result |
|---|---|
| `node scripts/check-golden.mjs` | all `ok` (self-tests only; core, not designs) |
| `node scripts/check-golden.mjs faceless-test` | 1 figure (auto 6,2% at 5.9 s), 1 bank (ANZ at 8.2 s); "0 of 15 caption pages faster than 22 chars/s" |
| `node scripts/check-contrast.mjs` | `contrast ok (35 design(s))`; no note for any of the ten |
| `node scripts/check-text-size.mjs` (report only, 30 px placeholder) | blueprint 3 (Cues.tsx:252=28, Paper.tsx:307=20, Paper.tsx:331=19); isometric 6 (Captions.tsx:71=22, :196=28, Cues.tsx:314=22, Plaza.tsx:80=24, Plaza.tsx:126=15, Stage.tsx:392=22); journey 3 (Fork.tsx:94=24, Signs.tsx:218=22, :257=24); orbit 3 (Cues.tsx:249=24, Stage.tsx:456=26, :476=24); paper 1 (Cues.tsx:231=28); phoneapp 2 (Chips.tsx:65=28, :94=28); retro 2 (Bands.tsx:115=29, Cues.tsx:257=27); faceless, kinetic, whiteboard 0. Missed by the checker (not a literal): blueprint/Paper.tsx:349 `fontSize: title.length > 30 ? 25 : 29` |
| `node scripts/check-selector.mjs` | `selector ok` |
| `node scripts/promote-design.mjs <id> --dry-run` | 9 designs: only failure is the render (`still B`). Lint, registry, template.json fields, `copy` contains every hard-coded string, RG 234, theme colours and contrast all pass. **faceless: 8 failures** (see below) |
| `node scripts/check-pacing.mjs faceless-test / bid-explained / rba-sept-2026` | exit 2 on all three: 2, 4 and 2 gaps over 3 s (8.7 s, 17.8 s, 13.4 s static). Data-level (edit.json), design-independent; the designs' ambient motion (blueprint house trace, kinetic blocks, orbit rings) is not counted by the check |
| `node scripts/check-captions.mjs` | could not run: `ERR_MODULE_NOT_FOUND: Cannot find package 'remotion' imported from /tmp/captions-…/PagedCaptions.mjs` (sandbox resolution) |
| Scratch co-occurrence script (`figuresOf`, `lenderMentionsOf`, `outFrameOf` on the real fixtures; scratchpad only) | **rba-sept-2026** (design faceless): hook [0-3.5 s] x auto figure "2026" [0.4-3.0 s] overlap 2.60 s; auto figure "2027" [23.5-26.1 s] x compare cue [25.0-35.3 s] overlap 1.13 s; chapter "Lời khuyên" at 157.8 s of 168.2 s (inside the closing logo window). **faceless-test**: figure "6,2%" [5.9-8.5 s] x ANZ [8.2-10.7 s] overlap 0.23 s. ty-do, bid-explained: no overlaps |

## Cross-design finding (the main one)

**Rule 3b "own places": a figure, a bank logo and a cue panel share one stage with no scheduling in six
designs.** In faceless, blueprint, kinetic, paper, retro and whiteboard, `StageLayer` maps every
`figuresOf` figure and every `lenderMentionsOf` mention into the same stage box, and the cue panels
(classic `MotionTrack` with `panelOffset = STAGE.top - 110`, plus each design's own points/compare) are in
the same band. Only the hook is handled (paper, retro, whiteboard, kinetic make the figure a chip; faceless
does not). Orbit and journey handle part of it. isometric (`Plaza.tsx` `planOf`) and phoneapp (`plan.ts`
`planOf`) schedule everything. How I know: code reading (rows below) + the overlaps measured on real
fixtures above. The 1.13 s figure-over-compare overlap in rba-sept-2026 happens because `figuresOf` only
skips an auto figure that starts within 500 ms before a cue, and this one starts 1.5 s before it. What it
looks like on screen: **unverified: needs a render**.

## Per design

### faceless — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 7 (brand) | Stage.tsx:30 `#7FC4FF`, :41 `rgba(79,163,224,0.35)`, :43 `#0B2F5E` `#07172E`; index.tsx:247 same | off-brand colours, no `theme-exempt` | measured: promote-design dry-run, 6 colour FAILs |
| gate | template.json `"preview": null`, `"promoted": "2026-09-27"` | marked promoted, so the selector ranks it as proven, but it fails today's gate (8 failures incl. "FAIL preview") | measured: promote-design dry-run |
| 3b own places | Stage.tsx:291-324 (`StageLayer`), :78-108 (`StageBox` at STAGE 640-1200) | hook and a figure said during it render in the same box | measured: rba-sept-2026 (this design) hook x "2026", 2.60 s; code shows no hook handling |
| 3b own places | Stage.tsx:300-321; index.tsx:275-279 (panels at y 570+) | figure x cue panel and figure x bank logo stack in the stage | measured: rba-sept-2026 1.13 s (figure x compare); faceless-test 0.23 s (figure x ANZ, mostly the 8-frame fade) |
| 3b / 3c | Stage.tsx:353-355 (pill `maxWidth: 760` at SAFE.top+20, x 54-814) vs LogoMark tile (x ~718-960, y 420-568: LogoMark.tsx:44-47, 2000x1215 logo at 120 px plus 22 px padding each side) | a long chapter pill reaches under the logo tile in the first and last 10 s | inferred from code; a chapter in the closing window measured on rba-sept-2026 (157.8 s). Overlap itself: unverified, needs a render |
| 3c cover | index.tsx:111-123 | cover logo top-centre, not top-right; height literal `120` instead of `LOGO_HEIGHT` | code |
| 5 captions | index.tsx:161-221 | caption page is drawn in its own absolutely positioned div, not inside `<CaptionZone>` (README rule 5) | code; position stays in SAFE (left SAFE.left, right 1080-SAFE.right) |
| 4 (risk) | index.tsx:134-140 | Talk shows `source.mp4`'s picture at 55% opacity. Fine for a faceless source (stock or navy). Set by hand on an on-camera recording, it would show a tinted room (rule 4.3). Only the selector's facePolicy prevents that | inferred from code |

### blueprint — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 5b reading hold + 3b | Stage.tsx:506-520 | a figure said under the hook is pushed to frame 105, its end is kept, then floored to 1.5 s. It is shown for less than its `figuresOf` reading time and runs into the next figure in the same stage | measured on rba-sept-2026 data via this code: "2026" (11-89) is shown 105-150, but needs 78 frames; "3,6" starts at 133, so 17 frames (0.57 s) of two figures stacked |
| 3b own places | Stage.tsx:496-545; Cues.tsx:33-34 (points/compare drawn in the stage); index.tsx:381-392 | figure x cue, figure x bank logo in one `StageSheet` | code + rba-sept-2026 1.13 s figure x compare |
| 3c cover | index.tsx:179-191 | cover logo top-centre, not top-right | code |
| text size (report only) | Paper.tsx:349 | chapter title in the title block at 25/29 px; the size checker does not see it | code |

### isometric — violations (minor)

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3c cover | index.tsx:66-79 | cover logo top-centre | code |
| 3b / maxChars | Captions.tsx:33-35 (chapter slab at SAFE.top, `maxWidth: 560`, 32 px title) vs Stage.tsx:35 `CHIP_TOP = SAFE.top + 88` | a chapter title over ~25 chars wraps (maxChars vi 60 allows it). The 2.5 s slab then grows past y 508 into the chip lane, where figure and bank chips appear while the plaza is taken | inferred from code; unverified, needs a render |
| 2 (legibility, report only) | Plaza.tsx:134 `LenderLogo height={34}`, :126 label 15 px | the bank logo in the chip lane is 34 px high | code + check-text-size |
| scheduling | Plaza.tsx:149-186 `planOf` | clean: hook, cues, figures and banks get the plaza in turn, otherwise chips | code |

### journey — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b own places | Stage.tsx:370-385 (`RoadsideSign` for every mention, no check); Signs.tsx:164-230 (sign x ~460-960, y ~850-996) | figures avoid cues and banks (`placeFigures`, :317-343), but a bank named during a cue still puts its sign over the cue (points cards run CARD_LEFT to SAFE.right) | code; unverified, needs a render |
| 3c cover | index.tsx:68-79 | cover logo top-centre | code |

### kinetic — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 1 / 5b | Stage.tsx:495-509, :326-343 | a figure that starts during the hook is drawn only as a chip inside the hook's 105-frame Sequence, then never again. One said at frame 90 is on screen for 0.5 s; a stat's label is never shown | code |
| 3b own places | Stage.tsx:507-536 (`GiantNumber` and `LenderPunch` both in `StageBox`, :54); Cues.tsx:578 (panels at STAGE.top) | figure x bank logo x cue in one stage | code + rba-sept-2026 overlap (if this design were picked) |
| 5 captions | Captions.tsx:140-170 | own positioning, not `<CaptionZone>` (inside SAFE: left SAFE.left, width SAFE_W, bottom ≥ 1920-1384) | code |

### orbit — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3 constants | Cues.tsx:71 `right: 1080 - 960`, Cues.tsx:136 `maxWidth: 960 - TEXT_LEFT` | SAFE.right written as the literal 960 | grep |
| 3b own places | Stage.tsx:370-378 (`moonsOf` only looks at the hook and earlier figures), :400 (`FigureHero` at HOME 540,860, gauge R 208), :413 (`LenderDock` at HOME) | a figure during a compare (planets x 158-442 / 638-922, VS node at 540,880) or during a bank mention draws its gauge over them | code + rba-sept-2026 1.13 s figure x compare |
| 3c cover | index.tsx:120-131 | cover logo top-centre | code |

### paper — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b own places | Stage.tsx:451-495 (`StatFigure`/`AutoFigure`/`LenderTag` all in `StageBox`, :63); index.tsx:344 panels at STAGE.top; Cues.tsx:38-39 | figure x cue, figure x bank logo stack (the hook is handled with `place`) | code |

### phoneapp — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 1 / maxChars | Chips.tsx:92-100 (stat label `nowrap` + `ellipsis`, 28 px in a 282 px chip) vs template.json `maxChars.vi: 50` | a stat label over ~18 chars is cut to "…" when the figure rides as a chip | code |
| 5b reading hold | plan.ts:74-77 | an item that waits for a cue page moves `from` to the cue's end but keeps `to`, so it loses up to 15 frames of its reading time | code |
| 3b own places | plan.ts:82-90 | with both chip lanes taken, a third item reuses the lane that frees first while it is still occupied | code (needs three concurrent items) |
| 3c cover | Chrome.tsx:286-296 | cover logo top-left (`left: SAFE.left`) | code |
| scheduling | plan.ts:39-93 | otherwise clean: screen, two lanes, cue pages | code |

### retro — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b own places | Stage.tsx:374-415 (`BadgeFigure` and `LenderCoupon` both in `StageBox`, :47); index.tsx:360 panels at STAGE.top | figure x cue, figure x bank logo stack | code |
| 3c cover | index.tsx:90-102 | cover logo top-centre | code |

### whiteboard — violations

| rule | file:line | what breaks | how you know |
|---|---|---|---|
| 3b own places | Stage.tsx:453-495 (`StatFigure`/`AutoFigure`/`LenderCard` in `StageBox`, :67); index.tsx:348 panels at STAGE.top | figure x cue, figure x bank logo stack | code |

## Clean for all ten (code + checks)

Contract: Cover, Talk (renders `PacedVideo` with `foreground={foreground}` and `backdrop="none"`), Overlay,
Outro (classic), `chapterTransition` (core), `copy` (passes the promote copy/RG 234 check). Rule 1: every
design maps all of `figuresOf`, except the kinetic hook-chip truncation above. Rule 2: every mention goes
through `LenderLogo`; labels are "ĐANG NHẮC TỚI" variants; `Lender` has no colour field and nothing says
"partner". Rule 3: apart from orbit's literal 960, positions use `SAFE`; captions and the English line
end at or above `SAFE.bottom`. The committed previews (9 of 10; faceless has none) show captions and English
inside the band at frame 120. Rule 3c: every Overlay mounts `<LogoMark talkFrames>`; I found no other
always-on logo. Rule 6: the hook is in the first `HOOK_FRAMES` everywhere. Rule 7: theme check passes
except faceless; the `theme-exempt` lines (blueprint, paper, retro, whiteboard) give reasons. Contrast passes.

## Violations by rule

- 3b own places: faceless, blueprint, kinetic, orbit, paper, retro, whiteboard (stage shared), journey (bank x cue), phoneapp (third lane), isometric (chapter x chip lane, inferred)
- 1: kinetic (hook chips cut at frame 105), phoneapp (stat label ellipsis)
- 5b reading hold: blueprint (hook delay + clip), kinetic, phoneapp (late shift)
- 3 constants: orbit Cues.tsx:71, :136
- 3c cover logo place: faceless, blueprint, isometric, journey, orbit, retro (centre), phoneapp (left); faceless also uses the literal 120
- 5 CaptionZone: faceless, kinetic
- 7 colours + stale promotion: faceless

**Worst single one:** faceless, `Stage.tsx:291-324`. This design is the one the real fixture
`rba-sept-2026` uses, and the data shows the hook and the auto figure "2026" in the same box for 2.60 s,
plus a figure over the compare panel for 1.13 s. It is also marked promoted while it fails 8 promotion checks.

## Not verified, and why

- Every visual consequence of the overlaps above (how much is hidden), and the faceless ring-text width
  for long stat `big`s: unverified, needs a render. Stills fail in the sandbox (font fetch).
- `check-captions.mjs` did not run (module resolution in /tmp).
- Rule 5b against each design's own idle motion: `check-pacing` is data-only and design-independent, so
  its gaps are edit.json issues, not template findings.
- Daniel to decide: whether the cover logo has to be top-right on faceless covers, as "same size and
  place" (rule 3c) reads literally. Seven of ten centre it or put it top-left.
