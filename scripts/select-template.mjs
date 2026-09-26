// Ranks the designs for one video and writes the top 3, with why, to
// out/videos/<slug>/selection.json (it runs brief.mjs first).
//   node scripts/select-template.mjs <slug> [--public-dir <dir>]   (passed on to brief.mjs)
//   node scripts/select-template.mjs <slug> --pick <id> --reason "<why>"   (Daniel's override)
// Hard filters (aspect, language, card length per kind, face) drop a design
// outright; the rest are scored with config/selector.json (untuned weights):
//   intent·IntentMatch + shape·DataShapeFit + comp·ComprehensionPrior
//   + asset·AssetReady − rec·SkinRecency − cost·RenderCost
// Ties go to the cheaper render, then the design used least recently. A design
// promote-design.mjs has passed (template.json "promoted") ranks above every one
// it has not; those are still ranked, marked "unproven", and --pick takes any.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const r2 = (n) => Math.round(n * 100) / 100;

export const loadManifests = (dir = join(root, "src", "designs")) =>
  readdirSync(dir)
    .filter((id) => existsSync(join(dir, id, "template.json")))
    .map((id) => readJson(join(dir, id, "template.json")));

// Every template.json field the selector reads, with its type; promote-design.mjs
// checks a manifest against this list. An array lists the allowed values.
export const MANIFEST_FIELDS = {
  id: "string",
  intents: "string[]",
  dataShapes: "string[]",
  grammar: "object",
  skinAxes: "object",
  aspects: "string[]",
  languages: "string[]",
  // Per language: a number for every kind of text, or one per kind (KINDS).
  maxChars: { vi: "number|object", en: "number|object" },
  minHoldMs: "number",
  facePolicy: ["face-required", "face-optional", "faceless"],
  renderCost: Object.keys(readJson(join(root, "config", "selector.json")).cost),
  preview: "string|null",
  uses: "number",
  lastUsed: "string|null",
  promoted: "string", // YYYY-MM-DD promote-design.mjs passed it; absent = unproven
  promotedNote: "string",
};
// Fields a manifest may leave out (promotion writes them).
export const OPTIONAL_FIELDS = ["uses", "lastUsed", "promoted", "promotedNote"];

// Kinds of on-screen text; brief.mjs measures each separately (longestCard.vi).
export const KINDS = ["hook", "chapter", "stat", "cue"];
const charsOf = (v, kind) => (typeof v === "number" ? v : (v?.[kind] ?? 0));
const limitOf = (m, kind) => (typeof m === "number" ? m : (m?.[kind] ?? Infinity));
export const unprovenWhy = (id) => `not promoted yet: run node scripts/promote-design.mjs ${id}`;

// Why a design cannot make this video, or null when it can.
const excluded = (t, b) => {
  if (!t.aspects.includes(b.aspect)) return `no ${b.aspect}`;
  const lang = b.languages.find((l) => !t.languages.includes(l));
  if (lang) return `no ${lang} on screen`;
  for (const l of ["vi", "en"])
    for (const k of KINDS) {
      const n = charsOf(b.longestCard[l], k);
      const max = limitOf(t.maxChars[l], k);
      if (n > max) return `${k} ${n} chars > ${l} ${k} max ${max}`;
    }
  const faces = b.mode === "B" ? ["faceless", "face-optional"] : ["face-required", "face-optional"];
  if (!faces.includes(t.facePolicy)) return `${t.facePolicy}, video is ${b.mode === "B" ? "faceless" : "on camera"}`;
  return null;
};

// A short hold is the edit's, not the design's: every design shows a cue for
// the same time, so it's a warning to lengthen the cue, never a reason to drop one.
const holdWarning = (t, b) =>
  b.shortestHoldMs !== null && b.shortestHoldMs < t.minHoldMs
    ? { holdWarning: `a card is held ${b.shortestHoldMs} ms; ${t.id} is designed for ${t.minHoldMs} ms, so lengthen that cue in edit.json` }
    : {};

const SHAPE_COUNT ={ comparison: "comparisons" }; // brief.counts key when it differs from the shape

const parts = (t, b, history, cfg) => {
  const intent = t.intents.includes(b.intent) ? 1 : b.intents.some((i) => t.intents.includes(i)) ? 0.5 : 0;
  // Share of what the video shows that this design is built to show.
  const weights = b.dataShapes.map((s) => [s, b.counts[SHAPE_COUNT[s] ?? s] || 1]);
  const total = weights.reduce((n, [, w]) => n + w, 0);
  const shape = weights.reduce((n, [s, w]) => n + (t.dataShapes.includes(s) ? w : 0), 0) / total;
  // Its own grammar for the video's main shape explains it best; a borrowed one half as well.
  const comp = t.dataShapes.includes(b.dataShapes[0]) ? 1 : 0.5;
  const asset =
    t.facePolicy === "faceless"
      ? (b.assets.script ? 0.5 : 0) + (b.assets.voice ? 0.5 : 0)
      : b.assets.foreground ? 1 : 0;
  // ponytail: skin recency by design id (a design = one skin); WP5 owns per-axis variety.
  const rec = Math.max(0, ...history.slice(0, cfg.recency.length).map((e, i) => (e.design === t.id ? cfg.recency[i] : 0)));
  const cost = cfg.cost[t.renderCost];
  const w = cfg.weights;
  const score = w.intent * intent + w.shape * shape + w.comp * comp + w.asset * asset - w.rec * rec - w.cost * cost;
  return { score: r2(score), intent, shape: r2(shape), comp, asset, rec, cost };
};

