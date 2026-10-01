// Gap-scene visuals for faceless videos (scripts/voice-video.mjs). Elements
// explain; these only fill the scenes in between (Daniel's rule).
//
//   stockClips(term, need, dir, { slug }): portrait-first stock clips, Pixabay
//     then Pexels, whichever has a key in .env.local (PIXABAY_API_KEY,
//     PEXELS_API_KEY).
//   aiClip(prompt, seconds, dir, seed, { slug, keyword }): a fal.ai FLUX still
//     (FAL_KEY) turned into a slow-zoom clip, for when stock has nothing.
//
// Library first (scripts/library.mjs): both look the term or prompt up in
// public/library/ and reuse a hit with no network call, recording the slug in
// its usedIn. Only a miss searches, downloads or generates, and the result goes
// in through library.add, the one write path for asset binaries. `dir` (the
// slug's voice/footage/) keeps only the provider search-result JSON (a query
// cache) and the derived zoom clips.
//
// Ideas from OpenMontage (danielnguyenfinhub/OpenMontage): download at once
// (Pixabay and fal links expire), never mix stock and AI in one scene, one
// style anchor + one seed so AI stills match. Functions throw plain errors.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rerank } from "./clip-score.mjs";
import { add, find, markUsed } from "./library.mjs";

const MIN_CLIP_S = 3; // skip stock clips shorter than this
const MIN_WIDTH = 720; // cropped to 1080x1920 later; below this looks soft
const FPS = 30;
// Appended to every AI prompt so stills share one look (on-brand, no text,
// nobody identifiable: nothing that could pass for a real client).
const AI_STYLE =
  "photorealistic editorial photo, soft natural light, cool navy and warm amber tones, shallow depth of field, vertical 9:16 composition, no text, no logos, no watermark, people seen from behind or out of focus";
export const AI_MODEL = "fal-ai/flux/dev"; // ~US$0.03 per image (OpenMontage's estimate)
// Stills generated per AI scene; Gemini picks the best (ViMax's BestImageSelector,
// wired in). 1 = no judging. Each one costs the price above. Read when called,
// after voice-video.mjs has loaded .env.local.
// Unset, blank or non-numeric: the default 3. A number counts down to at least 1 (0 = no spares).
export const aiCandidates = () => {
  const v = (process.env.AI_CANDIDATES ?? "").trim(), n = Number(v);
  return v === "" || !Number.isFinite(n) ? 3 : Math.max(1, Math.floor(n));
};
// fal.ai stills one AI scene pays for: the candidates when Gemini can judge
// them, else 1 (no judge, no point paying for spares). The spend estimate and
// the real call both use this.
export const aiStillsPerScene = (candidates = aiCandidates()) => (process.env.GEMINI_API_KEY ? candidates : 1);
export const judgeModel = () => process.env.GEMINI_JUDGE_MODEL ?? "gemini-2.5-flash";

export const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

// Both APIs return popular clips even for nonsense searches, so "found
// something" says nothing. A clip counts only if its own words (Pixabay tags,
// the title in a Pexels link) share a word with the search; the first 5
// letters are compared, so "bills"/"bill" and "documents"/"document" match.
// Meaning comes after: the candidates that pass are re-ranked by how much
// their thumbnail looks like the phrase (scripts/clip-score.mjs).
const STOP = new Set(["and", "the", "with", "for", "from", "of", "in", "on", "at", "a", "an"]);
export const stems = (text) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 3 && !STOP.has(w))
      .map((w) => w.slice(0, 5)),
  );
// How many search words the clip's own words share; a multi-word search
// needs two ("couple reviewing documents" must not pass on "couple" alone).
const overlap = (term, text) => {
  const have = stems(text);
  return [...stems(term)].filter((s) => have.has(s)).length;
};
export const relevant = (term, text) => overlap(term, text) >= Math.min(2, stems(term).size);

