# Recipe: YouTube 16:9 long-form

Styles: base (default), ytstudio, ytslides, ytdashboard, ytcinema, ytsidebar (`src/youtube/designs/`). Composition `YouTubeReel` at 1920x1080: the same `edit.json` and voice as a vertical faceless video, the same core rules (`buildReel`: validation, RG 234, rate gate, reading holds), drawn inside `YT_SAFE` (`src/youtube/frame.ts`). The vertical `MortgageReel` is untouched.

**Pick this team when** Daniel wants the long-form version of a faceless video for YouTube, not a Reel.

**Process:** the faceless pipeline (B). Reuse a finished vertical video's `public/videos/<slug>/` rather than re-researching or re-voicing; only the design and aspect change. Use `YT_SAFE` constants, never literals. `ytslides`, `ytdashboard`, `ytcinema`, `ytsidebar`, `ytstudio` are different layouts of the same `Design` contract; read the design's own file before promising a look.

**Unverified in this recipe:** a published YouTube folder or caption convention (the finished-videos folder is `2 - FINISHED VIDEOS/`; check `scripts/publish-video.mjs` before promising a path), and whether `select-template.mjs` ranks the YouTube designs (it reads `src/designs` only).

**Status (decided 2026-10-01 while Daniel was away; he can reverse it): preview-only.** Nothing in the repo shows long-form YouTube is in use (no finished-folder convention, `render-video.py` hard-codes `MortgageReel`, no run has used it), so no render or publish path is built. If Daniel asks for a YouTube video, the first task is that path: a `YouTubeReel` branch in `render-video.py` and `publish-video.mjs`, plus a QC frame list for 1920x1080. Until then the team may brief and preview a YouTube design but must say it cannot be rendered to the finished folder.
