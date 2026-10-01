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
| `preflight.mjs` | Runs before every render (called by `render-video.py`): fonts, `edit.json` mistakes, pacing off, then `check-schema`, speech cuts and pacing (a check that crashes blocks). |
| `render-video.py` | Renders a MortgageReel video end to end: master, -14 LUFS mix, mobile copy, thumbnail, `.srt`, QC sweep, publish. |
| `sweep-render.mjs` | Sweeps a finished render for every visual change so QC sees what `edit.json` produced. |
| `publish-video.mjs` | Hands a render to Daniel: a copy named after its topic and a caption file in `2 - FINISHED VIDEOS`; refuses a render older than its on-screen inputs (`<slug>.inputs` stamp from `render-video.py`) and another slug's same-title files (unowned older files: only with `--claim`, else exit 4 naming the videos with that title; the owner record is written under `.publish-slugs.lock`); a `rendering` stamp (a render that stopped part way) is refused, even with `--stale-ok`. |
| `export-srt.mjs` | Writes `out/videos/<slug>/<slug>.srt` using the same cuts as the render. |
| `export-chapters.mjs` | Prints a YouTube/Facebook chapter list timed on the output. |
| `promote-design.mjs` | Promotes a proven design to a reusable template (checks, then registers). |
| `report-promotion-drift.mjs` | Report only (exit 0, writes nothing): each promoted design's commits since the commit that set its `promoted` value (design folder only, not `src/mortgage/`); a shallow clone says "no history". |
| `video-status.mjs` | Where each video's team run stands, read from the files the production team writes. |

