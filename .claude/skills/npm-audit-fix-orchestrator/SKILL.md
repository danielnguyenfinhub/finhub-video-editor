---
name: npm-audit-fix-orchestrator
description: Runs the triage, fix and verify team for npm vulnerabilities in the FinHub video editor repo. Use for "fix the npm vulnerabilities", "npm audit", "dependency security", "clean up the audit warnings", and for follow-ups such as "re-run the verify", "redo only the triage", "try the next fix", "update the audit report", "improve the previous result".
---

# npm audit fix orchestrator

## Execution mode: Sub-agent delegation (Mode C), run in sequence
**Target surface:** Claude Code only (needs shell, git and npm). Not for chat or Cowork.

## Delegation gate
- Hand-offs: triager writes `_workspace/01_triage_report.md` and `01_before_audit.json`; fixer reads the report and writes `02_fix_log.md` plus the two package files; verifier reads all and writes `03_verify_report.md`.
- What splitting buys: a separate context for the checker, so the agent that made the change does not grade itself.
- Write ownership: triager and verifier write only under `_workspace/`; the fixer alone edits `package.json` and `package-lock.json`. One writer to project files, so no parallel-write table is needed.
- Tools: Bash with npm and git read commands on all three; the fixer also has Edit/Write. None may commit or push.
- Synthesis owner: this orchestrator; it accepts the run only when the verifier's first line is `RESULT: PASS` and its evidence shows the commands ran.
- Partial, blocked and conflicting results are reported as: partial, with the missing part named; never filled with a guess.
- Outcome: delegate (a dependent chain with named hand-off files).

## Rigor
The owner (Daniel) has not assigned a rigor class for dependency changes. Until he does, the verifier runs the full gate set (the stricter choice). The orchestrator does not classify the unit as light itself.

## Work procedure

### Step 0: Check existing work
- No `_workspace/` : fresh run.
- `_workspace/` exists and the request names one part ("redo the verify") : re-run only that agent, passing the earlier file paths.
- `_workspace/` exists and the request is a new run : move it to `_workspace_<timestamp>/` first.
- Confirm the branch is not `main` (`git branch --show-current`). If it is, stop and ask.
- Confirm `node_modules` exists; if not run `npm ci`.

### Step 1: Triage
Call Agent with `subagent_type: "npm-audit-triager"`, no `name`. Brief:
- Goal: sort every `npm audit` finding as reachable or not and propose the smallest safe fix.
- Inputs: repo root, `package.json`, `package-lock.json`.
- Scope: read-only on the repo; write only `_workspace/01_*`.
- Expected output: `_workspace/01_triage_report.md`, `_workspace/01_before_audit.json`.
- Report: end with STATUS / EVIDENCE / BLOCKER.

Check the report exists and its counts match `01_before_audit.json` before continuing. If the "Fix order" is empty, stop and tell Daniel nothing is safely fixable.

### Step 2: Fix
Call Agent with `subagent_type: "npm-audit-fixer"`, no `name`. Brief:
- Goal: apply the "Fix order" items from the triage report, one at a time, re-auditing after each.
- Inputs: `_workspace/01_triage_report.md`.
- Scope: edit only `package.json` and `package-lock.json`; no major bumps, no Remotion version changes, no commit.
- Expected output: `_workspace/02_fix_log.md`.
- Report: STATUS / EVIDENCE / BLOCKER.

### Step 3: Verify
Call Agent with `subagent_type: "npm-fix-verifier"`, no `name`. Brief:
- Goal: prove the changed lockfile installs, passes the repo gates and has no higher audit counts.
- Inputs: `_workspace/01_before_audit.json`, `_workspace/02_fix_log.md`, the working tree.
- Scope: read-only on the repo; write only `_workspace/03_verify_report.md`.
- Expected output: that report, first line `RESULT: PASS|FAIL|PARTIAL`.
- Report: STATUS / EVIDENCE / BLOCKER.

Before using any report, check it ends with the STATUS / EVIDENCE / BLOCKER lines and the named files exist. If not, re-ask once; if still missing, mark that result unverified.

### Step 4: Wrap-up
Give Daniel a plain-language summary: counts before and after, what was fixed, what was left and why, the verifier's result. Leave `_workspace/`. Do not commit or push; list the changed files and ask.

## Error handling
- One agent fails: retry once, then record the gap and stop; later steps depend on earlier ones.
- Registry, auth or permission failures: no retry; report.
- Verifier `FAIL` : show the failing check; do not auto-revert. Offer to undo with `git checkout -- package.json package-lock.json`.
- The verifier cannot run a check: report `not run`, never imply a pass.

## Test scenarios
- Happy path: "fix the npm vulnerabilities" on a clean branch. Triage lists items, the fixer lowers high and critical counts in range, the verifier prints PASS with seven command results.
- Error path: the only fix for a critical needs a major bump. The triager puts it under "Do not touch", the fixer skips it, the final report names it as left open.
- Follow-up: "redo only the verify" re-runs Step 3 with the existing files.
