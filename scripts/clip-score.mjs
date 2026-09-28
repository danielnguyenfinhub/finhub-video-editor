// Does a stock clip look like what the scene asked for? Word overlap
// (visuals.mjs `relevant`) says a clip tagged "couple, documents" matches
// "couple reviewing documents"; it can't tell a wedding from a mortgage
// meeting. CLIP can: the search phrase and each clip's thumbnail go through
// Xenova/clip-vit-base-patch32 (@huggingface/transformers, CPU, about 350 MB
// downloaded once into the transformers cache) and the cosine similarity
// ranks them; below CLIP_MIN a clip is dropped. OpenMontage's clip_search does
// the same over a whole corpus; here it is one search at a time.
//
//   node scripts/clip-score.mjs "<phrase>" <image-or-url> [...]   scores, best first
//
// Fail open: when the model can't load (offline, first run without network)
// the word order stands and one line says so. CLIP_MIN=0 turns the filter off.
import { pathToFileURL } from "node:url";

export const MODEL = "Xenova/clip-vit-base-patch32";
// ponytail: untuned; relevant pairs score about 0.25-0.32 on this model, unrelated ones under 0.2.
// Read when called, after voice-video.mjs has loaded .env.local.
export const clipMin = () => Number(process.env.CLIP_MIN ?? 0.22);

let models = null;
const load = async () => {
  if (models) return models;
  const t = await import("@huggingface/transformers");
  const [tokenizer, text, processor, vision] = await Promise.all([
    t.AutoTokenizer.from_pretrained(MODEL),
    t.CLIPTextModelWithProjection.from_pretrained(MODEL),
    t.AutoProcessor.from_pretrained(MODEL),
    t.CLIPVisionModelWithProjection.from_pretrained(MODEL),
  ]);
  models = { tokenizer, text, processor, vision, RawImage: t.RawImage };
  return models;
};

const cosine = (a, b) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
};

// Similarity of `phrase` to each image (a URL or a path), or null for one that
// couldn't be read.
export const clipScores = async (phrase, images) => {
  const m = await load();
  const { text_embeds } = await m.text(m.tokenizer([phrase], { padding: true, truncation: true }));
  const out = [];
  for (const img of images) {
    try {
      const { image_embeds } = await m.vision(await m.processor(await m.RawImage.read(img)));
      out.push(cosine(text_embeds.data, image_embeds.data));
    } catch {
      out.push(null);
    }
  }
  return out;
};

// Candidates ordered by score, those under `min` dropped; a null score keeps
// the candidate where it was (unknown is not wrong). Pure, for the check.
export const rankByScore = (candidates, scores, min = clipMin()) =>
  candidates
    .map((c, i) => ({ ...c, clipScore: scores[i] ?? null }))
    .filter((c) => c.clipScore === null || c.clipScore >= min)
    .sort((a, b) => (b.clipScore ?? -1) - (a.clipScore ?? -1));

// The step visuals.mjs calls: candidates with a `thumb` are scored; without
// the model the list comes back as it was.
export const rerank = async (phrase, candidates, { min = clipMin(), score = clipScores } = {}) => {
  if (!(min > 0) || candidates.length === 0) return candidates;
  const thumbs = candidates.map((c) => c.thumb).filter(Boolean);
  if (thumbs.length === 0) return candidates;
  let scores;
  try {
    scores = await score(phrase, candidates.map((c) => c.thumb ?? null));
  } catch (err) {
    console.log(`clip: not scoring "${phrase}" (${err.message.split("\n")[0]}); word order stands`);
    return candidates;
  }
  const ranked = rankByScore(candidates, scores, min);
  const best = Math.max(...scores.filter((s) => s !== null), -1);
  if (ranked.length === 0)
    throw new Error(`No stock clip looks like "${phrase}" (best CLIP score ${best.toFixed(2)} < ${min}); try other words, an "ai" prompt, or a lower CLIP_MIN.`);
  return ranked;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [phrase, ...images] = process.argv.slice(2);
  if (!phrase || images.length === 0) {
    console.error('usage: node scripts/clip-score.mjs "<phrase>" <image-or-url> [...]');
    process.exit(2);
  }
  const scores = await clipScores(phrase, images);
  for (const c of rankByScore(images.map((i) => ({ image: i })), scores, 0)) console.log(`${(c.clipScore ?? NaN).toFixed(3)}  ${c.image}`);
}
