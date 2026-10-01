# 03 Improver report: faceless-data (A12 to A15)

Scope: A12, A13, A14, A15 from `02_concepts_faceless-data.md`. Nothing else was touched (not A0 to A11, A16, B, C, D, `src/mortgage`, `src/brand` or `src/elements`). No render was possible here, so nothing has been looked at. Nothing committed.

| id | change | files | proof |
|---|---|---|---|
| A12 | Cover logo `height: 120` becomes `LOGO_HEIGHT`, imported from `mortgage/golden` (it is 120, so the pixels are the same). | `src/designs/ticker/index.tsx` | `golden.ts:169 LOGO_HEIGHT = 120`; eslint and tsc clean |
| A13 | **Done, not skipped.** The cover title's `fitText` now runs only after `useFontReady("ticker cover: Be Vietnam Pro")` (already exported from `ticker/Board.tsx`) and is memoised on `[ready, title]`. Until the font is in it uses 104 px, the existing cap; that frame is held anyway. | `src/designs/ticker/index.tsx` | See "A13: why the hold in MortgageReel is not enough" below. eslint and tsc clean |
| A14 | Added `export const PUSH = 1.035` in `Paper.tsx`. The giant hook and figure (`Stage.tsx`) are now fitted to `W / PUSH`, and `Giant`'s push-in scales to `PUSH`. The same fix is applied to the change cue's push-in (`Cues.tsx` `ChangeStage`): it fits to `room / PUSH` and scales to `PUSH`. That cue had the same defect: about x 968 with no arrow, and about 6 px into the arrow with one. | `src/designs/bigdigit/Paper.tsx`, `Stage.tsx`, `Cues.tsx` | General case: `giantSize` floors, so width ≤ W/PUSH. Then right edge = SAFE.left + width·PUSH ≤ 54 + 906 = 960 = SAFE.right. There is no length limit on `big` in the schema, and length only decides whether the width limit binds. Harness `scratchpad/a14.cjs`: the real Black TTF via opentype.js, with giantSize copied exactly, over the 60 numbers in fixture hooks, stats and change cues plus a 19-char synthetic. It took the larger of the whole-string width and the per-glyph sum (Assemble lays out per glyph). **Worst right edge at full push: before 991.3, after 959.9 (SAFE.right 960).** Change cue with an arrow: worst 829.7 against a limit of 830; the arrow starts at x 850. |
| A15 | Points-card row: `left: TRACK.x0 - 64` becomes `SAFE.left`, and `right: 1080 - 960` becomes `width - SAFE.right`, with `width` from `useVideoConfig()` (no exported frame-width constant exists outside `src/mortgage/transitions.ts`). | `src/designs/timelapse/Scenes.tsx` | TRACK.x0 − 64 = 118 − 64 = 54 = SAFE.left. Width is 1080 for both 9:16 and 4:5, so `width − 960` = 120, the same as before. Timelapse is not used by YouTubeReel (1920 wide), which uses `src/youtube/designs`. eslint and tsc clean |

## A13: why the hold in MortgageReel is not enough

`useReelFont()` (`MortgageReel.tsx:259`, `style.ts:81`) only calls `delayRender`, which holds the **screenshot**. It does not stop children from rendering. `design.Cover` mounts in the same commit and calls `fitText` before the FontFace resolves. In `@remotion/layout-utils` 4.0.527, `measureText` caches every result in a module-level `wordCache` keyed by text, font, weight and size. Nothing about whether the font has loaded goes into that key. So a fallback-font width measured on mount stays for the whole tab, even on later re-renders. The hold makes the frame wait, but it still paints with the wrong size. That is why `ticker/Board.tsx` `StatusBar` and `bigdigit` already gate their measuring on `useFontReady`. The same latent pattern may exist in other designs' covers. That was not checked, because it is outside these ids.

## Checks (last lines)

- `npx eslint src/designs/ticker src/designs/bigdigit src/designs/timelapse`: no output, exit 0
- `npx tsc --noEmit`: no output
- `check-contrast`: `contrast ok (35 design(s))`
- `check-golden`: all ok, exit 0
- `check-selector`: `selector ok`
- `check-text-size`: report only, and unchanged by these edits (ticker 4 and timelapse 9 literals under 30 px were there already)
- `check-teams`: `teams ok: 42 styles in 6 teams, 44 agents`
- `promote-design.mjs <ticker|bigdigit|timelapse> --dry-run`: `FAIL still B: faceless-test frame 400 did not render` (readFile, so no render is possible here). That is the only failing check. Promotion was not run and `promoted` was not touched. **It is stale for ticker, bigdigit and timelapse until a dry run passes where rendering works.**

`template.json` was not changed: no field is affected.

## Unviewed (Daniel to check once stills work, `--scale=0.5`)

- ticker cover, frames 0 and 20: title size with the real font. It may now differ from earlier stills if those were measured with the fallback font.
- bigdigit hook at the end of the hook (frame ~104), and a stat figure at its last frame: the right edge should sit inside SAFE.right. The giant is about 3 % smaller than before.
- bigdigit change cue at its last frame, with and without an arrow.
- timelapse points scene: the cards should look the same as before.
- Not proven: browser shaping versus opentype advance widths, which may differ by a pixel or two. The hollow glyph's outline stroke (`size/110`, half outside the outline) normally falls inside the advance width's right side-bearing, but that has not been measured.
