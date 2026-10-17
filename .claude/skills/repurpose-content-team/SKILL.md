---
name: repurpose-content-team
description: >-
  Orchestrator for the content repurposing team (five repurpose- agents): turns one finished
  Finance Hub video (its edit.json or script.json, transcript and fact ledger) into derivative
  drafts - a WordPress blog post, a newsletter section, a Facebook post, an Instagram carousel and
  caption, and a short presentation outline - cross-checked by an independent reviewer and then by
  video-compliance-reviewer against ASIC RG 234. Drafts only, in _workspace/repurpose/<slug>/. Use
  when Daniel says "repurpose this video", "turn <slug> into a blog post", "write Facebook and
  Instagram posts from the video", "newsletter section from this video", "make a presentation from
  this video", "review the repurposed drafts". NOT for editing or rendering a video
  (video-production-team), the video's own upload caption (its post copy, video-production-team),
  publishing or scheduling anything, sending email, or Vietnamese copy unless Daniel asks (then
  mutual-finhub-email-writer).
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

# Content repurposing team

**User story:** Daniel finishes a video and gets, from it, a blog post, a newsletter section, a Facebook post, an Instagram carousel and a presentation outline that all say the same thing as the video, cite the video's own sources, pass the RG 234 guard and an independent compliance review, and wait in `_workspace/` for him to approve and post himself.

Pattern: analyse once → three writers in parallel → independent review → independent compliance review (fan-out, fan-in, two gates). Ground rules: `docs/agents/team-ground-rules.md`.

**Report-only start.** For the first 7 days after this team is merged, every run is report-only: drafts and reports, no AMBER step either (no WordPress draft upload, no Drive filing). After that, filing a draft into WordPress or Drive is AMBER (state intent, show the diff) and anything public stays RED.

## The team

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `repurpose-source-analyst` | one message, atoms with sources, strategy per derivative | `repurpose-content-atomization` skill |
| `repurpose-blog-writer` | WordPress blog post and newsletter section drafts | `repurpose-platform-adaptation` skill |
| `repurpose-social-copywriter` | Facebook post, Instagram carousel and caption drafts | `repurpose-platform-adaptation` skill |
| `repurpose-presentation-builder` | presentation outline, speaker notes, handout | `repurpose-content-atomization` skill |
| `repurpose-reviewer` | independent PASS / FIX / BLOCK on message, figures, format and the RG 234 guard | its own file |
| `video-compliance-reviewer` | independent compliance verdict (reused from the video team, not copied) | `video-compliance-review` skill |

Reused, not rebuilt: `marketing-manager`'s review (`out/videos/<slug>/team/01_marketing_review.md`) is the analyst's starting point when it exists; `video-compliance-reviewer` and its skill are the compliance gate; the licence and disclaimer lines come from `src/mortgage/compliance.ts`, the same source as the video's compliance card. The video's own upload caption (`post` in `edit.json` / `script.json`, made into a caption by `scripts/publish-video.mjs`) belongs to the video team and is not rewritten here. A sibling `social-` team for the Facebook page as a whole is being built in the finhub-facebook-mcp repo [unverified: not merged at the time of writing]; this team only writes the derivatives of one video.

**Execution mode: subagents.** Each agent starts from nothing and does not see `AGENTS.md` or this chat: every prompt carries the repo root, the slug, `_workspace/repurpose/<slug>/`, the formats asked for, Daniel's constraints, and "read `docs/agents/team-ground-rules.md` first".

## Phase 0: Context

1. Find the slug: Daniel names it, or `npm run video-status` lists the runs. The video must have `public/videos/<slug>/edit.json` or `script.json`; if not, stop: `blocked: no finished video`.
2. `_workspace/repurpose/<slug>/`: absent → new run; present → read `06_review_report.md` and `07_compliance.json` and re-run only what Daniel asked for or what a finding sent back (keep the old files under `_workspace/repurpose/<slug>_prev/`).
3. Write `00_input.md`: slug, pipeline (A or B), formats requested (default all five), audience, length for the talk, platforms to leave out, language (English unless Daniel asked for Vietnamese), and the date.

## Phase 1: Analyse

`repurpose-source-analyst` → `01_source_analysis.md`. If it reports `blocked`, stop and tell Daniel what is missing.

## Phase 2: Write (parallel, one message)

| Mode (what Daniel asks) | Agents |
|---|---|
| "repurpose this video" (full) | blog writer, social copywriter, presentation builder |
| "blog post" / "newsletter" | blog writer |
| "Facebook / Instagram posts" | social copywriter |
| "presentation" | presentation builder |
| "review the drafts" | none: go to Phase 3 |

