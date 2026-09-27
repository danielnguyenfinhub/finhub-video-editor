# finhub-video

A Remotion project: videos are written as React components and rendered to MP4/WebM. Remotion and all `@remotion/*` packages are pinned to the same version (see `package.json`) — keep them in lockstep when upgrading (`npx remotion upgrade`).

## How this repo is used: Claude Code is the editor

This is Daniel's video editor, and the editing interface is a Claude Code chat. Daniel is a mortgage broker, not a developer: he records a video, has it prepared into `public/recordings/<id>/source.mp4`, and says in chat what he wants. The agent does the editing end to end with the `vietnamese-finance-video-editor` skill (prep, `edit.json`, design, render) and hands back a finished video to watch, not options or instructions. His footage comes from `1 - PUT FOOTAGE HERE/` (read in place, never moved), and `render-video.py` ends by putting `<Topic>.mp4` and `<Topic> - caption.txt` in `2 - FINISHED VIDEOS/` (`scripts/publish-video.mjs`, from the `post` copy). `npm run review` is a secondary page for Daniel's own small tweaks (design, grade, timings). Judge new code by whether it makes the next video better or faster to edit this way.

## Commands

```console
npm i                 # install dependencies
npm run dev           # Remotion Studio preview (http://localhost:3000)
npm run lint          # ESLint + TypeScript check — run before committing
npm run research -- trending   # what's trending for a faceless video (runbook B1.0; also topic/read/transcript)
npx remotion render   # render a composition to a video file
```

Rendering and Studio need Node.js and a Chrome/Chromium download; they work in Claude Code, Claude Cowork and local terminals, but not in claude.ai chat.

## Work lean: fewer tokens per video

