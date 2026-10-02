// Checks the agent teams are wired: every design (src/designs, src/youtube/designs) and the
// listing reel belongs to exactly one team in config/style-teams.json; each team's director
// agent and recipe exist; every agent a team skill names exists; every agent file has the
// frontmatter Claude Code needs; the AGENTS.md read-list byte counts are within 15%; only the last
// docs/agents/team-runs.md row may be "in progress" / "pending". Run: node scripts/check-teams.mjs (exit 1 and the problems).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const at = (...p) => join(root, ...p);
const problems = [];

const dirsWith = (dir, file) =>
  existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, file))) : [];
const ytIds = [...readFileSync(at("src/youtube/designs/index.ts"), "utf8").matchAll(/^\s{2}(\w+),$/gm)].map((m) => m[1]);
const real = new Set([...dirsWith(at("src/designs"), "template.json"), ...ytIds, "ListingReel"]);

const { teams } = JSON.parse(readFileSync(at("config/style-teams.json"), "utf8"));
const owner = new Map();
for (const [team, t] of Object.entries(teams)) {
  for (const s of t.styles) {
    if (owner.has(s)) problems.push(`style ${s} is in two teams: ${owner.get(s)} and ${team}`);
    owner.set(s, team);
    if (!real.has(s)) problems.push(`team ${team} lists ${s}, which is not a design in the repo`);
  }
  if (!existsSync(at(".claude/agents", `${t.director}.md`))) problems.push(`team ${team}: no agent file for ${t.director}`);
  if (!existsSync(at(".claude/skills/style-production-teams/references", t.recipe))) problems.push(`team ${team}: no recipe ${t.recipe}`);
}
for (const s of real) if (!owner.has(s)) problems.push(`style ${s} is in no team`);

const agentFiles = readdirSync(at(".claude/agents")).filter((f) => f.endsWith(".md"));
const agents = new Set(agentFiles.map((f) => f.replace(/\.md$/, "")));
for (const f of agentFiles) {
  const fm = readFileSync(at(".claude/agents", f), "utf8").replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  for (const key of ["name", "description", "tools", "model"]) {
    if (!new RegExp(`^${key}:`, "m").test(fm)) problems.push(`.claude/agents/${f}: frontmatter lacks ${key}`);
  }
  if (!new RegExp(`^name: ${f.replace(/\.md$/, "")}$`, "m").test(fm)) problems.push(`.claude/agents/${f}: name differs from the file name`);
}

// Each team skill lists its agents as `agent-name` in backticks inside its "## The team" table.
const TEAM_SKILLS = ["repo-build-team", "repo-maintenance-team", "dev-efficiency-team", "style-production-teams", "template-improvement-team"];
for (const skill of TEAM_SKILLS) {
  const path = at(".claude/skills", skill, "SKILL.md");
  if (!existsSync(path)) { problems.push(`missing skill ${skill}`); continue; }
  const table = readFileSync(path, "utf8").replace(/\r\n/g, "\n").split(/^## /m).find((s) => s.startsWith("The team")) ?? "";
  const named = [...table.matchAll(/^\| `([a-z0-9-]+)`/gm)].map((m) => m[1]);
  if (!named.length) problems.push(`${skill}: "The team" table names no agents`);
  for (const a of named) if (!agents.has(a)) problems.push(`${skill}: names agent ${a}, which has no file`);
}

// AGENTS.md "Read list per task" table: each row's Bytes must match the files it lists within 15%,
// so the token budget an agent plans with stays honest. "+X = Y" is X over the row above, Y in total.
const REFS = ".claude/skills/vietnamese-finance-video-editor/references/";
const readBytes = (cell) => {
  const files = [...cell.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const [, t] of cell.matchAll(/`([^`]+)`/g)) {
    if (t.startsWith("refs/")) files.push(REFS + t.slice(5));
    else if (t.startsWith(".claude/")) files.push(t);
    else if (t === "SKILL.md") files.push(".claude/skills/vietnamese-finance-video-editor/SKILL.md"); // "editor `SKILL.md`"
    else if (t === "video-*") files.push(...agentFiles.filter((f) => f.startsWith("video-")).map((f) => `.claude/agents/${f}`));
    else if (existsSync(at(".claude/skills", t, "SKILL.md"))) files.push(`.claude/skills/${t}/SKILL.md`);
    else problems.push(`AGENTS.md read list: cannot resolve \`${t}\` to a file`);
  }
  let n = 0;
  for (const f of files) existsSync(at(f)) ? (n += readFileSync(at(f)).toString("latin1").replace(/\r\n/g, "\n").length) : problems.push(`AGENTS.md read list: ${f} does not exist`);
  if (cell.includes("remocn index")) n += Buffer.byteLength(readFileSync(at(".claude/elements/remocn/CATALOG.md"), "utf8").split("\n").slice(0, 22).join("\n") + "\n");
  return n;
};
const agentsMd = readFileSync(at("AGENTS.md"), "utf8").replace(/\r\n/g, "\n");
const rows = (agentsMd.split("| Task | Files | Bytes |\n")[1] ?? "").split("\n\n")[0].split("\n").filter((l) => /^\|[^-]/.test(l));
if (!rows.length) problems.push('AGENTS.md: no "| Task | Files | Bytes |" read-list table');
let prev = 0;
for (const row of rows) {
  const [, task, filesCell, bytesCell] = row.split("|").map((c) => c.trim());
  const [stated, statedTotal] = (bytesCell.match(/\d[\d,]*/g) ?? []).map((x) => Number(x.replace(/,/g, "")));
  const real = readBytes(filesCell);
  const off = (want, got) => Math.abs(got - want) > 0.15 * got;
  const fmt = (x) => x.toLocaleString("en-US");
  if (bytesCell.startsWith("+")) {
    if (off(stated, real) || off(statedTotal, prev + real))
      problems.push(`AGENTS.md read list "${task}": says ${bytesCell}, files measure +${fmt(real)} = ${fmt(prev + real)}`);
  } else if (off(stated, real)) problems.push(`AGENTS.md read list "${task}": says ${bytesCell}, files measure ${fmt(real)}`);
  prev = real;
}

// docs/agents/team-runs.md: only the last row (the run now in progress) may still say
// "in progress" in Outcome or "pending" in PR; every older row must have been closed.
const runRows = readFileSync(at("docs/agents/team-runs.md"), "utf8").replace(/\r\n/g, "\n")
  .split("\n").filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l));
if (!runRows.length) problems.push("docs/agents/team-runs.md: no run rows");
runRows.slice(0, -1).forEach((row) => {
  const [, date, team, , outcome, pr] = row.split("|").map((c) => c.trim());
  if (/in progress/i.test(outcome) || /pending/i.test(pr))
    problems.push(`docs/agents/team-runs.md: ${date} ${team} is not the last row but its outcome or PR is still open ("${outcome}" | "${pr}"): fill it in`);
});

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`teams ok: ${real.size} styles in ${Object.keys(teams).length} teams, ${agents.size} agents`);