// Downloads to `path` (a temp file the caller hands to library.add).
const download = async (url, path) => {
  const res = await fetch(url);
  if (!res.ok) return false; // one dead link shouldn't sink the video
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return true;
};

const cachedJson = async (file, get) => {
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const data = await get();
  writeFileSync(file, JSON.stringify(data));
  return data;
};

// What the provider says about a clip, recorded in its library meta.
export const pixabayMeta = (h, f) => ({
  provider: "pixabay",
  sourceUrl: h.pageURL ?? null,
  author: h.user ?? null,
  licence: "Pixabay Content License",
  width: f?.width ?? null,
  height: f?.height ?? null,
  durationS: h.duration ?? null,
});
export const pexelsMeta = (v, file) => ({
  provider: "pexels",
  sourceUrl: v.url ?? null,
  author: v.user?.name ?? null,
  licence: "Pexels License",
  width: file?.width ?? null,
  height: file?.height ?? null,
  durationS: v.duration ?? null,
});

// Each provider returns candidates { id, url, meta }, best first.
// Pixabay has no orientation filter for videos: portrait hits are tried
// first, landscape ones after (they get centre-cropped). Searches must be
// cached for 24 h by its terms; ours are cached for good.
const pixabay = async (term, key, dir) => {
  const hits = await cachedJson(join(dir, `pixabay-${hash(term)}.json`), async () => {
    const q = new URLSearchParams({ key, q: term.slice(0, 100), per_page: "30", safesearch: "true", video_type: "film" });
    const res = await fetch(`https://pixabay.com/api/videos/?${q}`);
    if (!res.ok) throw new Error(`Pixabay search "${term}": HTTP ${res.status}`);
    return (await res.json()).hits ?? [];
  });
  return hits
    .filter((h) => (h.duration ?? 0) >= MIN_CLIP_S && relevant(term, h.tags ?? ""))
    .map((h) => {
      // Smallest file that is still >= 1080 wide (Pixabay's "large" is often
      // 4K, ~25 MB), else the best one above MIN_WIDTH.
      const sizes = ["small", "medium", "large"].map((k) => h.videos?.[k]).filter((v) => v?.url);
      const f = sizes.find((v) => v.width >= 1080) ?? [...sizes].reverse().find((v) => v.width >= MIN_WIDTH);
      return f
        ? { id: `pixabay-${h.id}`, url: f.url, thumb: f.thumbnail ?? null, portrait: f.height > f.width, score: overlap(term, h.tags ?? ""), meta: pixabayMeta(h, f) }
        : null;
    })
    .filter(Boolean)
    // Best word match first, portrait before landscape at the same score.
    .sort((a, b) => b.score - a.score || Number(b.portrait) - Number(a.portrait));
};

// Same request as MoneyPrinterTurbo's search_videos_pexels.
const pexels = async (term, key, dir) => {
  const videos = await cachedJson(join(dir, `pexels-${hash(term)}.json`), async () => {
    const q = new URLSearchParams({ query: term, orientation: "portrait", per_page: "15" });
    const res = await fetch(`https://api.pexels.com/v1/videos/search?${q}`, { headers: { Authorization: key } });
    if (!res.ok) throw new Error(`Pexels search "${term}": HTTP ${res.status}`);
    return (await res.json()).videos ?? [];
  });
  return videos
    .filter((v) => (v.duration ?? 0) >= MIN_CLIP_S && relevant(term, v.url ?? ""))
    .map((v) => {
      const file = (v.video_files ?? [])
        .filter((f) => f.height > f.width && f.width >= 1080)
        .sort((a, b) => a.width - b.width)[0];
      return file ? { id: `pexels-${v.id}-${file.id}`, url: file.link, thumb: v.image ?? null, meta: pexelsMeta(v, file) } : null;
    })
    .filter(Boolean);
};

