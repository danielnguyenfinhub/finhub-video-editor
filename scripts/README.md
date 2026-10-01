# scripts/

Every script, grouped by what it does. Descriptions come from each file's own header; open the file for flags and details. Agents: look here before searching, and add a line when you add a script (`node scripts/check-scripts-index.mjs` fails if one is missing).

`npm` aliases: `preflight`, `video-status`, `sweep`, `music-start`, `research`, `setup-voice`, `clone-voice`, `listing`, `listing-voice`, `listing-render`, `review` (`review/build.mjs`). `npm test` runs the checks marked **test** below on every PR (CI); the rest need media or full git history and run locally.

## Prep: a recording becomes a video's inputs
| Script | Does |
|---|---|
| `prep-video.py` | Prepares a new talking-head video for MortgageReel: Whisper words, proxy, matte. Run first. |
| `recordings.py` | Where a video's recording files live (the Python copy of `src/mortgage/recording.ts`). |
| `reframe.py` | Finds the face in a landscape or square recording so the 9:16 proxy crops around it. |
| `brief.mjs` | What a video is about, as numbers the template selector scores. |
| `select-template.mjs` | Ranks the designs for one video and writes the top 3 with reasons. |
| `music-start.mjs` | Where a music track gets going, so `edit.json` `music.startMs` can skip its intro. |
| `migrate-assets.py` | Moves each recording into `public/recordings/<id>/` (the asset contract). |
| `migrate-footage-to-library.mjs` | Imports per-slug `voice/footage/` files into the source library. |

## Render and publish
| Script | Does |
|---|---|
| `preflight.mjs` | Runs before every render (called by `render-video.py`): fonts, `edit.json` mistakes, pacing off, speech cuts. |
| `render-video.py` | Renders a MortgageReel video end to end: master, -14 LUFS mix, mobile copy, thumbnail, `.srt`, QC sweep, publish. |
| `sweep-render.mjs` | Sweeps a finished render for every visual change so QC sees what `edit.json` produced. |
| `publish-video.mjs` | Hands a render to Daniel: a copy named after its topic and a caption file in `2 - FINISHED VIDEOS`. |
| `export-srt.mjs` | Writes `out/videos/<slug>/<slug>.srt` using the same cuts as the render. |
| `export-chapters.mjs` | Prints a YouTube/Facebook chapter list timed on the output. |
| `promote-design.mjs` | Promotes a proven design to a reusable template (checks, then registers). |
| `video-status.mjs` | Where each video's team run stands, read from the files the production team writes. |

## Faceless videos (voice, visuals, facts)
| Script | Does |
|---|---|
| `voice-video.mjs` | Voices an approved script and lays down the files MortgageReel needs (also `--listing`). |
| `generate-voiceover.mjs` | MP3 voiceover through the ElevenLabs API (paid; confirm cost first). |
| `omnivoice-tts.py`, `omnivoice.mjs`, `setup-omnivoice.mjs`, `clone-voice.mjs` | Local cloned voice: runtime, location, one-time setup, cloning (consent rules in `AGENTS.md`). |
| `visuals.mjs`, `clip-score.mjs` | Gap-scene visuals and whether a stock clip matches what the scene asked for. |
| `library.mjs` | Cross-video source library: every downloaded or generated asset is saved once. |
| `facts.mjs` | Fact-ledger check: every factual claim a scene shows must trace to the source. |
| `research.py` | What is trending, or research a topic, before writing a script. |

## Global RE listing videos
`listing-prep.mjs` (folder to prepared listing), `listing-compliance.mjs` (copy compliance), `listing-render.py` (VI and EN versions), `listing-stills.mjs` (a still per scene), `publish-listing.mjs` (hand to Daniel).

## Checks (run before or after a render; exit 1 on failure)
| Script | Checks | Where |
|---|---|---|
| `check-schema.mjs <slug>` | `edit.json` against the MortgageReel schema; prints frames and seconds | local |
| `check-speech-cuts.mjs <slug>` | Speech lost or doubled at the automatic cuts and chapter joins, before the first render | local |
| `check-pacing.mjs <slug>` | Rule 5b: a visual change every 1.5-3 s | local |
| `check-golden.mjs [slug]` | `golden.ts` layout rules | local |
| `check-caption-pages.mjs [slug]` | `captionPages.ts` | local |
| `check-sweep.mjs` | `sweep-render.mjs` frame budget and parsing | local |
| `check-video-status.mjs` | `video-status.mjs` on synthetic runs | local |
| `check-library.mjs` | `library.mjs` and library-first routing | local |
| `check-clips.py`, `check-reframe.py`, `check-migrate-assets.py` | `prep-video.py --clips`, `reframe.py` maths, `migrate-assets.py` | local |
| `check-agents-split.mjs` | One-time WP9 `AGENTS.md` split (needs full git history) | local |
| `check-captions.mjs`, `check-caption-fixes.mjs` | Shared caption layer; caption slip fixes in `timeline.ts` | **test** |
| `check-contrast.mjs` | Text legibility of every design | **test** |
| `check-selector.mjs` | `select-template.mjs` ranking; every design has a manifest | **test** |
| `check-element-copy.mjs` | RG 234 scan of text in `src/elements/` | **test** |
| `check-facts.mjs`, `check-visuals.mjs` | `facts.mjs`; the AI judge's pure parts | **test** |
| `check-listing-compliance.mjs`, `check-listing-prep.mjs` | Listing compliance rules; listing parsing | **test** |
| `check-numbers-kit.mjs` | Numbers-kit cues in `schema.ts` | **test** |
| `check-promote.mjs`, `check-publish.mjs` | `promote-design.mjs`, `publish-video.mjs` on fixtures | **test** |
| `timeline.selftest.mjs` | Pins what `timeline.ts` does: cuts, pacing, chapter overlap, time maps | **test** |
| `check-pacing.selftest.mjs`, `check-speech-cuts.selftest.mjs` | The two checks above, on synthetic data | **test** |
| `check-scripts-index.mjs` | Every file in this folder is listed in this README | **test** |

## Tooling (rarely run)
| Script | Does |
|---|---|
| `vendor-skills.mjs`, `vendor-elements.mjs`, `build-chat-skill.mjs` | Re-vendor Remotion skills and the Elements library; build the claude.ai skill zip. |
| `generate-sample-media.mjs`, `fetch-noto-emoji.mjs` | Regenerate sample clips; fetch Noto animated emoji. |
| `renderer-apis.mjs` | Exercises the Node-side Remotion APIs that cannot run inside a scene. |
| `third_party/` | Licence text for borrowed code (HyperFrames, Apache-2.0). |