## Faceless videos (voice, visuals, facts)
| Script | Does |
|---|---|
| `voice-video.mjs` | Voices an approved script and lays down the files MortgageReel needs (also `--listing`). |
| `generate-voiceover.mjs` | MP3 voiceover through the ElevenLabs API (paid; confirm cost first). |
| `spend.mjs` | Spend guard for `voice-video.mjs`: a paid engine or fal.ai images need a `--dry-run` estimate, and the script may not grow more than 50% past it. |
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
| `check-schema.mjs <slug>` | `edit.json` against the MortgageReel schema; prints frames and seconds. `FINHUB_GL` sets the browser's `gl` (CI: `swangle`), `FINHUB_SCHEMA_LOG=verbose` prints the browser's own stderr (an invalid value of either: one line, then the default); the CI probe runs it on `fixtures/schema-probe` | local |
| `check-speech-cuts.mjs <slug>` | Speech lost or doubled at the automatic cuts and chapter joins, before the first render | local |
| `check-pacing.mjs <slug>` | Rule 5b: a visual change every 1.5-3 s | local |
| `check-golden.mjs [slug]` | `golden.ts` layout rules (synthetic without a slug) | **test** |
| `check-caption-pages.mjs [slug]` | `captionPages.ts` | **test** |
| `check-sweep.mjs` | `sweep-render.mjs` frame budget and parsing; `--out` only inside `out/`; end to end when ffmpeg is on PATH | **test** |
| `check-video-status.mjs` | `video-status.mjs` on synthetic runs | **test** |
| `check-library.mjs` | `library.mjs` and library-first routing | **test** |
| `preflight.mjs` (no slug) | The Vietnamese font-subset gate every render runs first | **test** |
| `check-preflight.mjs` | `preflight.mjs <slug> --public-dir` on a fixture: pacing auto blocks, a schema-invalid `edit.json` blocks (check-pacing names the field; check-schema too when its browser runs), gaps only warn, a valid one passes. A browser that cannot run for `check-schema` (download refused, "Target closed" on GitHub's Windows runner) only WARNS in preflight (the render checks the same schema); stand-in scripts via `PREFLIGHT_CHECK_SCHEMA` prove each kind of failure is classified; a non-TypeError in preflight's own checks crashes as itself; check-schema's invalid `FINHUB_GL`/`FINHUB_SCHEMA_LOG` falls back, and its two value lists equal the installed `@remotion/renderer`'s (`validOpenGlRenderers`, `logLevels`). Cases needing the real browser print SKIPPED and the run says INCOMPLETE (a GitHub warning annotation in CI, never `ok`) | **test** |
| `check-clips.py`, `check-reframe.py`, `check-migrate-assets.py`, `check-render-video.py` | `prep-video.py --clips` and a prep resumed after a failed transcription (only for the same file and `--no-clean`, from `source.from.json`; another video with the same frame count is refused), `reframe.py` maths, `migrate-assets.py`, `render-video.py`'s stamp (still written when listing the outputs fails, also by a probe's SystemExit; not marked when the inputs hash fails) and its exit-4 `--claim` command, and listing-render's (standard library only; run by the `checks` job in CI after `setup-python` and by `npm run test:py`, not by `npm test`; `research.py selftest` and `omnivoice-tts.py selftest` too) | ci |
| `check-spoken-phrases.mjs <slug>` | Advisory, always exit 0: RG 234 watch phrases spoken in `words.json` (syllables joined and folded), with times, for the compliance reviewer's verify list | local |
| `check-agents-split.mjs` | One-time WP9 `AGENTS.md` split (needs full git history) | local |
| `check-captions.mjs`, `check-caption-fixes.mjs` | Shared caption layer; caption slip fixes in `timeline.ts` | **test** |
| `check-contrast.mjs --selftest` | Text legibility of every design, after its own ratio and chart-fill self-test | **test** |
| `check-text-size.mjs [id ...]` | Ratchet: `fontSize` literals under `MIN_TEXT_PX` (30 px, about 11 pt on a phone) may not exceed `config/text-size-baseline.json` per design; `--update-baseline` lowers it (with design ids: only theirs); ternary (also in parentheses) and multi-line values are read, comments and `12 * scale` are not, a built-in fixture fails the run if the scanner finds nothing; sizes computed at run time are not seen; promote-design prints the count | **test** |
| `check-selector.mjs` | `select-template.mjs` ranking; every design has a manifest; nothing fits = a stop, not `pick: null` | **test** |
| `check-element-copy.mjs` | RG 234 scan of text in `src/elements/` | **test** |
| `check-facts.mjs`, `check-visuals.mjs` | `facts.mjs`; the AI judge's pure parts, the stock relevance guard, the fal.ai call buying `aiStillsPerScene()` stills, `AI_CANDIDATES` parsing, and a `voice-video --dry-run` (from a temp copy with a fixture `.env.local`) whose `spend-estimate.json` counts scenes x stills | **test** |
| `check-listing-compliance.mjs`, `check-listing-prep.mjs` | Listing compliance rules and the price-line floor ("$1.2 million", also in the copy and listing.txt); listing parsing; CLI slugs (`assertSlug`) against every real folder, and every slug entry point still calls it | **test** |
| `check-numbers-kit.mjs` | Numbers-kit cues in `schema.ts`; RG 234 scan of NFD / odd-whitespace / zero-width copy and `captionFixes[].to` | **test** |
| `check-promote.mjs`, `check-publish.mjs` | `promote-design.mjs` (nothing written when a check fails), `publish-video.mjs` and publish-listing's stale-render refusal on fixtures (a post-only edit publishes, an on-screen edit stops, `--stale-ok` overrides), and publish-video never replacing another slug's same-title files (titles compared case- and NFC-folded; a broken `.publish-slugs.json` stops it; the record is written through a temp file before the copy; Windows reserved names; unowned older files only with `--claim` (exit 4), and `--claim` never over a recorded owner; two publishes at once keep both owners, and of two videos with one new title published at once exactly one wins; a stale lock is taken over; publish-listing the same, end to end with `--public-dir`/`--renders`/`--out` (an owned re-render with `--force` alone); a `rendering` stamp refused even with `--stale-ok`); report-promotion-drift's pure parts (a linked worktree's absolute shallow path) | **test** |
| `timeline.selftest.mjs` | Pins what `timeline.ts` does: cuts, pacing, chapter overlap, time maps | **test** |
| `check-pacing.selftest.mjs`, `check-speech-cuts.selftest.mjs` | The two checks above, on synthetic data | **test** |
| `check-scripts-index.mjs` | Every file in this folder is listed in this README, and the **test** marks here match `npm test` | **test** |
| `check-teams.mjs` | Every design is in exactly one style team (`config/style-teams.json`); team agents and skills exist and are wired; AGENTS.md read-list byte counts within 15% of the files; `docs/agents/team-runs.md` rows: `in progress` / `pending` only in the last row | **test** |

## Tooling (rarely run)
| Script | Does |
|---|---|
| `vendor-skills.mjs`, `vendor-elements.mjs`, `build-chat-skill.mjs` | Re-vendor Remotion skills and the Elements library; build the claude.ai skill zip. |
| `generate-sample-media.mjs`, `fetch-noto-emoji.mjs` | Regenerate sample clips; fetch Noto animated emoji. |
| `renderer-apis.mjs` | Exercises the Node-side Remotion APIs that cannot run inside a scene. |
| `tmp-dir.mjs` | Temp folders inside the repo (`node_modules/.cache/finhub-tmp`) so esbuild bundles resolve `remotion`; use it instead of `os.tmpdir()`. |
| `third_party/` | Licence text for borrowed code (HyperFrames, Apache-2.0). |
| `fixtures/` | Media-free fixtures: `schema-probe/` is a video `check-schema.mjs` accepts with no recording (quick mode), for the CI probe step. |
