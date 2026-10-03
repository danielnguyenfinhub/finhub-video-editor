// What did a change do to how the designs look, by pixels: the same stills of the same designs
// from two trees (before: a git ref; after: a ref or the working tree), compared frame by frame.
//
//   node scripts/stills-diff.mjs <slug> [--before <ref>] [--after <ref>|work] [--designs a,b | --family f | --family all]
//     [--frames 90,190] [--out out/stills-diff/<slug>] [--sandbox] [--threshold 0] [--fail-on-diff] [--scale 0.5]
//   (--selftest: pairs, comparison on synthetic PNGs, threshold, table, pages, args, the archived tree)
//
// Default --before: origin/main, or HEAD~1 when HEAD is origin/main; --after: work (the working
// tree, uncommitted edits included). A ref is extracted with `git archive` (src, public, config and
// the bundler files) into the repo tmp dir (tmp-dir.mjs) with node_modules linked (a junction on
// Windows, no admin needed) and the slug's git-ignored media linked from this checkout, so both trees
// render the same recording. Frames: review-pack's picker (the video's own hook, year card, first
// cue), 3 per design (first, middle, last of its picks). Designs: the four 9:16 families (or --designs / --family). One bundle per tree,
// one browser. Picture: as review-pack (the real recording when it is here, else the sandbox picture).
// A pair is "same" when its files hash equal or at most --threshold % of pixels changed by more than
// TOL; else "differs" with that %. Writes, under --out (emptied first, inside out/): before/, after/,
// diff/ (difference x8), sheet-NN.jpg of differing frames only (before | after | diff), diff.md and
// diff.html. Exit 0 unless --fail-on-diff and a frame differs or failed.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { reelOf } from "./check-golden.mjs";
import { missingMedia } from "./promote-design.mjs";
import { missingLinks, pickFrames } from "./review-pack.mjs";
import { browserArgs, scratchPublic } from "./scratch-public.mjs";
import { contactSheets, evenIndices, outDirProblem } from "./sweep-render.mjs";
import { repoTmp } from "./tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");
const FAMILIES = ["talkinghead-data", "talkinghead-story", "faceless-data", "faceless-explainer"];
const TREE_PATHS = ["src", "public", "config", "bundler-override.mjs", "package.json", "tsconfig.json"];
export const TOL = 8; // ponytail: a channel off by <= 8/255 is render noise, not a change; raise it if identical code shows "differs"
const USAGE = "usage: node scripts/stills-diff.mjs <slug> [--before ref] [--after ref|work] [--designs a,b | --family f|all] [--frames 90,190] [--out dir] [--sandbox] [--threshold 0] [--fail-on-diff] [--scale 0.5]";

