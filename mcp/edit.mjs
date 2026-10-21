// The edit tool's work (mcp/finhub-video-server.mjs loads this lazily: the Railway image has no
// src/ or esbuild). Reads public/videos/<slug>/edit.json and words.json, applies set/unset/append
// ops, validates with the schema the render uses (src/mortgage/schema.ts) and builds the preview
// Daniel confirms. Saving is the review page's convention (review/server.ts saveEdit): the old file
// becomes edit.json.bak; here the new one is written to .tmp and renamed, so a crash never leaves half a file.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { bundleTs, repoTmp } from "../scripts/tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const VIDEOS = join(PUBLIC, "videos");

// schema.ts imports "./timeline" without an extension, which Node's type stripping can't load:
// bundle it once per process, as check-numbers-kit.mjs does.
let schema;
const editSchema = () =>
  (schema ??= (async () => {
    const dir = repoTmp("mcp-schema-");
    bundleTs(["src/mortgage/schema.ts"], { logLevel: "warning", outdir: dir });
    return (await import(pathToFileURL(join(dir, "schema.mjs")).href)).editSchema;
  })());

// Inside public/ after symlinks are followed, so a linked edit.json or words.json can't reach other files.
const inside = (p, dir) => realpathSync(p).startsWith(realpathSync(dir) + sep);
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const short = (v) => (v === undefined ? "(none)" : JSON.stringify(v).slice(0, 200));

const read = (slug) => {
  const file = join(VIDEOS, slug, "edit.json");
  if (!existsSync(file)) throw new Error(`public/videos/${slug}/edit.json doesn't exist: prep the video first`);
  if (!inside(file, VIDEOS)) throw new Error(`public/videos/${slug}/edit.json points outside public/videos`);
  const raw = readFileSync(file, "utf8");
  return { file, raw, json: JSON.parse(raw), sha: sha(raw) };
};

