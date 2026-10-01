// What this machine can do, found once per team run (Phase 0) instead of by every agent:
// node/npm/python versions, ffmpeg/ffprobe/python on PATH, an installed headless shell,
// whether the documented still probe renders (only with --probe: about 20 s; otherwise
// "not probed"), whether remotion.media and fonts.gstatic.com answer from Node (HEAD, 3 s;
// "unreachable" is a normal result), recordings present, git depth and CI. Free, no Claude.
// Prints the facts and writes out/teams/sandbox-facts.md.
//   node scripts/sandbox-facts.mjs [--probe]    node scripts/sandbox-facts.mjs --selftest
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
const win = process.platform === "win32";
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", cwd: ROOT, timeout: 10_000, shell: win && cmd === "npm", ...opts });
const out = (cmd, args) => {
  const r = run(cmd, args);
  return r.error || r.status !== 0 ? null : `${r.stdout}${r.stderr}`.trim().split("\n")[0];
};
const dirs = (p) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);

// The Playwright headless shell the probe and FINHUB_BROWSER use (docs/agents/rendering-without-gpu.md).
const headlessShell = () => {
  const base = "/opt/pw-browsers";
  for (const v of dirs(base).filter((d) => d.startsWith("chromium_headless_shell-")))
    for (const sub of dirs(join(base, v)))
      if (existsSync(join(base, v, sub, "headless_shell"))) return join(base, v, sub, "headless_shell");
  return null;
};

const reach = async (host) => {
  try {
    const r = await fetch(`https://${host}/`, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    return r.status === 403 || r.status === 407 ? `refused (HTTP ${r.status})` : `reachable (HTTP ${r.status})`;
  } catch (err) {
    return `unreachable (${err.cause?.code ?? err.name})`;
  }
};

const probe = (shell) => {
  if (!shell) return "not run: no headless shell";
  const start = Date.now();
  const r = run(process.execPath, [join(ROOT, "node_modules/@remotion/cli/remotion-cli.js"), "still", "src/index.ts", "ElementCatalog",
    "out/stills/probe.png", "--frame=30", "--scale=0.5", "--gl=swangle", "--chrome-mode=headless-shell", `--browser-executable=${shell}`], { timeout: 300_000 });
  const s = ((Date.now() - start) / 1000).toFixed(1);
  return /Rendered 1\/1/.test(`${r.stdout}${r.stderr}`) ? `renders (Rendered 1/1 in ${s} s, out/stills/probe.png)`
    : `fails (${r.error?.code ?? `exit ${r.status}`}): ${`${r.stderr}${r.stdout}`.trim().split("\n").filter(Boolean).at(-1) ?? ""}`.slice(0, 300);
};

export const gather = async ({ withProbe = false } = {}) => {
  const engines = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).engines?.node ?? "";
  const want = Number(/\d+/.exec(engines)?.[0] ?? 0), major = Number(process.versions.node.split(".")[0]);
  const shell = headlessShell();
  const recordings = join(ROOT, "public", "recordings"), videos = join(ROOT, "public", "videos");
  const sources = [...dirs(recordings).map((d) => join(recordings, d)), ...dirs(videos).map((d) => join(videos, d))]
    .filter((d) => existsSync(join(d, "source.mp4"))).length;
  const [remotionMedia, fontsGstatic] = await Promise.all([reach("remotion.media"), reach("fonts.gstatic.com")]);
  const shallow = out("git", ["rev-parse", "--is-shallow-repository"]);
  return {
    node: `${process.version} (engines ${engines || "unset"}: ${major >= want ? "ok" : "older"})`,
    npm: out("npm", ["-v"]),
    python: out("python", ["--version"]),
    python3: out("python3", ["--version"]),
    ffmpeg: out("ffmpeg", ["-version"])?.split(" ").slice(0, 3).join(" ") ?? null,
    ffprobe: out("ffprobe", ["-version"])?.split(" ").slice(0, 3).join(" ") ?? null,
    headlessShell: shell,
    stillProbe: withProbe ? probe(shell) : "not probed (run with --probe)",
    remotionMedia, fontsGstatic,
    recordings: dirs(recordings).length,
    sourceMp4: sources,
    teamRuns: dirs(join(ROOT, "out", "videos")).length,
    git: shallow === null ? "not a git checkout" : `${shallow === "true" ? "shallow" : "full"}, ${out("git", ["rev-list", "--count", "HEAD"])} commits`,
    ci: ["CI", "GITHUB_ACTIONS", "CLAUDE_CODE_REMOTE"].filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`).join(", ") || "none",
  };
};

// Pure: facts -> the markdown file.
export const formatFacts = (f, date = new Date().toISOString().slice(0, 16).replace("T", " ")) => {
  const has = (v) => v ?? "missing";
  const rows = [
    ["Node", f.node], ["npm", has(f.npm)], ["python", has(f.python)], ["python3", has(f.python3)],
    ["ffmpeg", has(f.ffmpeg)], ["ffprobe", has(f.ffprobe)],
    ["Headless shell", f.headlessShell ? `${f.headlessShell} (check-schema: FINHUB_BROWSER=<it> FINHUB_GL=swangle)` : "none"],
    ["Still probe (ElementCatalog)", f.stillProbe],
    ["remotion.media from Node", f.remotionMedia], ["fonts.gstatic.com from Node", f.fontsGstatic],
    ["public/recordings folders", f.recordings], ["source.mp4 files", f.sourceMp4], ["out/videos runs", f.teamRuns],
    ["git", f.git], ["CI env", f.ci],
  ];
  return [
    `# Sandbox facts (${date} UTC, scripts/sandbox-facts.mjs)`, "", "| Fact | Value |", "|---|---|",
    ...rows.map(([k, v]) => `| ${k} | ${String(v).replace(/\|/g, "\\|")} |`), "",
    "Static limits (Chromium version, WebGL cap, what the render browser cannot fetch): docs/agents/rendering-without-gpu.md.", "",
  ].join("\n");
};

