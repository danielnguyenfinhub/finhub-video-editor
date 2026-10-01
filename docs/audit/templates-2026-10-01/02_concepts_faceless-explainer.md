done (concepts only; no render possible in this sandbox, so nothing below was seen on a still)

# Concepts: faceless-explainer group (01/10/2026)

Scope: blueprint, faceless, isometric, journey, kinetic, orbit, paper, phoneapp, retro, whiteboard.
Inputs: `docs/agents/team-ground-rules.md`, `01_golden_audit_faceless-explainer.md` (audit),
`01_critique_faceless-explainer.md` (critique), golden rules `src/designs/README.md:36-122`, plus the code
lines cited below (each one re-read for this note unless marked "per audit" or "per critique").

Classes: **A** FIX-PROVABLE (proved from code or measurement; the repo's checks or a planner harness can
verify the fix, no still needed) · **B** FIX-NEEDS-RENDER (the fix is correct, but its layout effect has to
be seen on a still first) · **C** OPTION (a look change; Daniel picks from stills) · **D** RULING (only
Daniel can answer).

Counts: **A 8 · B 7 · C 26 · D 4** (B1 is one shared pattern applied in 8 designs; B4, B6, B7 and C-X2..X4
are shared too, so each counts once).

Reuse used throughout, in this order: existing code in this group first (isometric `planOf`, paper's
hook-share, kinetic's line split, journey's `textWrap: "balance"`, the local `alpha`/`mix` helpers), then
core exports that already exist (`LOGO_HEIGHT` `src/mortgage/golden.ts:169`, `reelFontReady`
`src/mortgage/style.ts:63`, `<CaptionZone>`), then `@remotion/layout-utils` (installed; `fitText`,
`fitTextOnNLines` already imported by `kinetic/Captions.tsx:7`, `ticker/Cues.tsx:5`). No new dependency,
no element from `.claude/elements` is needed for any item: everything is a change inside each design's own
folder. Nothing touches `src/mortgage/` or `src/brand/`.

---

## A. FIX-PROVABLE (do first, no choice needed)

