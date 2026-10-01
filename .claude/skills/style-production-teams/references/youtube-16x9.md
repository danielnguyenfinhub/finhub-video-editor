# Recipe: YouTube 16:9 long-form

Styles: base (default), ytstudio, ytslides, ytdashboard, ytcinema, ytsidebar (`src/youtube/designs/`). Composition `YouTubeReel` at 1920x1080: the same `edit.json` and voice as a vertical faceless video, the same core rules (`buildReel`: validation, RG 234, rate gate, reading holds), drawn inside `YT_SAFE` (`src/youtube/frame.ts`). The vertical `MortgageReel` is untouched.

**Pick this team when** Daniel wants the long-form version of a faceless video for YouTube, not a Reel.

**Process:** the faceless pipeline (B). Reuse a finished vertical video's `public/videos/<slug>/` rather than re-researching or re-voicing; only the design and aspect change. Use `YT_SAFE` constants, never literals. `ytslides`, `ytdashboard`, `ytcinema`, `ytsidebar`, `ytstudio` are different layouts of the same `Design` contract; read the design's own file before promising a look.

**Unverified in this recipe:** a published YouTube folder or caption convention (the finished-videos folder is `2 - FINISHED VIDEOS/`; check `scripts/publish-video.mjs` before promising a path), and whether `select-template.mjs` ranks the YouTube designs (it reads `src/designs` only).
