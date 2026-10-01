// Ratchet on small text: counts the fontSize literals under MIN_TEXT_PX in each design and fails
// when a design has MORE than config/text-size-baseline.json records (a new or longer list of small
// text). Existing small text is not failed: it is the baseline, to be reduced by design work
// (corrections 25/09 "text too small"). Fewer than the baseline is fine; run with --update-baseline
// to lower it. Limit: sizes computed at run time (fitText, scales) are invisible to a grep.
//   node scripts/check-text-size.mjs [design-id ...]       report; whole-repo run enforces the ratchet
//   node scripts/check-text-size.mjs --update-baseline     rewrite the baseline from the current code
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Minimum on-screen text size in px at 1080x1920 (decided 2026-10-01 in Daniel's absence; he can change it):
// the frame is shown at about 390 pt wide on a phone, so 30 px is about 11 pt, the smallest size
// platforms treat as readable. DERIVED from that assumed width, not measured on a phone.
export const MIN_TEXT_PX = 30;
const baselinePath = join(import.meta.dirname, "..", "config", "text-size-baseline.json");

const designsDir = join(import.meta.dirname, "..", "src", "designs");

// `fontSize: 26`, `fontSize={26}`, `fontSize="26"` under the floor: [{ file, line, px }].
export const smallText = (dir, min = MIN_TEXT_PX) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .flatMap((file) =>
      readFileSync(join(dir, file), "utf8")
        .split("\n")
        .flatMap((text, i) =>
          /^\s*\/\//.test(text)
            ? []
            : [...text.matchAll(/fontSize\s*(?::|=\{?)\s*"?(\d+(?:\.\d+)?)/g)]
                .map((m) => Number(m[1]))
                .filter((px) => px < min)
                .map((px) => ({ file, line: i + 1, px })),
        ),
    );

/** Designs whose count of small literals grew past the baseline (a missing design has baseline 0). */
export const ratchetProblems = (counts, baseline) =>
  Object.entries(counts)
    .filter(([id, n]) => n > (baseline[id] ?? 0))
    .map(([id, n]) => `${id}: ${n} fontSize literal(s) under ${MIN_TEXT_PX}px, baseline ${baseline[id] ?? 0}`);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const ids = args.filter((a) => !a.startsWith("--"));
  const all = ids.length ? ids : readdirSync(designsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const counts = {};
  let total = 0;
  for (const id of all) {
    const hits = smallText(join(designsDir, id));
    counts[id] = hits.length;
    total += hits.length;
    if (hits.length && (ids.length || args.includes("--list"))) console.log(`${id}: ${hits.length} under ${MIN_TEXT_PX}px  ${hits.map((h) => `${h.file}:${h.line}=${h.px}`).join(" ")}`);
  }
  if (args.includes("--update-baseline")) {
    writeFileSync(baselinePath, JSON.stringify(Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0).sort()), null, 2) + "\n");
    console.log(`text size: baseline written (${total} literal(s) under ${MIN_TEXT_PX}px)`);
  } else if (!ids.length) {
    // The ratchet's own logic first, so a broken check cannot pass vacuously.
    const t = ratchetProblems({ a: 2, b: 0, c: 1 }, { a: 2, b: 5 });
    if (t.length !== 1 || !t[0].startsWith("c: 1")) {
      console.error(`text size: ratchet self-check failed: ${JSON.stringify(t)}`);
      process.exit(1);
    }
    const problems = ratchetProblems(counts, JSON.parse(readFileSync(baselinePath, "utf8")));
    if (problems.length) {
      console.error(`text size: more small text than the baseline allows (raise the text, or if intended run --update-baseline):\n${problems.map((p) => `  ${p}`).join("\n")}`);
      process.exit(1);
    }
    console.log(`text size ok: ${total} literal(s) under ${MIN_TEXT_PX}px, none beyond the baseline (${all.length} design(s))`);
  } else console.log(`text size: ${total} literal(s) under ${MIN_TEXT_PX}px in ${all.length} design(s)`);
}