| # | design | file:line | intended change | verified by |
|---|---|---|---|---|
| A1 | orbit | `orbit/Cues.tsx:71` `right: 1080 - 960`; `orbit/Cues.tsx:136` `maxWidth: 960 - TEXT_LEFT` | Import `SAFE` from `../../mortgage/golden` and write `right: 1080 - SAFE.right` and `maxWidth: SAFE.right - TEXT_LEFT`. Same pixels today (SAFE.right is 960), but now it follows SAFE (rule 3). | `grep -n "960" src/designs/orbit/Cues.tsx` empty; `npm run lint`, `npm test` |
| A2 | faceless | `faceless/index.tsx:122` `<Img src={LOGO} style={{ height: 120 …` | Use `LOGO_HEIGHT` (`golden.ts:169`) for the cover logo height instead of the literal. Same pixels. (Where the logo sits is ruling D1, not part of this fix.) | grep; lint; test |
| A3 | faceless | `faceless/Stage.tsx:30` `SKY = "#7FC4FF"`, `:41` `rgba(79,163,224,0.35)`, `:43` and `faceless/index.tsx:247` `#0B2F5E`, `#07172E` | Write the gradient stops as tints of theme colours (`brand.background`, `brand.navy`, `brand.primary`) through a local `mix`/`alpha` (copy the 2-line helper from `paper/Desk.tsx:23-25` into the faceless folder) so the pixels stay within a few RGB steps. If `SKY` cannot be reached as a theme tint, keep it with `// theme-exempt: <why>` like `blueprint/Paper.tsx:22`. | `node scripts/promote-design.mjs faceless --dry-run`: the 6 colour FAILs gone; `node scripts/check-contrast.mjs` |
| A4 | faceless | `faceless/index.tsx:64-69` (cover `fitText` runs with no font guard) | Measure only after `reelFontReady()` with `useDelayRender`, as README rule 5 says and `paper/index.tsx:76` does (`useFontReady`). Returns null until ready. | code read + lint/test; the visible effect is "title sized right when the font lands late", which a still in a slow-font run would show, but the rule breach itself is code-proven |
| A5 | kinetic | `kinetic/Stage.tsx:495-509` (`inHook` figures only in the hook's 105-frame `Sequence`), `:326-343` (chip) | Keep the chip in the hook, and also mount each `inHook` figure in the normal stage path from `HOOK_FRAMES` to `f.fromFrame + f.frames` when frames remain, so its value and label are shown for the rest of its reading time (rule 1, 5b). No new layout: it uses the same `GiantNumber` path as every other figure. | planner harness on the fixtures (scratch, like the audit's co-occurrence script): every figure visible ≥ its `figuresOf` frames, label shown once |
| A6 | blueprint | `blueprint/Stage.tsx:506-520` | Replace "push to frame 105, clip at the next figure, floor to 1.5 s" by a queue: each figure starts at `max(f.fromFrame, HOOK_FRAMES if hooked, previous figure's end)` and keeps its full `f.frames`. Removes the 17-frame stack ("2026" x "3,6", rba-sept-2026) and the cut reading time. Risk: a figure can land up to ~1 s after it is said; the harness reports the largest delay. | harness: no two `FigureSheet`s overlap; each ≥ `f.frames`; print max delay |
| A7 | phoneapp | `phoneapp/plan.ts:74-77` | When an item waits for a cue page (`late`), move `to` with `from` (`to: late[1] + (raw0.to - raw0.from)`), so it keeps its reading time. | harness: every planned item length = its source length |
| A8 | phoneapp | `phoneapp/plan.ts:82-90` | When both lanes are busy, the item waits for the lane that frees first (shift `from` and `to` by the wait, as A7) instead of taking a lane that is still occupied. | harness with three concurrent items: no lane holds two items at once |

## B. FIX-NEEDS-RENDER (correct fix; check a still before merging)

### B1. Shared pattern: one stage, one owner ("stage planner")

**The recurring defect:** figure, bank logo, hook and cue panel can share one stage box at the same time
(rule 3b "own places"). Measured on real data: rba-sept-2026 hook x "2026" 2.60 s, figure x compare 1.13 s;
faceless-test figure x ANZ 0.23 s (audit, table "What I measured").

**The one pattern (already in the group, clean per audit):** `isometric/Plaza.tsx:149-186` `planOf`. The
hook and every non-emoji cue own the stage; each figure and bank mention, in time order, takes the stage
only if it is free for its whole span (12-frame fade tolerance), otherwise it goes to a small chip in a
second place. Phoneapp's `plan.ts` is the same idea with two lanes (after A7/A8). For the hook, paper's
"hook on top, figure below" (`paper/Stage.tsx` ~454-461, `duringHook`) is the per-design variant already
in use in paper, retro, whiteboard, kinetic.

How to apply: copy the ~40-line `planOf` into each design's own folder (no cross-design import, no change
to `src/mortgage/`), marked `// ponytail: copied from isometric/Plaza.tsx planOf; lift to src/mortgage when
Daniel agrees a core scheduler`. Each design draws its own chip in its own skin (a smaller version of
its existing figure/logo component). The schedule half is harness-provable (no two stage items overlap by
more than 12 frames); the chip's position and size need a still, which is why this is B.

