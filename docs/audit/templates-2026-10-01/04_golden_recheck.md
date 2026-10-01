partly done (re-check complete; 3 regressions found; nothing rendered, because the sandbox refuses the Google font fetch)

# 04 Golden re-check after the template-improver (01/10/2026)

I did not make these changes. Scope: the working-tree diff (`git status`/`git diff`, 21 files, +203/-94), which covers datalab, scenario, checklist, explainer, neon, ticker, bigdigit, timelapse, orbit, faceless, kinetic, blueprint and phoneapp, plus `scripts/promote-design.mjs` and `scripts/check-promote.mjs`. I compared it with the three 03 improver reports and the 01 golden audits. I edited no project files. My harnesses are in the scratchpad (`replay/entry.ts`, `run.mjs`, `kin.mjs`, `endq.mjs`, `scan.mjs`). They bundle the real `figuresOf`, `buildTimeline`, `figureQueue`, the new `planOf` and the HEAD `planOf`. The kinetic schedule is copied line for line from the JSX, because it is inline there.

Legend: **M** = measured (command or harness output), **C** = code reading, **I** = inferred.

## Checks (last lines)

| command | result |
|---|---|
| `npx eslint src/designs/{13 changed}` | exit 0, no output |
| `npx tsc --noEmit` | exit 0 |
| `node scripts/check-contrast.mjs` | `contrast ok (35 design(s))` |
| `node scripts/check-golden.mjs` | exit 0, 0 FAIL |
| `node scripts/check-golden.mjs ty-do-explainer` | exit 0; `face hidden 43.2 s in total, longest 24.3 s`; `of which cue panels 43.2 s: explainer does not make room ... (report only)` |
| `node scripts/check-promote.mjs` | `promote ok` |
| `node scripts/check-selector.mjs` | `selector ok` |
| `node scripts/check-teams.mjs` | `teams ok: 42 styles in 6 teams, 44 agents` |
| `node scripts/check-scripts-index.mjs` | `scripts index ok` |
| `node scripts/check-text-size.mjs` | report only: `103 literal(s) under it in 35 design(s)`. No listed literal is on a changed line |
| `promote-design.mjs <id> --dry-run` x13 | No copy or RG 234 failures. ticker, bigdigit, timelapse, orbit, kinetic, blueprint, phoneapp: 1 failure (still B did not render). faceless: 2 (still B and preview, both render). scenario: 2 (render). datalab 5, neon 5, checklist 6, explainer 13: render failures plus off-brand colours, all on lines this diff did not touch (pre-existing, already in the 01 audits) |

## Per change

