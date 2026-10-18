# Sibling repos: where they are and what to ask each

The repos are cloned next to this one (`../<repo>` from the finhub-video root; GitHub Desktop puts them there on Daniel's PC). One `sibling-repo-analyst` per row. Licences as read from each `LICENSE` on 2026-10-18; re-read before porting code.

| Repo | Path | What it is | Licence | Focus question |
|---|---|---|---|---|
| Scrapling | `../Scrapling` | Python scraping library (adaptive selectors, stealth fetchers) | BSD-3-Clause | Can it make `scripts/research.py` (topic/read) and the stock search in `scripts/visuals.mjs` fetch pages they fail on today, with an installed or one small dependency? |
| Agent-Reach | `../Agent-Reach` | installer and doctor giving agents read/search access to many platforms | MIT | Which of its channels would feed runbook B1.0 ("what's trending") for Vietnamese-Australian finance topics, and does its doctor pattern fit `video-status --check`? |
| paperclip | `../paperclip` | app for managing AI agents for work (task, budget and approval tracking) | MIT | What run tracking, budget or approval-gate ideas would make the team runs (`docs/agents/team-runs.md`, `out/videos/<slug>/team/`) easier to resume and cheaper? |
| harness | `../harness` | the harness skill this team was built with (team design, workflows, evolve) | Apache-2.0 | Which harness v2 practices do the existing teams in `.claude/skills/*-team*` not follow yet (workflow mode, schemas, resume, trigger tests)? |
| harness-100 | `../harness-100` | 100 ready team harnesses | Apache-2.0 | Beyond `01-youtube-production` and `04-content-repurposer` (already ported), which harness covers a job Daniel does by hand around a video? |
| remotion | `../remotion` | Remotion upstream monorepo (the vendored skills come from here) | Remotion licence (see `docs/agents/mediabunny-and-licence.md`) | Which features or packages in the pinned version (`package.json`) does no scene, design or script use yet that would help a talking-head or faceless video? |
| remocn | `../remocn-remotion-resoure` | shadcn-style registry of Remotion animations, transitions, backgrounds | MIT (its own CLAUDE.md: never port reactbits code, MIT + Commons Clause) | Which registry items are missing from `.claude/elements/remocn/CATALOG.md`, and which would a Finance Hub design use? |
| OpenMontage | `../OpenMontage` | Python tools plus a Remotion composer, agent-orchestrated | **AGPL-3.0: ideas only, never copy code** | Only what `docs/audit/sibling-repos-review.md` (28 Sep) did not already weigh. |
| claude-video | `../claude-video` | the `/watch` skill: yt-dlp + ffmpeg frames + Whisper | MIT | Only what the 28 Sep review did not already weigh (its plugin layout is the pattern `.claude-plugin/` follows). |
