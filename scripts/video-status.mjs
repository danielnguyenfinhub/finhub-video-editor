// Where each video's team run stands, read from the files the video-production-team writes
// in out/videos/<slug>/team/ (so any session can resume a run without re-reading it), plus
// a readiness check before spending tokens. Nothing here calls Claude or changes a file.
//
//   node scripts/video-status.mjs            every video: where it stands
//   node scripts/video-status.mjs <slug>     readiness (with fixes), what's done, what's next
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

// A stage's check returns true (done), false (the next round does it), or
// { gate } (Daniel decides; the loop stops) / { stop } (blocked; the loop stops).
const verdictOf = (file, what) => {
  const j = readJson(file);
  if (!j) return false;
  if (j.verdict === "PASS") return true;
  if (j.verdict === "BLOCK") return { stop: `${what} BLOCK: see ${file}` };
  return false; // FIX: the next round sends the findings to their owner and re-checks
};

export const stagesFor = (root, slug) => {
  const team = (f) => join(root, "out/videos", slug, "team", f);
  const video = (f) => join(root, "public/videos", slug, f);
  const has = (p) => existsSync(p);
  const edit = readJson(video("edit.json")) ?? {};
  const pipeline = has(video("script.json")) ? "B" : "A";
  const build = { id: "build (video-editor)", done: () => readJson(team("03_editor_report.json"))?.status === "success" };
  const qcStills = { id: "QC stills (video-qc)", done: () => verdictOf(team("04_qc_stills.json"), "QC") };
  const render = { id: "render (video-editor A7.1 / B5.4)", done: () => has(join(root, "out/videos", slug, `${slug}.mp4`)) };
  const ends = [
    { id: "deliver (06_delivery.md)", done: () => has(team("06_delivery.md")) },
    { id: "Daniel's approval", done: () => ({ gate: "Ready: Daniel watches it and approves before posting" }) },
  ];
  const intake = { id: "intake (0.1-0.5)", done: () => has(team("00_intake.md")) };

  if (pipeline === "B") {
    return { pipeline, stages: [
      intake,
      { id: "script (video-script-writer)", done: () => has(team("01_writer_notes.md")) },
      { id: "compliance, script", done: () => verdictOf(team("02_compliance_script.json"), "Compliance") },
      { id: "script lock (B2.5)", done: () => has(team("02_script_lock.md")) || { gate: "Daniel approves each scene's VI/EN words and the cost (B2.5)" } },
      { id: "voice (B3)", done: () => has(video("words.json")) },
      build,
      qcStills,
      { id: "compliance, final", done: () => verdictOf(team("04_compliance_final.json"), "Compliance") },
      render,
      ...ends,
    ] };
  }
  const matte = join(root, "public/recordings", edit.source ?? slug, "foreground.webm");
  return { pipeline, stages: [
    intake,
    { id: "paper edit (video-story-editor)", done: () => {
      const s = readJson(team("01_story_edit.json"));
      if (!s) return false;
      if (s.status === "blocked") return { stop: `paper edit blocked: ${s.summary ?? "see 01_story_edit.json"}` };
      if (s.flags?.length) return { gate: `Daniel decides ${s.flags.length} flagged spot(s) in 01_story_edit.json (cut or re-record)` };
      return s.status === "ok";
    } },
    build,
    qcStills,
    { id: "compliance, final (if run)", done: () => !has(team("04_compliance_final.json")) || verdictOf(team("04_compliance_final.json"), "Compliance") },
    { id: "matte (Daniel starts it)", done: () => edit.background === "vignette" || has(matte) || { gate: `no cut-out yet (${matte}): Daniel starts the matte, or opts into quick mode` } },
    render,
    { id: "QC render (video-qc)", done: () => verdictOf(team("05_qc_render.json"), "QC render") },
    ...ends,
  ] };
};

// The first stage not done: { pipeline, done: [ids], stage, halt }.
export const nextOf = (root, slug) => {
  const { pipeline, stages } = stagesFor(root, slug);
  const done = [];
  for (const stage of stages) {
    const r = stage.done();
    if (r === true) {
      done.push(stage.id);
      continue;
    }
    return { pipeline, done, stage: stage.id, halt: r || null };
  }
  return { pipeline, done, stage: null, halt: null };
};

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", timeout: 30000, ...opts });

// Readiness before spending tokens (idea from HKUDS/OpenHarness): static checks only, each
// with the shortest fix. blocked = the run would fail; warning = it may stop early.
export const readinessOf = (root, slug) => {
  const items = [];
  const add = (level, problem, fix) => items.push({ level, problem, fix });
  if (run("ffmpeg", ["-version"]).error) add("blocked", "ffmpeg is missing (prep and render need it)", "install ffmpeg and add it to PATH");
  if (run("python", ["--version"]).error) add("warning", "python is missing (prep, render and voicing scripts)", "install Python 3");
  if (run("git", ["status", "--porcelain"], { cwd: root }).stdout.trim())
    add("warning", "uncommitted changes (the team's intake stops on them)", "commit them, or tell Claude to go ahead");
  const edit = readJson(join(root, "public/videos", slug, "edit.json"));
  const pipeline = existsSync(join(root, "public/videos", slug, "script.json")) ? "B" : "A";
  if (pipeline === "A" && edit) {
    const src = join(root, "public/recordings", edit.source ?? slug, "source.mp4");
    if (!existsSync(src)) add("blocked", `the prepared recording is missing (${relative(root, src)})`, "prepare the recording again (runbook A1.1)");
  }
  if (edit && run(process.execPath, [join(root, "scripts/preflight.mjs"), slug], { cwd: root }).status !== 0)
    add("blocked", "preflight finds problems in edit.json", `run: node scripts/preflight.mjs ${slug}`);
  const level = items.some((i) => i.level === "blocked") ? "blocked" : items.length ? "warning" : "ready";
  return { level, items };
};

// Every video with a team run, one line each (idea from HKUDS/OpenHarness).
const board = (root) => {
  const dir = join(root, "out/videos");
  const slugs = existsSync(dir) ? readdirSync(dir).filter((s) => existsSync(join(dir, s, "team"))) : [];
  if (!slugs.length) return console.log("No team runs yet.");
  for (const s of slugs) {
    const n = nextOf(root, s);
    const state = !n.stage ? "complete" : n.halt?.gate ? `WAITING: ${n.halt.gate}` : n.halt?.stop ? `STOPPED: ${n.halt.stop}` : `next: ${n.stage}`;
    console.log(`${s.padEnd(22)} ${n.pipeline}  ${n.done.length} done  ${state}`);
  }
};


const main = () => {
  const root = join(import.meta.dirname, "..");
  const slug = process.argv[2];
  if (!slug) return board(root);
  const ready = readinessOf(root, slug);
  console.log(`readiness: ${ready.level}`);
  for (const i of ready.items) console.log(`  ${i.level}: ${i.problem} -> ${i.fix}`);
  const n = nextOf(root, slug);
  console.log(`${slug} (pipeline ${n.pipeline}) done: ${n.done.join(", ") || "nothing yet"}`);
  if (!n.stage) console.log("COMPLETE");
  else if (n.halt?.gate) console.log(`WAITING for Daniel: ${n.halt.gate}`);
  else if (n.halt?.stop) console.log(`STOPPED: ${n.halt.stop}`);
  else console.log(`next: ${n.stage}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
