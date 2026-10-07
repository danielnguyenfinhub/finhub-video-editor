// Pure maths and wording for the matte page's benchmark mode (matte.html?slug=<slug>&bench=<seconds>).
// No DOM here so node review/check-matte-bench.mjs can run it. The benchmark runs the real matte on the
// start of the video, stops after a few seconds of video, saves nothing, and says how long a full run
// would take on this machine.

export const BENCH_DEFAULT_SEC = 10;
export const BENCH_MIN_SEC = 3;
export const BENCH_MAX_SEC = 60;
/** Last known full run on Daniel's PC: about 13x the video's length (landmines.md). */
export const REFERENCE_X = 13;

/** Seconds of video to test from `?bench[=n]`; null when the page is not in benchmark mode. */
export const parseBenchSeconds = (search: string): number | null => {
  const params = new URLSearchParams(search);
  if (!params.has("bench")) return null;
  const n = Number(params.get("bench"));
  if (!Number.isFinite(n) || n === 0) return BENCH_DEFAULT_SEC;
  return Math.min(BENCH_MAX_SEC, Math.max(BENCH_MIN_SEC, n));
};

export type Sample = { t: number; frames: number; sec: number };
export type BenchResult = {
  frames: number;
  videoSec: number;
  wallSec: number;
  /** Frames per second and wall seconds per video second, from the click (includes model start-up). */
  fps: number;
  x: number;
  /** The same between the first and last progress report (start-up left out); null with one report. */
  warmFps: number | null;
  warmX: number | null;
  /** Minutes the whole video would take at the warm speed (the cold one with one report). */
  estFullMin: number | null;
};

/** `samples` are progress reports (performance.now() ms, frames, video seconds); `t0` is the click time. */
export const benchStats = (samples: Sample[], t0: number, durationSec: number): BenchResult | null => {
  const last = samples[samples.length - 1];
  if (!last || !(last.sec > 0) || !(last.t > t0)) return null;
  const wallSec = (last.t - t0) / 1000;
  const first = samples[0];
  const spans = samples.length > 1 && last.sec > first.sec && last.t > first.t;
  const warmWall = spans ? (last.t - first.t) / 1000 : null;
  const warmX = warmWall === null ? null : warmWall / (last.sec - first.sec);
  const x = wallSec / last.sec;
  return {
    frames: last.frames,
    videoSec: last.sec,
    wallSec,
    fps: last.frames / wallSec,
    x,
    warmFps: warmWall === null ? null : (last.frames - first.frames) / warmWall,
    warmX,
    estFullMin: durationSec > 0 ? (durationSec * (warmX ?? x)) / 60 : null,
  };
};

type AdapterInfo = { vendor?: string; architecture?: string; device?: string; description?: string };

/** One line on which GPU the browser gave the page; a software adapter means the CPU does the work. */
export const describeAdapter = (info: AdapterInfo | undefined, isFallback: boolean | undefined): string => {
  if (isFallback) return "GPU: a SOFTWARE fallback adapter, so the matte runs on the CPU (this is the slow case).";
  const name = [info?.vendor, info?.architecture, info?.device, info?.description].filter(Boolean).join(" ");
  return name ? `GPU: ${name}.` : "GPU: the browser did not say which one it uses.";
};

const one = (n: number) => (Math.round(n * 10) / 10).toString();

/** The finished benchmark, in plain words. */
export const describeBench = (r: BenchResult, durationSec: number, gpu: string): string => {
  const speed = r.warmX ?? r.x;
  const lines = [
    `Benchmark: ${one(r.videoSec)} s of video (${r.frames} frames) took ${one(r.wallSec)} s.`,
    `Speed: ${one(r.warmFps ?? r.fps)} frames/s, about ${one(speed)}× the video's length` +
      (r.warmX === null ? "" : ` (including start-up: ${one(r.x)}×)`) +
      ".",
  ];
  if (r.estFullMin !== null)
    lines.push(
      `This video (${one(durationSec)} s) would take about ${one(r.estFullMin)} min. That is an estimate from the first seconds only.`,
    );
  lines.push(`Your last full run: about ${REFERENCE_X}×. ${gpu}`, "Nothing was saved.");
  return lines.join("\n");
};
