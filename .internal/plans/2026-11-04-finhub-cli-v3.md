# finhub CLI v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. `bd` is not installed in the cloud session, so track the two tasks in the conversation. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add `finhub prep`, `finhub sweep`, `finhub research` and `finhub voice` as pass-through wrappers over `prep-video.py`, `sweep-render.mjs`, `research.py` and `voice-video.mjs`.

**Architecture:** Four more entries in the existing `PASSTHROUGH` table in `scripts/finhub-cli/passthrough.mjs`; four lines in `HELP` in `scripts/finhub.mjs`. The dispatcher already sends any name in the table to `runPassthrough` before it parses options, so no logic changes.

**Tech Stack:** Node 24 ESM (`.mjs`), `node:assert/strict`. No new dependency.

Spec: `.internal/specs/2026-11-04-finhub-cli-v3-design.md`. Builds on merged v1 (#169) and v2 (#170). Branch `claude/hopeful-bardeen-tqxm7d`, already at `origin/main` (`cd96762`).

## Global Constraints

- Same behaviour as v2: arguments after the command go to the script untouched; its stdout, stderr and exit code are returned as they are; no `--json`; the command must be first; children spawned with an argument array, never a shell; `PYTHON` overrides `python`; `--help` or `-h` as the only argument prints the wrapper's help.
- `research` needs one of `trending topic read transcript watch comments audience selftest`, otherwise `UsageError` (exit 2). `prep`, `sweep` and `voice` forward everything.
- No Python is run by `npm test`: the Python wrappers (`prep`, `research`) are tested by their command line only.
- `clone-voice`, `setup-voice` and `music-start` are not wrapped (AGENTS.md voice-consent rule; too small).
- Commit messages are Conventional Commits and end with the two trailer lines from the session's attribution reminder.

## File map

| File | Action | Responsibility |
|---|---|---|
| `scripts/finhub-cli/passthrough.mjs` | modify | four new table entries, `RESEARCH_STEPS`, a `python` helper |
| `scripts/finhub.mjs` | modify | `HELP` lines |
| `scripts/check-finhub-cli.mjs` | modify | v3 tests, `--help` names |
| `scripts/README.md`, `AGENTS.md` | modify | docs |

---

### Task 1: the four wrappers

**Files:**
- Modify: `scripts/finhub-cli/passthrough.mjs`, `scripts/finhub.mjs`, `scripts/check-finhub-cli.mjs`

**Interfaces:**
- Consumes: `PASSTHROUGH`, `passthroughArgv`, `runPassthrough` from v2; `UsageError` from `lib.mjs`.
- Produces: `PASSTHROUGH.prep|sweep|research|voice`, each `{ help: string, argv(root, rest): string[] }`.

**Acceptance Criteria:**
- `finhub prep|sweep|research|voice --help` exits 0 and names the command; `finhub --help` names all eleven commands.
- The built command lines match the spec table.
- `finhub research`, `finhub research nope` and `finhub research constructor` exit 2.
- `finhub voice` with no arguments returns the script's exit 1 and its usage text; `finhub sweep` with no arguments returns the script's own usage.

- [ ] **Step 1: Write the failing test**

In `scripts/check-finhub-cli.mjs` edit the dispatcher loop `for (const c of ["doctor", "status", "render", "clean", "library", "overlay", "listing"]) assert.match(` to:

```js
for (const c of ["doctor", "status", "render", "clean", "library", "overlay", "listing", "prep", "sweep", "research", "voice"]) assert.match(
```

and insert above `console.log("finhub-cli ok");`:

```js
// --- prep, sweep, research, voice (pass-through)
{
  const node = (script, ...args) => [process.execPath, "--no-warnings", join(ROOT, "scripts", script), ...args];
  const py = (script, ...args) => [process.env.PYTHON ?? "python", join(ROOT, "scripts", script), ...args];
  assert.deepEqual(
    passthroughArgv(ROOT, "prep", ["raw.mp4", "my-slug", "--recording", "r1"]),
    py("prep-video.py", "raw.mp4", "my-slug", "--recording", "r1"),
  );
  assert.deepEqual(passthroughArgv(ROOT, "sweep", ["a-slug", "--sheet"]), node("sweep-render.mjs", "a-slug", "--sheet"));
  assert.deepEqual(
    passthroughArgv(ROOT, "research", ["topic", "rates", "--slug", "a-slug"]),
    py("research.py", "topic", "rates", "--slug", "a-slug"),
  );
  assert.deepEqual(passthroughArgv(ROOT, "research", ["selftest"]), py("research.py", "selftest"));
  assert.deepEqual(passthroughArgv(ROOT, "voice", ["a-slug", "--dry-run"]), node("voice-video.mjs", "a-slug", "--dry-run"));
  for (const rest of [[], ["nope"], ["constructor"]])
    assert.throws(() => passthroughArgv(ROOT, "research", rest), UsageError, `research ${rest.join(" ")} is a usage error`);

  for (const bad of [["research"], ["research", "nope"], ["research", "constructor"]])
    assert.equal(finhub(bad).status, 2, `finhub ${bad.join(" ")} exits 2`);
  for (const c of ["prep", "sweep", "research", "voice"]) {
    const h = finhub([c, "--help"]);
    assert.equal(h.status, 0, h.stderr);
    assert.match(h.stdout, new RegExp(`finhub ${c}`));
  }
  const voice = finhub(["voice"]);
  assert.equal(voice.status, 1, "voice-video.mjs's own exit code passes through");
  assert.match(voice.stderr, /usage/);
  const sweep = finhub(["sweep"]);
  assert.match(sweep.stderr, /usage: node scripts\/sweep-render\.mjs/, "the script's own usage comes through");
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | grep -m1 -E "TypeError|Error"`
Expected: FAIL, `TypeError: Cannot read properties of undefined (reading 'argv')` (the `prep` entry does not exist yet).

- [ ] **Step 3: Add the table entries**

In `scripts/finhub-cli/passthrough.mjs`, below the `LISTING` constant add:

```js
const RESEARCH_STEPS = ["trending", "topic", "read", "transcript", "watch", "comments", "audience", "selftest"];
const python = (root, script, ...fixed) => [process.env.PYTHON ?? "python", join(root, "scripts", script), ...fixed];
```

and replace the end of the `PASSTHROUGH` table, that is the text

```js
      return [...LISTING[rest[0]](root), ...rest.slice(1)];
    },
  },
};
```

with:

```js
      return [...LISTING[rest[0]](root), ...rest.slice(1)];
    },
  },
  prep: {
    help: `finhub prep "<video>" <slug> [--recording <id>] [--no-clean]   (runs python scripts/prep-video.py)
  Also: prep <slug> --recording <id>   and   prep <slug> --clips public/videos/<slug>/clips.json
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => python(root, "prep-video.py", ...rest),
  },
  sweep: {
    help: `finhub sweep <slug> [--file <mp4>] [--max <n>] [--out <dir>] [--sheet] [--start <s>] [--end <s>]   (runs node scripts/sweep-render.mjs)
  Contact frames of a finished render, for QC.
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => node(root, "sweep-render.mjs", ...rest),
  },
  research: {
    help: `finhub research <${RESEARCH_STEPS.join("|")}> [args]   (runs python scripts/research.py)
  Trending topics, topic research, page and YouTube reads, before a faceless script is written.
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => {
      if (!RESEARCH_STEPS.includes(rest[0])) throw new UsageError(`needs one of: ${RESEARCH_STEPS.join(", ")}`);
      return python(root, "research.py", ...rest);
    },
  },
  voice: {
    help: `finhub voice <slug> [--dry-run] [--engine google|omnivoice|elevenlabs] [--voice <profile>] [--no-chain]   (runs node scripts/voice-video.mjs)
  Voices an approved faceless script. For Global RE listings use: finhub listing voice
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => node(root, "voice-video.mjs", ...rest),
  },
};
```

In `scripts/finhub.mjs` replace the `listing <step>` help line and the sentence after it so the block reads:

```
  listing <step>    Global RE listing video: prep, voice, render
  prep <video> <slug>   prepare a recording: Whisper words, proxy, matte (scripts/prep-video.py)
  sweep <slug>      contact frames of a finished render for QC (scripts/sweep-render.mjs)
  research <step>   trending, topic, read, transcript, watch, comments, audience (scripts/research.py)
  voice <slug>      voice an approved faceless script (scripts/voice-video.mjs)

doctor, status, render and clean take --json (one JSON object on stdout) and --help.
library, overlay, listing, prep, sweep, research and voice pass their arguments to the script
untouched: no --json, the command must come first, and the exit code is the script's own.
```

(The `Exit codes:` line that follows stays as it is.)

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 3`
Expected: `finhub-cli ok` (a stderr typeless-module warning above it is expected).

Run: `node --no-warnings scripts/finhub.mjs research ; echo "exit $?"`
Expected: `finhub research: needs one of: trending, topic, read, transcript, watch, comments, audience, selftest` and `exit 2`.

- [ ] **Step 5: Prove the test bites, then commit**

Back `scripts/finhub-cli/passthrough.mjs` up to the scratchpad, then run two mutations, restoring after each: (a) `sed -i 's/"audience", "selftest"\]/"audience"]/'` (drop `selftest` from `RESEARCH_STEPS`) must fail the `research selftest` argv assertion; (b) `sed -i 's/node(root, "voice-video.mjs", ...rest)/node(root, "voice-video.mjs", "--listing", ...rest)/'` must fail the `voice` argv assertion. Confirm the file is byte-identical to the backup afterwards (`cmp`).

```bash
git add scripts/finhub-cli/passthrough.mjs scripts/finhub.mjs scripts/check-finhub-cli.mjs
git commit -m "feat: finhub prep, sweep, research and voice (pass-through)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

---

### Task 2: Docs, gates, PR

**Files:**
- Modify: `scripts/README.md`, `AGENTS.md`

**Acceptance Criteria:**
- The README row and the AGENTS.md line name the four commands.
- `npm test`, `npm run lint` and `node scripts/check-scripts-index.mjs` pass; the real commands run.
- A draft PR to `main` lists what was verified in the cloud and what is `verify on PC`; this session is subscribed.

- [ ] **Step 1: Update the README row and the AGENTS.md line**

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path("scripts/README.md"); s = p.read_text()
old = "and `listing-render.py` untouched (no `--json`). It calls"
assert s.count(old) == 1
p.write_text(s.replace(old, "and `listing-render.py` untouched (no `--json`); `prep`, `sweep`, `research` and `voice` do the same for `prep-video.py`, `sweep-render.mjs`, `research.py` and `voice-video.mjs`. It calls"))
EOF
```

Edit `AGENTS.md`: replace `library | overlay | listing prep|voice|render pass the script's own arguments through` with `library | overlay | listing prep|voice|render | prep | sweep | research | voice pass the script's own arguments through`.

- [ ] **Step 2: Run the repo's gates**

Run: `npm test 2>&1 | tail -n 4` , `npm run lint 2>&1 | tail -n 3` , `node scripts/check-scripts-index.mjs`
Expected: exit 0 for each; `scripts index ok`. The one `check-schema` SKIPPED line is the known cloud limit, also on `main`.

- [ ] **Step 3: Smoke the real commands**

```bash
npm run --silent finhub -- --help | sed -n 1,16p
npm run --silent finhub -- research selftest
npm run --silent finhub -- voice; echo "exit $?"
npm run --silent finhub -- research; echo "exit $?"
```

Expected: eleven commands listed; `research.py selftest: OK`; the voice usage text and `exit 1`; the research `needs one of` message and `exit 2`.

- [ ] **Step 4: Commit, push, open the PR**

```bash
git add scripts/README.md AGENTS.md
git commit -m "docs: finhub prep, sweep, research and voice" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
git push -u origin claude/hopeful-bardeen-tqxm7d
```

Open a draft PR to `main` (GitHub MCP `create_pull_request`, `draft: true`) titled `feat: finhub prep, sweep, research and voice`. Body: the four-row table, "same pass-through rules as v2", "not wrapped: clone-voice, setup-voice (voice-consent rule in AGENTS.md), music-start", "Verified (cloud)": the gates and smoke commands, "Verify on PC": a real `prep` (recording and Whisper), `sweep` (a render), `research` (network) and faceless `voice` (engine and key). End with the PR attribution lines from the session's reminder, then subscribe.

---

## Self-review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| The four commands and their scripts, `python` for `prep` and `research` | 1 (table entries, argv tests) |
| `research` step check, prototype key rejected, exit 2 | 1 |
| `prep`, `sweep`, `voice` forward everything; script exit codes pass through | 1 (`voice` exit 1, `sweep` usage) |
| `--help` on each; `finhub --help` names eleven commands | 1 |
| No Python in `npm test` | 1 (tests use command lines only) |
| `clone-voice`, `setup-voice`, `music-start` not wrapped | not built, deliberately |
| Docs: HELP, README, AGENTS.md | 1 (HELP), 2 |
| `verify on PC` list | 2 (PR body) |

**Placeholder scan:** none; every code step has its code and each mutation has an exact `sed`.

**Type consistency:** `PASSTHROUGH`, `passthroughArgv(root, name, rest)`, `node(root, script, ...fixed)` and `UsageError` are the v2 names; the new `python(root, script, ...fixed)` helper mirrors `node` and is used only in this file.
