# finhub CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`); `bd` is not installed in the cloud session, so there track tasks in the conversation. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One `finhub` command (`doctor`, `status`, `render`, `clean`) as a thin, non-interactive dispatcher over the scripts that already exist.

**Architecture:** `scripts/finhub.mjs` parses arguments with `node:util` `parseArgs` and lazily imports one module per command from `scripts/finhub-cli/`. Each module exports `help` and `run(root, { positionals, values })`, and the pure parts (`planClean`, `checkDoctor`, `statusData`, `stillArgs`, `infoLine`) are exported so `scripts/check-finhub-cli.mjs` tests them on a temp root. Nothing in the existing scripts is rewritten.

**Tech Stack:** Node 24 ESM (`.mjs`), `node:util` `parseArgs`, `node:assert/strict`, `node:fs`, `node:child_process`. No new dependency.

Spec: `.internal/specs/2026-11-04-finhub-cli-design.md` (commit `d1785a2` plus the four small edits made with this plan). Branch: `claude/hopeful-bardeen-tqxm7d`, restarted from `origin/main` `4f95d48`.

## Global Constraints

Every task's requirements include these (values copied from the spec):

- Node must satisfy `package.json` `engines.node` (currently `>=24`); no new dependency; arguments parsed with `node:util` `parseArgs`.
- Exit codes: 0 ok, 1 problem found or blocked, 2 usage error, 3 passed through from `render-video.py` (rendered, not published).
- `--json` prints exactly one JSON object on stdout and nothing else on stdout. Default output is a few lines of text.
- A slug is validated with `slugOk` (`scripts/listing-prep.mjs`) before any path is built; a bad slug exits 2. Never `assertSlug` (it calls `process.exit(1)`).
- Children are spawned with an argument array and never through a shell. Only API key *names* are ever read into output, never values.
- `clean` is dry-run unless `--apply`. `--older-than` is a whole number >= 1 (default 30), anything else exits 2.
- `clean` allow-list, the only deletable things: `node_modules/.cache/finhub-tmp/<child>` untouched for 6 h; `out/videos/*/team/qc/sweep/`; render outputs of one slug (`<slug>.mp4`, `-mobile.mp4`, `-feed.mp4`, `thumbnail.png`, `<slug>.srt`, `<slug>.inputs`) only when `team/06_delivery.md` exists, the files are older than `--older-than` days, and `unfinishedRender` is false. Unreachable even with `--apply`: `public/recordings/`, `public/library/`, `public/videos/`, `1 - PUT FOOTAGE HERE/`, `2 - FINISHED VIDEOS/`, every `edit.json`, `out/videos/*/team/` ledgers. Every candidate must resolve (`realpath`) inside the root.
- `render` never skips and has no `--force`: the `.inputs` hash covers only `edit.json` (minus `post`), `script.json` and `words.json`, so it is not a render cache key.
- Style: match the surrounding `scripts/*.mjs` (ESM, `import.meta.dirname`, short header comment saying what and why, `// ponytail: <limit>, <upgrade>` for a deliberate shortcut). Commit messages are Conventional Commits and end with the two trailer lines from the session's attribution reminder.

## File map

| File | Action | Responsibility |
|---|---|---|
| `scripts/finhub.mjs` | create | shebang, option parsing, command table, `--help`, exit codes |
| `scripts/finhub-cli/lib.mjs` | create | exit codes, `UsageError`, `emit`, `fmtBytes`, `rel`, `inside` |
| `scripts/finhub-cli/clean.mjs` | create | `planClean`, `applyClean`, `run`, `help` |
| `scripts/finhub-cli/doctor.mjs` | create | `KEYS`, `checkDoctor`, `run`, `help` |
| `scripts/finhub-cli/status.mjs` | create | `statusData`, `run`, `help` |
| `scripts/finhub-cli/render.mjs` | create | `stillArgs`, `renderArgs`, `infoLine`, `run`, `help` |
| `scripts/check-finhub-cli.mjs` | create | the self-test, grown one section per task |
| `package.json` | modify | `bin`, `finhub` script, test chain |
| `scripts/README.md` | modify | new "One command: finhub" section |
| `AGENTS.md` | modify | one line under "Commands" |

---

### Task 1: Dispatcher, shared helpers, wiring

**Files:**
- Create: `scripts/finhub.mjs`, `scripts/finhub-cli/lib.mjs`, `scripts/check-finhub-cli.mjs`
- Modify: `package.json`, `scripts/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `lib.mjs` exports `OK = 0`, `PROBLEM = 1`, `USAGE = 2`, `class UsageError extends Error`, `emit(json: boolean, data: object, lines: string[]): void`, `fmtBytes(n: number): string`, `rel(root: string, p: string): string` (forward slashes), `inside(dir: string, p: string): boolean` (true when `p` is strictly inside `dir`, both real paths). `finhub.mjs` exports `COMMANDS`, `HELP`, `main(argv: string[], root?: string): Promise<number>`. Every command module exports `help: string` and `run(root, { positionals: string[], values: object }): number | Promise<number>`; throwing `UsageError` from `run` makes the dispatcher print the message and exit 2.

**Acceptance Criteria:**
- `finhub --help` exits 0 and names `doctor`, `status`, `render`, `clean`; `finhub` alone, an unknown command, and an unknown option exit 2.
- `npm test` runs `scripts/check-finhub-cli.mjs`, and `node scripts/check-scripts-index.mjs` passes with the new README rows.
- `package.json` has `"bin": {"finhub": "scripts/finhub.mjs"}` and `"finhub": "node --no-warnings scripts/finhub.mjs"`.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-finhub-cli.mjs`:

```js
// Self-test for the finhub CLI (scripts/finhub.mjs and scripts/finhub-cli/): the dispatcher's exit
// codes and help, and each command on a temp tree (never the real repo's out/ or public/).
//   node scripts/check-finhub-cli.mjs -> "finhub-cli ok"
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoTmp } from "./tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");
const FINHUB = join(import.meta.dirname, "finhub.mjs");
const DAY = 86_400_000;

/** Run the real CLI against the real repo. Only read-only commands and dry runs go through here. */
const finhub = (args, env = {}) =>
  spawnSync(process.execPath, ["--no-warnings", FINHUB, ...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } });

/** Call a command's run() and keep what it prints with console.log. */
const capture = (fn) => {
  const log = console.log;
  let out = "";
  console.log = (s) => {
    out += `${s}\n`;
  };
  try {
    return { code: fn(), out };
  } finally {
    console.log = log;
  }
};

/** Write a file (making its folder) and set its modified time to `ageDays` ago. */
const touch = (p, ageDays = 0, body = "x") => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  const t = new Date(Date.now() - ageDays * DAY);
  utimesSync(p, t, t);
};
const age = (p, ageDays) => {
  const t = new Date(Date.now() - ageDays * DAY);
  utimesSync(p, t, t);
};

// --- dispatcher
const help = finhub(["--help"]);
assert.equal(help.status, 0, help.stderr);
for (const c of ["doctor", "status", "render", "clean"]) assert.match(help.stdout, new RegExp(`\\b${c}\\b`), `--help names ${c}`);
assert.equal(finhub([]).status, 2, "no command is a usage error");
assert.equal(finhub(["nope"]).status, 2, "unknown command");
assert.match(finhub(["nope"]).stderr, /unknown command "nope"/);
assert.equal(finhub(["clean", "--bogus"]).status, 2, "unknown option");

console.log("finhub-cli ok");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 5`
Expected: FAIL, an `AssertionError` on the `--help` status (the script does not exist yet, so the child exits 1).

