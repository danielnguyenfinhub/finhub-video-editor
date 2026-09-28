// The Global RE listing video's data: listing.json (written by
// scripts/listing-prep.mjs from the agent's listing.txt), script.json (written
// by Claude from listing.json + the photos, see
// .claude/skills/globalre-listing-video/) and the voice step's timeline.json.
// Pipeline: docs/agents/listing-video.md.
import { z } from "zod";

export const photoSchema = z.object({
  file: z.string(), // "01.jpg" in public/listings/<slug>/photos/
  original: z.string(), // the agent's file name
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  note: z.string().nullable(), // from "Photo order notes", e.g. "front"
  edited: z.boolean(), // listing.txt "Edited photos": labelled on screen
});

export const listingSchema = z.object({
  slug: z.string(),
  agent: z.string(),
  listingType: z.enum(["sale", "rent"]),
  street: z.string(),
  suburb: z.string(),
  postcode: z.string().regex(/^\d{4}$/),
  state: z.string(),
  propertyType: z.enum(["house", "unit", "townhouse", "land", "duplex"]),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().int().nonnegative(),
  carSpaces: z.number().int().nonnegative().nullable(), // null: the listing gives none
  landSizeM2: z.number().positive().nullable(),
  internalSizeM2: z.number().positive().nullable(),
  price: z.string().min(1), // exactly as advertised
  auction: z.string().nullable(),
  openHomes: z.array(z.string()),
  availableFrom: z.string().nullable(),
  features: z.array(z.string()),
  nearby: z.array(z.string()), // only what the agent listed
  doNotSay: z.array(z.string()),
  tenanted: z.boolean().nullable(), // null: unknown (see unknowns)
  tenantPhotoConsent: z.boolean().nullable(), // null when not tenanted
  // Agency-agreement facts given as "unknown": a TEST render only, never posted.
  unknowns: z.array(z.enum(["tenanted", "estimatedPrice"])),
  // PRIVATE: from the agency agreement; never on screen, in the voice or the caption.
  estimatedSellingPrice: z.number().positive().nullable(),
  test: z.boolean(), // folder "_TEST ...": TEST watermark, "TEST - " files, not for posting
  materialFacts: z.array(z.string()), // PSAR s 60, shown on the disclaimer card
  photos: z.array(photoSchema).min(1),
  // Suburb centre (never the street) from MapTiler geocoding, or null: no map.
  location: z
    .object({ latitude: z.number(), longitude: z.number(), label: z.string() })
    .nullable(),
});
export type Listing = z.infer<typeof listingSchema>;

export const SCENE_KINDS = [
  "intro",
  "photo",
  "facts",
  "price",
  "location",
  "address",
  "agent",
  "disclaimer",
] as const;

export const sceneSchema = z.object({
  id: z.string(), // for photos, the room: "front", "kitchen", "bedroom-2" (rooms.ts)
  photo: z.string().nullable(),
  vi: z.string().min(1),
  en: z.string().min(1),
  kind: z.enum(SCENE_KINDS),
  focus: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .optional(),
  highlight: z.string().optional(), // "Bếp đảo đá / Stone island kitchen"
  // Areas of the photo to blur (0-1 of the photo), e.g. a letterbox number
  // readable before the address reveal.
  blur: z.array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })).optional(),
});
export type Scene = z.infer<typeof sceneSchema>;

export const postSchema = z.object({
  title: z.string().min(1).max(80),
  caption: z.string().min(1), // Vietnamese
  captionEn: z.string().min(1),
  hashtags: z.array(z.string().regex(/^#\S+$/)).length(7),
});

export const scriptSchema = z.object({
  title: z.string().min(1),
  scenes: z.array(sceneSchema).min(3),
  post: postSchema,
});
export type ListingScript = z.infer<typeof scriptSchema>;

// Per scene, where its voice sits in narration.wav (the voice step writes it).
export const timelineSchema = z.array(
  z.object({ fromMs: z.number(), toMs: z.number(), text: z.string() }),
);
export type Timeline = z.infer<typeof timelineSchema>;

export const wordsSchema = z.array(
  z.object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number(),
    timestampMs: z.number().nullable(),
    confidence: z.number().nullable(),
  }),
);
