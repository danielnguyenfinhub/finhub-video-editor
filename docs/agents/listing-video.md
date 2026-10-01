# Global RE listing videos

Part of the project guide; [AGENTS.md](../../AGENTS.md) is the core and routes here. The skill that runs it: `.claude/skills/globalre-listing-video/`.

**User story:** Deric (Global RE's agent) drops a folder with `listing.txt` and the photos; Daniel says "make the Global RE video for <street>" and gets a Vietnamese and an English listing video plus a caption file in `4 - GLOBAL RE FINISHED VIDEOS/`, ready to post.

Global RE is a separate business from Finance Hub: its own composition (`ListingReel`, `src/listing/`), config (`config/businesses/globalre.json`), compliance guard and folders. Never touch `src/mortgage` (FinHub's locked core) for it; importing its helpers is fine.

## Pipeline

| Step | Command | Writes |
|---|---|---|
| 1. Prep | `npm run listing -- "<folder in 3 - GLOBAL RE LISTINGS>"` | `public/listings/<slug>/listing.json`, `photos/NN.jpg` (tour order, EXIF-rotated, 2160 px) |
| 2. Script | Claude writes `script.json` after looking at every photo (skill `references/listing-script.md`) | `public/listings/<slug>/script.json` |
| 3. Check | `node scripts/voice-video.mjs <slug> --listing --dry-run` | nothing: scenes, character count, compliance, what to confirm |
| 4. Voice | `node scripts/voice-video.mjs <slug> --listing --lang vi` and `--lang en` | `voice/narration-<lang>.wav`, `words-<lang>.json`, `timeline-<lang>.json` |
| 5. Stills | `node scripts/listing-stills.mjs <slug> --lang vi` (one per scene, bundled once; `--at 0.3` for earlier in each scene) | `out/listings/<slug>/stills-<lang>/` |
| 6. Render | `npm run listing-render -- <slug>` | `out/listings/<slug>/` (full, `-mobile`, `-feed` 4:5, thumbnail, `.srt` per language), then `4 - GLOBAL RE FINISHED VIDEOS/`. Exit 3 = rendered, not published (compliance flag, a post problem, or a language whose on-screen inputs changed since its render; `--stale-ok` overrides): fix it and run the printed publish command, don't re-render. The `post` (title, caption, hashtags) is upload copy, not on screen, so a post fix never makes a render stale; an edit to the scenes, `listing.json` or the words does (each render's `<slug>-<lang>.inputs` hash). A render made before the stamp existed has none and is judged by file times: after a post-only fix to one, publish with `--stale-ok` (or re-render once) |

`<slug>` = street + suburb, e.g. `100-derria-street-canley-heights`. Everything under `public/listings/` and the two Global RE folders is git-ignored except the folder READMEs and `_TEMPLATE/`: listings are real client material and the repo is public.

## listing.txt

Bilingual "Label: value" lines, `- item` lists, `#` notes (`3 - GLOBAL RE LISTINGS/_TEMPLATE/listing.txt`). `scripts/listing-prep.mjs` names the line of every mistake in Vietnamese and English; its self-check is `node scripts/check-listing-prep.mjs`. Rules it enforces (sources: [real-estate-compliance](real-estate-compliance.md)):

- Sale price: a fixed price, a range no wider than 10% (PSAA s 72A), "Contact agent" or "Auction"; never "Offers over/above" or "$x+" (s 73(2)); never below the estimated selling price from the agency agreement (s 73(1)), which is required and never shown.
- Rent: one fixed weekly rent (RTA s 22A).
- Tenanted yes/no; if yes, the tenant's photo consent (RTA ss 55AA, 55A). No consent blocks voicing and rendering.
- "unknown" is accepted for tenanted and the estimated selling price: the render then carries a TEST watermark, its files start "TEST - ", and it must not be posted. A folder named `_TEST ...` is a pipeline test and is marked the same way.
- The estimated selling price is stored in the git-ignored listing.json only (`estimatedSellingPrice`), never shown or said; the guard rejects any figure in the copy below it.
- Edited photos (or `all`): each is labelled "Hình ảnh dàn dựng ảo / Virtually staged" on screen.
- Material facts to disclose (PSAR s 60): shown on the end card and in the caption.
- Car spaces and sizes are optional; a missing one is left off the facts card.

## Compliance

`scripts/listing-compliance.mjs <slug>` runs every spoken line, subtitle, highlight, post field, on-screen listing field and fixed string (`src/listing/copy.ts`, `rooms.ts`) through `checkListingCopy` (`src/listing/compliance.ts`), which calls the rule set in `src/listing/compliance-rules.ts`. Any "block" hit, and any "flag" hit, stops the run: rewrite the line; there is no exemption list. One allowance: a "flag" word the agent's own key features state ("brand new") passes and is listed as "to confirm with the agent before posting". The voice step, the render and the publish step all run it.

## Voice

Engine, Gemini voice, per-language style prompt and the spoken brand form live in `config/businesses/globalre.json` `"voice"`. "Global RE" stays "Global RE" in the script and on screen; `spokenName` (`vi` "Glô-bồ A Ri", `en` "Global R.E.") replaces it just before TTS and the caption words are mapped back. Models: `gemini-2.5-pro-preview-tts`, then `gemini-2.5-flash-preview-tts` at the daily cap (not 3.x: it reads the style prompt aloud). A take that comes back with no audio is retried three times, then on the next model. Every take is trimmed of leading/trailing silence, and a take whose timing pass hears words before the script (the model read its style prompt aloud: seen on both models, 28/09/2026) is deleted and the run stops: re-run until it finishes (each retry costs one take of the daily quota). Never have the voice read a phone number: Gemini refuses those lines (finishReason OTHER); say "the number on screen" and let the agent card show it.

## ListingReel

`src/listing/ListingReel.tsx`, registered as `ListingReel` (1080x1920, 30 fps, props `{slug, lang}`; `slug: ""` shows a placeholder so `remotion compositions` works on a fresh clone). `calculateMetadata` loads the four JSON files, checks the licence expiry and tenant consent, and sizes the video to the voice. Scene kinds: `intro`, `photo` (id = room: `rooms.ts`; `floorplan` is shown whole on paper), `facts`, `price`, `location` (MapTiler map if `REMOTION_MAPTILER_KEY` and a confident suburb geocode, else a drawn locator), `address`, `agent`, `disclaimer`. Text stays inside the 4:5 band (x 54–960, y 420–1473); cards end at y 1150 so captions never sit on text.