const selftest = () => {
  const facts = { node: "v24.1.0 (engines >=24: ok)", npm: "10.9.4", python: null, python3: "Python 3.11.15", ffmpeg: "ffmpeg version 6.1",
    ffprobe: null, headlessShell: null, stillProbe: "not probed (run with --probe)", remotionMedia: "refused (HTTP 403)",
    fontsGstatic: "unreachable (ETIMEDOUT)", recordings: 0, sourceMp4: 0, teamRuns: 2, git: "shallow, 1 commits", ci: "a|b" };
  const md = formatFacts(facts, "2026-10-02 00:00");
  assert.match(md, /^# Sandbox facts \(2026-10-02 00:00 UTC/);
  assert.match(md, /^\| python \| missing \|$/m, "a missing tool says missing");
  assert.match(md, /^\| ffprobe \| missing \|$/m);
  assert.match(md, /^\| Headless shell \| none \|$/m);
  assert.match(md, /^\| Still probe \(ElementCatalog\) \| not probed/m);
  assert.match(md, /^\| fonts\.gstatic\.com from Node \| unreachable \(ETIMEDOUT\) \|$/m);
  assert.match(md, /^\| source\.mp4 files \| 0 \|$/m, "0 is a value, not missing");
  assert.match(md, /^\| CI env \| a\\\|b \|$/m, "a pipe cannot break the table");
  assert.match(formatFacts({ ...facts, headlessShell: "/x/headless_shell" }), /\| \/x\/headless_shell \(check-schema: FINHUB_BROWSER/);
  console.log("sandbox-facts ok");
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--selftest")) selftest();
  else {
    const md = formatFacts(await gather({ withProbe: process.argv.includes("--probe") }));
    mkdirSync(join(ROOT, "out", "teams"), { recursive: true });
    writeFileSync(join(ROOT, "out", "teams", "sandbox-facts.md"), md);
    console.log(`${md}\nWrote out/teams/sandbox-facts.md`);
  }
}
