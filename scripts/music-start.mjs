// Where a music track gets going, so edit.json "music".startMs can skip its
// quiet intro (the hook is the loudest moment of the video; it shouldn't sit
// under the track's softest bars). ffmpeg's ebur128 meter gives momentary
// loudness every 100 ms; averaged per second, the start is the first second
// within 8 LU of the track's typical (median) loudness, the way OpenMontage's
// audio_energy tool does it with a fixed floor.
//
//   node scripts/music-start.mjs public/music/<file> [--json]
//
// Prints the suggested startMs and the loudness profile. Nothing is written.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const FLOOR_LUFS = -40; // quieter than this is silence or a fade-in
export const WITHIN_LU = 8; // "going" = within this of the track's median loudness

// ebur128 stderr lines: "t: 0.0999773  TARGET:-23 LUFS    M:-120.7 S:-120.7 ...".
export const parseLoudness = (stderr) =>
  [...stderr.matchAll(/\bt:\s*([\d.]+)\s+.*?\bM:\s*(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

// Per-second average of the 100 ms points (silence markers below -120 left out).
export const perSecond = (points) => {
  const out = [];
  for (const [t, m] of points) {
    const s = Math.floor(t);
    if (m <= -120) continue;
    (out[s] ??= []).push(m);
  }
  return Array.from(out, (v) => (v?.length ? v.reduce((a, b) => a + b, 0) / v.length : -120));
};

// The first second that is loud enough; the reason explains the threshold.
export const startOf = (profile) => {
  const active = profile.filter((v) => v > FLOOR_LUFS).sort((a, b) => a - b);
  if (!active.length) return { startMs: 0, reason: "the track never rises above the silence floor; starting at 0" };
  const median = active[Math.floor(active.length / 2)];
  const threshold = Math.max(FLOOR_LUFS, median - WITHIN_LU);
  const sec = profile.findIndex((v) => v >= threshold);
  return {
    startMs: Math.max(0, sec) * 1000,
    reason: `first second within ${WITHIN_LU} LU of the track's median ${median.toFixed(1)} LUFS (threshold ${threshold.toFixed(1)})`,
  };
};

export const analyse = (file) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.error) throw new Error("ffmpeg is not on PATH");
  const profile = perSecond(parseLoudness(r.stderr));
  if (!profile.length) throw new Error(`no loudness data from ffmpeg for ${file}`);
  return { file, seconds: profile.length, profile: profile.map((v) => Math.round(v * 10) / 10), ...startOf(profile) };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file || !existsSync(file)) {
    console.error("usage: node scripts/music-start.mjs public/music/<file> [--json]");
    process.exit(2);
  }
  const a = analyse(file);
  if (process.argv.includes("--json")) console.log(JSON.stringify(a, null, 2));
  else {
    console.log(`${file}: ${a.seconds} s; start at ${a.startMs} ms (${a.reason}).`);
    console.log(`edit.json: "music": { "file": "<path under public/>", "startMs": ${a.startMs} }`);
    console.log(`loudness per second: ${a.profile.slice(0, 30).map((v) => (v <= -120 ? "·" : v.toFixed(0))).join(" ")}${a.seconds > 30 ? " …" : ""}`);
  }
}
