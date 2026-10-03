// One review pack for Daniel: stills of each design at the frames that matter for one video,
// a strip per design, a contact sheet per style family, and review.html / review.md listing
// the exact frames and what to judge with his face in view; then, after he has looked, the
// promote-design commands (run only with --promote).
//
//   node scripts/review-pack.mjs <slug> [--family talkinghead-data,talkinghead-story] [--designs a,b]
//     [--frames 90,190] [--out out/review-pack/<slug>] [--sandbox] [--promote] [--scale 0.5]
//   (run from the repo root; --selftest: the frame picker, question table and page builder)
//
// Default: the two talking-head families. With the slug's recording here (source.mp4 and its
// cut-out, as promote-design checks) the stills are plain MortgageReel stills of the real
// picture. Without it, or with --sandbox, they take the production path with no face
// (scratch-public.mjs: navy picture, transparent cut-out; sandbox only, it uses symlinks).
// Frames per design come from the video itself (check-golden's figuresOf, its cues), at most 6.
// One bundle and one browser per run. --out is emptied first, so it must be inside out/.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { FPS, HOOK_FRAMES, TALK_START_FRAME, figuresOf, reelOf, saidKind, toOutMs } from "./check-golden.mjs";
import { missingMedia } from "./promote-design.mjs";
import { browserArgs, scratchPublic } from "./scratch-public.mjs";
import { contactSheets, outDirProblem } from "./sweep-render.mjs";
import { repoTmp } from "./tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");
const TILE = 540;
const MAX_FRAMES = 6;
const NEAR = 10; // frames this close show the same picture
const PACK_FAMILIES = ["talkinghead-data", "talkinghead-story", "faceless-data", "faceless-explainer"];
const USAGE = "usage: node scripts/review-pack.mjs <slug> [--family a,b | --designs a,b] [--frames 90,190] [--out dir] [--sandbox] [--promote] [--scale 0.5]";

// What Daniel judges per design, with his face in view (PR 128 "Needs Daniel" and the held
// items, PR 129 "Look", 13_viewed_critique_th-*). `frames`: extra video frames for that item.
export const QUESTIONS = {
  classic: { ask: ["Hook rays (HookBurst): does the burst band or its seam cross your eyes?"] },
  datalab: { ask: ["Hook counter: does it sit on your forehead or eyes (it is inside the face box)?", "Year card: is \"2026\" light blue for its first frames, and does that read?"] },
  newsroom: { ask: ["Hook: over your forehead?", "Stripes: do they leave a bare band beside you?"] },
  studio: { ask: ["Name tag at the handover (frame 190): does it sit over the crown of your head?"] },
  scenario: { ask: ["Divider: does it jump between frames (cuts), and does it run through the hook number?", "Year figure at the left: does it reach your face?"] },
  neon: { ask: ["Voice ring: does the dotted ring sit around you or across your face?"] },
  chatstory: { ask: ["Hook bubbles: are they on your eye line? Where should the bubbles sit?"] },
  editorial: { ask: ["Hook size: is \"4,35%\"-sized text big enough as the hook?", "Ghost FINANCE HUB watermark across the middle: keep or drop?", "Navy half-frame block around frame 190: a clean wipe or a fault?"] },
  explainer: { ask: ["Hook note: does the tilted yellow note cover your forehead and eyes?"] },
  reaction: { ask: ["Headline highlighter: one stroke per word, does it read as a highlight?", "Article card: clear of the logo and of your face?"] },
  kitchen: { frames: [60, 120], ask: ["Hook at 60 / 90 / 120: is it exact and solid by 90 (3 s), with its meaning line up?"] },
  series: { ask: ["Hook size: is the number on the amber strip big and readable enough?", "Year card (frame 190): inside your face?"] },
  cards: { ask: ["Year card: gold underline still under \"2026\", and an empty right half?"] },
  checklist: { ask: ["Hook: no \"0/0\" progress track when the video has no steps?"] },
  blueprint: { ask: ["Figure chip (only when a figure yields to a compare cue): under the title block, readable?"] },
  orbit: { ask: ["Chip moon (only when a figure yields to a compare cue): text size, does \"3.675 / đô\" wrap?"] },
};
// The held items Daniel must judge with his face (PR 128-131); the selftest needs a question for each.
export const HELD = ["classic", "datalab", "studio", "scenario", "neon", "chatstory", "editorial", "explainer", "reaction", "kitchen", "series"];
export const GENERIC = [
  "Hook exact by 3 s (frame 90): the number as written, solid, not mid-count.",
  "A year as said (\"2026\"): never counted, no meter, bar or ring under it.",
  "Logo clear: nothing under the logo tile, and it is not on your face.",
  "Bilingual line: the English line shows and reads (when the video has subtitles).",
];
// OD-12: the colour check fails these on any machine until Daniel adds the token (OD-21 correction).
export const OD12 = ["classic", "explainer", "studio"];
const PROMOTE_NOTE = { faceless: "needs faceless-test's stock footage on this machine" };

