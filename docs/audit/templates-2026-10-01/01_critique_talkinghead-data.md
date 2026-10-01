partly done: critique from code, template.json, corrections.md and the one preview that exists (cards). Nothing was viewed at phone size; no render was possible (font fetch refused by the sandbox network, no source.mp4).

# Design critique: talkinghead-data group

Scope: classic, datalab, series, studio, cards, newsroom, scenario (all `face-required`, Daniel's matted cut-out).
Yardstick: Craft rules in `editing-principles.md` (lines 19-55), the grammar/skin split in `design-space.md`, golden rules in `src/designs/README.md`, open entries in `corrections.md`.

How to read the sizes: the repo's phone still is `--scale=0.5`, so a 30 px label is 15 px on that still and a 14 px label is 7 px. "Not viewed at phone size" applies to every design below except where I say I saw the cards preview (`src/designs/cards/preview.png`, 540x960, which is a 0.5 still).

Corrections that apply: classic, one-line verdict pill (`corrections.md:55`, already in `classic/Cues.tsx:46-55` via `fitText`); cards, slow pace on long talks is accepted (`corrections.md:64`); all designs, "text too small" with no floor set yet (`corrections.md:47`), and "charts cover my face" / "panels cover my head" (3b). There are no open design-specific corrections for datalab, series, studio, newsroom or scenario.

## Across all seven

These are not ranked inside any one design. Each would be fixed once and help several designs.

| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| Hook titles use fixed font sizes where they should use `fitText`. The `maxChars` the selector allows (`select-template.mjs:59-68`) can't fit. A 48-char classic hook at 150 px, a 44-char studio hook (same component) or a 56-char newsroom hook at 140 px uppercase wraps to 4-7 lines and runs down over the face during the first 3 s. | `classic/Frame.tsx:195` (`big.length > 10 ? 150 : 190`), `newsroom/index.tsx:274` (`fontSize={140}`), `scenario/Pieces.tsx:66`. datalab already uses `fitText` (`datalab/Hook.tsx:44-52`). | small | yes (3b while it overflows) |
| Within a single design, the same data shape (a number) is drawn in two different ways: an edit.json `stat` gets one look and an auto figure gets another. Viewers never learn a single grammar, which goes against the `design-space.md` "Grammar ... consistent per data shape" rule. cards and scenario already get this right. | classic `Captions.tsx:122-138` vs `Behind.tsx:61-77`; series `Sidebar.tsx:59-111` vs `:166-204`; studio `Pieces.tsx:129` at 0.8 in the Overlay vs `Behind.tsx:33` at 0.55; newsroom `Pieces.tsx:142-213` | medium | no |
| All seven designs end on the same white classic Outro. That breaks every dark skin (datalab, newsroom, series) in the last second. The card also stacks six elements (logo, question, CTA pill, name, 3 contacts, badges), which goes against Craft rule 11's "one action, then contact". | `classic/Outro.tsx:61-122`; every `template.json` `cta` | medium | no |
| None of the seven can put English on screen (`"en": 0`, `languages: ["vi"]`). The selector therefore excludes all of them for a bilingual video. | each `template.json` `maxChars.en` / `languages` | large | no |
| Lots of secondary text sits under 30 px: 14, 16, 20, 22 and 24 px. That is the same "text too small" complaint as `corrections.md:47`. | datalab `LenderLabel.tsx` (14 px kicker), series `Sidebar.tsx:154,199` (16 px), cards `Text.tsx:159` (20 px), scenario `Pieces.tsx:169` (22 px), newsroom `Pieces.tsx:181` (24 px) | small | no (no floor set yet) |

## classic

**Identity (keep):** the frozen-frame cover with a big word-by-word title and amber keywords; karaoke captions with a blue pill on the spoken word; navy-gradient stat cards with an amber border and a pen underline; zoom-cuts that alternate 1.0/1.13 with a spring punch; the money-rain hook.

**Strengths**
1. The jump cuts are hidden properly. Segment 0 eases in from a 1.3 zoom, then alternate segments sit at 1.13 with a 5% spring punch and a 2% drift (`classic/index.tsx:46-58`). That is Craft rule 6 done by the book.
2. The captions carry a muted viewing. They are 78 px weight 900, each word lights as it is spoken (pill on the active word, unspoken words at 0.55), and keywords stay amber (`Captions.tsx:43-66`). They are the strongest of the group at phone size on paper.
3. The cover title steps in word by word with keywords lit and has landed by frame 45, the thumbnail frame (`Frame.tsx:31-32, 121-135`). The thumbnail is always a finished frame.

**Improvements (ranked by effect on a viewer)**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The stat cards (y 120) and chapter banners (y 140) sit above SAFE, so the 4:5 Facebook feed crops them. The hook number (y 150) does too. The viewer loses the video's key number in the feed. | `Captions.tsx:125`, `Captions.tsx:207`, `Frame.tsx:187` | small | yes (3) |
| 2 | Fit the hook to its width (see Across, row 1). A 48-char hook at 150 px weight 900 can't stay in the top band. | `Frame.tsx:195` | small | yes (3b) |
| 3 | The logo is always on (78 px, top 36) instead of following 3c's "120 px, first and last 10 s". It adds permanent clutter in the corner where Reels draws its own UI. | `Frame.tsx:343-355`; `Behind.tsx:7-8` says classic has no LogoMark | small | yes (3c) |
| 4 | The white mirrored spectrum at y 1640-1790 moves for the whole video, below the captions and outside SAFE. It is a second moving focal point under the text that should carry the muted viewing (Craft rule 7). | `index.tsx:80-98` | small | no |
| 5 | The money rain draws green bills (`#2E8B57`) and coins over the face during the hook. They are off brand and compete with the hook number. Keep the coins in amber and stop them above FACE.top. | `Frame.tsx:255-256` | small | yes (7, 3b) |

## datalab

**Identity (keep):** the dark blueprint grid with drifting particles; the number as hero (giant glowing amber counter in the hook, a data panel that counts from light blue to amber); Daniel centred with the panel behind and above him.

**Strengths**
1. The hook counter is fitted to its width and stops short of the logo tile (`Hook.tsx:15-16, 44-52`). It counts up with `Easing.out(Easing.exp)` (`Hook.tsx:29-31`), so the number lands with weight instead of ticking linearly.
2. Every figure has one home: `FigureCard` at SAFE.top behind him, which narrows while the logo is up so there is no width jump (`Figures.tsx:179-205`). A single place for "the number" is good grammar.
3. The popping captions pop with a transform on a fixed layout, so words never reflow between lines (`Captions.tsx:1-6, 63-66`). Many word-pop styles get this wrong.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | There is no punch-in on cuts. Talk ignores `index` and `seg.zoomed`, so every jump cut lands at the same scale. On a centred cut-out against a static grid, Craft rule 6 says this reads as a glitch. Copy the spring punch from classic or studio. | `datalab/index.tsx:150-166` | small | no (5b lists punch-in as a change) |
| 2 | The cover title is drawn before the cut-out. Daniel is at 0.8 from the bottom, so his hair line is around y 770, and a 2-3 line title at 96 px starting at y 590 runs behind his head. The lower lines of the cover title are hidden. Unverified: no render was possible. | `datalab/index.tsx:111-142` (title then `CoverCutOut`) | small | no |
| 3 | The voice-oscilloscope PiP (200 px circle at x 60-260, y 1080-1280) appears with every figure. It splits the eye at the exact moment the number should own it, it sits just inside FACE's left edge, and it crowds the caption box that grows up from 1473. Drop it, or keep it only during the hook. | `Figures.tsx:136-150` | small | yes (3b, by 10 px) |
| 4 | The bank label is unreadable on a phone: a 48 px logo in a 156 px-wide column plus a 14 px off-theme `#9fb3d1` kicker, which is 7 px on the 0.5 still. Golden rule 2 is about the viewer seeing the bank. | `LenderLabel.tsx:21, 27, 76-80` | small | yes (2 legibility, 7 colour) |
| 5 | The captions use a 9 px black stroke and a navy box at the same time. On 72 px Vietnamese, the thick stroke fills the counters of stacked marks (ễ, ậ, ở). Keep the box and drop or thin the stroke. Not viewed. | `Captions.tsx:42-48` | small | no |

## series

**Identity (keep):** the episode ring cover ("Tập N/M"); the persistent amber strip naming the episode; Daniel bottom-left with the "HÀNH TRÌNH" sidebar on the right tracking numbers said so far; the "ĐÃ NHẮC TỚI" lender stack. The running memory of the episode is the idea.

**Strengths**
1. Running memory: the tracker keeps the last two stats with the newest in amber (`Sidebar.tsx:113-162`), and the lender stack keeps every bank named so far. A viewer who joins late still sees what was said, which suits a series.
2. The episode parser never invents a number (`episode.ts:1-4`) and falls back to the plain subtitle, so the identity element degrades honestly.
3. Framing is planned around the captions: chin at y 1280, captions confined to x 400-960 under the sidebar, and the cut-out's right and bottom edges faded instead of cut (`index.tsx:196-226`, `Captions.tsx:26`).

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The hook is the weakest in the group: a 70 px white StaggerTitle in a 680 px column, starting at y 400 (above SAFE.top). Other designs use 140-190 px. The first 3 s don't sell the episode. Use a fitted 120+ px hook inside SAFE. | `index.tsx:288-296` | small | yes (3: y 400 < 420) |
| 2 | The sidebar snaps from opacity 1 to 0 whenever any cue starts. It is the one hard pop in an otherwise eased design. Ease it over 8-10 frames. | `Sidebar.tsx:42-52`, `index.tsx:326` | small | no |
| 3 | Labels are too small to read: stat labels 24 px, auto-figure labels 16 px slate on white, and "ví dụ minh hoạ" 16 px at 60% opacity (8 px on the 0.5 still). The disclaimer exists but a viewer can't read it. | `Sidebar.tsx:102, 154-158, 199` | small | no (compliance reviewer may want the disclaimer legible) |
| 4 | Numbers have two grammars. Stats are white text in the sidebar list and auto figures are a white card at a different top. The manifest says "sidebar bar list" but the code deliberately draws no bar. Pick one look and fix the manifest wording. | `Sidebar.tsx:56-58, 166-204`; `series/template.json` `grammar.numbers` | small | no |
| 5 | The cover always paints the last word of the title amber, whatever it is. In Vietnamese that is often "không", "nào" or "gì", which lights a filler word on the thumbnail. Use `emphasised(words, keywords)` as classic, newsroom and cards do. | `index.tsx:168` | small | no |

## studio

**Identity (keep):** the liquid-contour cover with Daniel in a white-bordered rounded frame; the amber speech-bubble stat that wobbles in and points down at him; the moving blue pill that slides under the spoken word; circle-marked chapter cards; the voice-note waveform progress.

**Strengths**
1. The moving pill eases its box from word to word over 5 frames (`PillCaptions.tsx:20-23, 108-113`). That gives continuous, purposeful motion under the text without moving the text itself.
2. The speech bubble points at Daniel, so the number reads as something he is saying, not a floating chart (`Pieces.tsx:144-152`). It is the clearest "who says this" device in the group.
3. The punch-in zooms around the mouth (50% 60%) so a cut never pushes his mouth into the caption band (`index.tsx:162-166`), and `cueRoomStyle` is given the zoomed hair line (`index.tsx:150-152`).

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The stat bubble is in the Overlay (in front of him) at y ~508-756, x 190-750, which is inside FACE. It covers his hair and forehead every time a stat lands. Move it to Behind, or lift it so its tip ends at FACE.top. | `index.tsx:220-229`; `Pieces.tsx:122-123, 155-163` | medium | yes (3b) |
| 2 | The bubble text has a fixed 110 px number and 38 px label in a 250 px-tall bubble, with no `fitText`. A long stat (`maxChars` 44) overflows the bubble. | `Pieces.tsx:191-192` | small | no |
| 3 | Several pieces sit outside SAFE: cover title at y 200 and subtitle pill at y 1680 (both cropped in the 4:5 feed thumbnail), chapter card at y 160, and the hook borrowed from classic at y 150. | `index.tsx:74, 112`; `Pieces.tsx:217`; `index.tsx:237` | small | yes (3) |
| 4 | The name tag reads "Mortgage Broker · Finance Hub". "Mortgage Broker" is English and not a proper noun, and the rules of the build say Vietnamese. It also lands at frame 105, exactly as the hook leaves, so two text beats run back to back in the first 7 s. | `index.tsx:50, 240-242` | small | yes (rules of the build: Vietnamese on screen) |
| 5 | The cover's `fitText(...) * 1.9` capped at 96 is fragile because the size ignores line count. Use `fitTextOnNLines` with 3 lines, as cards does (`cards/Card.tsx:178-186`). | `index.tsx:58-66` | small | no |

## cards

**Identity (keep):** the split layout, with an airy cream info stage of white rounded cards above and Daniel in a large rounded video card below; small all-caps labels with tiny navy icons; the number with a gold underline and a dot grid; his card sliding away for full-screen moments; small lowercase captions in a dark box between the two. The FinHub web navy and gold are Daniel's pick (`tokens.ts:5-8`).

**Seen:** the preview (a 0.5 still, 540x960): "ĐIỀU CẦN BIẾT" label, "4,1 TỶ ĐÔ" in navy with a gold rule, the label "Con số người Úc không ngờ tới", the dot grid, the caption box "cho thấy rằng người", then his card on navy. That is the only still I saw for this group.

**Strengths**
1. Hierarchy is the best in the group, and I saw it in the preview. One card holds one number, and the number is clearly the largest thing on screen. The caption sits between the number and the face, so the eye travels card, caption, face in one line. Nothing covers his face because he has his own card.
2. One planner makes it one grammar. `Plan.ts` gives the stage a single scene at a time (hook, then own cues, then figures and banks) and turns anything that lands while the stage is busy into a header chip (`Plan.ts:1-7`). Scenes can't overlap, and a number always looks like a number.
3. Big cues take the whole frame and his voice never stops: his card slides away, then comes back (`index.tsx:1-8`; `tokens.ts:43`). The cover title uses `fitTextOnNLines` with `textWrap: balance` (`Card.tsx:178-186, 228`), so titles of any length balance cleanly.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | Gold keywords on the white cover card fail contrast. `#C9A84C` on `#fff` is about 2.3:1 (computed), under 3:1 even for large text. The thumbnail's most important word is the faintest one. Use NAVY with a gold underline or gold pad for keywords on white, and keep gold for rules and fills. | `Card.tsx:232`; `tokens.ts:7` | small | yes (rule 5 keywords must read; `check-contrast` precedent `corrections.md:59-62`) |
| 2 | The captions are the smallest in the group (44 px, about 22 px on the 0.5 still). The preview shows a short box that reads, but a 4-word page with diacritics is near the "text too small" line, and muted viewing depends on it. Try 52-56 px; the box has room between y 915 and 1012. | `Text.tsx:53`; preview | small | no |
| 3 | The header chip label is 20 px, nowrap, with an ellipsis. A late figure's label gets cut to "Lãi suất tr…" at 10 px on the still. Let it take two lines at 24-26 px, or drop the label and keep the number. | `Text.tsx:157-168` | small | no |
| 4 | In the preview, the band above the stage (y 0-420) is empty cream, and the card's bottom edge sits off-frame under the Reels description area. This is intentional (SAFE), but his mouth (~y 1606 per `tokens.ts:39-41`) is where Reels overlays the caption text. Consider a 40-60 px lift of `CARD.top` on 9:16 only. Not viewed in the app. | preview; `tokens.ts:42-43` | medium | no |
| 5 | Long talks hold cards for long stretches. That is accepted (`corrections.md:64`) and is not a fix. A slow push-in or dot-grid shimmer inside a held card would carry rule 5b without cutting the card early. | `corrections.md:64-67`; README 5b | medium | no |

## newsroom

**Identity (keep):** the "TIN NÓNG · TÀI CHÍNH" slash bar; the striped navy studio; the RGB-glitch hook and chapter titles; amber-boxed captions; the "SỐ LIỆU" ticker that lists only figures already said; the lender lower-third that takes over the ticker.

**Strengths**
1. The ticker is honest. Each window lists only the figures said so far and ends 3 s after the card (`index.tsx:73-91`), so it never spoils a number before Daniel says it.
2. The captions follow the bottom bars. A page sits above the ticker or lender bar for its whole duration and returns to SAFE.bottom when the bar leaves (`index.tsx:93-104`; `Captions.tsx:160-167`), so text never overlaps text.
3. The cover highlights keywords with `emphasised` and places its title under the logo tile on purpose (`index.tsx:115-153`). The breaking bar slashes in with a spring and a -4° tilt that sells urgency in one move (`Pieces.tsx:59-84`).

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The number hierarchy is inverted. A curated `stat` shows its number at 34 px inside a bar that always grows to 100%, while a minor `auto` figure gets 64 px. The bar implies a proportion that doesn't exist. Make the stat's number the big element and drop the full bar, or give it a real scale. | `Pieces.tsx:142-178` vs `:179-212` | small | no |
| 2 | The hook is a fixed 140 px uppercase line with no `fitText` (`maxChars` 56). It also ignores `hook.countTo`, so the counting hook other designs get is lost here. | `index.tsx:274`; `index.tsx:252-288` passes only `big` and `sub` | small | yes (3b when it overflows) |
| 3 | Two moving text streams run at once: a scrolling ticker sits directly under karaoke captions while a figure card is up at the top, giving three text areas. On a phone the eye can't follow the ticker and the captions together (Craft rule 7). Freeze the ticker to the newest item, or show it only when captions pause. | `index.tsx:318-336` | medium | no |
| 4 | The cover's "TIN NÓNG" bar sits at y 330 (above SAFE) on every video. A "breaking" frame on an evergreen explainer oversells. Move the bar into SAFE, and use a neutral label when `intents` isn't news. | `Pieces.tsx:68`; `index.tsx:124`; `template.json` intents | small | yes (3; compliance reviewer for "breaking") |
| 5 | The auto figure's label is 24 px slate, above the number. Put the number first and the label at 30 px or more, so the eye lands on the figure. | `Pieces.tsx:181-192` | small | no |

## scenario

**Identity (keep):** "Nếu... thì...", a navy-and-blue split with an amber divider that Daniel straddles; the A/B compare with label and value typed in grapheme by grapheme; "Ví dụ minh hoạ · tuỳ hoàn cảnh từng người" on every stat; no verdict ever says "best".

**Strengths**
1. The typing respects Vietnamese. Rows type one grapheme cluster at a time after NFC, so a letter never appears without its marks (`Compare.tsx:26-27, 41-51`).
2. Number grammar is consistent. Stat and auto figures use the same `FigureCard`, just at 112 or 92 px with a gold rule that draws in, and the number is fitted to the safe width (`Pieces.tsx:103-117`).
3. The compliance care is built into the design: the illustrative note is attached to every stat card (`Pieces.tsx:164-176`), and the grammar line "verdict, never 'best'" is in the manifest.

**Improvements**

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| 1 | The A/B table isn't level. Column A starts at y 420 and is 440 px wide; column B starts at y 590 and is 380 px wide, to dodge a logo that only shows for 10 s at each end. Rows can't be compared across, and the narrower, lower B looks secondary. Put both at SAFE.top+170 with equal widths. | `Compare.tsx:16-23`; `Pieces.tsx:183-185` | small | no |
| 2 | The compare question (y ~960, x 60-960) is drawn in Behind. During a compare, `useCueRoom` puts his hair at y 800 (compare counts as a panel, `golden.ts:327`), so the question runs behind his forehead and eyes and the middle of it is hidden. Unverified: no render was possible. Move it above the columns, or into the Overlay outside FACE. | `Compare.tsx:148-166`; `cueRoom.ts:17-18`; `scenario/index.tsx:76-91` | small | no (it's hidden, not covering) |
| 3 | The colours are biased. A is navy and B is the brighter brand blue, so B reads as the lit or preferred option in a design that must never say "best". Use equal-weight fields, for example both navy with an A/B tint on the header only. | `Backdrop.tsx:30-31` | small | no (compliance reviewer may care) |
| 4 | The divider nudges ±40 px in a random direction on every cut, but the columns don't move. The split line drifts off the table's gutter (x 500-580) and looks like a bug, not motion. Keep the divider fixed during a compare, or move the columns with it. | `Backdrop.tsx:18-25` | small | no |
| 5 | The hook (110/150 px fixed) has no horizontal bounds, so it can run x 0-1080 outside SAFE. Three lines plus the sub reach about y 900, past his hair line (~766) and onto his face, in the Overlay. Fit it to SAFE's width and to 2 lines. | `Pieces.tsx:52-77` | small | yes (3, 3b) |

## What Daniel must verify

- Every observation about stills except the cards preview comes from code. Phone-size stills at frames 20, 120, 400 and 900 (`src/designs/README.md` "Rules of the build") should confirm or drop: the datalab cover title hidden behind his head, the scenario compare question hidden behind his face, the studio bubble over his forehead, and the newsroom and classic hook overflow with a long hook.
- Whether series' 16 px "ví dụ minh hoạ" and scenario's A-navy/B-blue split need a compliance ruling.
