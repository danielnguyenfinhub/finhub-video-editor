partly done (concepts only; no still could be made in this sandbox, so every look below is from code and the 01 reports)

# Concepts: talkinghead-story (02)

Designs: editorial, explainer, chatstory, kitchen, checklist, neon, reaction.
Inputs: `01_golden_audit_talkinghead-story.md`, `01_critique_talkinghead-story.md`, `src/designs/README.md` (golden rules, read verbatim), `docs/agents/team-ground-rules.md`.
Creative director. Nothing in the repo was edited.

**No render is possible here.** The Google font fetch is refused and the promote stills fail with `readFile`. So I sort every item into one of four classes:
- **A, fix-provable.** A rule breach or bug the audit proved from code. The correction can be checked by lint, tsc, check-golden, check-selector, check-promote or a promote dry-run, with no still.
- **B, fix-needs-render.** A correct fix whose layout effect has to be seen on a still before anyone trusts it.
- **C, option.** A look change. Daniel picks it from stills.
- **D, ruling.** A question only Daniel can answer.

Counts: **A 7, B 13, C 22 (neon has two looks for one fix), D 7.**

Identity is kept everywhere. Each template keeps its `grammar` and the strengths the critic named. No item bends a golden rule. Where a fix moves something out of FACE, it moves to a place the README names: y 420–700 above the head, the left or right third, or captions at y ≥ 1300.

---

## A. Fix-provable (do first; no choice needed)

| # | design | file:line | change (for the improver) | proven by |
|---|---|---|---|---|
| A1 | checklist | `src/designs/checklist/StepColumn.tsx:355` | Replace `if (chapters.length === 0) return null;` with a branch that still renders the column, but holds only `looseFigure` / `looseMention`, with no `ProgressTrack` (`doneCount / chapters.length` would be 0/0 → NaN and "0/0"). With no chapters, `ownerOf` already returns −1, so the existing loose-card fallback (comment :282) does the rest. | `npm run lint`, `npm test`; reading `ownerOf` (:357-361). This restores rule 1 and rule 2 for checklist videos with no chapters. The loose cards are the same components already used before the first chapter, so no new layout is introduced. |
| A2 | explainer | `src/designs/explainer/template.json:42` | Set `"cueRoom": false`. No `useCueRoom` exists in `src/designs/explainer/` (audit, grep), so the flag claims a move the code never makes. B1 is the real fix; flip it back to true only once B1 lands. | `node scripts/check-golden.mjs ty-do-explainer`. It should stop saying "makes room under cue panels" and report the cue-panel seconds (the audit estimates about 51.7 s of source time) as face-hidden. A FLAG here is the honest result, not a regression. |
| A3 | tooling (checklist promote) | `scripts/promote-design.mjs:74-75` | In the ">text<" scan, drop a capture whose trimmed text starts with a TypeScript type operator (`/^[|&]/`). The capture `" \| CueOf"` comes from `ColumnCues.tsx:47`, `type ColumnCue = CueOf<"kinetic"> \| CueOf<"points"> …`, which is never on screen. Add one case to `scripts/check-promote.mjs` with a fixture line `type T = A<"x"> \| B<"y">;` and assert there is no copy failure. Do not touch checklist itself. | `npm test` (check-promote). `node scripts/promote-design.mjs checklist --dry-run` should go from 7 failures to 6: 2 environment renders + 4 colours, with the copy failure gone. |
| A4 | neon | `src/designs/neon/template.json:38` | `"minHoldMs": 1000` → `1500`. The core floor `READING.minNumberHoldMs` is 1500 (`src/mortgage/golden.ts:30`), so the manifest promises holds that the core never produces. The value is read only by the selector's hold warning (`scripts/select-template.mjs:77-78`). | `node scripts/check-selector.mjs`, `npm test` |
| A5 | neon | `src/designs/neon/index.tsx:368-375` | Add `"Daniel Nguyen"` to `copy`. The reused classic Outro renders it (`src/designs/classic/Outro.tsx:108`). The other five designs that reuse classic Outro already list it. | `npx tsc --noEmit`; `node scripts/promote-design.mjs neon --dry-run` (no new copy failure) |
| A6 | neon | `src/designs/neon/Pieces.tsx:39` (import at :20) | `height: 120` → `height: LOGO_HEIGHT`, imported from `../../mortgage/golden` beside `SAFE`. `LOGO_HEIGHT = 120` (`golden.ts:169`), so the frame does not change by a single pixel. This is rule 3 "constants, never literals". | `npm run lint` |
| A7 | neon | `src/designs/neon/template.json:12, 20` | Make the manifest describe what the code draws. `grammar.numbers`: "number above the head; gauge ring only for percentages" (`Pieces.tsx:40-48`). `skinAxes.captions`: "2–4 word phrase on a navy pill, spoken word amber" (`Captions.tsx:1-5`). If Daniel wants the old "one big glowing word", that is a separate look request, not this fix. | `node scripts/check-selector.mjs` (the manifest fields still validate) |

