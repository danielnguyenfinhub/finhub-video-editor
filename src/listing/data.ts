// ListingReel's data: listing.json + script.json + the voice step's words and
// timeline, turned into frame-timed beats. calculateMetadata builds it once.
import type { Caption } from "@remotion/captions";
import { staticFile } from "remotion";
import { BUSINESS, type Agent } from "./copy";
import {
  listingSchema,
  scriptSchema,
  timelineSchema,
  wordsSchema,
  type Listing,
  type ListingScript,
  type Scene,
} from "./schema";

export type Lang = "vi" | "en";
export type Beat = {
  scene: Scene;
  from: number; // first frame of this beat in the video
  frames: number; // until the next beat starts
  fromMs: number; // voice, in narration time
  toMs: number;
  subtitle: string; // the other language's line
  photoIndex: number | null; // 0-based among photo beats (tour progress)
};
export type ListingData = {
  listing: Listing;
  script: ListingScript;
  words: Caption[];
  beats: Beat[];
  agent: Agent;
  licensee: Agent;
  durationInFrames: number;
};

export const FPS = 30;
export const LEAD_FRAMES = 6; // the voice starts after this
const TAIL_FRAMES = 90; // the end card holds after the last word

const fetchJson = async (slug: string, file: string) => {
  const res = await fetch(staticFile(`listings/${slug}/${file}`));
  if (!res.ok)
    throw new Error(
      `ListingReel "${slug}": public/listings/${slug}/${file} not found (HTTP ${res.status}). ` +
        (file.startsWith("words") || file.startsWith("timeline")
          ? `Voice it first: node scripts/voice-video.mjs ${slug} --listing --lang ${file.includes("-en") ? "en" : "vi"}`
          : `Run npm run listing -- "<folder>" and write script.json first (docs/agents/listing-video.md).`),
    );
  return res.json();
};

const agentById = (id: string): Agent => {
  const agent = (BUSINESS.agents as Record<string, Agent>)[id];
  if (!agent)
    throw new Error(`Agent "${id}" is not in config/businesses/globalre.json.`);
  return agent;
};

export const loadListing = async (
  slug: string,
  lang: Lang,
  now = new Date(),
): Promise<ListingData> => {
  const [l, s, w, t] = await Promise.all([
    fetchJson(slug, "listing.json"),
    fetchJson(slug, "script.json"),
    fetchJson(slug, `words-${lang}.json`),
    fetchJson(slug, `timeline-${lang}.json`),
  ]);
  const listing = listingSchema.parse(l);
  const script = scriptSchema.parse(s);
  const words = wordsSchema.parse(w);
  const timeline = timelineSchema.parse(t);
  if (timeline.length !== script.scenes.length)
    throw new Error(
      `ListingReel "${slug}": script.json has ${script.scenes.length} scenes but timeline-${lang}.json has ${timeline.length}. Re-voice: node scripts/voice-video.mjs ${slug} --listing --lang ${lang}`,
    );
  // Photos of a tenanted home need the tenant's written consent (RTA ss 55AA, 55A).
  if (listing.tenanted && !listing.tenantPhotoConsent)
    throw new Error(
      `ListingReel "${slug}": the home is tenanted and listing.txt has no photo consent. Nothing is rendered until consent is recorded.`,
    );
  const agent = agentById(listing.agent);
  const licensee = agentById(BUSINESS.licensee);
  for (const a of new Set([agent, licensee]))
    if (now > new Date(`${a.licence.expires}T23:59:59`))
      throw new Error(
        `ListingReel: ${a.name}'s licence ${a.licence.number} expired on ${a.licence.expires}. Update config/businesses/globalre.json before rendering.`,
      );

  const startOf = (ms: number) => LEAD_FRAMES + Math.round((ms * FPS) / 1000);
  const end = startOf(timeline[timeline.length - 1].toMs) + TAIL_FRAMES;
  let photos = 0;
  const beats: Beat[] = script.scenes.map((scene, i) => {
    const from = i === 0 ? 0 : startOf(timeline[i].fromMs);
    const next =
      i + 1 < timeline.length ? startOf(timeline[i + 1].fromMs) : end;
    return {
      scene,
      from,
      frames: next - from,
      fromMs: timeline[i].fromMs,
      toMs: timeline[i].toMs,
      subtitle: timeline[i].text,
      photoIndex: scene.kind === "photo" ? photos++ : null,
    };
  });
  return {
    listing,
    script,
    words,
    beats,
    agent,
    licensee,
    durationInFrames: end,
  };
};

export const photoOf = (listing: Listing, file: string | null) =>
  file ? (listing.photos.find((p) => p.file === file) ?? null) : null;
