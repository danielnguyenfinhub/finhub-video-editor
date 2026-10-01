// Checks run before every render (render-video.py calls this), so a known
// failure stops the render instead of shipping. Errors block; warnings print.
//
//   node scripts/preflight.mjs [slug] [--public-dir <dir>]     (npm run preflight -- <slug>)
//
// --public-dir: where the media lives (as the check-* scripts take it); edit.json is this
// checkout's, or the one in <dir>/videos/<slug>/ when this checkout has none (a fixture).
//
// Fonts (what MortgageReel renders): Vietnamese captions need every font to carry the
// Vietnamese subset, or the marks fall back to another font mid-word. Idea
// from HyperFrames' deterministicFonts (fail closed instead of substituting).
// The video (with a slug): the edit.json mistakes the RBA video hit once, then
// check-schema (the render's own validation), check-speech-cuts and check-pacing.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

// --- Fonts ------------------------------------------------------------------
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs|js)$/.test(f) ? [p] : [];
  });
// What MortgageReel and ListingReel render; src/showcase is English demo reels.
const RENDERED = ["mortgage", "designs", "elements", "brand", "listing"].map((d) => join(ROOT, "src", d));
for (const file of RENDERED.filter(existsSync).flatMap(walk)) {
  // Comments often quote an import as an example; only real code counts.
  const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  const where = relative(ROOT, file).replace(/\\/g, "/");
  // import { loadFont } from "@remotion/google-fonts/Poppins" (maybe `as x`).
  // Only a file that loads the font counts; getInfo() alone draws nothing.
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@remotion\/google-fonts\/([A-Za-z0-9]+)"/g)) {
    const local = /\bloadFont(?:\s+as\s+(\w+))?/.exec(m[1]);
    if (!local) continue;
    const family = m[2];
    const { getInfo } = await import(`@remotion/google-fonts/${family}`);
    if (!getInfo().subsets.includes("vietnamese")) {
      errors.push(`${where}: ${family} has no Vietnamese subset; use Be Vietnam Pro (useReelFont) or a family that has one.`);
      continue;
    }
    const fn = local[1] ?? "loadFont";
    for (const call of code.matchAll(new RegExp(`\\b${fn}\\s*\\(([^)]*)\\)`, "g")))
      if (!/subsets\s*:\s*\[[^\]]*["']vietnamese["']/.test(call[1]))
        errors.push(`${where}: ${fn}(${call[1].trim()}) doesn't load the "vietnamese" subset; add subsets: ["vietnamese", ...].`);
  }
  for (const m of code.matchAll(/(?:from\s*|import\s*)"@fontsource\/([a-z0-9-]+)[^"]*"/g)) {
    const pkg = join(ROOT, "node_modules", "@fontsource", m[1]);
    if (existsSync(pkg) && !readdirSync(pkg).some((f) => f.startsWith("vietnamese")))
      errors.push(`${where}: @fontsource/${m[1]} has no Vietnamese subset.`);
  }
}

// --- The video --------------------------------------------------------------
const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--public-dir");
const pub = resolve(args.includes("--public-dir") ? args[args.indexOf("--public-dir") + 1] : join(ROOT, "public"));
const dir = [join(ROOT, "public"), pub].map((d) => join(d, "videos", slug ?? "")).find((d) => existsSync(join(d, "edit.json"))) ?? join(ROOT, "public", "videos", slug ?? "");
if (slug) {
  // edit.json stays in the slug folder; words.json lives with the recording
  // (src/mortgage/recording.ts, imported through Node's type stripping like export-srt.mjs).
  const { recordingPath } = await import(pathToFileURL(join(ROOT, "src", "mortgage", "recording.ts")).href);
  const editPath = join(dir, "edit.json");
  const source = existsSync(editPath) ? JSON.parse(readFileSync(editPath, "utf8")).source : undefined;
  const wordsRel = recordingPath(slug, source, "words.json");
  const wordsPath = [pub, join(ROOT, "public")].map((d) => join(d, wordsRel)).find(existsSync) ?? join(pub, wordsRel);
  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  if (!existsSync(editPath) || !existsSync(wordsPath))
    errors.push(`${relative(ROOT, dir).replace(/\\/g, "/")}: edit.json or ${relative(ROOT, wordsPath).replace(/\\/g, "/")} is missing.`);
  else {
    const edit = read(editPath);
    const words = read(wordsPath);
    const endMs = words.at(-1)?.endMs ?? 0;
    const inTalk = (ms, what) => {
      if (typeof ms === "number" && (ms < 0 || ms > endMs + 500))
        errors.push(`${what} at ${ms} ms is outside the talk (0-${endMs} ms).`);
    };
    const spans = [];
    (edit.cues ?? []).forEach((c, i) => {
      const what = `cues[${i}] (${c.kind})`;
      if (!(c.fromMs < c.toMs)) errors.push(`${what}: fromMs ${c.fromMs} is not before toMs ${c.toMs}.`);
      inTalk(c.fromMs, what);
      inTalk(c.toMs, what);
      // Beats inside the cue (items, cards, rows, question...) must fall in its span.
      for (const [, key, ms] of JSON.stringify(c).matchAll(/"(atMs|highlightAtMs|vsAtMs|strikeMs)":(\d+)/g))
        if (+ms < c.fromMs - 50 || +ms > c.toMs)
          warnings.push(`${what}: a ${key} (${ms}) falls outside the cue (${c.fromMs}-${c.toMs}); it won't show.`);
      if (c.kind === "compare")
        for (const card of c.cards ?? [])
          for (const r of card.rows ?? [])
            if (r.value.length > 8)
              warnings.push(`${what}: value "${r.value}" (> 8 characters) may run under the VS badge; move units into the label.`);
      spans.push([c.fromMs, c.toMs, what]);
    });
    (edit.stats ?? []).forEach((s, i) => {
      inTalk(s.atMs, `stats[${i}]`);
      if (s.big.length > 6)
        warnings.push(`stats[${i}]: "${s.big}" is long for a stat ring; keep the big text to a number or ≤ 6 characters.`);
      spans.push([s.atMs, s.atMs + s.durMs, `stats[${i}]`]);
    });
    spans.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++)
      if (spans[i][0] < spans[i - 1][1])
        errors.push(`${spans[i][2]} overlaps ${spans[i - 1][2]} on screen; keep top panels apart in time.`);
    for (const s of edit.subtitles ?? [])
      if (s.text.length > 140)
        warnings.push(`English line "${s.text.slice(0, 40)}…" is ${s.text.length} characters (over 3 lines); shorten it.`);
    if (edit.title && edit.title.split(/\s+/).length > 8) warnings.push(`title has more than 8 words: "${edit.title}".`);
    // A video built from a policy document shows the document's date on the end card.
    try {
      const { readLedger, oldestAsAt } = await import("./facts.mjs");
      const ledger = readLedger(dir);
      const want = ledger?.length ? oldestAsAt(ledger) : undefined;
      if (want && edit.compliance?.policyAsAt !== want)
        errors.push(`facts.json's oldest source is dated ${want}: set "compliance": {"policyAsAt": "${want}"} in edit.json so the end card shows it.`);
    } catch (err) {
      errors.push(String(err.message));
    }
    // Auto pacing plays segments at 0.9-1.2x and the render shifts Daniel's pitch and tone with
    // the speed (measured: +31% at 1.2x, -9% at 0.9x). Faceless voice-overs (script.json) are synthetic.
    if (edit.pacing?.mode !== "off" && !existsSync(join(dir, "script.json")))
      errors.push(`edit.json pacing is ${JSON.stringify(edit.pacing ?? "unset (auto)")}: it changes Daniel's pitch and tone. Set "pacing": {"mode": "off"}.`);
  }
}

