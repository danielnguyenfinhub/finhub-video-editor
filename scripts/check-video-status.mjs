// Self-check for script./video-status.mjs on synthetic runs in a temp folder: the next stage,
// the gates and the stops come out right for both pipelines. Run: node scripts/check-video-status.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { dirname, join } from "node:path";
import { nextOf, preflightTimeoutMs, readinessOf } from "./video-status.mjs";

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

// C8: no "source" (like bank-test): the cut-out and recording are the slug's own, public/videos/<slug>/ (recordingPath).
put("public/videos/n/edit.json", {});
for (const [f, body] of [["00_intake.md", "A"], ["01_story_edit.json", { status: "ok", flags: [] }], ["03_editor_report.json", { status: "success" }], ["04_qc_stills.json", { verdict: "PASS" }]])
  put(`out/videos/n/team/${f}`, body);
assert.match(next("n").halt.gate, /public[\\/]videos[\\/]n[\\/]foreground\.webm/);
put("public/videos/n/foreground.webm", "x");
assert.equal(next("n").stage, "render (video-editor A7.1 / B5.4)");

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

// S4 (run 4): the stops and gates no case reached. Pipeline B's final compliance is not optional.
put("out/videos/b/team/03_editor_report.json", { status: "success" });
put("out/videos/b/team/04_qc_stills.json", { verdict: "PASS" });
assert.equal(next("b").stage, "compliance, final");
put("out/videos/b/team/04_compliance_final.json", { verdict: "BLOCK" });
assert.match(next("b").halt?.stop ?? "", /Compliance BLOCK/);
// Pipeline A: a blocked paper edit stops; a final compliance BLOCK stops; so does a QC render BLOCK.
put("public/videos/c/edit.json", { background: "vignette" });
put("out/videos/c/team/00_intake.md", "A");
put("out/videos/c/team/01_story_edit.json", { status: "blocked", summary: "no usable take" });
assert.match(next("c").halt?.stop ?? "", /paper edit blocked: no usable take/);
put("out/videos/c/team/01_story_edit.json", { status: "ok", flags: [] });
put("out/videos/c/team/03_editor_report.json", { status: "success" });
put("out/videos/c/team/04_qc_stills.json", { verdict: "PASS" });
put("out/videos/c/team/04_compliance_final.json", { verdict: "BLOCK" });
assert.match(next("c").halt?.stop ?? "", /Compliance BLOCK/);
put("out/videos/c/team/04_compliance_final.json", { verdict: "PASS" });
put("out/videos/c/c.mp4", "x");
put("out/videos/c/team/05_qc_render.json", { verdict: "BLOCK" });
assert.match(next("c").halt?.stop ?? "", /QC render BLOCK/);

// Readiness names what preflight found, not "edit.json" for every failure (a stand-in preflight).
put("scripts/preflight.mjs", 'console.error("preflight: check-speech-cuts could not run, so the speech cuts are unchecked: no source.mp4.");\nconsole.error("preflight: 1 problem(s); nothing was rendered.");\nprocess.exit(1);\n');
const pre = readinessOf(root, "q").items.find((i) => i.problem.startsWith("preflight"));
assert.equal(pre?.level, "blocked");
assert.match(pre.problem, /^preflight: check-speech-cuts could not run/);
assert.doesNotMatch(pre.problem, /edit\.json|nothing was rendered/);
const missing = (slug) => readinessOf(root, slug).items.find((i) => i.problem.startsWith("the prepared recording"))?.problem;
assert.match(missing("n"), /\(public[\\/]videos[\\/]n[\\/]source\.mp4\)/, "C8: no source: the slug's own folder");
assert.match(missing("a"), /\(public[\\/]recordings[\\/]rec-1[\\/]source\.mp4\)/, "source: the shared recording");

// W3 (run 4): readiness waits longer than preflight lets check-schema run, or a valid slow video reads "blocked: ETIMEDOUT".
const schemaS = Number(/^const SCHEMA_TIMEOUT_S = (\d+);/m.exec(readFileSync(join(import.meta.dirname, "preflight.mjs"), "utf8"))[1]);
assert.ok(preflightTimeoutMs() >= (schemaS + 60) * 1000, `readiness waits ${preflightTimeoutMs()} ms; preflight gives check-schema ${schemaS} s`);
assert.match(readinessOf.toString(), /preflight\.mjs"\), slug\], \{ cwd: root, timeout: preflightTimeoutMs\(\) \}/, "readiness must use preflightTimeoutMs");

console.log("video-status ok (pipeline A, quick mode, pipeline B, readiness)");