/** history: design-log entries before this video, newest first. */
export function rank(brief, manifests, history, cfg) {
  const lastUsed = (id) => history.find((e) => e.design === id)?.date ?? "";
  const out = [];
  const dropped = {};
  for (const t of manifests) {
    const why = excluded(t, brief);
    if (why) dropped[t.id] = why;
    else out.push({ id: t.id, ...parts(t, brief, history, cfg), ...(!t.promoted && { unproven: unprovenWhy(t.id) }), ...holdWarning(t, brief) });
  }
  out.sort((a, b) => !!a.unproven - !!b.unproven || b.score - a.score || a.cost - b.cost || lastUsed(a.id).localeCompare(lastUsed(b.id)));
  return { ranked: out, dropped };
}

// Scores this close are a judgement call, not a pick: Daniel chooses between the two.
export const CLOSE_CALL = 2;
export const confidenceOf = (ranked) => {
  const [a, b] = ranked;
  if (!b) return { confident: true };
  const gap = r2(Math.abs(a.score - b.score));
  return gap >= CLOSE_CALL ? { confident: true } : { confident: false, closeCall: `${a.id} ${a.score} vs ${b.id} ${b.score} (gap ${gap} < ${CLOSE_CALL}): ask Daniel` };
};

/** Daniel's --pick: any design, recorded with its rank and why it would not have been picked. */
export const overrideOf = (pick, reason, { ranked, dropped }, manifests) => ({
  id: pick,
  reason,
  rank: ranked.findIndex((r) => r.id === pick) + 1 || null,
  ...(dropped[pick] && { filteredOut: dropped[pick] }),
  ...(!manifests.find((t) => t.id === pick)?.promoted && { unproven: unprovenWhy(pick) }),
});

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) throw new Error('Usage: node scripts/select-template.mjs <slug> [--public-dir <dir>] [--pick <id> --reason "<why>"]');
  const flag = (name) => {
    const i = rest.indexOf(name);
    return i < 0 ? undefined : rest[i + 1];
  };
  const pick = flag("--pick");
  const reason = flag("--reason");
  const publicDir = flag("--public-dir");
  if (pick && !reason) throw new Error(`--pick ${pick} needs --reason "<why>" so the override is on record.`);

  execFileSync(process.execPath, [join(root, "scripts", "brief.mjs"), slug, ...(publicDir ? ["--public-dir", publicDir] : [])], { stdio: ["ignore", "ignore", "pipe"] });
  const brief = readJson(join(root, "out", "videos", slug, "brief.json"));
  const cfg = readJson(join(root, "config", "selector.json"));
  const manifests = loadManifests();
  if (pick && !manifests.some((t) => t.id === pick))
    throw new Error(`--pick ${pick} is not a design. Available: ${manifests.map((t) => t.id).join(", ")}`);
  // The videos made before this one (all of them for a new slug), newest first.
  const log = readJson(join(root, "public", "videos", "design-log.json"));
  const at = log.findIndex((e) => e.slug === slug);
  const history = (at < 0 ? log : log.slice(0, at)).slice().reverse();

  const { ranked, dropped } = rank(brief, manifests, history, cfg);
  const top = ranked.slice(0, 3);
  const override = pick && overrideOf(pick, reason, { ranked, dropped }, manifests);
  const confidence = confidenceOf(ranked);
  const line = (v) => JSON.stringify(v);
  const text = [
    "{",
    `  "slug": ${line(slug)},`,
    `  "brief": ${line({ mode: brief.mode, intent: brief.intent, dataShapes: brief.dataShapes, durationS: brief.durationS })},`,
    `  "weights": ${line(cfg.status)},`,
    `  "pick": ${line(pick ?? top[0]?.id ?? null)},`,
    `  "confident": ${line(confidence.confident)},`,
    ...(confidence.closeCall ? [`  "closeCall": ${line(confidence.closeCall)},`] : []),
    ...(override ? [`  "override": ${line(override)},`] : []),
    `  "top": [`,
    top.map((r) => `    ${line(r)}`).join(",\n"),
    "  ],",
    `  "excluded": ${line(dropped)}`,
    "}",
  ].join("\n");
  JSON.parse(text); // the file must stay valid JSON
  const dir = join(root, "out", "videos", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "selection.json"), `${text}\n`);
  console.log(`select ${slug}: ${top.map((r) => `${r.id} ${r.score}${r.unproven ? " (unproven)" : ""}${r.holdWarning ? " (short hold)" : ""}`).join(" · ")}${override ? ` · Daniel picked ${pick}` : ""}`);
  if (!override && confidence.closeCall) console.log(`close call: ${confidence.closeCall}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (err) {
    console.error(err.stderr?.toString().trim().split("\n").at(-1) || err.message);
    process.exit(1);
  }
}
