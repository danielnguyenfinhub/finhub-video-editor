# Where the elements live, and how to read each source cheaply

Never read a catalogue whole when a grep answers the question. Cite the file you opened in
`sources_read`.

| Rung | Source | Where | Read it as | Licence / notes |
|---|---|---|---|---|
| 1 | cue grammar | `.claude/skills/vietnamese-finance-video-editor/references/edit-json.md` (`cues`, `stats`, `hook`, `chapters`, `visuals`); `src/designs/classic/Cues.tsx` for what each cue draws | grep the cue name | repo |
| 2 | repo elements | `src/elements/*.tsx`, `src/elements/README.md`; list in `src/designs/README.md` "Elements to reuse" | `ls src/elements`, then the one file | repo |
| 3 | vendored Remotion Elements | `.claude/elements/CATALOG.md` (one line per element), files under `.claude/elements/<category>/<slug>/` | grep the category heading (`^## data`) | Remotion licence (see `reference/remotion/LICENSE.md`); adapt per `src/designs/README.md`: swap the Google font for `FONT`, colours for brand tokens, drop `Interactive.*`, drop their own `<Audio>` |
| 4 | remocn | offline: `../remocn-remotion-resoure/content/docs/<category>/<name>.mdx` (frontmatter `useWhen`, `avoidWhen`, `length` in frames at 30 fps, `vibe`); online: `https://remocn.dev/llms-components.txt` then the component page; install: `npx shadcn add remocn/<name>` into a design folder (the `remocn` skill) | `grep -l '^component: <name>$'` then `sed -n '/^useWhen/,/^---/p'` | MIT; components written on the Remotion API; the clone is a sibling folder on Daniel's PC and in this sandbox, not part of this repo |
| 5 | Remotion packages | ideas: `reference/remotion/packages/<pkg>/` (transitions, light-leaks, starburst, shapes, paths, rough-notation, rounded-text-box, animation-utils, motion-blur, noise, layout-utils, captions); code: `node_modules/@remotion/<pkg>/dist/*.d.ts` at the installed 4.0.527; per-agent API list `docs/remotion/agent-map.md` | the agent-map grep recipe | Remotion licence; the docs are 4.0.529, confirm every API in the installed `.d.ts` |

## remocn categories that matter for a finance talk

`typography` (number-wheel, rolling-number, inline-highlight, marker-highlight, ink-underline,
hand-count, kinetic-center-build), `ui-blocks` (animated-bar-chart, animated-line-chart,
check-list, paper-sticker), `transitions` (fade-through, shared-axis-y, soft-blur-in), `effects`
(ink-arrow, scribble-circle). The `shaders`, `filters` and most of `effects` are backgrounds and
textures: they fail test 4 (caption contrast) behind text and are a `breathe` at most.

## What a design must already have

A rung 2–5 element is code in `src/designs/<id>/`. The motion designer names it with a rung-1
fallback; the editor builds the fallback unless the chosen design already renders that element.
Adding an element to a design is a `repo-build-team` or `template-improvement-team` job between
videos, logged in `src/designs/README.md`, never a change made inside a video run.
