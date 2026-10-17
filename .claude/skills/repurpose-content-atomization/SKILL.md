---
name: repurpose-content-atomization
description: "Content atomisation method for the content repurposing team: break one finished Finance Hub video into its smallest reusable pieces (claim, data, story, process, quote, question, contrast, definition), score and rank them, trace each to its source, and rebuild them into derivatives, with slide formulas for a presentation outline. Used by repurpose-source-analyst and repurpose-presentation-builder; use directly for 'break this video into pieces', 'what can we reuse from this video', 'slide count for a 10-minute talk'. Not for editing the video or choosing its cuts (video-story-editor)."
---

## FinHub context
<!-- Canonical block. Pasted verbatim into every ported harness-100 agent and SKILL.md. Edit here only. -->

**Business.** Finance Hub and Networks ("FinHub"), Australian Credit Licence 573164, aggregated via Connective. Principal Broker: Daniel Nguyen. Five-broker residential mortgage broking team (Sydney, Melbourne, Adelaide). Facebook page: "Daniel Nguyen Mortgage Broker". YouTube: `@finhub-au` (business), `@wihyl2114` (family; never for business content).

**Language.** Australian English (organise, licence as a noun, cheque, favour). AUD, AEST/AEDT (Australia/Sydney), dates as DD-Mon-YY. Vietnamese only when Daniel explicitly asks, and only via `mutual-finhub-email-writer`.

**Regulation (Australia).** NCCP Act 2009 (responsible lending); Best Interests Duty (s158LA, ASIC RG 273); ASIC RG 234 (advertising: no product, rate or lender recommendation in generic content; conversation-only calls to action); Spam Act 2003; Privacy Act 1988 (APPs); AFCA for disputes; Commonwealth anti-discrimination Acts (never infer risk from postcode or other proxies beyond a lender's written policy). Foreign frameworks (GDPR, PIPA, HIPAA, SOX, Korean law) do not apply and must not be cited.

**Sources.** Tier 1: RBA, ASIC, ATO, APRA, ABS, official lender credit policy. Tier 2: MFAA, FBAA, CoreLogic, PropTrack, verified national financial media. Tier 3: verified industry analysis. Tier 4: blogs and forums, tagged when cited. Date-stamp every rate, servicing figure and statute. Tag load-bearing claims [verified] / [assumed] / [unverified] / [missing]. If evidence is absent, write "not enough information: <item>". Never estimate a figure.

**Systems of record.** Mercury CRM V3 (clients, deals, applicants, Connective data). Google Workspace V2 (daniel@ mail unless info@ is named, calendar, Drive, Google Business Profile, YouTube). Twilio (SMS). Facebook MCP (page). WordPress + cPanel (website). FinHub Sources / CDR (rates, RBA, ABS). Xero (accounts). If a connector is unavailable, report it and halt that branch; never substitute generic data.

**Write gates.** GREEN: reads, analysis, drafts, local files. AMBER (state intent first, diff before replace): Mercury notes/tasks/fields, calendar, Drive canonical folders, WordPress drafts. RED (Daniel's explicit confirmation in the session): any email/SMS/call, any public post or review reply, any cPanel change, Mercury stage progression/lodgement/settlement, deletions, bulk (>20 records). Max one touch per recipient per 7 days per matter. New automations run report-only for their first 7 days.

**Privacy.** No client PII in any repo file, commit or log. A Mercury UUID is the only sanctioned client reference. Files: `YYYY-MM-DD_Topic_DocType` (`YYYY-MM-DD_CLIENT_Surname_DocType` in the CRM/Drive only).

**Output.** Open with the verdict or status (Done / Partial / Blocked). Lending scenario: Verdict, then Key Figures table, then Lender Fit, then Risks (worst first), then "Verify before acting:". Comparisons end with exactly ONE recommendation tied to the client's stated objectives (RG 273). Client-facing work is a draft until Daniel confirms.

**Provenance.** Adapted from danielnguyenfinhub/harness-100 (Apache-2.0); see this team's attribution line.

# Content atomisation

Repurposing is not writing the same thing again. It is breaking the video into atoms and putting them back together for each platform. A ten-minute talk usually yields more pieces than one post can hold; the work is choosing.

## Atom types

| Type | What it is | Video example (illustrative) | Goes to |
|---|---|---|---|
| Claim | a statement that can be checked | "Lenders assess more than the rate" | Facebook line, slide, blog H2 |
| Data | a number, ratio or date, with its source | a figure from `facts.json` with its as-at date | slide with source, blog table |
| Story | a situation from the talk (no client detail) | "a family buying before selling" | blog section, carousel middle |
| Process | steps | "what we check first, second, third" | numbered list, step carousel |
| Quote | Daniel's own words, with timestamp | a line he says on camera | text card, block quote |
| Question | something that makes the viewer think | "Is the lowest rate the right loan for you?" | hook, cover slide |
| Contrast | a comparison | "purchase vs refinance priorities" | two-column slide, carousel |
| Definition | what a term means | "comparison rate" | glossary box, slide |

_Illustrative: the examples are typical of this channel's topics and do not quote a real video._

Every atom carries its location (transcript `mm:ss` or scene number) and its source. A data atom without a document behind it is tagged `[spoken, unverified]` and does not travel.

## MINE

### M: Map

Lay the finished video out as a tree, following `chapters` in `edit.json` or `scenes` in `script.json`, and skipping anything in `remove`:

```
Video
├── Hook: [Question] / [Claim]
├── Chapter 1: [Definition] [Process]
├── Chapter 2: [Contrast] [Data]
└── Close: [Claim] + CTA (conversation)
```

### I: Identify

Score each atom (0 to 5 per criterion):

| Criterion | Weight | Question |
|---|---|---|
| Stands alone | 30% | Does it make sense with no context? |
| Relevance | 25% | Does it answer a question the audience actually has? |
| Shareable | 25% | Would someone pass it on? |
| Visual | 20% | Can it be a slide, card or table? |

Before scoring, remove atoms that fail compliance: a rate without comparison rate and as-at date, a lender as the answer, a promised outcome, personal advice, any client detail. Emotion is used for relevance (a common worry), never fear or urgency.

### N: Negotiate

- Top 20%: in every derivative (the one message lives here).
- Middle 50%: in the two or three derivatives they suit.
- Bottom 30%: blog only, or dropped.

### E: Extend

Add only what a format needs and the video supports: a visual note for a text-only point, a step list where Daniel described steps, a "what to ask your broker" line. Never add a figure, a newer rate or a fact from outside the video's own sources; if a figure is stale, say so in "Verify before acting" instead of replacing it.

## Presentation formulas

**Slides** = (minutes x 1.5) + 3: about 40 seconds a slide, plus title, agenda and questions. Ten minutes → 18.

| Slide type | Text | Visual share | Use |
|---|---|---|---|
| Title | title + subtitle | 100% background | opening, section break |
| Key message | one sentence | 70% | the one message |
| Data | labels only | 80% chart | sourced figures |
| Process | step names | 70% flow | steps |
| Contrast | two-column table | 50% | A vs B |
| Quote | quote + timestamp | 50% | Daniel's words |

**1:10:30.** One message, no more than ten supporting points, no more than thirty minutes without an interaction break.

## Yield (rough guide)

| Video | Atoms [assumed] | Typical derivatives |
|---|---|---|
| Short (under 3 min) | 5 to 10 | Facebook post, carousel, newsletter section |
| Talk (5 to 15 min) | 15 to 30 | all five |

_Adapted from danielnguyenfinhub/harness-100 `04-content-repurposer` (Apache-2.0)._
