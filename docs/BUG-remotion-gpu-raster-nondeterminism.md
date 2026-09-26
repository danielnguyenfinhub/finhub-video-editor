# BUG: GPU rasterization makes the hook title differ by a few pixels between renders

- Date: 2026-09-27 (AEST)
- Component: Chromium GPU rasterization as launched by `@remotion/renderer` 4.0.527 with `--gl=angle`
  (and `--gl=swangle`) on Windows 11. Not a code path in this repo.
- Severity: low. Invisible in the video (1–2 levels out of 255 on 14–114 pixels, PSNR about 98 dB),
  but it breaks exact-hash regression checks: the same frame rendered twice from the same bundle can
  hash differently.

## Observed

`npx remotion still <bundle> MortgageReel --props='{"slug":"ty-do"}' --frame=90 --gl=angle`, full
scale, one bundle of origin/main (f3b19e8), hashed as decoded RGBA pixels:

| Setup | Runs | Distinct outputs |
|---|---|---|
| `--gl=angle`, frame 90 | 5 | 2 (4 + 1) |
| `--gl=angle`, frames 89 / 91 / 100 / 150 | 5 each | 2 each |
| `--gl=swangle` (SwiftShader, no hardware GPU), frame 90 | 6 | 2 (4 + 2) |
| no `--gl` flag (Remotion default, `null`), frame 90 | 20 | 1 |
| `--gl=angle` plus Chromium `--disable-gpu-rasterization`, frame 90 | 12 | 1 |

Every differing pixel is inside the hook title "2,4 TỶ ĐÔ" (`HookTitle` in
`src/designs/classic/Frame.tsx`, 190 px Be Vietnam Pro Black), bounding box about x 70–1024,
y 124–325, mostly on glyph edges. The subtitle pill, captions, money rain, starburst and the
recording never differ. Frame 150 is 85 frames into the hook, where the entrance spring has settled,
and it still varies.

Removing parts of the hook one at a time (bundle rebuilt each time, `--gl=angle`, frame 90) does not
make it deterministic:

| Removed | Runs | Distinct outputs |
|---|---|---|
| the title's `scale()` transform | 6 | 2 |
| `HookBurst` (the WebGL starburst, screen-blended) | 6 | 2 |
| the title's blurred `text-shadow` | 18 | 2 (15 + 3) |

The frame has no unseeded randomness: `MoneyRain` uses Remotion's seeded `random()`, the counter is
`interpolate()` of the frame, and the fonts are held by `delayRender` until loaded.

A composition that contains only the title (same text, font, weight, size, shadow, opacity, scale and
a screen-blended box over it) gave 1 distinct output in 12 runs for each of 5 combinations. The
variation shows up only in the full reel page, so it depends on how much the page rasterizes, not on
any one element.

## Cause (as far as can be verified without the Chromium source)

Only GPU rasterization varies. Turning it off, either through Remotion's default `gl` or with
`--disable-gpu-rasterization` next to `--gl=angle`, gives identical pixels every run. SwiftShader
also varies, so it is not the hardware GPU or its driver; it is Chromium's GPU raster path itself.
The internal mechanism (raster-thread ordering, glyph or path atlas use for large glyphs) is
**unverified**.

`--disable-gpu-rasterization` was passed by setting `__RESERVED_IS_INSIDE_REMOTION_LAMBDA=true`, which
makes `node_modules/@remotion/renderer/dist/open-browser.js` add it. That variable is reserved for
Lambda and was used only for this test; Remotion's CLI has no public option for the flag.

## What it means here

- Renders with `--gl=angle` are not bit-for-bit reproducible on hook frames. Compare regression
  stills with a tolerance (largest channel difference 2 or less, or PSNR 60 dB or more), not an
  exact hash.
- Rendering without `--gl` was reproducible (20 of 20), but its pixels differ from `--gl=angle` across
  the whole frame (PSNR about 39 dB). Goldens made in one mode cannot be compared with renders from
  the other. `--gl=angle` stays the render mode for the WebGL effects (docs/agents/rendering-without-gpu.md).

## A correct result

1. Rendering the same frame of the same bundle twice with the same flags (`--gl=angle`) gives identical
   decoded pixels.
2. This holds on frames where large text is on screen (for example `MortgageReel` / `ty-do`,
   frames 89–150).
3. Turning GPU rasterization on or off may change the pixels, but each mode is deterministic.