const git = (args, cwd = ROOT) => {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** Every (design, frame) pair, with its three image paths relative to the out folder. */
export const pairList = (framesOf) => Object.entries(framesOf).flatMap(([id, frames]) => frames.map((frame) => {
  const f = `f${String(frame).padStart(4, "0")}.png`;
  return { id, frame, before: `before/${id}/${f}`, after: `after/${id}/${f}`, diff: `diff/${id}-${f}` };
}));

/** "same" | "differs" | "failed" for a comparison ({ error } or { pct }: % of pixels changed). */
export const classify = (c, threshold = 0) => (c.error ? "failed" : c.pct > threshold ? "differs" : "same");

const png = (file) => {
  const b = readFileSync(file);
  return { hash: createHash("sha256").update(b).digest("hex"), w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const rgba = (file) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg could not read ${file}`);
  return r.stdout;
};

/** % of pixels whose any channel moved more than TOL; 0 without decoding when the files are equal. */
export const compareImages = (a, b) => {
  for (const f of [a, b]) if (!existsSync(f)) return { error: `no ${f}` };
  const [pa, pb] = [png(a), png(b)];
  if (pa.hash === pb.hash) return { pct: 0, identical: true };
  if (pa.w !== pb.w || pa.h !== pb.h) return { pct: 100, note: `size ${pa.w}x${pa.h} -> ${pb.w}x${pb.h}` };
  const [x, y] = [rgba(a), rgba(b)];
  let changed = 0;
  for (let i = 0; i < x.length; i += 4)
    if (Math.abs(x[i] - y[i]) > TOL || Math.abs(x[i + 1] - y[i + 1]) > TOL || Math.abs(x[i + 2] - y[i + 2]) > TOL || Math.abs(x[i + 3] - y[i + 3]) > TOL) changed++;
  return { pct: (100 * changed) / (pa.w * pa.h) };
};

/** The difference of two stills, x8 so a thin change shows. */
const diffImage = (a, b, out) => spawnSync("ffmpeg", ["-v", "error", "-y", "-i", a, "-i", b, "-filter_complex",
  "[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]blend=all_mode=difference,lutrgb=r='min(255,val*8)':g='min(255,val*8)':b='min(255,val*8)'", "-frames:v", "1", out]).status === 0;

/** Why --out may not be cleared: only a missing or empty folder, or one a stills diff wrote (it has diff.md), is. */
export const clearProblem = (dir) =>
  existsSync(dir) && readdirSync(dir).length && !existsSync(join(dir, "diff.md")) ? `${dir} is not empty and is not a stills-diff folder: pick another --out` : null;

/** The rows that go on the contact sheet: differing, with a diff image to show. */
export const sheetRows = (rows) => rows.filter((r) => r.status === "differs" && !r.diffFailed);

/** 1 when --fail-on-diff and any frame differs or failed. */
export const exitFor = (rows, failOnDiff) => (failOnDiff && rows.some((r) => r.status !== "same") ? 1 : 0);

const score = (r) => (r.status === "failed" ? r.error : r.status === "same" ? (r.identical ? "same" : r.pct === 0 ? "same (pixels within noise)" : `same (${r.pct.toFixed(4)}%)`) : `differs (${r.pct.toFixed(4)}% of pixels${r.note ? `, ${r.note}` : ""})`);
export const summary = (rows) => `${rows.filter((r) => r.status === "differs").length} of ${rows.length} frames differ${rows.some((r) => r.status === "failed") ? `, ${rows.filter((r) => r.status === "failed").length} failed` : ""}`;

/** The printed table: design, frame, result. */
export const formatTable = (rows) => {
  const w = Math.max(6, ...rows.map((r) => r.id.length));
  return [`${"design".padEnd(w)}  frame  result`, ...rows.map((r) => `${r.id.padEnd(w)}  ${String(r.frame).padStart(5)}  ${score(r)}`), summary(rows)].join("\n");
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const byDesign = (rows) => Object.entries(Object.groupBy(rows, (r) => r.id));
const unchanged = (rows) => byDesign(rows).filter(([, rs]) => rs.every((r) => r.status === "same")).map(([id]) => id);
const changed = (rows) => byDesign(rows).filter(([, rs]) => rs.some((r) => r.status !== "same"));

/** diff.html: identical designs on one line, each differing frame as before | after | diff. */
export const buildHtml = (p) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>Stills diff ${esc(p.slug)}</title>
<style>body{font:16px/1.45 system-ui,sans-serif;max-width:1300px;margin:auto;padding:1em}.row{display:flex;gap:8px}.row figure{margin:0;flex:1}img{width:100%;border:1px solid GrayText}</style></head><body>
<h1>Stills diff: ${esc(p.slug)}</h1>
<p>${esc(p.before)} &rarr; ${esc(p.after)}${p.sandbox ? " (SANDBOX PICTURE: no face)" : ""}. ${esc(summary(p.rows))}.</p>
<p><strong>Same:</strong> ${esc(unchanged(p.rows).join(", ") || "none")}</p>
${changed(p.rows).map(([id, rs]) => `<h2>${esc(id)}</h2>${rs.filter((r) => r.status !== "same").map((r) => r.status === "failed" ? `<p>frame ${r.frame}: <strong>failed</strong> ${esc(r.error)}</p>`
  : `<p>frame ${r.frame}: ${esc(score(r))}</p><div class="row">${["before", "after", "diff"].map((k) => `<figure><a href="${r[k]}"><img src="${r[k]}" alt="${id} ${r.frame} ${k}"></a><figcaption>${k}</figcaption></figure>`).join("")}</div>`).join("\n")}`).join("\n")}
</body></html>
`;

/** diff.md: the same as text. */
export const buildMd = (p) => [`# Stills diff: ${p.slug}`, "", `${p.before} -> ${p.after}${p.sandbox ? " (SANDBOX PICTURE: no face)" : ""}. ${summary(p.rows)}.`, "",
  `Same: ${unchanged(p.rows).join(", ") || "none"}`,
  ...changed(p.rows).flatMap(([id, rs]) => ["", `## ${id}`, ...rs.filter((r) => r.status !== "same").map((r) => (r.status === "failed" ? `- frame ${r.frame}: failed, ${r.error}`
    : `- frame ${r.frame}: ${score(r)}: [before](${r.before}) | [after](${r.after}) | [diff](${r.diff})`))]), ""].join("\n");

const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
export const parseDiffArgs = (args) => {
  let o, positionals;
  try {
    ({ values: o, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
      before: { type: "string" }, after: { type: "string", default: "work" }, designs: { type: "string" }, family: { type: "string" }, frames: { type: "string" },
      out: { type: "string" }, sandbox: { type: "boolean", default: false }, threshold: { type: "string", default: "0" },
      "fail-on-diff": { type: "boolean", default: false }, scale: { type: "string", default: "0.5" } } }));
  } catch (e) {
    throw new Error(`${e.message}\n${USAGE}`);
  }
  const [slug, ...extra] = positionals;
  const frames = list(o.frames);
  const bad = extra.length ? `unexpected argument ${extra[0]}` : !/^[\w-]+$/.test(slug ?? "") ? "need <slug>"
    : o.family && o.designs ? "--family or --designs, not both"
    : list(o.family).some((f) => f !== "all" && !FAMILIES.includes(f)) ? `--family ${o.family}: one of ${FAMILIES.join(", ")}, all`
    : frames.some((f) => !/^\d+$/.test(f)) ? `--frames ${o.frames} is not a list of frame numbers`
    : !/^\d+(\.\d+)?$/.test(o.threshold) ? `--threshold ${o.threshold} is not a % of pixels`
    : !(Number(o.scale) > 0) ? `--scale ${o.scale} is not a positive number` : "";
  if (bad) throw new Error(`${bad}\n${USAGE}`);
  return { slug, before: o.before, after: o.after, designs: list(o.designs), families: list(o.family).includes("all") ? [] : list(o.family), frames: frames.map(Number),
    out: o.out ?? join("out", "stills-diff", slug), sandbox: o.sandbox, threshold: Number(o.threshold), failOnDiff: o["fail-on-diff"], scale: Number(o.scale) };
};

/** A git ref as a folder that bundles: TREE_PATHS from `git archive`, node_modules linked, and this
 * checkout's git-ignored files under public/videos/<slug> and public/recordings linked in. */
export const archiveTree = (ref, slug) => {
  const sha = git(["rev-parse", "--verify", `${ref}^{commit}`]);
  if (!sha) throw new Error(`${ref} is not a commit here${git(["rev-parse", "--is-shallow-repository"]) === "true" ? " (shallow clone: git fetch --unshallow)" : ""}`);
  const dir = repoTmp(`stills-diff-${sha.slice(0, 7)}-`);
  const tar = join(dir, "tree.tar");
  const paths = TREE_PATHS.filter((p) => git(["cat-file", "-e", `${sha}:${p}`]) !== null);
  if (spawnSync("git", ["archive", "-o", tar, sha, ...paths], { cwd: ROOT }).status !== 0 || spawnSync("tar", ["-xf", tar, "-C", dir]).status !== 0)
    throw new Error(`git archive ${ref} failed`);
  rmSync(tar);
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "junction");
  const ignored = (git(["ls-files", "-o", "-i", "--exclude-standard", "--", `public/videos/${slug}`, "public/recordings"]) ?? "").split("\n").filter(Boolean);
  for (const f of ignored) {
    if (existsSync(join(dir, f))) continue;
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    try {
      symlinkSync(join(ROOT, f), join(dir, f), "file");
    } catch {
      linkSync(join(ROOT, f), join(dir, f)); // Windows without symlink rights: a hard link (same drive), never a copy of a recording
    }
  }
  return { dir, sha };
};