| change | verdict | evidence |
|---|---|---|
| promote-design.mjs `hardCodedStrings`: drop a `>…<` capture that starts with `\|` or `&` | **regression (the check is loosened)** | See finding R1 |
| check-promote.mjs: union fixtures plus the "no copy failure from a type union" check | clean, but incomplete | It proves unions pass. Nothing proves that JSX text starting with `&` or `\|` is still caught (R1) |
| datalab Figures.tsx PiP to `SAFE.left`, size `FACE.left - SAFE.left - 6` | clean | C: no global `box-sizing` in src (grep shows only local `border-box` uses), so 54 + 190 + 2×3 = 250 = FACE.left. The pixel columns are 54-249, so nothing is inside FACE. There is no boxShadow on the PiP. y 1080-1276 is inside SAFE.bottom 1473. No new colour: `rgba(6,19,42,0.7)` was already there. New literals: `-6` (border) and 170 (the scope, which fits inside the 190 box). Unverified: clearance from a tall caption page |
| scenario Compare.tsx / Pieces.tsx literals to SAFE expressions | clean | C/M: 54+6 = 60, 960-380 = 580, 1080-960 = 120. Same pixels. The dry run has only the 2 render failures |
| checklist StepColumn.tsx: no early return at 0 chapters | clean (inferred) | C: `starts = []`, `ownerOf` returns -1, the loose cards render and ProgressTrack is skipped, so there is no 0/0. I did not rerun the improver's SSR harness. Rules 1 and 2 are now met for a chapterless reel |
| explainer template.json `cueRoom` true to false | clean (honest) | C: `src/designs/explainer` has no `useCueRoom` (grep). Only `check-golden.mjs:194` reads the value. `select-template.mjs:47,50` only checks the type, and `golden.ts faceHiddenOf` is the consumer. Nothing else relied on true. M: check-golden now reports 43.2 s of cue panels as covering his face, report only, exit 0. That is a real, pre-existing rule-3b exposure (corrections 27/09 "panels cover my head"), now visible. Doc drift: `.claude/skills/style-production-teams/references/talkinghead-story.md:3` still says all seven are `cueRoom` |
| neon template.json `minHoldMs` 1000 to 1500, grammar/skinAxes text | clean | C: `minHoldMs` is read only by `select-template.mjs:77-78` (a hold warning). No code in neon reads it or assumes 1000 (grep for 1000 in neon: only ms-to-frame conversions). 1500 = `READING.minNumberHoldMs`. The grammar text matches `Pieces.tsx:47-53` (ring only for a percentage) and the captions text matches `Captions.tsx:1-5, :52, :72` |
| neon index.tsx copy `"Daniel Nguyen"`, Pieces.tsx `LOGO_HEIGHT` | clean | C: `classic/Outro.tsx:108`. 0 px change |
| ticker cover `LOGO_HEIGHT` + fitText behind `useFontReady` | clean | C: `useFontReady` is `Board.tsx:238`. The placeholder `104/1.6` × 1.6 (line 145) = 104, the existing cap. The frame is held by delayRender |
| bigdigit `PUSH` and fit to `W/PUSH` (hook, figure, change cue) | clean | C/arithmetic: `giantSize` floors, so width ≤ W/PUSH, and after the push width ≤ W = 906. The right edge is then ≤ 54 + 906 = 960 = SAFE.right. Change cue with an arrow: room 776/PUSH, so it reaches ≤ 54 + 776 = 830, before the arrow at `W - 110` (x 850). The vertical grow from the bottom-left anchor is unchanged |
| timelapse PointsScene row to `SAFE.left` / `width - SAFE.right` | clean | C: TRACK.x0 - 64 = 54 = SAFE.left. width 1080 gives 120. Same pixels |
| orbit Cues.tsx 960 to `SAFE.right` | clean | Same pixels |
| faceless colours as runtime `mix()` of theme tokens, `NAVY_GRADIENT`, `LOGO_HEIGHT`, cover `useFontReady` | clean on the measures; see note N1 | M: recomputed from `theme.ts`: SKY #91bcda, GLOW #619fc9, gradient #0B1F3D, #08325a, #07162f. Contrast on the worst stop: white 13.01 (was 13.27 on #0B2F5E), amber 7.59 (was 7.74). SKY is a ring stroke only (`Stage.tsx:184`), not text. The remaining `rgba(245,165,36,…)` is brand.accent #F5A524. Dry run: no colour failures |
| kinetic A5: a hooked figure's rest shown after the hook | **regression** | See finding R2 |
| blueprint A6: `figureQueue` | fixes the claim, **regression elsewhere** | See finding R3 |
| phoneapp A7: a late item keeps its length | clean | M: all 20 fixture reels have an identical plan, old and new. C: the overlap test now runs on the shifted span |
| phoneapp A8: wait for the lane that frees first | fixes the claim, **regression at the talk end** | See finding R3 |

## Findings

### R1 Copy scan loosened (rule 8 / RG 234 path): `scripts/promote-design.mjs:75-76`

What breaks: the exemption is not limited to type unions. Any bare JSX text whose trimmed form starts with `|` or `&` is no longer required in `copy`. `assertCompliantCopy` scans only `copy` (`promote-design.mjs:215-230`), so such text also skips the RG 234 check.

How I know (M, `scratchpad/scan.mjs` against the real export):

```
<span>| Lãi suất cố định</span>      -> []   (was caught before)
<b>&nbsp;Phí thường niên</b>          -> []
<b>&ldquo;Best rate&rdquo;</b>        -> []
<div>\n  & Lãi suất\n</div>           -> []
<span>Lãi suất</span>                 -> ["Lãi suất"]   (control)
```

Today nothing in the repo uses it. The only `>|`/`>&` text in src/designs is the type line `checklist/ColumnCues.tsx:47`, and there are no HTML entities in designs (grep). So the damage is latent, not live. String literals are still caught by the first loop, so `{"| …"}` is still seen. The fix to suggest (not made): exempt only a capture that is a bare type name, for example `/^[|&]\s*[A-Z][\w.$]*$/` on the trimmed capture. Add a negative fixture to check-promote, such as `<b>&nbsp;Lãi suất</b>`, that must still fail copy.

