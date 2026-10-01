# Recipe: talking-head, data-led styles

Styles: classic, datalab, series, studio, cards, newsroom, scenario (`config/style-teams.json`). Pipeline A: Daniel's own footage, matted cut-out, `Behind` layer. All are `face-required` and `cueRoom`.

**Pick this team when** the talk is mostly rates, fees, repayments or lender comparisons: `brief.mjs` reports many numbers or banks, `select-template.mjs` ranks one of these on `data` / `compare` intent with `numbers`, `comparison` or `banks` shapes.

**Pick within it** by the selector's top 3 (`out/videos/<slug>/selection.json`), then the cheaper render and the least recently used. Render cost, from each `template.json`: classic and studio high; datalab and cards med; series, newsroom, scenario low. Prefer a low-cost design for a draft pass only when Daniel hasn't asked for a look.

**Style limits live in `template.json`, not here:** `maxChars` (scenario limits per kind: hook 30, chapter 30, stat 48, cue 30), `minHoldMs`, `grammar` (how numbers, comparisons, change and trend are drawn). Copy to those limits before the build, not after QC.

**Failure modes already logged** (`corrections.md`, scope `all`, `A`, or the design id): figures behind his head, never over it; cue panels sized to content (`useCueRoom`); verdict pill on one line (classic); bar-label contrast (explainer-style bars: check every bar and label on the backdrop); the cards design on a talk over about 3 minutes holds cards long and `check-pacing` reports INFO, which is accepted; his footage always `"pacing": {"mode": "off"}`.

**Golden rules that bite this family:** every number he says gets a visual (rule 1), every bank named gets its logo in a neutral frame (rule 2), safe band and face box (3, 3b), logo only first and last 10 s (3c), background removed unless Daniel opts into quick mode (4).