I left these out of A on purpose:
- Chapter reading holds are B6: a longer card collides longer in the shared places.
- The `fitText` font gate: the root already delays the render on the font (`MortgageReel.tsx:259`, `useReelFont`). See "would not do".
- reaction `cueRoom`: B13.

---

## B. Fix-needs-render (correct per the audit; trust only after a still at `--scale=0.5`)

Ordered by effect over effort.

| # | design | what and where | rule | reuse | still to look at |
|---|---|---|---|---|---|
| B1 | explainer | Make room under the note-band cue cards: `useCueRoom(seg)` + `cueRoomStyle(k)` on the taped photo-card layer in Talk (`index.tsx:100-118`). Then set A2 back to `true`. | 3b, contract | `src/mortgage/cueRoom.ts`, the editorial/kitchen Talk pattern | ty-do-explainer, mid-cue: hair and forehead clear of the card |
| B2 | explainer | Export `Behind`, pass `behind` through in Talk (`index.tsx:391-397, 58-64`), and move StatNotes/Figures there. Also separate the chapter tab from the auto figure (`Figures.tsx:8-10`). | contract, 3b | chatstory `Figures` as the Behind model | frame with a stat + a chapter tab up together |
| B3 | explainer | Cover logo at LogoMark's size and place (`index.tsx:150-296`). Keep the Outro as its own design (it carries the cta axis), but move the logo into SAFE on a white tile and BadgeRow above `SAFE.bottom` (`index.tsx:316-318, 389`). | 3c, 3, 7 | `neon/Pieces.tsx:28-40` cover tile; `classic/Outro.tsx:47-54` placement | frame 20; the outro frame |
| B4 | neon | Move the chapter card out of FACE (`Pieces.tsx:245-291`). The look is option N-C1. | 3b | `starWipe` (already the chapter transition) | a chapter frame |
| B5 | neon | Hook: `fitTextOnNLines` (`@remotion/layout-utils`, installed, used in `ticker/Cues.tsx:74`) over 2 lines in place of `big.length > 10 ? 96 : 130`, plus `transformOrigin: "50% 0%"` so the 1.3 spring stays inside SAFE (`index.tsx:228-242`). | 3, 3b | layout-utils | frame 5 (peak zoom) and frame 60 |
| B6 | editorial, explainer, chatstory, kitchen, reaction | Hold each chapter for `max(2.5 s, readingMs([\`PHẦN ${i+1}\`, title], false))`, capped at the next chapter start (`readingMs` in `golden.ts:35`). Lines: editorial `Overlay.tsx:375`; explainer `Overlay.tsx:292`; chatstory `index.tsx:30`; kitchen `index.tsx:252`; reaction `Artefact.tsx:209`. | 5b reading hold | core `readingMs` | a chapter with a 40-plus character title next to a figure. A longer hold means a longer overlap in the shared places, so this goes after B7–B10. |
| B7 | editorial | Move the lender sidebar out of FACE (`Overlay.tsx:41-47, 221-229`): left third, below the figure band. Then give the chapter banner, the figure panel (Behind) and the MotionTrack band at y 420–580 an order: the chapter waits for a figure, and both fade under a cue. | 3b, logic | the existing `cueFade` pattern from checklist | a lender mention; a chapter at a stat |
| B8 | chatstory | Chapter bubble out of FACE (`Bubbles.tsx:254-262`). Hook bubbles above the head band (`:209-216`). Allow a third lender (`Lenders.tsx:96` `.slice(0, 2)`) with a smaller sticker. Lower `maxChars.vi` from 60 to what the 420 px bubble fits in 2 lines, measured with `fitTextOnNLines`. | 3b, 2 | layout-utils | hook frame 60; a chapter; 3 banks at once (a fixture edit) |
| B9 | kitchen | ChapterCard `maxWidth: SAFE.right - SAFE.left` and its own place (`Pieces.tsx:153-172`). Lift LenderTag clear of a two-line caption page (`Pieces.tsx:117`). Stack the hook bubble and subline in a flex column (`Bubbles.tsx:519-544`), as the Cover does (`index.tsx:105-115`). | 3, 3b | kitchen's own Cover stack | a 48-character chapter; a bank mention with 2-line captions; a 30-character hook |
| B10 | checklist | Stats and bank mentions that land during a cue are hidden by `cueFade` (`StepColumn.tsx:338-351, 398`). Hold them as a loose card under the cue panel, or delay their entrance to the cue's end while keeping the core hold. Show two concurrent figures per step (`:365` `.find` → `filter` + slice 2). | 1, 2 | the A1 loose cards | a stat inside a cue span (fixture) |
| B11 | checklist | Column growth with 5 or more chapters (`StepColumn.tsx:411`) must stay above `CaptionZone`. The cheapest fix is option CL-C1 (collapse done steps). | 3 | the existing chip/track | a 6-chapter fixture at the last chapter |
| B12 | reaction | Hook (`Pieces.tsx:61-67`, literal `1150`): `fitTextOnNLines` in 2 lines within 500 px, anchored from `SAFE` constants and ending above the caption zone. Chapter kicker: when a chapter starts under a cue, show it after the cue rather than dropping it (`Artefact.tsx:209-221`). | 3, 3b, 5b | layout-utils | frame 60 with a 2-line caption page |
| B13 | reaction | `cueRoom: true` with no `useCueRoom` (`index.tsx:58-81`). If a still shows his head below about y 930 at the 0.62 framing, keep `true` and record why in the design README. If not, add `useCueRoom`. | contract | `cueRoom.ts` | a mid-cue frame |

