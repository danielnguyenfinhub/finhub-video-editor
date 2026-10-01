// Report only: which promoted designs changed after the commit that promoted them.
//   node scripts/report-promotion-drift.mjs   -> one line per promoted design; exit 0, writes nothing
// The anchor is the commit that set template.json's current "promoted" value (git log -S), not the
// date. Later commits to src/designs/<id>/ (template.json and preview.png aside) are listed with
// their subjects. Shared code (src/mortgage/) also changes the look and is not counted. A shallow
// clone (CI) or no git says "no history" instead of failing. promote-design.mjs <id> on Daniel's
// PC moves the anchor.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");

/** "sha subject" lines (git log --format="%h %s") as [{sha, subject}]. */
export const parseLog = (text) =>
  text.split("\n").filter((l) => l.trim()).map((l) => {
    const [sha, ...subject] = l.trim().split(" ");
    return { sha, subject: subject.join(" ") };
  });

/** One design's report. anchor: the promoting commit's full sha, or null; boundary: the shallow clone's cut-off shas. */
export const driftLine = ({ id, promoted, anchor, commits, boundary = [] }) => {
  if (!anchor || boundary.includes(anchor))
    return `${id}: promoted ${promoted}; no history ${boundary.length ? "(shallow clone: git fetch --unshallow)" : "(the promoting commit is not in this checkout)"}`;
  if (!commits.length) return `${id}: unchanged since promotion (${anchor.slice(0, 7)}, ${promoted})`;
  return `${id}: changed since promotion (${anchor.slice(0, 7)}, ${promoted}), ${commits.length} commit(s):\n` +
    commits.map((c) => `    ${c.sha} ${c.subject}`).join("\n");
};

/** The shallow clone's cut-off shas from `git rev-parse --git-path shallow`, which is absolute in a linked worktree. */
export const shallowBoundary = (root, gitPath) => {
  const file = resolve(root, gitPath);
  return existsSync(file) ? readFileSync(file, "utf8").split(/\s+/).filter(Boolean) : [];
};

const main = () => {
  const git = (...args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  const inside = git("rev-parse", "--is-inside-work-tree");
  if (inside.error || inside.status !== 0) return console.log("promotion drift: no history (not a git checkout).");
  const boundary = shallowBoundary(ROOT, git("rev-parse", "--git-path", "shallow").stdout.trim());
  const designs = join(ROOT, "src", "designs");
  let drifted = 0;
  for (const id of readdirSync(designs).sort()) {
    const manifest = join(designs, id, "template.json");
    if (!existsSync(manifest)) continue;
    const { promoted } = JSON.parse(readFileSync(manifest, "utf8"));
    if (!promoted) continue;
    const anchor = git("log", "-1", "--format=%H", `-S"promoted": ${JSON.stringify(promoted)}`, "--", `src/designs/${id}/template.json`).stdout.trim() || null;
    const commits = anchor && !boundary.includes(anchor)
      ? parseLog(git("log", "--format=%h %s", `${anchor}..HEAD`, "--", `src/designs/${id}`,
        `:(exclude)src/designs/${id}/template.json`, `:(exclude)src/designs/${id}/preview.png`).stdout)
      : [];
    if (commits.length) drifted++;
    console.log(driftLine({ id, promoted, anchor, commits, boundary }));
  }
  console.log(`promotion drift: ${drifted} promoted design(s) changed since promotion (design folders only; src/mortgage/ not counted). Report only.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
