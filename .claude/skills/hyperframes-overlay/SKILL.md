---
name: hyperframes-overlay
description: >-
  Builds one motion-graphic overlay for a Finance Hub video with HeyGen's HyperFrames (HTML + GSAP,
  Apache-2.0), renders it to a transparent 1080x1920 WebM with scripts/hf-overlay.mjs, files it in
  the source library and places it as an edit.json `visuals` entry with mode "motion" over Daniel.
  Remotion stays the only final renderer. Use when the visual plan names a HyperFrames block, or a
  beat needs a registry look no design, element or remocn component has ("use a HyperFrames block",
  "hyperframes overlay", "render this as a HyperFrames overlay", "bar chart race over me", "redo the
  overlay", "re-render the HyperFrames overlay"). NOT for whole videos in HyperFrames (Remotion
  renders every video here), captions (the design's PagedCaptions), library b-roll (visuals
  cutaway/pip/overlay) or changing a template (template-improvement-team).
---

# HyperFrames overlay

HyperFrames renders one short transparent overlay; MortgageReel plays it over the talk like any
other `visuals` entry. Approved by Daniel on 2026-10-20 (overlay path only); the 2026-09-29 sibling
review's "no second render runtime" still holds for whole videos.

**Last rung of the source ladder** (`purposeful-motion`): design cues, `src/elements`, vendored
Elements, remocn and Remotion packages come first, because they are already timed and QC'd by
the core. An overlay costs a second render and an HTML file. Reach for it when the beat needs a
HyperFrames registry look (`bar-chart-race`, `apple-money-count`, `data-chart`, `flowchart`,
counters, shader reveals) that none of those has.

## Steps

1. **Project:** `out/videos/<slug>/hf/<name>/index.html` (git-ignored, beside the team plan). The
   root element is `data-composition-id="main" data-width="1080" data-height="1920"`, `data-start="0"`,
   `data-duration` = the beat's seconds. The body background is transparent. The script refuses
   any other size.
2. **Author** to the HyperFrames contract (`npx skills add heygen-com/hyperframes --skill
   hyperframes-core` for the full rules): clips carry `class="clip"` and `data-start`,
   `data-duration` and `data-track-index`; one paused GSAP timeline registered on
   `window.__timelines["main"]`; no `Date.now()`, no unseeded `Math.random()`. A registry block is
   a starting point: `npx hyperframes@0.8.134 add <block>` in the project, then restyle it.
3. **No network at render:** copy `node_modules/gsap/dist/gsap.min.js` next to `index.html` and
   load it by relative path. A CDN script fails `hyperframes check`, and no render may fetch.
4. **Golden rules are yours to keep, in the HTML:** everything inside SAFE and outside FACE
   (`src/mortgage/golden.ts`); there is no backdrop, so Daniel shows through. Text follows
   "Language" in AGENTS.md: Vietnamese main line, English smaller under it, full diacritics, NFC.
   Brand colours and fonts come from `src/brand/`. Every figure on screen comes from the fact
   ledger, as on any card.
5. **Render and file:**
   `node scripts/hf-overlay.mjs out/videos/<slug>/hf/<name> --en "cash rate, rate card" --vi "lãi suất" --slug <slug>`
   It runs `hyperframes lint`, then `check` (WCAG contrast, layout, runtime errors), then
   `render --format webm`, with telemetry off. It then adds the file to `public/library/motion-graphic/`
   and prints the `visuals` line. A failed gate stops it: fix the composition, not the gate.
6. **Place:** paste the printed entry into `edit.json` `visuals`, set `atMs` (source ms) and
   `durMs` (on-screen ms, at most the composition's duration; a shorter clip freezes on its last frame).
7. **Check like any visual:** a `--scale=0.5` still at the overlay's middle frame, then QC and
   compliance as usual. Overlay text is team-written on-screen text, so the RG 234 review covers it.

## Limits

- Needs Node 22 or later (HyperFrames' own requirement), Chrome and ffmpeg: Daniel's PC or a
  cloud session. Not claude.ai chat.
- `hf-overlay.mjs` pins `hyperframes@0.8.134`. Bump it only after reading the release notes, and
  only to a release at least two weeks old.
- The hosted HyperFrames MCP (`compose`, `render_video`) is not used: it renders in HeyGen's cloud
  and uploads the content.
