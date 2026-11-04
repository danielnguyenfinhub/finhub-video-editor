// finhub doctor: is this PC ready to prepare and render a video? Reuses video-status.mjs's readiness
// checks (ffmpeg, Python) and adds Node against package.json engines, node_modules, the pinned Remotion,
// free disk and which API keys are set. Only key NAMES are read into the result, never a value.
import { existsSync, readFileSync, statfsSync } from "node:fs";
import { join } from "node:path";
import { readinessOf } from "../video-status.mjs";
import { OK, PROBLEM, emit, fmtBytes } from "./lib.mjs";

// Keys the scripts read (scripts/*.mjs and mcp/*.mjs are checked against this list by check-finhub-cli.mjs;
// PERPLEXITY_API_KEY is read by the Python scripts).
export const KEYS = [
  "DEEPSEEK_API_KEY",
  "ELEVENLABS_API_KEY",
  "FAL_AI_API_KEY",
  "FAL_KEY",
  "GEMINI_API_KEY",
  "MCP_TOKEN",
  "PERPLEXITY_API_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
  "REMOTION_MAPTILER_KEY",
];

export const help = `finhub doctor [--json]
  Checks Node against package.json engines, ffmpeg, Python, node_modules and the pinned Remotion,
  free disk (warns under 10 GB, blocks under 2 GB) and which API keys are set (names only).
  Exit 1 if anything blocks.`;

/** Names of the variables with a non-empty value in <root>/.env. Values are matched, never kept. */
const namesInEnvFile = (root) => {
  const p = join(root, ".env");
  if (!existsSync(p)) return new Set();
  return new Set(
    readFileSync(p, "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*\S/.exec(line);
        return m ? [m[1]] : [];
      }),
  );
};

// ponytail: only the ">=N" form of engines.node is read; anything else is a warning. Add semver if engines changes shape.
const needMajor = (range) => {
  const m = /^>=\s*(\d+)/.exec(range ?? "");
  return m ? Number(m[1]) : null;
};

export const checkDoctor = (root, { env = process.env, nodeVersion = process.versions.node } = {}) => {
  const items = readinessOf(root, "").items.filter((i) => !i.problem.startsWith("uncommitted"));
  const add = (level, problem, fix) => items.push({ level, problem, fix });
  const pkgPath = join(root, "package.json");
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : {};

  const range = pkg.engines?.node;
  const need = needMajor(range);
  if (range && need === null) add("warning", `cannot parse engines.node "${range}"`, "doctor reads only the >=N form");
  else if (need !== null && Number(nodeVersion.split(".")[0]) < need)
    add("blocked", `Node ${nodeVersion} is older than package.json engines.node ${range}`, `install Node ${need} or newer`);

  const remotionPkg = join(root, "node_modules", "remotion", "package.json");
  if (!existsSync(remotionPkg)) add("blocked", "node_modules is missing", "npm i");
  else {
    const have = JSON.parse(readFileSync(remotionPkg, "utf8")).version;
    const want = pkg.dependencies?.["@remotion/cli"];
    if (want && have !== want) add("warning", `remotion ${have} is installed, package.json pins ${want}`, "npm i");
  }

  let freeBytes = null;
  try {
    const s = statfsSync(root);
    freeBytes = s.bavail * s.bsize;
  } catch {
    // this platform cannot report free space: say so, do not guess
  }
  if (freeBytes !== null && freeBytes < 2e9) add("blocked", `only ${fmtBytes(freeBytes)} free on this drive`, "free space (finhub clean) before rendering");
  else if (freeBytes !== null && freeBytes < 10e9) add("warning", `${fmtBytes(freeBytes)} free on this drive`, "finhub clean lists what can go");

  if (env.FINHUB_BROWSER && !existsSync(env.FINHUB_BROWSER)) add("warning", "FINHUB_BROWSER is set but that file does not exist", "fix the path or unset it");

  const file = namesInEnvFile(root);
  const set = KEYS.filter((k) => env[k] || file.has(k));
  const level = items.some((i) => i.level === "blocked") ? "blocked" : items.length ? "warning" : "ready";
  return {
    level,
    items,
    keys: { set, unset: KEYS.filter((k) => !set.includes(k)) },
    freeBytes,
    chrome: "remotion-managed (downloaded on first render)",
  };
};

export const run = (root, { values }) => {
  const r = checkDoctor(root);
  const lines = [
    `doctor: ${r.level}`,
    ...r.items.map((i) => `  ${i.level}: ${i.problem} -> ${i.fix}`),
    `  node ${process.versions.node}; free disk ${r.freeBytes === null ? "unknown" : fmtBytes(r.freeBytes)}; chrome: ${r.chrome}`,
    `  keys set: ${r.keys.set.join(", ") || "none"}`,
    `  keys not set: ${r.keys.unset.join(", ") || "none"}`,
  ];
  emit(values.json, r, lines);
  return r.level === "blocked" ? PROBLEM : OK;
};
