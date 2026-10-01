// A MortgageReel still of a faceless video without its recording, for sessions that
// have no foreground.webm or source.mp4 (docs/agents/rendering-without-gpu.md).
//
//   node scripts/faceless-still.mjs <slug> <design> [--frame 150] [--scale 0.5] [--out out/stills/<design>.png]
//
// Reads public/videos/<slug> (edit.json, script.json, words.json), builds a scratch public
// folder in out/.tmp that links everything else in public/, sets "background": "vignette"
// (no matte needed) and adds a black VP9-in-MP4 placeholder source.mp4, which a headless
// shell decodes (it has no H.264). The repo is not touched. Needs ffmpeg and, here, an
// installed headless shell (FINHUB_BROWSER, else /opt/pw-browsers). Symlinks: not on Windows.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoTmp } from "./tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);
const [slug, design] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!slug || !design || !/^[\w-]+$/.test(slug) || !/^[\w-]+$/.test(design)) {
  console.error("usage: node scripts/faceless-still.mjs <slug> <design> [--frame 150] [--scale 0.5] [--out file.png]");
  process.exit(1);
}
const frame = flag("--frame", "150");
const scale = flag("--scale", "0.5");
const out = flag("--out", join("out", "stills", `${slug}-${design}.png`));

const video = join(ROOT, "public", "videos", slug);
for (const f of ["edit.json", "words.json"])
  if (!existsSync(join(video, f))) {
    console.error(`public/videos/${slug}/${f} is missing`);
    process.exit(1);
  }

// Scratch public dir: every public/ entry linked except videos/, then this one video copied.
const pub = repoTmp("faceless-still-");
for (const e of readdirSync(join(ROOT, "public"))) if (e !== "videos") symlinkSync(join(ROOT, "public", e), join(pub, e), "dir");
const dest = join(pub, "videos", slug);
mkdirSync(dest, { recursive: true });
cpSync(video, dest, { recursive: true });
const edit = JSON.parse(readFileSync(join(dest, "edit.json"), "utf8"));
writeFileSync(join(dest, "edit.json"), JSON.stringify({ ...edit, background: "vignette" }, null, 2));

const words = JSON.parse(readFileSync(join(dest, "words.json"), "utf8"));
const end = Math.max(0, ...(Array.isArray(words) ? words : words.words ?? []).map((w) => Number(w.endMs ?? w.end * 1000) || 0));
const seconds = Math.ceil(end / 1000) + 5;
const ff = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=black:s=540x960:r=30:d=${seconds}`, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", String(seconds), "-c:v", "libvpx-vp9", "-b:v", "50k", "-deadline", "realtime", "-cpu-used", "8", "-c:a", "libopus", "-f", "mp4", join(dest, "source.mp4")], { encoding: "utf8" });
if (ff.status !== 0) {
  console.error(`ffmpeg could not make the placeholder source.mp4: ${(ff.stderr || ff.error?.message || "").trim().split("\n").pop()}`);
  process.exit(1);
}

const shells = existsSync("/opt/pw-browsers") ? readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium_headless_shell-")) : [];
const shell = process.env.FINHUB_BROWSER ?? shells.flatMap((v) => readdirSync(join("/opt/pw-browsers", v)).map((s) => join("/opt/pw-browsers", v, s, "headless_shell"))).find(existsSync);
const browser = shell ? ["--gl=swangle", "--chrome-mode=headless-shell", `--browser-executable=${shell}`] : [];
mkdirSync(join(ROOT, out, ".."), { recursive: true });
const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@remotion/cli/remotion-cli.js"), "still", "src/index.ts", "MortgageReel", out, `--public-dir=${pub}`, `--props=${JSON.stringify({ slug, design })}`, `--frame=${frame}`, `--scale=${scale}`, ...browser], { cwd: ROOT, encoding: "utf8" });
if (r.status !== 0) {
  const lines = `${r.stdout}${r.stderr}`.trim().split("\n");
  console.error(`still failed (exit ${r.status}):\n${lines.slice(-4).map((l) => l.slice(0, 200)).join("\n")}`);
  process.exit(1);
}
console.log(`wrote ${out} (${slug}, design ${design}, frame ${frame}, scale ${scale}${shell ? ", installed headless shell" : ""})`);
