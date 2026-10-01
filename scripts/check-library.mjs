// The one runnable check for scripts/library.mjs and the library-first routing
// in scripts/visuals.mjs. Temp fixtures only (never public/), no network.
//
//   node scripts/check-library.mjs      -> prints "library ok"
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { join, relative } from "node:path";
import { add, find, index, resolveVisuals, stats } from "./library.mjs";
import { AI_MODEL, aiClip, aiLicence, stockClips } from "./visuals.mjs";

const tmp = repoTmp("library-check-");
const lib = join(tmp, "library");
const work = join(tmp, "work");
const fixture = (name, text) => {
  const f = join(tmp, name);
  writeFileSync(f, text);
  return f;
};
const noNetwork = async () => {
  throw new Error("network called on a library hit");
};

try {
  mkdirSync(work);
  mkdirSync(lib);
  // synonyms.json: one group, EN <-> VI.
  writeFileSync(join(lib, "synonyms.json"), JSON.stringify({ groups: [{ en: ["signing documents"], vi: ["ký giấy tờ"] }] }));

  // add: binary + meta under the naming rule; the URL loses its query string.
  const a = add(
    fixture("clip-a.mp4", "fake clip bytes"),
    {
      kind: "stock-video",
      provider: "pexels",
      keywords: { en: ["Signing documents"] },
      sourceUrl: "https://www.pexels.com/video/x-1/?key=SECRET&auth=1",
      usedIn: ["slug-a"],
    },
    { lib },
  );
  assert.match(relative(lib, a.path).replace(/\\/g, "/"), /^stock-video\/signing-documents__pexels__[0-9a-f]{8}\.mp4$/);
  assert.ok(existsSync(`${a.path}.meta.json`));
  const meta = JSON.parse(readFileSync(`${a.path}.meta.json`, "utf8"));
  assert.equal(meta.sourceUrl, "https://www.pexels.com/video/x-1/");
  assert.equal(meta.sha256.length, 64);
  assert.deepEqual(meta.flags, { logoPresent: null, peopleIdentifiable: null, textInImage: null });

  // Same bytes again: the existing entry comes back, keywords and usedIn merge, no second copy.
  const b = add(fixture("clip-b.mp4", "fake clip bytes"), { kind: "stock-video", provider: "pixabay", keywords: { en: ["contract"] }, usedIn: ["slug-b"] }, { lib });
  assert.equal(b.existed, true);
  assert.equal(b.path, a.path);
  assert.deepEqual(b.meta.usedIn, ["slug-a", "slug-b"]);
  assert.deepEqual(b.meta.keywords.en, ["signing documents", "contract"]);
  assert.equal(readdirSync(join(lib, "stock-video")).filter((f) => !f.endsWith(".meta.json")).length, 1);

  // find: exact, synonym (VI), stem; and a miss.
  assert.equal(find("signing documents", { lib })[0]?.match, "exact");
  assert.equal(find("ký giấy tờ", { lib })[0]?.match, "synonym");
  assert.equal(find("document signing", { lib })[0]?.match, "stem");
  assert.equal(find("ducks on a lake", { lib }).length, 0);
  assert.equal(find("signing documents", { kind: "music", lib }).length, 0);

  // S3 (run 4), in a second library so the counts below stay: a long query needs most of its
  // stems (2 of 5 is not enough), and a clip whose keywords Daniel has not confirmed matches exactly only.
  const lib2 = join(tmp, "library2");
  mkdirSync(lib2);
  assert.equal(find("document signing ducks lake pond", { lib }).length, 0, "2 of 5 stems must not match");
  const u = add(fixture("clip-u.mp4", "unverified bytes"), { kind: "stock-video", provider: "pexels", keywords: { en: ["bank building"] }, keywordsUnverified: true }, { lib: lib2 });
  assert.equal(find("bank building", { lib: lib2 })[0]?.path, u.path, "an unverified clip still matches exactly");
  assert.equal(find("building bank", { lib: lib2 }).length, 0, "an unverified clip must not match on stems");

  // Routing: an exact or synonym hit never calls the network and records the slug.
  const clips = await stockClips("signing documents", 2, work, { slug: "slug-c", lib, fetchStock: noNetwork });
  assert.deepEqual(clips, [a.path]);
  assert.deepEqual(JSON.parse(readFileSync(`${a.path}.meta.json`, "utf8")).usedIn, ["slug-a", "slug-b", "slug-c"]);
  assert.deepEqual(await stockClips("ký giấy tờ", 1, work, { slug: "slug-c", lib, fetchStock: noNetwork }), [a.path]);
  // A stem-only match is a candidate, not a hit: the (stubbed) downloader IS called.
  let called = false;
  const stemRun = await stockClips("document signing", 1, work, {
    slug: "slug-c",
    lib,
    fetchStock: async (term, need, dir) => {
      called = true;
      writeFileSync(join(dir, "s.part.mp4"), "stem bytes");
      return [{ file: join(dir, "s.part.mp4"), meta: { provider: "pexels" } }];
    },
  });
  assert.ok(called, "stem match was reused without a download");
  assert.notEqual(stemRun[0], a.path);
  // A miss downloads (stubbed), goes in through add, and leaves no temp file behind.
  const fetched = await stockClips("birds lake", 1, work, {
    slug: "slug-c",
    lib,
    fetchStock: async (term, need, dir) => [{ file: (writeFileSync(join(dir, "t.part.mp4"), "other bytes"), join(dir, "t.part.mp4")), meta: { provider: "pixabay" } }],
  });
  assert.match(fetched[0], /birds-lake__pixabay__/);
  assert.ok(!existsSync(join(work, "t.part.mp4")));

  // AI: a real 64x64 still (local ffmpeg), found by its prompt; the stub generator must not run.
  const still = join(tmp, "still.jpg");
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=navy:s=64x64", "-frames:v", "1", still]);
  add(still, { kind: "ai-image", provider: "fal", prompt: "A kitchen table at dusk", seed: 1, keywords: { en: ["bills calculator kitchen table"] }, usedIn: ["slug-x"] }, { lib });
  const zoom = await aiClip("A kitchen table at dusk", 0.1, work, 1, { slug: "slug-y", lib, generate: noNetwork });
  assert.ok(existsSync(zoom));
  assert.equal(aiLicence(AI_MODEL), "AI-generated image (fal.ai, model fal-ai/flux/dev); provider terms apply");

  // index: deterministic bytes.
  index(lib);
  const first = readFileSync(join(lib, "index.json"));
  index(lib);
  assert.ok(first.equals(readFileSync(join(lib, "index.json"))));
  assert.equal(JSON.parse(first).entries.length, 4);

  // stats: counts, and reuses priced from the estimate table.
  const s = stats(lib);
  assert.equal(s.total.count, 4);
  assert.equal(s.byKind["stock-video"].count, 3);
  assert.equal(s.byKind["stock-video"].reuses, 2); // slug-a + b + c
  assert.equal(s.byKind["ai-image"].reuses, 1); // slug-x + y
  assert.equal(s.byKind["ai-image"].costAvoidedUsd, 0.03);
  assert.equal(s.total.bytes, 15 + 11 + 10 + readFileSync(still).length);

  // B17: resolveVisuals with one miss throws and marks nothing used; with none it marks the hit.
  mkdirSync(join(tmp, "videos", "rv"), { recursive: true });
  const usedIn = () => JSON.parse(readFileSync(`${a.path}.meta.json`, "utf8")).usedIn;
  const before = usedIn();
  writeFileSync(join(tmp, "videos", "rv", "edit.json"), JSON.stringify({ visuals: [{ asset: { find: "signing documents" } }, { asset: { find: "ducks on a lake" } }] }));
  assert.throws(() => resolveVisuals("rv", { publicDir: tmp }), /ducks on a lake/);
  assert.deepEqual(usedIn(), before, "a failed resolve must not mark clips used");
  writeFileSync(join(tmp, "videos", "rv", "edit.json"), JSON.stringify({ visuals: [{ asset: { find: "signing documents" } }] }));
  resolveVisuals("rv", { publicDir: tmp });
  assert.deepEqual(usedIn().sort(), [...before, "rv"].sort());

  console.log("library ok");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
