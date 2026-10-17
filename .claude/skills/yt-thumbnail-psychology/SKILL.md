---
name: yt-thumbnail-psychology
description: >-
  Method for YouTube thumbnail concepts for Finance Hub's @finhub-au videos: what a viewer must
  get in a glance, colour and contrast, seven composition patterns, overlay-text rules, fonts that
  carry Vietnamese, honest expressions, and a small-size legibility checklist, all inside ASIC
  RG 234 (no rate, lender or product, no fear, shock, urgency or scarcity, no promised outcome).
  Used by yt-thumbnail-designer; also for "how do I make a better thumbnail" or "what should the
  thumbnail say". Written briefs only: it makes no image, and the video's own cover design belongs
  to the video team (video-editor, youtube-director).
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

# Thumbnail psychology for Finance Hub

The visual method `yt-thumbnail-designer` applies. The source method aimed at the click at any cost (shock faces, red alarm, fear). For a credit licensee's channel that is out: a thumbnail is an advertisement under RG 234, so it must not overpromise, and a viewer who feels tricked does not come back. The aim here is the honest click: the right viewer sees at a glance what the video answers.

## What a glance must carry

A viewer gives a thumbnail about a second or two [unverified: no Tier 1 or 2 source; a working assumption]. In that time it must say:

1. **The topic** (what the video is about),
2. **the value** (what the viewer will understand afterwards),
3. **one honest pull**: curiosity about a question the video answers, or recognition ("that's my situation"). Not fear, shock or urgency.

## Colour

| Colour | Reads as | Use on this channel |
|---|---|---|
| Navy | trust, calm, expertise | default ground; the FinHub navy is `NAVY` in `src/designs/cards/tokens.ts` |
| Gold | warmth, attention without alarm | the accent; `GOLD` in the same file. On white it fails contrast (about 2.3:1, `docs/audit/templates-2026-10-01/01_critique_talkinghead-data.md`), so use it on navy or as a fill |
| White | clarity | type on navy, or a clean ground |
| Green | growth, money | sparingly, never beside a figure |
| Red / orange | warning, urgency | not for warning signs, crosses over a rate or "danger" framing; a small accent at most |

**Contrast.** WCAG 2.x AA asks 4.5:1 for normal text and 3:1 for large text [unverified: W3C WCAG 2.2, not read in this session]. A thumbnail is seen very small on a phone, so aim well above the floor. Compute the ratio only from hex values read in a file.

**Stand out from the search page.** If most results on the topic share a colour scheme, the opposite scheme stands out. This needs a look at real results, which the team does not have (no web tool); write "not checked" rather than guess.

## Seven composition patterns

1. **Centre focus.** One element in the middle, type in a band above or below. Safest; best on a phone.
2. **Thirds split.** Daniel in one third, type in the other two. Good for "this or that" videos (buy first or sell first).
3. **Diagonal.** The eye runs bottom-left to top-right. Movement and change ("from renting to owning").
4. **Frame in frame.** A ring or box around the key object (a contract, a key, a calendar). Pulls the eye to one thing.
5. **Minimal negative space.** About 70% empty, one element. Calm, premium, very legible.
6. **Grid.** Two to four cells for list or step videos; unequal sizes set the reading order.
7. **Type only.** The words are the picture. Explainers and commentary.

## Overlay text

- **3 to 5 words; 7 at most.** More cannot be read on a phone.
- **Adds to the title, never repeats it.** Title "How to choose a lender" → overlay "Not just the rate".
- **Allowed:** a topic, a question, a contrast the video resolves, a step count the video delivers.
- **Not allowed:** a rate, repayment, saving or approval figure; a lender or product name or logo; "secret", "banks hate this", "don't do this", "too late", "last chance"; any word `assertCompliantCopy` blocks in `src/mortgage/compliance.ts`; a promised outcome ("Approved!", "Save thousands").
- **Bilingual.** Videos here are Vietnamese and English (`docs/agents/language.md`). If the overlay is Vietnamese, the font must carry its marks: Be Vietnam Pro or Montserrat request the `vietnamese` subset; Poppins from Google Fonts has none (same file). Leave line height for stacked marks (about 1.3).

| Tone | Type style |
|---|---|
| Expert, calm (default) | bold sans serif (Be Vietnam Pro, Montserrat) |
| Friendly | rounded sans serif with a Vietnamese subset |
| Premium | a serif with a Vietnamese subset, used sparingly |

## Faces and expression

A face helps a viewer judge who is speaking and whether to trust them [unverified: the source cited a CTR uplift with no source; no figure is used here]. On this channel the face is Daniel's only, never a client's.

| Expression | Use |
|---|---|
| Curious (one brow up, slight smile) | explainers, "what most people miss" without the alarm |
| Natural smile | stories, first-home topics |
| Calm, neutral | serious topics (hardship, policy changes) |
| Mock shock, open-mouth surprise | not used: it promises drama the video does not have |

## Legibility checklist (every concept)

- [ ] Shrunk to phone-list size, can you still tell the topic?
- [ ] Type has a stroke or shadow, or sits on a solid band?
- [ ] Contrast stated (ratio, or "not computed")?
- [ ] Type clear of Daniel's face?
- [ ] Within a few seconds a stranger can say what the video is about?
- [ ] Title and overlay say different things that add up to one promise?
- [ ] The video keeps that promise in its first 30 seconds (timestamp)?
- [ ] No figure, lender, product, fear, urgency or scarcity anywhere on it?

_Adapted from danielnguyenfinhub/harness-100 `01-youtube-production` (Apache-2.0)._