| design | where | the second place (proposal, inside SAFE, clear of the cue band SAFE.top..~930 and of captions) |
|---|---|---|
| faceless | `Stage.tsx:291-324` | chip under the hook pill / above the dropped caption; also fixes hook x figure (no hook handling today) |
| blueprint | `Stage.tsx:496-545`, `Cues.tsx:33-34` | a dimension-line chip in the title-block column (after A6) |
| kinetic | `Stage.tsx:507-536` | the existing hook chip style (`:326-343`) reused as the chip |
| paper | `Stage.tsx:451-495` | a small taped tag (existing `LenderTag` scaled) |
| retro | `Stage.tsx:374-415` | a starburst sticker in a corner of the poster |
| whiteboard | `Stage.tsx:453-495` | a sticky note at the board edge |
| orbit | `Stage.tsx:370-378, 400, 413` | extend `moonsOf` to also treat compare cues and bank mentions as "taken" so the figure becomes a moon |
| journey | `Stage.tsx:370-385` | add banks to `placeFigures`' (`:317-343`) busy list: a bank named during a cue becomes a small roadside marker, not the full sign |

Not applied to isometric and phoneapp: they already plan (audit).

### B2–B7

| # | design(s) | file:line | fix | why a still is needed |
|---|---|---|---|---|
| B2 | faceless | `Stage.tsx:353-355` pill `maxWidth: 760` vs LogoMark tile x ~718-960 | While the LogoMark is up (first and last 10 s, `LOGO_SECONDS`), cap the chapter pill's right edge at the tile's left minus a gap, and fit its text (`fitText`, after font ready) instead of letting it run under the tile. rba-sept-2026 has a chapter at 157.8 s, inside the closing window. | the overlap itself is inferred; shrunk pill text must be judged |
| B3 | isometric | `Captions.tsx:33-35` slab `maxWidth: 560` vs `Stage.tsx:35` `CHIP_TOP = SAFE.top + 88` | Fit the chapter title to one line (`fitText`, cap 32 px) so the 2.5 s slab never grows into the chip lane; or move `CHIP_TOP` below the slab's measured height while a chapter is up. | inferred; both change visible type/position |
| B4 | faceless, kinetic | `faceless/index.tsx:161-221`, `kinetic/Captions.tsx:140-170` | Shared pattern: draw the caption page inside `<CaptionZone>` (README rule 5) with `left`/`right`/`bottom` set to today's values (faceless `SAFE.left` / `1080-SAFE.right`; kinetic `SAFE.left`, width `SAFE_W`). Faceless's centred-stage-then-drop glide must survive: the zone holds the dropped band, the free-stage position stays a transform. | position should be pixel-identical, but faceless's two-position glide can shift |
| B5 | phoneapp | `Chips.tsx:92-100` (stat label `nowrap` + `ellipsis`, 28 px, 282 px chip) | A figure label is rule-1 content: allow two lines (`textWrap: "balance"`) or fit to the chip with `fitTextOnNLines` (2 lines, floor 24 px); never `…`. | chip height changes |
| B6 | isometric, journey | `isometric/Plaza.tsx:126` label 15 px, `:134` `LenderLogo height={34}`; `journey/Signs.tsx:218` label 22 px | Shared pattern (rule 2, logo visible + neutral label): lender logo in any chip at least ~56 px high, "ĐANG NHẮC TỚI" label at least 26 px, or drop the label rather than show it unreadable. | chip grows; must still clear the plaza / sign |
| B7 | faceless, kinetic, paper, retro, whiteboard | `faceless/Stage.tsx:410-420`, `kinetic/Captions.tsx:238-250`, `paper/Stage.tsx:588-600`, `retro/Bands.tsx:113-125`, `whiteboard/Stage.tsx:601-612` | Shared pattern for the English-line orphan ("every / year?"): add `textWrap: "balance"` to the English line, exactly as `journey/Captions.tsx:127`, `isometric/Captions.tsx:200` do. Kinetic also on the Vietnamese caption block ("người Úc trả / hàng"). | line breaks change; the orphan is seen in 4 previews, so check the same frame 120 |

## C. OPTIONS (Daniel picks by stills; ordered by effect over effort)

Row format: name · what changes · axis · reused · golden rules touched · effort · risk · what Daniel sees.

### Shared options (one pattern, several designs)

