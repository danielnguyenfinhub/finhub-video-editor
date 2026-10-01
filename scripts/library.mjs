// Cross-video source library: every downloaded or generated asset is saved
// once, found by keyword, and reused before any new call (WP2, approved by
// Daniel 2026-09-26; layout in .claude/skills/refactor-team/references/asset-contract.md).
//
//   public/library/<kind>/<keyword-slug>__<provider>__<hash8>.<ext>   binary, git-ignored
//   public/library/<kind>/<same>.meta.json                            tracked
//   public/library/index.json      tracked, rebuilt from the meta files, sorted
//   public/library/synonyms.json   tracked EN <-> VI and synonym groups
//
// CLI:
//   node scripts/library.mjs find <keywords...> [--kind k]
//   node scripts/library.mjs add <file> <meta.json>
//   node scripts/library.mjs index
//   node scripts/library.mjs stats
//   node scripts/library.mjs resolve <slug> [--public-dir dir]   edit.json visuals {find} -> file
//
// add() is the only thing that writes a binary into the library.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSlug } from "./listing-prep.mjs";
import { stems } from "./visuals.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const LIBRARY = join(ROOT, "public", "library");
export const KINDS = ["stock-video", "stock-image", "ai-image", "own-footage", "music"];

// Cost avoided per reuse, US$. ESTIMATES, not invoices: Pexels and Pixabay
// are free; fal FLUX dev is about US$0.03 an image (the figure voice-video.mjs
// prints). A reuse is every usedIn slug after the first.
const COST_PER_REUSE = { "stock-video": 0, "stock-image": 0, "ai-image": 0.03, "own-footage": 0, music: 0 };

const norm = (s) => String(s).normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
// Keywords keep their order (the first names the file); usedIn is sorted.
const dedupe = (list) => [...new Set((list ?? []).map(norm).filter(Boolean))];
const uniq = (list) => dedupe(list).sort();
// Drop the query string and fragment: a provider URL must never carry a key.
export const cleanUrl = (u) => (u ? String(u).split(/[?#]/)[0] : null);
const slugify = (s) =>
  norm(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "") || "untitled";

// Sorted keys at every level, so the same data always writes the same bytes.
const sortKeys = (v) =>
  Array.isArray(v)
    ? v.map(sortKeys)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]))
      : v;
