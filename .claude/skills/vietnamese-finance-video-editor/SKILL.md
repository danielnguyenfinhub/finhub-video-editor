---
name: vietnamese-finance-video-editor
description: >-
  Edits Daniel's Vietnamese mortgage talking-head videos into branded, compliant
  Facebook/Reels videos where EVERY video gets its own design chosen from its
  content: cover concept, caption style, framing, infographic language,
  transitions, texture, sound and CTA, built from the full Remotion toolkit (3D,
  shaders, drawn paths, cut-outs, transitions, sfx) on a locked core (FinHub
  colours, fonts, logo, cuts, pacing, RG 234 guard, compliance card). It is the
  standard the video-editor agent follows; Daniel's requests to edit or make a
  video ("edit my video", "I recorded a video about…", "new design for my video")
  start the video-production-team skill, which runs this one. Use it directly for
  a single edit.json or design question, or when Daniel says to skip the team:
  add captions, cut the pauses, make it look different. Output: 1080p mp4, phone copy under 30
  MB, thumbnail, .srt, design-log entry, verify list. NOT for lender-policy videos
  with stock footage → finhub-policy-video. NOT for footage-free motion graphics →
  finhub-rate-alert-reel. NOT for only a logo/intro/outro → finhub-branded-reel.
---

# Vietnamese Finance Video Editor — locked core, new design every video

**Team:** the full process for a talking-head or faceless video runs under the `video-production-team` skill; this skill is the standard its `video-editor` agent follows.

**User story:** Daniel drops a Vietnamese talking-head video about a mortgage topic and
gets back a finished, compliant video that looks like no previous one — designed from
what he says — plus a thumbnail and a short verify list. He makes no design decisions;
you are the editor AND the motion designer.

Project: this repository, `danielnguyenfinhub/finhub-video` (Remotion 4.0.527); on
Daniel's PC, the `finhub-video` folder GitHub Desktop cloned. Run every command from the
repository root. Composition
`MortgageReel` (1080×1920, 30 fps) = LOCKED CORE (`src/mortgage/`) + one DESIGN
(`src/designs/<id>/`) named by `"design"` in `public/videos/<slug>/edit.json`.

References (read the one you need, when you need it):
- `references/design-architecture.md` — core/design contract; the one-time bootstrap
- `references/design-space.md` — the 8 design axes, directions, signature moments
- `references/toolkit.md` — every installed Remotion package, plus the element
  libraries in `.claude/elements/`: when each earns its place, how to adapt an element
- `references/edit-json.md` — every edit.json field
- `references/editing-principles.md` — craft: the Craft rules section only (grep ^## Craft rules:
  `sed -n '/^## Craft rules/,/^# /p'`); grep a numbered section when a step needs it (3.1
  keyword list, 6 hook and pacing checklist)
- `references/landmines.md` — failures already hit once; read before Step 1
- `references/faceless-script.md` — document → script.json (voice, footage, post copy) for a faceless video

## Iron rules (bridges — cliffs both sides)

> ⚑ IRON RULE: Never change Daniel's meaning. Cut noise (silence, fillers, false starts,
> repeated takes); never cut or reword a claim, a number or a disclaimer. Unsure → keep it.

> ⚑ IRON RULE: Check the maths of every number Daniel says before it goes on screen. A
> wrong figure is flagged to Daniel with its timestamp and never shown; he chooses
> re-record or cut (`remove`).

> ⚑ IRON RULE: The core is locked. Never edit `src/mortgage/` or `src/brand/theme.ts`
> to make one video look different. The compliance card (Finance Hub & Networks Pty Ltd,
> ACN 644 141 613, ACL 573164; "Daniel Nguyen (Credit Representative 369168) is
> authorised under Australian Credit Licence 573164."; the full-situation disclaimer EN +
> VI) is the last 5 seconds of every video, unchanged. Extend the core only for a
> reusable need, and prove it with a regression render of a previous video.