---

## C. Options (Daniel picks by stills). One or two weak axes per template; the identity stays.

Shared enabler (not a look): `fitTextOnNLines` from the installed `@remotion/layout-utils` replaces one-line `fitText` wherever a long Vietnamese string shrinks to 16–40 px. It is used in reaction R-C1, checklist CL-C3, neon N-C3 and the editorial chapter. Building a new helper is not needed.

### editorial (keep: cream page, navy masthead rule, giant stacked cover, amber underline, navy figure panel)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| E-C1 readable figure | Figure kicker and label 16/20 px → 32 px or more, label beside the number, band a little taller (`Behind.tsx:31-37, 99, 124`) | numbers | own panel | none (stays in Behind, y 420–700) | M | low | a number with words you can read at phone size |
| E-C2 cut punch-in | 1.0/1.06 framing alternation on each cut (`index.tsx:221-226`) | framing / pacing | explainer `index.tsx:67-77` pattern | none (helps 5b) | S | low | a calm magazine look, with jump cuts hidden |
| E-C3 cover leading | headline `lineHeight` 0.86 → about 0.98, only if a still shows marks touching (`index.tsx:104-107`) | cover | none | none | S | low | stacked marks on line 2 clear line 1 |

### explainer (keep: ruled paper, taped tilted photo card, marker sweep captions, sticky notes, rough-notation)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| X-C1 full-size notes | Draw note-band cards at scale 1, at band width, instead of shrinking to 0.70–0.8 (`Paper.tsx:72-79, 99-121`) | numbers / cues | own cards | none | M | med (reflow) | labels at their drawn size, from about 24 px up to 34–36 px |
| X-C2 bigger cover face | Cover porthole 320 → about 440 px (`index.tsx:142`) | cover | own | none | S | low | his face as the thumbnail's anchor |
| X-C3 one note style | Stat and auto numbers share one sticky-note look and differ only in size (`Overlay.tsx:139`, `Figures.tsx:29-33`) | numbers | own | none | S | low | a number always looks like a number |

### chatstory (keep: ice-blue paper, iMessage question and reply cover, rounded-box captions, polaroids)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| CS-C1 big polaroid | Figure polaroid about 600 px in the band above his head, number 90 px or more (`Figures.tsx:81-130`). It fades under cue panels, as reaction's artefact does. | numbers | reaction `cueUp` pattern | 3b: stays in Behind at y 420–700, never inside FACE; cue exclusion keeps the place its own | M | med | the number becomes the largest thing on screen |
| CS-C2 cover question | Cover title 38 → 60 px or more, `fitTextOnNLines` on 2–3 lines in the 726 px column (`Cover.tsx:24, 32-33`) | cover | layout-utils | none | S | low | the question reads as a thumbnail |
| CS-C3 static paper | Freeze the paper shader after frame 0 (`Backdrop.tsx:26-38`) | texture (cost) | none | none | S | low | the same look at lower render cost |