- [ ] **Step 3: Write the helpers**

Create `scripts/finhub-cli/lib.mjs`:

```js
// Shared by the finhub commands: exit codes, usage errors, output, path helpers.
import { isAbsolute, relative, sep } from "node:path";

export const OK = 0;
export const PROBLEM = 1;
export const USAGE = 2;

/** Thrown for bad arguments; the dispatcher prints the message and exits 2. */
export class UsageError extends Error {}

/** One JSON object (--json) or the text lines. Nothing else goes to stdout. */
export const emit = (json, data, lines) => console.log(json ? JSON.stringify(data) : lines.join("\n"));

export const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.ceil(n / 1e3)} KB`);

/** Path relative to root with forward slashes, for output. */
export const rel = (root, p) => relative(root, p).split(sep).join("/");

/** True when p lies strictly inside dir (both already real paths). Case-folded on Windows. */
export const inside = (dir, p) => {
  const fold = (s) => (process.platform === "win32" ? s.toLowerCase() : s);
  const r = relative(fold(dir), fold(p));
  return r !== "" && r !== ".." && !r.startsWith(`..${sep}`) && !isAbsolute(r);
};
```

- [ ] **Step 4: Write the dispatcher**

Create `scripts/finhub.mjs`:

```js
#!/usr/bin/env node
// finhub: one local entry point over the scripts in this folder. It parses arguments and calls what
// already exists; no logic lives here. Commands are in scripts/finhub-cli/, one module each, loaded
// only when used (status and doctor pull in video-status.mjs, which loads a .ts file).
//   npm run finhub -- doctor | status [slug] | render <slug> | clean      (--json on each)
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { USAGE, UsageError } from "./finhub-cli/lib.mjs";

export const COMMANDS = ["doctor", "status", "render", "clean"];

export const HELP = `finhub <command> [options]

  doctor            check this PC: Node, ffmpeg, Python, node_modules, disk, API key names
  status [slug]     where each video stands; with a slug, readiness and what is next
  render <slug>     render one video (python scripts/render-video.py); --still <frame>, --dry-run
  clean             list, and with --apply delete, old regenerable files; --older-than <days>

Every command: --json (one JSON object on stdout) and --help.
Exit codes: 0 ok, 1 problem found, 2 usage error, 3 rendered but not published.`;

const OPTIONS = {
  json: { type: "boolean" },
  help: { type: "boolean" },
  "dry-run": { type: "boolean" },
  still: { type: "string" },
  apply: { type: "boolean" },
  "older-than": { type: "string" },
};

export const main = async (argv, root = join(import.meta.dirname, "..")) => {
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
  try {
    return await mod.run(root, { positionals, values: parsed.values });
  } catch (e) {
    if (!(e instanceof UsageError)) throw e;
    console.error(`finhub ${cmd}: ${e.message}`);
    return USAGE;
  }
};

// realpath: a bare `finhub` from `npm link` is a symlink, and argv[1] keeps the link's path.
const isMain = () => {
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
};
if (isMain()) process.exitCode = await main(process.argv.slice(2));
```

- [ ] **Step 5: Wire package.json, README, file mode**

In `package.json`:
1. Edit `"private": true,` to `"private": true,` followed by a new `"bin"` entry:

```json
  "private": true,
  "bin": {
    "finhub": "scripts/finhub.mjs"
  },
```

2. Edit the line `"video-status": "node scripts/video-status.mjs",` so it is preceded by a new line (same indentation):

```json
    "finhub": "node --no-warnings scripts/finhub.mjs",
    "video-status": "node scripts/video-status.mjs",
```

3. In the `"test"` string replace `node scripts/check-library.mjs &&` with `node scripts/check-library.mjs && node scripts/check-finhub-cli.mjs &&`.

Append this section to the end of `scripts/README.md` (keep a blank line before it):

```markdown
## One command: finhub
| Script | Does |
|---|---|
| `finhub.mjs` | One local entry point: `npm run finhub -- <command>` with `doctor`, `status [slug]`, `render <slug> [--still <frame>] [--dry-run]` or `clean [--apply] [--older-than <days>]`, each with `--json`. It calls the scripts in this folder and rewrites none of them; run `npm link` once on the PC for a bare `finhub` |
| `finhub-cli/` | The four commands and their shared output helpers |
| `check-finhub-cli.mjs` | Dispatcher exit codes and help; `clean` deletes only delivered, old, finished renders (never recordings, the library, ledgers or a symlink out of the repo); `doctor` never prints a key value; `status` and `render` argument shapes and output | **test** |
```

Run: `chmod +x scripts/finhub.mjs && git add scripts/finhub.mjs scripts/finhub-cli/lib.mjs scripts/check-finhub-cli.mjs package.json scripts/README.md && git update-index --chmod=+x scripts/finhub.mjs`

- [ ] **Step 6: Run the checks**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 3`
Expected: `finhub-cli ok`

Run: `node scripts/check-scripts-index.mjs`
Expected: `scripts index ok`

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: finhub CLI dispatcher and shared helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

---

### Task 2: `finhub clean`

**Files:**
- Create: `scripts/finhub-cli/clean.mjs`
- Modify: `scripts/check-finhub-cli.mjs`

**Interfaces:**
- Consumes: `lib.mjs` (`OK`, `UsageError`, `emit`, `fmtBytes`, `inside`, `rel`); `slugOk` from `scripts/listing-prep.mjs`; `unfinishedRender(video: string): boolean` from `scripts/publish-video.mjs` (true when the `<video minus .mp4>.inputs` stamp reads `rendering`).
- Produces: `planClean(root, { days = 30, now = Date.now() }): { candidates: { kind: "temp"|"sweep"|"render", path: string, bytes: number }[], kept: { slug: string, reason: "not delivered"|"render unfinished"|"too new", bytes: number }[], skipped: string[] }`; `applyClean(root, plan): string[]` (paths deleted); `run`, `help`.

**Acceptance Criteria:**
- Dry run deletes nothing; `--apply` deletes exactly the temp folders untouched for 6 h, the sweep folders, and the render files of delivered, finished videos older than `--older-than` days.
- Survivors with `--apply`: files under `public/recordings`, `public/library`, `public/videos`, `2 - FINISHED VIDEOS`, `1 - PUT FOOTAGE HERE`, team ledgers, renders of an undelivered video, a render newer than the cutoff, a render whose `.inputs` says `rendering`, a temp folder touched within 6 h, and anything reached through a symlink out of the root.
- `--older-than` of `0`, `-1`, `abc`, `1.5`, `1e1` or empty exits 2 (throws `UsageError`).
- Each of three deliberate mutations (drop the delivery gate; drop the containment check in `planClean`; drop it in `applyClean`) makes `check-finhub-cli.mjs` fail.

