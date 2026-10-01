// Checks the pure parts of the AI judge (scripts/visuals.mjs parseJudge) and
// the CLIP re-ranking (scripts/clip-score.mjs) with a fake scorer; nothing
// calls fal.ai, Gemini or loads the model. Run: node scripts/check-visuals.mjs
import assert from "node:assert/strict";
import { rankByScore, rerank } from "./clip-score.mjs";
import { spendProblem } from "./spend.mjs";
import { parseJudge } from "./visuals.mjs";

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
// Spend guard (scripts/spend.mjs): a paid run needs a recent --dry-run estimate.
const est = { engine: "elevenlabs", chars: 1000, aiImages: 2 };
assert.equal(spendProblem({ engine: "google", chars: 5000, aiImages: 0 }, null), null, "free engine, no images: not gated");
assert.match(spendProblem({ engine: "elevenlabs", chars: 1000, aiImages: 0 }, null), /no --dry-run estimate/, "paid engine, no estimate");
assert.match(spendProblem({ engine: "google", chars: 100, aiImages: 1 }, null), /no --dry-run estimate/, "fal.ai image, no estimate");
assert.equal(spendProblem({ engine: "elevenlabs", chars: 1500, aiImages: 3 }, est), null, "exactly +50% is allowed");
assert.match(spendProblem({ engine: "elevenlabs", chars: 1501, aiImages: 2 }, est), /grew past the estimate/, "characters over +50%");
assert.match(spendProblem({ engine: "elevenlabs", chars: 1000, aiImages: 4 }, est), /grew past the estimate/, "images over +50%");
assert.match(spendProblem({ engine: "google", chars: 1000, aiImages: 2 }, est), /engine changed/, "engine changed since the estimate");
console.log("visuals ok");