/** Video frames worth a look in this reel: the hook at 3 s, the design's extra frames, the first
 * year figure, the first points cue, the first compare/change cue, the hook handover, a steady
 * talk frame at 40%. Inside the talk, de-duplicated (within NEAR frames, labels merged), at most `max`, sorted. */
export const pickFrames = (reel, extra = [], max = MAX_FRAMES) => {
  const v = (talk) => TALK_START_FRAME + talk;
  const last = v(reel.timeline.talkFrames - 1);
  const cue = (kinds) => {
    for (const c of reel.edit.cues ?? []) {
      const ms = kinds.includes(c.kind) ? toOutMs(reel.timeline.segments, c.fromMs, FPS) : null;
      if (ms !== null) return v(Math.round((ms / 1000) * FPS) + 25); // past the drop-in, panel settled
    }
  };
  const year = figuresOf(reel, FPS).find((f) => saidKind(f.big) === "year");
  const picks = [
    [v(25), reel.edit.hook ? "hook at 3 s" : "talk at 3 s (no hook)"],
    ...extra.map((f) => [f, "held item"]),
    [year && v(year.fromFrame + 15), `year card "${year?.big}"`],
    [cue(["points"]), "first points cue"],
    [cue(["compare", "change"]), "compare / change cue"],
    [v(HOOK_FRAMES + 20), "hook handover, logo in"],
    [v(Math.round(reel.timeline.talkFrames * 0.4)), "steady talk (40%)"],
  ];
  const seen = new Map();
  for (const [f, what] of picks) {
    if (!Number.isInteger(f) || f < 0 || f > last) continue;
    const near = [...seen.keys()].find((k) => Math.abs(k - f) <= NEAR); // the same picture: one still, both labels
    if (near !== undefined) seen.set(near, `${seen.get(near)}; ${what}`);
    else if (seen.size < max) seen.set(f, what);
  }
  return [...seen].map(([frame, what]) => ({ frame, what })).sort((a, b) => a.frame - b.frame);
};

/** The promote-design step per design: a command, or null with the reason it cannot pass yet. */
export const promoteSteps = (ids) => ids.map((id) => (OD12.includes(id)
  ? { id, cmd: null, note: "not yet: OD-12 (its colour check fails on any machine until the palette token is decided)" }
  : { id, cmd: `node scripts/promote-design.mjs ${id}`, note: PROMOTE_NOTE[id] ?? "" }));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const tick = (q) => `<li><label><input type="checkbox"> ${esc(q)}</label></li>`;
const intro = (p) => p.sandbox
  ? "SANDBOX PICTURE: navy picture and a transparent cut-out, no face. Layout only; \"over the face\" means inside the face box (x 250-830, y 480-1250 full size)."
  : "Real recording: judge each question with your face in view.";