- [ ] **Step 1: Write the failing test**

In `scripts/check-finhub-cli.mjs` add these imports below the `repoTmp` import:

```js
import { applyClean, planClean, run as runClean } from "./finhub-cli/clean.mjs";
import { UsageError, rel } from "./finhub-cli/lib.mjs";
```

and insert this block above `console.log("finhub-cli ok");`:

```js
// --- clean
{
  const root = repoTmp("finhub-clean-");
  const outside = repoTmp("finhub-outside-");
  const at = (p) => join(root, p);

  // delivered and old: the renders and the sweep frames go, the ledger stays
  for (const f of ["old.mp4", "old-mobile.mp4", "thumbnail.png"]) touch(at(`out/videos/old/${f}`), 40);
  touch(at("out/videos/old/old.inputs"), 40, "abc123");
  touch(at("out/videos/old/team/06_delivery.md"), 40);
  touch(at("out/videos/old/team/07_published.json"), 40);
  touch(at("out/videos/old/team/qc/sweep/s1.jpg"), 1);
  // kept, each for its own reason
  touch(at("out/videos/fresh/fresh.mp4"), 2);
  touch(at("out/videos/fresh/team/06_delivery.md"), 2);
  touch(at("out/videos/undelivered/undelivered.mp4"), 90);
  touch(at("out/videos/mid/mid.mp4"), 40);
  touch(at("out/videos/mid/mid.inputs"), 40, "rendering");
  touch(at("out/videos/mid/team/06_delivery.md"), 40);
  // never reachable, however old
  const safe = [
    "public/recordings/rec1/source.mp4",
    "public/library/stock-video/a.mp4",
    "public/videos/old/edit.json",
    "2 - FINISHED VIDEOS/Topic.mp4",
    "1 - PUT FOOTAGE HERE/raw.mp4",
    "out/videos/old/team/01_story_edit.json",
  ];
  for (const p of safe) touch(at(p), 400);
  // temp: a crashed run's folder goes, a recent one stays (the folder's own time is what counts)
  touch(at("node_modules/.cache/finhub-tmp/crashed/f"));
  age(at("node_modules/.cache/finhub-tmp/crashed"), 1);
  touch(at("node_modules/.cache/finhub-tmp/running/f"));
  // a symlink out of the root, where a naive delete would follow it
  touch(join(outside, "victim.txt"), 400);
  const link = at("out/videos/esc/team/qc/sweep");
  let linked = false;
  try {
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(outside, link, "dir");
    linked = true;
  } catch {
    // no right to make symlinks here (Windows without developer mode): that case is skipped
  }

  const plan = planClean(root, { days: 30 });
  assert.deepEqual(
    plan.candidates.map((c) => rel(root, c.path)).sort(),
    [
      "node_modules/.cache/finhub-tmp/crashed",
      "out/videos/old/old-mobile.mp4",
      "out/videos/old/old.inputs",
      "out/videos/old/old.mp4",
      "out/videos/old/team/qc/sweep",
      "out/videos/old/thumbnail.png",
    ].sort(),
    "candidates are exactly the allow-listed, old, delivered, finished files",
  );
  assert.deepEqual(
    plan.kept.map((k) => `${k.slug}:${k.reason}`).sort(),
    ["fresh:too new", "mid:render unfinished", "undelivered:not delivered"],
  );
  if (linked) assert.equal(plan.skipped.length, 1, "the symlink out of the root is skipped, not listed");
  assert.ok(
    planClean(root, { days: 1 }).candidates.some((c) => rel(root, c.path) === "out/videos/fresh/fresh.mp4"),
    "--older-than 1 reaches a 2-day-old delivered render",
  );

  // a forged plan naming the symlink: apply re-checks and leaves the link alone
  if (linked) {
    applyClean(root, { candidates: [{ kind: "sweep", path: link, bytes: 0 }] });
    assert.ok(lstatSync(link).isSymbolicLink(), "applyClean did not follow or remove a link out of the root");
  }

  const dry = capture(() => runClean(root, { values: { json: true } }));
  assert.equal(dry.code, 0);
  assert.equal(JSON.parse(dry.out).apply, false);
  for (const c of plan.candidates) assert.ok(existsSync(c.path), `dry run kept ${rel(root, c.path)}`);

  const applied = capture(() => runClean(root, { values: { json: true, apply: true } }));
  assert.equal(applied.code, 0);
  assert.equal(JSON.parse(applied.out).deleted.length, plan.candidates.length);
  for (const c of plan.candidates) assert.ok(!existsSync(c.path), `deleted ${rel(root, c.path)}`);
  const survivors = [
    ...safe,
    "out/videos/old/team/06_delivery.md",
    "out/videos/old/team/07_published.json",
    "out/videos/fresh/fresh.mp4",
    "out/videos/undelivered/undelivered.mp4",
    "out/videos/mid/mid.mp4",
    "out/videos/mid/mid.inputs",
    "node_modules/.cache/finhub-tmp/running/f",
  ];
  for (const p of survivors) assert.ok(existsSync(at(p)), `${p} survived`);
  assert.ok(existsSync(join(outside, "victim.txt")), "a file behind a symlink out of the root survived");

  for (const bad of ["0", "-1", "abc", "1.5", "1e1", ""])
    assert.throws(() => runClean(root, { values: { "older-than": bad } }), UsageError, `--older-than "${bad}" is a usage error`);
  assert.match(finhub(["clean", "--help"]).stdout, /finhub clean/);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: FAIL, `Cannot find module '.../scripts/finhub-cli/clean.mjs'`.

- [ ] **Step 3: Write `clean.mjs`**

Create `scripts/finhub-cli/clean.mjs`:

```js
// finhub clean: list, and with --apply delete, files that can be regenerated. Only the allow-list below
// is ever a candidate; recordings, public/library, finished videos, edit.json and team ledgers are out
// of reach even with --apply. Every candidate must resolve inside the repo root (a symlink out is skipped).
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { slugOk } from "../listing-prep.mjs";
import { unfinishedRender } from "../publish-video.mjs";
import { OK, UsageError, emit, fmtBytes, inside, rel } from "./lib.mjs";

const DAY = 86_400_000;
const TEMP_MIN_AGE_MS = 6 * 3_600_000; // tmp-dir.mjs prunes crashed runs after the same 6 h