| # | name | what changes | axis | reused | rules | effort | risk | Daniel sees |
|---|---|---|---|---|---|---|---|---|
| C-X3 | Readable unsaid words | Floor of the unspoken-word opacity raised to one per-design constant, about 0.55 on light skins; paper's keyword highlighter keeps its own alpha (no 0.34 x 0.3 double fade). Applies to paper `index.tsx:205-208`, whiteboard `index.tsx:264` (0.3), journey `Captions.tsx:68` (0.35), retro `index.tsx:226` (0.38), isometric keyword `Captions.tsx:146-147`, kinetic ghost `Captions.tsx:37` (0.16 → ~0.3, kinetic's style choice, lowest priority) | captions | each design's own karaoke code | none (rule 5 lights keywords when said; it does not set the unsaid floor) | small | spoken word stands out less; keep the said-word colour change | three stills per light skin at 0.45 / 0.55 / 0.65: the page readable ahead, "tỷ đô" visible before it lands |
| C-X2 | Fuller cover title | Cover title no longer sized by the `fitText(one line) x 1.7` formula. Reuse kinetic's approach: split the title into lines between words (`kinetic/index.tsx:50-62` `titleLines`) and `fitText` each line, keeping each design's cap (104/110). Applies to paper, whiteboard, journey, isometric, orbit, phoneapp, retro, blueprint, faceless (critique X2 lines) | cover | kinetic split + `fitText` | rule 6 "Cover title uses fitText": stays inside, it is still `fitText` per line | small | very long titles get 4 lines; check the subtitle still fits | cover stills with a 30-char and a 60-char Vietnamese title, before/after |
| C-X4 | Outro in the design's skin | A design-coloured frame around the unchanged classic `Outro` (paper: taped card, whiteboard: card taped to the board, retro: coupon edge), drawn in the design's folder; the contact and compliance cards are not edited | cta | `classic/Outro` as is | rule 8: the compliance card is untouched, only framed. Whether framing is allowed at all is ruling D3; until then, do not build | medium | the compliance card must stay fully legible | outro stills of paper, whiteboard, retro |

### Per design (identity kept as the critique named it)

**blueprint** (identity: everything traced on a navy drafting sheet; CAD dimension numbers)
- C-bp1 · Title block chapter text from 19-29 px to ≥ 40 px, block grows (`Paper.tsx:307, 331, 349`) · signposting/framing · own title block · none · small · block covers more grid · the chapter readable at phone size.
- C-bp2 · Caption 54 → 64-68 px so Vietnamese clearly outranks the 32 px English (`index.tsx:59`) · captions · own · none · small · longer pages wrap to 3 lines · a stronger caption on the sheet.
- C-bp3 · Idle house trace starts each redraw with ground + walls together (`Paper.tsx:178-188`) · texture · own trace · 5b unchanged (still a change every ~1.4 s) · small · none · any frame shows a house, not an L-stub.

**faceless** (identity: dimmed stock footage under a navy veil, big centred karaoke words)
- C-fl1 · English line 36 → 32 px (with B7 balance) (`Stage.tsx:410-420`) · captions · own · none · small · none · the dropped 58 px caption reads first.
- C-fl2 · Cover gets a still frame from the stock footage behind the title, under the navy veil · cover · `Img`/`OffthreadVideo` frame of the same source the Talk uses · rule 4.3: allowed only because faceless sources are stock, never Daniel's room; ruling D4 covers the risk · medium · a busy clip lowers title contrast (run `check-contrast`) · a cover that is not a plain navy card.

**isometric** (identity: floating island city, numbers built on the plaza)
- C-is1 · Caption 50 → ~60 px, slab grows (`Captions.tsx:130`) · captions · own · none · small · slab nearer the island · a caption that is not dwarfed.
- C-is2 · Lift island and caption ~80 px, or put the chapter label in the empty sky · framing · own camera · rule 3 (stays inside SAFE) · medium · collides with B3 slab/chip work; do after B3 · upper third used.

