// REPORT ONLY: lists every fontSize literal under MIN_TEXT_PX in each design
// (corrections 25/09: "text too small", no rule yet). Never fails: exit 0
// always, and promote-design.mjs prints the count as a note. Some hits may be
// text no viewer reads; nothing is exempted until Daniel sets the floor.
//   node scripts/check-text-size.mjs [design-id ...]   every design by default
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// DANIEL TO SET: minimum on-screen text size in px at 1080x1920. 30 is a
// placeholder, not a decision; once set, this can become a golden rule and a
// failing promote-design check.
export const MIN_TEXT_PX = 30;

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ids = process.argv.slice(2);
  const all = ids.length ? ids : readdirSync(designsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let total = 0;
  for (const id of all) {
    const hits = smallText(join(designsDir, id));
    total += hits.length;
    if (hits.length) console.log(`${id}: ${hits.length} under ${MIN_TEXT_PX}px  ${hits.map((h) => `${h.file}:${h.line}=${h.px}`).join(" ")}`);
  }
  console.log(`text size (report only, floor ${MIN_TEXT_PX}px, Daniel to set): ${total} literal(s) under it in ${all.length} design(s)`);
}