export const help = `finhub clean [--apply] [--older-than <days>] [--json]
  Dry run unless --apply. Only these can be deleted:
    node_modules/.cache/finhub-tmp/<folder>   untouched for 6 h
    out/videos/<slug>/team/qc/sweep/          QC frames
    out/videos/<slug>/ render files           mp4, mobile, feed, thumbnail, srt, inputs of a delivered
                                              video (team/06_delivery.md), finished, older than
                                              --older-than days (whole number >= 1, default 30)
  Undelivered or unfinished renders are listed as kept. Recordings, the library, finished videos and
  ledgers are never touched.`;

const bytesOf = (p) => {
  const st = lstatSync(p);
  return st.isDirectory() ? readdirSync(p).reduce((n, name) => n + bytesOf(join(p, name)), 0) : st.size;
};
const mtime = (p) => lstatSync(p).mtimeMs;

/** What clean would delete and what it keeps. Touches nothing. */
export const planClean = (root, { days = 30, now = Date.now() } = {}) => {
  const realRoot = realpathSync(root);
  const candidates = [];
  const kept = [];
  const skipped = [];
  const add = (kind, p) => {
    if (!inside(realRoot, realpathSync(p))) return void skipped.push(p);
    candidates.push({ kind, path: p, bytes: bytesOf(p) });
  };

  const tmp = join(root, "node_modules", ".cache", "finhub-tmp");
  if (existsSync(tmp))
    for (const name of readdirSync(tmp)) if (now - mtime(join(tmp, name)) > TEMP_MIN_AGE_MS) add("temp", join(tmp, name));

  const videos = join(root, "out", "videos");
  if (!existsSync(videos)) return { candidates, kept, skipped };
  for (const slug of readdirSync(videos)) {
    if (!slugOk(slug)) continue;
    const dir = join(videos, slug);
    const sweep = join(dir, "team", "qc", "sweep");
    if (existsSync(sweep)) add("sweep", sweep);
    const files = [`${slug}.mp4`, `${slug}-mobile.mp4`, `${slug}-feed.mp4`, "thumbnail.png", `${slug}.srt`, `${slug}.inputs`]
      .map((f) => join(dir, f))
      .filter((f) => existsSync(f));
    if (!files.length) continue;
    const reason = !existsSync(join(dir, "team", "06_delivery.md"))
      ? "not delivered"
      : unfinishedRender(join(dir, `${slug}.mp4`))
        ? "render unfinished"
        : now - Math.max(...files.map(mtime)) <= days * DAY
          ? "too new"
          : null;
    if (reason) kept.push({ slug, reason, bytes: files.reduce((n, f) => n + bytesOf(f), 0) });
    else for (const f of files) add("render", f);
  }
  return { candidates, kept, skipped };
};

/** Deletes the plan's candidates; each is re-checked to still sit inside the root. Returns the paths deleted. */
export const applyClean = (root, plan) => {
  const realRoot = realpathSync(root);
  const deleted = [];
  for (const c of plan.candidates) {
    try {
      if (!inside(realRoot, realpathSync(c.path))) continue;
      rmSync(c.path, { recursive: true, force: true });
      deleted.push(c.path);
    } catch {
      // gone since the plan was made: nothing to delete
    }
  }
  return deleted;
};