### R2 Kinetic: two giant numbers in one place (rules 3b and 5): `src/designs/kinetic/Stage.tsx:510-533`

What breaks: the hooked "rest" queue (`hookRest`) only waits for other hooked rests. A figure said just after the hook keeps `from = f.fromFrame`, so it mounts in the same centred `StageBox` (GiantNumber `:153`, StageBox `:55-75`) while the rest is still up.

How I know (M, `scratchpad/replay/kin.mjs`): stats "5 triệu" at 2.5 s (frames 75-150) and "7 triệu" at 3.8 s (114-174), with a hook. Old: only "7 triệu" 114-174 (the hooked one was dropped after its chip). New: "5 triệu" 105-150 **and** "7 triệu" 114-174, so the two overlap for 36 frames. The improver's synthetic (all 3 stats inside the hook) cannot show this. Fixture reels show no change. Also, kinetic already had a pre-existing giant/giant overlap of 61 frames on ty-do-explainer, both old and new. A5 did not cause it and does not fix it.

### R3 Queueing can push a figure past the overlay end (rule 1), and blueprint can stack a figure over a bank sheet (rule 3b)

- Blueprint `figureQueue` (`blueprint/Stage.tsx:499-515`) queues figures against the hook and against each other, but not against `LenderSheet` (`:541-553`), which uses the same full-stage `StageSheet` (`:42-77`). M (`kin.mjs`): a 4 s stat said at 0.5 s with a hook, and Westpac at 5 s (frames 150-225). Old: figure 105-150, no overlap. New: figure 105-225, so it **stacks on the bank sheet for 75 frames**. M (`run.mjs`): on bank-test and faceless-test, the figure/lender overlaps (66 and 7 frames) are the same before and after (pre-existing).
- Neither queue has a talk-end cap. The Overlay `Sequence` ends at `talk - OUTRO_TRANSITION` (`MortgageReel.tsx:376-387`, OUTRO_TRANSITION 18). M (`endq.mjs`): 4 stats at 8.0-8.9 s, talkFrames 307, so the overlay ends at frame 289.
  - **Blueprint new:** 6 triệu 285-330 (4 frames visible); 7 triệu 330-375 and 8 triệu 375-420 are **never on screen**. Old: all four were visible, stacked.
  - **Phoneapp new:** 8 triệu moved to 294-339, so it is **never on screen**. Old: 263-308 in lane 0, visible to frame 289.

The improver noted the delay (9.2 s worst) but not the drop. In every fixture reel nothing runs past the end, old or new (M, `run.mjs`). The fixes on the claimed cases do hold. rba-sept-2026 blueprint fig/fig overlap: 1 pair of 17 frames before, 0 after. ty-do-explainer: 1 pair of 28 frames before, 0 after. Phoneapp lanes: 0 overlaps in every fixture.

### N1 Note (not a violation): faceless tints evade the static colour scan by construction

They are derived only from theme tokens, which follows the rule's intent. However, `#91bcda`, `#619fc9` and `#08325a` are colours no check can see. If Daniel wants derived tints, they belong in `src/brand/theme.ts` as named tokens. That is his call.

## Summary by rule

- Rule 1: R3 (blueprint and phoneapp can drop a figure in the last seconds; synthetic only).
- Rule 3b: R2 (kinetic giant on giant), R3 (blueprint figure on bank sheet). Explainer's 43.2 s of panels over the face is now honestly reported (pre-existing).
- Rule 5/5b: R3 partial (6 triệu held 4 frames). No new hold under `readingMs` in any fixture.
- Rule 8 / copy: R1 (scanner loosened, latent).
- Rule 3 literals: no new SAFE/FACE-equivalent literal. The new literals are offsets (`+6`, `-6`, 170, 380).

**Single worst:** R1. It loosens a gate, and every future design inherits it silently. R2 and R3 are design-local and edge-case.

## Unverified (needs a render)

Every visual claim is unverified. No still could be made (font fetch refused). These need a still at `--scale=0.5`:
- datalab PiP against captions and shoulder (ty-do 400, 900);
- bigdigit right edge at full push, measured on real glyph outlines (the improver used opentype advances);
- faceless and ticker cover title size with the real font;
- faceless ring and backdrop tint;
- kinetic rest replay after the hook;
- blueprint rba-sept-2026 frames 105-260;
- checklist with a chapterless reel (no fixture exists).

Promotion (`promoted` dates) was not re-run for any of the 13 designs, and it stays stale until a dry run passes where rendering works.
