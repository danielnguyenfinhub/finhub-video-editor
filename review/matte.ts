// Background removal for edit.json "background": "brand". Open
// http://localhost:4100/matte.html?slug=<slug>: it cuts Daniel out of
// the video's source.mp4 (in its recording, see src/mortgage/recording.ts)
// with @remotion/video-matting (the modnet person model, 25.9 MB, downloaded
// from remotion.media once, then cached) and sends the result to the review
// server, which saves it as foreground.webm next to source.mp4 only if its
// frame count matches. Runs in the browser on the GPU:
// roughly 13x the video's length, so keep the window open until it says Saved.
import {
  canUseVideoMatting,
  separateVideoLayers,
} from "@remotion/video-matting";
import { recordingPath } from "../src/mortgage/recording";
import {
  benchStats,
  describeAdapter,
  describeBench,
  parseBenchSeconds,
  type Sample,
} from "./matteBench";

const slug = new URLSearchParams(location.search).get("slug") ?? "";
const $ = (id: string) => document.getElementById(id)!;
const status = (text: string, tone: "info" | "ok" | "bad" = "info") => {
  $("status").textContent = text;
  $("status").className = `status ${tone}`;
  document.title = `Background · ${text}`;
};
const run = $("run") as HTMLButtonElement;
// ?bench[=seconds]: time the real matte on the start of the video, save nothing (matteBench.ts).
const bench = parseBenchSeconds(location.search);
if (bench !== null) run.textContent = `Run benchmark (first ${bench} s)`;

const check = async () => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug))
    return status(
      "Open this page from the review page, or add ?slug=<video> to the address.",
      "bad",
    );
  $("slug").textContent = slug;
  const can = await canUseVideoMatting({ model: "modnet" });
  if (!can.supported)
    return status(
      `This browser can't run background removal (${can.reason}). Use the Claude app's browser or Chrome.`,
      "bad",
    );
  run.disabled = false;
  status(
    bench === null
      ? "Ready."
      : `Ready. The benchmark processes about ${bench} s of video, stops, and saves nothing.`,
  );
};

type GpuLike = {
  requestAdapter(): Promise<{ info?: Record<string, string>; isFallbackAdapter?: boolean } | null>;
};
const gpuLine = async () => {
  try {
    const gpu = (navigator as unknown as { gpu?: GpuLike }).gpu;
    const adapter = await gpu?.requestAdapter();
    return describeAdapter(adapter?.info, adapter?.isFallbackAdapter);
  } catch {
    return describeAdapter(undefined, undefined);
  }
};

const runBench = async (seconds: number) => {
  run.disabled = true;
  const started = performance.now();
  const samples: Sample[] = [];
  const stop = new AbortController();
  let duration = 0;
  let stopped = false;
  try {
    const editRes = await fetch(`/public/videos/${slug}/edit.json`);
    if (!editRes.ok)
      throw new Error(`public/videos/${slug}/edit.json: HTTP ${editRes.status}`);
    const { source } = (await editRes.json()) as { source?: string };
    try {
      const result = await separateVideoLayers({
        src: `/public/${recordingPath(slug, source, "source.mp4")}`,
        model: "modnet",
        audio: "none",
        signal: stop.signal,
        onModelLoadProgress: (p) => {
          if (p.progress !== null && p.progress < 1)
            status(`Loading the model… ${Math.round(p.progress * 100)}%`);
        },
        onProgress: (p) => {
          if (p.stage !== "processing") return;
          duration = p.durationInSeconds;
          samples.push({ t: performance.now(), frames: p.processedFrames, sec: p.processedDurationInSeconds });
          status(`Benchmark… ${p.processedDurationInSeconds.toFixed(1)} of ${seconds} s`);
          ($("bar") as HTMLProgressElement).value = Math.min(1, p.processedDurationInSeconds / seconds);
          if (p.processedDurationInSeconds >= seconds && !stopped) {
            stopped = true;
            stop.abort(); // enough: nothing is saved
          }
        },
      });
      // A video shorter than the test finished on its own: drop its output, nothing is saved.
      await Promise.all([result.base.dispose(), result.foreground.dispose()]);
    } catch (e) {
      if (!stopped) throw e;
    }
    const res = benchStats(samples, started, duration);
    if (!res) throw new Error("no frames were processed, so there is nothing to time");
    status(describeBench(res, duration, await gpuLine()), "ok");
    run.disabled = false;
  } catch (e) {
    status(`Stopped: ${(e as Error).message}`, "bad");
    run.disabled = false;
  }
};

run.addEventListener("click", async () => {
  if (bench !== null) return runBench(bench);
  run.disabled = true;
  const started = performance.now();
  try {
    const editRes = await fetch(`/public/videos/${slug}/edit.json`);
    if (!editRes.ok)
      throw new Error(
        `public/videos/${slug}/edit.json: HTTP ${editRes.status}`,
      );
    const { source } = (await editRes.json()) as { source?: string };
    const result = await separateVideoLayers({
      src: `/public/${recordingPath(slug, source, "source.mp4")}`,
      model: "modnet",
      audio: "none",
      onModelLoadProgress: (p) => {
        if (p.progress !== null && p.progress < 1)
          status(`Loading the model… ${Math.round(p.progress * 100)}%`);
      },
      onProgress: (p) => {
        if (p.stage === "finalizing") return status("Finishing the file…");
        const elapsed = (performance.now() - started) / 1000;
        const left = p.progress ? elapsed / p.progress - elapsed : 0;
        status(
          `Removing the background… ${Math.round((p.progress ?? 0) * 100)}% ` +
            `(${p.processedDurationInSeconds.toFixed(0)} of ${p.durationInSeconds.toFixed(0)} s of video, ` +
            `about ${Math.ceil(left / 60)} min left)`,
        );
        ($("bar") as HTMLProgressElement).value = p.progress ?? 0;
      },
    });
    status("Saving foreground.webm…");
    const blob = await result.foreground.getBlob();
    await Promise.all([result.base.dispose(), result.foreground.dispose()]);
    const res = await fetch(`/api/foreground/${slug}`, {
      method: "POST",
      body: blob,
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    const minutes = ((performance.now() - started) / 60000).toFixed(1);
    status(
      `Saved ${body.saved} (${body.frames} frames, ${minutes} min). Set "background": "brand" in edit.json to use it.`,
      "ok",
    );
  } catch (e) {
    status(`Stopped: ${(e as Error).message}`, "bad");
    run.disabled = false;
  }
});

check().catch((e) => status(`Stopped: ${(e as Error).message}`, "bad"));
