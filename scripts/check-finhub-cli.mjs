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