const selftest = () => {
  const pairs = pairList({ classic: [90, 185], kinetic: [90] });
  assert.deepEqual(pairs.map((p) => [p.id, p.frame, p.before, p.after, p.diff]), [["classic", 90, "before/classic/f0090.png", "after/classic/f0090.png", "diff/classic-f0090.png"],
    ["classic", 185, "before/classic/f0185.png", "after/classic/f0185.png", "diff/classic-f0185.png"], ["kinetic", 90, "before/kinetic/f0090.png", "after/kinetic/f0090.png", "diff/kinetic-f0090.png"]]);
  // synthetic PNGs: identical bytes, same pixels in other bytes, one pixel, a big change, another size
  const dir = repoTmp("stills-diff-test-");
  const make = (name, filter, extra = []) => {
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=0x808080:s=64x64,${filter}`, "-frames:v", "1", ...extra, join(dir, name)]);
    if (r.status !== 0) throw new Error("ffmpeg is not on PATH: the comparison cases cannot run (install ffmpeg; not passed)");
    return join(dir, name);
  };
  const a = make("a.png", "format=rgba");
  const a2 = make("a2.png", "format=rgba");
  const a9 = make("a9.png", "format=rgba", ["-compression_level", "0"]);
  const noise = make("noise.png", `format=rgba,drawbox=x=3:y=3:w=1:h=1:color=0x868686:t=fill`); // 6/255: under TOL
  const one = make("one.png", "format=rgba,drawbox=x=10:y=10:w=1:h=1:color=white:t=fill");
  const rgb = make("rgb.png", "format=rgba,drawbox=x=1:y=1:w=1:h=1:color=0xA08080:t=fill,drawbox=x=2:y=1:w=1:h=1:color=0x80A080:t=fill,drawbox=x=3:y=1:w=1:h=1:color=0x8080A0:t=fill"); // +32 in one channel each
  const big = make("big.png", "format=rgba,drawbox=x=0:y=0:w=64:h=32:color=red:t=fill");
  const small = make("small.png", "format=rgba,scale=32:32");
  assert.deepEqual(compareImages(a, a2), { pct: 0, identical: true }, "same bytes: hash fast path");
  assert.notEqual(readFileSync(a9).length, readFileSync(a).length, "fixture: other bytes");
  assert.deepEqual(compareImages(a, a9), { pct: 0 }, "same pixels, other bytes: decoded, 0%");
  assert.deepEqual(compareImages(a, noise), { pct: 0 }, `a change of ${6} under TOL ${TOL} is noise`);
  const p1 = compareImages(a, one);
  assert.equal(p1.pct, 100 / 4096, "one pixel of 64x64");
  assert.equal(compareImages(a, rgb).pct, 300 / 4096, "a change of 32 in R, G or B alone counts");
  assert.equal(compareImages(a, big).pct, 50, "half the frame");
  assert.equal(compareImages(a, small).pct, 100, "another size differs fully");
  assert.ok(compareImages(a, join(dir, "none.png")).error, "a missing still is an error");
  // threshold: one pixel differs at 0, is same at 0.1 %; a big change differs at 0.1 %
  assert.equal(classify(p1, 0), "differs");
  assert.equal(classify(p1, 0.1), "same");
  assert.equal(classify({ pct: 50 }, 0.1), "differs");
  assert.equal(classify({ pct: 0, identical: true }, 0), "same");
  assert.equal(classify({ error: "x" }, 100), "failed");
  assert.ok(diffImage(a, big, join(dir, "d.png")) && existsSync(join(dir, "d.png")), "diff image written");
  // table and pages
  const rows = [{ ...pairs[0], status: "same", pct: 0, identical: true }, { ...pairs[1], status: "differs", pct: 1.5 }, { ...pairs[2], status: "same", pct: 0.0001 }];
  const t = formatTable(rows);
  assert.match(t, /^design\s+frame\s+result$/m);
  assert.match(t, /^classic\s+185\s+differs \(1\.5000% of pixels\)$/m);
  assert.match(t, /^kinetic\s+90\s+same \(0\.0001%\)$/m);
  assert.ok(t.endsWith("1 of 3 frames differ"), t);
  assert.equal(summary([...rows, { id: "x", frame: 1, status: "failed", error: "boom" }]), "1 of 4 frames differ, 1 failed");
  const page = { slug: "s", before: "abc", after: "work", sandbox: true, rows: [...rows, { id: "neon", frame: 90, status: "failed", error: "x <y>" }] };
  const html = buildHtml(page);
  assert.ok(html.includes("<strong>Same:</strong> kinetic</p>") && html.includes("x &lt;y&gt;") && !html.includes("f0090.png\"><img src=\"after/kinetic"), "same designs on one line, escaped, no images for same");
  for (const f of ["before/classic/f0185.png", "after/classic/f0185.png", "diff/classic-f0185.png"]) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), "");
  }
  assert.deepEqual(missingLinks(html, dir), [], "every link exists");
  assert.equal((html.match(/<img /g) ?? []).length, 3, "three images for the one differing frame");
  const md = buildMd(page);
  assert.ok(md.includes("Same: kinetic") && md.includes("- frame 185: differs") && md.includes("- frame 90: failed, x <y>") && !md.includes("frame 90: same"), md);
  // args
  assert.deepEqual(parseDiffArgs(["s", "--before", "abc", "--designs", "a, b", "--frames", "90,190", "--threshold", "0.5"]),
    { slug: "s", before: "abc", after: "work", designs: ["a", "b"], families: [], frames: [90, 190], out: join("out", "stills-diff", "s"), sandbox: false, threshold: 0.5, failOnDiff: false, scale: 0.5 });
  assert.deepEqual(parseDiffArgs(["s", "--family", "all"]).families, []);
  for (const s of ["", "s --family x", "s --family faceless-data --designs a", "s --threshold=-1", "s --threshold=abc", "s --frames 9x", "s t", "s --bogus"])
    assert.throws(() => parseDiffArgs(s.split(" ").filter(Boolean)), /usage:/, s);
  // an archived tree bundles: src, the bundler override and node_modules through the link
  const tree = archiveTree("HEAD", "rba-sept-2026");
  for (const f of ["src/index.ts", "bundler-override.mjs", "public/videos/rba-sept-2026/edit.json", "node_modules/remotion/package.json"])
    assert.ok(existsSync(join(tree.dir, f)), `archived tree has ${f}`);
  assert.throws(() => archiveTree("no-such-ref-xyz", "s"), /not a commit/);
  // --out is cleared only when empty, missing or ours; failed diffs stay off the sheet; the exit code
  const out = join(dir, "out");
  assert.equal(clearProblem(join(dir, "nope")), null);
  mkdirSync(out);
  assert.equal(clearProblem(out), null, "empty folder");
  writeFileSync(join(out, "03_verdict.json"), "x");
  assert.match(clearProblem(out), /not a stills-diff folder/, "someone else's files");
  writeFileSync(join(out, "diff.md"), "x");
  assert.equal(clearProblem(out), null, "our own earlier run");
  const rs = [{ status: "differs" }, { status: "differs", diffFailed: true }, { status: "same" }, { status: "failed" }];
  assert.equal(sheetRows(rs).length, 1);
  assert.equal(exitFor(rs, true), 1);
  assert.equal(exitFor(rs, false), 0);
  assert.equal(exitFor([{ status: "same" }], true), 0);
  assert.equal(exitFor([{ status: "same" }, { status: "failed" }], true), 1, "a failed still is not a pass");
  // a size mismatch gives no diff image (so the row must stay off the sheet)
  assert.equal(diffImage(a, small, join(dir, "d2.png")), false, "mismatched sizes make no diff image");
  console.log("stills-diff selftest ok");
};

const main = async () => {
  process.chdir(ROOT);
  const a = parseDiffArgs(process.argv.slice(2));
  const teams = JSON.parse(readFileSync(join(ROOT, "config", "style-teams.json"), "utf8")).teams;
  const ids = a.designs.length ? a.designs : (a.families.length ? a.families : FAMILIES).flatMap((f) => teams[f].styles);
  const unknown = ids.filter((id) => !FAMILIES.flatMap((f) => teams[f].styles).includes(id));
  if (unknown.length) throw new Error(`not a 9:16 design: ${unknown.join(", ")}`);
  const outDir = resolve(ROOT, a.out);
  const bad = outDirProblem(outDir, ROOT);
  if (bad) throw new Error(bad);

  const head = git(["rev-parse", "HEAD"]);
  const beforeRef = a.before ?? (git(["rev-parse", "origin/main"]) === head ? "HEAD~1" : "origin/main");
  const trees = [["before", beforeRef], ["after", a.after]].map(([side, ref]) => (ref === "work" ? { side, ref, dir: ROOT, label: "working tree" }
    : (() => { const t = archiveTree(ref, a.slug); return { side, ref, dir: t.dir, label: t.sha.startsWith(ref) ? ref : `${ref} (${t.sha.slice(0, 7)})` }; })()));
  const recordingHere = missingMedia(join(ROOT, "public"), a.slug).length === 0;
  const sandbox = a.sandbox || !recordingHere;
  if (sandbox && !a.sandbox) console.log(`${a.slug}: no recording here, so the SANDBOX PICTURE (no face)`);
  const words = JSON.parse(readFileSync(join(ROOT, "public", "videos", a.slug, "words.json"), "utf8"));
  const edit = JSON.parse(readFileSync(join(ROOT, "public", "videos", a.slug, "edit.json"), "utf8"));
  const picked = pickFrames(reelOf(words, edit)).map((x) => x.frame); // first, middle, last: the hook, a cue, the compare cue
  const frames = a.frames.length ? [...new Set(a.frames)].sort((x, y) => x - y) : evenIndices(picked.length, 3).map((i) => picked[i]);
  const pairs = pairList(Object.fromEntries(ids.map((id) => [id, frames])));
  console.log(`${trees[0].label} -> ${trees[1].label}: ${ids.length} designs x frames ${frames.join(", ")}`);

  const unsafe = clearProblem(outDir);
  if (unsafe) throw new Error(unsafe);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { bundle } = await import("@remotion/bundler");
  const { openBrowser, renderStill, selectComposition } = await import("@remotion/renderer");
  const flags = browserArgs(undefined, { search: sandbox });
  const flag = (k) => flags.find((f) => f.startsWith(`--${k}=`))?.slice(k.length + 3);
  const chromiumOptions = { gl: flag("gl") ?? "angle" };
  const browserExecutable = flag("browser-executable") ?? null;
  const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions, chromeMode: flag("chrome-mode"), logLevel: "error" });
  const failures = {}; // `${side} ${id}` -> why its stills are missing
  const t0 = Date.now();
  try {
    for (const tree of trees) {
      const publicDir = sandbox ? scratchPublic(a.slug, { publicDir: join(tree.dir, "public"), vignette: false }) : join(tree.dir, "public");
      const { bundlerOverride } = await import(pathToFileURL(join(tree.dir, "bundler-override.mjs")).href);
      const serveUrl = await bundle({ entryPoint: join(tree.dir, "src", "index.ts"), rootDir: tree.dir, rspack: true, bundlerOverride, publicDir, symlinkPublicDir: true,
        enableCaching: tree.dir === ROOT, outDir: repoTmp(`stills-diff-bundle-${tree.side}-`) });
      console.log(`${tree.side}: bundled ${tree.label} (${Math.round((Date.now() - t0) / 1000)} s)`);
      for (const id of ids) {
        try {
          if (!existsSync(join(tree.dir, "src", "designs", id))) throw new Error(`no design ${id} in ${tree.label}`);
          const inputProps = { slug: a.slug, design: id };
          const composition = await selectComposition({ serveUrl, id: "MortgageReel", inputProps, puppeteerInstance: browser, chromiumOptions, browserExecutable, logLevel: "error" });
          mkdirSync(join(outDir, tree.side, id), { recursive: true });
          for (const p of pairs.filter((x) => x.id === id))
            await renderStill({ serveUrl, composition, inputProps, frame: p.frame, output: join(outDir, p[tree.side]), scale: a.scale, puppeteerInstance: browser, chromiumOptions, browserExecutable, logLevel: "error" });
        } catch (e) {
          failures[`${tree.side} ${id}`] = `${tree.side}: ${String(e.message ?? e).split("\n")[0].slice(0, 200)}`;
          console.log(`${tree.side} ${id}: FAILED ${failures[`${tree.side} ${id}`]}`);
        }
      }
    }
  } finally {
    await browser.close({ silent: true });
  }

  mkdirSync(join(outDir, "diff"), { recursive: true });
  const rows = pairs.map((p) => {
    const why = failures[`before ${p.id}`] ?? failures[`after ${p.id}`];
    let c;
    try { c = why ? { error: why } : compareImages(join(outDir, p.before), join(outDir, p.after)); } catch (e) { c = { error: String(e.message).split("\n")[0] }; }
    const status = classify(c, a.threshold);
    const diffFailed = status === "differs" && !diffImage(join(outDir, p.before), join(outDir, p.after), join(outDir, p.diff));
    return { ...p, ...c, status, diffFailed };
  });
  console.log(formatTable(rows));
  const differ = sheetRows(rows);
  if (differ.length)
    contactSheets(differ.flatMap((r) => ["before", "after", "diff"].map((k) => ({ path: join(outDir, r[k]), label: `${r.id} ${r.frame} ${k}` }))), outDir, { cols: 3, rows: 4, tile: 360, name: "sheet" });
  const page = { slug: a.slug, before: trees[0].label, after: trees[1].label, sandbox, rows };
  writeFileSync(join(outDir, "diff.html"), buildHtml(page));
  writeFileSync(join(outDir, "diff.md"), buildMd(page));
  console.log(`wrote ${join(a.out, "diff.html")}, diff.md${differ.length ? ", sheet-NN.jpg" : ""} (${Math.round((Date.now() - t0) / 1000)} s)${sandbox ? ", SANDBOX PICTURE (no face)" : ""}`);
  process.exit(exitFor(rows, a.failOnDiff));
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--selftest") selftest();
  else main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