**journey** (identity: a pin travelling an S-road on a top-down map)
- C-jo1 · English plate opaque (or blurred behind) instead of 82% white (`Captions.tsx:128-129`) · captions · own · none · small · none · no trees through "billions".
- C-jo2 · Damp the camera tilt toward the road heading · transitions · own · none · small · needs a muted phone viewing of a render, not a still · calmer map over 2-3 min.

**kinetic** (identity: brand colour blocks, slammed words, boxed numbers)
- C-ki1 · `MIN_BEAT_GAP` 24 → 45-60 frames, or wipe only at sentence ends and stage beats (`blocks.tsx:73-74`) · transitions · own · rule 5b: must stay ≤ 3 s between changes; run `check-pacing` after · small · too few wipes on a slow talk · a calmer rhythm (motion: needs a render viewing).
- C-ki2 · Ghost floor 0.16 → 0.3 (part of C-X3) · captions · own · none · small · weaker slam contrast · page readable ahead.

**orbit** (identity: voice-reactive glowing core as "the presenter")
- C-or1 · Idle core shows the chapter number or a small house glyph · framing · own core · none · small · competes with the pulse if too bright · no "loading spinner" between beats.
- C-or2 · Moon value 32-42 → ~56 px (`Stage.tsx:349`) · numbers skin · own · none · small · bigger moon may touch compare planets (do after B1) · the second number readable.
- C-or3 · Rings and starfield one step brighter (theme tints) · texture · own · rule 7 (tints only) · small · less depth · reads less dark in a bright feed.

**paper** (identity: cream desk, cut-paper cards, washi tape, torn caption strip)
- C-pa1 · Unsaid keyword readable: apply C-X3, highlighter alpha not multiplied by the span fade (`index.tsx:205-208`) · captions · own · none · small · none · "tỷ đô" visible before it lands. Highest-effect option in the group.
- C-pa2 · MotionTrack panels (eligibility/change/trend) framed as a paper card around the same panel content · cues skin · classic `MotionTrack` content unchanged, wrapper in paper's folder · rule 3b panel band unchanged · medium · panel height grows; recheck B1 places · no glossy navy card on the desk.

**phoneapp** (identity: unbranded phone; notifications, page pushes, taps)
- C-ph1 · Idle screen shows the hook headline as the first feed item instead of the grey skeleton (`Screens.tsx:2`) · framing · own feed · none · medium · none · the video no longer looks like it is buffering.
- C-ph2 · Phone scales up ~10% while a cue page is open (`Screens.tsx:79, 168, 270` text 34 px) · framing · own · rule 3 (inside SAFE) · medium · phone edges near SAFE · cue page text readable.

**retro** (identity: pop-art poster; sunburst, halftone, offset shadows, stamps)
- C-re1 · Caption shadow 3 → 2 px, or shadow on keywords only (`index.tsx:225`) · captions · own · none · small · a little less "print" · clean Vietnamese tone marks.
- C-re2 · Free caption brought down toward the visual centre · framing · own · rule 3 (inside SAFE) · small · closer to the English strip · no empty lower half.
- C-re3 · Sunburst slower or lower contrast under the caption ribbon · texture · own · 5b unaffected (ambient motion is not counted) · small · needs motion viewing · eye stays on words.

**whiteboard** (identity: marker on a glossy board; circled numbers, eraser wipes)
- C-wb1 · Erased-marker ghosts kept out of the caption band, or halved (`Board.tsx:82-106`) · texture · own · none · small · none · no stroke through "every".
- C-wb2 · Slightly warmer/darker aluminium frame · framing · own · rule 7 (theme tints) · small · none · the board has an edge in a bright feed.

## D. RULINGS (Daniel only)

