// Self-check for script./video-status.mjs on synthetic runs in a temp folder: the next stage,
// the gates and the stops come out right for both pipelines. Run: node scripts/check-video-status.mjs
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { dirname, join } from "node:path";
import { nextOf, readinessOf } from "./video-status.mjs";

const root = repoTmp("video-status-");
const put = (p, body) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), typeof body === "string" ? body : JSON.stringify(body));
};
const next = (slug) => nextOf(root, slug);

// Pipeline A
assert.equal(next("a").stage, "intake (0.1-0.5)");
put("out/videos/a/team/00_intake.md", "A");
assert.equal(next("a").stage, "paper edit (video-story-editor)");
put("out/videos/a/team/01_story_edit.json", { status: "ok", flags: [{ atMs: 1 }] });
assert.match(next("a").halt.gate, /1 flagged spot/);
put("out/videos/a/team/01_story_edit.json", { status: "ok", flags: [] });
assert.equal(next("a").stage, "build (video-editor)");
put("out/videos/a/team/03_editor_report.json", { status: "success" });
put("out/videos/a/team/04_qc_stills.json", { verdict: "FIX" });
assert.equal(next("a").stage, "QC stills (video-qc)");
assert.equal(next("a").halt, null);
put("out/videos/a/team/04_qc_stills.json", { verdict: "BLOCK" });
assert.match(next("a").halt.stop, /QC BLOCK/);
put("out/videos/a/team/04_qc_stills.json", { verdict: "PASS" });
put("public/videos/a/edit.json", { source: "rec-1" });
assert.match(next("a").halt.gate, /no cut-out/);
put("public/recordings/rec-1/foreground.webm", "x");
assert.equal(next("a").stage, "render (video-editor A7.1 / B5.4)");
put("out/videos/a/a.mp4", "x");
put("out/videos/a/team/05_qc_render.json", { verdict: "PASS" });
put("out/videos/a/team/06_delivery.md", "list");
assert.match(next("a").halt.gate, /approves before posting/);

// Quick mode needs no cut-out
put("public/videos/q/edit.json", { background: "vignette" });
put("out/videos/q/team/00_intake.md", "A");
put("out/videos/q/team/01_story_edit.json", { status: "ok", flags: [] });
put("out/videos/q/team/03_editor_report.json", { status: "success" });
put("out/videos/q/team/04_qc_stills.json", { verdict: "PASS" });
assert.equal(next("q").stage, "render (video-editor A7.1 / B5.4)");

// Pipeline B: the loop never passes the script lock on its own
put("public/videos/b/script.json", {});
put("out/videos/b/team/00_intake.md", "B");
put("out/videos/b/team/01_writer_notes.md", "notes");
assert.equal(next("b").pipeline, "B");
assert.equal(next("b").stage, "compliance, script");
put("out/videos/b/team/02_compliance_script.json", { verdict: "PASS" });
assert.match(next("b").halt.gate, /B2.5/);
put("out/videos/b/team/02_script_lock.md", "approved");
assert.equal(next("b").stage, "voice (B3)");
put("public/videos/b/words.json", []);
assert.equal(next("b").stage, "build (video-editor)");

// Readiness names what preflight found, not "edit.json" for every failure (a stand-in preflight).
put("scripts/preflight.mjs", 'console.error("preflight: check-speech-cuts could not run, so the speech cuts are unchecked: no source.mp4.");\nconsole.error("preflight: 1 problem(s); nothing was rendered.");\nprocess.exit(1);\n');
const pre = readinessOf(root, "q").items.find((i) => i.problem.startsWith("preflight"));
assert.equal(pre?.level, "blocked");
assert.match(pre.problem, /^preflight: check-speech-cuts could not run/);
assert.doesNotMatch(pre.problem, /edit\.json|nothing was rendered/);

console.log("video-status ok (pipeline A, quick mode, pipeline B, readiness)");