/** review.html for a pack: self-contained, relative links only (opens by double-click). */
export const buildHtml = (p) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark">
<title>Review pack ${esc(p.slug)}</title>
<style>body{font:16px/1.45 system-ui,sans-serif;max-width:1300px;margin:auto;padding:1em}img{max-width:100%;height:auto;border:1px solid GrayText}ul{list-style:none;padding-left:.5em}code,pre{font-size:15px}</style></head><body>
<h1>Review pack: ${esc(p.slug)}</h1>
<p>${esc(intro(p))} Click any picture for full size. Tick what passes; note what does not.</p>
<h2>Every design</h2><ul>${p.generic.map(tick).join("")}</ul>
${p.families.map((f) => `<h2>${esc(f.name)}</h2>${f.sheet ? `<a href="${f.sheet}"><img src="${f.sheet}" alt="${esc(f.name)} sheet"></a>` : ""}
${f.designs.map((d) => `<h3 id="${d.id}">${d.id}</h3>${d.error ? `<p><strong>Did not render:</strong> ${esc(d.error)}</p>` : `<a href="${d.strip}"><img src="${d.strip}" alt="${d.id} strip"></a>
<p>Frames: ${d.frames.map((x) => `<a href="${x.png}">${x.frame}</a> (${esc(x.what)})`).join(", ")}</p>`}
<ul>${d.ask.map(tick).join("")}</ul>`).join("\n")}`).join("\n")}
<h2>Promote (after you have looked)</h2>
<pre>${esc(p.promote.map((s) => s.cmd ?? `# ${s.id}: ${s.note}`).join("\n"))}</pre>
<p>Or all of them in order, stopping at the first failure: <code>node scripts/review-pack.mjs ${esc(p.args)} --promote</code></p>
</body></html>
`;

/** review.md: the same checklist as text. */
export const buildMd = (p) => [
  `# Review pack: ${p.slug}`, "", intro(p), "", "## Every design", ...p.generic.map((q) => `- [ ] ${q}`),
  ...p.families.flatMap((f) => ["", `## ${f.name}`, ...(f.sheet ? [`![${f.name}](${f.sheet})`] : []),
    ...f.designs.flatMap((d) => ["", `### ${d.id}`, d.error ? `Did not render: ${d.error}`
      : `Frames: ${d.frames.map((x) => `[${x.frame}](${x.png}) (${x.what})`).join(", ")}; strip ${d.strip}`,
    ...d.ask.map((q) => `- [ ] ${q}`)])]),
  "", "## Promote (after you have looked)", ...p.promote.map((s) => (s.cmd ? `- \`${s.cmd}\`${s.note ? ` (${s.note})` : ""}` : `- ${s.id}: ${s.note}`)),
  `- All in order, stopping at the first failure: \`node scripts/review-pack.mjs ${p.args} --promote\``, "",
].join("\n");

/** Relative files a page links to that are not in dir. */
export const missingLinks = (html, dir) =>
  [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((f) => !existsSync(join(dir, f)));

const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
export const parsePackArgs = (args) => {
  const { values: o, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
    family: { type: "string" }, designs: { type: "string" }, frames: { type: "string" }, out: { type: "string" },
    sandbox: { type: "boolean", default: false }, promote: { type: "boolean", default: false }, scale: { type: "string", default: "0.5" } } });
  const [slug, ...extra] = positionals;
  const frames = list(o.frames);
  const bad = extra.length ? `unexpected argument ${extra[0]}` : !/^[\w-]+$/.test(slug ?? "") ? "need <slug>"
    : o.family && o.designs ? "--family or --designs, not both"
    : frames.some((f) => !/^\d+$/.test(f)) ? `--frames ${o.frames} is not a list of frame numbers`
    : !(Number(o.scale) > 0) ? `--scale ${o.scale} is not a positive number`
    : o.promote && o.sandbox ? "--promote needs your real recording: a sandbox picture proves the layout, not the look" : "";
  if (bad) throw new Error(`${bad}\n${USAGE}`);
  return { slug, families: list(o.family), designs: list(o.designs), frames: frames.map(Number), out: o.out ?? join("out", "review-pack", slug),
    sandbox: o.sandbox, promote: o.promote, scale: Number(o.scale) };
};

