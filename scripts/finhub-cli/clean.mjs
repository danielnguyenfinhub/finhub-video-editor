// finhub clean: list, and with --apply delete, files that can be regenerated. Only the allow-list below
// is ever a candidate; recordings, public/library, finished videos, edit.json and team ledgers are out
// of reach even with --apply. Every candidate must resolve inside the repo root (a symlink out is skipped).
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { slugOk } from "../listing-prep.mjs";
import { unfinishedRender } from "../publish-video.mjs";
import { OK, UsageError, emit, fmtBytes, inside, rel } from "./lib.mjs";

const DAY = 86_400_000;
const TEMP_MIN_AGE_MS = 6 * 3_600_000; // tmp-dir.mjs prunes crashed runs after the same 6 h

export const help = `finhub clean [--apply] [--older-than <days>] [--json]
  Dry run unless --apply. Only these can be deleted:
    node_modules/.cache/finhub-tmp/<folder>   untouched for 6 h
    out/videos/<slug>/team/qc/sweep/          QC frames
    out/videos/<slug>/ render files           mp4, mobile, feed, thumbnail, srt, inputs of a delivered
                                              video (team/06_delivery.md), finished, older than
                                              --older-than days (whole number >= 1, default 30)
  Undelivered or unfinished renders are listed as kept. Recordings, the library, finished videos and
  ledgers are never touched.`;

const bytesOf = (p) => {
  const st = lstatSync(p);
  return st.isDirectory() ? readdirSync(p).reduce((n, name) => n + bytesOf(join(p, name)), 0) : st.size;
};
const mtime = (p) => lstatSync(p).mtimeMs;

/** What clean would delete and what it keeps. Touches nothing. */
export const planClean = (root, { days = 30, now = Date.now() } = {}) => {
  const realRoot = realpathSync(root);
  const candidates = [];
  const kept = [];
  const skipped = [];
  const add = (kind, p) => {
    if (!inside(realRoot, realpathSync(p))) return void skipped.push(p);
    candidates.push({ kind, path: p, bytes: bytesOf(p) });
  };

  const tmp = join(root, "node_modules", ".cache", "finhub-tmp");
  if (existsSync(tmp))
    for (const name of readdirSync(tmp)) if (now - mtime(join(tmp, name)) > TEMP_MIN_AGE_MS) add("temp", join(tmp, name));

  const videos = join(root, "out", "videos");
  if (!existsSync(videos)) return { candidates, kept, skipped };
  for (const slug of readdirSync(videos)) {
    if (!slugOk(slug)) continue;
    const dir = join(videos, slug);
    const sweep = join(dir, "team", "qc", "sweep");
    if (existsSync(sweep)) add("sweep", sweep);
    const files = [`${slug}.mp4`, `${slug}-mobile.mp4`, `${slug}-feed.mp4`, "thumbnail.png", `${slug}.srt`, `${slug}.inputs`]
      .map((f) => join(dir, f))
      .filter((f) => existsSync(f));
    if (!files.length) continue;
    const reason = !existsSync(join(dir, "team", "06_delivery.md"))
      ? "not delivered"
      : unfinishedRender(join(dir, `${slug}.mp4`))
        ? "render unfinished"
        : now - Math.max(...files.map(mtime)) <= days * DAY
          ? "too new"
          : null;
    if (reason) kept.push({ slug, reason, bytes: files.reduce((n, f) => n + bytesOf(f), 0) });
    else for (const f of files) add("render", f);
  }
  return { candidates, kept, skipped };
};

/** Deletes the plan's candidates; each is re-checked to still sit inside the root. Returns the paths deleted. */
export const applyClean = (root, plan) => {
  const realRoot = realpathSync(root);
  const deleted = [];
  for (const c of plan.candidates) {
    try {
      if (!inside(realRoot, realpathSync(c.path))) continue;
      rmSync(c.path, { recursive: true, force: true });
      deleted.push(c.path);
    } catch {
      // gone since the plan was made: nothing to delete
    }
  }
  return deleted;
};

export const run = (root, { values }) => {
  const days = values["older-than"] ?? "30";
  if (!/^[1-9]\d*$/.test(days)) throw new UsageError(`--older-than must be a whole number of days, 1 or more (got "${days}")`);
  const plan = planClean(root, { days: Number(days) });
  const deleted = values.apply ? applyClean(root, plan) : [];
  const total = plan.candidates.reduce((n, c) => n + c.bytes, 0);
  const data = {
    apply: Boolean(values.apply),
    olderThanDays: Number(days),
    totalBytes: total,
    candidates: plan.candidates.map((c) => ({ kind: c.kind, path: rel(root, c.path), bytes: c.bytes })),
    kept: plan.kept,
    skipped: plan.skipped.map((p) => rel(root, p)),
    deleted: deleted.map((p) => rel(root, p)),
  };
  const verb = values.apply ? "deleted" : "would delete";
  const lines = [
    ...data.candidates.map((c) => `${verb}  ${fmtBytes(c.bytes).padStart(8)}  ${c.path}`),
    ...plan.kept.map((k) => `kept (${k.reason})  ${fmtBytes(k.bytes).padStart(8)}  out/videos/${k.slug}`),
    ...data.skipped.map((p) => `skipped (outside the repo)  ${p}`),
    data.candidates.length
      ? `${data.candidates.length} item(s), ${fmtBytes(total)}${values.apply ? " freed" : " (dry run: add --apply to delete)"}`
      : "nothing to clean",
  ];
  emit(values.json, data, lines);
  return OK;
};
