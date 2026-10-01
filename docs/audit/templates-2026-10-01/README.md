# Template review, 1 October 2026 (template-improvement-team, run 1)

Run from a sandbox with no render (the browser launches, but every composition fetches a Google font and the network refused it) and no `source.mp4`. Everything here is from code, the repo's checks, throwaway planner harnesses and the 21 committed `preview.png` files. **Nothing was seen on a still.** Look claims are marked unviewed.

| File | What |
|---|---|
| `01_golden_audit_*.md` | rule-by-rule audit per group (violations with file:line) |
| `01_critique_*.md` | design critique per group (ranked improvements, identity to keep) |
| `02_concepts_*.md` | A fixes (provable from code), B fixes (need a render), C options, D rulings for Daniel |
| `03_improver_report_*.md` | what was built and how it was proved |
| `04_*` | independent re-checks |

**Built (PR):** the A items listed in the 03 reports, except kinetic (A5), blueprint (A6) and phoneapp (A7, A8). Those three were **reverted** after the re-check: they fixed the audited case but kinetic could show two giant numbers at once, and blueprint and phoneapp could push a figure past the end of the talk. They need a proper design with a render (see `04_golden_recheck.md`, `04_critique_recheck.md`).

**Held, for Daniel:** the shared stage scheduler for the 11 faceless data designs (`02_concepts_faceless-data.md` A0–A11), `theme-exempt` markers, every B and C item, every D ruling (cover-logo place, classic's grandfathered layout, `room` background vs README rule 4.3, computed differences, text-size floor, the faceless `promoted` flag).

Promotion (`promote-design.mjs`) was not re-run for any changed design: run it where renders work.
