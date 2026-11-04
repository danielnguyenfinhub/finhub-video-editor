# finhub CLI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. `bd` is not installed in the cloud session, so track the two tasks in the conversation. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add `finhub library`, `finhub overlay` and `finhub listing prep|voice|render` as pass-through wrappers over the existing scripts.

**Architecture:** One new module, `scripts/finhub-cli/passthrough.mjs`, holds a table of command to argument-list builder and help text. `scripts/finhub.mjs` decides these three names before it parses options and forwards the raw arguments, so each script's own flags and exit code are untouched.

**Tech Stack:** Node 24 ESM (`.mjs`), `node:child_process`, `node:assert/strict`. No new dependency.

Spec: `.internal/specs/2026-11-04-finhub-cli-v2-design.md`. Builds on the merged v1 (`scripts/finhub.mjs`, `scripts/finhub-cli/`, `scripts/check-finhub-cli.mjs`). Branch `claude/hopeful-bardeen-tqxm7d`, restarted from `origin/main` `e215fab`.

## Global Constraints

- Arguments after the command go to the script untouched; the script's stdout, stderr and exit code are returned as they are. No `--json` for these three commands. The command must be the first argument.
- Usage errors exit 2: `library` without one of `find add index stats resolve`; `listing` without one of `prep voice render`. `overlay` with no arguments is the script's own exit 1.
- `--help` or `-h` as the only argument prints the wrapper's help; with other arguments it goes to the script.
- Children are spawned with an argument array and never through a shell; `PYTHON` overrides `python`; `process.execPath` for Node.
- `listing voice` runs `voice-video.mjs --listing <args>`, as the existing `npm run listing-voice` alias does.
- Style: match `scripts/finhub-cli/*.mjs` (ESM, short header comment, `Object.hasOwn` for table lookups so a prototype key cannot pass). Commit messages are Conventional Commits and end with the two trailer lines from the session's attribution reminder.

## File map

| File | Action | Responsibility |
|---|---|---|
| `scripts/finhub-cli/passthrough.mjs` | create | `PASSTHROUGH` table, `passthroughArgv`, `runPassthrough` |
| `scripts/finhub.mjs` | modify | check the three names before `parseArgs`; shared `guarded` usage-error handling; `HELP` |
| `scripts/check-finhub-cli.mjs` | modify | v2 tests; `--help` names the three new commands |
| `scripts/README.md` | modify | the `finhub.mjs` and `finhub-cli/` rows |
| `AGENTS.md` | modify | the "Commands" line |

---

### Task 1: pass-through wrappers

**Files:**
- Create: `scripts/finhub-cli/passthrough.mjs`
- Modify: `scripts/finhub.mjs`, `scripts/check-finhub-cli.mjs`

**Interfaces:**
- Consumes: `OK`, `PROBLEM`, `UsageError` from `scripts/finhub-cli/lib.mjs`; the scripts `library.mjs`, `hf-overlay.mjs`, `listing-prep.mjs`, `voice-video.mjs`, `listing-render.py`.
- Produces: `PASSTHROUGH: Record<"library"|"overlay"|"listing", { help: string, argv(root: string, rest: string[]): string[] }>`; `passthroughArgv(root, name, rest): string[]` (throws `UsageError`); `runPassthrough(root, name, rest): number`.

**Acceptance Criteria:**
- `finhub library stats` runs `node scripts/library.mjs stats` and returns its exit code; `finhub overlay --selftest` reaches the script (a flag the dispatcher does not declare); `finhub overlay` with no arguments returns the script's exit 1.
- `finhub library`, `finhub library nope`, `finhub listing`, `finhub listing nope` and `finhub listing constructor` exit 2.
- `finhub <library|overlay|listing> --help` exits 0 and names the command; `finhub --help` names all seven commands.

- [ ] **Step 1: Write the failing test**

In `scripts/check-finhub-cli.mjs` add below the other imports:

```js
import { passthroughArgv } from "./finhub-cli/passthrough.mjs";
```

Edit the dispatcher loop `for (const c of ["doctor", "status", "render", "clean"])` to:

```js
for (const c of ["doctor", "status", "render", "clean", "library", "overlay", "listing"])
```

and insert above `console.log("finhub-cli ok");`:

```js
// --- library, overlay, listing (pass-through)
{
  const node = (script, ...args) => [process.execPath, "--no-warnings", join(ROOT, "scripts", script), ...args];
  assert.deepEqual(passthroughArgv(ROOT, "library", ["stats"]), node("library.mjs", "stats"));
  assert.deepEqual(
    passthroughArgv(ROOT, "library", ["find", "house", "--kind", "stock-video"]),
    node("library.mjs", "find", "house", "--kind", "stock-video"),
  );
  assert.deepEqual(passthroughArgv(ROOT, "overlay", ["out/hf/a", "--en", "rate"]), node("hf-overlay.mjs", "out/hf/a", "--en", "rate"));
  assert.deepEqual(passthroughArgv(ROOT, "overlay", []), node("hf-overlay.mjs"));
  assert.deepEqual(passthroughArgv(ROOT, "listing", ["prep", "My Folder"]), node("listing-prep.mjs", "My Folder"));
  assert.deepEqual(
    passthroughArgv(ROOT, "listing", ["voice", "a-slug", "--lang", "en"]),
    node("voice-video.mjs", "--listing", "a-slug", "--lang", "en"),
  );
  assert.deepEqual(passthroughArgv(ROOT, "listing", ["render", "a-slug"]).slice(1), [join(ROOT, "scripts", "listing-render.py"), "a-slug"]);
  for (const [name, rest] of [["library", []], ["library", ["nope"]], ["listing", []], ["listing", ["nope"]], ["listing", ["constructor"]]])
    assert.throws(() => passthroughArgv(ROOT, name, rest), UsageError, `${name} ${rest.join(" ")} is a usage error`);

  for (const bad of [["library"], ["library", "nope"], ["listing"], ["listing", "nope"], ["listing", "constructor"]])
    assert.equal(finhub(bad).status, 2, `finhub ${bad.join(" ")} exits 2`);
  for (const c of ["library", "overlay", "listing"]) {
    const h = finhub([c, "--help"]);
    assert.equal(h.status, 0, h.stderr);
    assert.match(h.stdout, new RegExp(`finhub ${c}`));
  }
  const stats = finhub(["library", "stats"]);
  assert.equal(stats.status, 0, stats.stderr);
  assert.match(stats.stdout, /total/, "the script's own output comes through");
  const selftest = finhub(["overlay", "--selftest"]);
  assert.equal(selftest.status, 0, selftest.stderr);
  assert.match(selftest.stdout, /hf-overlay selftest: ok/, "a flag the dispatcher does not declare reaches the script");
  const noargs = finhub(["overlay"]);
  assert.equal(noargs.status, 1, "the script's own exit code passes through");
  assert.match(noargs.stderr, /usage/);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | grep -m1 -E "Cannot find module|Error"`
Expected: FAIL, `Cannot find module '.../scripts/finhub-cli/passthrough.mjs'`.

- [ ] **Step 3: Write `passthrough.mjs`**

Create `scripts/finhub-cli/passthrough.mjs`:

```js
// finhub library | overlay | listing: pass-through wrappers. The script's own flags go through untouched
// (finhub.mjs decides these names before it parses options) and so does its exit code, so each flag has
// one home. Children are spawned with an argument array, never through a shell.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { OK, PROBLEM, UsageError } from "./lib.mjs";

const node = (root, script, ...fixed) => [process.execPath, "--no-warnings", join(root, "scripts", script), ...fixed];

const LIBRARY_STEPS = ["find", "add", "index", "stats", "resolve"];
// The same invocations as the npm aliases listing, listing-voice and listing-render.
const LISTING = {
  prep: (root) => node(root, "listing-prep.mjs"),
  voice: (root) => node(root, "voice-video.mjs", "--listing"),
  render: (root) => [process.env.PYTHON ?? "python", join(root, "scripts", "listing-render.py")],
};

export const PASSTHROUGH = {
  library: {
    help: `finhub library <step> [args]   (runs node scripts/library.mjs)
  find <keywords...> [--kind k]   add <file> <meta.json>   index   stats   resolve <slug> [--public-dir dir]
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => {
      if (!LIBRARY_STEPS.includes(rest[0])) throw new UsageError(`needs one of: ${LIBRARY_STEPS.join(", ")}`);
      return node(root, "library.mjs", ...rest);
    },
  },
  overlay: {
    help: `finhub overlay <project-dir> --en "keywords" [--vi "từ khóa"] [--slug <slug>]   (runs node scripts/hf-overlay.mjs)
  Renders one HyperFrames composition (1080x1920) to a transparent WebM and files it in the library.
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => node(root, "hf-overlay.mjs", ...rest),
  },
  listing: {
    help: `finhub listing <prep|voice|render> [args]
  prep "<folder>"                           node scripts/listing-prep.mjs
  voice <slug> [--lang vi|en] [--dry-run]   node scripts/voice-video.mjs --listing
  render <slug> [--lang vi|en]              python scripts/listing-render.py   (exit 3: rendered, not published)
Arguments, output and exit code are the script's own; there is no --json.`,
    argv: (root, rest) => {
      if (!Object.hasOwn(LISTING, rest[0])) throw new UsageError(`needs one of: ${Object.keys(LISTING).join(", ")}`);
      return [...LISTING[rest[0]](root), ...rest.slice(1)];
    },
  },
};

