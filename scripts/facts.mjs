// Fact ledger check for faceless videos (Mode B). Every factual claim a scene
// makes must trace to public/videos/<slug>/facts.json; voice-video.mjs runs
// this before anything is voiced. Format: faceless-script.md "Fact ledger".
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const KINDS = ["number", "rule", "condition", "definition"];
const STALE_DAYS = 90;

// Words that usually carry a rule or condition. Short on purpose: a false
// positive costs the writer one `facts: []`; a miss lets a claim through.
const POLICY_WORDS = [
  "phải", "được phép", "không được", "yêu cầu", "điều kiện", "tối thiểu", "tối đa", "đủ điều kiện", "bắt buộc",
  "must", "required", "eligible", "minimum", "maximum", "condition", "only if", "not allowed",
];
// Vietnamese syllables are space-separated, so "not a letter or digit" on each
// side is the word boundary (\b doesn't know accented letters).
export const POLICY_RE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(${POLICY_WORDS.join("|")})s?(?![\p{L}\p{N}])`,
  "iu",
);

const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase();

// "5,79" and "5.79" → "5.79"; "3,60" → "3.6"; "1,000,000" and "500.000" → "1000000", "500000".
// ponytail: one separator followed by exactly 3 digits reads as thousands ("5,790" → 5790),
// never as a 3-place decimal; both sides normalise the same way, so it only bites if a
// source mixes conventions. Pass the locale per fact if that ever happens.
const numbers = (text) =>
  (norm(text).match(/\d+(?:[.,]\d+)*/g) ?? []).map((run) => {
    const parts = run.split(/[.,]/);
    if (parts.length === 1) return run;
    if (parts.length > 2 || parts[parts.length - 1].length === 3) return parts.join("");
    return `${parts[0]}.${parts[1]}`.replace(/\.?0+$/, ""); // "3,60" and "3.6" match
  });

const clip = (s) => (s.length > 60 ? `${s.slice(0, 57)}...` : s);

/** The oldest source date in a ledger (YYYY-MM-DD sorts as text): the date a viewer should trust the video "as at". */
export const oldestAsAt = (ledger) => ledger.map((f) => f.asAt).filter(Boolean).sort()[0];

/** Reads public/videos/<slug>/facts.json; null when the slug has no ledger. Throws on bad JSON. */
export function readLedger(dir) {
  const path = join(dir, "facts.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`facts.json is not valid JSON: ${err.message}`);
  }
}

/** Checks a parsed script.json against its ledger (or null). Returns {errors, warnings} in plain language. */
export function checkFacts(script, ledger, today = new Date()) {
  const errors = [];
  const warnings = [];
  if (ledger === null || ledger === undefined) {
    warnings.push("ledger missing (legacy slug): facts not checked");
    return { errors, warnings };
  }
  if (!Array.isArray(ledger)) return { errors: ["facts.json must be an array of facts."], warnings };

  const byId = new Map();
  ledger.forEach((f, i) => {
    const at = `facts.json entry ${i + 1}${f?.id ? ` (${f.id})` : ""}`;
    if (typeof f?.id !== "string" || !/^F\d+$/.test(f.id)) errors.push(`${at}: id must look like F1, F2, ...`);
    else if (byId.has(f.id)) errors.push(`${at}: id ${f.id} is used twice.`);
    for (const field of ["claim_vi", "claim_en", "verbatim", "doc", "locator"])
      if (typeof f?.[field] !== "string" || !f[field].trim()) errors.push(`${at}: "${field}" is missing.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f?.asAt ?? "") || Number.isNaN(Date.parse(f.asAt)))
      errors.push(`${at}: "asAt" must be the document's date as YYYY-MM-DD.`);
    if (!KINDS.includes(f?.kind)) errors.push(`${at}: "kind" must be one of ${KINDS.join(", ")}.`);
    if (typeof f?.id === "string") byId.set(f.id, f);
  });

  const stale = new Set();
  (script?.scenes ?? []).forEach((scene, i) => {
    const where = `scene ${i + 1}`;
    const vi = norm(scene?.vi);
    const en = norm(scene?.en);
    if (scene?.facts === undefined) {
      const hit = /\d/.test(vi + en) ? "a number" : POLICY_RE.test(`${vi}\n${en}`) ? "a policy word" : "";
      if (hit)
        errors.push(
          `${where} has ${hit} but no "facts" ("${clip(scene.vi.trim())}"): cite the fact ids, or add "facts": [] if it makes no factual claim.`,
        );
      return;
    }
    if (!Array.isArray(scene.facts) || scene.facts.some((id) => typeof id !== "string")) {
      errors.push(`${where}: "facts" must be a list of fact ids, like ["F1"], or [] for no claim.`);
      return;
    }
    const cited = [];
    for (const id of scene.facts) {
      if (!byId.has(id)) errors.push(`${where} cites ${id}, which is not in facts.json.`);
      else cited.push(byId.get(id));
    }
    const traced = new Set(cited.flatMap((f) => numbers(`${f.verbatim}\n${f.claim_vi}\n${f.claim_en}`)));
    for (const [lang, text] of [["vi", scene.vi], ["en", scene.en]])
      for (const n of new Set(numbers(text)))
        if (!traced.has(n))
          errors.push(`${where} (${lang}) says ${n}, which no cited fact contains ("${clip(String(text).trim())}").`);
    for (const f of cited) {
      const ageDays = (today.getTime() - Date.parse(f.asAt)) / 86_400_000;
      if (ageDays > STALE_DAYS && !stale.has(f.id)) {
        stale.add(f.id);
        warnings.push(`${f.id} is ${Math.floor(ageDays)} days old (asAt ${f.asAt}, ${f.doc}): check it still holds.`);
      }
    }
  });
  return { errors, warnings };
}
