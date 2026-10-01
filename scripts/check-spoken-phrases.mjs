// ADVISORY: where a talking-head video's speech says an RG 234 watch phrase, for the
// compliance reviewer's verify_for_daniel list (video-compliance-review skill, final
// stage, step 3). Daniel's spoken words are verify notes, never a gate: this prints
// the hits and exits 0 whatever it finds (1 only for a bad slug or no words.json).
//
//   node scripts/check-spoken-phrases.mjs <slug> [--public-dir <dir>]
//
// words.json holds one syllable per entry (" miễn", " phí"), so a plain search of
// the file finds no multi-word phrase. This joins the words, folds them like
// src/mortgage/compliance.ts (lower case, NFC, odd whitespace, zero-width) and
// matches its lists the way its guard does: PROMOTIONAL_* (a claim) and CONTEXT_*
// (look at the context). Times are recording time (words.json), m:ss.s.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CONTEXT_EN, CONTEXT_VI, PROMOTIONAL_EN, PROMOTIONAL_VI, fold, hit } from "../src/mortgage/compliance.ts";
import { recordingPath } from "../src/mortgage/recording.ts";
import { assertSlug } from "./listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");

/** [{tier, term, startMs, said}] for every watch phrase in the words, in time order. */
export const spokenHits = (words) => {
  const starts = [];
  let hay = "";
  for (const w of words) {
    let t = fold(String(w.text ?? ""));
    if (hay.endsWith(" ") && t.startsWith(" ")) t = t.slice(1); // one space between words, as fold gives
    starts.push(hay.length);
    hay += t;
  }
  const at = (offset) => {
    let i = 0;
    while (i + 1 < starts.length && starts[i + 1] <= offset) i++;
    return i;
  };
  const out = [];
  for (const [tier, terms] of [["promotional", [...PROMOTIONAL_VI, ...PROMOTIONAL_EN]], ["context", [...CONTEXT_VI, ...CONTEXT_EN]]])
    for (const term of terms.map(fold)) {
      if (!hit(hay, term)) continue;
      const re = /^[a-z]+$/.test(term) ? new RegExp(String.raw`\b${term}\b`, "gi") : new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      for (const m of hay.matchAll(re)) {
        const i = at(m.index);
        const said = words.slice(Math.max(0, i - 3), i + term.split(" ").length + 3).map((w) => w.text).join("").trim();
        out.push({ tier, term, startMs: words[i].startMs, said });
      }
    }
  return out.sort((a, b) => a.startMs - b.startMs);
};

const clock = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, "0")}`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const slug = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--public-dir");
  if (!slug) {
    console.error("usage: node scripts/check-spoken-phrases.mjs <slug> [--public-dir <dir>]");
    process.exit(1);
  }
  assertSlug(slug);
  const dirs = [...new Set([args.includes("--public-dir") ? resolve(args[args.indexOf("--public-dir") + 1]) : null, join(ROOT, "public")].filter(Boolean))];
  const editPath = dirs.map((d) => join(d, "videos", slug, "edit.json")).find(existsSync);
  const source = editPath ? JSON.parse(readFileSync(editPath, "utf8")).source : undefined;
  const rel = recordingPath(slug, source, "words.json");
  const wordsPath = dirs.map((d) => join(d, rel)).find(existsSync);
  if (!wordsPath) {
    console.error(`spoken phrases: no words.json for "${slug}" (public/${rel}); in a worktree pass --public-dir <main checkout>/public.`);
    process.exit(1);
  }
  let words;
  try {
    words = JSON.parse(readFileSync(wordsPath, "utf8"));
  } catch (e) {
    words = null;
  }
  if (!Array.isArray(words)) {
    console.error(`spoken phrases: ${wordsPath} is not a JSON array of words.`);
    process.exit(1);
  }
  const hits = spokenHits(words);
  console.log(`spoken phrases (advisory, never a gate): ${hits.length} hit(s) in ${wordsPath}`);
  for (const h of hits) console.log(`  ${clock(h.startMs)}  [${h.tier}] "${h.term}"  …${h.said}…`);
  if (hits.length) console.log("Each goes in verify_for_daniel with its time: a claim he keeps and answers for, or neutral (\"không miễn phí\"). Never cut or reword speech.");
}
