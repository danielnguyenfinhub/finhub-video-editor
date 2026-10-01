done (A1-A8 applied; nothing rendered: the sandbox refuses the Google font fetch, so every look below is unviewed)

# Improver report: faceless-explainer group, A items (01/10/2026)

Scope: A1-A8 from `02_concepts_faceless-explainer.md` only. No B/C/D item, no `promoted` flag, nothing in
src/mortgage, src/brand or src/elements. Not committed.

| id | change | files | proof |
|---|---|---|---|
| A1 | `right: 1080 - 960` -> `1080 - SAFE.right`; `maxWidth: 960 - TEXT_LEFT` -> `SAFE.right - TEXT_LEFT`; imports `SAFE` | src/designs/orbit/Cues.tsx | `grep -n 960 orbit/Cues.tsx` empty. Same pixels (SAFE.right = 960). eslint/tsc clean |
| A2 | cover logo `height: 120` -> `LOGO_HEIGHT` (golden.ts:169) | src/designs/faceless/index.tsx | `grep "height: 120"` empty. Same pixels |
| A3 | Off-brand colours replaced by theme tints built at runtime (local `mix`, plus `alpha` as an 8-digit hex suffix, so no `rgba(` literal and no theme-exempt marker). Shared `NAVY_GRADIENT` exported from Stage.tsx, used by the backdrop and the footage veil | src/designs/faceless/Stage.tsx, src/designs/faceless/index.tsx | `promote-design faceless --dry-run`: 6 colour FAILs gone. RGB deltas (scratch tint.mjs): gradient mid #0B2F5E -> #08325a (-3,3,-4); end #07172E -> #07162f (0,-1,1); SKY ring stroke #7FC4FF -> #91bcda (18,-8,-37); glow rgb(79,163,224) -> #619fc9 @0.35 (18,-4,-23). check-contrast ok |
| A4 | Cover measures the title only after `reelFontReady()`, through a local `useFontReady` (copy of paper/Desk.tsx:60-73, with its own delayRender). Font size is 0 until ready | src/designs/faceless/index.tsx | Not a non-issue: MortgageReel.tsx:258 `useReelFont()` only delays the screenshot. It does not re-render the cover, and `measureText` (node_modules/@remotion/layout-utils/dist/cjs/layouts/measure-text.js:51-53, 91) keeps every measurement in a module-level `wordCache`. So a fitText on the first render, before the font is in, gives a fallback-font width that stays for the life of the tab. Proof is code-read plus lint/tsc |
| A5 | A hooked figure (said in the first 105 frames) is still a chip in the hook. When its reading time runs past `HOOK_FRAMES`, the rest shows as the normal `GiantNumber` with its label. Rests queue one after another (no stacking), each at least `READING.minNumberHoldMs` so the label (fades in at frames 12-20) lands | src/designs/kinetic/Stage.tsx | Harness (below). rba-sept-2026: no change ("2026" ends at frame 90, inside the hook). Synthetic (3 stats said at 1.0/1.2/1.5 s): before, shown 80/120, 75/90, 67/90 frames and label never; after, 125/120, 120/90, 112/90 frames, label yes, 0 overlapping giant numbers |
| A6 | `figureQueue(figures, hooked, fps)`: each figure starts at max(said, hook end, previous figure's end) and keeps `max(f.frames, minNumberHold)`. Replaces the old "clip at next figure" logic | src/designs/blueprint/Stage.tsx | Harness on the real exported function. rba-sept-2026: before, 1 overlapping pair (17 fr) and "2026" cut to 45/78 frames; after, 0 overlaps, none short. Max delay 94 frames (3.13 s) before and after: "2026" is said at frame 11 and waits for the hook in both versions. Synthetic: before, 3 overlapping pairs (worst 45 fr) and all 3 cut to 45 frames; after, 0 overlaps, none short, max delay 277 frames (9.2 s: three stats inside 0.5 s queue behind a 3.5 s hook) |
| A7 | A `late` item (waits for a cue page) moves `to` with `from`, so it keeps its length | src/designs/phoneapp/plan.ts | Harness on the real planOf, old vs new. Synthetic: "0,25%" 80/90 frames before, 90/90 after |
| A8 | When both lanes are busy, the item waits for the lane that frees first (from and to shift by the wait). The lane preference when free is unchanged (0 first) | src/designs/phoneapp/plan.ts | Synthetic (hook + 3 stats + 2 banks + points cue): before, lane 0 had 3 overlapping pairs (worst 75 fr) and lane 1 had 1 (25 fr); after, 0 in both lanes and on screen. Max figure delay 75 frames (2.5 s). rba-sept-2026 and faceless-test: identical plan before and after |

Skipped: none. A4 was re-checked as asked and stays a fix (reason above).

## Harness

Scratchpad only. `entry.ts` is bundled with esbuild and imports the real `figuresOf`, `buildTimeline`,
phoneapp `planOf` (new, plus the HEAD copy for "before") and blueprint `figureQueue`. `run.mjs` replays
public/videos/rba-sept-2026 and faceless-test edit.json with their words.json, plus one synthetic reel. For
kinetic and for blueprint "before", the schedule is a line-for-line copy of the JSX logic, because it is
inline in the component.

## Commands (last lines)

- `npx eslint src` exit 0 (folders orbit, faceless, kinetic, blueprint, phoneapp clean); `npx tsc --noEmit` exit 0
- `npx prettier --check` on my 6 files: clean
- `node scripts/check-contrast.mjs`: `contrast ok (35 design(s))`
- `node scripts/check-golden.mjs`: exit 0, 0 FAIL
- `node scripts/check-selector.mjs`: `selector ok`
- `node scripts/check-text-size.mjs`: report only, exit 0 (faceless and kinetic not listed)
- `node scripts/check-teams.mjs`: `teams ok: 42 styles in 6 teams, 44 agents`
- `node scripts/promote-design.mjs faceless --dry-run`: `NOT promoted, 2 failed check(s)`, down from 8. The 2 left are `still B` and `preview` "did not render" (sandbox)
- dry run for orbit, kinetic, blueprint, phoneapp: each `1 failed check(s)`, only `still B ... did not render` (sandbox)
- `npm test`: every step after check-captions passes. `check-captions.mjs` fails with `ERR_MODULE_NOT_FOUND: Cannot find package 'remotion' imported from /tmp/captions-*/PagedCaptions.mjs`, an environment and bundle-path issue that none of these files touch (unverified whether it already failed on clean main)

## Unproven / what Daniel must check

- Stills at --scale=0.5 (none rendered):
  - faceless-test frame 20: cover title size, A4.
  - frames 120 and 400: backdrop gradient and the A3 ring colour. The ring stroke is visibly less saturated (#91bcda vs #7FC4FF); no theme tint reaches the old sky blue.
  - kinetic: a reel with a stat said in the first 3 s that runs past frame 105, frames ~110-150 (A5 rest replays the slam and count-up).
  - blueprint: rba-sept-2026 frames 105-260.
- Promotion of orbit, kinetic, blueprint and phoneapp (`promoted` 2026-09-28) was not re-run with renders. Run `node scripts/promote-design.mjs <id>` outside the sandbox to refresh it.
- A6 and A8 trade overlap for delay. In dense openings a figure can land seconds after it is said (9.2 s in the worst synthetic case, 3.1 s on rba-sept-2026, the same as before).
- Same defect, not fixed (file not in scope): blueprint/index.tsx:67 cover `fitText` has no font guard, like A4.
- Not touched: faceless `promoted` (D2), template.json fields (no field changed).
