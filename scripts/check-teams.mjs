// Checks the agent teams are wired: every design (src/designs, src/youtube/designs) and the
// listing reel belongs to exactly one team in config/style-teams.json; each team's director
// agent and recipe exist; every agent a team skill names exists; every agent file has the
// frontmatter Claude Code needs. Run: node scripts/check-teams.mjs (exit 1 and the problems).
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
  const fm = readFileSync(at(".claude/agents", f), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  for (const key of ["name", "description", "tools", "model"]) {
    if (!new RegExp(`^${key}:`, "m").test(fm)) problems.push(`.claude/agents/${f}: frontmatter lacks ${key}`);
  }
  if (!new RegExp(`^name: ${f.replace(/\.md$/, "")}$`, "m").test(fm)) problems.push(`.claude/agents/${f}: name differs from the file name`);
}

// Each team skill lists its agents as `agent-name` in backticks inside its "## The team" table.
const TEAM_SKILLS = ["repo-build-team", "repo-maintenance-team", "dev-efficiency-team", "style-production-teams"];
for (const skill of TEAM_SKILLS) {
  const path = at(".claude/skills", skill, "SKILL.md");
  if (!existsSync(path)) { problems.push(`missing skill ${skill}`); continue; }
  const table = readFileSync(path, "utf8").split(/^## /m).find((s) => s.startsWith("The team")) ?? "";
  const named = [...table.matchAll(/^\| `([a-z0-9-]+)`/gm)].map((m) => m[1]);
  if (!named.length) problems.push(`${skill}: "The team" table names no agents`);
  for (const a of named) if (!agents.has(a)) problems.push(`${skill}: names agent ${a}, which has no file`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`teams ok: ${real.size} styles in ${Object.keys(teams).length} teams, ${agents.size} agents`);
