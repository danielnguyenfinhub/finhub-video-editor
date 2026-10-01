// One still in every scene of a listing video, bundled once (a `remotion
// still` per frame would re-bundle each time).
//
//   node scripts/listing-stills.mjs <slug> [--lang vi|en] [--at 0.5] [--scale 0.5]
//
// Writes out/listings/<slug>/stills-<lang>/NN-<scene id>.png at --at of each
// scene (0 = its first frame, 1 = its last). Look at every one before rendering.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bundlerOverride } from "../bundler-override.mjs";
import { assertSlug } from "./listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const slug = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!slug) {
  console.error("usage: node scripts/listing-stills.mjs <slug> [--lang vi|en] [--at 0.5] [--scale 0.5]");
  process.exit(1);
}
assertSlug(slug);
const lang = flag("--lang", "vi");
const at = Number(flag("--at", "0.5"));
const scale = Number(flag("--scale", "0.5"));
const dir = join(ROOT, "public", "listings", slug);
const scenes = JSON.parse(readFileSync(join(dir, "script.json"), "utf8")).scenes;
const timeline = JSON.parse(readFileSync(join(dir, `timeline-${lang}.json`), "utf8"));
const LEAD = 6; // src/listing/data.ts LEAD_FRAMES
const start = (i) => (i === 0 ? 0 : LEAD + Math.round((timeline[i].fromMs * 30) / 1000));

const serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts"), rspack: true, bundlerOverride });
const inputProps = { slug, lang };
const composition = await selectComposition({ serveUrl, id: "ListingReel", inputProps });
const out = join(ROOT, "out", "listings", slug, `stills-${lang}`);
mkdirSync(out, { recursive: true });
for (const [i, s] of scenes.entries()) {
  const end = i + 1 < scenes.length ? start(i + 1) : composition.durationInFrames;
  const frame = Math.min(end - 1, Math.round(start(i) + at * (end - start(i))));
  const output = join(out, `${String(i + 1).padStart(2, "0")}-${s.id}.png`);
  await renderStill({ serveUrl, composition, inputProps, frame, output, scale, chromiumOptions: { gl: "angle" } });
  console.log(`${output}  (frame ${frame})`);
}
