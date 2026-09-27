---
name: video-compliance-review
description: >-
  Independent compliance review of a Finance Hub video — the script.json before voicing, or the
  finished render before Daniel posts it — against ASIC RG 234, NCCP s163/s164 (advertised
  rates), the Finance Hub compliance card and FinHub's no-client-data rule. Returns PASS, FIX
  or BLOCK with each finding tied to a scene or timestamp. Use whenever a video script or
  render needs a compliance check: "review this script", "is this video compliant", "check
  compliance before I post", "RG 234 check on the video", "compliance review again", "re-check
  after the fix". Used by the video-compliance-reviewer agent. NOT for loan files or BID
  evidence (finhub-bid-compliance-auditor), and NOT a replacement for the automatic guard in
  src/mortgage/compliance.ts, which still runs on every render.
---

# Video compliance review

The automatic guard (`src/mortgage/compliance.ts`) blocks fixed phrases and a rate without a comparison rate. It cannot judge meaning. This review covers what it can't: a claim that promises without using a banned word, advice dressed as information, a wrong number, an English line bolder than the Vietnamese, client data, and words Daniel speaks (speech is never scanned). A wrong financial claim in an ad is a licence risk for Finance Hub, so when in doubt, raise it: a false alarm costs Daniel a minute, a miss can cost the licence.

Read the artefacts yourself. Work in the repository root.

## Stage `script` (before any credits are spent)

Inputs: `public/videos/<slug>/script.json`, the source document, `out/videos/<slug>/team/01_writer_notes.md`.

1. **Automatic guard.** Run `node scripts/voice-video.mjs <slug> --dry-run`. A failure is a BLOCK finding with the message.
2. **Client data.** Any person's name (other than Daniel Nguyen), address, loan or account number, or a real client's figures, in the script or the document excerpt used → BLOCK.
3. **Every claim.** Read `public/videos/<slug>/facts.json` (the ledger; a legacy slug without one falls back to the writer's notes). Trace each figure, rule, condition and definition a scene states, including numbers spelled out in words, to its cited fact's `verbatim` text in the document. Recompute any arithmetic. Untraceable, not what the verbatim says, or wrong → BLOCK. Rounded in a way that changes the message → FIX.
4. **Promise without a banned word.** Read each scene for meaning: "chắc chắn", "không bao giờ bị từ chối", "ai cũng vay được", "tiết kiệm ngay X đô", implied approval or implied savings → FIX with a rewrite.
5. **Advice vs information.** A personal recommendation ("bạn nên…", "hãy chọn…", "đừng vay…" aimed at the viewer's own situation) → FIX. General statements ("nhiều người chọn…", "nên xem lại khoản vay mỗi năm") are fine.
6. **Advertised rate.** Any interest rate presented as available (a lender's rate, "từ X%") needs a comparison rate and an as-at date in the source document; it must reach `edit.json` `compliance.advertisedRate` at build. Missing → BLOCK. A cash rate or a market average quoted as news is not an advertised rate.
7. **Tax and policy features.** Tax talk (deductions, negative gearing, prepaid interest) → note for the editor: `compliance.taxNote: true`. An advertised policy feature or concession ("không cần tiết kiệm thật") → `compliance.conditionsNote: true`.
8. **Banks.** A named bank must not read as endorsing or sponsoring the video → FIX.
9. **English line.** Each `en` must say no more than its `vi`: stronger wording, a dropped condition or a different number → FIX.
10. **Call to action.** Exactly one, and it offers contact, not an outcome ("Nhắn tin cho Finance Hub để được hỗ trợ" is fine; "…để được duyệt vay" is not) → FIX.
11. **Post copy.** Title, caption and hashtags get checks 3–10 too.
12. **Exemptions.** Any `exemptions` entry must have a genuine reason (quote, negation, definition, third-party name). One added to get past the guard → BLOCK.

## Stage `final` (before Daniel posts)

Inputs: `public/videos/<slug>/edit.json` (including its `visuals`), the design in `src/designs/<id>/`, `out/videos/<slug>/team/03_editor_report.json` and the stills it lists, `words.json`, and `facts.json` when it exists.

1. **Automatic guard and schema.** Run `npx remotion compositions src/index.ts --props='{"slug":"<slug>"}' 2>&1 | tail -n 5`. A failure → BLOCK.
2. **Script checks on everything on screen.** Apply script checks 3–10 to edit.json copy (titles, stats, cues, CTA) and to the design's hard-coded strings. Every hard-coded string must be listed in the design's exported `copy` (grep the design folder for quoted text) → missing one is FIX.
3. **Spoken words (talking-head).** Search `words.json` for the watch-words in `compliance.ts` (`PROMOTIONAL_VI`, `CONTEXT_VI`, and the English lists) and for check 4's promises. Each hit goes in the report with its timestamp: FIX if it makes a claim, a verify note if it's neutral ("không miễn phí"). Speech is never cut or reworded by you: Daniel decides.
4. **Compliance card.** Open the still of the last 5 seconds. It must show, unchanged: `Finance Hub & Networks Pty Ltd | ACN 644 141 613 | Australian Credit Licence 573164`, the credit representative line (369168), and the full-situation disclaimer in English and Vietnamese. If `taxNote` or `conditionsNote` is set, that note shows too. Missing, cut off or unreadable → BLOCK. No still of the card → BLOCK (ask the editor for one).
5. **Advertised rate on screen.** Rate, comparison rate at equal prominence, and the as-at date, all visible in the same still → otherwise BLOCK.
6. **Numbers on screen.** Each matches what's said (or the approved script) and the source → otherwise BLOCK.
7. **Core untouched.** `git diff --stat origin/main -- src/mortgage src/brand` is empty, or the editor's report names an agreed core change → otherwise BLOCK.
8. **B-roll and images (`visuals`).** Each asset's `.meta.json` in `public/library/` has a `licence`; none → FIX. A clip that shows a bank's branding, a number, or a person in a way that implies endorsement or a client → FIX.
9. **Legibility.** Compliance text or a condition that's clipped, covered or too small to read in a still → FIX.
10. **Room privacy (quick mode only, `"background": "vignette"`).** The room is partly visible. Look at a cover still and a mid-video still for anything client-identifying in the background: documents, screens, names, other people. Anything found → BLOCK (switch to the removed background or re-record). No such stills → BLOCK (ask the editor). Golden rule 4 in `src/designs/README.md`.

## Verdict

- **BLOCK** — any BLOCK finding. The video must not be voiced (script stage) or posted (final stage).
- **FIX** — FIX findings only. Goes back to the author with the exact change.
- **PASS** — no findings, or only verify notes for Daniel.

## Report (`02_compliance_script.json` / `04_compliance_final.json`)

```json
{
  "slug": "string",
  "stage": "script | final",
  "verdict": "PASS | FIX | BLOCK",
  "guard": "passed | failed: <message>",
  "findings": [
    {"severity": "BLOCK | FIX", "where": "scene 3 | 00:42.1 | edit.json cues[2] | still cover.png",
     "text": "the exact words", "rule": "RG 234 | NCCP s163 | compliance card | client data | number | translation",
     "why": "one sentence", "fix": "the exact rewrite or action", "owner": "writer | editor | Daniel"}
  ],
  "verify_for_daniel": ["neutral watch-words he should hear once", "judgement calls"],
  "previous_findings": [{"text": "…", "status": "resolved | open"}]
}
```

Write `why` and `fix` in plain English Daniel can read without a glossary. Quote Vietnamese exactly, with its diacritics.