export const run = (root, { values }) => {
  const days = values["older-than"] ?? "30";
  if (!/^[1-9]\d*$/.test(days)) throw new UsageError(`--older-than must be a whole number of days, 1 or more (got "${days}")`);
  const plan = planClean(root, { days: Number(days) });
  const deleted = values.apply ? applyClean(root, plan) : [];
  const total = plan.candidates.reduce((n, c) => n + c.bytes, 0);
  const data = {
    apply: Boolean(values.apply),
    olderThanDays: Number(days),
    totalBytes: total,
    candidates: plan.candidates.map((c) => ({ kind: c.kind, path: rel(root, c.path), bytes: c.bytes })),
    kept: plan.kept,
    skipped: plan.skipped.map((p) => rel(root, p)),
    deleted: deleted.map((p) => rel(root, p)),
  };
  const verb = values.apply ? "deleted" : "would delete";
  const lines = [
    ...data.candidates.map((c) => `${verb}  ${fmtBytes(c.bytes).padStart(8)}  ${c.path}`),
    ...plan.kept.map((k) => `kept (${k.reason})  ${fmtBytes(k.bytes).padStart(8)}  out/videos/${k.slug}`),
    ...data.skipped.map((p) => `skipped (outside the repo)  ${p}`),
    data.candidates.length
      ? `${data.candidates.length} item(s), ${fmtBytes(total)}${values.apply ? " freed" : " (dry run: add --apply to delete)"}`
      : "nothing to clean",
  ];
  emit(values.json, data, lines);
  return OK;
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: `finhub-cli ok`

- [ ] **Step 5: Commit**

```bash
git add scripts/finhub-cli/clean.mjs scripts/check-finhub-cli.mjs
git commit -m "feat: finhub clean (allow-listed, dry run by default)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

- [ ] **Step 6: Prove the test bites (three mutations, each reverted)**

For each pair run the `sed`, expect `node scripts/check-finhub-cli.mjs` to FAIL, then `git checkout -- scripts/finhub-cli/clean.mjs`.

1. Delivery gate: `sed -i 's/!existsSync(join(dir, "team", "06_delivery.md"))/false/' scripts/finhub-cli/clean.mjs` → expected FAIL on the `kept` assertion (an undelivered render became a candidate).
2. Plan containment: `sed -i 's/if (!inside(realRoot, realpathSync(p)))/if (false)/' scripts/finhub-cli/clean.mjs` → expected FAIL on `skipped.length` (skipped when symlinks are allowed; if this machine cannot make symlinks the assertion is not reached, so run it on Linux).
3. Apply containment: `sed -i 's/if (!inside(realRoot, realpathSync(c.path))) continue;/if (false) continue;/' scripts/finhub-cli/clean.mjs` → expected FAIL on "applyClean did not follow or remove a link".

After the last revert run `git status --short scripts/finhub-cli/clean.mjs` (expect no output) and `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 1` (expect `finhub-cli ok`).

---

### Task 3: `finhub doctor`

**Files:**
- Create: `scripts/finhub-cli/doctor.mjs`
- Modify: `scripts/check-finhub-cli.mjs`

**Interfaces:**
- Consumes: `lib.mjs` (`OK`, `PROBLEM`, `emit`, `fmtBytes`); `readinessOf(root, slug): { level, items: { level: "blocked"|"warning", problem: string, fix: string }[] }` from `scripts/video-status.mjs` (called with slug `""`).
- Produces: `KEYS: string[]`; `checkDoctor(root, { env = process.env, nodeVersion = process.versions.node }): { level: "ready"|"warning"|"blocked", items, keys: { set: string[], unset: string[] }, freeBytes: number|null, chrome: string }`; `run`, `help`.

**Acceptance Criteria:**
- Node older than `package.json` `engines.node` (`>=N` form) is `blocked`; an unparsable range is a `warning`; a missing `node_modules/remotion` is `blocked`; an installed Remotion differing from the pinned `@remotion/cli` is a `warning`; free disk under 2 GB is `blocked`, under 10 GB a `warning`; `FINHUB_BROWSER` set to a missing file is a `warning`.
- Key names come from the environment and `.env`; a value (from either) never appears in text or JSON output.
- Every `process.env.<NAME>` ending `_KEY` or `_TOKEN` in `scripts/*.mjs` and `mcp/*.mjs` is in `KEYS`.
- Exit 1 only when `level` is `blocked`.

- [ ] **Step 1: Write the failing test**

Add below the other imports in `scripts/check-finhub-cli.mjs`:

```js
import { KEYS, checkDoctor, run as runDoctor } from "./finhub-cli/doctor.mjs";
```

and insert above `console.log("finhub-cli ok");`:

```js
// --- doctor
{
  const root = repoTmp("finhub-doctor-");
  const SENTINEL = "sentinel-value-123";
  writeFileSync(join(root, "package.json"), JSON.stringify({ engines: { node: ">=24" }, dependencies: { "@remotion/cli": "4.0.527" } }));
  writeFileSync(join(root, ".env"), "GEMINI_API_KEY=sekrit-from-file\nexport PEXELS_API_KEY=also-secret\nELEVENLABS_API_KEY=\n");
  const env = { FAL_KEY: SENTINEL };

  const old = checkDoctor(root, { env, nodeVersion: "20.1.0" });
  assert.equal(old.level, "blocked");
  assert.ok(old.items.some((i) => i.level === "blocked" && /engines\.node >=24/.test(i.problem)), "old Node is blocked");
  assert.ok(old.items.some((i) => i.problem === "node_modules is missing"), "missing node_modules is blocked");
  assert.deepEqual(checkDoctor(root, { env, nodeVersion: "24.1.0" }).items.filter((i) => /engines/.test(i.problem)), [], "Node 24 passes >=24");
  writeFileSync(join(root, "package.json"), JSON.stringify({ engines: { node: "^20" } }));
  assert.ok(
    checkDoctor(root, { env, nodeVersion: "24.1.0" }).items.some((i) => i.level === "warning" && /cannot parse engines/.test(i.problem)),
    "an engines range that is not >=N is a warning",
  );

  const r = checkDoctor(root, { env });
  for (const k of ["FAL_KEY", "GEMINI_API_KEY", "PEXELS_API_KEY"]) assert.ok(r.keys.set.includes(k), `${k} reported set`);
  assert.ok(r.keys.unset.includes("ELEVENLABS_API_KEY"), "an empty .env value is not set");
  for (const s of [SENTINEL, "sekrit-from-file", "also-secret"]) assert.ok(!JSON.stringify(r).includes(s), "a key value leaked into the result");

  const prev = process.env.FAL_KEY;
  process.env.FAL_KEY = SENTINEL;
  try {
    const text = capture(() => runDoctor(root, { values: {} }));
    const json = capture(() => runDoctor(root, { values: { json: true } }));
    for (const s of [SENTINEL, "sekrit-from-file", "also-secret"])
      assert.ok(!text.out.includes(s) && !json.out.includes(s), "a key value leaked into doctor output");
    assert.ok(JSON.parse(json.out).keys.set.includes("FAL_KEY"));
  } finally {
    if (prev === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = prev;
  }

  // drift guard: a script that starts reading a new key must add its name to KEYS
  const found = new Set();
  for (const d of ["scripts", "mcp"])
    for (const f of readdirSync(join(ROOT, d)))
      if (f.endsWith(".mjs"))
        for (const m of readFileSync(join(ROOT, d, f), "utf8").matchAll(/process\.env\.([A-Z0-9_]+)/g))
          if (/(_KEY|_TOKEN)$/.test(m[1])) found.add(m[1]);
  assert.deepEqual([...found].filter((k) => !KEYS.includes(k)), [], "every key the scripts read is in KEYS (scripts/finhub-cli/doctor.mjs)");

  const real = finhub(["doctor", "--json"], { FAL_KEY: SENTINEL });
  assert.ok([0, 1].includes(real.status), real.stderr);
  assert.ok(JSON.parse(real.stdout).keys.set.includes("FAL_KEY"));
  assert.ok(!real.stdout.includes(SENTINEL) && !real.stderr.includes(SENTINEL), "the real CLI never prints a key value");
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: FAIL, `Cannot find module '.../scripts/finhub-cli/doctor.mjs'`.

- [ ] **Step 3: Write `doctor.mjs`**

Create `scripts/finhub-cli/doctor.mjs`:

```js
// finhub doctor: is this PC ready to prepare and render a video? Reuses video-status.mjs's readiness
// checks (ffmpeg, Python) and adds Node against package.json engines, node_modules, the pinned Remotion,
// free disk and which API keys are set. Only key NAMES are read into the result, never a value.
import { existsSync, readFileSync, statfsSync } from "node:fs";
import { join } from "node:path";
import { readinessOf } from "../video-status.mjs";
import { OK, PROBLEM, emit, fmtBytes } from "./lib.mjs";

// Keys the scripts read (scripts/*.mjs and mcp/*.mjs are checked against this list by check-finhub-cli.mjs;
// PERPLEXITY_API_KEY is read by the Python scripts).
export const KEYS = [
  "DEEPSEEK_API_KEY",
  "ELEVENLABS_API_KEY",
  "FAL_AI_API_KEY",
  "FAL_KEY",
  "GEMINI_API_KEY",
  "MCP_TOKEN",
  "PERPLEXITY_API_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
  "REMOTION_MAPTILER_KEY",
];

export const help = `finhub doctor [--json]
  Checks Node against package.json engines, ffmpeg, Python, node_modules and the pinned Remotion,
  free disk (warns under 10 GB, blocks under 2 GB) and which API keys are set (names only).
  Exit 1 if anything blocks.`;

/** Names of the variables with a non-empty value in <root>/.env. Values are matched, never kept. */
const namesInEnvFile = (root) => {
  const p = join(root, ".env");
  if (!existsSync(p)) return new Set();
  return new Set(
    readFileSync(p, "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*\S/.exec(line);
        return m ? [m[1]] : [];
      }),
  );
};

// ponytail: only the ">=N" form of engines.node is read; anything else is a warning. Add semver if engines changes shape.
const needMajor = (range) => {
  const m = /^>=\s*(\d+)/.exec(range ?? "");
  return m ? Number(m[1]) : null;
};