// The network half of stockClips: search, then download up to `need` clips
// as temp files in `dir`. Returns [{ file, meta }].
const downloadStock = async (term, need, dir) => {
  const providers = [
    [pixabay, process.env.PIXABAY_API_KEY],
    [pexels, process.env.PEXELS_API_KEY],
  ].filter(([, key]) => key);
  if (providers.length === 0)
    throw new Error(
      "A scene asks for stock footage but neither PIXABAY_API_KEY nor PEXELS_API_KEY is set in .env.local.",
    );
  let why = "";
  for (const [provider, key] of providers) {
    const picks = [];
    let ranked;
    try {
      ranked = await rerank(term, await provider(term, key, dir));
    } catch (err) {
      why = ` ${err.message}`; // every candidate looked wrong; the next provider may do better
      continue;
    }
    for (const c of ranked) {
      if (picks.length >= need) break;
      const file = join(dir, `${c.id}.part.mp4`);
      if (await download(c.url, file)) picks.push({ file, meta: { ...c.meta, ...(c.clipScore === undefined ? {} : { clipScore: Math.round(c.clipScore * 1000) / 1000 }) } });
    }
    if (picks.length > 0) return picks;
  }
  throw new Error(`No stock clip found for "${term}"; try a broader 2-5 word phrase, or an "ai" prompt.${why}`);
};

// Automatic reuse is for exact and synonym hits only: a stem match is a
// candidate for Daniel to confirm (dry run), never put in a video unseen.
const reusable = (hits) => hits.filter((h) => h.match !== "stem");
// AI images carry no licence from fal.ai; record what they are, invent nothing.
export const aiLicence = (model) => `AI-generated image (fal.ai, model ${model}); provider terms apply`;

// Library first; on a miss `fetchStock` (the network; the check swaps in a
// stub) downloads, and every clip goes into the library. Returns paths.
// ponytail: a hit with fewer clips than `need` repeats them rather than
// downloading more; add a --fresh flag if the repetition shows on screen.
export const stockClips = async (term, need, dir, { slug, lib, fetchStock = downloadStock } = {}) => {
  const hits = reusable(find(term, { kind: "stock-video", lib }));
  if (hits.length > 0) return hits.slice(0, need).map((h) => markUsed(h.path, slug, { lib }));
  const picks = await fetchStock(term, need, dir);
  return picks.map(({ file, meta }) => {
    const entry = add(file, { ...meta, kind: "stock-video", keywords: { en: [term] }, usedIn: slug ? [slug] : [] }, { lib });
    rmSync(file, { force: true });
    return entry.path;
  });
};

// The judge's answer: {"best": <1-based>, "why": "..."} somewhere in the text,
// or null when it can't be read or points outside 1..n. Pure, for the check.
export const parseJudge = (text, n) => {
  const m = String(text ?? "").match(/\{[^{}]*"best"\s*:\s*(\d+)[^{}]*\}/);
  if (!m) return null;
  const best = Number(m[1]);
  if (!(best >= 1 && best <= n)) return null;
  const why = /"why"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(m[0])?.[1] ?? "";
  return { best: best - 1, why };
};

