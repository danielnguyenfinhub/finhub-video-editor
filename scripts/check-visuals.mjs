// Checks the pure parts of the AI judge (scripts/visuals.mjs parseJudge) and
// the CLIP re-ranking (scripts/clip-score.mjs) with a fake scorer; nothing
// calls fal.ai, Gemini or loads the model. Run: node scripts/check-visuals.mjs
import assert from "node:assert/strict";
import { rankByScore, rerank } from "./clip-score.mjs";
import { spendProblem } from "./spend.mjs";
import { aiCandidates, aiStillsPerScene, generateStill, parseJudge, relevant } from "./visuals.mjs";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoTmp } from "./tmp-dir.mjs";

const ROOT = join(import.meta.dirname, "..");

assert.deepEqual(parseJudge('Here you go: {"best": 2, "why": "clean table, no faces"}', 3), { best: 1, why: "clean table, no faces" });
assert.equal(parseJudge('{"best": 0}', 3), null, "0 is outside 1..n");
assert.equal(parseJudge('{"best": 4, "why": "x"}', 3), null, "4 is outside 1..n");
assert.equal(parseJudge("I cannot decide.", 3), null);
assert.equal(parseJudge(undefined, 3), null);

const cands = [{ id: "a", thumb: "a.jpg" }, { id: "b", thumb: "b.jpg" }, { id: "c" }, { id: "d", thumb: "d.jpg" }];
assert.deepEqual(
  rankByScore(cands, [0.1, 0.3, null, 0.25], 0.22).map((c) => c.id),
  ["b", "d", "c"],
  "ranked by score, the unscored one kept, the low one dropped",
);
const scored = await rerank("couple reviewing documents", cands, { min: 0.22, score: async () => [0.1, 0.3, null, 0.25] });
assert.deepEqual(scored.map((c) => c.id), ["b", "d", "c"]);
assert.equal(scored[0].clipScore, 0.3);
const kept = await rerank("x", cands, { min: 0.22, score: async () => { throw new Error("offline"); } });
assert.deepEqual(kept.map((c) => c.id), ["a", "b", "c", "d"], "no model: the word order stands");
const off = await rerank("x", cands, { min: 0, score: async () => { throw new Error("must not run"); } });
assert.equal(off, cands, "CLIP_MIN=0 turns the filter off");
await assert.rejects(rerank("x", cands.slice(0, 2), { min: 0.22, score: async () => [0.1, 0.12] }), /No stock clip looks like "x" \(best CLIP score 0.12 < 0.22\)/);
// The off-topic stock guard: a clip's own words must share the search's (two for a multi-word search).
assert.equal(relevant("couple reviewing documents", "Young couple signing documents at home"), true);
assert.equal(relevant("couple reviewing documents", "couple dancing at a wedding"), false, "one shared word is not enough");
assert.equal(relevant("documents", "signing a document"), true, "first 5 letters: documents/document");
assert.equal(relevant("mortgage", "sunset beach drone"), false, "nothing shared");
// Spend guard (scripts/spend.mjs): a paid run needs a recent --dry-run estimate.
const est = { engine: "elevenlabs", chars: 1000, aiImages: 2 };
assert.equal(spendProblem({ engine: "google", chars: 5000, aiImages: 0 }, null), null, "free engine, no images: not gated");
assert.match(spendProblem({ engine: "elevenlabs", chars: 1000, aiImages: 0 }, null), /no --dry-run estimate/, "paid engine, no estimate");
assert.match(spendProblem({ engine: "google", chars: 100, aiImages: 1 }, null), /no --dry-run estimate/, "fal.ai image, no estimate");
assert.equal(spendProblem({ engine: "elevenlabs", chars: 1500, aiImages: 3 }, est), null, "exactly +50% is allowed");
assert.match(spendProblem({ engine: "elevenlabs", chars: 1501, aiImages: 2 }, est), /grew past the estimate/, "characters over +50%");
assert.match(spendProblem({ engine: "elevenlabs", chars: 1000, aiImages: 4 }, est), /grew past the estimate/, "images over +50%");
assert.match(spendProblem({ engine: "google", chars: 1000, aiImages: 2 }, est), /engine changed/, "engine changed since the estimate");
// The estimate's fal.ai count is what the real call buys (B2, run 3): AI_CANDIDATES stills per AI
// scene when Gemini judges, else 1. The call itself is stubbed: only its num_images is read.
{
  const env = { ...process.env }, realFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, init) => ((sent = JSON.parse(init.body)), { ok: true, json: async () => ({ images: [] }) });
  const bought = async () => (await assert.rejects(generateStill("p", 1, "."), /returned no image/), sent.num_images);
  try {
    process.env.FAL_KEY = "test";
    delete process.env.AI_CANDIDATES;
    process.env.GEMINI_API_KEY = "test";
    assert.equal(aiStillsPerScene(), 3, "default: 3 candidates per AI scene");
    assert.equal(await bought(), aiStillsPerScene(), "the real call buys what the estimate counts");
    process.env.AI_CANDIDATES = "5";
    assert.equal(await bought(), 5);
    assert.equal(aiStillsPerScene(), 5);
    delete process.env.GEMINI_API_KEY;
    assert.equal(await bought(), 1, "no judge: one still");
    assert.equal(aiStillsPerScene(), 1);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of ["FAL_KEY", "AI_CANDIDATES", "GEMINI_API_KEY"]) if (k in env) process.env[k] = env[k]; else delete process.env[k];
  }
}
// AI_CANDIDATES (R2, run 3): unset, blank or non-numeric means 3; a number floors to at least 1.
{
  const had = process.env.AI_CANDIDATES;
  try {
    delete process.env.AI_CANDIDATES;
    assert.equal(aiCandidates(), 3, "unset");
    for (const [v, want] of [["", 3], [" ", 3], ["abc", 3], ["0", 1], ["0.5", 1], ["-1", 1], ["2", 2], ["5", 5]]) {
      process.env.AI_CANDIDATES = v;
      assert.equal(aiCandidates(), want, `AI_CANDIDATES=${JSON.stringify(v)}`);
    }
  } finally {
    if (had === undefined) delete process.env.AI_CANDIDATES; else process.env.AI_CANDIDATES = had;
  }
}
// The dry run's spend-estimate.json counts stills, with GEMINI_API_KEY and AI_CANDIDATES read
// from .env.local (R1, run 3). voice-video finds .env.local beside its own scripts/ folder, so
// it runs from a copy with a fixture .env.local; nothing is voiced or bought.
{
  const root = repoTmp("visuals-estimate-");
  try {
    cpSync(join(ROOT, "scripts"), join(root, "scripts"), { recursive: true });
    cpSync(join(ROOT, "src", "mortgage", "compliance.ts"), join(root, "src", "mortgage", "compliance.ts"));
    symlinkSync(join(ROOT, "node_modules"), join(root, "node_modules"), "junction");
    writeFileSync(join(root, ".env.local"), "GEMINI_API_KEY=test\nAI_CANDIDATES=2\n");
    const dir = join(root, "public", "videos", "_test-estimate");
    mkdirSync(dir, { recursive: true });
    const scene = { vi: "Nhắn tin cho Finance Hub để được hỗ trợ.", en: "Message Finance Hub for help.", footage: "family home" };
    writeFileSync(join(dir, "script.json"), JSON.stringify({ title: "Estimate", scenes: [{ ...scene, ai: "a family home" }, { ...scene, ai: "keys on a table" }, scene] }));
    const env = { ...process.env };
    for (const k of ["GEMINI_API_KEY", "AI_CANDIDATES", "FAL_KEY"]) delete env[k];
    const r = spawnSync(process.execPath, [join(root, "scripts", "voice-video.mjs"), "_test-estimate", "--dry-run"], { encoding: "utf8", env });
    assert.equal(r.status, 0, `voice-video --dry-run: ${r.stderr}${r.stdout}`);
    const est = JSON.parse(readFileSync(join(dir, "spend-estimate.json"), "utf8"));
    assert.equal(est.aiImages, 4, "2 AI scenes x AI_CANDIDATES=2 from .env.local (Gemini key there too)");
  } finally {
    try { unlinkSync(join(root, "node_modules")); } catch {} // the link only, never the real node_modules
    rmSync(root, { recursive: true, force: true });
  }
}
console.log("visuals ok");