Adapted from [ponytail](https://github.com/DietrichGebert/ponytail) (see `.claude/PONYTAIL.md`). Before writing anything, stop at the first rung that holds:

1. **Is it needed?** Build what the brief asks for. No extra scenes, props or schemas "for later"; add a Zod schema or `Interactive` controls only when the owner wants to edit the video in Studio.
2. **Is it already here?** A scene in `src/showcase/` that uses the same package (grep `src/showcase` for the package or component name), an Element in `.claude/elements/CATALOG.md`, a badge in `public/badges/`. Copy it and adapt it.
3. **Does an installed `@remotion/*` package do it?** Transitions, captions, shapes, paths, effects, sfx, fonts and more are all installed. Use one before writing your own.
4. **Only then** write new code: one component per file, animated from `useCurrentFrame()`.

Checking the work costs tokens too:

- **Check with stills, not videos.** `npx remotion still <id> out/check.png --frame=<n> --scale=0.5` on the two or three frames that matter. An image costs tokens in proportion to its pixels, so `--scale=0.5` makes each look about a quarter of the price. Render the full video once, at the end, or part of it with `--frames=<a>-<b>`.
- **Keep command output short.** Pipe renders and lint through `tail -n 5`; the error is at the end.
- **Read only what the task needs.** `docs/findings.md` holds the detailed notes on individual packages; search it for the package in hand instead of reading it whole.
- **Don't delegate small lookups.** A subagent starts from nothing: a one-question Explore run here used about 48,000 tokens, and it did not see this file, so put any rule that matters into its prompt.
- **Mark a deliberate shortcut** with `// ponytail: <limit>, <when to upgrade>`. `/ponytail-debt` lists them.

For code changes (scripts, the MortgageReel core, tooling), read [docs/agents/code-changes.md](docs/agents/code-changes.md) first.

## Language: every video is Vietnamese + English

The owner's videos are bilingual. The speech may be Vietnamese, English, or a mix of both, and on-screen text (titles, captions, lower thirds, end cards) is written in both languages. Assume this for every new video unless told otherwise; if it isn't clear which language leads, ask. The showcase scenes are English-only API demos and are the exception.

- **Write real Vietnamese.** Keep every diacritic ("Lãi suất vay", never "Lai suat vay"), and normalize text that comes from a transcript, an API or a file with `.normalize("NFC")`, so each accented letter is one character.
- **Default bilingual layout:** Vietnamese as the main line and English as a smaller line under it, sharing the same timing. Keep the two as separate strings or caption tracks, not one mixed sentence, so either can be restyled or dropped.
- **Voice cloning (OmniVoice):** faceless videos default to Google's Charon voice; `--engine omnivoice` uses a cloned voice (`scripts/voice-video.mjs`, README "Clone your voice"). Run `npm run clone-voice` only after the person says in this chat that the voice is their own or that they have the speaker's written permission; never add `--consent` on your own, and never clone a voice from a video you found or were sent by someone else. Profiles stay in `~/.finhub-voice/`, never in this public repository, and voiced audio is never committed.

## Where to read: task → files

The rest of the guide is in `docs/agents/`; read a file only when the task needs it. A comment saying "see <section> in AGENTS.md" means the file listed here.

| Section or topic | Read |
|---|---|
| Badges and logos, Lender logos, Emoji, Brand kit, Elements (`src/elements/`) | [brand-assets](docs/agents/brand-assets.md) |
| MortgageReel (prep, render, cuts, background, music) | [mortgage-reel](docs/agents/mortgage-reel.md) |
| Project structure | [project-structure](docs/agents/project-structure.md) |
| Rendering environments without a GPU, What this sandbox can't do | [rendering-without-gpu](docs/agents/rendering-without-gpu.md) |
| Third-party API keys | [api-keys](docs/agents/api-keys.md) |
| Skills, harness change logs | [skills-and-harnesses](docs/agents/skills-and-harnesses.md) |
| Elements (`.claude/elements/`, remocn) | [elements](docs/agents/elements.md) |
| Starter templates | [starters](docs/agents/starters.md) |
| Language: fonts, stacked marks, speech-to-text, voiceover | [language](docs/agents/language.md) |
| Mediabunny, Remotion licence | [mediabunny-and-licence](docs/agents/mediabunny-and-licence.md) |
| One `@remotion/*` package | grep `docs/findings.md`; never read it whole |
| Remotion API docs and examples (4.0.529 — check the installed version first) | [docs/remotion/README](docs/remotion/README.md), then grep; never read the files whole |

Read list per task, on top of this file. `refs/` is `.claude/skills/vietnamese-finance-video-editor/references/`; "remocn index" is `head -n 22 .claude/elements/remocn/CATALOG.md`, then grep.

| Task | Files | Bytes |
|---|---|---|
| Mode A edit (existing design, re-edit) | editor `SKILL.md`, `refs/landmines.md`, `refs/edit-json.md` | 25,631 |
| New design (each new talking-head video): Mode A plus | `refs/design-space.md`, `refs/design-architecture.md`, `refs/toolkit.md`, `refs/editing-principles.md`, `.claude/elements/CATALOG.md`, remocn index | +41,893 = 67,524 |
| Mode B faceless | `refs/faceless-script.md`, `video-production-team` and `video-compliance-review` SKILL.md, the five `video-*` agents | 47,165 |
| Repo or tooling change | [code-changes](docs/agents/code-changes.md), [project-structure](docs/agents/project-structure.md), [mortgage-reel](docs/agents/mortgage-reel.md) | 7,738 |

## Harnesses

### Harness: video production team

**Trigger:** when Daniel asks to edit his footage ("edit my video", "I recorded a video about…") or for a video from a document or topic (faceless), including follow-ups on one ("redo the paper edit", "re-run QC", "fix what compliance flagged"), use the `video-production-team` skill. It runs the whole runbook for both pipelines with its agents in `.claude/agents/`; `vietnamese-finance-video-editor` is the standard its editor follows.

### Harness: refactor team

**Trigger:** when Daniel asks to refactor, dedupe, audit or speed up this repo ("where are the tokens going", "run the refactor pipeline", "make rendering faster", "did the dedup work"), use the `refactor-team` skill. It runs `architecture-auditor`, `asset-refactorer`, `pipeline-optimizer` and `quality-reviewer` from `.claude/agents/`, measuring with the `repo-audit-tools` skill. A one-line fix needs no team.

## Conventions

- Videos are bilingual, Vietnamese + English: see "Language" near the top of this file before writing any on-screen text or captions.
- Register new compositions in `src/Root.tsx`; one component per file under `src/`.
- Drive all animation from `useCurrentFrame()`/`interpolate()`/`spring()` — never from wall-clock time.
- In components, take `delayRender`/`continueRender`/`cancelRender` from `useDelayRender()` (render-scoped, the documented recommendation) rather than importing the global functions; every scene here does.
- Users may edit files between conversations (including visually in Remotion Studio); treat surprising diffs as intentional and don't overwrite them.
- Run `npm run lint` before committing.
