---
name: purposeful-motion
description: >-
  How a Finance Hub video chooses motion graphics, elements and effects so each one helps the
  viewer understand the message, not only stay engaged. Six purposes (anchor, compare, sequence,
  emphasise, breathe, brand), the earns-its-place test, the source ladder (design cues, src/elements,
  vendored Remotion Elements, remocn, Remotion packages) and the visual-plan file the motion
  designer writes and the editor builds from. Use when planning the visuals of a video ("plan the
  visuals", "which element for this number", "why this effect", "visual plan", "effects with
  purpose", "too many effects", "make the graphics clearer"). NOT for compliance wording
  (video-compliance-review), for building or changing a template (template-improvement-team), or
  for choosing the template itself (select-template.mjs).
---

# Purposeful motion

**Principle.** Every on-screen motion answers one question: *what does the viewer understand
faster, or remember better, because this is on screen?* If the honest answer is "nothing, it just
moves", the beat gets no effect: Daniel's face and voice carry it. Engagement is a side effect of
clarity, never the goal of a cue.

Read `references/purpose-taxonomy.md` when mapping a beat to an element, and
`references/element-sources.md` when you need to know where an element lives and how to read its
catalogue cheaply.

## The six purposes (and the seventh, none)

| Purpose | The viewer should | Typical data shape |
|---|---|---|
| `anchor` | read a number and keep it | one figure (golden rule 1 shows it anyway: this decides *how*) |
| `compare` | see which is bigger, cheaper, sooner | 2–4 values, before/after, A vs B |
| `sequence` | hold steps in order | 2–5 steps, a timeline, a checklist |
| `emphasise` | catch the one word that changes the meaning | a word or phrase inside a sentence |
| `breathe` | notice the topic has changed and reset | a chapter boundary (the only purpose allowed with no data) |
| `brand` | know who is talking and what to do next | logo, bank logo (rule 2), CTA, outro |
| `none` | watch Daniel | everything else |

A beat has exactly one purpose. Two purposes on one beat means two beats or one too many.

## The earns-its-place test

An effect goes into the plan only when all five hold; write the failing one as the reason when
it does not:

1. **Names the message.** The beat's `said` text contains the thing the element shows (the
   number, the two things compared, the steps). An element that shows something Daniel did not
   say is a new claim: out, or `open_questions`.
2. **Readable in the hold.** `holdMs` ≥ `READING.minNumberHoldMs` (`src/mortgage/golden.ts`)
   for a figure, and long enough to read every word on the element at phone size (rule 5b is
   measured by `check-pacing.mjs`; do not restate its numbers, point at it).
3. **Alone on screen.** Golden rule 1: no two figures up at once; a hook figure waits for the
   hook. A planned element that would overlap an automatic figure loses.
4. **Inside the frame rules.** SAFE band and FACE box (`src/designs/README.md`), hook placement
   rule 6; captions keep their contrast (no background shader behind caption lines).
5. **Compliant as text.** No RG 234 watch-word in on-screen copy; no tick, cross, rank or colour
   that implies one lender is recommended (rule 2: a logo, not a verdict); years and dates shown
   as said (`asSaid`), never counted or spun.

## The source ladder (stop at the first rung that holds)

1. **The design's own grammar, zero code:** `edit.json` `stats` and `cues` (`compare`, `bars`,
   `points`, `verdict`, `venn`, `kinetic`, `emoji`, `lenders`), `hook`, `chapters`, `visuals`.
   Already compliant, already timed by the core, already QC'd by `check-golden.mjs`.
2. **`src/elements/*.tsx`** (list in `src/designs/README.md` "Elements to reuse").
3. **Vendored Remotion Elements:** `.claude/elements/CATALOG.md`; `data/`, `text/`, `overlays/`
   are the useful categories for a finance talk.
4. **remocn** (165 components, MIT): read the component page's `useWhen` / `avoidWhen` before
   naming it; `element-sources.md` says where the pages are offline and online.
5. **Remotion packages** (`reference/remotion/`, ideas; `node_modules/@remotion/*` 4.0.527, code):
   transitions, light-leaks, shapes, paths, rough-notation, rounded-text-box.
6. **HyperFrames overlay** (`hyperframes-overlay` skill): a registry block (bar-chart race, money
   count, flowchart, shader reveal) rendered to a transparent WebM and placed as a `visuals`
   `motion` entry. No template change, but a second render and an HTML file per beat, so last.

Rungs 2–5 need code in a design folder. In a video run that is a `open_questions` line for
Daniel ("this beat wants X, which no design has; build it with the repo-build-team or drop to the
cue grammar"), never a mid-run template change. The plan names the rung-1 cue as the fallback.

## Anti-patterns (each is a FIX when QC finds it)

- An effect every few seconds, or any effect whose `why` is a synonym of "engaging".
- A transition inside a sentence, or a `breathe` where the topic did not change.
- A counter, wheel or roll on a year or date (`asSaid`).
- A shader, particle or texture background behind caption lines or a figure.
- Two elements animating at once; an element entering while a figure is still held.
- A verdict element (tick, cross, strike) applied to a lender name.
- Text in an element without Vietnamese diacritics, or a font with no Vietnamese subset
  (the vendored captions use Figtree: swap it, see `AGENTS.md` "Language").

## The visual plan — `out/videos/<slug>/team/02_visual_plan.json`

Written by `motion-designer`, built by `video-editor`, traced by `video-qc`.

```json
{"status": "ok | blocked | failed",
 "message": {"vi": "", "en": ""},
 "design": "<id from selection.json, or null when not chosen yet>",
 "beats": [
   {"id": "b1", "atMs": 0, "endMs": 0, "said": "<Daniel's words, verbatim>",
    "purpose": "anchor | compare | sequence | emphasise | breathe | brand",
    "element": {"rung": 1, "source": "cue", "name": "bars", "fallback": "cue:compare"},
    "why": "<the understanding gained, one line>", "holdMs": 0,
    "test": {"names_message": true, "readable": true, "alone": true, "frame": true, "compliant": true},
    "risk": "<what could go wrong on screen, or none>"}],
 "no_effect": [{"atMs": 0, "endMs": 0, "why": "<the face carries it: story, feeling, aside>"}],
 "open_questions": [], "sources_read": ["<catalogue files actually opened>"]}
```

Rules of the file: beats are in time order and never overlap; every number in the clarity map
(`01_marketing_review.md`) appears in a beat or in `no_effect` with a reason; a rung above 1
always carries a rung-1 `fallback`; `holdMs` is what the viewer needs, not what the clip allows
(the editor shortens only with an `open_questions` line).

## How each role uses this skill

- **motion-designer:** the whole skill; writes the plan.
- **video-editor:** builds the plan's beats, at the plan's times and holds, with the named
  element or its fallback; adds nothing the plan does not name except what the design core adds
  by itself (automatic figures, bank logos, captions); a beat it cannot build goes to
  `open_questions`, never a substitute effect.
- **video-qc:** the plan trace: every `cue`, `stat`, `visual` and chapter in `edit.json` maps to
  a beat id, `no_effect` spans carry none, and every planned beat is built or has an open
  question. Orphan effect, missing beat, or a `breathe` mid-sentence → FIX for the editor.
- **marketing-manager:** uses the purposes to write the clarity map (which beats must be
  understood), not the elements.
