# Plugin and MCP server

Part of the project guide; [AGENTS.md](../../AGENTS.md) routes here. Everything below runs on Daniel's PC: videos are edited and rendered locally, never in a cloud session.

## The MCP server

`mcp/finhub-video-server.mjs` (stdio, `@modelcontextprotocol/sdk`) gives Claude Desktop, Cowork and Claude Code the editing scripts as tools. It is registered once, as `finhub-video` in `.mcp.json`: open Claude Code or Cowork on this folder and Claude asks once to trust it. The plugin does not carry it: an installed plugin is a copy in `~/.claude/plugins/cache` with no `node_modules` (the server needs `@modelcontextprotocol/sdk` and `zod`) and no recordings, and a same-name plugin server would replace the folder's working one. `npm run mcp` starts it by hand; `node scripts/check-mcp.mjs` proves it (in `npm test`).

| Tool | Runs | Writes |
|---|---|---|
| `video_status` | `scripts/video-status.mjs [slug]`; with `job` (an id, or `all`) the step and output of a running job, then its result | nothing |
| `preflight` | `scripts/preflight.mjs <slug>` | nothing |
| `still` | `remotion still <composition> out/mcp/<composition>[-<slug>]-<frame>.png --scale=0.5`; with `slug` and/or `safeZones` also `--props='{"slug":…,"safeZones":true}' --gl=angle` as runbook A6.2 (no `slug` = the composition's default video) | `out/mcp/` |
| `render_video` | `python scripts/render-video.py <slug>` as a job (only after Daniel asks to render, preflight first) | `out/videos/<slug>/`, `2 - FINISHED VIDEOS/` |
| `research` | `python scripts/research.py trending`, `topic "<query>" --slug <slug>`, `read <http(s)-url> --slug`, `transcript`, `watch` (one at a time, like `still`), `comments` (YouTube links only) or `audience <channel>`; `ask` (Perplexity, cited answer) and `translate` (DeepSeek, Gemini fallback) through `scripts/providers.mjs` | `out/` |
| `list_designs` | reads `src/designs/*/template.json` | nothing |
| `audio` | `voice` (`voice-video.mjs`, its `--dry-run` is the quote), `music`, `sfx` (ElevenLabs), `transcribe` (a file inside `public/videos/<slug>/`: local faster-whisper by default, free and private; `engine: elevenlabs` uploads it to ElevenLabs Scribe, US$0.22 an hour) through `scripts/providers.mjs` | `public/videos/<slug>/`, `out/` |
| `visuals` | `stock` (Pixabay/Pexels, CLIP-ranked, into the library), `library` (find), `image` (fal FLUX or xAI Grok Imagine; Gemini picks the best of `n`) | `public/library/`, the video's footage |
| `prep` | `ingest` (`prep-video.py "<1 - PUT FOOTAGE HERE/file>" <slug>`, read in place), `reedit` (`<slug> --recording <id>`), `assemble` (`--clips public/videos/<slug>/clips.json`), all three as jobs and only for a slug with no edit.json yet; `template` and `pick` (`select-template.mjs`), `clean` (`clean-clip.mjs`, the report only), `music_start` (`music-start.mjs`, a file in `public/music`), `reframe` (`reframe.py`, a file in the footage folder), `matte` (`matte-headless.mjs <slug>`, a job: the cut-out `foreground.webm`; `bench` saves nothing, `headed` opens a visible Chrome window, `redo` replaces an existing cut-out) | `public/recordings/<id>/`, the skeleton edit.json, `out/` |
| `review` | `srt` (`export-srt.mjs`), `chapters` (`export-chapters.mjs`), `sweep` (`sweep-render.mjs`, a job) and `pack` (`review-pack.mjs --designs/--family`, a job; never `--promote`) | `out/` |
| `edit` | `mcp/edit.mjs`: `get` (edit.json, or chosen top-level keys), `words` (a phrase or an ms window from words.json, with the source ms to paste), `patch` (`set`/`unset`/`append` on a dot path such as `hook.big` or `cues.2.toMs`), `undo` (back to `edit.json.bak`); after a save, `check-speech-cuts` and/or `check-pacing` for the fields it touched | `public/videos/<slug>/edit.json` and `.bak` |

**Paid calls:** `audio` (all but local `transcribe`) and `visuals image` answer the first call with a quote and a confirm code and spend nothing; the real call needs that code, which is bound to the same tool, arguments and quote, works once and expires after 15 minutes. Show Daniel the quote before confirming. Every real call is logged in `out/spend-ledger.jsonl`. `research ask` (about US$0.005) and `translate` run straight away; `ask` with `deep` (sonar-pro) quotes first. All real runs together stop at `FINHUB_DAILY_CAP_USD` (default US$10 in 24 h, summed from the ledger). `transcribe` with `engine: elevenlabs` uploads the file to ElevenLabs and `translate` sends the text to DeepSeek: a client recording or a client's details need Daniel's OK first. Keys are read only in `scripts/providers.mjs` and the scripts it calls. Not wired: voice cloning and ElevenLabs voice design (consent rule below), the Anthropic key (the caller is already Claude), and cloud rendering on Remotion Lambda: its site bucket is served at public URLs and the site carries `public/`, client recordings included, so it waits on Daniel's decision.

**Jobs:** `render_video`, `prep ingest/reedit/assemble/matte` and `review sweep/pack` take the one heavy slot (shared with `still`) and answer at once with a job id, because an MCP client gives up on a call after about a minute. `video_status` with `job` shows the current step (render-video.py's `== <step>` lines, else the last line) and the last 15 lines, then the result; `job: "all"` lists them. Jobs live in the server's memory: after a restart `video_status <slug>` still shows a render through `out/videos/<slug>/<slug>.inputs`. While a job for a video runs, `edit` won't save that video's edit.json.

**edit.json saves:** `edit patch` and `edit undo` go through the same gate: the first call returns a preview (each change, the words a new cut drops, and a "Needs Daniel's explicit yes" list for a cut or a `cut.words` entry that drops a spoken number (digits or a number word such as trăm, triệu, phẩy) or whose words can't be shown, a caption fix that changes a number, `background: vignette`, and any `compliance` or `exemptions` change) and saves nothing. The code is bound to that preview, which carries the file's hash, so it is refused if edit.json changed in between (the review page, another call). Before showing a preview the change must pass the render's schema (`src/mortgage/schema.ts`), keep `source` (prep sets it) and keep `pacing` off on Daniel's footage. A save re-reads edit.json (a change since the preview stops it), makes `.tmp` and `edit.json.bak` fresh (a link planted at either name is removed, not followed) and renames; the code also binds `check`, so the checks can't be switched off at confirm time; `undo` swaps the two back. A failed speech-cut check after a save is reported with the way back (`edit undo`), not undone automatically. Show Daniel the preview, every time.

Kept off on purpose, so no tool call can do them without Daniel in the chat: posting or staging for YouTube, Facebook or Drive (`publish-post.mjs`), voice cloning (AGENTS.md "Language"), moving recordings (ground rule 3), promoting a design (`review-pack --promote`), and `clean-clip --apply` (its cuts go through `edit patch`, previewed). Safety: slugs go through `slugOk` from `scripts/listing-prep.mjs`, composition ids must be letters, digits and dashes, and every script runs through `execFile` with an argument list (no shell) from the repo root. Python is `python` (as `npm run test:py`); set `PYTHON` if yours is `python3`.

### Remote mode (Railway)

`mcp/http.mjs` serves the same server over Streamable HTTP for claude.ai web and the phone app, with only the tools that need no footage, Remotion or ffmpeg: `list_designs`, `research` (every mode but `watch`; its out/ files come back in the answer) and `visuals` (`stock` only: candidate links and licences, nothing downloaded). `ask`, `translate` and `stock` need `PERPLEXITY_API_KEY`, `DEEPSEEK_API_KEY` and/or `GEMINI_API_KEY`, `PIXABAY_API_KEY`/`PEXELS_API_KEY` as Railway variables. `railway.json` builds `mcp/Dockerfile` (Node 24, the two MCP packages, Python with yt-dlp and feedparser) and checks `GET /health`. Without the Railway variable `MCP_TOKEN` (24+ characters) the server will not start.

**Connect from claude.ai:** add a custom connector with the URL `https://finhub-video-editor-production.up.railway.app/mcp` and leave the OAuth Client ID and secret empty. claude.ai opens a sign-in page (`mcp/oauth.mjs`): paste `MCP_TOKEN` there once. The connector then keeps a 1-hour access token and a 30-day refresh token; changing `MCP_TOKEN` in Railway signs every connector out. This is the MCP authorization flow (OAuth 2.1 with PKCE and dynamic client registration), stateless: client ids, codes and tokens are signed with a key derived from `MCP_TOKEN`, so nothing is stored. Only the claude.ai connector callback and localhost callbacks can register, and 10 wrong tokens from one address lock the sign-in page for 15 minutes.

Clients that can send a header (Claude Desktop, Claude Code) can still use `Authorization: Bearer <MCP_TOKEN>`, or the URL `…/mcp/<token>`, which puts the token in Railway's request logs. `check-mcp.mjs` proves the token gate, the tool list and the whole sign-in round trip.

### PC connector (every tool from claude.ai)

The Railway connector has only the light tools: editing needs the footage, Remotion, Chromium and ffmpeg on Daniel's PC. `npm run mcp:pc` runs the same HTTP server on the PC with every tool (`video_status`, `preflight`, `still`, `render_video`, `research` with `watch`, `list_designs`, `audio`, `visuals`, `edit`, `prep`, `review`), behind the same OAuth sign-in. Over HTTP, `still` also returns the frame as a picture, so it shows in the chat. One render or still at a time, at most two `preflight`, `video_status` or research jobs at once, and a job that runs past its time limit is killed with everything it started (ffmpeg, Chromium). Publishing, voice cloning and moving recordings stay off, as for every MCP mode.

**What it exposes:** anyone holding the PC's `MCP_TOKEN` can see client footage as stills, read video folder names and paths, and run renders on the PC. Treat the token like the PC's password. `mcp:pc` listens on `127.0.0.1` only, so the LAN and public wifi cannot reach it; only the tunnel can.

One-time setup on the PC (Windows):

1. In the repo folder, create `.env` (git-ignored) with `MCP_TOKEN=` a new random value, different from Railway's and at least 24 characters, and `PORT=8787`. Generate it with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (stock Windows has no `openssl`). Keep the repo folder, and so `.env`, out of OneDrive and other cloud backups.
2. Install Tailscale (tailscale.com/download), sign in, then in a terminal: `tailscale funnel --bg 8787`. The first time, it asks to turn on HTTPS and Funnel for the tailnet in the Tailscale admin console; allow it. It prints a fixed address `https://<pc-name>.<tailnet>.ts.net`. Only that port is published, nothing else on the PC. Funnel is free, opens no router port and keeps the same address; a cloudflared quick tunnel changes address every run, and ngrok's free tier puts a warning page in front of the sign-in page.
3. `npm run mcp:pc`. If Windows Firewall asks to allow Node.js, click Cancel: Funnel reaches it on `127.0.0.1` and needs no firewall rule. Check `https://<pc-name>.<tailnet>.ts.net/health` says `ok`.
4. claude.ai, Settings, Connectors, Add custom connector: name `FinHub Video Editor (PC)`, URL `https://<pc-name>.<tailnet>.ts.net/mcp`, OAuth fields empty. Paste the PC's `MCP_TOKEN` on the sign-in page. Don't use the `…/mcp/<token>` URL form for the PC: it puts the token in the URL, where the tunnel and browser history can keep it.
5. To start it at log-in: Task Scheduler, Create Task, trigger "At log on", action `cmd` with arguments `/c npm run mcp:pc` (npm is a `.cmd` file, which Task Scheduler cannot start directly) and "Start in" the repo folder. Funnel (`--bg`) already survives restarts.

The connector works while the PC is on and `mcp:pc` runs; otherwise claude.ai shows it as unavailable and the Railway connector still answers `list_designs` and `research`. Changing the PC's `MCP_TOKEN` signs that connector out. The sign-in lock (10 wrong tokens, 15 minutes) counts per address only where the proxy reports the caller's address; if Funnel reports none, every attempt counts as `127.0.0.1`, so 10 wrong tokens from anyone lock the sign-in page for everyone, Daniel included, for 15 minutes. A connector already signed in keeps working: refreshing its token doesn't use that page. Stop exposing the PC with `tailscale funnel --bg off` (or `tailscale funnel reset`).

## The desktop plugin

`.claude-plugin/plugin.json` ships the whole harness without copying it: `skills` points at `.claude/skills/`, `agents` lists every `.claude/agents/*.md` file by name (the manifest takes no folder for agents; `check-teams.mjs` fails when an agent file and the list differ), and it has no `mcpServers`: the MCP tools come from the folder's `.mcp.json` (above). `.claude-plugin/marketplace.json` makes the repo its own marketplace (the pattern from the sibling `claude-video` repo).

Install on the PC (Claude Code terminal, or the desktop app's Code tab; a plugin installed in one is available in the others on that computer):

```console
/plugin marketplace add danielnguyenfinhub/finhub-video-editor
/plugin install finhub-video@finhub-video-editor
```

What to know:

- The skills and scripts expect this folder as the working folder (they run `scripts/…` and read `AGENTS.md`). Open the repo folder: that gives the MCP tools (`.mcp.json`); the plugin carries the skills and agents and makes the teams available where project `.claude/` is not loaded. `CLAUDE.md` and `AGENTS.md` are not shipped by a plugin; the folder supplies them.
- With the folder open and the plugin installed, each skill appears twice (the project copy and `finhub-video:<skill>`). Both are the same file; either works.
- Cloud sessions (claude.ai/code) do not load local plugins. They write code; the PC renders.
- `claude plugin validate .` checks the manifests (one expected warning: `CLAUDE.md` at the root is not loaded by a plugin).
- A new agent file needs its line in `plugin.json` `agents`; a new skill folder is picked up by itself.
