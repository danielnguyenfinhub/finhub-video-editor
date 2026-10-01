// Self-test for scripts/preflight.mjs on a fixture video in a temp public dir (--public-dir):
// pacing "auto" blocks on preflight's own check; a schema-invalid edit.json blocks through
// check-schema and through check-pacing crashing (it used to print "preflight: OK"); gaps
// alone (check-pacing exit 2) only warn. Needs ffmpeg for a 3 s silent source.mp4.
// check-schema needs a browser (Remotion downloads one). When the browser cannot run (offline,
// download refused, or it drops mid-call as on GitHub's Windows runner: "Target closed") preflight
// WARNS and goes on, because the render checks the same schema; the cases that need check-schema's
// own schema text print SKIPPED and are not counted as passed, and the run says INCOMPLETE. Under
// CI that adds a GitHub warning annotation but does not fail the job.
//   node scripts/check-preflight.mjs -> "preflight checks ok", exit 1 on failure.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoTmp } from "./tmp-dir.mjs";

const slug = "_test-preflight-fixture";
const pub = repoTmp("preflight-"), dir = join(pub, "videos", slug);
const skipped = [];
mkdirSync(dir, { recursive: true });
try {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=108x192:r=30:d=3",
    "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "3", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", join(dir, "source.mp4")]);
  // Six words over 2.3 s, then silence: no speech is cut, and nothing changes on screen.
  writeFileSync(join(dir, "words.json"), JSON.stringify(Array.from({ length: 6 }, (_, i) => (
    { text: ` từ${"abcdef"[i]}`, startMs: i * 400, endMs: i * 400 + 300, timestampMs: null, confidence: 1 }))));
  const preflight = (edit) => {
    writeFileSync(join(dir, "edit.json"), JSON.stringify({ title: "Thử", background: "vignette", ...edit }));
    return spawnSync(process.execPath, ["--no-warnings", join(import.meta.dirname, "preflight.mjs"), slug, "--public-dir", pub], { encoding: "utf8" });
  };
  // check-schema's own lines when it found a schema error; the browser-failure warning when it could not run.
  const schemaLines = (r) => r.stderr.match(/check-schema failed[\s\S]*?(?=\npreflight: |$)/)?.[0] ?? "";
  const noBrowser = (r) => /preflight warning: check-schema could not run/.test(r.stdout);
  const skip = (what, r) => {
    skipped.push(what);
    console.log(`SKIPPED (not passed): ${what}: ${r.stdout.split("\n").find((l) => /check-schema could not run/.test(l)) ?? "check-schema could not run"}`);
  };

  let r = preflight({ pacing: { mode: "auto" } });
  assert.equal(r.status, 1, "pacing auto must block");
  assert.match(r.stderr, /pacing is \{"mode":"auto"\}/);

  // A wrong type the schema rejects; preflight's own checks do not look at "design", check-pacing's schema does.
  r = preflight({ pacing: { mode: "off" }, design: 42 });
  assert.equal(r.status, 1, `a schema-invalid edit.json must block, got:\n${r.stdout}${r.stderr}`);
  assert.match(r.stderr, /at design/, `the block must name the field (check-pacing does, with no browser), got:\n${r.stderr}`);
  // The field is named by check-pacing (no browser), so the block itself is proved above and below. check-schema's
  // own words are a bonus: when its browser dropped mid-call ("Target closed") they never arrive, which is SKIPPED, not a pass.
  if (noBrowser(r) || (!/design/.test(schemaLines(r)) && /Target closed|Protocol error|Failed to launch/i.test(schemaLines(r))))
    skip("check-schema reports the bad design in its own words", r);
  else assert.match(schemaLines(r), /design/, `check-schema must name the schema error, got:\n${r.stderr}`);
  assert.match(r.stderr, /check-pacing could not run[\s\S]*design/, "a check-pacing crash blocks");

  // Valid, but a long talk with no visuals: check-pacing exits 2, a warning, not a crash.
  writeFileSync(join(dir, "words.json"), JSON.stringify(Array.from({ length: 30 }, (_, i) => (
    { text: ` từ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`, startMs: i * 300, endMs: i * 300 + 250, timestampMs: null, confidence: 1 }))));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=108x192:r=30:d=10",
    "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "10", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", join(dir, "source.mp4")]);
  r = preflight({ pacing: { mode: "off" } });
  assert.match(r.stdout, /preflight warning: pacing: gaps/, `gaps must warn:\n${r.stdout}${r.stderr}`);
  assert.doesNotMatch(r.stderr, /check-pacing could not run|speech cut/);
  // How each kind of check-schema failure is classified, with stand-in scripts (so it holds without a browser):
  // a browser that drops mid-call (GitHub's Windows runner: "Target closed") or cannot be downloaded only
  // warns and the render goes on; a zod error blocks and says why; a clean run is plain OK.
  const stub = (name, body) => {
    const path = join(pub, `${name}.mjs`);
    writeFileSync(path, body);
    return path;
  };
  const withStub = (path, edit) => {
    process.env.PREFLIGHT_CHECK_SCHEMA = path;
    try {
      return preflight(edit);
    } finally {
      delete process.env.PREFLIGHT_CHECK_SCHEMA;
    }
  };
  const ok = { pacing: { mode: "off" } };
  r = withStub(stub("closed", 'console.error("Error: ProtocolError: Protocol error (Target.closeTarget): Target closed.");process.exit(1);'), ok);
  assert.equal(r.status, 0, `a dropped browser must not block a valid video:\n${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /preflight warning: check-schema could not run \(.*Target closed/, "and it must say so");
  r = withStub(stub("zod", 'console.error("Error: edit.json is invalid:\\n  ✖ Invalid input: expected string, received number\\n    → at design");process.exit(1);'), ok);
  assert.equal(r.status, 1, "a schema error must block");
  assert.match(r.stderr, /check-schema failed[\s\S]*at design/, "and name the field");
  r = withStub(stub("download", 'console.error("Error: Received a status code of 403 while downloading file https://example/chromium.zip");process.exit(1);'), ok);
  assert.equal(r.status, 0, "a refused browser download only warns");
  r = withStub(stub("clean", 'console.log("MortgageReel x: 90 frames");'), ok);
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /check-schema could not run/, "a clean run has no warning");

  // A valid video passes whether or not check-schema's browser could run (then it only warns).
  assert.equal(r.status, 0, `a valid edit.json must pass preflight, got:\n${r.stdout}${r.stderr}`);
  if (noBrowser(r)) skip("check-schema accepts a valid edit.json", r);
} finally {
  rmSync(pub, { recursive: true, force: true });
}
if (!skipped.length) console.log("preflight checks ok");
else {
  // Never starts with the ok line: a log search for it must not count a run with skipped cases as a pass.
  console.log(`preflight checks INCOMPLETE: ${skipped.length} SKIPPED (check-schema's browser could not run, so nothing was proved for): ${skipped.join("; ")}`);
  if (process.env.GITHUB_ACTIONS) console.log("::warning title=check-preflight::check-schema's browser could not run on this runner, so its own schema text was not checked; preflight warned and went on (see the SKIPPED lines).");
}