> ⚑ IRON RULE: Colours come only from `src/brand/theme.ts` tokens (navy #0B1F3D, blue
> #0064A8, amber #F5A524, highlight #FFB938; good/bad only to mean good/bad). Tints and
> gradients of those tokens are fine; a new hue is not. Every font must render every
> Vietnamese diacritic (Be Vietnam Pro is the default). The logo always sits on white.

> ⚑ IRON RULE: Every on-screen string — edit.json copy AND text hard-coded in a design —
> passes the RG 234 guard at render time; a design lists its hard-coded strings in its
> exported `copy`. Never add an exemption just to make the render pass.

> ⚑ IRON RULE: No advertised interest rate without `compliance.advertisedRate` (rate,
> comparison rate, as-at date). Tax talk (deductions, prepaid interest, negative
> gearing) → the compliance card carries the "not tax advice" note.

Daniel's spoken words are not scanned: list any RG 234 watch-words (tốt nhất, rẻ nhất,
miễn phí, đảm bảo …) in the verify list — never silently cut them.

## Design rules (open field — the why, then your taste)

- **Variety is the product.** Daniel's audience must never feel a template. Read the
  design log (`python .claude/skills/vietnamese-finance-video-editor/scripts/main.py log`). Novelty is for the **skin** only:
  the new design differs from each of the last 3 videos on ≥ 4 of the 7 skin axes and
  never repeats the previous video's cover concept or caption style
  (`python .claude/skills/vietnamese-finance-video-editor/scripts/main.py check <axes.json>` proves it). **Grammar** (how numbers,
  comparisons, steps and eligibility are shown; caption position) stays consistent per
  data shape (`references/design-space.md`).
- **Held long enough to read.** Cards and cues hold for their reading time
  (`READING` in `src/mortgage/golden.ts`); a hold beats the 1.5–3 s change rule, and the
  change is carried by motion inside the scene. Caption pages follow speech, so they
  are only reported when faster than 22 chars/s (consider paging or a remove).
- **Background removed** (the matted cut-out), unless Daniel opts into quick mode
  (`"background": "vignette"`: no matting, full frame, dark edges). Never pick quick
  mode yourself; the rules are golden rule 4 in `src/designs/README.md`.
- **Content decides the direction**, not habit (decision tree below).
- **Use the toolkit generously, but every effect earns its place**: it makes the point
  clearer, or it holds attention at a retention moment (the hook, a number, a topic
  change, the conclusion). Decoration that covers Daniel's face for > ~3 s is a defect.
- **Reuse before building**: remix an existing design in `src/designs/`; pick a ready
  element from `.claude/elements/CATALOG.md` (Remotion Elements) or
  `.claude/elements/remocn/CATALOG.md` (`head -n 22`, then grep; 300+ remocn animations, transitions, shaders,
  kinetic text, icons, templates) and adapt it (toolkit.md → "Element libraries"); or lift a scene
  idea from the starter projects (`my-three`, `my-skia`, `my-audiogram`, `my-code-hike`,
  `my-tiktok`, `my-prompt-to-motion-graphics`, `my-music-visualization`, `my-overlay`)
  in `starters/` (each its own project: `npm i` inside it to run one),
  mapping every colour to theme tokens.
- **Verify at source**: before using a package API, read its types in
  `node_modules/@remotion/<pkg>`; never write a prop from memory.

## Decision Tree — content → direction