/** The command line a wrapper would run. Throws UsageError for a missing or unknown step. */
export const passthroughArgv = (root, name, rest) => PASSTHROUGH[name].argv(root, rest);

export const runPassthrough = (root, name, rest) => {
  if (rest.length === 1 && (rest[0] === "--help" || rest[0] === "-h")) {
    console.log(PASSTHROUGH[name].help);
    return OK;
  }
  const argv = passthroughArgv(root, name, rest);
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, stdio: "inherit" });
  if (r.error) console.error(r.error.message);
  return r.status ?? PROBLEM;
};
```

- [ ] **Step 4: Change the dispatcher**

In `scripts/finhub.mjs`:

1. Add below the `lib.mjs` import:

```js
import { PASSTHROUGH, runPassthrough } from "./finhub-cli/passthrough.mjs";
```

2. Replace the whole `HELP` constant with:

```js
export const HELP = `finhub <command> [options]

  doctor            check this PC: Node, ffmpeg, Python, node_modules, disk, API key names
  status [slug]     where each video stands; with a slug, readiness and what is next
  render <slug>     render one video (python scripts/render-video.py); --still <frame>, --dry-run
  clean             list, and with --apply delete, old regenerable files; --older-than <days>
  library <step>    the source library: find, add, index, stats, resolve (scripts/library.mjs)
  overlay <dir>     render a HyperFrames overlay into the library (scripts/hf-overlay.mjs)
  listing <step>    Global RE listing video: prep, voice, render

doctor, status, render and clean take --json (one JSON object on stdout) and --help.
library, overlay and listing pass their arguments to the script untouched: no --json, the command
must come first, and the exit code is the script's own.
Exit codes: 0 ok, 1 problem found, 2 usage error, 3 rendered but not published.`;
```

3. Replace the `main` function (from `export const main = async` to its closing `};`) with:

```js
// A bad argument is a UsageError: print it and exit 2.
const guarded = async (cmd, fn) => {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`finhub ${cmd}: ${e.message}`);
    return USAGE;
  }
};

export const main = async (argv, root = join(import.meta.dirname, "..")) => {
  // library, overlay and listing hand every argument to their script, so they are decided before parseArgs.
  if (Object.hasOwn(PASSTHROUGH, argv[0])) return guarded(argv[0], () => runPassthrough(root, argv[0], argv.slice(1)));
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    console.error(`finhub: ${e.message}\n\n${HELP}`);
    return USAGE;
  }
  const [cmd, ...positionals] = parsed.positionals;
  if (!cmd) {
    console.log(HELP);
    return parsed.values.help ? 0 : USAGE;
  }
  if (!COMMANDS.includes(cmd)) {
    console.error(`finhub: unknown command "${cmd}"\n\n${HELP}`);
    return USAGE;
  }
  const mod = await import(`./finhub-cli/${cmd}.mjs`);
  if (parsed.values.help) {
    console.log(mod.help);
    return 0;
  }
  return guarded(cmd, () => mod.run(root, { positionals, values: parsed.values }));
};
```

- [ ] **Step 5: Run it to verify it passes**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 3`
Expected: `finhub-cli ok` (a stderr typeless-module warning above it is expected).

Run: `node --no-warnings scripts/finhub.mjs listing ; echo "exit $?"`
Expected: `finhub listing: needs one of: prep, voice, render` and `exit 2`.

- [ ] **Step 6: Commit**

