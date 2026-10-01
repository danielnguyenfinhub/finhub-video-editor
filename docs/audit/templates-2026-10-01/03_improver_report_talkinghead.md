done (A items only; no render possible here, so nothing visual is viewed)

# 03 improver report: talkinghead-data + talkinghead-story, class A

Date 2026-10-01. Sources: `02_concepts_talkinghead-data.md` (A6, A7), `02_concepts_talkinghead-story.md` (A1-A7). Every item was re-checked against the code before the edit, and every claim held. Nothing was skipped. Nothing was committed.

Files I changed (other modified files in the tree belong to the parallel improver):
`src/designs/datalab/Figures.tsx`, `src/designs/scenario/Compare.tsx`, `src/designs/scenario/Pieces.tsx`, `src/designs/checklist/StepColumn.tsx`, `src/designs/explainer/template.json`, `scripts/promote-design.mjs`, `scripts/check-promote.mjs`, `src/designs/neon/template.json`, `src/designs/neon/Pieces.tsx`, `src/designs/neon/index.tsx`.

| id | change | files | proof |
|---|---|---|---|
| DATA A6 | Verified: the PiP was at `left: 60`, `width: 200` (x 60-266 with its border), which enters FACE.left 250. Now `left: SAFE.left`, `width`/`height` = `FACE.left - SAFE.left - 6` (190), and the Oscilloscope goes from 180 to 170. The box is content-box (no global `box-sizing` in src), so 190 + 2×3 border = 196, giving x 54-250, which ends exactly at FACE.left. Both comments now state this arithmetic. The wrong comments are gone: "below his face" (:139) and "outside FACE" (:198). | `src/designs/datalab/Figures.tsx` | eslint clean; `tsc --noEmit` exit 0; arithmetic from `golden.ts:154-158` (SAFE.left 54) and `:164` (FACE.left 250). Unviewed: the PiP is 10 px smaller, and its clearance from a tall caption page at y 1080-1276. |
| DATA A7 | `left: 60` → `SAFE.left + 6`; `left: 580` → `SAFE.right - 380`; `right: 120` → `1080 - SAFE.right`. Values are identical (54+6, 960-380, 1080-960). `1080 - SAFE.right` is already used in `scenario/Pieces.tsx:123, :254`. | `src/designs/scenario/Compare.tsx` (COL, question div), `src/designs/scenario/Pieces.tsx` (SLOT) | eslint clean, tsc exit 0; promote dry-run scenario: only the 2 environment render failures |
| STORY A1 | Removed `if (chapters.length === 0) return null;`. ProgressTrack now renders only when `chapters.length > 0`. With no chapters, `ownerOf` returns -1, so the existing loose figure and loose mention cards render. | `src/designs/checklist/StepColumn.tsx` | **Harness** (scratchpad `a1/`: esbuild bundle of StepColumn with a `remotion` shim for frame/config, `react-dom/server`). Inputs: `chapters=[]`, one figure (frames 100-178), one mention (frame 150+). HEAD: markup length 0 at frames 120 and 160. After the fix: 851 chars at 120 (figure card, "400"), 1725 at 160 (figure + polaroid card), with no "NaN" and no "0/0" in either. eslint and tsc clean. Unviewed: how it looks. |
| STORY A2 | Verified that `src/designs/explainer/` has no `useCueRoom` (grep finds only the template.json line). `"cueRoom": true` → `false`. | `src/designs/explainer/template.json` | `node scripts/check-golden.mjs ty-do-explainer`. Before: "face hidden 0.0 s … explainer makes room under cue panels". After: "face hidden 43.2 s in total, longest 24.3 s" and "of which cue panels 43.2 s: explainer does not make room (template.json cueRoom), so they count as covering his face; check a still at each (report only)". 0 FAIL lines before and after, exit 0. This is the honest result; B1 is the real fix. `promoted: 2026-09-27` stays, because promotion validates only that cueRoom is a boolean, not its value. |
| STORY A3 | The ">text<" scan in `hardCodedStrings` now drops a capture whose trimmed text starts with `\|` or `&` (a TS union/intersection of generics). No other scan was changed. | `scripts/promote-design.mjs` (one condition + comment), `scripts/check-promote.mjs` (two fixture lines in `good`: `type T = A<"x"> \| B<"y">;`, `type U = A<"x"> & B<"y">;`, plus the check "good: no copy failure from a type union") | Before the scanner fix: `FAIL good: no copy failure from a type union (copy: index.tsx: "\| B" is on screen but not in copy \| … "& B" …)`. After: `promote ok`. `promote-design.mjs checklist --dry-run`: 6 failures (2 env renders + 4 colours), with the `" \| CueOf"` copy failure gone (concept expected 7 → 6). |
| STORY A4 | neon `minHoldMs` 1000 → 1500 (= `READING.minNumberHoldMs`, golden.ts:30). | `src/designs/neon/template.json` | `check-selector` → "selector ok" |
| STORY A5 | Verified: neon imports `Outro` from `../classic/Outro` (index.tsx:42), and `classic/Outro.tsx:108` draws `Daniel Nguyen` as JSX text. 31 other design `index.tsx` files list it. Added `"Daniel Nguyen"` to neon `copy`. | `src/designs/neon/index.tsx` | tsc exit 0; neon dry-run shows no copy failure |
| STORY A6 | `height: 120` → `LOGO_HEIGHT` (= 120, golden.ts:169), imported beside SAFE. | `src/designs/neon/Pieces.tsx` | eslint, tsc clean; 0 px change |
| STORY A7 | Verified against code. `grammar.numbers`: "number above the head; gauge ring only for percentages" (`Pieces.tsx` `percentOf`, `{pct === null ? null : ring}`). `skinAxes.captions`: "2–4 word phrase on a navy pill, spoken word amber" (`Captions.tsx:1-5`, `:52` `brand.navy`, `:72` `brand.highlight`). | `src/designs/neon/template.json` | `check-selector` → "selector ok" |

