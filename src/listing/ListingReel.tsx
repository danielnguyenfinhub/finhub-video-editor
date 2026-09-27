// Global RE listing video (1080x1920): intro + hook, a room-by-room photo
// tour, key facts, price, location, the full address, the agent and the legal
// end card, voiced in Vietnamese or English with word-synced captions.
// Data: public/listings/<slug>/ (docs/agents/listing-video.md).
//   npx remotion render src/index.ts ListingReel out.mp4 --props='{"slug":"<slug>","lang":"vi"}'
import { Audio } from "@remotion/media";
import {
  linearTiming,
  type TransitionPresentation,
  TransitionSeries,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Fragment, useMemo } from "react";
import {
  AbsoluteFill,
  type CalculateMetadataFunction,
  interpolate,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { useReelFont } from "../mortgage/style";
import { AddressScene } from "./AddressScene";
import { AgentCard } from "./AgentCard";
import { Captions } from "./Captions";
import {
  FPS,
  LEAD_FRAMES,
  loadListing,
  photoOf,
  type Beat,
  type ListingData,
} from "./data";
import { DisclaimerCard } from "./DisclaimerCard";
import { FactsCard } from "./FactsCard";
import { IntroCard } from "./IntroCard";
import { LocationScene } from "./LocationScene";
import { PhotoScene } from "./PhotoScene";
import { PlanScene } from "./PlanScene";
import { PriceCard } from "./PriceCard";
import { isPlan } from "./rooms";
import { Teaser } from "./Teaser";
import { TestWatermark } from "./TestWatermark";
import { C, clamp, LangContext, SANS } from "./theme";
import { TourBar } from "./TourBar";

export const listingReelSchema = z.object({
  slug: z.string(), // "" = nothing chosen: a placeholder, so `remotion compositions` works on a fresh clone
  lang: z.enum(["vi", "en"]),
});
export type ListingReelProps = z.infer<typeof listingReelSchema> & {
  data: ListingData | null;
};

const TRANSITION = 12;
const MUSIC = "music/hopeful-inspiring.mp3";
const MUSIC_VOLUME = 0.22;
const MUSIC_DUCK = 0.35; // share of MUSIC_VOLUME while the voice speaks

export const calculateListingReelMetadata: CalculateMetadataFunction<
  ListingReelProps
> = async ({ props }) => {
  if (!props.slug)
    return { durationInFrames: 90, props: { ...props, data: null } };
  const data = await loadListing(props.slug, props.lang);
  return {
    durationInFrames: data.durationInFrames,
    defaultOutName: `${props.slug}-${props.lang}`,
    props: { ...props, data },
  };
};

// A beat's picture; photos fall back to the first listing photo behind cards.
const Visual: React.FC<{ slug: string; beat: Beat; data: ListingData }> = ({
  slug,
  beat,
  data,
}) => {
  const { scene } = beat;
  const photo = photoOf(data.listing, scene.photo);
  const backdrop = scene.photo ?? data.listing.photos[0].file;
  const frames = beat.frames + TRANSITION;
  switch (scene.kind) {
    case "intro":
      return (
        <IntroCard
          slug={slug}
          scene={scene}
          listing={data.listing}
          frames={frames}
        />
      );
    case "photo":
      if (!photo)
        throw new Error(
          `Scene "${scene.id}": photo ${scene.photo} is not in listing.json.`,
        );
      return isPlan(scene.id) ? (
        <PlanScene slug={slug} id={scene.id} photo={photo} frames={frames} />
      ) : (
        <PhotoScene slug={slug} scene={scene} photo={photo} frames={frames} />
      );
    case "facts":
      return <FactsCard slug={slug} listing={data.listing} photo={backdrop} />;
    case "price":
      return (
        <PriceCard
          slug={slug}
          listing={data.listing}
          photo={backdrop}
          agent={data.agent}
        />
      );
    case "location":
      return (
        <LocationScene slug={slug} listing={data.listing} photo={backdrop} />
      );
    case "address":
      return (
        <AddressScene
          slug={slug}
          listing={data.listing}
          photo={scene.photo}
          frames={frames}
        />
      );
    case "agent":
      return <AgentCard slug={slug} agent={data.agent} />;
    case "disclaimer":
      return (
        <DisclaimerCard
          slug={slug}
          listing={data.listing}
          licensee={data.licensee}
        />
      );
  }
};

// Room to room: alternate a wipe and a slide; into and between cards: a fade.
const presentationFor = (next: Beat, i: number) =>
  (next.scene.kind !== "photo"
    ? fade()
    : i % 2
      ? wipe({ direction: "from-right" })
      : slide({
          direction: "from-right",
        })) as unknown as TransitionPresentation<Record<string, unknown>>;

// The music bed, ducked under the voice (levels precomputed per frame).
const Music: React.FC<{ data: ListingData }> = ({ data }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const levels = useMemo(() => {
    const level = new Array<number>(durationInFrames).fill(1);
    for (const w of data.words) {
      const a = LEAD_FRAMES + Math.floor(((w.startMs - 300) * fps) / 1000);
      const b = LEAD_FRAMES + Math.ceil(((w.endMs + 300) * fps) / 1000);
      for (let f = Math.max(0, a); f < Math.min(durationInFrames, b); f++)
        level[f] = MUSIC_DUCK;
    }
    const step = (1 - MUSIC_DUCK) / 10;
    for (let f = 1; f < level.length; f++)
      level[f] = Math.min(level[f], level[f - 1] + step);
    for (let f = level.length - 2; f >= 0; f--)
      level[f] = Math.min(level[f], level[f + 1] + step);
    return level;
  }, [data.words, durationInFrames, fps]);
  return (
    <Audio
      src={staticFile(MUSIC)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={(f) =>
        MUSIC_VOLUME *
        (levels[f] ?? 1) *
        interpolate(
          f,
          [0, 15, durationInFrames - 45, durationInFrames],
          [0, 1, 1, 0],
          clamp,
        )
      }
    />
  );
};

export const ListingReel: React.FC<ListingReelProps> = ({
  slug,
  lang,
  data,
}) => {
  useReelFont();
  if (!slug || !data)
    return (
      <AbsoluteFill
        style={{
          backgroundColor: C.night,
          color: C.cream,
          fontFamily: SANS,
          fontSize: 44,
          padding: 80,
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        Chưa chọn nhà / No listing chosen: --props=
        {`'{"slug":"<slug>","lang":"vi"}'`}
      </AbsoluteFill>
    );
  const firstPhoto = data.beats.find((b) => b.photoIndex !== null);
  const price = data.beats.find((b) => b.scene.kind === "price");
  return (
    <LangContext.Provider value={lang}>
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <TransitionSeries>
          {data.beats.map((beat, i) => {
            const next = data.beats[i + 1];
            return (
              <Fragment key={`${beat.scene.id}-${i}`}>
                <TransitionSeries.Sequence
                  durationInFrames={beat.frames + (next ? TRANSITION : 0)}
                >
                  <Visual slug={slug} beat={beat} data={data} />
                </TransitionSeries.Sequence>
                {next ? (
                  <TransitionSeries.Transition
                    presentation={presentationFor(next, i)}
                    timing={linearTiming({ durationInFrames: TRANSITION })}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </TransitionSeries>
        <TourBar beats={data.beats} />
        {firstPhoto ? <Teaser from={firstPhoto.from + 15} /> : null}
        <Captions words={data.words} beats={data.beats} />
        {data.listing.test || data.listing.unknowns.length ? (
          <TestWatermark unknowns={data.listing.unknowns} />
        ) : null}
        <Sequence from={LEAD_FRAMES}>
          <Audio
            src={staticFile(`listings/${slug}/voice/narration-${lang}.wav`)}
          />
        </Sequence>
        <Music data={data} />
        {data.beats
          .filter((b, i) => i > 0 && b.scene.kind === "photo")
          .map((b) => (
            <Sequence
              key={`whoosh-${b.from}`}
              from={Math.max(0, b.from - 4)}
              durationInFrames={30}
            >
              <Audio src={staticFile("sfx/whoosh.wav")} volume={0.3} />
            </Sequence>
          ))}
        {price ? (
          <Sequence from={price.from + 8} durationInFrames={45}>
            <Audio src={staticFile("sfx/ding.wav")} volume={0.45} />
          </Sequence>
        ) : null}
      </AbsoluteFill>
    </LangContext.Provider>
  );
};

export const listingReelComposition = {
  id: "ListingReel",
  component: ListingReel,
  width: 1080,
  height: 1920,
  fps: FPS,
  durationInFrames: 90, // replaced by calculateListingReelMetadata
} as const;