**Footage edits (Pipeline A) default to `cards`** (Daniel, 29/09/2026): record it with `select-template.mjs <slug> --pick cards --reason "Daniel's default for footage"` unless he names another template. Faceless videos keep using the selector.
Run `node scripts/select-template.mjs <slug>` (unless Daniel asks for a previous video's look: reuse it, log `reused: true`); its `pick` and top 3 with scores are in `out/videos/<slug>/selection.json`, and `--pick <id> --reason "…"` records an override. Designs that have passed `promote-design.mjs` rank first; the rest are marked `unproven` (still pickable).
If the script errors: number-heavy → DATA-LED, a mechanism → EXPLAINER, steps → ROADMAP, a warning → ALERT, news → BROADCAST, a story → CINEMATIC;
change direction (or ≥ 5 axes) if the previous video used it. Directions and axes: `references/design-space.md`.

## Workflow

Before each step state what you will do, what you expect, and what you do if it differs.
The full production order for both pipelines (edit footage, faceless), with every command and
gate, is `references/runbook.md`; the steps below are the talking-head core it follows.

**Step 0 — Reason first.** State the video file, slug (kebab-case ASCII), topic in one
line, new or re-edit. Read `references/landmines.md` and the design log. Run
`git status` in the repo: if uncommitted work exists, say so before touching anything
(GitHub Desktop stashes uncommitted work on every pull or branch switch).

**Step 1 — Prep.** `python scripts/prep-video.py "<video>" <slug>` from the repository root, in the
background (faster-whisper large-v3 on CPU takes minutes). It writes the short-GOP proxy
`source.mp4` and `words.json` once per recording in `public/recordings/<id>/` (id defaults to the
slug), a pace table, and a skeleton `public/videos/<slug>/edit.json` whose `"source"` names the
recording. If that recording already exists, prep stops and names the slugs using it: a new
take needs another `--recording <id>`; deleting the folder replaces the recording for all of
them (ask Daniel first). A new design of a recording already prepared is a new slug with no
video file: `python scripts/prep-video.py <slug> --recording <id>` writes only its `edit.json`. Check the source
aspect ratio: a non-9:16 source is cover-cropped; confirm the face stays in frame.
Several takes (or Daniel's own B-roll): prep each take with its own `--recording <id>`, then
do the paper edit first: order and trim the clips from the transcripts into
`public/videos/<slug>/clips.json` and run `prep-video.py <slug> --clips <that file>`
before touching `edit.json` (shape: `references/edit-json.md`, "Several takes").

**Step 2 — Understand the talk.** One paragraph: problem, example, conclusion. Mark the
hook sentence, topic changes, every number (maths-checked), false starts, misheard words
(context-bound fixes, never audio cuts), RG 234 watch-words, tax talk.

**Step 3 — Design brief** (write it into edit.json `notes`): the design `select-template.mjs` picked and why; the
8 axes filled in; `python .claude/skills/vietnamese-finance-video-editor/scripts/main.py check` output showing the axes that differ from
the last 3 videos; the 3–6 signature moments (hook, key number, turn, conclusion) and the
exact effect at each.

**Step 4 — Build.** A new `src/designs/<id>/` (or a remix) implementing the `Design`
contract; register it (one line in `src/designs/index.ts`); set `"design"` in edit.json;
time every beat from `words.json` `startMs`. Keep each design file under ~400 lines.

**Step 5 — Preview.** `node scripts/check-schema.mjs <slug>`
(schema + RG 234), `node scripts/check-speech-cuts.mjs <slug>` (dropped speech) and
`node scripts/check-pacing.mjs <slug>` (rule 5b); preflight runs both before every render.
Then stills (`--gl=angle --scale=0.4`) at the cover, every signature
moment, the CTA and the compliance card; tile them and LOOK, next to the previous
video's thumbnail. Fix clipped text, overlaps (banner vs card), face covered > 3 s, and
anything that reads like the last video.

**Step 6 — Render and log.** `python scripts/render-video.py <slug>`. Verify duration,
audio, and re-transcribe ~15 s around each cut (take the window from the TALK, not the
end cards — Whisper invents "cảm ơn các bạn đã theo dõi" on silence). Then
`python .claude/skills/vietnamese-finance-video-editor/scripts/main.py add <entry.json>`. Send Daniel the phone copy + thumbnail.

## Self-Correction Loop (before delivering)

1. Would Daniel say "this looks like the last one"? → change at least one more axis.
2. Does every effect sit on a signature moment or make a point clearer? → cut the rest.
3. Any text clipped, overlapping, or on the face > 3 s? → fix, re-still.
4. Core, colours, fonts, logo, compliance card untouched? → prove it with `git diff --stat
   src/mortgage src/brand` (empty unless a reusable core change was agreed).
5. Did any automatic cut change a sentence? → read the auto-cut list against the words.

If confidence drops below "I'd stake my reputation on this" on any claim, number, cut or
compliance point: STOP. Name what is uncertain. Ask Daniel. A wrong financial edit is
worse than no edit.

## Output Contract

Report to Daniel in plain language, backed by this structure (`templates/output.md`):

```json
{
  "status": "success | partial | failed",
  "files": {"video": "out/videos/<slug>/<slug>.mp4", "mobile": "out/videos/<slug>/<slug>-mobile.mp4",
            "thumbnail": "out/videos/<slug>/thumbnail.png", "srt": "out/videos/<slug>/<slug>.srt"},
  "design": {"id": "string", "direction": "string", "axes": {"cover": "", "captions": "",
             "framing": "", "graphics": "", "transitions": "", "texture": "", "sound": "", "cta": ""},
             "differs_from": [{"slug": "string", "axes_changed": 0}], "reused": false},
  "cuts": [{"atMs": 0, "what": "string", "why": "string"}],
  "pacing": "0.9–1.2×",
  "verify": ["caption words unsure", "spoken RG 234 watch-words", "flagged numbers", "tax/accuracy points"],
  "next": "one step"
}
```

## Memory Management

- Design log: `public/videos/design-log.json`, read and written only through this
  skill's `scripts/main.py` (`log`, `check`, `add`); it is seeded with the first two videos.
- Read at Step 0, append at Step 6. A failure you hit that isn't in
  `references/landmines.md` → append it there in one line (symptom → cause → fix).
- Daniel's corrections (taste and quality, not failures): `references/corrections.md`.
  Read the matching entries at Step 0; log each new correction there before fixing it.

## Error Handling

| Error | Condition | Action |
|---|---|---|
| `edit.json is invalid` | zod path in the message | Fix that field; never loosen the schema |
| `RG 234: restricted terminology` | a string in edit.json or design `copy` | Rewrite the text; exemption only for a genuine definition, quote, negation or proper noun |
| `"design" … is not a design` | id not registered | Register it in `src/designs/index.ts` |
| Frame fetch timeout / 404 on source.mp4 | render from the phone original or missing proxy | Re-run prep; render only from the prep proxy (`public/recordings/<id>/source.mp4`, or `public/videos/<slug>/` without `"source"`) |
| Light leaks or 3D render black | WebGL without ANGLE | Use `render-video.py` (sets `--gl=angle`) |
| Files changed on disk mid-task | GitHub Desktop pull/checkout stashed your work | Stop; find the stash (`git stash list`), restore, tell Daniel |
| Check fails in `main.py check` | < 4 skin axes differ | Change skin axes; do not edit the log |

## Anti-Patterns

| Anti-pattern | Why it fails | Correct behaviour |
|---|---|---|
| Re-using the last design by habit | Viewers see a template; retention drops | Read the log; change ≥ 4 skin axes |
| Editing the core or theme for one video | The next video breaks; compliance drifts | Designs only; core changes need a regression render |
| Hard-coded text missing from `copy` | Escapes the RG 234 guard | List every string in `copy` |
| Effects stacked everywhere | Noise hides the message and the face | Effects at signature moments only |
| Colours copied from a starter project | Off-brand | Map each colour to a theme token |
| A font without Vietnamese diacritics | Broken captions | Verify the subset; default Be Vietnam Pro |
| Showing a misspoken number | A wrong figure in a financial ad | Flag with timestamp; cut or re-record |
| Fixed-size headline text | Long words run off the card | Size with `@remotion/layout-utils` `fitText` |
| Flat `captionFixes` swap for a word that is also correct elsewhere | Breaks the correct uses | Context-bound fix (neighbouring words) |
| Sending the 1080p file to the phone | Over 30 MB | Send the phone copy |

## Change log
- 26/09/2026 — v3.2.0 (WP5): novelty applies to skin axes only (≥ 4 of 7); grammar stays
  consistent per data shape. Reading-time floor in the core (`READING`, untuned 15
  chars/s, numbers ≥ 1500 ms): cards and cues are held to it, and `check-golden` reports
  what it cannot hold.
- 25/09/2026 — v3.1.0: designs draw on the element libraries in `.claude/elements/`
  (Remotion Elements + remocn); adaptation rules in toolkit.md → "Element libraries".
- 24/09/2026 — v3.0.1: moved into `danielnguyenfinhub/finhub-video` (paths from the repo
  root; `main.py` finds the design log itself); the stutter-across-a-sentence-end fix is
  now in the core.
- 24/09/2026 — v3.0.0: new design every video (locked core + design layer, design log,
  variety check, content → direction tree, toolkit and design-space references,
  first-run bootstrap, landmines from the interest-in-advance edit).
- v2 — MortgageReel template workflow (edit.json only, one look).