### kitchen (keep: warm cream, liquid contours, chat bubbles, slow fades, 70 px caption strip, tilted polaroid)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| K-C1 secondary floor | Secondary text 44 px, titles 56 px, bank label in `slate` (`Pieces.tsx:129, 161`, `Bubbles.tsx:540`, `index.tsx:125`). The numbers wait on ruling D3. | numbers / chapters | `brand.slate` | none | S | low | design text no longer reads as an afterthought beside the captions. This addresses correction 25/09. |
| K-C2 slow push | 3% push-in over each segment, reset on every cut (`index.tsx:171-176`) | framing / 5b | KenBurns idea, own code | none (helps 5b) | S | low | still slow, but no longer frozen |
| K-C3 chapter wash | Either a longer, stronger amber wash, or none (`Pieces.tsx:142-152`) | transitions | own | none | S | low | a chapter beat you notice, or less clutter |

### checklist (keep: notebook paper, numbered step column, k/N bar, amber current, green ticks)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| CL-C1 current-step focus | Current card full size (title 48 px or more, number 72 px or more); done steps collapse to number chips (`StepColumn.tsx:76-131, 239, 265`). This also settles B11. | numbers / steps | own ProgressTrack + chips | none | M | med | one readable step at a time |
| CL-C2 bigger Daniel | `SCALE` 0.6 → 0.68 (`index.tsx:54`); move the column cue room to suit | framing | `useSideCueRoom` | none | M | med | his face large enough to anchor the frame |
| CL-C3 two-line hook | Hook `fitTextOnNLines` on 2 lines, minimum 72 px | hook | layout-utils | none | S | low | the hook is never smaller than the captions |