export const checkDoctor = (root, { env = process.env, nodeVersion = process.versions.node } = {}) => {
  const items = readinessOf(root, "").items.filter((i) => !i.problem.startsWith("uncommitted"));
  const add = (level, problem, fix) => items.push({ level, problem, fix });
  const pkgPath = join(root, "package.json");
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : {};

  const range = pkg.engines?.node;
  const need = needMajor(range);
  if (range && need === null) add("warning", `cannot parse engines.node "${range}"`, "doctor reads only the >=N form");
  else if (need !== null && Number(nodeVersion.split(".")[0]) < need)
    add("blocked", `Node ${nodeVersion} is older than package.json engines.node ${range}`, `install Node ${need} or newer`);

  const remotionPkg = join(root, "node_modules", "remotion", "package.json");
  if (!existsSync(remotionPkg)) add("blocked", "node_modules is missing", "npm i");
  else {
    const have = JSON.parse(readFileSync(remotionPkg, "utf8")).version;
    const want = pkg.dependencies?.["@remotion/cli"];
    if (want && have !== want) add("warning", `remotion ${have} is installed, package.json pins ${want}`, "npm i");
  }

  let freeBytes = null;
  try {
    const s = statfsSync(root);
    freeBytes = s.bavail * s.bsize;
  } catch {
    // this platform cannot report free space: say so, do not guess
  }
  if (freeBytes !== null && freeBytes < 2e9) add("blocked", `only ${fmtBytes(freeBytes)} free on this drive`, "free space (finhub clean) before rendering");
  else if (freeBytes !== null && freeBytes < 10e9) add("warning", `${fmtBytes(freeBytes)} free on this drive`, "finhub clean lists what can go");

  if (env.FINHUB_BROWSER && !existsSync(env.FINHUB_BROWSER)) add("warning", "FINHUB_BROWSER is set but that file does not exist", "fix the path or unset it");

  const file = namesInEnvFile(root);
  const set = KEYS.filter((k) => env[k] || file.has(k));
  const level = items.some((i) => i.level === "blocked") ? "blocked" : items.length ? "warning" : "ready";
  return {
    level,
    items,
    keys: { set, unset: KEYS.filter((k) => !set.includes(k)) },
    freeBytes,
    chrome: "remotion-managed (downloaded on first render)",
  };
};

