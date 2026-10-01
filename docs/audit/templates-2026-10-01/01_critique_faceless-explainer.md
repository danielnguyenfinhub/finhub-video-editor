done (critique from code, template.json and preview stills; no render was possible in this sandbox)

# Design critique: faceless-explainer group

Scope: blueprint, faceless, isometric, journey, kinetic, orbit, paper, phoneapp, retro, whiteboard.
Yardstick: craft rules in `editing-principles.md` (lines 19-53), grammar/skin split in `design-space.md` (lines 5-14), golden rules in `src/designs/README.md` (lines 36-122), `corrections.md`.

## What I looked at, and what I did not

- **Previews.** Each `src/designs/<id>/preview.png` is 540x960, rendered by `promote-design.mjs` at `--scale=0.5` (line 126) on frame 120 (`PREVIEW_FRAME`, line 33: hook gone, captions up). So for nine designs I saw **one talk frame at phone size**: captions + English line + the free stage. Cover, hook, figures, cues, chapter changes and the CTA were **not viewed at phone size**; those notes come from code.
- **faceless has no preview.png** (`template.json` `"preview": null`). Nothing of it was viewed; it is critiqued from code only.
- **Corrections.** No entry in `corrections.md` names any of these ten designs. The `all` entries that apply here: "text too small" (25/09, judge on a phone-size still; `check-text-size.mjs` flags under a placeholder 30 px), "too static" (25/09, rule 5b), "must work in the Facebook feed" (SAFE). No open correction ranks first.
- Font sizes below are in 1080x1920 px; "phone px" = half of that, as in the previews.

## Cross-design findings (apply to several designs; fix once, in each folder)

