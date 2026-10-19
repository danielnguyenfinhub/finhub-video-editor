---
name: yt-youtube-metadata
description: >-
  Orchestrator for the yt- YouTube metadata team (three agents): from one finished Finance Hub
  video (its edit.json or script.json, transcript and fact ledger) drafts the YouTube package for
  the @finhub-au channel (finhub_au) - ranked title options, a description, chapters from the
  video's own timestamps, tags and hashtags - plus two or three written thumbnail concept briefs,
  then an independent reviewer runs the RG 234 phrase guard and a hook-pattern scan over all of
  it. Drafts only, in _workspace/yt/<slug>/. Use when Daniel says "YouTube title for <slug>",
  "write the YouTube description", "chapters for this video", "tags for YouTube", "thumbnail ideas",
  "YouTube SEO for this video", "review these titles". NOT for editing, rendering or designing the
  video or its cover (video-production-team, style-production-teams), its upload caption as the
  video team writes it, uploading, updating or setting a thumbnail (RED, Daniel's), blog or social
  derivatives (repurpose-content-team), or the @wihyl2114 family channel.
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

# YouTube metadata team

> **Where this team runs.** Its agents' `tools:` allowlists name the FinHub MCP servers by their claude.ai connector ids (`mcp__MERCURY_CRM_V3__…` and so on), verified against the live Railway servers on 17-Oct-26. They work in Claude Code and claude.ai sessions where those connectors are attached. In Cowork the same servers carry plugin-prefixed ids, so a spawned agent would get no MCP access: run the steps in the main session instead. Steps that read repo files need this repository checked out.


**User story:** Daniel finishes a video and gets title options, a description, chapters, tags and thumbnail briefs for `@finhub-au` that say only what the video says, pass the RG 234 guard and a hook scan, and wait in `_workspace/` for him to choose; the chosen words then go into the video's `post` through the video team, and he uploads.

Pattern: two writers (metadata, then thumbnail) → independent review. Ported from harness-100 `01-youtube-production`, its SEO and thumbnail roles only: the strategist and scriptwriter are not ported (the video team plans and writes the video), nor its subtitle file (`scripts/render-video.py` already writes `<slug>.srt`) or image generation. Ground rules: `docs/agents/team-ground-rules.md`.

**Report-only start.** For the first 7 days after this team is merged, every run is report-only: drafts and reports, nothing filed or set anywhere.

## The team

| Agent (`.claude/agents/`) | Does | Standard |
|---|---|---|
| `yt-seo-optimizer` | title options, description, chapters, tags, hashtags | its own file |
| `yt-thumbnail-designer` | two or three written thumbnail concept briefs and the title pairing | `yt-thumbnail-psychology` skill |
| `yt-reviewer` | independent PASS / FIX / BLOCK: RG 234 guard, hook scan, figures, chapters, promise kept | its own file |

## Boundary with the video agents

| Who | Owns | This team |
|---|---|---|
| `video-production-team` (`video-editor`) | `edit.json` / `script.json`, including `post` (title, caption, hashtags) and `chapters`; the render; the publish phase (`youtube_ops` `upload_video` with title = `post.title`, description = the caption file, then `set_video_thumbnail`) | never edits those files and never publishes; its drafts are options for `post`, which the video team writes in if Daniel picks one |
| `marketing-manager` | the one message, audience and production plan for a recorded talk (`out/videos/<slug>/team/01_marketing_review.md`) | reads it as the starting point; does not redo it |
| `video-compliance-reviewer` | compliance verdict on the video, and on post copy (check 11 "Post copy" of the `video-compliance-review` skill: title, caption, hashtags) | its final stage covers whatever chosen copy lands in `post`; `yt-reviewer` is the gate on these drafts only |
| `youtube-director`, `video-editor` | the cover card that `scripts/render-video.py` saves as `thumbnail.png` (frame 45) | briefs start from that cover; a new cover is a request to the video team |
| `repurpose-content-team` | blog, newsletter, Facebook, Instagram and presentation derivatives | no overlap: YouTube metadata only |

**Execution mode: subagents.** Each agent starts from nothing: every prompt carries the repo root, the slug, `_workspace/yt/<slug>/`, Daniel's constraints, and "read `docs/agents/team-ground-rules.md` first".

## Phase 0: Context

1. Find the slug: Daniel names it, or `npm run video-status` lists the runs. The video must have `public/videos/<slug>/edit.json` or `script.json`; if not, stop: `blocked: no finished video`.
2. **Channel.** Business videos go to `@finhub-au` (`channel: "finhub_au"`). A video about Daniel's family is not this team's (`@wihyl2114`); if it is unclear which, ask before anything else.
3. `_workspace/yt/<slug>/`: absent → new run; present → read `03_review_report.md` and re-run only what Daniel asked for or a finding sent back (old files to `_workspace/yt/<slug>_prev/`).
4. Write `00_input.md`: slug, pipeline (A or B), what is asked (default: package and briefs), language (English unless Daniel asked for Vietnamese), constraints, the date.
5. **Channel snapshot (optional, read only).** Subagents do not hold the Google Workspace tools, so the orchestrator, in the main session, may read channel data and write a short summary to `_workspace/yt/<slug>/00_channel.md`. Only these read actions, each with `channel: "finhub_au"`:
   - `youtube_ops`: `list_channels` (confirm the key), `search` with `for_mine: true` (recent titles), `list_videos` with `video_ids` (their snippets). These are in the tool's `READ_ACTIONS` (Google Workspace V2 `src/tools/youtube.ts`).
   - `youtube_analytics_ops`: `query` only (for example views and average view percentage by video over a date range).
   Never call any other action of either tool: both tools also hold writes (`upload_video`, `update_video`, `set_video_thumbnail`, `create_job`, `delete_group`...) and are not on any agent's allowlist for that reason. If a tool is not connected, note it in `00_channel.md` and go on without it; never substitute other data.

6. **Audience questions (optional, drafts only).** `python scripts/research.py audience https://www.youtube.com/@finhub-au --videos 5` writes `out/research/audience/comments.json` (latest uploads, most-liked comments, text and likes only; a `Coverage: ... FAILED` line means a video's comments could not be read, not that it has none). Read it, cluster the comments into question themes (no names, handles or quotes long enough to identify anyone), and write `_workspace/yt/<slug>/00_audience.md`: each theme, how many comments and likes, and a proposed next topic. Proposals only; Daniel picks.

## Phase 1: Metadata

`yt-seo-optimizer` → `01_seo_package.md`. `blocked` → stop and tell Daniel what is missing.

## Phase 2: Thumbnail briefs

`yt-thumbnail-designer` → `02_thumbnail_briefs.md` (it pairs concepts with the title options, so it runs after Phase 1).

| Mode (what Daniel asks) | Agents |
|---|---|
| "YouTube package for <slug>" (full) | seo optimiser, thumbnail designer, reviewer |
| "titles / description / chapters / tags" | seo optimiser, reviewer |
| "thumbnail ideas" | thumbnail designer (from `post.title` if no package), reviewer |
| "review these titles" | reviewer only |

Copy Daniel already wrote goes into the run folder under its number and its writer is skipped.

## Phase 3: Review

`yt-reviewer` → `03_review_report.md`. FIX → one round back to the author, then a lighter re-review of the delta; a second FIX round at most, then report the open items. BLOCK → stop.

## Phase 4: Deliver

First line `done`, `partly done` or `blocked`. Then the paths, the verdict, the recommended title and thumbnail pair (one, with why), and "Verify before acting:" (figures, unverified items, chapters against the final render). End with: "These are drafts. Putting a title or description into the video's post goes through the video team; uploading, updating the video, setting tags or the thumbnail on YouTube are yours to do."

## Gates

| Action | Gate |
|---|---|
| Reading the video files; writing in `_workspace/yt/` | GREEN |
| The Phase 0 read actions of `youtube_ops` / `youtube_analytics_ops` on `finhub_au` | GREEN |
| Writing chosen copy into `post` in `edit.json` / `script.json` | the video team's step, not this team's |
| `upload_video`, `update_video` (title, description, `tags`), `set_video_thumbnail`, any other write action, any `@wihyl2114` action | RED: Daniel does it; the team stops and hands over |

## Files

`_workspace/yt/<slug>/` (git-ignored by `_workspace/` in `.gitignore`): `00_input.md` · `00_channel.md` · `00_audience.md` · `01_seo_package.md` · `02_thumbnail_briefs.md` · `03_review_report.md`.

## Errors

| Situation | Action |
|---|---|
| No finished video for the slug | `blocked`; name the missing file |
| No transcript | Run from the edit or script; spoken claims `[missing]` |
| Google Workspace tool not connected | Note it; run without the snapshot |
| An agent fails | Retry once; then deliver without its file and name it as missing |
| Usage limit, auth or permission failure | Do not retry; open the files to record what finished, tell Daniel with the reset time; never blind-resend a paid voice or image call |
| The RG 234 guard will not load | BLOCK from the reviewer; nothing is handed over unscanned |
| Daniel asks to upload or set it | Stop: RED. Hand over the approved draft; this team has no YouTube write |

## Test scenarios

- **Normal:** "YouTube package for chon-ngan-hang." Package from `edit.json` and the transcript, chapters from `scripts/export-chapters.mjs` (0:00 plus its four chapters, and its under-10 s warning carried as a finding); three briefs that start from the rendered cover or say "not viewed"; reviewer PASS, or FIX then PASS; delivery names one title and thumbnail pair and the RED steps left to Daniel.
- **Existing file:** "I've written the title and description, just do thumbnails and check it." Daniel's text copied in as `01_seo_package.md`; only the thumbnail designer and the reviewer run; the review covers both files.
- **Error:** "YouTube titles for my new video" with a slug that has no `edit.json` or `script.json`: Phase 0 stops with `blocked: no finished video for <slug>` and suggests `npm run video-status`.

## Extending skills

| Agent | Skill | Gives |
|---|---|---|
| `yt-thumbnail-designer` | `yt-thumbnail-psychology` | glance test, colour and contrast, seven compositions, overlay rules, fonts for Vietnamese, legibility checklist |

_Adapted from danielnguyenfinhub/harness-100 `01-youtube-production` (Apache-2.0)._
