// Background removal without Daniel opening the page: drives review/matte.html (the same
// @remotion/video-matting run, the same save through the review server's frame-count check)
// in Chrome for Testing through @remotion/renderer's openBrowser, which already enables WebGPU.
//   node scripts/matte-headless.mjs <slug> [--bench <3-60>] [--headed]
//   node scripts/matte-headless.mjs --selftest
// Prints "== <status>" each time the page's status changes (the MCP job shows the last one).
// Exit 0: saved (or the bench finished). 1: the matte stopped. 2: it couldn't start, e.g.
// "can't run background removal (webgpu-unavailable)": try --headed, which opens a visible
// window and closes it when done. A review page already running on REVIEW_PORT (4100) is
// reused; otherwise one is started for this run and stopped after it.
// ponytail: MATTE_BROWSER=<chrome.exe> uses an installed Chrome instead of the download.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

export const parseArgs = (argv) => {
  const slug = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--bench");
  const at = argv.indexOf("--bench");
  const bench = at === -1 ? null : Number(argv[at + 1]);
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return { error: "give the video's slug: node scripts/matte-headless.mjs <slug>" };
  if (bench !== null && !(Number.isInteger(bench) && bench >= 3 && bench <= 60)) return { error: "--bench takes whole seconds, 3-60" };
  return { slug, bench, headed: argv.includes("--headed") };
};
// matte.ts sets the status class: "ok" saved (or bench done), "bad" stopped; "info" while it works.
export const exitFor = (cls) => (/\bok\b/.test(cls) ? 0 : /\bbad\b/.test(cls) ? 1 : null);

if (process.argv.includes("--selftest")) {
  assert.deepEqual(parseArgs(["ty-do"]), { slug: "ty-do", bench: null, headed: false });
  assert.deepEqual(parseArgs(["--bench", "10", "ty-do", "--headed"]), { slug: "ty-do", bench: 10, headed: true });
  for (const bad of [[], ["../x"], ["Ty"], ["ty", "--bench", "2"], ["ty", "--bench", "61"], ["ty", "--bench", "x"]]) assert.ok(parseArgs(bad).error, JSON.stringify(bad));
  assert.equal(exitFor("status ok"), 0);
  assert.equal(exitFor("status bad"), 1);
  assert.equal(exitFor("status info"), null);
  console.log("matte-headless selftest ok");
  process.exit(0);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.error) {
  console.error(opts.error);
  process.exit(2);
}
const port = Number(process.env.REVIEW_PORT ?? 4100);
const up = () => fetch(`http://127.0.0.1:${port}/api/videos`).then((r) => r.ok, () => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const built = spawnSync(process.execPath, [join(ROOT, "review/build.mjs"), "--build-only"], { cwd: ROOT, stdio: "inherit" });
if (built.status !== 0) process.exit(2);
let server = null;
if (!(await up())) {
  server = spawn(process.execPath, [join(ROOT, "review/dist/server.cjs")], { cwd: ROOT, env: { ...process.env, REVIEW_PORT: String(port) }, stdio: "ignore" });
  for (let i = 0; i < 60 && !(await up()); i++) await sleep(500);
}
let browser;
let code = 2;
try {
  // Inside the try: a failed import or launch still stops the server this run started.
  if (!(await up())) throw new Error(`the review server didn't start on port ${port}`);
  const { openBrowser } = await import("@remotion/renderer");
  browser = await openBrowser("chrome", {
    chromeMode: "chrome-for-testing",
    browserExecutable: process.env.MATTE_BROWSER ?? null,
    chromiumOptions: { headless: !opts.headed },
    logLevel: "error",
  });
  const page = await browser.newPage({ context: () => null, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} });
  const url = `http://localhost:${port}/matte.html?slug=${opts.slug}${opts.bench ? `&bench=${opts.bench}` : ""}`;
  await page.goto({ url, timeout: 60_000 });
  const read = () =>
    page.evaluate(() => {
      const s = document.getElementById("status");
      return { text: s?.textContent ?? "", cls: s?.className ?? "", ready: !document.getElementById("run")?.disabled };
    });
  let last = "";
  const show = (s) => s.text !== last && console.log(`== ${(last = s.text)}`);
  // The page checks WebGPU first: Run stays disabled (and the status turns "bad") if it can't work here.
  let s = await read();
  for (let i = 0; i < 60 && !s.ready && exitFor(s.cls) === null; i++) await sleep(1000), (s = await read());
  show(s);
  if (s.ready) {
    await page.evaluate(() => document.getElementById("run").click());
    do {
      await sleep(5000);
      s = await read();
      show(s);
    } while (exitFor(s.cls) === null);
    code = exitFor(s.cls);
  } else if (!opts.headed) console.log("Couldn't start here: try again with --headed (a visible Chrome window).");
} catch (e) {
  console.log(`== Stopped: ${e.message}`);
} finally {
  await browser?.close({ silent: true }).catch(() => {});
  server?.kill();
}
process.exit(code);
