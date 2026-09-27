# Editing Principles — Vietnamese Finance Talking-Head Videos

## Contents

- Craft rules: what professional editors check (and where this repo does it)
- Who this is for
- 0. Project setup (once per project)
- 1. Transcribe (Vietnamese)
- 2. Clean-up pass: remove filler words, false starts, repetition
- 3. Vietnamese subtitles (burned-in, attention-optimized)
- 4. Overlay images, B-roll, and lower-thirds
- 5. Transitions
- 6. Hook and pacing checklist (apply before finalizing)
- 7. Render
- Quick reference: key Remotion docs used by this skill

The general editing craft behind the template (moved unchanged from the original SKILL.md, 2026-09-24).

## Craft rules: what professional editors check (and where this repo does it)

The baseline every video meets before Daniel sees it; his own corrections sit on top in
`corrections.md`. When two rules pull against each other, keep the higher one (Walter
Murch's order: emotion, then story, then rhythm, then where the eye is, then layout).

1. **Message first.** A cut, card or effect earns its place only if the viewer understands
   or feels the point better. Here: one point per video, the compliance card, and the Self-
   Correction Loop's "every effect sits on a signature moment or makes a point clearer".
2. **Hook in 3 s, promise by 5 s.** Most viewers decide in 2–3 s; see and read the point,
   not only hear it. Here: `edit.json` `hook`, golden rule 6.
3. **Muted viewing is the default.** Most short video is watched without sound, so the
   captions carry the whole message, in chunks of a few words. Here: `PagedCaptions`,
   keywords lit (golden rule 5). QC watches the stills as if muted.
4. **Change the picture every 2–3 s, but let text be read.** A punch-in, a card or a word
   pop keeps attention; a number or card stays up for its reading time. Here: golden rule
   5b, `READING` in `golden.ts`.
5. **Cut on meaning, not on the clock.** Remove fillers, false starts and repeats; never cut
   inside a thought or change what a sentence means. Here: the paper edit
   (`video-story-editor`) and the auto-cut list read against the words.
6. **Hide a jump cut with a change of framing.** Two cuts at the same scale look like a
   glitch; alternate the zoom. Here: punch-in on cuts (golden rule 5b).
7. **Guide the eye.** One focal point at a time; a new element appears where the eye
   already is, never on the face, never two things fighting. Here: `FACE`, `SAFE`, golden
   rule 3b.
8. **The voice is king in the mix.** If you can follow the music while Daniel talks, the
   music is too loud. Here: music under speech at `MUSIC_VOLUME` (0.3), master at -14 LUFS
   (`render-video.py`).
9. **Sound leads the picture (J/L cuts).** Hearing the next line a beat before its picture
   smooths a cut. Not built here yet; a candidate if cuts feel choppy.
10. **Two last passes.** Watch muted (do the captions carry it?) and listen with eyes
    closed (are the cuts smooth?). Here: `video-qc` stills, and its re-transcription around
    each cut.
11. **End on one action.** One clear call to action, then contact. Here: `Outro`, the CTA
    in `edit.json`.

Sources: Walter Murch, *In the Blink of an Eye* ("rule of six",
https://www.studiobinder.com/blog/walter-murch-rule-of-six/); short-form retention
(https://www.capcut.com/create/short-form-video-hooks-first-3-second-patterns,
https://www.strategia-x.com/blog/2026-07-01-vertical-video-retention-editing-playbook/);
split edits (https://loopdesk.ai/blog/j-cut-and-l-cut-explained); dialogue vs music
(https://vidpros.com/fix-background-music-too-loud-video/).

# Vietnamese Finance/Mortgage Talking-Head Video Editor (Remotion)

## Who this is for
Daniel records himself talking to camera in Vietnamese about finance and mortgages.
The goal of every edit: **grab attention in the first 3 seconds, stay informative, look
polished.** Every decision below should serve that goal — cut ruthlessly, highlight the
money-facts, never let the video breathe too long without a visual change.

This skill assumes editing is done programmatically with **Remotion** (React-based video
framework, https://www.remotion.dev/docs/). Render output as MP4 with the Remotion CLI
(`npx remotion render`) after previewing in Remotion Studio (`npx remotion studio`).

---

## 0. Project setup (once per project)

```bash
npx create-video@latest --blank   # or --template=tiktok for a caption-first starter
cd <project>
npm i @remotion/captions @remotion/install-whisper-cpp @remotion/transitions @remotion/google-fonts @remotion/media-utils @remotion/openai-whisper
```

Recommended composition defaults for talking-head + subtitles: 1080x1920 (vertical, for
Reels/TikTok/Shorts) at 30fps, unless Daniel asks for 16:9 landscape.

Use `@remotion/google-fonts` and pick a font whose Google Fonts listing includes the
**`vietnamese` subset** so diacritics (ắ, ầ, ộ, ữ, …) render correctly. Good picks: `Be
Vietnam Pro` (built for Vietnamese), `Inter`, `Noto Sans`, `Montserrat`. Verify subset
support before committing to a font — do not assume, check the font's Google Fonts subset
list.

```tsx
import { loadFont } from "@remotion/google-fonts/BeVietnamPro";
const { fontFamily } = loadFont("normal", { subsets: ["vietnamese", "latin"] });
```

---

## 1. Transcribe (Vietnamese)

Use `@remotion/install-whisper-cpp` (local, offline, free) or `@remotion/openai-whisper`
(API-based) to transcribe. Both output Whisper JSON you convert to Remotion's `Caption[]`
format via `@remotion/captions`'s `convertToCaptions` helpers documented at
`/docs/captions/transcribing`.

- **Force the language**: pass `language: "vi"` (or `--language vi` for whisper-cpp CLI) —
  do not let Whisper auto-detect, Vietnamese is sometimes misdetected as a related language.
- Use the largest model that fits your time budget (`medium` or `large-v3`) for Vietnamese —
  smaller models make more mistakes on tonal languages.
- Get **word-level timestamps** (`word_timestamps: true` / `--split-on-word`) since keyword
  highlighting and filler-word removal both need word-level accuracy, not just sentence-level.

Output: a `Caption[]` array — each item `{ text, startMs, endMs, timestampMs, confidence }`.
Save this as JSON next to the source video; every later step reads/writes this same array.

---

## 2. Clean-up pass: remove filler words, false starts, repetition

This is a **content edit**, not just subtitle styling — cut segments must be physically
removed from both video and caption timeline, and the visual cut must be hidden or made
intentional so the video doesn't feel choppy.

### 2.1 Identify segments to cut
Walk the word-level `Caption[]` and flag spans to remove:

- **Vietnamese filler words / verbal tics**: à, ừ, ừm, ờ, thì, kiểu, kiểu như, đúng không,
  đúng không nào, thực ra thì, kiểu là, ờ thì, cái mà, rồi thì, nói chung là (when used as a
  meaningless tic, not meaningfully), and long "ơ...", "à..." elongated hesitation sounds.
- **False starts / self-corrections**: e.g. "lãi suất... à không, ý tôi là lãi suất cố định"
  → keep only the corrected version.
- **Repeated phrases**: the same sentence or clause said 2+ times in a row (common when
  someone restarts a take) — keep only the cleanest delivery.
- **Silence gaps** over ~500ms with no speech — always trim these, they kill pacing.

Do this with an LLM pass over the plain-text transcript (not frame-by-frame) reasoning in
Vietnamese: ask it to return the list of exact substrings/word-index ranges to delete, and
briefly justify each (filler / repetition / false start / silence). Do not silently
rewrite Daniel's actual content or opinions — only remove noise, never change meaning.

### 2.2 Build the cut list
Convert flagged spans into a list of `{ keepFrom, keepTo }` millisecond ranges (i.e. the
segments to **keep**, which is more robust than tracking segments to delete). Merge
adjacent keep-ranges that are within ~150ms of each other to avoid micro-clips.

### 2.3 Reassemble with OffthreadVideo + TransitionSeries
For each kept range, render a `Sequence` containing an `OffthreadVideo` trimmed with
`trimBefore`/`trimAfter` (frame units) pointing at that source range, back-to-back on the
timeline (`from` = cumulative duration so far).

```tsx
import { OffthreadVideo } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearTiming } from "@remotion/transitions/linear-timing";

<TransitionSeries>
  {keepRanges.map((range, i) => (
    <React.Fragment key={i}>
      <TransitionSeries.Sequence durationInFrames={range.durationInFrames}>
        <OffthreadVideo
          src={staticFile("talk.mp4")}
          trimBefore={range.startFrame}
          trimAfter={range.endFrame}
        />
      </TransitionSeries.Sequence>
      {i < keepRanges.length - 1 && (
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 6 })}
        />
      )}
    </React.Fragment>
  ))}
</TransitionSeries>
```

- Use a **very short (4-8 frame) fade or subtle zoom-punch transition** between cut
  segments where the cut is jarring (jump in framing/audio), so it reads as an intentional
  jump-cut style rather than a glitch. If two adjacent keep-ranges are contiguous and the
  cut is invisible (e.g. removing pure silence), no transition is needed — a hard cut is
  fine and preferred (keeps energy up).
- Re-derive the caption `Caption[]` array to match the new timeline: shift each caption's
  `startMs`/`endMs` by subtracting the cumulative duration of all earlier removed spans. Do
  this cut-timeline remap for captions BEFORE moving to subtitle styling in step 3.
- Never remove content that changes meaning, numbers, or disclaimers — when unsure whether
  something is filler vs. meaningful, keep it.

---

## 3. Vietnamese subtitles (burned-in, attention-optimized)

Use `@remotion/captions` `createTikTokStyleCaptions()` to group the remapped word-level
captions into short, punchy on-screen pages (docs: `/docs/captions/create-tiktok-style-captions`).
Tune `combineTokensWithinMilliseconds` to ~300-500ms so each caption page shows ~3-6 words —
short bursts read faster and keep attention, standard for finance/social content.

Display via a `Sequence` per page (docs: `/docs/captions/displaying`), positioned in the
lower-middle third **but above Facebook's bottom UI safe zone (~80% frame height max, see
Facebook defaults above)**, with:

- Bold, high-contrast Vietnamese-subset font (see setup above), size scaled for mobile
  (~7-9% of frame height).
- White text + black stroke/shadow (or a solid rounded background pill) for legibility over
  any background.
- One word "pops" as it's spoken (scale/opacity animate via `spring()`/`interpolate()` keyed
  to `frame` vs the word's `startMs`) — classic karaoke-style active-word highlight.
- **Keyword emphasis**: maintain a finance/mortgage keyword list (see §3.1) and when the
  active caption page contains one, render that word in an accent color (e.g. brand
  gold/green) and slightly larger scale, or bold it — this is what makes numbers and key
  terms ("lãi suất", "trả góp", "20%", "gốc và lãi") jump out.

### 3.1 Finance/mortgage keyword list (Vietnamese)
Maintain and grow this list based on Daniel's actual scripts. Starting set to detect and
highlight:
`lãi suất, lãi suất cố định, lãi suất thả nổi, vay, vay mua nhà, thế chấp, thế chấp nhà,
trả góp, gốc và lãi, kỳ hạn vay, ngân hàng, tín dụng, điểm tín dụng, khoản vay, đặt cọc,
trả trước, phí phạt, refinance, tái cấp vốn, giá trị nhà, định giá, bảo hiểm khoản vay,
thu nhập, chi phí, ngân sách, tiết kiệm, đầu tư, lợi nhuận, rủi ro`, plus any **number +
% or $ pattern** (always highlight numbers/percentages — they're the most attention-grabbing
part of finance content).

### 3.2 Accuracy check
Vietnamese diacritics and tone marks must render exactly as transcribed — do a visual/text
diff pass against the cleaned transcript before finalizing. Do not let font fallback silently
drop diacritics.

---

## 4. Overlay images, B-roll, and lower-thirds

Use layering, not replacement: keep Daniel's talking head visible (viewers trust a face),
and add supporting visuals in an upper/side region or briefly full-screen for emphasis.

- **Structure**: `AbsoluteFill` stack — video layer (bottom) → overlay image/graphic layer
  → subtitle layer (top, always on top so it's never obscured).
- **Chart/number callouts**: when Daniel states a stat ("lãi suất 6.5%"), overlay a simple
  stat card (`Img`/SVG or a small React-rendered card) synced to that exact caption's
  `startMs`–`endMs`, animated in with a spring scale/slide (`spring({fps, frame, config:
  {damping: 200}})`) and out just as fast. Don't leave static graphics on screen more than
  ~2-3s without a follow-up beat (new stat, new zoom, or the graphic exits).
- **Photos/screenshots** (e.g. bank rate table, house photo): use `Img` with a subtle Ken
  Burns pan/zoom (`interpolate(frame, [start, end], [1, 1.08])` on `scale`) so static images
  don't feel dead.
- **Logos/branding**: small, corner-positioned, low-opacity, always present but never
  distracting.
- **Pattern interrupts**: every 4-6 seconds, change *something* visually — a new overlay, a
  quick zoom-punch on the talking head (scale spring on a cut), a color flash, or a
  transition — this is the single biggest lever for retention on finance/education content.

---

## 5. Transitions

Use `@remotion/transitions`' `TransitionSeries` for all scene-to-scene changes (not just
cut cleanup, but also topic changes within the video): docs at `/docs/transitions`.

- Between **cleaned-up jump cuts within the same shot**: none, or a 4-8 frame `fade()` —
  keep it snappy.
- Between **distinct topics/sections** (e.g. moving from "lãi suất cố định" to "lãi suất
  thả nổi"): a slightly longer (10-15 frame) `slide()` or `wipe()` for a clear visual
  chapter break, optionally paired with a title card overlay naming the new section in
  Vietnamese.
- Between **talking head ↔ full-screen graphic/B-roll**: `fade()` (12-18 frames) reads as
  intentional and smooth.
- Keep all transitions fast — long transitions (>20 frames / ~0.6s) slow the video down and
  hurt retention. This is short-form attention-grabbing content, not a documentary.

---

## 6. Hook and pacing checklist (apply before finalizing)

- First 1-3 seconds: strongest stat, boldest claim, or a direct question — cold open, no
  slow intro. If the raw footage doesn't have a strong opening line, consider re-ordering
  (pull a punchy line from later in the take to open, using the same cut/transition
  mechanics above).
- No single shot/beat should run longer than ~4-6 seconds without *some* visual change
  (subtitle beat, overlay, zoom, transition all count).
- End with a clear, short call-to-action line, captioned and emphasized like the rest.
- Do a final full read-through of the Vietnamese subtitles against the cleaned audio for
  meaning and correctness — automated transcription/cleanup can introduce errors on tonal
  language; a human-readable proof pass is mandatory before render.

---

## 7. Render

Preview iteratively with `npx remotion studio`. Final render:

```bash
npx remotion render <entry> <CompositionId> out/final.mp4 --codec=h264
```

For vertical social delivery, also export a `.srt`/`.vtt` alongside the burned-in version
only if Daniel wants an unburned subtitle file for platform-native captions (`@remotion/captions`
includes helpers to serialize `Caption[]` to SRT/VTT) — otherwise burned-in captions per
§3 are the default since they support the keyword-highlight/karaoke style that plain
platform captions can't do.

---

## Quick reference: key Remotion docs used by this skill
- Captions overview & format: `/docs/captions/`
- Transcribing (Whisper/whisper-cpp, language param): `/docs/captions/transcribing`
- TikTok-style caption grouping: `/docs/captions/create-tiktok-style-captions`
- Displaying captions as Sequences: `/docs/captions/displaying`
- Transitions (`TransitionSeries`, presentations, timing): `/docs/transitions`
- `OffthreadVideo` trimming (`trimBefore`/`trimAfter`): `/docs/offthreadvideo`
- Google Fonts + subset selection (Vietnamese diacritics): `/docs/google-fonts`
