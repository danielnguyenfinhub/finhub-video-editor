// The video-production-team run as a Ralph loop (github.com/snarktank/ralph): each round is
// a fresh `claude -p` that does ONE stage, and the state lives on disk in
// out/videos/<slug>/team/ (the files the team already writes), so a round never inherits a
// long context and a run survives closed sessions. Unlike Ralph, this script decides what is
// done by reading the files itself (an agent's "done" is not trusted), stops at every one of
// Daniel's gates instead of bypassing permissions, and caps each round's spend.
//
//   node scripts/video-loop.mjs <slug>                 what's done, what's next (no tokens)
//   node scripts/video-loop.mjs <slug> --run [--max 8] [--budget 5]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

const promptFor = (slug, stage) => `Use the video-production-team skill for the video "${slug}".
Run ONLY this stage, then stop: ${stage}.
Read out/videos/${slug}/team/ first; it is the whole state of the run. If the stage's last
report says FIX, send the findings to their owner and re-run the reviewer (one round).
Follow AGENTS.md "Corrections": apply matching entries in references/corrections.md, and log
any new lesson (technical -> landmines.md, quality -> corrections.md).
Never write 02_script_lock.md, never make a paid call beyond the cost in 00_intake.md or
02_script_lock.md, never move Daniel's footage. If the stage needs Daniel, write why in the
stage's team file and stop.`;

// Tools a round may use without asking; anything else is denied, which ends the round.
const ALLOWED = ["Read", "Write", "Edit", "Grep", "Glob", "Agent", "Skill", "Bash(node:*)",
  "Bash(python:*)", "Bash(npx remotion:*)", "Bash(ffprobe:*)", "Bash(ffmpeg:*)",
  "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)"];

const main = () => {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--") && !/^\d/.test(a));
  const opt = (name, dflt) => {
    const i = args.indexOf(name);
    return i >= 0 ? Number(args[i + 1]) : dflt;
  };
  if (!slug) {
    console.log("usage: node scripts/video-loop.mjs <slug> [--run] [--max 8] [--budget 5]");
    process.exit(2);
  }
  const root = join(import.meta.dirname, "..");
  const max = opt("--max", 8);
  const budget = opt("--budget", 5);
  let tries = 0;
  let last = null;

  for (let round = 1; ; round++) {
    const n = nextOf(root, slug);
    console.log(`${slug} (pipeline ${n.pipeline}) done: ${n.done.join(", ") || "nothing yet"}`);
    if (!n.stage) return console.log("COMPLETE");
    if (n.halt?.gate) return console.log(`WAITING for Daniel: ${n.halt.gate}`);
    if (n.halt?.stop) {
      console.log(`STOPPED: ${n.halt.stop}`);
      process.exit(1);
    }
    console.log(`next: ${n.stage}`);
    if (!args.includes("--run")) return;
    // Two rounds on one stage is the team's FIX-loop limit; then Daniel looks.
    tries = n.stage === last ? tries + 1 : 1;
    last = n.stage;
    if (tries > 2) {
      console.log(`STOPPED: "${n.stage}" did not pass in 2 rounds; open findings are in out/videos/${slug}/team/`);
      process.exit(1);
    }
    if (round > max) {
      console.log(`STOPPED: ${max} rounds used; run again to continue`);
      process.exit(1);
    }
    console.log(`round ${round}/${max}: fresh claude -p, US$${budget} cap`);
    const r = spawnSync("claude", ["-p", "--permission-mode", "acceptEdits", "--max-budget-usd", String(budget),
      "--allowedTools", ...ALLOWED], { cwd: root, input: promptFor(slug, n.stage), stdio: ["pipe", "inherit", "inherit"] });
    if (r.error) {
      console.log(`STOPPED: could not start claude (${r.error.message})`);
      process.exit(1);
    }
    if (r.status !== 0) console.log(`round ${round} exited ${r.status}; checking the files anyway`);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