| # | question | reading 1 and its cost | reading 2 and its cost |
|---|---|---|---|
| D1 | Rule 3c, "The Cover keeps its own logo at the same size and place" (README:65-67). Must every faceless cover put the logo top-right like the talk LogoMark? Affects blueprint `index.tsx:179-191`, faceless `:111-123`, isometric `:66-79`, journey `:68-79`, orbit `:120-131`, retro `:90-102` (top-centre) and phoneapp `Chrome.tsx:286-296` (top-left). kinetic, paper, whiteboard already comply. | Literal: top-right on every cover. Cost: 7 small edits, but each cover was composed around a centred logo, so each needs a still and maybe a title re-balance (7 x B). Gain: no logo jump at the cover-to-talk cut. | "Same size" binds, "place" is per cover design. Cost: write that reading into README (Daniel's file) so the next audit stops flagging it; the jump at the cut stays. |
| D2 | faceless `template.json:47-51`: `"preview": null`, `"promoted": "2026-09-27"`, `"promotedNote": "grandfathered: in use before the gate"`, while `promote-design --dry-run` shows 8 failures. Keep the grandfathered promotion? | Keep: it stays ranked above unproven designs (`check-selector.mjs:67-75`) and remains the default for rba-sept-2026. Cost: the one design with the worst measured overlap (B1, 2.60 s) is ranked "proven"; no preview for anyone to judge it by. | Demote (remove `promoted`) until A2-A4 + B1 + B4 land and a preview renders. Cost: the selector may pick an unproven design for news videos meanwhile; `check-selector` test fixture may need its expectations rechecked. Either way, a `preview.png` needs a render outside this sandbox. |
| D3 | May a design frame the shared classic `Outro` (contact + compliance card) in its own skin (C-X4)? | Yes, frame only: unlocks C-X4. Cost: compliance reviewer re-checks one outro still per framed design. | No, the outro is locked as is: C-X4 is dropped; light designs keep the navy card at the end. |
| D4 | faceless `index.tsx:134-140` shows `source.mp4` at 55% opacity. On a faceless source that is fine; set by hand on an on-camera recording it would be a tinted room (rule 4.3). Is the selector's `facePolicy` guard enough? | Enough: no change. Cost: a manual override can still produce a tinted room. | Add a guard (render the navy veil only when the recording has a face/foreground cut-out). Cost: small code in faceless, and C-fl2 must use the same guard. |

## Order of work

1. A1-A8 (all small; A3+A2+A4 together make faceless pass the colour/constant parts of the gate).
2. B1 in faceless first (the design rba-sept-2026 uses, worst measured overlap), then blueprint, kinetic,
   paper, retro, whiteboard, orbit, journey; with B2 in the faceless pass.
3. B7 (five one-line edits), B4, B5, B6, B3.
4. Options by effect over effort: C-pa1/C-X3, C-X2, C-bp1, C-is1, C-jo1, C-wb1, C-re1, C-ph1, C-ki1 and the
   rest; C-X4 only after D3.

## What I would not do, and why

- Not shorten or skip a figure to clear a clash (rule 1 shows every figure; rule 5b reading holds win).
  Clashes go to a second place (B1) or a queue (A6), never a cut.
- Not build one shared scheduler in `src/mortgage/` (out of bounds for this team); per-folder copies with
  a ponytail note instead.
- Not raise kinetic's caption ghost to "full" or remove karaoke fades: that is the design's identity.
- Not add a texture element from `.claude/elements` to the plain faceless look: its identity is footage;
  C-fl2 uses the footage itself.
- Not count ambient motion toward `check-pacing`: the pacing gaps measured (8.7 s, 17.8 s, 13.4 s) are
  edit.json data issues, not template fixes (audit).

## What Daniel must verify

- Every B item and every C option on a still (`npx remotion still … --scale=0.5`); none was rendered here.
- D1-D4 decisions.
- Motion-only options (C-jo2, C-ki1, C-re3) need a muted phone viewing of a render.
- Unverified: kinetic's cover `Stack` sizes its lines with `fitText` (read at `kinetic/Stage.tsx:121`, not
  traced end to end); C-X2 relies on that precedent.