const readWords = async (slug, source) => {
  const { recordingPath } = await import(pathToFileURL(join(ROOT, "src", "mortgage", "recording.ts")).href);
  const p = join(PUBLIC, recordingPath(slug, source, "words.json"));
  if (!existsSync(p) || !inside(p, PUBLIC)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
};
const norm = (s) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const said = (words, a, b) => words.filter((w) => w.endMs > a && w.startMs < b).map((w) => w.text.trim()).join(" ");

export const get = (slug, fields) => {
  const { file, json, sha: s } = read(slug);
  const pick = fields?.length ? Object.fromEntries(fields.filter((f) => Object.hasOwn(json, f)).map((f) => [f, json[f]])) : json;
  return `edit.json ${slug} @ ${s} (.bak: ${existsSync(`${file}.bak`) ? "yes" : "no"})\n${JSON.stringify(pick, null, 1).slice(0, 60_000)}`;
};

// Source ms, ready for remove, captionFixes or cues. "x " marks a word a remove span already cuts.
export const words = async (slug, { find, fromMs, toMs }) => {
  const { json } = read(slug);
  const all = await readWords(slug, json.source);
  if (!all) throw new Error(`no words.json for ${slug}: prep the video first`);
  const cut = (w) => (json.remove ?? []).some(([a, b]) => w.startMs >= a && w.endMs <= b);
  const line = (w) => `${cut(w) ? "x " : ""}${w.startMs}-${w.endMs} ${w.text.trim()}`;
  if (find) {
    const want = find.split(/\s+/).map(norm).filter(Boolean);
    const hits = [];
    for (let i = 0; want.length && i + want.length <= all.length && hits.length < 20; i++)
      if (want.every((t, j) => norm(all[i + j].text) === t)) {
        const end = all[i + want.length - 1];
        hits.push(`${cut(all[i]) ? "x " : ""}${all[i].startMs}-${end.endMs}  …${said(all.slice(Math.max(0, i - 5), i + want.length + 5), 0, Infinity)}…`);
      }
    return hits.length ? hits.join("\n") : `"${find}" isn't in words.json`;
  }
  if (fromMs === undefined || toMs === undefined) throw new Error("words needs find, or fromMs and toMs");
  return all.filter((w) => w.endMs > fromMs && w.startMs < toMs).slice(0, 300).map(line).join("\n") || "no words there";
};

// set / unset / append on a dot path (hook.big, cues.2.toMs). Missing parents are created ({} or [] by
// the next key); the strict schema then refuses anything the render doesn't know.
const apply = (json, ops) => {
  const out = structuredClone(json);
  ops.forEach(({ op, path, value }, i) => {
    const keys = path.split(".");
    let at = out;
    for (const [j, k] of keys.slice(0, -1).entries()) {
      if (!Object.hasOwn(at, k) || typeof at[k] !== "object" || at[k] === null) {
        if (op === "unset") throw new Error(`op ${i}: ${path} doesn't exist`);
        at[k] = /^\d+$/.test(keys[j + 1]) ? [] : {};
      }
      at = at[k];
    }
    const last = keys.at(-1);
    if (op === "set") at[last] = value;
    else if (op === "unset") {
      if (!Object.hasOwn(at, last)) throw new Error(`op ${i}: ${path} doesn't exist`);
      if (Array.isArray(at)) at.splice(Number(last), 1);
      else delete at[last];
    } else {
      at[last] ??= [];
      if (!Array.isArray(at[last])) throw new Error(`op ${i}: ${path} is not a list`);
      at[last].push(value);
    }
  });
  return out;
};
const valueAt = (json, path) => path.split(".").reduce((v, k) => (v != null && Object.hasOwn(v, k) ? v[k] : undefined), json);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const validate = async (next) => {
  const r = (await editSchema()).safeParse(next);
  if (!r.success) throw new Error(`not saved, edit.json would be invalid:\n${r.error.issues.map((i) => `${i.path.join(".") || "(top level)"}: ${i.message}`).join("\n")}`);
};

// What the new version changes, and what Daniel has to say yes to by name (his meaning, his look, compliance).
const review = async (slug, cur, next) => {
  const yes = [];
  if (next.background === "vignette" && cur.background !== "vignette") yes.push("background becomes vignette (Daniel opts in to this one)");
  for (const k of ["compliance", "exemptions"]) if (!same(cur[k], next[k])) yes.push(`${k} changes`);
  const lines = [];
  const added = (next.remove ?? []).filter((s) => !(cur.remove ?? []).some((t) => same(s, t)));
  if (added.length) {
    const all = await readWords(slug, next.source);
    for (const [a, b] of added) {
      const text = all ? said(all, a, b) : "(no words.json)";
      lines.push(`cut ${a}-${b} drops: "${text}"`);
      if (/\d/.test(text)) yes.push(`the cut at ${a}-${b} drops a spoken number: "${text}"`);
    }
  }
  for (const f of (next.captionFixes ?? []).filter((f) => !(cur.captionFixes ?? []).some((g) => same(f, g))))
    if (f.from.replace(/\D/g, "") !== f.to.replace(/\D/g, "")) yes.push(`caption fix "${f.from}" -> "${f.to}" changes a number`);
  return { lines, yes };
};

const plan = async (slug, cur, next, diff, body = `${JSON.stringify(next, null, 2)}\n`) => {
  if (same(cur.json, next)) throw new Error("no change: edit.json would stay the same");
  if (!same(cur.json.source, next.source)) throw new Error("source is set by prep (the recording), not by edit");
  // As preflight: auto pacing shifts Daniel's pitch and tone; only faceless videos (script.json) may have it.
  if (next.pacing?.mode !== "off" && !existsSync(join(VIDEOS, slug, "script.json")))
    throw new Error(`pacing must be {"mode": "off"} on Daniel's footage (it changes his pitch and tone)`);
  await validate(next);
  const { lines, yes } = await review(slug, cur.json, next);
  const preview = [`edit.json ${slug} @ ${cur.sha}`, ...diff, ...lines, ...(yes.length ? ["", "Needs Daniel's explicit yes:", ...yes.map((y) => `- ${y}`)] : [])].join("\n");
  return { preview, save: () => save(cur.file, body) };
};
const save = (file, body) => {
  writeFileSync(`${file}.tmp`, body);
  copyFileSync(file, `${file}.bak`);
  renameSync(`${file}.tmp`, file);
};

export const planPatch = async (slug, ops) => {
  const cur = read(slug);
  const next = apply(cur.json, ops);
  const diff = ops.map(({ op, path, value }) =>
    op === "append" ? `append ${path}: ${short(value)}` : `${op} ${path}: ${short(valueAt(cur.json, path))} -> ${op === "set" ? short(value) : "(removed)"}`,
  );
  return plan(slug, cur, next, diff);
};

// Back to edit.json.bak; the current file becomes the .bak, so a second undo is a redo.
export const planUndo = async (slug) => {
  const cur = read(slug);
  if (!existsSync(`${cur.file}.bak`)) throw new Error("no edit.json.bak to go back to");
  const raw = readFileSync(`${cur.file}.bak`, "utf8");
  const old = JSON.parse(raw);
  const keys = [...new Set([...Object.keys(cur.json), ...Object.keys(old)])].filter((k) => !same(cur.json[k], old[k]));
  return plan(slug, cur, old, ["undo to edit.json.bak:", ...keys.map((k) => `${k}: ${short(cur.json[k])} -> ${short(old[k])}`)], raw);
};
