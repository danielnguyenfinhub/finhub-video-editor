# Recipe: faceless, data and news styles

Styles: bigdigit, flash, gauge, pulse, ticker, scale, receipt, calendar, timelapse, splitscreen, flipcard. Pipeline B: a voiced script from a document or researched topic, no cut-out, no `Behind` layer. Ten are low render cost; flipcard is med.

**Pick this team when** the source is a rate move, a policy change, a date or a comparison and the story is the number: intents `news`, `data`, `compare`; shapes `numbers`, `comparison`.

**How the video gets made:** `video-script-writer` writes the bilingual `script.json` from the document (runbook B1–B2) → `video-compliance-reviewer` on the script → Daniel locks the words → voicing is the paid call and the orchestrator holds the cost gate (`scripts/spend.mjs`; `voice-video.mjs` refuses a paid run without the cost Daniel saw) → `video-editor` builds → `video-qc` and compliance review the same build in parallel. Default voice is Google Charon; a cloned voice only with Daniel's stated consent in chat.

**Style limits:** `maxChars` 60 and `minHoldMs` 1500 for all eleven (`template.json`); `grammar` says how each draws numbers, change and trend. Write cards to the limit, in both languages, before voicing.

**Rules that bite:** advertised rates carry comparison rate and conditions (RG 234 / NCCP s163 guard in `src/mortgage/compliance.ts`); the end card shows the policy document's date; no client data; forecasts quoted as the named bank's forecast, never as what will happen.