const words = (slug) => JSON.parse(readFileSync(join(ROOT, "public", "videos", slug, "words.json"), "utf8"));
const editOf = (slug) => JSON.parse(readFileSync(join(ROOT, "public", "videos", slug, "edit.json"), "utf8"));

const selftest = () => {
  const reel = reelOf(words("rba-sept-2026"), editOf("rba-sept-2026"));
  const last = TALK_START_FRAME + reel.timeline.talkFrames - 1;
  const teams = JSON.parse(readFileSync(join(ROOT, "config", "style-teams.json"), "utf8")).teams;
  for (const id of PACK_FAMILIES.flatMap((f) => teams[f].styles)) {
    const fr = pickFrames(reel, QUESTIONS[id]?.frames).map((x) => x.frame);
    assert.ok(fr.length > 0 && fr.length <= MAX_FRAMES, `${id}: ${fr.length} frames`);
    assert.ok(fr.every((f, i) => i === 0 || f - fr[i - 1] > NEAR), `${id}: sorted, no two within ${NEAR} ${fr}`);
    assert.ok(fr.includes(TALK_START_FRAME + 25), `${id}: hook frame in ${fr}`);
    assert.ok(fr.every((f) => f >= 0 && f <= last), `${id}: inside the reel (${last}) ${fr}`);
  }
  const fr = pickFrames(reel).map((x) => x.frame);
  assert.deepEqual(fr, [90, 185, 324, 667, 839], "rba-sept-2026: hook, year card + handover, points, steady, compare");
  // a short reel: nothing past its end, the hook still in
  const short = reelOf(words("rba-sept-2026").slice(0, 12), { title: "t", hook: { big: "4,35%" } });
  const sf = pickFrames(short, [60, 120, 5000]).map((x) => x.frame);
  assert.ok(sf.includes(90) && sf.every((f) => f <= TALK_START_FRAME + short.timeline.talkFrames - 1), `short reel ${sf}`);
  for (const id of HELD) assert.ok(QUESTIONS[id]?.ask?.length, `${id} has its question`);
  assert.deepEqual(promoteSteps(["classic", "kinetic"]).map((s) => s.cmd), [null, "node scripts/promote-design.mjs kinetic"]);
  // every link in a built page exists, and a missing file is caught
  const dir = repoTmp("review-pack-test-");
  const d = (id) => ({ id, strip: `${id}/strip-01.jpg`, frames: [{ frame: 90, what: "hook", png: `${id}/f0090.png` }], ask: QUESTIONS[id].ask });
  const pack = { slug: "s", sandbox: true, args: "s", generic: GENERIC, promote: promoteSteps(["classic", "kitchen"]),
    families: [{ name: "fam", sheet: "sheet-fam-01.jpg", designs: [d("classic"), d("kitchen"), { id: "neon", error: "x <y>", ask: QUESTIONS.neon.ask }] }] };
  for (const f of ["sheet-fam-01.jpg", "classic/strip-01.jpg", "classic/f0090.png", "kitchen/strip-01.jpg", "kitchen/f0090.png"]) {
    mkdirSync(join(dir, f, ".."), { recursive: true });
    writeFileSync(join(dir, f), "");
  }
  const html = buildHtml(pack);
  assert.deepEqual(missingLinks(html, dir), [], "every link exists");
  assert.ok(html.includes("x &lt;y&gt;") && html.includes("SANDBOX PICTURE") && !html.includes("promote-design.mjs classic"), "escaped, sandbox note, no classic command");
  rmSync(join(dir, "kitchen", "f0090.png"));
  assert.deepEqual(missingLinks(html, dir), ["kitchen/f0090.png"], "a missing file is found");
  assert.ok(buildMd(pack).includes("- [ ] Hook at 60 / 90 / 120"), "md checklist");
  assert.throws(() => parsePackArgs(["s", "--sandbox", "--promote"]), /real recording/);
  assert.throws(() => parsePackArgs(["s", "--frames", "90,x"]), /usage:/);
  assert.deepEqual(parsePackArgs(["s", "--designs", "a, b", "--frames", "90,190"]).frames, [90, 190]);
  console.log("review-pack selftest ok");
};