### neon (keep: starburst, sparks, voice ring, cream-on-amber glow, star-wipe, ring chapters)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| N-C1a chapter interstitial | The ring chapter card becomes a full-screen star-wipe beat (this is B4's look) | transitions / steps | `src/elements/starWipe.tsx` | 3b: nothing over his face, because it is a full-screen interstitial | M | med | a loud chapter break |
| N-C1b chapter band | The ring card shrinks into the band above `SAFE.top + 180` (this is B4's look) | steps | own | 3b: kept above the head | S | low | a smaller ring above his head |
| N-C2 glow trim | Drop the inner white halo and cap the outer glow at about 18 px for text under 80 px (`NeonTitle.tsx:25-39`) | captions / titles | own | none | S | low | Vietnamese hỏi/ngã marks stay crisp |
| N-C3 cover two lines | Cover title on 2–3 lines, minimum 64 px (`index.tsx:105-111`) | cover | layout-utils | none | S | low | long titles stay big |

### reaction (keep: navy desk, tilted artefact card, cut-out bottom-right, "NGHĨA LÀ" card)
| name | what changes | axis | reused | golden rules touched | effort | risk | what Daniel will see |
|---|---|---|---|---|---|---|---|
| R-C1 headline that reads | Artefact headline `fitTextOnNLines` on 3 lines, minimum 52 px (`Artefact.tsx:62-70`) | cover / artefact | layout-utils | none | S | low | the thing he is reacting to becomes legible |
| R-C2 chapter as headline | For a chapter beat, the artefact headline itself swaps to the chapter title (`Artefact.tsx:200-207`) | steps | own tear wipe | none | S | low | chapters you can actually see |
| R-C3 caption size | Captions 52 → 60 px with shorter pages (`Captions.tsx:24, 41`) | captions | own | none | S | low | fewer zig-zag lines |

---

## D. Rulings (Daniel only)

| # | question | reading 1 and its cost | reading 2 and its cost |
|---|---|---|---|
| D1 | **README rule 4.3 versus the schema's `"background": "room"`.** Two real videos use room mode: khong-tra-noi-khoan-vay (kitchen) and pre-approval-tu-dong (editorial). | **4.3 is current, so room mode is forbidden.** Both videos re-render with a cut-out, which needs a matte. Kitchen and editorial are `QUICK_FALLBACK`, so vignette would drop them to classic. The core team (not this team; `src/mortgage/` is off-limits) removes or deprecates room from the schema, and check-golden (`check-golden.mjs:188-192`) fails on "room". | **Room is a sanctioned exception.** README 4.3 gets an amendment line, and the 4.5 privacy check (cover and mid-video stills) extends to room mode. check-golden labels it "background: room (not removed)" instead of falsely FLAGging a missing foreground.webm. The rule is weaker, and every room video needs a privacy review. |
| D2 | **Is editorial's always-on "FINANCE HUB" wordmark a logo under 3c?** (`Masthead.tsx:54`) | **Yes.** The text becomes "GÓC NHÌN" only and the navy rule stays. The magazine identity stays almost whole. Small effort. | **No.** It stays as it is. The cost is a precedent: any design may then carry brand text for the whole video. |
| D3 | **Text-size floor** (correction 25/09; `check-text-size.mjs` `MIN_TEXT_PX` is a 30 px placeholder). Is it literal px, or effective px (literal × parent scale)? | **Literal floor at 30.** 19 literals in this group to lift (editorial 9, checklist 4, reaction 3, chatstory 2, kitchen 1). Explainer passes while its shrunk note-band text stays small. | **Higher floor or effective size.** Explainer X-C1 becomes a fix, and checklist CL-C1 and kitchen K-C1 become required. That is more work, but it closes the open correction for good. |
| D4 | **Identity palettes under rule 7.** The promote gate counts colour literals: kitchen 14, explainer 11, chatstory 8, checklist 4, neon 3, reaction 3, editorial 2. Explainer is "promoted" (grandfathered) yet fails this today. | **Strict theme-only.** Map every literal to a theme token or a tint. Kitchen's warm cream, chatstory's iMessage grey and the explainer and editorial paper would shift, which needs stills per design. | **Daniel adds a paper/cream token to `src/brand/theme.ts`** (the precedent is 26/09, when navy and slate were added), and the literals map to it. The alternative, `// theme-exempt` per line, keeps the looks but weakens rule 7 line by line. |
| D5 | **checklist "ví dụ minh hoạ" at 14 px** (`StepColumn.tsx:119, 131`): is it a compliance marker (rule 8)? | **Yes.** It must be readable (at least the D3 floor). That is a small change. | **No.** Remove it. That is also small, but compliance should confirm first. |
| D6 | **Decoration outside SAFE** (explainer ProgressLine y 1860 `Overlay.tsx:421`, Oscilloscope y 1560–1760 `index.tsx:125`): does "chart" in rule 3 cover it? | **Yes.** Move the progress line inside SAFE, or drop both. | **No.** Leave them. The Reels UI hides them anyway, so dropping them only saves render cost. |
| D7 | **Core geometry.** The LogoMark tile (x about 718–960, y 420–568) crosses the FACE rectangle (x ≤ 830, y ≥ 480) in every design. The checklist hook is inside FACE by the letter, but Daniel is framed right there. | **Accept.** FACE is the generic face box, and a design framed elsewhere is judged on its stills. No work. | **Core change** (logo tile or FACE per design). That is outside this team's folder rights; it goes to the core owner. |

---

## Order of work

1. A1–A7: one improver pass, then `npm run lint`, `npm test`, check-golden ty-do-explainer, check-selector, and promote dry-runs for checklist and neon.
2. Rulings D1 and D3 before any B or C work that depends on them (B7 and editorial room mode; K-C1, CL-C1, X-C1).
3. B by effect over effort:
   1. B1 and B2, explainer (the largest face-cover and the contract).
   2. B10, checklist (rules 1 and 2).
   3. B4 and B5, neon.
   4. B7, editorial.
   5. B8, chatstory.
   6. B9, kitchen.
   7. B12 and B13, reaction.
   8. B3, explainer.
   9. B11, checklist.
   10. B6, all five (last, because it lengthens overlaps).
4. C by effect over effort:
   1. R-C1, CS-C2 and CL-C3 (small changes, large readability gain).
   2. E-C1, CS-C1 and CL-C1.
   3. N-C1a or N-C1b (comes with B4).
   4. X-C1 (after D3).
   5. Then the rest.

## What I would not do, and why

- **A `reelFontReady` gate on editorial, explainer and kitchen `fitText`.** `MortgageReel.tsx:259` already calls `useReelFont()`, which delays the render until Be Vietnam Pro loads. A per-design gate adds code with no proven effect.
- **Swap the CTA or transitions per design to fix skin repetition.** That is a cross-video selector concern (`design-space.md:63`), not something wrong inside one video.
- **Touch `src/mortgage/` or `src/brand/`** for D1, D4 or D7. These are Daniel's or the core owner's.
- **Make template.json say what Daniel might want rather than what is drawn.** A7 describes the code; a change of identity is an option.
- **Add any dependency.** `fitTextOnNLines`, `starWipe`, `cueRoom.ts` and `readingMs` cover every item.

## What Daniel must verify

- Stills at frames 20, 120, 400 and 900 (`--scale=0.5`) for every B and C item, in an environment where the font fetch and `readFile` work.
- The seven rulings, with D1 and D3 first.
