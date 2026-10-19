# Plugin and MCP server

Part of the project guide; [AGENTS.md](../../AGENTS.md) routes here. Everything below runs on Daniel's PC: videos are edited and rendered locally, never in a cloud session.

## The MCP server

`mcp/finhub-video-server.mjs` (stdio, `@modelcontextprotocol/sdk`) gives Claude Desktop, Cowork and Claude Code the editing scripts as tools. It is registered once, as `finhub-video` in `.mcp.json`: open Claude Code or Cowork on this folder and Claude asks once to trust it. The plugin does not carry it: an installed plugin is a copy in `~/.claude/plugins/cache` with no `node_modules` (the server needs `@modelcontextprotocol/sdk` and `zod`) and no recordings, and a same-name plugin server would replace the folder's working one. `npm run mcp` starts it by hand; `node scripts/check-mcp.mjs` proves it (in `npm test`).

| Tool | Runs | Writes |
|---|---|---|
| `video_status` | `scripts/video-status.mjs [slug]` | nothing |
| `preflight` | `scripts/preflight.mjs <slug>` | nothing |
| `still` | `remotion still <composition> out/mcp/<composition>[-<slug>]-<frame>.png --scale=0.5`; with `slug` and/or `safeZones` also `--props='{"slug":…,"safeZones":true}' --gl=angle` as runbook A6.2 (no `slug` = the composition's default video) | `out/mcp/` |
| `render_video` | `python scripts/render-video.py <slug>` (only after Daniel asks to render, preflight first) | `out/videos/<slug>/`, `2 - FINISHED VIDEOS/` |
| `research` | `python scripts/research.py trending`, `topic "<query>" --slug <slug>`, `watch <https-url> --slug <slug>` (one at a time, like `still`) or `comments <https-url> --slug <slug>`; watch/comments refuse a query that is not `https://` | `out/` |
| `list_designs` | reads `src/designs/*/template.json` | nothing |

Kept off on purpose, so no tool call can do them without Daniel in the chat: posting or staging for YouTube, Facebook or Drive (`publish-post.mjs`), voice cloning (AGENTS.md "Language"), moving recordings (ground rule 3). Safety: slugs go through `slugOk` from `scripts/listing-prep.mjs`, composition ids must be letters, digits and dashes, and every script runs through `execFile` with an argument list (no shell) from the repo root. Python is `python` (as `npm run test:py`); set `PYTHON` if yours is `python3`.

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
