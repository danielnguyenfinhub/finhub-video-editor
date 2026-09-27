// The video-production-team run as a Ralph loop (github.com/snarktank/ralph): each round is
// a fresh `claude -p` that does ONE stage, and the state lives on disk in
// out/videos/<slug>/team/ (the files the team already writes), so a round never inherits a
// long context and a run survives closed sessions. Unlike Ralph, this script decides what is
// done by reading the files itself (an agent's "done" is not trusted), stops at every one of
// Daniel's gates instead of bypassing permissions, and caps each round's spend.
//
//   node scripts/video-loop.mjs                        every video: where it stands
//   node scripts/video-loop.mjs <slug>                 readiness, what's done, what's next (no tokens)
//   node scripts/video-loop.mjs <slug> --run [--max 8] [--budget 5]
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
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

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", timeout: 30000, ...opts });

// Readiness before spending tokens (OpenHarness's dry-run idea): static checks only, each
// with the shortest fix. blocked = a round would fail; warning = it may stop early.
export const readinessOf = (root, slug) => {
  const items = [];
  const add = (level, problem, fix) => items.push({ level, problem, fix });
  const auth = run("claude", ["auth", "status"]);
  if (auth.error) add("blocked", "Claude Code is not installed on this PC's PATH", "install Claude Code");
  else if (!/"loggedIn":\s*true/.test(auth.stdout)) add("blocked", "Claude Code is not logged in", "run: claude auth login");
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

// Every video with a team run, one line each (OpenHarness's autopilot board, as text).
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

// One line per round in team/loop.log (OpenHarness's journal): when, what, how it ended.
const journal = (root, slug, line) => {
  const when = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
  appendFileSync(join(root, "out/videos", slug, "team", "loop.log"), `${when}  ${line}\n`);
};

const main = () => {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--") && !/^\d/.test(a));
  const opt = (name, dflt) => {
    const i = args.indexOf(name);
    return i >= 0 ? Number(args[i + 1]) : dflt;
  };
  const root = join(import.meta.dirname, "..");
  if (!slug) return board(root);
  const max = opt("--max", 8);
  const budget = opt("--budget", 5);
  let tries = 0;
  let last = null;

  const ready = readinessOf(root, slug);
  console.log(`readiness: ${ready.level}`);
  for (const i of ready.items) console.log(`  ${i.level}: ${i.problem} -> ${i.fix}`);

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
    if (ready.level === "blocked") {
      console.log("STOPPED: fix the blocked items above first; no tokens were spent");
      process.exit(1);
    }
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
    const after = nextOf(root, slug);
    journal(root, slug, `round ${round}: ${n.stage} -> exit ${r.status}; now ${after.stage ?? "complete"}${after.halt ? " (halted)" : ""}`);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
