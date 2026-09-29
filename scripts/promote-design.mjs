// Promotes a design to a reusable template once it is proven (WP7). Checks, and
// names every failure at once:
//   lint · registered in src/designs/index.ts · template.json fields (the list
//   select-template.mjs reads) · a preview still · a Mode A and a Mode B still
//   where facePolicy allows · every hard-coded string in `copy` and RG 234-clean ·
//   brand colours only (a literal must be white/black at any alpha or a colour
//   src/brand/theme.ts defines, unless the line says `// theme-exempt: <why>`) ·
//   text colour on its own background at WCAG 3.0 or better (check-contrast.mjs).
// Only when all pass: template.json gets "promoted": "<YYYY-MM-DD>", uses 0,
// lastUsed null (and the preview path), and the selector's pool is re-read to
// confirm the design is in it. The selector ranks promoted designs first.
//   node scripts/promote-design.mjs <id> [--public-dir <dir>] [--designs-dir <dir>] [--skip-lint] [--dry-run]
// --dry-run runs every check and writes nothing. --public-dir is read only (the stills read edit.json there; the design is forced
// with the `design` prop, so nothing is written into it). --designs-dir and
// --skip-lint exist for scripts/check-promote.mjs; renders need the real registry,
// so they are skipped under --designs-dir.
import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { COLOUR, checkDesign, describe as describeContrast, hexOf } from "./check-contrast.mjs";
import { MANIFEST_FIELDS, OPTIONAL_FIELDS, loadManifests } from "./select-template.mjs";

const root = join(import.meta.dirname, "..");
const REPO_DESIGNS = join(root, "src", "designs");
const FIXTURES = { A: "ty-do", B: "faceless-test" }; // a talking-head and a faceless slug
const MODES = {
  "face-required": ["A"],
  "face-optional": ["A", "B"],
  faceless: ["B"],
};
const PREVIEW_FRAME = 120; // hook + captions
const MODE_FRAME = 400; // a figure is up in ty-do
const tail = (s, n = 4) => String(s ?? "").trim().split("\n").slice(-n).join(" | ");

const { assertCompliantCopy } = await import(pathToFileURL(join(root, "src", "mortgage", "compliance.ts")).href);

// Wrong or missing fields, checked against the selector's own list.
export const manifestProblems = (t, id) => {
  const out = [];
  const ok = (v, spec) => {
    if (Array.isArray(spec)) return spec.includes(v);
    if (typeof spec === "object") return v && typeof v === "object" && Object.entries(spec).every(([k, s]) => ok(v[k], s));
    return spec.split("|").some((s) =>
      s === "null" ? v === null
      : s === "string[]" ? Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string")
      : s === "object" ? v && typeof v === "object" && !Array.isArray(v)
      : typeof v === s);
  };
  for (const [k, spec] of Object.entries(MANIFEST_FIELDS)) {
    // Promotion sets these, so a new manifest may leave them out.
    if (!(k in t)) {
      if (!OPTIONAL_FIELDS.includes(k)) out.push(`missing field "${k}"`);
    } else if (!ok(t[k], spec)) out.push(`field "${k}" should be ${JSON.stringify(spec)}, is ${JSON.stringify(t[k])}`);
  }
  if (t.id !== undefined && t.id !== id) out.push(`field "id" is "${t.id}", folder is "${id}"`);
  return out;
};

// Code with comments blanked (newlines kept, so line numbers still match).
// ponytail: regex, not a parser; a "//" after ':' or a quote is kept so URLs survive.
const uncomment = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// ponytail: heuristic — viewer text is Vietnamese (README rule), so a string
// literal with a non-ASCII letter, or JSX text, counts as hard-coded copy.
// Upgrade to a TS AST walk if it misses or over-flags.
export const hardCodedStrings = (code) => {
  const found = new Set();
  for (const [, , s] of code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g))
    if (!s.includes("${") && /[^\x00-\x7F]/.test(s) && /\p{L}/u.test(s)) found.add(s.trim());
  // A tag's closing ">" touches its tag or starts a line; a comparison ">" has a space before it.
  for (const [, s] of code.matchAll(/(?<![=-])(?:(?<=\S)|(?<=^[ \t]*))>([^<>{}]*)[<{]/gm))
    if (/\p{L}/u.test(s) && !/[();=]/.test(s)) found.add(s.trim());
  return [...found];
};

export { hexOf };
// Brand colours only: pure white/black at any alpha, or a colour src/brand/theme.ts defines.
const ALLOWED = new Set([
  "#ffffff",
  "#000000",
  ...[...readFileSync(join(root, "src", "brand", "theme.ts"), "utf8").matchAll(COLOUR)].map(([m]) => hexOf(m)),
]);

const designFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .map((f) => ({ name: f, text: readFileSync(join(dir, f), "utf8") }));

// The design's `copy`, read by bundling its folder (types stripped, packages external).
const loadCopy = (dir, id) => {
  const outDir = join(root, "out", "promote");
  mkdirSync(outDir, { recursive: true });
  const outfile = join(outDir, `${id}-design.mjs`);
  const entry = ["index.tsx", "index.ts"].map((f) => join(dir, f)).find(existsSync);
  if (!entry) throw new Error(`no index.tsx in ${relative(root, dir)}`);
  execFileSync(process.execPath, [
    join(root, "node_modules", "esbuild", "bin", "esbuild"), entry, "--bundle", "--format=esm",
    "--platform=node", "--packages=external", "--jsx=automatic", `--outfile=${outfile}`, "--log-level=error",
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`).then((m) => {
    const d = m[id] ?? Object.values(m).find((v) => v?.id === id);
    if (!d) throw new Error(`index does not export a Design with id "${id}"`);
    if (!Array.isArray(d.copy)) throw new Error(`the Design has no copy array`);
    return d.copy;
  });
};

const isRegistered = (designsDir, id) => {
  const reg = join(designsDir, "index.ts");
  if (!existsSync(reg)) return false;
  const src = readFileSync(reg, "utf8");
  const block = src.match(/const DESIGNS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  return (
    new RegExp(`import\\s*\\{\\s*${id}\\s*\\}\\s*from\\s*["']\\./${id}["']`).test(src) &&
    new RegExp(`^\\s*${id}\\s*[,:]`, "m").test(uncomment(block))
  );
};

const still = (id, slug, frame, out, publicDir) =>
  execFileSync(process.execPath, [
    join(root, "node_modules", "@remotion", "cli", "remotion-cli.js"), "still", "src/index.ts", "MortgageReel", out,
    `--props=${JSON.stringify({ slug, design: id })}`, `--frame=${frame}`, "--scale=0.5", "--gl=angle",
    `--public-dir=${publicDir}`,
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

/** Runs every check; returns { failures, notes, promoted }. */
export async function promote(id, opts = {}) {
  const designsDir = opts.designsDir ?? REPO_DESIGNS;
  const publicDir = opts.publicDir ?? join(root, "public");
  const dir = join(designsDir, id);
  const failures = [];
  const notes = [];
  const fail = (check, why) => failures.push(`${check}: ${why}`);
  if (!/^[a-z][a-z0-9-]*$/.test(id)) fail("id", `"${id}" must be lowercase letters, digits, hyphens`);
  else if (!existsSync(dir)) fail("folder", `${dir} does not exist`);
  if (failures.length) {
    return { failures, notes, promoted: false };
  }

  if (opts.skipLint) notes.push("lint skipped (--skip-lint)");
  else {
    try {
      execSync("npm run lint", { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      fail("lint", `npm run lint failed: ${tail(e.stdout) || tail(e.stderr)}`);
    }
  }

  const registered = isRegistered(designsDir, id);
  if (!registered) fail("registered", `"${id}" is not imported and listed in DESIGNS in ${relative(root, join(designsDir, "index.ts"))}`);

  const manifestPath = join(dir, "template.json");
  let t = null;
  if (!existsSync(manifestPath)) fail("template.json", `${relative(root, manifestPath)} does not exist`);
  else {
    try {
      t = JSON.parse(readFileSync(manifestPath, "utf8"));
      for (const p of manifestProblems(t, id)) fail("template.json", p);
    } catch (e) {
      fail("template.json", `not valid JSON (${e.message})`);
    }
  }

  // Stills: the preview, then one per mode facePolicy allows.
  const modes = MODES[t?.facePolicy];
  const previewAt = t?.preview && (isAbsolute(t.preview) ? t.preview : join(root, t.preview));
  let renderedPreview = null;
  if (t?.preview && !existsSync(previewAt)) fail("preview", `template.json preview "${t.preview}" does not exist`);
  const canRender = designsDir === REPO_DESIGNS && registered && modes;
  if (!canRender) {
    const why = designsDir !== REPO_DESIGNS ? "--designs-dir is not the repo's src/designs"
      : !registered ? "the design is not registered" : "facePolicy is not valid";
    notes.push(`stills skipped: ${why}`);
    if (designsDir === REPO_DESIGNS) fail("stills", `cannot render: ${why}`);
  } else {
    const outDir = join(root, "out", "promote");
    mkdirSync(outDir, { recursive: true });
    for (const m of ["A", "B"]) {
      const slug = FIXTURES[m];
      if (!modes.includes(m)) {
        notes.push(`Mode ${m} (${slug}) skipped: facePolicy "${t.facePolicy}" forbids it`);
        continue;
      }
      if (!existsSync(join(publicDir, "videos", slug, "edit.json"))) {
        fail(`still ${m}`, `fixture ${slug} has no edit.json in ${publicDir}/videos`);
        continue;
      }
      const out = join(outDir, `${id}-${m}.png`);
      try {
        still(id, slug, MODE_FRAME, out, publicDir);
        notes.push(`Mode ${m} still: ${relative(root, out)}`);
      } catch (e) {
        fail(`still ${m}`, `${slug} frame ${MODE_FRAME} did not render: ${tail(e.stderr) || tail(e.stdout)}`);
      }
      if (!t.preview && !renderedPreview) {
        const pv = join(outDir, `${id}-preview.png`);
        try {
          still(id, slug, PREVIEW_FRAME, pv, publicDir);
          renderedPreview = pv;
          notes.push(`preview rendered: ${relative(root, pv)} (kept in the design folder only if promoted)`);
        } catch (e) {
          fail("preview", `${slug} frame ${PREVIEW_FRAME} did not render: ${tail(e.stderr) || tail(e.stdout)}`);
        }
      }
    }
  }

  // Copy: every hard-coded string listed, and RG 234-clean.
  const files = designFiles(dir);
  let copy = [];
  try {
    copy = await loadCopy(dir, id);
  } catch (e) {
    fail("copy", `could not read the design's copy: ${tail(e.stderr) || e.message}`);
  }
  for (const f of files)
    for (const s of hardCodedStrings(uncomment(f.text)))
      if (!copy.some((c) => c.includes(s))) fail("copy", `${f.name}: "${s}" is on screen but not in copy`);
  try {
    assertCompliantCopy({ [`design:${id}`]: copy });
  } catch (e) {
    for (const line of e.message.split("\n").filter((l) => l.includes(`design:${id}:`))) fail("RG 234", line.trim());
  }

  // Colours: brand only (theme.ts values, white, black).
  for (const f of files) {
    const raw = f.text.split("\n");
    uncomment(f.text).split("\n").forEach((code, i) => {
      if (/theme-exempt:\s*\S/.test(raw[i])) return;
      for (const [m] of code.matchAll(COLOUR))
        if (!ALLOWED.has(hexOf(m)))
          fail("colours", `${f.name}:${i + 1} off-brand colour \`${m}\`: use a src/brand/theme.ts colour, white or black, or add // theme-exempt: <why>`);
    });
  }

  // Contrast: text on its own background reaches 3.0 (scripts/check-contrast.mjs).
  for (const p of checkDesign(dir)) {
    if (p.level === "fail") fail("contrast", describeContrast(p));
    else notes.push(`contrast: ${describeContrast(p)}`);
  }

  if (failures.length) return { failures, notes, promoted: false };
  if (opts.dryRun) {
    notes.push("dry run: every check passed, nothing written");
    return { failures, notes, promoted: false };
  }

  // Promote.
  if (renderedPreview) {
    const dest = join(dir, "preview.png");
    copyFileSync(renderedPreview, dest);
    t.preview = relative(root, dest).replace(/\\/g, "/");
  }
  t.uses = 0;
  t.lastUsed = null;
  t.promoted = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local (Sydney) date
  delete t.promotedNote; // a grandfather note no longer applies once it has passed
  writeFileSync(manifestPath, `${JSON.stringify(t, null, 2)}\n`);
  const pooled = loadManifests(designsDir).find((m) => m.id === id);
  if (!pooled) fail("pool", `select-template.mjs loadManifests() does not list "${id}"`);
  else for (const p of manifestProblems(pooled, id)) fail("pool", p);
  if (!failures.length) notes.push(`in the selector pool (${loadManifests(designsDir).length} templates)`);
  return { failures, notes, promoted: !failures.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  const id = args[0];
  if (!id || id.startsWith("--")) {
    console.error("Usage: node scripts/promote-design.mjs <id> [--public-dir <dir>] [--designs-dir <dir>] [--skip-lint] [--dry-run]");
    process.exit(1);
  }
  const { failures, notes } = await promote(id, {
    publicDir: flag("--public-dir"),
    designsDir: flag("--designs-dir"),
    skipLint: args.includes("--skip-lint"),
    dryRun: args.includes("--dry-run"),
  });
  for (const n of notes) console.log(`note ${n}`);
  for (const f of failures) console.log(`FAIL ${f}`);
  if (failures.length) {
    console.log(`promote ${id}: NOT promoted, ${failures.length} failed check(s)`);
    process.exit(1);
  }
  console.log(args.includes("--dry-run") ? `promote ${id}: would promote (dry run)` : `promote ${id}: promoted (promoted today, uses 0, lastUsed null)`);
}