A derivative Daniel already wrote is copied into the run folder under its number and its writer is skipped.

## Phase 3: Review

1. `repurpose-reviewer` → `06_review_report.md`. FIX → one round back to the author (each fixes its own items), then a lighter re-review of that delta. A second FIX round at most; then report the open items to Daniel. BLOCK → stop.
2. On PASS, `video-compliance-reviewer`, clean context, with this brief (its own files define the `script` and `final` stages for a video, not for derivatives, so the prompt names the checks): "Stage: derivatives (written copy, not a video). Apply `video-compliance-review` script checks 2, 3, 4, 5, 6 (comparison rate and as-at date in the source; ignore the `compliance.advertisedRate` part), 8 and 10 to each file `_workspace/repurpose/<slug>/0[2-5]_*.md`. Checks 7 and 9 do not apply (English-only text, no editor flags). The ledger is `public/videos/<slug>/facts.json` when it exists, otherwise the Atoms table in `01_source_analysis.md` and the transcript. These drafts are written by the team: Daniel's spoken claims restated in them are gated with FIX/BLOCK, not `verify_for_daniel`. The licence and disclaimer footer is required in every draft (unlike upload post copy). Re-run the RG 234 guard with the command in `.claude/agents/repurpose-reviewer.md` check 1. Write your verdict in the skill's report format, with `"stage": "derivatives"`, to `_workspace/repurpose/<slug>/07_compliance.json`, not to `out/videos/`." BLOCK means the drafts are not handed over.

## Phase 4: Deliver

First line `done`, `partly done` or `blocked`. Then each draft's path, the two verdicts, what was left out and why, and "Verify before acting:" (figures to confirm, claims Daniel spoke that the analysis tagged unverified, links to add after publishing). End with: "These are drafts. Posting to Facebook, Instagram or YouTube, publishing to WordPress and sending the newsletter are yours to do; tell me if you want any change first."

Vietnamese versions: only when Daniel asks, by handing the approved English draft to `mutual-finhub-email-writer` (a host skill, not in this repo).

## Gates

| Action | Gate |
|---|---|
| Reading the video files, writing in `_workspace/` | GREEN |
| `fb_read` of the page's own posts (social copywriter) | GREEN |
| Uploading a WordPress draft or filing into Drive (after the 7-day report-only period) | AMBER |
| Posting to Facebook, Instagram or YouTube (`@finhub-au` only, never `@wihyl2114`), publishing on WordPress, sending or scheduling email | RED: Daniel does it; the team stops and hands over |

## Files

`_workspace/repurpose/<slug>/` (git-ignored): `00_input.md` · `01_source_analysis.md` · `02_blog_post.md` · `03_newsletter_section.md` · `04_social_package.md` · `05_presentation_outline.md` · `06_review_report.md` · `07_compliance.json`.

## Errors

| Situation | Action |
|---|---|
| No finished video for the slug | `blocked`; name the missing file |
| No transcript | Run from the edit or script; spoken figures become `[missing]` |
| An agent fails | Retry once; then deliver without that derivative and name it as missing |
| The RG 234 guard will not load | BLOCK from the reviewer; never hand over unscanned drafts |
| Daniel asks to post it | Stop: RED. Hand over the approved draft and the path; this team has no publish tool |

## Test scenarios

- **Normal:** "Repurpose chon-ngan-hang." Analysis from `edit.json` and `public/recordings/chon-ngan-hang/words.json`; five drafts; reviewer PASS or FIX then PASS; `07_compliance.json` verdict; delivery lists the drafts and the RED steps left to Daniel.
- **Existing file:** "Just the presentation, I already wrote the blog." Daniel's blog copied in as `02_blog_post.md`; only the presentation builder runs; both reviews cover both files.
- **Error:** "Repurpose my new video" with a slug that has no `edit.json` or `script.json`. Phase 0 stops with `blocked: no finished video for <slug>` and suggests `npm run video-status`.

## Extending skills

| Agent | Skill | Gives |
|---|---|---|
| blog writer, social copywriter | `repurpose-platform-adaptation` | per-platform rules, conversion matrix, consistency checklist |
| source analyst, presentation builder | `repurpose-content-atomization` | MINE method, atom types, slide formulas |

_Adapted from danielnguyenfinhub/harness-100 `04-content-repurposer` (Apache-2.0)._