const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(sortKeys(data), null, 2)}\n`);

export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

// Every entry, read from the meta files (the source of truth; index.json is a
// sorted copy for people and diffs). `file` is the binary beside the meta.
// ponytail: full scan per call, fine for hundreds of entries; read index.json
// instead if the library grows past a few thousand.
export const load = (lib = LIBRARY) =>
  KINDS.flatMap((kind) => {
    const d = join(lib, kind);
    if (!existsSync(d)) return [];
    return readdirSync(d)
      .filter((f) => f.endsWith(".meta.json"))
      .sort()
      .map((f) => {
        const metaFile = join(d, f);
        return { file: metaFile.slice(0, -".meta.json".length), metaFile, meta: JSON.parse(readFileSync(metaFile, "utf8")) };
      });
  });

const readSynonyms = (lib) => {
  const f = join(lib, "synonyms.json");
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")).groups ?? []) : [];
};

// Find order: exact keyword (or the exact AI prompt), then the synonyms.json
// EN <-> VI map, then stem overlap (visuals.mjs `stems`). Stem hits need most
// of the query's stems, so a long prompt can't match on two common words.
// Entries whose binary isn't on disk (a fresh clone has only the metadata)
// are skipped: a hit must be usable with no network.
// ponytail: stems() keeps a-z only, so Vietnamese matches through exact or
// synonyms.json alone; add a diacritic-folding stem if VI searches miss.
export const find = (query, { kind, lib = LIBRARY } = {}) => {
  const q = norm(Array.isArray(query) ? query.join(" ") : query);
  if (!q) return [];
  const group = new Set(readSynonyms(lib).flatMap((g) => {
    const terms = uniq([...(g.en ?? []), ...(g.vi ?? []), ...(g.synonyms ?? [])]);
    return terms.includes(q) ? terms : [];
  }));
  const qs = [...stems(q)];
  const need = Math.max(Math.min(2, qs.length), Math.ceil(qs.length * 0.6));
  const hits = [];
  for (const e of load(lib)) {
    if ((kind && e.meta.kind !== kind) || !existsSync(e.file)) continue;
    const words = [...(e.meta.keywords?.en ?? []), ...(e.meta.keywords?.vi ?? []), ...(e.meta.keywords?.synonyms ?? [])].map(norm);
    let tier = 0;
    let score = 0;
    if (words.includes(q) || (e.meta.prompt && norm(e.meta.prompt) === q)) tier = 1;
    else if (e.meta.keywordsUnverified) continue; // Daniel hasn't confirmed what it shows: exact matches only
    else if (words.some((w) => group.has(w))) tier = 2;
    else if (qs.length) {
      score = Math.max(0, ...words.map((w) => { const have = stems(w); return qs.filter((s) => have.has(s)).length; }));
      if (score >= need) tier = 3;
    }
    if (tier) hits.push({ path: e.file, meta: e.meta, match: ["", "exact", "synonym", "stem"][tier], tier, score });
  }
  return hits
    .sort((a, b) => a.tier - b.tier || b.score - a.score || a.path.localeCompare(b.path))
    .map(({ path, meta, match }) => ({ path, meta, match }));
};

const blank = () => ({
  keywords: { en: [], vi: [], synonyms: [] },
  provider: null, model: null, prompt: null, seed: null,
  sourceUrl: null, author: null, licence: null, date: null,
  width: null, height: null, durationS: null, sha256: null,
  flags: { peopleIdentifiable: null, textInImage: null, logoPresent: null },
  usedIn: [],
});

const mergeKeywords = (a = {}, b = {}) => ({
  en: dedupe([...(a.en ?? []), ...(b.en ?? [])]),
  vi: dedupe([...(a.vi ?? []), ...(b.vi ?? [])]),
  synonyms: dedupe([...(a.synonyms ?? []), ...(b.synonyms ?? [])]),
});

// The naming rule: <kind>/<keyword-slug>__<provider>__<hash8>.<ext>.
export const targetFor = (meta, ext, lib = LIBRARY) => {
  const k = meta.keywords ?? {};
  const label = k.en?.[0] ?? k.vi?.[0] ?? k.synonyms?.[0] ?? meta.prompt ?? "untitled";
  return join(lib, meta.kind, `${slugify(label)}__${slugify(meta.provider)}__${meta.sha256.slice(0, 8)}${ext.toLowerCase() || ".bin"}`);
};

// Saves `file` into the library under the naming rule, with its meta beside
// it, and rebuilds index.json. Same bytes already there: nothing is copied
// twice; keywords and usedIn merge into the existing entry.
export const add = (file, meta, { lib = LIBRARY } = {}) => {
  if (!existsSync(file)) throw new Error(`library add: ${file} not found.`);
  if (!KINDS.includes(meta?.kind)) throw new Error(`library add: kind must be one of ${KINDS.join(", ")}.`);
  if (!meta.provider) throw new Error("library add: provider is required.");
  const hash = sha256(file);
  const existing = load(lib).find((e) => e.meta.sha256 === hash);
  if (existing) {
    const merged = {
      ...existing.meta,
      keywords: mergeKeywords(existing.meta.keywords, meta.keywords),
      usedIn: uniq([...(existing.meta.usedIn ?? []), ...(meta.usedIn ?? [])]),
    };
    if (existing.meta.keywordsUnverified && !meta.keywordsUnverified && meta.keywords?.en?.length) delete merged.keywordsUnverified;
    if (!existsSync(existing.file)) copyFileSync(file, existing.file); // metadata-only clone: restore the binary
    writeJson(existing.metaFile, merged);
    index(lib);
    return { path: existing.file, meta: merged, existed: true };
  }
  const base = blank();
  const full = {
    ...base,
    ...meta,
    keywords: mergeKeywords(base.keywords, meta.keywords),
    flags: { ...base.flags, ...meta.flags },
    usedIn: uniq(meta.usedIn),
    sourceUrl: cleanUrl(meta.sourceUrl),
    date: meta.date ?? new Date().toISOString().slice(0, 10),
    sha256: hash,
  };
  const target = targetFor(full, extname(file), lib);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(file, target);
  writeJson(`${target}.meta.json`, full);
  index(lib);
  return { path: target, meta: full, existed: false };
};

// A library hit: record the slug in usedIn (no copy) and return the path.
export const markUsed = (path, slug, { lib = LIBRARY } = {}) => {
  if (!slug) return path;
  const metaFile = `${path}.meta.json`;
  const meta = JSON.parse(readFileSync(metaFile, "utf8"));
  if ((meta.usedIn ?? []).includes(slug)) return path;
  writeJson(metaFile, { ...meta, usedIn: uniq([...(meta.usedIn ?? []), slug]) });
  index(lib);
  return path;
};

export const index = (lib = LIBRARY) => {
  const entries = load(lib).map((e) => ({ ...e.meta, path: relative(lib, e.file).replace(/\\/g, "/") }));
  mkdirSync(lib, { recursive: true });
  writeJson(join(lib, "index.json"), { entries });
  return entries;
};

export const stats = (lib = LIBRARY) => {
  const byKind = Object.fromEntries(KINDS.map((k) => [k, { count: 0, bytes: 0, reuses: 0, costAvoidedUsd: 0 }]));
  for (const e of load(lib)) {
    const s = byKind[e.meta.kind];
    if (!s) continue;
    s.count++;
    if (existsSync(e.file)) s.bytes += statSync(e.file).size;
    const reuses = Math.max(0, (e.meta.usedIn ?? []).length - 1);
    s.reuses += reuses;
    s.costAvoidedUsd += reuses * COST_PER_REUSE[e.meta.kind];
  }
  const total = Object.values(byKind).reduce(
    (t, s) => ({ count: t.count + s.count, bytes: t.bytes + s.bytes, reuses: t.reuses + s.reuses, costAvoidedUsd: t.costAvoidedUsd + s.costAvoidedUsd }),
    { count: 0, bytes: 0, reuses: 0, costAvoidedUsd: 0 },
  );
  return { byKind, total };
};

// edit.json `visuals` (WP3): rewrites each {find: "<keywords>"} asset to a
// concrete "library/..." path, so a render only ever sees a file. Exact and
// synonym hits only (a stem hit is too loose to put on screen unseen); music
// never. Nothing is downloaded: a miss throws, naming every unresolved
// keyword, and the edit is left untouched. Returns the resolved paths.
export const resolveVisuals = (slug, { publicDir = join(ROOT, "public") } = {}) => {
  const lib = join(publicDir, "library");
  const editFile = join(publicDir, "videos", slug, "edit.json");
  if (!existsSync(editFile)) throw new Error(`${editFile} not found.`);
  const edit = JSON.parse(readFileSync(editFile, "utf8"));
  const missing = [];
  const resolved = [];
  const visuals = (edit.visuals ?? []).map((v) => {
    if (typeof v.asset === "string" || !v.asset?.find) return v;
    const hit = find(v.asset.find, { lib }).find((h) => h.match !== "stem" && h.meta.kind !== "music");
    if (!hit) {
      missing.push(v.asset.find);
      return v;
    }
    markUsed(hit.path, slug, { lib });
    const path = `library/${relative(lib, hit.path).replace(/\\/g, "/")}`;
    resolved.push(`${v.asset.find} -> ${path} (${hit.match})`);
    return { ...v, asset: path };
  });
  if (missing.length)
    throw new Error(
      `no exact or synonym library match for: ${missing.map((m) => `"${m}"`).join(", ")}. ` +
        "Add a file with `node scripts/library.mjs add`, add the words to public/library/synonyms.json, " +
        "or name a library/... path in edit.json. (Downloading new footage is only in the faceless tooling for now.)",
    );
  // ponytail: rewrites edit.json in plain 2-space JSON (one-line arrays unfold); patch the text in place if that churn bothers anyone.
  if (resolved.length) writeFileSync(editFile, `${JSON.stringify({ ...edit, visuals }, null, 2)}\n`);
  return resolved;
};

const cli = () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const kindAt = rest.indexOf("--kind");
  const kind = kindAt >= 0 ? rest[kindAt + 1] : undefined;
  const args = kindAt >= 0 ? rest.filter((_, i) => i !== kindAt && i !== kindAt + 1) : rest;
  if (kind && !KINDS.includes(kind)) throw new Error(`--kind must be one of ${KINDS.join(", ")}.`);
  if (cmd === "find") {
    if (!args.length) throw new Error("usage: library.mjs find <keywords...> [--kind k]");
    const hits = find(args.join(" "), { kind });
    if (!hits.length) console.log("no library hit");
    for (const h of hits) console.log(`${h.match.padEnd(7)} ${relative(ROOT, h.path)}  [${h.meta.keywords.en.join(", ")}]`);
  } else if (cmd === "add") {
    if (args.length !== 2) throw new Error("usage: library.mjs add <file> <meta.json>");
    const r = add(args[0], JSON.parse(readFileSync(args[1], "utf8")));
    console.log(`${r.existed ? "already in library, merged" : "added"}: ${relative(ROOT, r.path)}`);
  } else if (cmd === "resolve") {
    const dirAt = args.indexOf("--public-dir");
    const publicDir = dirAt >= 0 ? resolve(args[dirAt + 1]) : undefined;
    const slug = args.filter((_, i) => i !== dirAt && i !== dirAt + 1)[0];
    if (!slug) throw new Error("usage: library.mjs resolve <slug> [--public-dir dir]");
    assertSlug(slug);
    const r = resolveVisuals(slug, { publicDir });
    console.log(r.length ? r.join("\n") : "nothing to resolve: every visual already names a file");
  } else if (cmd === "index") {
    console.log(`index.json: ${index().length} entries`);
  } else if (cmd === "stats") {
    const { byKind, total } = stats();
    for (const [k, s] of Object.entries(byKind))
      console.log(`${k.padEnd(12)} ${String(s.count).padStart(4)} files ${(s.bytes / 1e6).toFixed(1).padStart(8)} MB  ${s.reuses} reuse(s), ~US$${s.costAvoidedUsd.toFixed(2)} avoided`);
    console.log(`total        ${String(total.count).padStart(4)} files ${(total.bytes / 1e6).toFixed(1).padStart(8)} MB  ${total.reuses} reuse(s), ~US$${total.costAvoidedUsd.toFixed(2)} avoided (estimate)`);
  } else {
    throw new Error("usage: library.mjs find|add|index|stats (see the header of scripts/library.mjs)");
  }
};

if (process.argv[1] && basename(process.argv[1]) === "library.mjs") {
  try {
    cli();
  } catch (err) {
    console.error(`library: ${err.message}`);
    process.exit(1);
  }
}
