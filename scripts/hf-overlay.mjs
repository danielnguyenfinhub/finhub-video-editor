// HyperFrames (heygen-com/hyperframes, Apache-2.0) as an overlay generator:
// renders one HTML composition to a transparent WebM and files it in the
// source library as kind "motion-graphic", for an edit.json `visuals` entry
// with mode "motion". Remotion stays the only final renderer.
//
//   node scripts/hf-overlay.mjs <project-dir> --en "rate, cash rate" [--vi "lãi suất"] [--slug <slug>]
//
// Gates before the render: the composition is 1080x1920 (the reel frame), then
// `hyperframes lint` and `hyperframes check` must pass. Needs Node >= 22.
// Skill: .claude/skills/hyperframes-overlay/SKILL.md.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { add, LIBRARY } from "./library.mjs";
import { repoTmp } from "./tmp-dir.mjs";

// ponytail: pinned; bump after reading the release notes, at least two weeks after a release.
export const HF = "hyperframes@0.8.134";

const fail = (msg) => {
  console.error(`hf-overlay: ${msg}`);
  process.exit(1);
};

// The root composition's size, read from index.html; null when absent.
export const rootSize = (html) => {
  const root = html.match(/<[^>]*data-composition-id="[^"]*"[^>]*>/)?.[0] ?? "";
  const n = (a) => Number(root.match(new RegExp(`${a}="(\\d+)"`))?.[1]);
  return root ? { width: n("data-width"), height: n("data-height") } : null;
};

const list = (s) => (s ? s.split(",").map((w) => w.trim()).filter(Boolean) : []);

const hf = (cwd, ...args) => {
  // No usage telemetry leaves this machine (the CLI's own opt-out variables).
  const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", DO_NOT_TRACK: "1" };
  const r = spawnSync("npx", ["--yes", HF, ...args], { cwd, env, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) fail(`\`hyperframes ${args[0]}\` failed (exit ${r.status}); fix the composition, not the gate.`);
};

const main = (argv) => {
  const [dir, ...rest] = argv;
  const opt = (k) => {
    const i = rest.indexOf(`--${k}`);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  if (!dir) fail('usage: hf-overlay.mjs <project-dir> --en "keywords" [--vi "từ khóa"] [--slug <slug>]');
  if (Number(process.versions.node.split(".")[0]) < 22) fail(`HyperFrames needs Node >= 22 (this is ${process.version}).`);
  const project = resolve(dir);
  const html = join(project, "index.html");
  if (!existsSync(html)) fail(`${html} not found.`);
  const size = rootSize(readFileSync(html, "utf8"));
  if (size?.width !== 1080 || size?.height !== 1920)
    fail(`the root composition must be data-width="1080" data-height="1920" (found ${JSON.stringify(size)}).`);
  const en = list(opt("en"));
  if (!en.length) fail("--en keywords are required (they name the library file and let `find` reuse it).");

  hf(project, "lint");
  hf(project, "check");
  const out = join(repoTmp("hf-overlay"), "overlay.webm");
  hf(project, "render", "--format", "webm", "--output", out);

  const slug = opt("slug");
  const r = add(out, {
    kind: "motion-graphic",
    provider: "hyperframes",
    licence: "own (rendered locally with HyperFrames, Apache-2.0)",
    keywords: { en, vi: list(opt("vi")).map((w) => w.normalize("NFC")) },
    width: 1080,
    height: 1920,
    flags: { peopleIdentifiable: false, textInImage: true, logoPresent: null },
    usedIn: slug ? [slug] : [],
  });
  const asset = relative(join(LIBRARY, ".."), r.path).replace(/\\/g, "/");
  console.log(`${r.existed ? "already in library" : "added"}: ${asset}`);
  console.log(`edit.json: { "mode": "motion", "atMs": <source ms>, "durMs": <ms>, "asset": "${asset}" }`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (process.argv.includes("--selftest")) {
    const ok = (c, m) => c || fail(`selftest: ${m}`);
    ok(rootSize('<div id="root" data-composition-id="main" data-width="1080" data-height="1920">').height === 1920, "reads size");
    ok(rootSize('<div data-composition-id="m" data-width="1920" data-height="1080">').width === 1920, "landscape");
    ok(rootSize("<div id=root>") === null, "no root");
    console.log("hf-overlay selftest: ok");
  } else main(process.argv.slice(2));
}