export const run = (root, { values }) => {
  const r = checkDoctor(root);
  const lines = [
    `doctor: ${r.level}`,
    ...r.items.map((i) => `  ${i.level}: ${i.problem} -> ${i.fix}`),
    `  node ${process.versions.node}; free disk ${r.freeBytes === null ? "unknown" : fmtBytes(r.freeBytes)}; chrome: ${r.chrome}`,
    `  keys set: ${r.keys.set.join(", ") || "none"}`,
    `  keys not set: ${r.keys.unset.join(", ") || "none"}`,
  ];
  emit(values.json, r, lines);
  return r.level === "blocked" ? PROBLEM : OK;
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: `finhub-cli ok`

Run: `node --no-warnings scripts/finhub.mjs doctor`
Expected: a `doctor: ready|warning|blocked` line, the items, a node/disk/chrome line and the two key-name lines. Note the result in the PR (this machine's output, not Daniel's PC).

- [ ] **Step 5: Commit**

```bash
git add scripts/finhub-cli/doctor.mjs scripts/check-finhub-cli.mjs
git commit -m "feat: finhub doctor (Node engines, disk, key names only)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

---

### Task 4: `finhub status`

**Files:**
- Create: `scripts/finhub-cli/status.mjs`
- Modify: `scripts/check-finhub-cli.mjs`

**Interfaces:**
- Consumes: `lib.mjs` (`OK`, `PROBLEM`, `UsageError`, `emit`, `fmtBytes`); `nextOf(root, slug)`, `readinessOf(root, slug)`, `usageOf(root, slug)` from `scripts/video-status.mjs`; `stats(lib)` from `scripts/library.mjs` (returns `{ byKind, total: { count, bytes, reuses, costAvoidedUsd } }`); `slugOk` from `scripts/listing-prep.mjs`.
- Produces: `statusData(root, slug?)`: without a slug `{ videos: ({ slug } & nextOf result)[], library: stats|null }`, with a slug `{ slug, readiness, next, usage }`; `run`, `help`.

**Acceptance Criteria:**
- `statusData(root)` lists every `out/videos/<slug>` that has a `team/` folder with its `stage`; `library` is `null` when `public/library` is absent.
- Text mode prints `video-status.mjs`'s own output (no duplicated formatting) and, without a slug, one `library:` line.
- `--json` prints one object; a bad slug exits 2.

- [ ] **Step 1: Write the failing test**

Add below the other imports in `scripts/check-finhub-cli.mjs`:

```js
import { statusData, run as runStatus } from "./finhub-cli/status.mjs";
```

and insert above `console.log("finhub-cli ok");`:

```js
// --- status
{
  const root = repoTmp("finhub-status-");
  touch(join(root, "out/videos/a/team/00_intake.md"));
  const all = statusData(root);
  assert.deepEqual(all.videos.map((v) => v.slug), ["a"]);
  assert.equal(all.videos[0].stage, "paper edit (video-story-editor)");
  assert.equal(all.library, null, "no public/library in the temp tree");
  const one = statusData(root, "a");
  assert.equal(one.slug, "a");
  assert.equal(one.next.stage, "paper edit (video-story-editor)");
  assert.equal(one.usage, null);
  assert.ok(["ready", "warning", "blocked"].includes(one.readiness.level));
  assert.throws(() => runStatus(root, { positionals: ["Bad Slug"], values: {} }), UsageError);
  const j = capture(() => runStatus(root, { positionals: [], values: { json: true } }));
  assert.equal(j.code, 0);
  assert.equal(JSON.parse(j.out).videos[0].slug, "a");
  const real = finhub(["status"]);
  assert.equal(real.status, 0, real.stderr);
  assert.match(real.stdout, /library:/);
  assert.match(finhub(["status", "--help"]).stdout, /finhub status/);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: FAIL, `Cannot find module '.../scripts/finhub-cli/status.mjs'`.

- [ ] **Step 3: Write `status.mjs`**

Create `scripts/finhub-cli/status.mjs`:

```js
// finhub status [slug]: where each video stands. Text mode runs video-status.mjs itself so the wording
// has one home; --json builds one object from the same functions it exports.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { slugOk } from "../listing-prep.mjs";
import { stats } from "../library.mjs";
import { nextOf, readinessOf, usageOf } from "../video-status.mjs";
import { OK, PROBLEM, UsageError, emit, fmtBytes } from "./lib.mjs";

export const help = `finhub status [slug] [--json]
  No slug: every video with a team run (stage and next step) and the source library totals.
  With a slug: readiness (with fixes), what is done, usage per agent, what is next.
  Read-only; the text is scripts/video-status.mjs's own output.`;

export const statusData = (root, slug) => {
  if (slug) return { slug, readiness: readinessOf(root, slug), next: nextOf(root, slug), usage: usageOf(root, slug) };
  const dir = join(root, "out", "videos");
  const slugs = existsSync(dir) ? readdirSync(dir).filter((s) => slugOk(s) && existsSync(join(dir, s, "team"))) : [];
  const lib = join(root, "public", "library");
  return { videos: slugs.map((s) => ({ ...nextOf(root, s), slug: s })), library: existsSync(lib) ? stats(lib) : null };
};

export const run = (root, { positionals: [slug, ...extra], values }) => {
  if (extra.length) throw new UsageError("usage: finhub status [slug]");
  if (slug && !slugOk(slug)) throw new UsageError(`bad slug "${slug}": lowercase letters, digits, ".", "_" or "-" only`);
  if (values.json) {
    emit(true, statusData(root, slug), []);
    return OK;
  }
  const child = spawnSync(process.execPath, ["--no-warnings", join(root, "scripts", "video-status.mjs"), ...(slug ? [slug] : [])], {
    cwd: root,
    stdio: "inherit",
  });
  if (!slug) {
    const { library } = statusData(root);
    if (library) console.log(`library: ${library.total.count} file(s), ${fmtBytes(library.total.bytes)}, ${library.total.reuses} reuse(s)`);
  }
  return child.status ?? PROBLEM;
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: `finhub-cli ok`

Run: `node --no-warnings scripts/finhub.mjs status` and `node --no-warnings scripts/finhub.mjs status --json | head -c 300`
Expected: video-status's board then a `library:` line; then a one-line JSON object starting `{"videos":`.

- [ ] **Step 5: Commit**

```bash
git add scripts/finhub-cli/status.mjs scripts/check-finhub-cli.mjs
git commit -m "feat: finhub status (video-status plus library totals, --json)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

---

### Task 5: `finhub render`

**Files:**
- Create: `scripts/finhub-cli/render.mjs`
- Modify: `scripts/check-finhub-cli.mjs`

**Interfaces:**
- Consumes: `lib.mjs` (`OK`, `PROBLEM`, `UsageError`, `emit`); `slugOk` from `scripts/listing-prep.mjs`; `scripts/render-video.py <slug>` (runs preflight, renders, stages the finished copy; exits 0/1/3); `node scripts/publish-video.mjs <slug> --inputs-hash --public-dir <dir>` (prints the current inputs hash).
- Produces: `renderArgs(root, slug): string[]`, `stillArgs(root, slug, frame): string[]`, `infoLine(stamp: string|null, hash: string|null): string|null`, `run`, `help`.

**Acceptance Criteria:**
- `render <slug>` runs `render-video.py` and returns its exit code unchanged (0, 1, 3); on any non-zero code other than 3 it prints `see: finhub status <slug>` to stderr; it never skips.
- `--still <frame>` runs the Remotion `still` for `MortgageReel` at `--scale=0.5` into `out/videos/<slug>/check-<frame>.png`; `--dry-run` prints the argument list and runs nothing (text, or `{dryRun, argv}` with `--json`).
- With `--json` and no `--dry-run`, the child's stdout goes to stderr and the one JSON object is `{ slug, argv, exitCode }`.
- Missing slug, bad slug, an extra argument or a non-numeric `--still` exits 2.

- [ ] **Step 1: Write the failing test**

Add below the other imports in `scripts/check-finhub-cli.mjs`:

```js
import { infoLine, renderArgs, stillArgs } from "./finhub-cli/render.mjs";
```

and insert above `console.log("finhub-cli ok");`:

```js
// --- render (only the pure parts and dry runs: a real render needs footage, so it is tagged "verify on PC")
{
  const still = stillArgs(ROOT, "demo", 45);
  assert.equal(still[0], process.execPath);
  for (const part of ["still", "MortgageReel", "--frame=45", "--scale=0.5", `--props=${JSON.stringify({ slug: "demo" })}`])
    assert.ok(still.includes(part), `still args include ${part}`);
  assert.ok(still.includes(join(ROOT, "out", "videos", "demo", "check-45.png")));
  assert.deepEqual(renderArgs(ROOT, "demo").slice(1), [join(ROOT, "scripts", "render-video.py"), "demo"]);

  assert.match(infoLine("abc\n", "abc"), /unchanged/);
  assert.equal(infoLine("abc", "abd"), null);
  assert.equal(infoLine("rendering", "abc"), null);
  assert.equal(infoLine(null, "abc"), null);

  const dry = finhub(["render", "demo", "--dry-run"]);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /render-video\.py demo/);
  assert.ok(!existsSync(join(ROOT, "out", "videos", "demo")), "a dry run creates nothing");
  const dryStill = JSON.parse(finhub(["render", "demo", "--still", "45", "--dry-run", "--json"]).stdout);
  assert.equal(dryStill.dryRun, true);
  assert.ok(dryStill.argv.includes("--scale=0.5"));
  for (const bad of [["render"], ["render", "Bad Slug"], ["render", "demo", "--still", "x"], ["render", "demo", "extra"]])
    assert.equal(finhub(bad).status, 2, `finhub ${bad.join(" ")} is a usage error`);
  assert.match(finhub(["render", "--help"]).stdout, /finhub render/);
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: FAIL, `Cannot find module '.../scripts/finhub-cli/render.mjs'`.

- [ ] **Step 3: Write `render.mjs`**

Create `scripts/finhub-cli/render.mjs`:

```js
// finhub render <slug>: hands the slug to scripts/render-video.py and returns its exit code. That script
// already stops on a missing cut-out, runs preflight.mjs (edit.json, check-schema, speech cuts, pacing),
// renders and stages the finished copy, so nothing is checked twice here. It never skips: the .inputs
// hash covers only edit.json, script.json and words.json, not design code, media or music.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { slugOk } from "../listing-prep.mjs";
import { OK, PROBLEM, UsageError, emit } from "./lib.mjs";

export const help = `finhub render <slug> [--still <frame>] [--dry-run] [--json]
  Runs python scripts/render-video.py <slug> (PYTHON overrides "python") and returns its exit code:
  0 done, 1 failed, 3 rendered but not published. Always renders; nothing is skipped.
  --still <frame>  one half-size frame to out/videos/<slug>/check-<frame>.png instead of the video
  --dry-run        print the command and run nothing`;

export const renderArgs = (root, slug) => [process.env.PYTHON ?? "python", join(root, "scripts", "render-video.py"), slug];

// The same Remotion call render-video.py makes for the thumbnail, at --scale=0.5.
export const stillArgs = (root, slug, frame) => [
  process.execPath,
  join(root, "node_modules", "@remotion", "cli", "remotion-cli.js"),
  "still",
  "src/index.ts",
  "MortgageReel",
  join(root, "out", "videos", slug, `check-${frame}.png`),
  `--props=${JSON.stringify({ slug })}`,
  `--frame=${frame}`,
  "--scale=0.5",
  "--gl=angle",
];

/** One line when the last render's stamp equals the current inputs hash, else null. */
export const infoLine = (stamp, hash) =>
  stamp && hash && stamp.trim() === hash.trim()
    ? "on-screen text unchanged since the last render (design, media and music changes are not tracked)"
    : null;

export const run = (root, { positionals: [slug, ...extra], values }) => {
  if (!slug || extra.length) throw new UsageError("usage: finhub render <slug> [--still <frame>] [--dry-run]");
  if (!slugOk(slug)) throw new UsageError(`bad slug "${slug}": lowercase letters, digits, ".", "_" or "-" only`);
  const still = values.still;
  if (still !== undefined && !/^\d+$/.test(still)) throw new UsageError("--still needs a whole frame number, 0 or more");
  const argv = still !== undefined ? stillArgs(root, slug, Number(still)) : renderArgs(root, slug);

  if (values["dry-run"]) {
    emit(values.json, { dryRun: true, argv }, [argv.join(" ")]);
    return OK;
  }
  if (still !== undefined) mkdirSync(join(root, "out", "videos", slug), { recursive: true });
  else {
    const stamp = join(root, "out", "videos", slug, `${slug}.inputs`);
    if (existsSync(stamp)) {
      const h = spawnSync(
        process.execPath,
        ["--no-warnings", join(root, "scripts", "publish-video.mjs"), slug, "--inputs-hash", "--public-dir", join(root, "public")],
        { cwd: root, encoding: "utf8" },
      );
      const line = infoLine(readFileSync(stamp, "utf8"), h.status === 0 ? h.stdout : null);
      if (line) console.error(line);
    }
  }
  // --json keeps stdout for the one object: the child's output goes to stderr instead.
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, stdio: values.json ? ["inherit", 2, "inherit"] : "inherit" });
  if (r.error) console.error(r.error.message);
  const code = r.status ?? PROBLEM;
  if (code !== 0 && code !== 3) console.error(`see: finhub status ${slug}`);
  if (values.json) emit(true, { slug, argv, exitCode: code }, []);
  return code;
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node scripts/check-finhub-cli.mjs 2>&1 | tail -n 4`
Expected: `finhub-cli ok`

Run: `node --no-warnings scripts/finhub.mjs render demo --dry-run`
Expected: one line: `python <repo>/scripts/render-video.py demo`.

- [ ] **Step 5: Commit**

```bash
git add scripts/finhub-cli/render.mjs scripts/check-finhub-cli.mjs
git commit -m "feat: finhub render (pass-through, --still, --dry-run)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
```

---

### Task 6: AGENTS.md line, full gates, PR

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the pushed branch and a draft pull request.

**Acceptance Criteria:**
- `AGENTS.md` "Commands" lists `npm run finhub -- ...` with its four commands.
- `npm test`, `npm run lint` and `node scripts/check-scripts-index.mjs` pass; the CLI help, `doctor`, `status`, `clean` (dry run) and `render demo --dry-run` all run on this machine.
- The PR is a draft, lists what was verified in the cloud and what is `verify on PC`, and this session is subscribed to it.

- [ ] **Step 1: Add the AGENTS.md line**

Edit `AGENTS.md`: after the line beginning `npm run mcp           # the repo's MCP server (stdio)` (inside the same code block) add:

```console
npm run finhub -- doctor   # one command over the scripts: doctor | status [slug] | render <slug> [--still <n>] | clean [--apply]; each takes --json (scripts/README.md, "One command: finhub")
```

- [ ] **Step 2: Run the repo's gates**

Run: `npm test 2>&1 | tail -n 6`
Expected: exit 0, ending with the `text size ok` line. If `preflight` reports `check-schema could not run` (no `remotion.media` in the cloud) the same SKIPPED line appears on `main`; confirm with `git stash -q && npm test 2>&1 | tail -n 3; git stash pop -q` only if it looks new.

Run: `npm run lint 2>&1 | tail -n 3`
Expected: no errors.

Run: `node scripts/check-scripts-index.mjs`
Expected: `scripts index ok`

- [ ] **Step 3: Smoke the real commands**

Run each and read the output:

```bash
npm run --silent finhub -- --help
npm run --silent finhub -- doctor
npm run --silent finhub -- status
npm run --silent finhub -- clean
npm run --silent finhub -- render demo --dry-run
npm run --silent finhub -- clean --older-than 0; echo "exit $?"
```

Expected: help lists four commands; `doctor` prints a level and key names (no values); `status` prints the board and a `library:` line; `clean` prints `nothing to clean` (or a dry-run list) and deletes nothing; the render dry run prints one command line; the last command prints a usage error and `exit 2`.

- [ ] **Step 4: Commit, push, open the draft PR**

```bash
git add AGENTS.md
git commit -m "docs: finhub CLI in AGENTS.md" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K7KgF4fw1gRKSEHodyRyPq"
git push -u origin claude/hopeful-bardeen-tqxm7d
```

Open a draft PR to `main` (GitHub MCP `create_pull_request`, `draft: true`) titled `feat: finhub CLI (doctor, status, render, clean)`. Body: what it adds, what each command does, the safety rules of `clean` (allow-list, delivery gate, containment), "Verified (cloud)": `npm test`, `npm run lint`, the smoke commands above; "Verify on PC": a real `finhub render <slug>` and `--still`, `npm link` giving a bare `finhub` on Windows, `doctor` on a machine without ffmpeg, `clean` on real renders. End the body with the PR attribution lines from the session's reminder. Then subscribe to the PR (`subscribe_pr_activity`).

---

## Self-review

**Spec coverage** (each spec requirement maps to a task):

| Spec requirement | Task |
|---|---|
| One `finhub` command, `bin`, npm script with `--no-warnings`, `npm link` note | 1 |
| `parseArgs` dispatcher, `--help` per command, exit codes 0/1/2/3, `--json` contract | 1 (dispatcher, `emit`), 2-5 (each command) |
| Slug via `slugOk`, children without a shell, key names only | 4, 5 (`slugOk`, `spawnSync` arrays), 3 (names only) |
| `doctor`: readiness reuse, Node vs `engines.node`, node_modules/Remotion pin, disk, key names, `FINHUB_BROWSER`, Chrome note, exit 1 only when blocked | 3 |
| `status [slug]`: board plus library, slug detail, `--json`, reuse of `nextOf`/`readinessOf`/`usageOf`/`stats` | 4 |
| `render`: pass-through, exit-code passthrough, info line, no skip/`--force`, `--still` at 0.5, `--dry-run` | 5 |
| `clean`: dry run default, `--older-than` >= 1, allow-list, delivery gate, `unfinishedRender`, `kept` list, `realpath` containment, temp 6 h | 2 |
| Tests listed in the spec's Testing section, drift guard, mutation proof | 1-5 (each task's test), 2 step 6 (mutations) |
| Docs: README rows, AGENTS.md line | 1, 6 |
| Out of scope (library/overlay/listing, completions, prompts, publish, cache) | not built, deliberately |
| `verify on PC` list | 6 (PR body) |

No requirement is without a task and none was cut silently.

**Placeholder scan:** none of "TBD", "TODO", "implement later", "similar to Task N" appear; every code step has the code.

**Type consistency:** `lib.mjs` exports (`OK`, `PROBLEM`, `USAGE`, `UsageError`, `emit`, `fmtBytes`, `rel`, `inside`) are the only names later modules import; `planClean` and `applyClean` signatures in Task 2's Interfaces match their use in the Task 2 test; `checkDoctor`, `KEYS`, `statusData`, `stillArgs`, `renderArgs`, `infoLine` are named identically where defined and where tested; every command module exports `help` and `run(root, { positionals, values })` as the dispatcher expects.
