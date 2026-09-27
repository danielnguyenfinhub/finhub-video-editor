---
name: globalre-listing-video
description: >-
  Makes Global RE's faceless property-listing videos (Global RE is Daniel's real estate partner,
  a separate business from Finance Hub): the agent's folder of photos + listing.txt becomes a
  Vietnamese and an English video with a room-by-room photo tour, key facts, price, location,
  the full address, the agent card and the NSW legal end card, plus a caption file. ALWAYS use
  when Daniel says: "make a listing video", "Global RE video", "video for this listing",
  "property video", "listing in the Global RE folder", "làm video nhà", "video Global RE",
  "redo the listing script", "re-render the listing", "change the listing voice". Output: two
  mp4s + feed copies + caption.txt in "4 - GLOBAL RE FINISHED VIDEOS", and a verify list.
  NOT for Finance Hub videos (video-production-team, vietnamese-finance-video-editor,
  finhub-policy-video), which go to "2 - FINISHED VIDEOS".
---

# Global RE listing video

**User story:** Daniel says "make the Global RE video for <street>" and gets two finished
listing videos (Vietnamese voice + English subtitles, English voice + Vietnamese subtitles)
and a caption file in `4 - GLOBAL RE FINISHED VIDEOS/`, having approved only the script.

Pipeline, commands and rules: `docs/agents/listing-video.md`. Writing standard for the
script: `references/listing-script.md`. Read both before the first step.

## Steps

1. **Prep.** `npm run listing -- "<folder>"` (folder in `3 - GLOBAL RE LISTINGS/`). Fix what it
   reports by telling Daniel which line of listing.txt is wrong; never edit a real listing's
   facts yourself.
2. **Look at every photo** (Read each `public/listings/<slug>/photos/NN.jpg`; a 640 px copy is
   enough). Note what is visibly there, the tour order, a focus point per photo, and anything
   that looks virtually staged, a duplicate room, or a street number visible early.
3. **Write `script.json`** to `references/listing-script.md`, then
   `node scripts/voice-video.mjs <slug> --listing --dry-run`. Rewrite every flagged line.
4. **Gate: Daniel approves the script** (send it as a readable VI / EN list with the
   "to confirm with the agent" and "TEST only" lines). Nothing is voiced before this.
5. **Voice** both: `node scripts/voice-video.mjs <slug> --listing --lang vi`, then `--lang en`.
   Gemini is free within its daily limit; on HTTP 429 at both models, stop and report. Never
   switch to a paid engine on your own. "take(s) … read its style prompt aloud" or "no audio":
   re-run the same command (only those takes are voiced again).
6. **Stills**: `node scripts/listing-stills.mjs <slug> --lang vi` (and `en`): one frame in
   every scene. Check: no text on text, no stretched photo,
   captions inside y 420–1473, logo sharp, agent face not cropped, callout on the right thing.
   Fix, then re-check the frames you touched.
7. **Render**: `npm run listing-render -- <slug>`. It runs the compliance guard and preflight
   first and publishes to `4 - GLOBAL RE FINISHED VIDEOS/`.
8. **Report**: the two video paths, the verify list (items to confirm with the agent, TEST
   blockers, anything guessed from a photo).

## Iron rules

> ⚑ IRON RULE: every claim comes from listing.txt or is visible in the photo. No invented
> features, sizes, distances, schools, views, "renovated", "brand new", returns, growth or
> price hints. The price is shown exactly as advertised.

> ⚑ IRON RULE: never add an exemption or reword around a rule to pass the compliance guard;
> rewrite the line. A real listing's facts are changed only by the agent, in listing.txt.

> ⚑ IRON RULE: listings, photos, voice and videos never go into git (public repo). Only
> `_TEMPLATE/` and the folder READMEs are tracked.

Bail-out: if the photos don't match the listing (another property, a floor plan for a
different layout), or the home is tenanted without photo consent, stop and tell Daniel.

## Anti-patterns

| Anti-pattern | Why it fails | Correct behaviour |
|---|---|---|
| Writing lines from the listing text without opening the photos | The picture and the words disagree on screen | Read every photo; each scene's words describe that photo |
| Street or number in the intro | Daniel's brief: suburb only until the address reveal | Intro names the suburb; the full address comes at the end |
| "Walk to", "close to", "minutes from" | NSW Fair Trading wants measured distances; the guard blocks them | Use only the agent's "Nearby" items, in km or metres |
| Calling a staged room something the floor plan doesn't have | Misleading (ACL s 18) | Describe the room the plan shows; skip a restaged duplicate |
| Voicing before Daniel approves | Spends the daily TTS quota on a script that changes | Dry run, approval, then voice |
| Posting a "TEST - " file | Unknown estimated price or tenant status can't be checked | Fill in listing.txt, re-prep, re-render |
| Spelling the brand for the voice in script.json | Captions then show "Glô-bồ A Ri" | Keep "Global RE"; `voice.spokenName` handles speech |