| # | what | evidence | effort | touches golden rules? |
|---|---|---|---|---|
| X1 | The English line breaks with a one-word orphan ("every / year?"). Add `textWrap: "balance"` to the English line, as journey/isometric/orbit already do. | Seen in the kinetic, paper, retro, whiteboard previews. No `balance` in: `paper/Stage.tsx:588-600`, `whiteboard/Stage.tsx:601-612`, `retro/Bands.tsx:113-125`, `kinetic/Captions.tsx:238-250`, `faceless/Stage.tsx:410-420`. Has it: `journey/Captions.tsx:127`. | small | no |
| X2 | Cover title size is `min(104, fitText(one line) * 1.7)`. It sizes the title as if it fits on ~1.7 lines, so a long title gets small type with empty rows under it. My estimate (unverified, no render): a 60-char Vietnamese title lands near 40-45 px, about 20 phone px, on the one frame that has to stop the scroll. Fit to 3 lines instead (`fitTextOnNLines`, as kinetic's cover does), keeping the 104 cap. | `paper/index.tsx:82-87`, `whiteboard/index.tsx:92-97`, `journey/index.tsx:53-58`, `isometric/index.tsx:54-59`, `orbit/index.tsx:61-66`, `phoneapp/Chrome.tsx:217-222`, `retro/index.tsx:78-83` (x1.8), `blueprint/index.tsx:67-73`, `faceless/index.tsx:64-81` (x1.6, cap 110) | small | yes (rule 6: cover title "uses fitText"; the auditor should confirm `fitTextOnNLines` counts) |
| X3 | Words not yet spoken are faded to 0.3-0.42 opacity. On the light skins (paper, whiteboard, journey) that is grey-on-cream, and a muted viewer cannot read ahead. Paper is the worst: a keyword's gold highlighter also drops to 0.3 *inside* a 0.34-opacity span. Raise the floor to about 0.55 on light skins. | Paper preview: "tỷ đô" almost gone. `paper/index.tsx:205-208`, `whiteboard/index.tsx:264` (`alpha(INK, 0.3)`), `journey/Captions.tsx:68` (0.35), `retro/index.tsx:226` (0.38) | small | no (rule 5 lights keywords when said; it says nothing about how faint the unsaid words are) |
| X4 | All ten end on the same classic `Outro` (white contact card + compliance card), and all route eligibility/change/trend through classic `MotionTrack` navy panels. The data grammar is consistent (good, per `design-space.md:10-11`), but the skin breaks hard on the light designs: a glossy navy card dropped on a whiteboard, paper desk, map or poster. It also means the `cta` skin axis never varies inside this group. Keep the panel grammar; give the outro a design-coloured frame (paper: card taped down; whiteboard: card taped to the board; retro: coupon). | `import { Outro } from "../classic/Outro"` in every index.tsx (e.g. `paper/index.tsx:38`, `whiteboard/index.tsx:43`); `template.json` `skinAxes.cta` identical in all ten | medium | yes (the compliance card must stay as is; the auditor rules on the frame) |
| X5 | Flag for the auditor, no proposal: the cover logo sits top-centre in blueprint, faceless, isometric, journey, orbit and retro, and top-left in phoneapp. Rule 3c says the cover keeps the logo "at the same size and place" as the talk LogoMark (top-right). Viewer effect: the logo jumps from centre to right at the cover-to-talk cut. kinetic, paper and whiteboard comply. | `blueprint/index.tsx:179-190`, `faceless/index.tsx:111-123`, `isometric/index.tsx:66-78`, `journey/index.tsx:67-79`, `orbit/index.tsx:119-131`, `retro/index.tsx:89-102`, `phoneapp/Chrome.tsx:285-296` | small | yes |
| X6 | "ĐANG NHẮC TỚI" lender labels at 15-22 px (7-11 phone px) are unreadable. They are a neutral label, not decoration, so raise them to about 26 px or drop them. | `isometric/Plaza.tsx:126` (15 px, logo only 34 px high), `journey/Signs.tsx:218` (22 px) | small | yes (rule 2: logo visible and neutral label; a bigger logo in the isometric chip is the auditor's call) |

---

## blueprint

**Identity, keep:** a navy drafting sheet where everything is *traced* on. Numbers are CAD dimension lines, steps are numbered callouts on a dashed spine, and the title block carries the chapter as a sheet number.

**Strengths**
1. A number grammar no other design has. A spoken value sits between extension lines and counts up, and a percentage traces round a protractor (`template.json` grammar.numbers). It reads as "measured" and fits mortgage maths.
2. Calm, controlled texture. In the preview the cyan grid, the corner registration marks and the sheet border all stay well under the caption in contrast. Nothing fights the words.
3. Rule 5b is handled by meaning, not noise: when the stage is free, a house elevation is traced one part about every 1.4 s (`Paper.tsx:178-180`).

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| The title block (the chapter signpost) is set at 19-29 px: "FINANCE HUB · BẢN VẼ" 19 px, chapter title 25/29 px, "TỜ" 20 px. On a phone that is 10-15 px, below the 30 px placeholder in `check-text-size.mjs`. Enlarge the chapter title to at least 40 px and let the block grow. | `Paper.tsx:307, 331, 349`; preview: the block at top-left is barely legible at phone size | small | no |
| Vietnamese caption at 54 px in a narrow label box. In the preview it is the smallest element on a mostly empty sheet, and the English note under it is almost as big (32 px italic). Raise the caption to about 64-68 px so the hierarchy is clearly Vietnamese first. | `index.tsx:59` `CAPTION_SIZE = 54`, `index.tsx:335`; preview | small | no |
| Caught mid-trace, the idle elevation reads as a broken graphic: an L-shaped stub floating in the stage (preview). Start each redraw from the ground line plus walls together, so any frame shows a recognisable house outline. | preview at frame 120; `Paper.tsx:186-188` (ground and walls are separate parts) | small | no |
| The English note's dashed rule and navy tint make it look like a second caption box. Lighter treatment (no fill), or keep the fill but use smaller type. | `index.tsx:333-343` | small | no |

## faceless (not viewed: no preview.png, no render)

**Identity, keep:** the stock-footage explainer. Dimmed footage under a navy veil, big karaoke Vietnamese words centre stage, and the veil closes whenever an element explains (`index.tsx:239-252`, "elements explain, footage only fills the gaps").

**Strengths**
1. A sound legibility system over footage: footage at 0.55 opacity, a navy band behind the caption area (`index.tsx:141-148`), and an 1/9-size navy stroke on the words (`index.tsx:194-195`). It is built for bright stock clips.
2. The biggest captions in the group after kinetic: 92 px free, 58 px when the stage is busy, glided over 8 frames (`index.tsx:46-47, 225-236`). Good for muted viewing.
3. A clear hand-off of the stage: the caption steps down whenever a figure, logo or panel takes the stage, so there is one thing to look at per moment.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| Render and commit a `preview.png`. With none, Daniel and the selector have nothing to judge it by, and it is the only design in the group in that state. | `template.json` `"preview": null` | small | no |
| The cover measures the title with `fitText` before the font is ready. Every other cover waits on `useFontReady`. If the font lands late, the cover title (the scroll-stopper) can be mis-sized. | `index.tsx:64-69` (no ready guard); compare `paper/index.tsx:77-81` | small | yes (README rule 5 note: "Measure text only after reelFontReady()") |
| The English line has no balance (X1), and at 36 px in a dark pill it competes with the dropped 58 px caption just above it. Use 32 px and balance. | `Stage.tsx:410-420` | small | no |
| The look is the plainest in the group: a navy card cover, navy panels, navy veil. Next to the nine newer designs it reads as the default. If it stays in rotation, give the cover something from the footage (a still frame behind the title). | `template.json` skinAxes.cover; `index.tsx:71-72` | medium | no |

## isometric

**Identity, keep:** a floating isometric island city with a drifting camera. Numbers are *built* on the plaza (a gold-filling cube for %, a coin column for money, a rising tower otherwise). Captions sit on a navy slab with a blue edge.

**Strengths**
1. The most concrete number grammar in the group. Values become objects you could point at (`template.json` grammar.numbers), and the gold-roofed home on the plaza ties every number back to "your house".
2. A clean, bright preview: the island centred, the caption slab sitting on the island's front edge like part of the world, and the English line on a pale slab with clear dark text.
3. The word being said lifts like a block (`Captions.tsx:146-150`), a karaoke signal that belongs to the skin.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| The Vietnamese caption is 50 px, the smallest main caption in the group (25 phone px). In the preview it is dwarfed by the island. Raise it to about 60 px; the slab has room. | `Captions.tsx:130`; preview | small | no |
| Small-chip mode is tiny: a figure said while the plaza is taken shows its label at 22 px, and the lender chip has a 15 px label with a 34 px-high logo. On a phone the logo is a smudge. | `Stage.tsx:392`, `Plaza.tsx:126` and the `LenderLogo height={34}` after it | small | yes (rule 2, logo legibility) |
| The top ~third (sky above the island) is empty in the preview, while the caption and English line crowd the lower middle. Lift the island and caption about 80 px, or use the sky for the chapter label. | preview y 0-300 (phone px) empty | medium | no (must stay inside SAFE) |
| The unspoken keyword "tỷ đô" shows as dull gold-brown on navy. Fine once said, muddy before. | preview; `Captions.tsx:146-147` (0.6 opacity of amber) | small | no |

## journey

**Identity, keep:** a gold pin travelling an S-curved road across an illustrated top-down map at the talk's pace. Numbers are signposts, comparisons a fork in the road, steps milestones on a trail. Captions sit on a white ribbon with notched ends.

**Strengths**
1. The strongest metaphor-to-grammar fit in the group: "a process" literally becomes a route, and the walked portion of the road (gold) shows progress at a glance (preview: gold road behind the pin, dashed ahead).
2. It is never static without being busy. The map slides under a fixed pin, so motion is constant but slow, and the caption stays put (`template.json` transitions).
3. Good caption typography: 56 px, `textWrap: "balance"`, a gold top edge, keywords blue with a 7 px gold underline (`Captions.tsx:56-76`). In the preview the ribbon is the clear focal point.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| The English plate is 82% white with a dashed border, so trees and houses show through behind the text (preview: green blobs behind "billions"). Make the plate opaque, or blur what is behind it. | `Captions.tsx:128-129`; preview | small | no |
| The unspoken keyword is pale blue at 0.35 on white: "tỷ đô" nearly vanishes before it is said (X3). | `Captions.tsx:67-68`; preview | small | no |
| The lender sign label is 22 px (X6). | `Signs.tsx:218` | small | yes |
| The camera tilts toward the road's heading. Check on a phone that a constantly rotating map under fixed text is not tiring over a 2-3 minute video; if it is, damp the tilt. | `template.json` transitions ("tilt towards the road's heading"); not viewed in motion | small | no |

## kinetic

**Identity, keep:** flat brand colour blocks (navy, gold, white) with a slanted contrasting slab. Huge words are ghosted, then slammed in as said, and numbers are boxed. Each block carries its own ink pair, so text is never on a colour it cannot be read on (`blocks.tsx:26-55`).

**Strengths**
1. The biggest, most readable type in the group. Captions run up to 132 px, fitted with `fitTextOnNLines` (`Captions.tsx:125-140`); the preview line is about 64 phone px. It is the best design here for muted viewing.
2. Contrast is designed in, not hoped for: `Surface` pairs `ink`/`accent`/`box` per block (`blocks.tsx:33-55`), and the slab is always the opposite block (`slabOf`, line 57).
3. A cover that already does what X2 asks: it fits to N lines, with the logo top-right at LogoMark size (`index.tsx:143-156`).

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| A full-frame colour wipe can fire as often as every 24 frames (0.8 s), on every sentence, pause and stage beat, in four directions, including a white block. On a calm how-it-works voice-over this risks reading as frantic and flashy. Raise `MIN_BEAT_GAP` to about 45-60 frames, or wipe only at sentence ends and stage beats. | `blocks.tsx:68-69` (`WIPE_FRAMES = 9`, `MIN_BEAT_GAP = 24`); not viewed in motion | small | yes (rule 5b lower bound 1.5 s: run `check-pacing` after) |
| The Vietnamese caption breaks unevenly: "người Úc trả / hàng" leaves one word on line 2 (preview). Add `textWrap: "balance"` to the caption block. | preview; `Captions.tsx` has no `balance` | small | no |
| The English line has no balance (X1), and at 0.88 opacity on gold it is the weakest text on screen. | `Captions.tsx:238-250`; preview | small | no |
| Ghost opacity 0.16 means the viewer cannot read the rest of the page before it is said. That is fine as a stylistic choice for a hook, but long pages lose meaning for muted viewers. Try 0.3. | `Captions.tsx:37` | small | no |

## orbit

**Identity, keep:** deep-navy space with a glowing, voice-reactive core as "the presenter" (`Space.tsx:1-8`, `visualizeAudio`). The core moves and resizes to hold a number, dock a timeline, or become the VS node.

**Strengths**
1. A faceless design that still has a presenter: the core pulses with the voice (`Space.tsx:256-280, 355-374`), which gives the eye one living focal point.
2. One element changes role instead of new elements piling up (core grows, docks, shrinks to VS: `template.json` transitions). That is excellent hierarchy.
3. A clean caption: white words with a glow on the current word and amber keywords, with no box, over a dark field. In the preview it is crisp, and the English glass box under it reads well.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| Between beats the core is an empty dark disc (preview), which looks like a loading spinner. Put the chapter number or a small house glyph inside it while it is idle. | preview; idle core | small | no |
| The "moon" (a second number shown at once) prints its value at 32-42 px inside a small glass circle, about 16-21 phone px for the number the viewer is meant to notice. | `Stage.tsx:349` | small | no |
| The whole palette is low-key (deep navy, thin rings, dim dots). In a bright feed on a phone it may read as dark and empty, and the preview's upper third is empty. Raise ring and starfield brightness a step. | preview | small | no (colours stay theme tints) |
| Points-timeline label kicker at 24 px in sky blue. | `Stage.tsx:476` | small | no |

## paper

**Identity, keep:** a cream paper desk with layered cut-paper cards, gold washi tape and drop-in-with-tilt cards. Captions are navy words on a torn white strip, with keywords under a gold highlighter.

**Strengths**
1. A warm, tactile skin that is the opposite of the navy designs, which gives the variety rule real range (`design-space.md:63`).
2. Big captions: 76 px free, 52 px busy (`index.tsx:64-65`). In the preview the torn strip is the one bright focal point on the desk.
3. Drifting cut-paper houses, coins and clouds stay faded (preview), so the backdrop moves without competing.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| The unspoken keyword is nearly invisible: span opacity 0.34 times highlighter alpha 0.3 (X3). In the preview "tỷ đô" is pale grey on pale cream, so the key number of the sentence is the hardest word to see until it lands. | `index.tsx:205-208`; preview | small | no |
| English line orphan, no balance (X1). | `Stage.tsx:588-600`; preview ("every / year?") | small | no |
| Cover title from the 1.7x formula (X2). The cover is a navy card on cream, so a small title wastes the strongest contrast area. | `index.tsx:82-87` | small | yes |
| A classic navy MotionTrack panel on the paper desk (eligibility/change/trend) breaks the paper world (X4). A paper-card frame around the same panel content keeps the grammar. | `template.json` grammar.eligibility/change/trend | medium | no |

## phoneapp

**Identity, keep:** a generic unbranded phone on a navy-to-blue gradient. The hook arrives as a push notification, cues push app pages from the right, checklist items are tapped and ticked, and numbers sit in widget cards with rings.

**Strengths**
1. A native-feeling metaphor for a phone viewer: notification, page push, tap ripple and tick are gestures they already read without thinking (`template.json` grammar.steps, transitions).
2. Steps carry progress: an n/N count and a progress bar (`Cues.tsx:46, 95-96`) tell the viewer how far through the list they are.
3. The caption bar is clearly separated: a frosted navy bar under the phone with a gold underline on the spoken word (preview), plus a smaller English bar below.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| Text is cut with an ellipsis. A figure chip's stat label is one line in a 318 px chip at 28 px (`whiteSpace: nowrap`, `textOverflow: ellipsis`), so a longer Vietnamese label loses its end; app titles clamp to 2 lines, and the comparison title to 1. Where a viewer must read the label, wrap or shrink to fit, never truncate. | `Chips.tsx:94-100`, `Phone.tsx:52-58`, `Page.tsx:51-81`, `Compare.tsx:172` | small | no |
| Between beats the screen is a grey skeleton "loading" feed (preview). On a phone that looks like the video itself is buffering. Show real content (the hook headline as the first feed item) from the start. | preview; `Screens.tsx:2` | medium | no |
| The phone is about 300 phone px wide, so text inside it (34 px, 17 phone px) is small. A phone-in-a-phone halves everything. Scale the phone up about 10% while a cue page is open. | `Screens.tsx:79, 168, 270` (34 px); preview | medium | no (must stay inside SAFE) |
| The cover logo is top-left (X5). | `Chrome.tsx:285-296` | small | yes |

## retro

**Identity, keep:** a 60s-80s pop-art print poster. Slowly turning sunburst rays, halftone dots with a mis-registered gold plate, heavy screen-printed type with hard offset shadows, rubber-stamp numerals, starburst stickers.

**Strengths**
1. The most distinctive skin in the group. The preview reads as "poster" instantly at thumbnail size: sunburst, halftone, navy border.
2. Keywords as blue ink blocks with a gold hard shadow (`index.tsx:217-224`) are the strongest keyword treatment here: visible even before they are said.
3. Steps numbered by a stamp that thumps in with an ink smudge (`template.json` grammar.steps; `Cues.tsx:70`) give each step a felt beat.

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| Every caption word carries a 3 px gold offset shadow. Vietnamese tone marks (dấu hỏi, ngã, nặng) are small, and a gold double of each mark can blur at phone size. Unverified at caption size beyond the one preview frame (readable there, slightly soft). Use 2 px, or drop the shadow on non-keywords. | `index.tsx:225` | small | no |
| English line orphan, no balance (X1). | `Bands.tsx:113-125`; preview | small | no |
| The preview's lower half (between caption and English strip) is empty sunburst, and the caption sits well above centre. Bring the free caption down toward the visual centre, or let the hook or number sticker own that space. | preview | small | no |
| The rotating high-contrast sunburst behind everything: check in motion that it does not pull the eye from captions. Slow it, or lower its contrast under the caption ribbon. | `template.json` texture; not viewed in motion | small | no |

## whiteboard

**Identity, keep:** a glossy whiteboard in an aluminium frame where everything is *written* in marker. Numbers are circled or boxed with a doodle, steps are ticked in green, and the board is wiped off with an eraser pass.

**Strengths**
1. A teacher's grammar that matches "how it works" content: a number is written, circled, then arrowed to its label (`template.json` grammar.numbers). That is three beats of meaning per number, not decoration.
2. Captions with the highest contrast in the group: bold navy on white, no box needed, 70/50 px (`index.tsx:73-74`); crisp in the preview.
3. Honest numbers: written as said, never counted up, so a year or date never flashes wrong digits (`Stage.tsx:107`).

**Improvements (ranked)**
| what | evidence | effort | touches golden rules? |
|---|---|---|---|
| The "erased marker ghosts" are blue strokes scattered across the board, and in the preview some cross the caption and English line (one runs through "every"). They read as UI glitches, not texture. Keep them out of the caption band or halve their opacity. | `Board.tsx:82-106`; preview | small | no |
| Unspoken words at `alpha(INK, 0.3)`: "tỷ đô" is pale grey in the preview (X3). | `index.tsx:264` | small | no |
| English line orphan, no balance (X1); slate italic under a 50% blue rule is the weakest text on the board. | `Stage.tsx:601-612`; preview | small | no |
| The board is very pale overall (white on light-grey frame gradient) and may look washed-out in a bright feed. A slightly warmer or darker frame would give the white board an edge. | preview | small | no (theme tints) |

---

## Top improvement per design (one line each)

- **blueprint:** enlarge the title-block chapter text from 19-29 px to at least 40 px (`Paper.tsx:307-349`).
- **faceless:** commit a preview.png and wait for the font before fitting the cover title (`index.tsx:64`).
- **isometric:** raise the 50 px caption to about 60 px (`Captions.tsx:130`).
- **journey:** make the English plate opaque so the map does not show through the text (`Captions.tsx:128-129`).
- **kinetic:** space full-frame wipes at 1.5-2 s minimum, not 0.8 s (`blocks.tsx:69`); check-pacing after.
- **orbit:** fill the idle core so it stops looking like a loading spinner.
- **paper:** make the unspoken keyword readable (0.34 x 0.3 highlighter now; `index.tsx:205-208`).
- **phoneapp:** stop truncating labels with an ellipsis (`Chips.tsx:94-100`, `Page.tsx:79`).
- **retro:** soften the 3 px gold offset shadow on every caption word so tone marks stay clean (`index.tsx:225`).
- **whiteboard:** keep the blue ghost strokes out of the caption band (`Board.tsx:82-106`).
- **Group-wide quick win:** `textWrap: "balance"` on the English line in five designs (X1).

## What Daniel must verify

- Every judgement above rests on one frame at phone size (or none, for faceless). Motion items (kinetic wipe rate, journey tilt, retro sunburst) need a muted phone viewing of a render.
- X2's cover-title size is an estimate, not measured.
- X5 (cover logo position) and X4 (outro frame) are for the auditor to rule on.