// Which of the stills fits the scene: Gemini looks at all of them once and
// answers with an index. Judges what ViMax's BestImageSelector judges: the
// subject as described, the house style, nothing that looks like a real client,
// no text or borders. Returns { best, why } or null (the caller keeps the first).
const judgeStills = async (files, prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const parts = files.map((f) => ({ inlineData: { mimeType: "image/jpeg", data: readFileSync(f).toString("base64") } }));
  parts.push({
    text:
      `These ${files.length} images were generated for a finance video scene described as: "${prompt}". ` +
      "Pick the one to use. Judge, in this order: the subject matches the description; a clean photorealistic editorial look; " +
      "nobody's face is recognisable; no text, logos, watermarks or borders; nothing deformed. " +
      `Answer with JSON only: {"best": <1-${files.length}>, "why": "<one short sentence>"}.`,
  });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${judgeModel()}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0 } }),
  });
  if (!res.ok) throw new Error(`Gemini judge: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return parseJudge(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""), files.length);
};

// The network half of aiClip: `candidates` fal.ai stills in one call
// (synchronous POST to fal.run, images return in seconds) as temp files in
// `dir`; with more than one, the judge picks and the rest are deleted.
// Returns { file, meta }.
export const generateStill = async (prompt, seed, dir, { candidates = aiCandidates(), judge = judgeStills } = {}) => {
  const key = process.env.FAL_KEY ?? process.env.FAL_AI_API_KEY;
  if (!key) throw new Error("A scene asks for an AI image but FAL_KEY is not set in .env.local.");
  const n = aiStillsPerScene(candidates);
  const res = await fetch(`https://fal.run/${AI_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `${prompt}. ${AI_STYLE}`,
      image_size: { width: 864, height: 1536 }, // exact 9:16, multiples of 16
      num_images: n,
      seed,
      enable_safety_checker: true,
    }),
  });
  if (!res.ok) throw new Error(`fal.ai image: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const urls = ((await res.json()).images ?? []).map((i) => i?.url).filter(Boolean);
  const files = [];
  for (const [k, url] of urls.entries()) {
    const file = join(dir, `fal-${hash(`${AI_MODEL}|${prompt}|${seed}`)}-${k}.part.jpg`);
    if (await download(url, file)) files.push({ file, url });
  }
  if (files.length === 0) throw new Error("fal.ai returned no image.");
  let pick = 0;
  let judged = null;
  if (files.length > 1) {
    try {
      judged = await judge(files.map((f) => f.file), prompt);
    } catch (err) {
      console.log(`AI still: judge failed (${err.message.split("\n")[0]}); keeping the first of ${files.length}`);
    }
    if (judged) pick = judged.best;
    for (const [k, f] of files.entries()) if (k !== pick) rmSync(f.file, { force: true });
  }
  const { file, url } = files[pick];
  return {
    file,
    meta: {
      provider: "fal", model: AI_MODEL, prompt, seed, sourceUrl: url, licence: aiLicence(AI_MODEL), width: 864, height: 1536,
      ...(files.length > 1 ? { candidates: files.length, pick: pick + 1, judge: judged ? `${judgeModel()}: ${judged.why}` : "first (no verdict)" } : {}),
    },
  };
};

// Library first, exact or synonym hits only (the exact prompt, then `keyword`, the scene's footage
// phrase); on a miss `generate` makes the still and it goes into the library.
// Then a slow centre zoom so the still reads as footage; the zoom clip is
// derived, so it stays in the slug's `dir`.
export const aiClip = async (prompt, seconds, dir, seed, { slug, keyword, lib, generate = generateStill } = {}) => {
  const hit =
    reusable(find(prompt, { kind: "ai-image", lib }))[0] ??
    (keyword ? reusable(find(keyword, { kind: "ai-image", lib }))[0] : undefined);
  let still;
  let sha;
  if (hit) {
    still = markUsed(hit.path, slug, { lib });
    sha = hit.meta.sha256;
  } else {
    const { file, meta } = await generate(prompt, seed, dir);
    const entry = add(file, { ...meta, kind: "ai-image", keywords: { en: keyword ? [keyword] : [] }, usedIn: slug ? [slug] : [] }, { lib });
    rmSync(file, { force: true });
    still = entry.path;
    sha = entry.meta.sha256;
  }
  const frames = Math.max(1, Math.round(seconds * FPS));
  const clip = join(dir, `fal-${sha.slice(0, 8)}-${frames}.mp4`);
  if (!existsSync(clip)) {
    // Upscale first so zoompan's integer steps don't jitter; zoom 1 -> 1.12.
    execFileSync("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", "-i", still,
      "-vf", `scale=2160:3840,zoompan=z='1+0.12*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS}`,
      "-frames:v", String(frames), "-c:v", "libx264", "-pix_fmt", "yuv420p", clip,
    ]);
  }
  return clip;
};
