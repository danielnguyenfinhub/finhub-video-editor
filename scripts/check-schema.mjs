// The one supported schema check for a talking-head / faceless MortgageReel:
//   node scripts/check-schema.mjs <slug> [--public-dir <dir>]
// Runs MortgageReel's calculateMetadata (parseEdit schema, assertCompliantCopy,
// the rate gate, missing cut-out / visuals) exactly as a render would, and
// prints "MortgageReel <slug>: <frames> frames (<seconds> s)"; exit 0 ok, 1 on
// any error (its first 5 lines). `npx remotion compositions --props=...` fails
// for every talking-head slug: ListingReel gets the same props and throws when
// public/listings/<slug>/ does not exist, so this selects MortgageReel only.
// --public-dir: where the media (recordings) lives when it is not in this
// checkout's public/ (a worktree); edit.json still comes from here.
// Bundles once per run into a temp dir with a minimal public/ (only the files
// calculateMetadata fetches, hard-linked), deleted at the end.
import { bundle } from "@remotion/bundler";
import { selectComposition } from "@remotion/renderer";
import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { dirname, join, resolve } from "node:path";
import { bundlerOverride } from "../bundler-override.mjs";
import { recordingPath } from "../src/mortgage/recording.ts";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const dirAt = args.indexOf("--public-dir");
const slug = args.find((a, i) => !a.startsWith("--") && (dirAt < 0 || i !== dirAt + 1));
const pub = resolve(dirAt >= 0 ? args[dirAt + 1] : join(ROOT, "public"));
const fail = (msg) => {
  console.error(String(msg).split("\n").slice(0, 5).join("\n"));
  process.exitCode = 1;
};

const tmp = repoTmp("check-schema-");
try {
  if (!slug) throw new Error("Usage: node scripts/check-schema.mjs <slug> [--public-dir <dir>]");
  // This checkout's edit.json; failing that, the --public-dir one (a fixture: scripts/check-preflight.mjs).
  const editPath = [join(ROOT, "public"), pub].map((d) => join(d, "videos", slug, "edit.json")).find(existsSync) ?? join(ROOT, "public", "videos", slug, "edit.json");
  if (!existsSync(editPath)) throw new Error(`No edit.json for "${slug}" (${editPath}).`);
  const edit = JSON.parse(readFileSync(editPath, "utf8"));
  // What calculateMetadata fetches; a missing one stays missing so it reports it.
  const wanted = [
    recordingPath(slug, edit.source, "words.json"),
    recordingPath(slug, edit.source, "foreground.webm"),
    ...(edit.visuals ?? []).flatMap((v) => (typeof v.asset === "string" ? [v.asset] : [])),
  ];
  const place = (from, rel) => {
    const to = join(tmp, "public", rel);
    mkdirSync(dirname(to), { recursive: true });
    try {
      linkSync(from, to);
    } catch {
      copyFileSync(from, to);
    }
  };
  place(editPath, `videos/${slug}/edit.json`);
  for (const rel of wanted) {
    const from = [join(pub, rel), join(ROOT, "public", rel)].find(existsSync);
    if (from) place(from, rel);
  }
  const serveUrl = await bundle({
    entryPoint: join(ROOT, "src", "index.ts"),
    rspack: true,
    bundlerOverride,
    outDir: join(tmp, "bundle"),
    publicDir: join(tmp, "public"),
  });
  const c = await selectComposition({ serveUrl, id: "MortgageReel", inputProps: { slug }, logLevel: "error" });
  console.log(`MortgageReel ${slug}: ${c.durationInFrames} frames (${(c.durationInFrames / c.fps).toFixed(1)} s)`);
} catch (err) {
  // The renderer keeps only the first line in .message; the zod paths are in
  // .stack, before the frames ("    at ...").
  const text = err instanceof Error ? (err.stack ?? err.message) : String(err);
  const lines = text.split("\n");
  const end = lines.findIndex((l) => /^ {4}at /.test(l));
  fail(lines.slice(0, end < 0 ? undefined : end).join("\n").replace(/^(Error: )+/, ""));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
