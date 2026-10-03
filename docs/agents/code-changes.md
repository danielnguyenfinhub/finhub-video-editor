# Work lean: code changes

Part of the project guide; [AGENTS.md](../../AGENTS.md) is the core and routes here. Moved from AGENTS.md "Work lean"; read it before changing scripts, the MortgageReel core or tooling.

## Work lean: rules for code changes

For code changes (scripts, the MortgageReel core, tooling):

- Fix a bug at its root: grep every caller of the function you touch and fix the shared function once.
- Shortest correct diff, fewest files, deletion over addition. No abstraction, config or boilerplate nobody asked for.
- Never cut input validation at trust boundaries, error handling that prevents data loss, security, accessibility, or anything explicitly requested. Non-trivial logic still gets a check.
- After changing shared code or the core (`golden.ts`, `classic/Panel` or `Cues`, `hookText`, anything several designs import), run `node scripts/stills-diff.mjs <slug>` and look at what changed in the designs you did not mean to touch.
- Report in a few lines: what changed and what was skipped. Explain at length only when asked.
