// Self-test for the finhub CLI (scripts/finhub.mjs and scripts/finhub-cli/): the dispatcher's exit
// codes and help, and each command on a temp tree (never the real repo's out/ or public/).
//   node scripts/check-finhub-cli.mjs -> "finhub-cli ok"
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoTmp } from "./tmp-dir.mjs";
import { applyClean, planClean, run as runClean } from "./finhub-cli/clean.mjs";
import { UsageError, rel } from "./finhub-cli/lib.mjs";
import { KEYS, checkDoctor, run as runDoctor } from "./finhub-cli/doctor.mjs";
import { statusData, run as runStatus } from "./finhub-cli/status.mjs";
import { infoLine, renderArgs, stillArgs } from "./finhub-cli/render.mjs";
import { passthroughArgv } from "./finhub-cli/passthrough.mjs";

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
for (const c of ["doctor", "status", "render", "clean", "library", "overlay", "listing"]) assert.match(help.stdout, new RegExp(`\\b${c}\\b`), `--help names ${c}`);
assert.equal(finhub([]).status, 2, "no command is a usage error");
assert.equal(finhub(["nope"]).status, 2, "unknown command");
assert.match(finhub(["nope"]).stderr, /unknown command "nope"/);
assert.equal(finhub(["clean", "--bogus"]).status, 2, "unknown option");

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
    const stillLink = (() => {
      try {
        return lstatSync(link).isSymbolicLink();
      } catch {
        return false; // the link itself was removed
      }
    })();
    assert.ok(stillLink, "applyClean left the symlink out of the root alone");
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

console.log("finhub-cli ok");
