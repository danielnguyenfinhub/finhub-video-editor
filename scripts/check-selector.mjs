// Self-test for scripts/select-template.mjs on synthetic briefs (no slug, no
// media): node scripts/check-selector.mjs -> "selector ok", exit 1 on failure.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { intentsOf } from "./brief.mjs";
import { loadManifests, overrideOf, rank } from "./select-template.mjs";

const cfg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "config", "selector.json"), "utf8"));
const manifests = loadManifests();
const byId = Object.fromEntries(manifests.map((t) => [t.id, t]));
let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) {
    failed = true;
    console.log(`FAIL ${name}${detail ? `  (${detail})` : ""}`);
  }
};

const brief = (over) => ({
  mode: "A", intent: "explain", intents: ["explain"], dataShapes: ["narrative"],
  counts: { numbers: 0, comparisons: 0, steps: 0, banks: 0, eligibility: 0, narrative: 4 },
  aspect: "9:16", languages: ["vi"], longestCard: { vi: 20, en: 0 }, shortestHoldMs: null,
  assets: { foreground: true, voice: false, script: false }, ...over,
});

check("14 manifests", manifests.length === 14, String(manifests.length));

// A number-heavy talk ranks the data templates above the story ones.
const numbers = brief({
  intent: "data", intents: ["data", "explain"], dataShapes: ["numbers", "banks"],
  counts: { numbers: 12, comparisons: 0, steps: 0, banks: 2, eligibility: 0, narrative: 0 },
});
const { ranked } = rank(numbers, manifests, [], cfg);
const score = (id) => ranked.find((r) => r.id === id)?.score ?? -Infinity;
const stories = ranked.filter((r) => byId[r.id].intents.includes("story"));
check("number brief has story templates to beat", stories.length > 0);
for (const s of stories) check(`datalab > ${s.id}`, score("datalab") > s.score, `${score("datalab")} vs ${s.score}`);
check("a data template leads", byId[ranked[0].id].intents.includes("data"), ranked[0].id);

// A faceless video never gets a template that needs Daniel on screen.
const faceless = brief({ mode: "B", languages: ["vi", "en"], assets: { foreground: false, voice: true, script: true } });
const fr = rank(faceless, manifests, [], cfg);
check("faceless: no face-required", fr.ranked.every((r) => byId[r.id].facePolicy !== "face-required"), fr.ranked.map((r) => r.id).join(","));
check("faceless: something ranks", fr.ranked.length > 0);

// The skin used by the last video scores lower than when it was not used.
const fresh = score("datalab");
const used = rank(numbers, manifests, [{ slug: "x", design: "datalab", date: "2026-09-26" }], cfg);
const after = used.ranked.find((r) => r.id === "datalab");
check("recency lowers the just-used skin", after.score < fresh && after.rec === 1, `${fresh} -> ${after.score}`);

// An on-camera brief with the foreground found scores AssetReady for on-camera designs.
const fg = rank(brief(), manifests, [], cfg).ranked.filter((r) => byId[r.id].facePolicy !== "faceless");
check("foreground present: AssetReady > 0", fg.length > 0 && fg.every((r) => r.asset > 0), fg.map((r) => `${r.id}:${r.asset}`).join(","));

// Hard filters: a card too long for a template drops it.
const long = rank(brief({ longestCard: { vi: 200, en: 0 } }), manifests, [], cfg);
check("200-char card drops everything", long.ranked.length === 0, long.ranked.map((r) => r.id).join(","));

// Promotion gate: every promoted design ranks above every unproven one, even a
// higher-scoring one; unproven ones say how to prove them.
const firstUnproven = ranked.findIndex((r) => r.unproven);
const promotedAfter = ranked.slice(Math.max(firstUnproven, 0)).filter((r) => !r.unproven);
check("promoted and unproven both ranked", firstUnproven > 0, ranked.map((r) => r.id).join(","));
check("promoted all rank above unproven", firstUnproven < 0 || promotedAfter.length === 0, ranked.map((r) => `${r.id}${r.unproven ? "?" : ""}`).join(","));
check("an unproven design outscores a promoted one here", ranked.some((u) => u.unproven && ranked.some((p) => !p.unproven && p.score < u.score)));
check("unproven label names promote-design", ranked.filter((r) => r.unproven).every((r) => r.unproven.includes(`promote-design.mjs ${r.id}`)));
check("promoted flag matches template.json", ranked.every((r) => !r.unproven === !!byId[r.id].promoted));

// --pick takes any design, unproven included, and says so.
const unprovenId = ranked.find((r) => r.unproven).id;
const o = overrideOf(unprovenId, "Daniel likes it", rank(numbers, manifests, [], cfg), manifests);
check("--pick an unproven design", o.id === unprovenId && o.rank > 0 && o.unproven?.includes(unprovenId), JSON.stringify(o));

// maxChars per kind: a 38-char stat label is judged against the stat limit, a
// long cue against the cue limit; the old single number applies to every kind.
const perKind = (vi) => rank(brief({ longestCard: { vi, en: 0 } }), manifests, [], cfg);
const statLong = perKind({ hook: 20, chapter: 20, stat: 38, cue: 20 });
check("38-char stat label keeps scenario (stat max 48)", statLong.ranked.some((r) => r.id === "scenario"), JSON.stringify(statLong.dropped));
check("38-char stat label drops neon (single 24)", /^stat 38/.test(statLong.dropped.neon ?? ""), statLong.dropped.neon);
const cueLong = perKind({ hook: 20, chapter: 20, stat: 20, cue: 38 });
check("38-char cue drops scenario (cue max 30)", /^cue 38 chars > vi cue max 30/.test(cueLong.dropped.scenario ?? ""), cueLong.dropped.scenario);
const oldForm = perKind(38);
check("old single-number brief still judged against every kind", !!oldForm.dropped.scenario && !!oldForm.dropped.checklist, JSON.stringify(oldForm.dropped));

// Hold time is the edit's, not the design's (every design shows a cue for the
// same time), so a short hold warns on the design and never drops it.
const holdBrief = rank(brief({ shortestHoldMs: 1570 }), manifests, [], cfg);
const heldOf = (id) => holdBrief.ranked.find((r) => r.id === id);
check("1570 ms hold keeps a 2000 ms design, with a warning", !holdBrief.dropped.editorial && /1570 ms/.test(heldOf("editorial")?.holdWarning ?? ""), JSON.stringify(heldOf("editorial")));
check("no warning when the hold meets the design's minimum", !!heldOf("classic") && !heldOf("classic").holdWarning, JSON.stringify(heldOf("classic")));

// "explain" is the fallback intent, not a bonus on every video.
check("explain only when nothing else matched", intentsOf({ numbers: 0, steps: 0, comparisons: 0 }, 0, "", 60).join() === "explain");
const dataIntents = intentsOf({ numbers: 5, steps: 0, comparisons: 3 }, 4, "", 120);
check("data video has no free explain", !dataIntents.includes("explain"), dataIntents.join());

if (failed) process.exit(1);
console.log("selector ok");
