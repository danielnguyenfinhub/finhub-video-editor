// Self-test for scripts/preflight.mjs on a fixture video in a temp public dir (--public-dir):
// pacing "auto" blocks on preflight's own check; a schema-invalid edit.json blocks through
// check-schema and through check-pacing crashing (it used to print "preflight: OK"); gaps
// alone (check-pacing exit 2) only warn. Needs ffmpeg for a 3 s silent source.mp4.
// check-schema needs a browser (Remotion downloads one). Where it cannot start one (offline,
// download refused) the cases that need it print SKIPPED and are not counted as passed; the
// run still exits 0 so npm test works offline, except under CI (env CI), where a skip fails.
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
  // preflight's check-schema lines, up to its next problem.
  const schemaLines = (r) => r.stderr.match(/check-schema failed[\s\S]*?(?=\npreflight: |$)/)?.[0] ?? "";
  const noBrowser = (r) => /chrom|browser|headless/i.test(schemaLines(r));
  const skip = (what, r) => {
    skipped.push(what);
    console.log(`SKIPPED (not passed): ${what}: check-schema could not start a browser:\n  ${schemaLines(r).split("\n").slice(1, 2).join("").trim()}`);
  };

  let r = preflight({ pacing: { mode: "auto" } });
  assert.equal(r.status, 1, "pacing auto must block");
  assert.match(r.stderr, /pacing is \{"mode":"auto"\}/);

  // A wrong type the schema rejects; preflight's own checks do not look at "design".
  r = preflight({ pacing: { mode: "off" }, design: 42 });
  assert.equal(r.status, 1, `a schema-invalid edit.json must block, got:\n${r.stdout}${r.stderr}`);
  if (noBrowser(r)) skip("check-schema reports the bad design", r);
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
  if (noBrowser(r)) skip("a valid edit.json passes preflight", r);
  else assert.equal(r.status, 0, `a valid edit.json must pass preflight, got:\n${r.stdout}${r.stderr}`);
} finally {
  rmSync(pub, { recursive: true, force: true });
}
if (!skipped.length) console.log("preflight checks ok");
else {
  // Never starts with the ok line: a log search for it must not count a run with skipped cases as a pass.
  console.log(`preflight checks INCOMPLETE: ${skipped.length} SKIPPED (no browser for check-schema, so nothing was proved for): ${skipped.join("; ")}`);
  if (/^(1|true|yes)$/i.test(process.env.CI ?? "")) {
    console.error("check-preflight: in CI the check-schema cases must run, and the browser Remotion needs could not be started (see the check-schema error above, usually a failed download). Re-run the job once; if it fails again, fix the browser download rather than skipping this check.");
    process.exit(1);
  }
}
