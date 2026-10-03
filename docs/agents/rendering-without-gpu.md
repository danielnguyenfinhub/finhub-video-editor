# Rendering without a GPU, and what this sandbox can't do

Part of the project guide; [AGENTS.md](../../AGENTS.md) is the core and routes here.

## Rendering environments without a GPU

`@remotion/effects` and `@remotion/three` (and anything else using a canvas-based component's `effects` prop, or `<ThreeCanvas>`) need a working WebGL2 context. On a machine with a real GPU this needs nothing beyond `Config.setChromiumOpenGlRenderer('angle')` (or `--gl=angle` on the CLI) per the `light-leaks.md`/`3d.md` guides.

In a GPU-less sandbox, Chromium's software WebGL fallback additionally needs `--enable-unsafe-swiftshader`, which Remotion's CLI doesn't expose directly (only `--gl=angle` combined with the unreleased v5-breaking-changes flag adds it automatically). Work around this without touching that project-wide flag by pointing `--browser-executable` at a tiny wrapper script that forwards to the real browser binary with the flag always included:

```sh
cat > /tmp/headless-shell-swiftshader <<'EOF'
#!/bin/sh
exec /path/to/your/headless_shell --enable-unsafe-swiftshader "$@"
EOF
chmod +x /tmp/headless-shell-swiftshader
npx remotion render ExtendedReel out/extended-reel.mp4 --browser-executable=/tmp/headless-shell-swiftshader --gl=swangle
```

Without this, effects/`<ThreeCanvas>` scenes render as solid black — Chromium accepts the render silently rather than erroring, so check with `--log=verbose` for the "Automatic fallback to software WebGL has been deprecated" warning if a canvas-based scene comes out blank.

## Can this session render a still? Probe first

Before planning any still, run one tiny still (about a minute; needs no recording, uses the Playwright headless shell when `npx remotion browser ensure` can't download):

```sh
node node_modules/@remotion/cli/remotion-cli.js still src/index.ts ElementCatalog out/stills/probe.png --frame=30 --scale=0.5 --gl=swangle --chrome-mode=headless-shell --browser-executable=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/*/headless_shell | head -1)
```

`Rendered 1/1` means stills work (look at the PNG: a cream card reading "Lãi suất cố định" in Be Vietnam Pro). Any error means no still: audit from code and previews and mark every look claim "not viewed". A `MortgageReel` still also needs its recording (`words.json`, `source.mp4`): the `_test-*` slugs point at recordings that are not in a fresh clone, so they fail with HTTP 404 or a `source.mp4` delayRender timeout, which is not a sandbox limit. `ListingReel` still fails here: it fetches Playfair Display from `fonts.gstatic.com` (below).

A faceless design needs no recording to be viewed: `node scripts/faceless-still.mjs <slug> <design> [--frame 150]` (for example `rba-sept-2026 kinetic`) renders it in the sandbox in about 15 s. It builds a scratch public folder in `out/.tmp` with `"background": "vignette"` (skips the matte) and a black VP9-in-MP4 `source.mp4` (the headless shell has no H.264, so a normal MP4 fails with "Cannot decode"). Checked 2026-10-02 on `kinetic`: text, stat card and Vietnamese diacritics all render. A talking-head design is viewed the same way with `--production` (flag anywhere: `faceless-still.mjs --production rba-sept-2026 classic --frame 190`): a navy picture and a transparent cut-out, the path it takes in production, but **no face**, so "over the face" means inside `FACE` (x 250-830, y 480-1250 full size) and the look over Daniel still needs his PC.

## Review pack: Daniel's look, on his PC and here

`node scripts/review-pack.mjs <slug>` renders both talking-head families (or `--family`, `--designs`) at the video's own frames (at most 6 per design), tiles a strip per design and a sheet per family, and writes `out/review-pack/<slug>/review.html` (open it by double-click) and `review.md`: the frames, what to judge per design, and the `promote-design` commands for after the look (`--promote` runs them). On Daniel's PC, with a slug whose recording and cut-out are present, the stills show his face. Here (no recording, or `--sandbox`) the same pack takes the production path with no face, so agents check the layout on the same frames he will see; about 20 s a design (`rba-sept-2026`, both families in about 5 min). `--promote` is refused on the sandbox picture.

## check-schema and preflight with an installed browser

`scripts/check-schema.mjs` (and `preflight.mjs`, `check-preflight.mjs` through it) normally downloads Remotion's browser, which this sandbox cannot. With an installed one they run for real:

```sh
FINHUB_BROWSER=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/*/headless_shell | head -n 1) FINHUB_GL=swangle node scripts/check-schema.mjs _test-schema-probe --public-dir scripts/fixtures/schema-probe
```

Valid fixture: `MortgageReel _test-schema-probe: 418 frames`; with `design: 42`: `Invalid input: expected string, received number → at design`. Remotion asks for headless shell 149; the installed 141 worked in the 2026-10-02 run. `node scripts/sandbox-facts.mjs` (add `--probe` to render a still) prints what a session can do before it plans.

## What this sandbox can't do

Each was confirmed with a real render. The details, and how the showcase works around each one, are in `docs/findings.md`.

- **The render browser can't reach** `remotion.media` (`@remotion/sfx` sounds, the video-matting and whisper-webgpu models), `fonts.gstatic.com` (`@remotion/google-fonts` crashes the render, so use `font.ts`'s system font stack here) or `unpkg.com` (`@remotion/rive` hangs the render rather than failing). Files copied into `public/` work.
- **No H.264, HEVC or AAC decoding through WebCodecs.** `@remotion/media`'s `<Video>` quietly falls back to `<OffthreadVideo>` and `<Audio>` to `<Html5Audio>`; give WebCodecs-based code a VP9 `.webm` (with Opus for sound). `MediabunnyScene` lists what decodes here.
- **Chromium 141, so no `HtmlInCanvas`** (it needs 149+). Most `@remotion/transitions` presentations are built on it; only `fade`, `slide`, `wipe`, `flip`, `clockWipe`, `iris`, `none` and `pushCut` render here. `<ThreeWebGPUCanvas>` crashes the render.
- **At most 16 WebGL contexts per page**, and each component with `effects` uses two, so keep eight or fewer mounted at once.
- **No MapTiler, no H.264 encoding, no cross-origin isolation.** `api.maptiler.com` is blocked (and no key is set), so `MapTilerScene` shows its "add a key" notice. `@remotion/web-renderer` can't encode H.264 here, so it picks WebM. The render page isn't cross-origin isolated, so `@remotion/whisper-web` can't transcribe.