```bash
git add scripts/finhub-cli/passthrough.mjs scripts/finhub.mjs scripts/check-finhub-cli.mjs
git commit -m "feat: finhub library, overlay and listing (pass-through)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

---

### Task 2: Docs, gates, PR

**Files:**
- Modify: `scripts/README.md`, `AGENTS.md`

**Interfaces:**
- Consumes: Task 1.
- Produces: the pushed branch and a PR.

**Acceptance Criteria:**
- The README rows and the AGENTS.md line name `library`, `overlay` and `listing`.
- `npm test`, `npm run lint` and `node scripts/check-scripts-index.mjs` pass; the real commands from Task 1 run.
- A draft PR to `main` lists what was verified in the cloud and what is `verify on PC`; this session is subscribed.

- [ ] **Step 1: Update the README rows**

Run:

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path("scripts/README.md"); s = p.read_text()
def sub(old, new):
    global s
    assert s.count(old) == 1, (old[:50], s.count(old))
    s = s.replace(old, new)
sub("each with `--json`. It calls the scripts in this folder and rewrites none of them;",
    "each with `--json`; `library`, `overlay` and `listing prep|voice|render` forward their arguments to `library.mjs`, `hf-overlay.mjs`, `listing-prep.mjs`, `voice-video.mjs --listing` and `listing-render.py` untouched (no `--json`). It calls the scripts in this folder and rewrites none of them;")
sub("| `finhub-cli/` | The four commands and their shared output helpers |",
    "| `finhub-cli/` | The four commands, the pass-through table (`passthrough.mjs`) and their shared output helpers |")
p.write_text(s)
EOF
```

- [ ] **Step 2: Update the AGENTS.md line**

Edit `AGENTS.md`: in the line beginning `npm run finhub -- doctor`, replace `each takes --json (scripts/README.md, "One command: finhub")` with `each takes --json; library | overlay | listing prep|voice|render pass the script's own arguments through (scripts/README.md, "One command: finhub")`.

- [ ] **Step 3: Run the repo's gates**

Run: `npm test 2>&1 | tail -n 4` , `npm run lint 2>&1 | tail -n 3` , `node scripts/check-scripts-index.mjs`
Expected: exit 0 for each; `scripts index ok`. The one `check-schema` SKIPPED line is the known cloud limit, also on `main`.

- [ ] **Step 4: Smoke the real commands**

```bash
npm run --silent finhub -- --help
npm run --silent finhub -- library stats
npm run --silent finhub -- overlay --selftest
npm run --silent finhub -- listing; echo "exit $?"
```

Expected: help lists seven commands; library totals; `hf-overlay selftest: ok`; a `needs one of: prep, voice, render` message and `exit 2`.

- [ ] **Step 5: Commit, push, open the PR**

```bash
git add scripts/README.md AGENTS.md
git commit -m "docs: finhub library, overlay and listing" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
git push -u origin claude/hopeful-bardeen-tqxm7d
```

Open a draft PR to `main` (GitHub MCP `create_pull_request`, `draft: true`) titled `feat: finhub library, overlay and listing`. Body: the five invocations table, "pass-through: arguments, output and exit code are the script's own; no `--json`", "Verified (cloud)": the gates and smoke commands above; "Verify on PC": a real `finhub listing prep|voice|render` with a listing folder. End with the PR attribution lines from the session's reminder, then subscribe to the PR.

---

## Self-review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| The five invocations and their scripts (incl. `--listing`, Python for render) | 1 (`passthrough.mjs`, argv tests) |
| Pass-through before `parseArgs`; flags the dispatcher does not declare reach the script | 1 (dispatcher change; `overlay --selftest` test) |
| Script's output and exit code returned; spawn failure 1 | 1 (`runPassthrough`; `overlay` no-args test) |
| No `--json`; command first | 1 (HELP text) |
| Usage errors exit 2 for missing/unknown `library` and `listing` steps, prototype keys rejected | 1 (tests incl. `constructor`) |
| `--help`/`-h` alone prints wrapper help | 1 (tests) |
| Array spawn, no shell | 1 (`spawnSync` with an argument array) |
| Docs: HELP, README rows, AGENTS.md line | 1 (HELP), 2 |
| `verify on PC` for a real listing run | 2 (PR body) |
| Out of scope items | not built |

**Placeholder scan:** none; every code step has its code.

**Type consistency:** `PASSTHROUGH`, `passthroughArgv(root, name, rest)` and `runPassthrough(root, name, rest)` are defined in Step 3 and used by that name in Step 1's test, Step 4's dispatcher and the Interfaces block; `UsageError`, `OK`, `PROBLEM` come from the existing `lib.mjs`.
