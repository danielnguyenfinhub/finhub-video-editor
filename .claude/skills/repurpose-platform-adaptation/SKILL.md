---
name: repurpose-platform-adaptation
description: "Platform adaptation method for the content repurposing team: how one Finance Hub video's message changes shape for a WordPress blog post, a newsletter section, a Facebook page post and an Instagram carousel while the message, figures and RG 234 limits stay the same. Conversion matrix, structures per platform, and a consistency checklist. Used by repurpose-blog-writer and repurpose-social-copywriter; use directly for 'adapt this for Facebook', 'blog structure for this video', 'Instagram carousel from this'. Not for publishing, ads targeting, or the video's own upload caption."
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

# Platform adaptation

Pasting the same text everywhere is right nowhere. Each platform has its own format, reading habit and limits; repurposing keeps the one message and changes the shape. For this business the shape may change and the compliance may not: every version is general information under ASIC RG 234, with one conversation CTA and the licence lines from `src/mortgage/compliance.ts`.

Figures below marked [assumed] are working norms, not platform rules; the platform's current limits, and the page's own results read through `fb_read`, outrank them.

## WordPress blog post

| Property | Value |
|---|---|
| Job | depth and search: answers the question the video answers, in writing |
| Length | 900 to 1,600 words [assumed]; shorter if the video is short, never padded |
| Search | the phrase people would type near the front of the title (about 60 characters) and in one H2; meta description up to 155 characters; no keyword stuffing |
| Structure | H2 per supporting message, H3 where a step list helps; a "Key point:" line per section |
| Avoid | thin copies of the transcript, a "best lender" or "lowest rate" angle, a CTA that promises an outcome |

## Newsletter section

| Property | Value |
|---|---|
| Job | a reason to watch or read, for people who already know Daniel |
| Length | 120 to 200 words [assumed] |
| Structure | heading as a question → two or three sentences of the point → link placeholder → one conversation CTA → footer |
| Gate | sending is bulk email: RED, Daniel sends; the no-email-marketing preference is honoured in the list, not in the draft |

## Facebook page post (Daniel Nguyen Mortgage Broker)

| Property | Value |
|---|---|
| Job | conversation in the community |
| Length | the point in the first line, before "See more"; 60 to 250 words [assumed] |
| Structure | hook line (a question or a common misunderstanding) → context → two or three points → one CTA inviting a message or a comment question → footer |
| Hashtags | 3 to 5 |
| Avoid | outcome hooks ("approved in 48 hours"), urgency ("rates are rising, act now"), a lender named as the answer |

## Instagram carousel and caption

| Property | Value |
|---|---|
| Job | save and share: a sequence someone keeps |
| Slides | 7 to 10: cover question → the problem → one point per slide → three-line summary → conversation CTA |
| Caption | the point in the first 125 to 150 characters [assumed]; links are not clickable in a caption, so "link in bio" or none |
| Hashtags | 8 to 15, about the topic, never a rate, product, lender or outcome |
| Note | drafts only: this repo and team have no Instagram tool |

## Conversion matrix

| Video element | Blog | Newsletter | Facebook | Instagram |
|---|---|---|---|---|
| One message | title (H1) and opening | heading | first line | cover slide |
| Figure (sourced) | table or sentence with source and as-at date | one sentence, if any | one line with "as at" | one slide with source line |
| Story from the talk | H2 section | not used | middle paragraph | two or three slides |
| Steps / process | numbered H3 list | not used | short list | one slide per step |
| Daniel's own words | block quote with timestamp | one quoted line | quoted line | text card |
| CTA | closing paragraph | last line | last line | last slide |

## Consistency checklist (every draft)

- [ ] The same one message, clearly, in every version.
- [ ] Every figure identical to its source and to the other drafts, with the as-at date where the source has one.
- [ ] Tone fits the platform; the voice is still Daniel's.
- [ ] Exactly one CTA, inviting a conversation, not promising an outcome.
- [ ] No product, rate or lender recommendation; no personal advice.
- [ ] Footer lines copied from `src/mortgage/compliance.ts`.
- [ ] Brand colour notes only from `src/brand/theme.ts`.
- [ ] Marked as a draft, not published or sent.

_Adapted from danielnguyenfinhub/harness-100 `04-content-repurposer` (Apache-2.0)._