Skipped ids: none.

## Command outputs (last lines)

- `npx eslint src/designs/{datalab,scenario,checklist,neon,explainer}`: no output, exit 0. (`scripts/*.mjs` are not in `npm run lint` = `eslint src && tsc`. Linting them directly gives only the config's `process`/`console` no-undef errors.)
- `npx tsc --noEmit`: exit 0
- `check-contrast`: `contrast ok (35 design(s))`
- `check-golden`: exit 0, no FAIL
- `check-promote`: `promote ok`
- `check-selector`: `selector ok`
- `check-text-size`: report only, exit 0
- `check-teams`: `teams ok: 42 styles in 6 teams, 44 agents`
- `check-scripts-index`: `scripts index ok`
- `npm test`: exit 1 at `check-captions.mjs`: `ERR_MODULE_NOT_FOUND: Cannot find package 'remotion' imported from /tmp/captions-…/PagedCaptions.mjs`. That is an environment failure: it bundles to the OS temp dir, which has no node_modules, and none of my files are involved. I did not check whether HEAD fails the same way. Every later step in the chain was run alone and exits 0.
- Promote dry-runs (all fail the 2 renders on the font fetch / readFile). datalab 5 (+3 colours: A1/A2 of the data concepts, not mine). scenario 2. neon 5 (+3 colours). explainer 13 (colours only, not render). checklist 6. No copy failures in any of them.

## Unviewed (Daniel should check at --scale=0.5)

- datalab: a frame with a figure up (ty-do 400 and 900), to see the PiP at x 54-250, y 1080 against his shoulder and the captions.
- checklist: a reel with no chapters, at a figure frame, to see the loose cards at the top of the column (no fixture reel exists; the harness proves only that they render).
- explainer: nothing visual changed; check-golden now reports 43.2 s of cue panels as face-hidden until B1 lands.
- scenario, neon: 0 px change by arithmetic; no still needed.
