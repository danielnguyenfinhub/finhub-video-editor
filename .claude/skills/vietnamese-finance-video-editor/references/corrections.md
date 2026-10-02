# Corrections: what Daniel changed, as rules for every future video

Daniel's feedback on finished videos and stills, turned into general rules so the same
correction is never needed twice. `landmines.md` holds technical failures (a render broke);
this file holds quality and taste (the video worked, Daniel didn't like it).
`editing-principles.md` "Craft rules" is the professional baseline these sit on top of.

## The loop (every session that edits a video)

1. **Before building**: read the entries whose scope matches the job (`all`, the design id,
   `A` footage or `B` faceless). They are rules, not history: apply them.
2. **When Daniel corrects something**, log it before fixing it: one entry below. Write the
   rule for every video, not just this one ("Kitchen Table text too small" becomes "template
   text at least N px"), and name what caused it (the design, element or core file).
3. **Promote** a rule as it proves itself:
   - `noted`: first time, written here only.
   - `rule`: a second occurrence, or Daniel says "always"/"never" → add it to the rule's
     home (`src/designs/README.md` golden rules, the editor `SKILL.md` design rules, or
     `editing-principles.md`) and link it here.
   - `checked`: the rule can be measured → a script fails when it is broken
     (`check-golden`, `promote-design`, `check-captions`, …). A check beats prose: prose is
     read sometimes, a check runs every time.
4. **QC** (`video-qc`) checks every matching `rule` and `checked` entry on the stills.
   A broken one is a FIX, not a note.
5. **Never delete** an entry. When Daniel reverses a rule, mark it `superseded (date): new
   rule` so the next session doesn't bring the old one back.

The repo is public: no client names, figures or documents in an entry. Say what was on
screen ("the rate card"), never whose.

## Entry format

`date · scope · "what Daniel said (short)" → rule → where it lives / what checks it · status`

## Entries

- 25/09/2026 · all · "every number needs a visual" → each spoken number gets a chart or
  counter (`figuresOf`) → golden rule 1; check-golden fails when `figuresOf` misses a spoken
  figure or a stat stops covering it (01/10/2026) · `checked`
- 25/09/2026 · all · "show the bank's logo" → a named bank shows its logo, neutral frame,
  logo centred in its bar → golden rule 2, `LenderLogo`; check-golden fails when a named bank
  (aliases, repeats) is not detected by `lenderMentionsOf`; the frame and centring are still
  judged on stills (01/10/2026) · `checked`
- 25/09/2026 · all · "must work in the Facebook feed" → all text inside `SAFE` (4:5 band) →
  golden rule 3 · `rule`
- 25/09/2026 · all · "charts cover my face" → overlays stay out of `FACE`; figures render
  behind the cut-out → golden rule 3b · `rule`
- 25/09/2026 · all · "logo too big / always there" → 120 px logo, first and last 10 s only →
  golden rule 3c, `LogoMark` · `rule`
- 25/09/2026 · design:kitchen, all · "text too small" → template text is large; judge it on
  a phone-size still, not the Studio canvas · floor 30 px (about 11 pt on a phone; decided 01/10/2026
  while Daniel was away, he can change it); `check-text-size.mjs` is a ratchet: no design may add
  fontSize literals under it beyond `config/text-size-baseline.json` (116 today, to be reduced by design
  work; sizes computed at run time are not seen) · `checked` for growth, `open` for the existing ones
- 25/09/2026 · all · "too static" → a visual change every 1.5–3 s, except a card or number
  held for its reading time → golden rule 5b, `READING`; `check-pacing <slug>` exits 2 on a gap
  over 3 s or an empty card, and check-golden pins the `READING` floor (01/10/2026) · `checked`
- 27/09/2026 · all · "panels cover my head" → no cue panel over the whole head, hair
  included; panels sized to content → `useCueRoom`, `"cueRoom": true`; check-golden counts
  face-hidden time · `checked`
- 27/09/2026 · design:classic · verdict pill wrapped to two lines over the eyebrows (QC
  still) → one-line pill, `fitText` to its width → `src/designs/classic/Cues.tsx` · `rule`
- 27/09/2026 · all · "background: black layer or blur instead of removing" → removed by
  default; opt-in quick mode vignette; raw room never shown while talking; covers may use
  the recorded frame → golden rule 4; check-golden labels quick mode · `checked`
- 27/09/2026 · design:explainer · the small bar in the bars card ("Phí năm") is pale pink
  and hard to read (QC still) → every bar and its label reach readable contrast on the
  backdrop → bar hatch at 80%/100% in `src/designs/explainer/Cues.tsx`; `check-contrast`
  fails a see-through chart fill under 3:1 (01/10/2026) · `checked`
- 30/09/2026 · design:cards · "accept the cards pace" (the 6.5-minute doi-nha video) → on talks
  over about 3 minutes the cards design holds chapter and points cards for long stretches;
  accepted, reported as INFO by `check-pacing` → golden rule 5b exception;
  `check-pacing.selftest` fails if the exception stops applying (01/10/2026) · `checked`
- 30/09/2026 · all · Daniel asked why a 3-video batch took a whole day → process rules: render
  once after `check-schema`, `check-speech-cuts` and `check-pacing` pass; one round for cosmetic
  findings; QC measures rule 5b only with `check-pacing` → `video-production-team` "Render once"
  and FIX policy · `checked` for "check before render": `preflight.mjs` blocks, in Node, on a speech cut
  and on a crash of `check-speech-cuts` or `check-pacing` (which also parses `edit.json`'s schema)
  (`check-preflight.mjs`); the composition schema (`check-schema`) blocks only when a browser
  runs: if its browser fails, preflight warns and the render checks it again (01/10/2026);
  the one-round FIX policy stays a `rule`
- 30/09/2026 · scope A · "don't monitor me in edit footage; use compliance to correct yourself when
  generating scripts" → spoken words in his footage are advisory verify notes, never a gate;
  team-written text and Pipeline B scripts stay gated → `video-compliance-review` "Scope" · `rule`
- 30/09/2026 · all footage · "what happened to my voice, it's not normal" / "my tone of voice is
  different too" → auto pacing played each segment at 0.9–1.2×, so pitch moved +31% / −9% and
  timbre changed; the docs wrongly said "pitch preserved" and no check listened. Rule: his footage
  always has `"pacing": {"mode": "off"}`; a segment at exactly 1× matched his spectrum within
  0.4 dB → `edit-json.md`, `scripts/preflight.mjs` blocks the render otherwise · `checked`
- 02/10/2026 · design:faceless, paper · "go ahead and fix it" (viewed critique: "2026" counted up
  as "1.426" / "1554") → a calendar year (19xx/20xx) or a date is shown as said, never counted
  up, never given a thousands dot or a scale bar. Faceless: a figure said during the hook waits
  until `HOOK_FRAMES`; staged figures never overlap (the next waits for a hold to end) and a
  stat keeps its whole reading time (`stagedFigures`) → `check-design-figures` fails on a
  counted year or an overlap · `checked`
- 02/10/2026 · design:journey, orbit, isometric, retro, kinetic · "ThángHai" (viewed critique:
  the said word's scale-up eats the space) → a caption word that scales when said keeps a fixed
  side margin of half its overflow on every word (constant, so the line never reflows); kinetic's
  slam is 1.12 (was 1.28), scaled about the baseline with no drop → `saidRoom` in each design;
  `check-design-figures` fails when a design loses it · `checked`
- 02/10/2026 · design:kinetic · audit C-X3/C-ki2 (unsaid words "close to invisible", navy on navy)
  → unsaid caption words at `GHOST` 0.35 (was 0.16), readable ahead · `rule`
- 02/10/2026 · all designs (core) · "Yes approve and fix", then "Option 1, allow it and retry" (viewed
  critiques 08 V1/S2: "CON SỐ 2026" during the hook in all eleven data designs, ticker flipping it as
  "5 2 4") → golden rule 1 exception: a year or a date is shown as said (core `asSaid`, years and dates
  only: 19xx/20xx alone or after "năm", day/month with day 1-31 and month 1-12, so not "2000 đô" or
  "20/80"; still a figure, never counted, flipped or spun, no thousands dot, no bar, ring, meter or
  needle, no rate label: an automatic year or date gets `label: ""`, a design may use a neutral
  "NĂM" / "NGÀY"); with a hook, `figuresOf` makes a figure said under it wait for `HOOK_FRAMES`, the
  next waits for its hold (no overlap), each keeps its reading time, `saidFrame` keeps when it was
  said; figures said after the hook keep their time unless an earlier waiting figure is still held,
  in which case they wait for it (rba-sept-2026: "3,6" said at 133 shows at 150) →
  `src/designs/README.md` rule 1; `check-golden` (self-tests, README text) and `check-design-figures`
  (evaluated: the core, every design file that defines a figure counter, the ten data stage plans,
  ticker flaps, flash/ticker/kinetic meters, faceless ring, gauge needle, the neutral kickers) ·
  `checked`; that a meter is drawn only through its fill function is a source check · `rule`
- 02/10/2026 · design:gauge, pulse, scale, receipt, calendar, timelapse, splitscreen, flipcard · viewed
  critiques 08 V2/S1 (hook count-up from 0 paused at "4,06%", "2,39%", "0,00%" for a 4,35% rate) → a
  hook number never counts from 0: only its last tenth, exact by half the design's count (`hookCount`,
  golden.ts) → `check-design-figures` evaluates each design's hook text at progress 0, 0.5 and 1 ·
  `checked`
- 02/10/2026 · design:flipcard · cue text in the fallback font; "ThángHai" again → the cue track sets
  `fontFamily: FONT` (source check · `rule`); the said word's card grows into a fixed side margin
  (`saidRoom`, evaluated), never into the word space · `checked`
- 02/10/2026 · design:ticker · "Lãi suất 4,35%: cần CVSB R" (random-capital decode) → a letter never
  spins through other letters (flaps on itself), only a non-year digit spins · `checked`; the tape
  starts after the hook (one mover in the hook): source check only · `rule`
- 02/10/2026 · design:receipt, calendar, scale, timelapse · viewed critique 08 → "TỔNG" only on an
  amount, never on a rate; calendar tears the title page off before a points notepad comes in; a lone
  hook value keeps the scale beam level and no plaque covers the pillar → evaluated in
  `check-design-figures` · `checked`; timelapse keeps the dial large (r 118) beside the points title:
  needs a render · `rule`
- 02/10/2026 · design:kinetic (and every design with its own counter) · recheck 09: kinetic counted
  "2026" up from 0 over a bar ("2021" at frame 200) once the year left the hook → every design
  counter returns a year or date as said (`asSaid`), kinetic draws no bar for it; a design file that
  defines `counted` must be listed in `check-design-figures`, which evaluates it · `checked`
- 02/10/2026 · design:receipt, timelapse · recheck 09: "sau 3 / lần tăng", "cơ / bản" → a headline
  never splits a number from its word or a two-word finance unit (`keepUnits`, no-break spaces;
  src/elements/keepUnits.ts) → evaluated in `check-design-figures`, its use by source · `checked`
- 02/10/2026 · classic `Panel` (every host) · "Fix all these", review c849a4c (step panel dropped in over
  the logo and above SAFE; checklist unclipped; LogoMark on the panel's corner; explainer points at y 110)
  → `Panel` is clipped at its rest top only while above it (no shadow then), so it never reaches above
  where it rests; while the logo shows a panel resting above its bottom keeps its right edge at
  `LOGO_CLEAR`, decided once per cue (a cue touching a logo window ±8 frames is narrow for its whole
  life: it never rewraps while read, at the cost of a long cue staying narrow after the logo leaves);
  every host sets `PanelPlace` (explainer's points at 0.8 from SAFE.top) → check-design-figures (g),
  all hosts, one width per cue · `checked`; a narrowed trend graph prints its values under 32 px;
  youtube/Kit narrows on the vertical logo windows, not LogoMark16's (from frame 0), and rests at
  y 62 above YT_SAFE (older) · `rule` (known risks)
- 02/10/2026 · design:ticker · VI and EN lines split by the tape; a 4th EN line clipped → bilingual lines
  are one block (EN right under the caption, tape on SAFE.bottom); EN shrinks to fit its band · `rule`
- 02/10/2026 · promote-design · "Fix all these", review c849a4c → `promoted` attests: a check that cannot
  run (talking-head fixture without recording and matte) is INCOMPLETE, never "ok"; the faceless
  fixture's sandbox placeholder is navy, NOT its stock footage, so a sandbox pass proves the render, not
  the look over footage (logged "SANDBOX PICTURE"; faceless itself promotes on Daniel's PC) →
  check-promote (fixture media) · `checked`; the look over footage · `rule`
- 02/10/2026 · kinetic, whiteboard, retro, receipt, paper, blueprint · dead hook-share branches → a design
  does not re-handle what the core guarantees; delete once a fixture replay proves it unreachable →
  check-design-figures (h) · `checked`
- 02/10/2026 · all designs · view7 stills and review c849a4c (rings/road bars on years, "CON SỐ 2026",
  hooks from 0 via `countTo * t` or `[0, hook.countTo]`, "4,1TỶ ĐÔ", "9%" for 10%) → a year or date
  never gets a ring, road or count; every hook prints through the core `hookText`, which counts inside
  `big` and ends exactly as written ("$4.1B", "750.000 ĐÔ") → check-design-figures (d)(f), evaluated;
  any other `countTo` read in a design fails (source) · `checked`
- 02/10/2026 · blueprint, orbit, phoneapp · a figure under a compare cue; "0/2" bar half full → the cue
  wins, but a figure is never dropped (rule 1, review 557b020): cut after its floor, held over the
  cue's drop-in when short by ≤ 10 frames, else shown after the cue (a chip when another cue holds
  the stage); the bar is said / n → check-design-figures (i), every fixture · `checked`