const main = async () => {
  let a;
  try {
    a = parsePackArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const teams = JSON.parse(readFileSync(join(ROOT, "config", "style-teams.json"), "utf8")).teams;
  const fams = a.designs.length ? [["designs", a.designs]]
    : (a.families.length ? a.families : PACK_FAMILIES.slice(0, 2)).map((f) => {
      if (!PACK_FAMILIES.includes(f)) throw new Error(`--family ${f}: one of ${PACK_FAMILIES.join(", ")}`);
      return [f, teams[f].styles];
    });
  const known = PACK_FAMILIES.flatMap((f) => teams[f].styles);
  const unknown = fams.flatMap(([, ids]) => ids).filter((id) => !known.includes(id));
  if (unknown.length) throw new Error(`not a 9:16 design: ${unknown.join(", ")}`);
  const outDir = resolve(ROOT, a.out);
  const bad = outDirProblem(outDir, ROOT);
  if (bad) throw new Error(bad);

  const recordingHere = existsSync(join(ROOT, "public", "videos", a.slug, "edit.json")) && missingMedia(join(ROOT, "public"), a.slug).length === 0;
  const sandbox = a.sandbox || !recordingHere;
  if (sandbox && !a.sandbox) console.log(`${a.slug}: no recording here, so the SANDBOX PICTURE (no face)`);
  if (sandbox && a.promote) throw new Error("--promote needs the real recording here");
  const publicDir = sandbox ? scratchPublic(a.slug, { vignette: false }) : join(ROOT, "public");
  const reel = reelOf(words(a.slug), editOf(a.slug));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const { bundle } = await import("@remotion/bundler");
  const { openBrowser, renderStill, selectComposition } = await import("@remotion/renderer");
  const { bundlerOverride } = await import("../bundler-override.mjs");
  const flags = browserArgs(undefined, { search: sandbox });
  const flag = (k) => flags.find((f) => f.startsWith(`--${k}=`))?.slice(k.length + 3);
  const chromiumOptions = { gl: flag("gl") ?? "angle" }; // angle: as promote-design's stills on a PC
  const browserExecutable = flag("browser-executable") ?? null;
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: join(ROOT, "src", "index.ts"), rspack: true, bundlerOverride, publicDir, symlinkPublicDir: true, outDir: repoTmp("review-pack-bundle-") });
  const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions, chromeMode: flag("chrome-mode"), logLevel: "error" });
  console.log(`bundled in ${Math.round((Date.now() - t0) / 1000)} s${browserExecutable ? ` (${browserExecutable})` : ""}`);

  const blank = join(outDir, "blank.png");
  spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x808080:s=540x960", "-frames:v", "1", blank]);
  const families = [];
  let failed = 0;
  try {
    for (const [name, ids] of fams) {
      const designs = [];
      for (const id of ids) {
        const ask = QUESTIONS[id]?.ask ?? [];
        const frames = a.frames.length
          ? [...new Set(a.frames)].sort((x, y) => x - y).map((frame) => ({ frame, what: "--frames" }))
          : pickFrames(reel, QUESTIONS[id]?.frames);
        mkdirSync(join(outDir, id), { recursive: true });
        const t = Date.now();
        try {
          const inputProps = { slug: a.slug, design: id };
          const composition = await selectComposition({ serveUrl, id: "MortgageReel", inputProps, puppeteerInstance: browser, chromiumOptions, browserExecutable, logLevel: "error" });
          for (const x of frames) {
            x.png = `${id}/f${String(x.frame).padStart(4, "0")}.png`;
            if (x.frame >= composition.durationInFrames) throw new Error(`frame ${x.frame} is past the reel (${composition.durationInFrames} frames)`);
            await renderStill({ serveUrl, composition, inputProps, frame: x.frame, output: join(outDir, x.png), scale: a.scale, puppeteerInstance: browser, chromiumOptions, browserExecutable, logLevel: "error" });
          }
          contactSheets(frames.map((x) => ({ path: join(outDir, x.png), label: `${id} ${x.frame}` })), join(outDir, id), { cols: frames.length, rows: 1, tile: TILE, name: "strip" });
          designs.push({ id, frames, ask, strip: `${id}/strip-01.jpg` });
          console.log(`${id}: frames ${frames.map((x) => x.frame).join(", ")} (${Math.round((Date.now() - t) / 1000)} s)`);
        } catch (e) {
          failed++;
          const msg = String(e.message ?? e).split("\n")[0].slice(0, 300);
          designs.push({ id, ask, error: msg });
          console.log(`${id}: FAILED ${msg}`);
        }
      }
      // One row per design, padded with grey tiles so the frames line up by row.
      const rows = designs.filter((d) => !d.error);
      const cols = Math.max(0, ...rows.map((d) => d.frames.length));
      const tiles = rows.flatMap((d) => [...d.frames.map((x) => ({ path: join(outDir, x.png), label: `${d.id} ${x.frame}` })),
        ...Array(cols - d.frames.length).fill({ path: blank, label: "" })]);
      const sheet = rows.length ? `sheet-${name}-01.jpg` : null;
      if (sheet) contactSheets(tiles, outDir, { cols, rows: rows.length, tile: TILE, name: `sheet-${name}` });
      families.push({ name, sheet, designs });
    }
  } finally {
    await browser.close({ silent: true });
  }

  const ids = families.flatMap((f) => f.designs.map((d) => d.id));
  const args = [a.slug, ...(a.designs.length ? ["--designs", a.designs.join(",")] : a.families.length ? ["--family", a.families.join(",")] : [])].join(" ");
  const pack = { slug: a.slug, sandbox, args, generic: GENERIC, families, promote: promoteSteps(ids) };
  const html = buildHtml(pack);
  writeFileSync(join(outDir, "review.html"), html);
  writeFileSync(join(outDir, "review.md"), buildMd(pack));
  const missing = missingLinks(html, outDir);
  if (missing.length) throw new Error(`review.html links to missing files: ${missing.join(", ")}`);
  console.log(`wrote ${join(a.out, "review.html")} and review.md (${ids.length} designs, ${Math.round((Date.now() - t0) / 1000)} s)${sandbox ? ", SANDBOX PICTURE (no face)" : ""}`);
  console.log("After you have looked, promote with:");
  for (const s of pack.promote) console.log(s.cmd ? `  ${s.cmd}${s.note ? `   # ${s.note}` : ""}` : `  # ${s.id}: ${s.note}`);

  if (a.promote) {
    for (const s of pack.promote.filter((x) => x.cmd)) {
      const r = spawnSync(process.execPath, [join(ROOT, "scripts", "promote-design.mjs"), s.id], { cwd: ROOT, encoding: "utf8" });
      const log = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      const promoted = r.status === 0 && log.includes(`promote ${s.id}: promoted`) && !/INCOMPLETE|SKIPPED/.test(log);
      console.log(`${s.id}: ${promoted ? "promoted" : `NOT promoted (exit ${r.status})`}`);
      if (!promoted) {
        console.log(log.trim().split("\n").filter((l) => /FAIL|INCOMPLETE|SKIPPED|NOT promoted/.test(l)).slice(-6).join("\n"));
        console.log("stopped at the first failure; the rest were not run");
        process.exit(1);
      }
    }
  }
  if (failed) process.exit(1);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--selftest") selftest();
  else main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
