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
  counter (`figuresOf`) → golden rule 1 · `rule`
- 25/09/2026 · all · "show the bank's logo" → a named bank shows its logo, neutral frame,
  logo centred in its bar → golden rule 2, `LenderLogo` · `rule`
- 25/09/2026 · all · "must work in the Facebook feed" → all text inside `SAFE` (4:5 band) →
  golden rule 3 · `rule`
- 25/09/2026 · all · "charts cover my face" → overlays stay out of `FACE`; figures render
  behind the cut-out → golden rule 3b · `rule`
- 25/09/2026 · all · "logo too big / always there" → 120 px logo, first and last 10 s only →
  golden rule 3c, `LogoMark` · `rule`
- 25/09/2026 · design:kitchen, all · "text too small" → template text is large; judge it on
  a phone-size still, not the Studio canvas · no floor yet (Daniel to set);
  `check-text-size.mjs` lists sizes under a placeholder 30 px, report only · `noted`
- 25/09/2026 · all · "too static" → a visual change every 1.5–3 s, except a card or number
  held for its reading time → golden rule 5b, `READING` · `rule`
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
  accepted, reported as INFO by `check-pacing` → golden rule 5b exception · `rule`
- 30/09/2026 · all · Daniel asked why a 3-video batch took a whole day → process rules: render
  once after `check-schema`, `check-speech-cuts` and `check-pacing` pass; one round for cosmetic
  findings; QC measures rule 5b only with `check-pacing` → `video-production-team` "Render once"
  and FIX policy · `rule`
- 30/09/2026 · scope A · "don't monitor me in edit footage; use compliance to correct yourself when
  generating scripts" → spoken words in his footage are advisory verify notes, never a gate;
  team-written text and Pipeline B scripts stay gated → `video-compliance-review` "Scope" · `rule`
- 30/09/2026 · all footage · "what happened to my voice, it's not normal" / "my tone of voice is
  different too" → auto pacing played each segment at 0.9–1.2×, so pitch moved +31% / −9% and
  timbre changed; the docs wrongly said "pitch preserved" and no check listened. Rule: his footage
  always has `"pacing": {"mode": "off"}`; a segment at exactly 1× matched his spectrum within
  0.4 dB → `edit-json.md`, `scripts/preflight.mjs` blocks the render otherwise · `checked`
