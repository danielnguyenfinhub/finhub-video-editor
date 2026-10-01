# Recipe: talking-head, story-led styles

Styles: editorial, explainer, chatstory, kitchen, checklist, neon, reaction. Pipeline A, matted cut-out, all `face-required` and `cueRoom`.

**Pick this team when** the talk is a story, a myth, a Q&A, a step list or a reaction to news: intents `story`, `explain`, `qa`, `process`, `warn`, `news`; shapes `narrative` or `steps`.

**Differences that decide the pick** (from `template.json`): `kitchen` holds each card 3000 ms and `editorial` / `explainer` / `chatstory` 2000 ms, so they suit slow talks; `neon` holds 1000 ms with 24-character cards, so it suits fast, short talks; `checklist` and `chatstory` are high render cost and `checklist` carries its own cues (it accepts only the kinds it draws); `reaction` suits a news response and is low cost.

**Style limits** live in `template.json` (`maxChars`, `minHoldMs`, `grammar`). Vietnamese runs long: measure the longest card with `brief.mjs` before choosing a 24- or 36-character design.

**Failure modes already logged:** `kitchen` text read too small on a phone-size still (judge on a still at phone size, not the Studio canvas); panels covering the head; too static (a visual change every 1.5–3 s, except a card or number held for its reading time, golden rule 5b); his voice (no pacing change on his footage).

**Golden rules:** as the data team: figures and logos still apply when a story mentions a number or a bank.
