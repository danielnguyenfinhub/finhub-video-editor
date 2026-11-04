// finhub status [slug]: where each video stands. Text mode runs video-status.mjs itself so the wording
// has one home; --json builds one object from the same functions it exports.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { slugOk } from "../listing-prep.mjs";
import { stats } from "../library.mjs";
import { nextOf, readinessOf, usageOf } from "../video-status.mjs";
import { OK, PROBLEM, UsageError, emit, fmtBytes } from "./lib.mjs";

export const help = `finhub status [slug] [--json]
  No slug: every video with a team run (stage and next step) and the source library totals.
  With a slug: readiness (with fixes), what is done, usage per agent, what is next.
  Read-only; the text is scripts/video-status.mjs's own output.`;

export const statusData = (root, slug) => {
  if (slug) return { slug, readiness: readinessOf(root, slug), next: nextOf(root, slug), usage: usageOf(root, slug) };
  const dir = join(root, "out", "videos");
  const slugs = existsSync(dir) ? readdirSync(dir).filter((s) => slugOk(s) && existsSync(join(dir, s, "team"))) : [];
  const lib = join(root, "public", "library");
  return { videos: slugs.map((s) => ({ ...nextOf(root, s), slug: s })), library: existsSync(lib) ? stats(lib) : null };
};

export const run = (root, { positionals: [slug, ...extra], values }) => {
  if (extra.length) throw new UsageError("usage: finhub status [slug]");
  if (slug && !slugOk(slug)) throw new UsageError(`bad slug "${slug}": lowercase letters, digits, ".", "_" or "-" only`);
  if (values.json) {
    emit(true, statusData(root, slug), []);
    return OK;
  }
  const child = spawnSync(process.execPath, ["--no-warnings", join(root, "scripts", "video-status.mjs"), ...(slug ? [slug] : [])], {
    cwd: root,
    stdio: "inherit",
  });
  if (!slug) {
    const { library } = statusData(root);
    if (library) console.log(`library: ${library.total.count} file(s), ${fmtBytes(library.total.bytes)}, ${library.total.reuses} reuse(s)`);
  }
  return child.status ?? PROBLEM;
};
