# finhub-video

Finance Hub's video editor. You record a talking-head video and drop it in a folder. Claude Code turns it into a finished social video: bad takes cut out, the background removed, captions, a hook, charts for the numbers, bank logos, compliance checked. You get back a 9:16 Reel/TikTok, a 4:5 Facebook-feed copy, a mobile copy, a thumbnail and subtitles.

It is built on [Remotion](https://www.remotion.dev) (videos written as React code). You never need to touch the code. The editing happens in a Claude Code chat.

---

## The short version

1. **Record** your video (phone is fine, vertical, face in the middle) and copy it into the **`1 - PUT FOOTAGE HERE`** folder.
2. **Tell Claude** in this repo's chat, for example:
   > Edit my new video `phi-ngan-hang.mp4` in the footage folder, use the newsroom template.
3. **Watch** what Claude sends back and ask for changes in plain words ("hook too long", "cut the part about stamp duty", "use datalab instead").
4. **Post** from the **`2 - FINISHED VIDEOS`** folder: `<Topic>.mp4` and `<Topic> - caption.txt` (the caption, your contact details, 7 hashtags, then the licence and disclaimer footer). The other sizes stay in `out/videos/<slug>/`.

Claude runs every step below for you. The rest of this page covers what those steps are and how to run them by hand.

---

## One-time setup

| Need | Why | Check it with |
|---|---|---|
| Node.js 18+ | Remotion, Studio, rendering | `node -v` |
| Python 3.10+ with `faster-whisper` | the Vietnamese transcript | `python -c "import faster_whisper"` |
| `python -m pip install yt-dlp feedparser` | research and trending topics for faceless scripts (`npm run research -- trending`; a YouTube video with no captions is transcribed with faster-whisper) | `npm run research -- selftest` |
| ffmpeg + ffprobe on PATH | proxy, audio clean-up, final mix | `ffmpeg -version` |
| Claude desktop app (Code tab) | the editor, plus the browser used for background removal (needs WebGPU) | — |

Then, once, in this folder:

```bash
npm i
```

---

## Step by step (what Claude does, or what you run)

Every recording is kept once in `public/recordings/<id>/`, and every video made from it has its own folder `public/videos/<slug>/`, where the slug is a short name like `ty-do`. A second design of the same recording is a new slug whose `edit.json` names the same recording, with no second copy of the files. The code never changes per video.

```
public/recordings/<id>/
  source.mp4        the cleaned-up proxy of your recording   (not in Git)
  foreground.webm   you, cut out of the room                  (not in Git)
  words.json        word-by-word transcript with timings

public/videos/<slug>/
  edit.json         every editing decision for this video; "source" names the recording
```

Videos made before this layout keep everything in `public/videos/<slug>/` until `python scripts/migrate-assets.py` (a dry run; add `--apply` to do it) moves each recording into `public/recordings/` once. Faceless videos always keep their files in their own folder.

### 1. Prepare the recording

```bash
python scripts/prep-video.py "C:\path\to\recording.mp4" my-slug
```

This makes `public/recordings/my-slug/source.mp4` (voice cleaned up; add `--no-clean` for a studio recording; a landscape recording is cropped to 9:16 around your face, so `pip install opencv-python-headless` once if you ever record sideways), transcribes it into `words.json` next to it, prints a table of each sentence's pace, and writes a starter `edit.json`. Transcription is slow on CPU and prints its progress as it goes.

### 2. Remove the background (always on)

Every template shows you cut out over its own backdrop, so each recording needs `foreground.webm` (made once; every video of that recording uses it):

```bash
npm run review
```

Then open `http://localhost:4100/matte.html?slug=my-slug` in the Claude app's browser and wait for **Saved**. It takes about **13× the video's length** (a 3½-minute video took about 45 minutes). The first run downloads a 26 MB model. The render refuses to start without this file.

**Quick mode** (only when you ask for it): `"background": "vignette"` in `edit.json` skips this step. You stay bright in the centre of the full frame and the room fades to black at the edges. Use it for time-sensitive videos (rate or RBA news) or a recording with no cut-out yet; sit centred when you record, and check the room shows nothing private.

### 3. Edit: `edit.json`

Claude writes this file from the transcript. Its main fields (the full list is in [`src/mortgage/schema.ts`](src/mortgage/schema.ts)):

| Field | What it does |
|---|---|
| `design` | which template to use (see the list below; default `classic`) |
| `title`, `subtitle`, `coverFrameMs` | the cover card and which frame of you it shows |
| `hook` | the big line in the first 3½ seconds, e.g. `"4,1 TỶ ĐÔ"` counting up |
| `remove` | spans to cut, `[startMs, endMs]` in your recording's time |
| `cut` | automatic cuts, all on by default: ờ/ừm, stutters, swear words |
| `keywords` | words to highlight in the captions |
| `chapters` | section titles and where they start |
| `stats` | numbers to show as charts or cards (numbers you *say* are also picked up automatically) |
| `cues` | on-screen panels: checklists, comparisons, callouts |
| `music` | a track under `public/music/`, its volume and where to start it (`node scripts/music-start.mjs public/music/<file>` finds where the track gets going; licensed tracks only) |
| `cta` | the one call to action at the end |

Bank logos appear by themselves when you name a bank (CommBank, Westpac, ANZ, NAB, St.George, Bankwest, Firstmac have real logos; other banks get a name badge). To add a logo, put the file in `public/lenders/` and ask Claude to wire it in.

### 4. Preview and tweak

- **Review page** (`npm run review`, then open http://localhost:4100/): watch the video exactly as it will render, switch template and colour grade, drag chapters/stats/cues/B-roll along the timeline (they snap to each other and the playhead; zoom with Ctrl + wheel; Ctrl+Z undoes; Space plays, arrow keys nudge the selected item), then **Save** and **Render video**. Wording isn't editable here on purpose. Change text through Claude so it gets the compliance check.
- **Remotion Studio** (`npm run dev`, http://localhost:3000): the developer view. Open `MortgageReel` and set `slug` (and `design` to try another template without changing `edit.json`).

### 5. Render

```bash
python scripts/render-video.py my-slug
```

This writes to `out/videos/my-slug/`:

| File | Use it for |
|---|---|
| `my-slug.mp4` | 1080×1920 master: Reels, TikTok, Shorts, Stories |
| `my-slug-feed.mp4` | 1080×1350 (4:5): the Facebook/Instagram feed |
| `my-slug-mobile.mp4` | 720×1280, about 27 MB: sending by message |
| `thumbnail.png` | the cover card |
| `my-slug.srt` | subtitles to upload alongside |

The sound is set to −14 LUFS, the level Facebook, YouTube and TikTok play at.

Before rendering, `node scripts/export-srt.mjs my-slug` lists every automatic cut so you can check nothing important was removed. After it, `out/videos/my-slug/team/qc/sweep/` holds one small picture per visual change in the finished video, and contact sheets (`sheet-01.jpg`, …) that tile them 12 to an image with their times; Claude looks at every one before handing the video back.

---

## Global RE listing videos

Property-listing videos for Global RE, a separate business with its own folders:

1. **Copy** `3 - GLOBAL RE LISTINGS/_TEMPLATE` to a folder named after the property, fill in its `listing.txt` (Vietnamese + English labels, one "Label: value" per line) and put the photos next to it.
2. **Ask** in the chat: "make the Global RE video for <street>". Claude checks the details, looks at every photo, writes the script and sends it to you; nothing is voiced until you approve.
3. **Post** from `4 - GLOBAL RE FINISHED VIDEOS`: a Vietnamese-voice and an English-voice video (9:16 and a 4:5 feed copy each) and `<Topic> - caption.txt`. A file starting "TEST - " is not ready to post.

How it works: [docs/agents/listing-video.md](docs/agents/listing-video.md).

---

## Faceless videos (voiceover, no recording)

Give Claude a document (a lender policy update, an RBA announcement, a fact sheet; never a client's file) and ask for a faceless video.

1. **Script.** Claude writes `public/videos/<slug>/script.json`: a title and scenes, each with the Vietnamese narration (`vi`) and an English line (`en`).
2. **Approve.** Claude runs `node scripts/voice-video.mjs <slug> --dry-run`, which checks RG 234 and counts the characters to voice, then sends you the script. Nothing is voiced until you approve.
3. **Voice.** `node scripts/voice-video.mjs <slug>` voices each scene with **Google's male voice Charon** (Gemini text-to-speech, `GEMINI_API_KEY` in `.env.local`; the same voice as the policy videos), and makes the files the template needs: `source.mp4` (the narration), a transparent `foreground.webm` (no one on screen), `words.json` (word timings) and a starter `edit.json` with `"design": "faceless"`. Scenes already voiced are cached, so changing one scene only re-voices that scene. Add `--engine omnivoice` for a cloned voice (see "Clone your voice" below) or `--engine elevenlabs` for ElevenLabs. Every Charon take is checked: one cut short by Google is deleted and the run stops, so re-running voices it again. Gemini allows 50 (pro) + 100 (flash) takes a day, one per scene.
4. **Edit and render** exactly as for a recorded video: Claude adds the hook, chapters and stats to `edit.json`, then runs `python scripts/render-video.py <slug>`.

The `faceless` design fills the middle of the screen:
- big captions by default;
- a counting ring chart when a number is spoken;
- the bank's logo when a bank is named;
- the English line along the bottom.

### Clone your voice (OmniVoice, `--engine omnivoice`)

Faceless videos can speak in **your own voice**. [OmniVoice](https://github.com/k2-fsa/OmniVoice) (Apache 2.0, bundled in `vendor/OmniVoice` as a git submodule) learns a voice from a few seconds of a recording and speaks Vietnamese, locally and free. It runs on the computer's CPU: about 20× slower than real time, so a 60-second video takes about 20 minutes to voice. Changing one scene later only re-voices that scene.

**1. Set up once** (needs Python 3.10+, ffmpeg and about 10 GB of disk):

```bash
npm run setup-voice
```

It fetches `vendor/OmniVoice` if needed, makes `.omnivoice/venv` (git-ignored), installs OmniVoice with faster-whisper, downloads the models and checks they load. Re-running it is safe.

**2. Clone a voice** from any video or audio of the person talking (10 s or more of clear speech):

```bash
npm run clone-voice -- path/to/recording.mp4 --name daniel --consent
```

It picks the clearest 6–10 s sentence, transcribes it and saves `~/.finhub-voice/daniel.pt`, plus `daniel.wav` (the clip it learned from) and `daniel-sample.wav`. **Listen to the sample.** If it doesn't sound right, try a cleaner recording: one speaker, no music, a quiet room.

**3. Voice a video:** `node scripts/voice-video.mjs <slug> --engine omnivoice` uses your profile automatically when it's the only one; with several, add `--voice <name>` (or `"voiceProfile": "<name>"` in script.json).

**Consent and privacy.** Only clone your own voice, or a voice whose owner gave you written permission: `--consent` confirms that, and nothing is cloned without it. A profile is a reusable copy of someone's voice, so profiles live in `~/.finhub-voice/`, never in this public repository (the scripts refuse one inside it), and voiced audio (`public/videos/*/voice/`) is git-ignored. Say in each post that the voice is AI-generated.

Optional `.env.local` settings: `OMNIVOICE_STEPS` (quality: 32 by default; 64 is about twice as slow), `OMNIVOICE_PYTHON` and `OMNIVOICE_VOICE` (other locations).

### Voice and footage keys

They need `.env.local` in this folder (never committed; create it yourself):

```dotenv
GEMINI_API_KEY=your-key     # the Charon voice (default engine)
ELEVENLABS_API_KEY=your-key # only for --engine elevenlabs
ELEVENLABS_VOICE_LIBRARY=sbaSITtJLv4yb3vIi67Z
PIXABAY_API_KEY=your-pixabay-key # stock footage, tried first (pixabay.com/api/docs)
PEXELS_API_KEY=your-pexels-key   # stock footage, second choice (pexels.com/api)
FAL_KEY=your-fal-key             # AI images for gaps stock can't fill (fal.ai)
AI_CANDIDATES=3                  # optional: AI stills per scene for Gemini to choose from (1 = no judging)
CLIP_MIN=0.22                    # optional: how much a stock clip must look like its phrase (0 = off)
```

For a gap scene, use `"footage"` (a 2–5 word stock search; the hits are re-ranked by how much their thumbnail looks like the phrase, with a one-off 350 MB model download the first time) or `"ai"` (an image description; three fal.ai FLUX images at about US$0.03 each, and Gemini picks the best; `AI_CANDIDATES=1` in `.env.local` for one), never both.

**Elements first, footage fills the gaps.**
- **Elements** carry data, comparisons and key points. They are charts, `compare` / `bars` / `points` panels and bank logos.
- **Footage** fills the other scenes. Give only those scenes a short English `"footage"` search, such as `"house keys couple"`. Portrait Pexels clips then play behind the captions, tinted navy, changing at least every 5 s.
- **Veil:** a navy veil hides the footage whenever an element is on screen.
- **Library:** every clip and AI image is saved once in `public/library/` and reused by keyword before any new download (`node scripts/library.mjs find <words>`, `stats`); `voice/footage/` keeps only the search results.

**Post copy.** The `"post"` field holds a title, a caption and 7 hashtags (#finhub, #vietnamese + 5) for the upload; the render turns it into `2 - FINISHED VIDEOS/<title> - caption.txt` with your details and the compliance footer added.

The rules Claude follows when writing the script are in `.claude/skills/vietnamese-finance-video-editor/references/faceless-script.md`.

A `"voice"` in `script.json` overrides the voice for one video.

## The templates

Set with `"design": "<id>"` in `edit.json`, or just tell Claude which one.

| id | Best for |
|---|---|
| `classic` | the original look; safe default |
| `studio` | broadcast studio: lower thirds, moving pills |
| `explainer` | teaching at a whiteboard |
| `newsroom` | rate moves, fees, market news, with a "breaking news" bar and a number ticker |
| `datalab` | number-heavy videos; the chart takes the stage |
| `chatstory` | "a client asked me…" questions, told as a text-message chat |
| `editorial` | opinion and deep dives, in a magazine-cover style |
| `neon` | short, punchy "3 things to know" Reels; the fastest pace |
| `reaction` | reacting to a news story, policy or document |
| `checklist` | step-by-step processes ("5 steps, don't skip one") |
| `scenario` | "if… then…": option A vs option B side by side |
| `kitchen` | warm, slow, personal stories |
| `series` | a numbered episode in a recurring series |

Every template follows the same golden rules, enforced in [`src/mortgage/golden.ts`](src/mortgage/golden.ts):

- A number you say gets a chart or card.
- Keywords are highlighted.
- A bank you name gets its logo.
- The background is always removed, unless you opt into quick mode (dark edges instead).
- Charts sit *behind* you, never over your face.
- The Finance Hub logo pops in after the hook and again in the last 10 seconds.
- Nothing important leaves the 9:16 or 4:5 safe zones.
- Something changes on screen every 1.5–3 seconds, but a card or number stays up long enough to read (motion inside it carries the change).
- Captions are readable with the sound off.

`node scripts/check-golden.mjs my-slug` shows which numbers and banks it found in a video.

---

## Where is each video up to?

```bash
npm run video-status
npm run video-status -- <slug>
```

The first lists every video and where it stands (done, next step, or waiting for you). The
second checks one video can run (ffmpeg, the recording, the edit) and gives the one-line fix
for anything blocking it. Both are free and change nothing.

## Teaching Claude your taste

Say what's wrong in plain words ("text too small", "that panel covers my head", "too
busy"). Claude fixes this video and writes your correction down as a rule for every future
video, in [corrections.md](.claude/skills/vietnamese-finance-video-editor/references/corrections.md).
Every session reads it before editing, and QC checks each video against it.

A correction gets stronger each time it proves itself:

| Stage | What it means |
|---|---|
| `noted` | Said once; written in the log. |
| `rule` | Said twice, or you said "always"/"never"; it's now in the design rules. |
| `checked` | A script fails the video if it's broken, so it can't slip back. |

Claude tells you in its report what it logged. If you change your mind, say so: the old
rule is marked replaced, not deleted, so it can't come back. The rules sit on a
professional baseline (hook in 3 s, captions carry the message with the sound off, the
voice louder than the music, one thing on screen at a time); see "Craft rules" in
[editing-principles.md](.claude/skills/vietnamese-finance-video-editor/references/editing-principles.md).

## Compliance

Every piece of on-screen text is scanned for ASIC RG 234 banned terms before a render. A video that fails won't render until the wording is fixed. Bank logos are shown only when the bank is mentioned and never suggest the bank endorses the video. Use synthetic numbers in examples, never a real client's.

---

## Working with Claude

This project is set up for all three Claude surfaces:

**Claude Code** (CLI, web, IDE, desktop app): open this folder. [CLAUDE.md](CLAUDE.md)/[AGENTS.md](AGENTS.md) and the skills in `.claude/skills/` load automatically, including `vietnamese-finance-video-editor`, which runs the steps above. [`src/designs/README.md`](src/designs/README.md) is the brief for building a new template.

**Claude Cowork** (desktop app): open this repository's folder as the working folder. Cowork reads the same `CLAUDE.md` and `.claude/skills/` and can run the preview and render commands.

**Claude Chat** (claude.ai): chat has no filesystem, so upload the bundled skill instead. Build `remotion-video-skill.zip`, then upload it under claude.ai **Settings → Capabilities → Skills**:

```bash
node scripts/build-chat-skill.mjs
```

Chat can then write complete composition files for this project. Preview and render them in Claude Code, Cowork or a terminal. The script keeps the zip within claude.ai's limits (at most 200 entries, one `SKILL.md`).

The Remotion skills in `.claude/skills/` are vendored by `node scripts/vendor-skills.mjs`. Re-run it after `npx remotion upgrade`, then rebuild the bundle.

---

## Other commands

```bash
npm run lint
```

Runs ESLint and the TypeScript check. Run it before committing.

```bash
npx remotion upgrade
```

Upgrades Remotion. All `@remotion/*` packages stay on one version.

When something goes wrong, [`docs/agents/rendering-without-gpu.md`](docs/agents/rendering-without-gpu.md) (routed from [`AGENTS.md`](AGENTS.md)) and `.claude/skills/vietnamese-finance-video-editor/references/landmines.md` hold the known pitfalls.

Remotion needs a company licence for some organisations: [terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
