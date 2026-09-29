# edit.json — field reference (MortgageReel template)

## Contents

- Rules that apply to every field
- Top-level fields
- Cue types
- Visuals (b-roll, pip, image card)
- Compliance and exemptions
- Several takes: clips.json
- Minimal example

Source of truth: `src/mortgage/schema.ts` (zod, strict — an unknown or misspelt key fails
the render with a readable error). Full worked example: `public/videos/ty-do/edit.json`.

## Rules that apply to every field

- All times are **source milliseconds** — positions in Daniel's original recording, taken from
  `words.json` `startMs`. The template remaps them through cuts and pacing; never compute output times.
- Every on-screen string (title, subtitle, hook, chapters, stats, every cue text, cta) is scanned
  against RG 234 before rendering. Captions (Daniel's speech) are not.
- `tone` is `"good"` (green), `"bad"` (red) or `"neutral"`.

## Top-level fields

| Field | Required | What it does |
|---|---|---|
| `design` | no | The look: a folder in `src/designs/` registered in `src/designs/index.ts` (default `"classic"`). An unknown name fails the render and lists the designs there are |
| `source` | no | The recording this video edits: `public/recordings/<source>/` holds `source.mp4`, `foreground.webm` and `words.json` (kebab-case id, set by `prep-video.py`). Left out: the files sit in `public/videos/<slug>/` (unmigrated and faceless videos) |
| `cut` | no | Automatic cuts, each on unless false: `{fillers?, stutters?, badWords?, words?: []}`. Restarts in different words still need `remove` |
| `music` | no | `{file: "music/<name>.mp3", volume?, startMs?}` looped bed from `startMs` (`node scripts/music-start.mjs <file>` suggests it), auto-ducked under speech |
| `title` | yes | Cover headline and thumbnail text, Vietnamese, ≤ 8 words. Numbers and keyword-list words are auto-highlighted |
| `subtitle` | no | Cover chip. Default "Daniel Nguyen · Finance Hub" |
| `coverFrameMs` | no | Source ms of the frozen frame behind the cover. Pick a frame with Daniel's eyes open, facing camera |
| `notes` | no | Editor notes, never shown (why a span was cut, open questions) |
| `hook` | no | `{big, countTo?, decimals?, suffix?, sub?}` over the first ~3.5 s of talk. With `countTo` the number counts up (vi-VN comma decimal) then `suffix`, e.g. `{"big":"4,1 TỶ ĐÔ","countTo":4.1,"decimals":1,"suffix":"TỶ ĐÔ","sub":"Con số người Úc không ngờ tới"}` |
| `remove` | no | `[[fromMs,toMs], …]` spans to cut: false starts, repeated takes, a misspoken passage Daniel asked to drop. Silences and sentence-initial "thì" are cut automatically |
| `captionFixes` | no | `[{from,to}]` exact caption-token replacements for misheard words. Audio untouched. Built-in: lợi phí→lệ phí, tiền lợi→tiền lời, than chốt→then chốt, đắm→đóng |
| `keywords` | no | Extra words/phrases to highlight in captions (added to the finance default list) |
| `captionStyle` | no | Classic design only: `"outline"` (default, bold white words with an outline) or `"box"` (white rounded box hugging each line, spoken word in blue, keywords underlined). Pick `"box"` when the footage behind the captions is busy or bright |
| `subtitles` | no | `[{fromMs,toMs,text}]` the English line under the captions for a span of the talk (typed, not transcribed; RG 234 scans it). Keep each under ~20 words; preflight warns over 140 characters |
| `pacing` | no | `{mode:"auto"|"off", target?, min?, max?, overrides?:[{fromMs,toMs,rate}]}`. Default auto: target 4.4 words/s, rate 0.9–1.2, pitch preserved |
| `chapters` | no | `[{atMs,title,effect}]`; `effect` ∈ fade, slide, wipe, flip, clockWipe, iris, pushCut, blurSlide, bookFlip, crossZoom, crosswarp, dissolve, dreamyZoom, filmBurn, linearBlur, ripple, swap, zoomBlur, zoomInOut (`TRANSITIONS` in `src/mortgage/timeline.ts`). From blurSlide on they need HTML-in-canvas (Chrome 149+, which Remotion's renderer downloads); an older Studio browser previews them as a fade. Lands on the nearest cut; shows a "PHẦN n" banner |
| `look` | no | Colour grade on the talking-head footage: `"warm"`, `"cinematic"` or `"mono"` (recipes in `LOOK_EFFECTS`, `src/mortgage/PacedVideo.tsx`). Left out, footage plays as recorded. Graded footage plays through `@remotion/media` `<Video>`; if that can't decode the file the render fails rather than ship it ungraded |
| `background` | no | Left out (or the old `"brand"`): the room is removed and Daniel sits on the design's backdrop. Needs `foreground.webm`, made once per recording at `http://localhost:4100/matte.html?slug=<slug>` (~13x the video's length); the render stops if it is missing. `"vignette"` is quick mode, only when Daniel asks for it: no matting, the full frame with the edges faded to black; editorial, checklist, datalab and kitchen render in classic. Rules: golden rule 4 in `src/designs/README.md` |
| `stats` | no | `[{atMs,durMs,big,label}]` stat cards at the top, e.g. `{"atMs":12900,"durMs":3000,"big":"~$400","label":"cho mỗi hộ gia đình"}` |
| `cues` | no | Infographics — see below |
| `visuals` | no | Library b-roll over the talk: cutaway, picture-in-picture, image card — see below |
| `cta` | no | `{question?}` on the contact card. Default "Bạn cần tư vấn về khoản vay?"; button text is fixed |
| `compliance` | no | See below |
| `exemptions` | no | See below |
| `post` | to publish | Upload copy, not on screen: `{title, caption, hashtags}`. `title` = the topic, also the finished file's name; `caption` = the body only (a few sentences, one call to action; the broker block and licence/disclaimer footer are added automatically, never write them); `hashtags` = exactly 7: `#finhub`, `#vietnamese` + 5 about the topic, one word each. RG 234 scans it (an exemption with `field: "post"` covers it). `render-video.py` then writes `2 - FINISHED VIDEOS/<Topic>.mp4` and `<Topic> - caption.txt`; without a valid post the render still succeeds and prints the fix |

## Cue types

Every cue has `kind`, `fromMs`, `toMs` (on screen between them) and inner beats with their own `atMs`.

| kind | Fields | Use when Daniel… |
|---|---|---|
| `kinetic` | `kicker?`, `struck:[{text,atMs,strikeMs}]`, `slam:{kicker?,text,atMs}`, `sub?:{text,atMs}` | says "not X, but Y" (X struck out, Y slams in) |
| `compare` | `cards:[card,card]` each `{title,atMs,highlightAtMs?,rows:[{label,value,tone,atMs}]}`, `vsAtMs?`, `question?:{text,atMs}` | contrasts two products/options |
| `bars` | `kicker?`, `title`, `bars:[{label,value,height 0..1,tone,atMs,overflow?}]` (1–3), `stamp?:{text,tone,atMs}` | compares amounts; `overflow` = bar breaks the chart top |
| `points` | `title`, `items:[{text,atMs}]` (2–5) | lists steps or key points, each numbered and revealed as it is said |
| `verdict` | `ok` (✓/✗), `text` | gives a clear yes/no conclusion |
| `venn` | `left`, `right`, `label` | talks about shared interest (e.g. Broker / Bạn → LỢI ÍCH CHUNG) |
| `emoji` | `name` (file in `public/emoji/`, no ".json"), `position?` right/left | reacts emotionally ("rất là lớn") — sparingly |
| `lenders` | `title?` | talks about banks/lenders (shows the accredited lender logos) |
| `change` | `kicker?`, `label` (what changed), `from`, `to` (strings, written as said: `"5,89%"`), `swapAtMs` (inside fromMs–toMs), `direction?` up/down (arrow), `tone?`, `rateType?` cash/advertised/other | says an old value became a new one (a rate cut, a repayment drop). The design picks the motion (classic: strike-through; faceless: slide) |
| `trend` | `kicker?`, `title`, `unit?`, `decimals?` 0–3, `points:[{label,value}]` (2–8, `value` a number), `rateType?` | walks through a value over time (cash-rate path). Every point's value is printed; the axis spans the data |

Numbers kit rules: a `change` whose `from`/`to` contains `%`, or a `trend` with `unit: "%"`, needs
`rateType` (`"cash"` = RBA cash rate, `"advertised"` = a lender's rate, `"other"`). `"advertised"`
also needs `compliance.advertisedRate` (comparison rate card). All their text goes through the
RG 234 check like any other cue.

```json
{ "kind": "change", "fromMs": 12000, "toMs": 18000, "kicker": "[example]", "label": "[example] Lãi suất tiền mặt",
  "from": "9,99%", "to": "9,74%", "swapAtMs": 15000, "direction": "down", "rateType": "cash" }
{ "kind": "trend", "fromMs": 20000, "toMs": 27000, "title": "[example] Lãi suất tiền mặt", "unit": "%", "decimals": 2,
  "points": [{ "label": "[example] T1", "value": 9.99 }, { "label": "[example] T2", "value": 9.74 }], "rateType": "cash" }
```
(Placeholder values, not real rates.)

Keep top-panel cues from overlapping each other and chapter banners in time.

Cues, stats and chapters are DATA: each design decides how to draw them (the classic
design draws the kinds above). A design needing per-video data the schema lacks either
hard-codes it (single-use design) or adds one optional reusable field to the core schema,
with a regression render.

## Visuals (b-roll, pip, image card)

`visuals: [{mode, atMs, durMs, asset}]`. `atMs` is source ms like everything else; `durMs`
is on-screen ms, like `stats`. The core draws them, so every design gets them; captions,
cues, stats and the end cards stay on top, and footage is muted (Daniel's voice is the only
audio). Use one only where the picture makes the point clearer than Daniel's face does.

| mode | What shows | Use when Daniel… |
|---|---|---|
| `cutaway` | the asset full frame, Daniel hidden (voice continues) | describes something the viewer should see (a street, a signing) |
| `pip` | the asset full frame, Daniel small top-right | walks through something while still talking to camera |
| `overlay` | an image card left of Daniel's face (Ken Burns on stills) | names a thing a small picture identifies (a document, keys) |

```json
"visuals": [
  { "mode": "cutaway", "atMs": 21400, "durMs": 2500, "asset": "library/stock-video/suburb-street__pexels__1a2b3c4d.mp4" },
  { "mode": "pip", "atMs": 46000, "durMs": 5000, "asset": { "find": "couple meeting financial adviser" } },
  { "mode": "overlay", "atMs": 80200, "durMs": 3000, "asset": { "find": "chìa khóa nhà" } }
]
```

- `asset` is a file under `public/library/` (lowercase, no `..`) or `{"find": "<keywords>"}`.
  Before rendering, `node scripts/library.mjs resolve <slug>` rewrites each `find` to a file,
  using exact and `synonyms.json` hits only, and stops listing any keyword it can't match.
  It never downloads: new footage comes from the faceless tooling for now
  (`scripts/voice-video.mjs`), or add a file with `node scripts/library.mjs add`.
- The render fails on a `find` left in, or on a path whose file isn't there.
- Golden rules (`node scripts/check-golden.mjs <slug>`): it reports the time Daniel's face is
  hidden (cutaways only), fails a single cutaway over 4 s (`CUTAWAY_MAX_MS`, untuned) and
  flags one that covers a spoken number, since that number's figure must stay visible.
- A design restyles the pip and overlay frame (border, radius, mask) through its
  `visualFrame` in `src/mortgage/design.ts`; left out, the frame is a plain white-edged card.

## Compliance and exemptions

`compliance.taxNote` (added by the bootstrap): true whenever tax is discussed; adds
"General information only, not tax advice" (VI + EN) to the compliance card.

`compliance`: `{illustrativeNumbers? (default true — adds "examples are illustrative" to the
compliance card), conditionsNote? (adds the lender-criteria/fees note — use when a policy feature
or concession is described), advertisedRate?: {rateFigure, comparisonRate, ratesAsAt}}` — a rate
can appear only with all three; the card then adds the comparison-rate warning.

`exemptions`: `[{field, term, reason, note}]`, `reason` ∈ definition | quoted | negation |
third-party-name. `field` is the key printed in the RG 234 error (e.g. `cues[2]`). Promotional
phrases ("lãi suất tốt nhất") can only be cleared by `quoted` or `negation`. Write a real `note`;
it is the audit trail.

## Several takes: clips.json

When Daniel records more than one take (or wants his own B-roll), the paper edit goes in
`public/videos/<slug>/clips.json` before any `edit.json` work: an ordered list, trimmed from each
take's `words.json`.

```json
[
  { "recording": "lmi-take-1", "inMs": 1200, "outMs": 48300, "role": "a-roll" },
  { "recording": "lmi-take-2", "inMs": 300, "outMs": 21900, "role": "a-roll" },
  { "recording": "street-walk.mp4", "inMs": 0, "outMs": 4000, "role": "b-roll" }
]
```

- `a-roll`: a prepared recording id (`public/recordings/<id>/`); times are that take's ms.
  `python scripts/prep-video.py <slug> --clips public/videos/<slug>/clips.json` joins the spans in
  order into the recording `<slug>-assembly` (proxy, merged `words.json` with `"clipStart":
  "<recording>"` on each clip's first word) and sets `edit.json` `"source"` to it. From then on
  every `edit.json` time is **assembly** ms (the merged `words.json` clock). Changing clips.json
  means running it again, and every time already in `edit.json` shifts.
- `foreground.webm`: joined from the takes' own cut-outs when every take has one; otherwise the
  assembly needs its own matte (matte.html on the slug), and prep stops rather than keep a cut-out
  from an older clip list.
- `b-roll`: listed by prep, not joined. TODO(WP2): add each to the library as `own-footage`
  (`node scripts/library.mjs add <file> <meta.json>`) and place it over the a-roll with a cue.

## Minimal example

```json
{
  "title": "Lãi suất cố định hay thả nổi?",
  "coverFrameMs": 4200,
  "hook": { "big": "2 LỰA CHỌN", "sub": "Chọn sao cho phù hợp với bạn" },
  "remove": [[61200, 64850]],
  "chapters": [{ "atMs": 30120, "title": "Lãi suất cố định", "effect": "slide" }],
  "stats": [{ "atMs": 15300, "durMs": 3000, "big": "3 NĂM", "label": "Kỳ hạn cố định phổ biến" }],
  "cues": [
    { "kind": "verdict", "fromMs": 88000, "toMs": 90000, "ok": true, "text": "PHÙ HỢP KHI THU NHẬP ỔN ĐỊNH" }
  ],
  "cta": { "question": "Bạn đang phân vân nên chọn loại lãi suất nào?" }
}
```
(Synthetic example — times are illustrative.)