// --- Schema, cuts and pacing ---------------------------------------------------
// A render is the slow step, so anything the data can already show stops it first:
// the schema, RG 234 and missing files as the render checks them (check-schema), real
// speech the timeline drops or clips (blocks) and gaps with no visual change (warns).
// Faceless videos (script.json) have no cuts in Daniel's speech. A check that crashes,
// is killed or exits with a usage error is not a pass: the render waits.
const run = (script, timeout) => spawnSync(process.execPath, ["--no-warnings", join(ROOT, "scripts", script), slug, "--public-dir", pub], { encoding: "utf8", cwd: ROOT, timeout });
const SCHEMA_TIMEOUT_S = 300; // a bundle and a browser start; a hung browser must not hold the render forever
const lines = (r) => (r.stderr || r.stdout || "").trim().split("\n").filter((l) => l.trim() && !/^Node\.js v/.test(l) && !/^\s+at /.test(l));
// A failed check's own words: from its "Error:" line if it has one, else its first lines.
const detail = (r) => {
  const l = lines(r), k = l.findIndex((x) => /^\w*Error\b/.test(x));
  return (r.error ? [r.error.message] : k >= 0 ? l.slice(k, k + 3) : l.slice(0, 5)).join("\n    ") || `exit ${r.status}`;
};
const why = (r) => r.error?.message ?? lines(r).find((l) => /^\w*Error\b/.test(l)) ?? lines(r).at(-1) ?? (r.signal ? `killed (${r.signal})` : `exit ${r.status}`);
const checked = slug && !errors.length; // each check below runs; every failure is listed
if (checked) {
  const schema = run("check-schema.mjs", SCHEMA_TIMEOUT_S * 1000);
  if (schema.error?.code === "ETIMEDOUT")
    errors.push(`check-schema did not finish in ${SCHEMA_TIMEOUT_S} s (its browser hung?) and was stopped, so the schema is unchecked.\n  Run node scripts/check-schema.mjs ${slug} to see where it stops.`);
  else if (schema.status !== 0)
    errors.push(`check-schema failed, so the render would too:\n    ${detail(schema)}\n  Fix it, then run node scripts/check-schema.mjs ${slug}.`);
}
if (checked && !existsSync(join(dir, "script.json"))) {
  const cuts = run("check-speech-cuts.mjs");
  const hits = cuts.status === 1 ? cuts.stdout.split("\n").filter((l) => l.startsWith("ERROR")) : [];
  if (hits.length) {
    for (const h of hits) errors.push(`speech cut: ${h.trim()}`);
    errors.push(`fix the ${hits.length} speech cut(s) above (node scripts/check-speech-cuts.mjs ${slug} shows the fix for each).`);
  } else if (cuts.status !== 0)
    errors.push(`check-speech-cuts could not run, so the speech cuts are unchecked: ${why(cuts).replace(/\.$/, "")}. Fix it, then run node scripts/check-speech-cuts.mjs ${slug}.`);
  const pace = run("check-pacing.mjs");
  if (pace.status === 2) warnings.push(`pacing: gaps with no visual change; see node scripts/check-pacing.mjs ${slug}.`);
  else if (pace.status !== 0)
    errors.push(`check-pacing could not run, so the pacing is unchecked:\n    ${detail(pace)}\n  Fix it, then run node scripts/check-pacing.mjs ${slug}.`);
}

for (const w of warnings) console.log(`preflight warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`preflight: ${e}`);
  console.error(`preflight: ${errors.length} problem(s); nothing was rendered.`);
  process.exit(1);
}
console.log(`preflight: OK${slug ? ` (${slug})` : ""}${warnings.length ? `, ${warnings.length} warning(s)` : ""}.`);
