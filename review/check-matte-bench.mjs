// Check for review/matteBench.ts and the benchmark branch of review/matte.ts.
// Run: node review/check-matte-bench.mjs (exit 1 on failure).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const m = await import(new URL("./matteBench.ts", import.meta.url));

// ?bench: absent = normal page; present = benchmark, clamped 3-60 s, default 10.
assert.equal(m.parseBenchSeconds(""), null);
assert.equal(m.parseBenchSeconds("?slug=a"), null);
assert.equal(m.parseBenchSeconds("?slug=a&bench"), 10);
assert.equal(m.parseBenchSeconds("?bench="), 10);
assert.equal(m.parseBenchSeconds("?bench=abc"), 10);
assert.equal(m.parseBenchSeconds("?bench=0"), 10);
assert.equal(m.parseBenchSeconds("?bench=20"), 20);
assert.equal(m.parseBenchSeconds("?bench=1"), 3, "clamped up");
assert.equal(m.parseBenchSeconds("?bench=9999"), 60, "clamped down");
assert.equal(m.parseBenchSeconds("?bench=-5"), 3, "negative is clamped, not a crash");

// Stats: wall time runs from the click (model start-up included); warm speed starts at the first report.
const s = [{ t: 20000, frames: 30, sec: 1 }, { t: 30000, frames: 90, sec: 3 }, { t: 40000, frames: 150, sec: 5 }];
const r = m.benchStats(s, 0, 200);
assert.equal(r.frames, 150);
assert.equal(r.videoSec, 5);
assert.equal(r.wallSec, 40);
assert.equal(r.x, 8, "cold: 40 s for 5 s of video");
assert.equal(r.fps, 150 / 40);
assert.equal(r.warmX, 5, "warm: 20 s for the 4 s after the first report");
assert.equal(r.warmFps, 120 / 20);
assert.equal(r.estFullMin, (200 * 5) / 60, "the estimate uses the warm speed");
// One report only: no warm figure, the estimate falls back to the cold one.
const one = m.benchStats([{ t: 10000, frames: 30, sec: 2 }], 0, 100);
assert.equal(one.warmX, null);
assert.equal(one.warmFps, null);
assert.equal(one.estFullMin, (100 * 5) / 60);
// Nothing usable: no frames, a report before the click, an unknown duration.
assert.equal(m.benchStats([], 0, 100), null);
assert.equal(m.benchStats([{ t: 5, frames: 0, sec: 0 }], 0, 100), null);
assert.equal(m.benchStats([{ t: 5, frames: 3, sec: 1 }], 10, 100), null);
assert.equal(m.benchStats([{ t: 10000, frames: 30, sec: 2 }], 0, 0).estFullMin, null);
// Two reports at the same video time (no spread) never divide by zero.
assert.equal(m.benchStats([{ t: 1000, frames: 5, sec: 1 }, { t: 2000, frames: 5, sec: 1 }], 0, 10).warmX, null);

// Adapter line: a software fallback is named as the slow case.
assert.match(m.describeAdapter({ vendor: "intel", architecture: "xe-lpg" }, false), /^GPU: intel xe-lpg\.$/);
assert.match(m.describeAdapter({ vendor: "google", description: "SwiftShader" }, true), /SOFTWARE fallback.*CPU/);
assert.match(m.describeAdapter(undefined, undefined), /did not say/);
assert.match(m.describeAdapter({}, false), /did not say/);

// Words: speed, estimate, reference, GPU and "nothing was saved" all appear.
const text = m.describeBench(r, 200, "GPU: test.");
for (const part of ["5 s of video (150 frames) took 40 s", "6 frames/s", "5× the video's length", "including start-up: 8×", "about 16.7 min", "estimate", "about 13×", "GPU: test.", "Nothing was saved."])
  assert.ok(text.includes(part), `describeBench says "${part}":\n${text}`);

// Source pins: the benchmark branch aborts after the test seconds, saves nothing, and is the only thing ?bench changes.
const src = readFileSync(new URL("./matte.ts", import.meta.url), "utf8");
const bench = src.slice(src.indexOf("const runBench"), src.indexOf('run.addEventListener("click"'));
assert.ok(bench.length > 500, "found runBench");
assert.ok(!/api\/foreground|method:\s*"POST"|getBlob/.test(bench), "benchmark mode never saves or sends the video");
assert.match(bench, /stop\.abort\(\)/, "stops after the test seconds");
assert.match(bench, /signal:\s*stop\.signal/, "the abort signal reaches separateVideoLayers");
assert.match(bench, /processedDurationInSeconds >= seconds &&/, "stops on video seconds, not wall time");
assert.match(src, /if \(bench !== null\) return runBench\(bench\)/, "?bench runs the benchmark, not the real matte");
console.log("matte benchmark check ok");
