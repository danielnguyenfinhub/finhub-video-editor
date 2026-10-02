// A scratch public/ for one faceless video that has no recording files here, and the
// installed headless shell to render it with (docs/agents/rendering-without-gpu.md).
// Shared by scripts/faceless-still.mjs and scripts/promote-design.mjs.
//
// scratchPublic(slug, { publicDir, vignette }): a folder in node_modules/.cache that links
// every entry of publicDir except videos/, with videos/<slug> copied in, plus placeholder
// media in VP9 (the headless shell has no H.264):
//   vignette: true  -> edit.json "background": "vignette" and a black source.mp4 (no matte);
//                      quick mode, NOT the path a faceless render takes.
//   vignette: false -> the two files scripts/voice-video.mjs writes for a faceless video with
//                      NO footage: source.mp4 a plain navy frame (+ silent audio) and a fully
//                      transparent foreground.webm. The render takes the production path, but a
//                      video whose script has stock footage shows navy where that footage would be.
// Only a video without edit.json "source" (its media live in videos/<slug>): a recordings/
// entry is a link into the repo and is never written to. Needs ffmpeg. Symlinks: not on Windows.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoTmp } from "./tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");
const NAVY = "0x0B1F3D"; // voice-video.mjs BACKDROP

const ffmpeg = (args, what) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg could not make the placeholder ${what}: ${(r.stderr || r.error?.message || "").trim().split("\n").pop()}`);
};

export const scratchPublic = (slug, { publicDir = join(ROOT, "public"), vignette = true } = {}) => {
  const video = join(publicDir, "videos", slug);
  for (const f of ["edit.json", "words.json"])
    if (!existsSync(join(video, f))) throw new Error(`${video}/${f} is missing`);
  const edit = JSON.parse(readFileSync(join(video, "edit.json"), "utf8"));
  if (edit.source) throw new Error(`${slug} has a recording ("source": "${edit.source}"): it is not faceless`);
  const pub = repoTmp("scratch-public-");
  for (const e of readdirSync(publicDir)) if (e !== "videos") symlinkSync(join(publicDir, e), join(pub, e), "dir");
  const dest = join(pub, "videos", slug);
  mkdirSync(dest, { recursive: true });
  cpSync(video, dest, { recursive: true });
  if (vignette) writeFileSync(join(dest, "edit.json"), JSON.stringify({ ...edit, background: "vignette" }, null, 2));

  const words = JSON.parse(readFileSync(join(dest, "words.json"), "utf8"));
  const end = Math.max(0, ...(Array.isArray(words) ? words : words.words ?? []).map((w) => Number(w.endMs ?? w.end * 1000) || 0));
  const t = String(Math.ceil(end / 1000) + 5);
  ffmpeg(["-f", "lavfi", "-i", `color=c=${vignette ? "black" : NAVY}:s=540x960:r=30:d=${t}`, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", t, "-c:v", "libvpx-vp9", "-b:v", "50k", "-deadline", "realtime", "-cpu-used", "8", "-c:a", "libopus", "-f", "mp4", join(dest, "source.mp4")], "source.mp4");
  if (!vignette)
    ffmpeg(["-f", "lavfi", "-i", `color=c=black@0.0:s=540x960:r=30:d=${t},format=yuva420p`, "-t", t, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "63", "-auto-alt-ref", "0", join(dest, "foreground.webm")], "foreground.webm");
  return pub;
};

// Remotion CLI flags for an installed headless shell: --browser <path>, else FINHUB_BROWSER,
// else (search) the first one in /opt/pw-browsers; [] when there is none (Remotion downloads its own).
export const browserArgs = (explicit, { search = true } = {}) => {
  const pw = "/opt/pw-browsers";
  const found = search && existsSync(pw)
    ? readdirSync(pw).filter((d) => d.startsWith("chromium_headless_shell-")).flatMap((v) => readdirSync(join(pw, v)).map((s) => join(pw, v, s, "headless_shell"))).find(existsSync)
    : undefined;
  const shell = explicit ?? process.env.FINHUB_BROWSER ?? found;
  if (shell && !existsSync(shell)) throw new Error(`browser "${shell}" does not exist`);
  return shell ? ["--gl=swangle", "--chrome-mode=headless-shell", `--browser-executable=${shell}`] : [];
};
