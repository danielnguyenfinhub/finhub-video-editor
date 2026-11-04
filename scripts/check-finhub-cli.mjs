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

console.log("finhub-cli ok");
