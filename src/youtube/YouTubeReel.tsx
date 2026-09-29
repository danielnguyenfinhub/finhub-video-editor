// YouTubeReel: the 16:9 long-form explainer. The same edit.json + voice as a
// vertical faceless video (public/videos/<slug>/), the same core rules
// (buildReel: validation, RG 234, rate gate, timeline, reading holds), drawn
// by a YouTube design (src/youtube/designs/) at 1920x1080. The vertical
// MortgageReel is untouched; only the picture changes.
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  type CalculateMetadataFunction,
} from "remotion";
import { z } from "zod";
import { assertCompliantCopy } from "../mortgage/compliance";
import {
  COMPLIANCE_FRAMES,
  COMPLIANCE_TRANSITION,
  Music,
  OUTRO_FRAMES,
  OUTRO_TRANSITION,
  buildReel,
} from "../mortgage/MortgageReel";
import { recordingPath } from "../mortgage/recording";
import {
  DEFAULT_CTA_QUESTION,
  DEFAULT_SUBTITLE,
  parseEdit,
  type Reel,
} from "../mortgage/schema";
import { KEYWORDS, useReelFont } from "../mortgage/style";
import {
  COVER_FRAMES,
  COVER_TRANSITION_FRAMES,
  CHAPTER_TRANSITION_FRAMES,
  TALK_START_FRAME,
} from "../mortgage/timeline";
import { DEFAULT_YT_DESIGN, getYouTubeDesign } from "./designs";
import { YT_HEIGHT, YT_WIDTH } from "./frame";
import { ComplianceCard16 } from "./Kit";

// Any registered vertical design id: buildReel checks edit.json against the
// vertical registry, so the YouTube picture is chosen separately (`design`).
const VERTICAL_CHECK_DESIGN = "faceless";
const DEFAULT_COVER_FRAME_MS = 1500;

export const youTubeReelSchema = z.object({
  slug: z.string(),
  design: z.string().optional(),
});
export type YouTubeReelProps = z.infer<typeof youTubeReelSchema> & {
  reel: Reel | null;
};

const fetchJson = async (slug: string, path: string): Promise<unknown> => {
  const res = await fetch(staticFile(path));
  if (!res.ok)
    throw new Error(
      `YouTubeReel "${slug}": public/${path} not found (HTTP ${res.status}). ` +
        `Voice the script first: node scripts/voice-video.mjs ${slug}.`,
    );
  return res.json();
};

export const calculateYouTubeReelMetadata: CalculateMetadataFunction<
  YouTubeReelProps
> = async ({ props }) => {
  const { slug } = props;
  const design = getYouTubeDesign(props.design ?? DEFAULT_YT_DESIGN);
  const editJson = await fetchJson(slug, `videos/${slug}/edit.json`);
  const { source, exemptions } = parseEdit(editJson, slug);
  const words = await fetchJson(
    slug,
    recordingPath(slug, source, "words.json"),
  );
  const { reel, durationInFrames } = buildReel(
    editJson,
    words,
    slug,
    VERTICAL_CHECK_DESIGN,
  );
  // The YouTube design's own strings, RG 234-scanned like a vertical design's.
  assertCompliantCopy(
    { [`youtube:${design.id}`]: design.copy },
    exemptions ?? [],
  );
  return {
    durationInFrames,
    width: YT_WIDTH,
    height: YT_HEIGHT,
    defaultOutName: `${slug}-youtube`,
    props: { ...props, design: design.id, reel },
  };
};

export const YouTubeReel: React.FC<YouTubeReelProps> = ({
  slug,
  design: id,
  reel,
}) => {
  useReelFont();
  if (!reel) throw new Error("YouTubeReel: calculateMetadata did not run.");
  const { edit, timeline } = reel;
  const design = getYouTubeDesign(id ?? DEFAULT_YT_DESIGN);
  const src = staticFile(recordingPath(slug, edit.source, "source.mp4"));
  // Faceless voice: a fully transparent cut-out, so no one is on screen.
  const foreground = staticFile(
    recordingPath(slug, edit.source, "foreground.webm"),
  );
  const keywords = [...KEYWORDS, ...(edit.keywords ?? [])];
  const talk = timeline.talkFrames;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={COVER_FRAMES}>
          <design.Cover
            src={src}
            foreground={foreground}
            coverFrame={Math.round(
              ((edit.coverFrameMs ?? DEFAULT_COVER_FRAME_MS) * 30) / 1000,
            )}
            title={edit.title}
            subtitle={edit.subtitle ?? DEFAULT_SUBTITLE}
            keywords={keywords}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: COVER_TRANSITION_FRAMES })}
        />
        {timeline.segments.map((seg, i) => (
          <React.Fragment key={seg.srcFrom}>
            <TransitionSeries.Sequence durationInFrames={seg.outDuration}>
              <design.Talk
                seg={seg}
                index={i}
                src={src}
                look={edit.look}
                foreground={foreground}
                behind={
                  design.Behind ? (
                    <Sequence from={-seg.outFrom} layout="none">
                      <design.Behind
                        reel={reel}
                        keywords={keywords}
                        talkFrames={talk}
                        src={src}
                      />
                    </Sequence>
                  ) : null
                }
              />
            </TransitionSeries.Sequence>
            {seg.transitionAfter ? (
              <TransitionSeries.Transition
                presentation={design.chapterTransition(seg.transitionAfter)}
                timing={linearTiming({
                  durationInFrames: CHAPTER_TRANSITION_FRAMES,
                })}
              />
            ) : null}
          </React.Fragment>
        ))}
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={springTiming({
            config: { damping: 200 },
            durationInFrames: OUTRO_TRANSITION,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={OUTRO_FRAMES}>
          <design.Outro question={edit.cta?.question ?? DEFAULT_CTA_QUESTION} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: COMPLIANCE_TRANSITION })}
        />
        <TransitionSeries.Sequence durationInFrames={COMPLIANCE_FRAMES}>
          <ComplianceCard16 compliance={edit.compliance} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {edit.music ? (
        <Music music={edit.music} captions={timeline.captions} />
      ) : null}
      <Sequence
        from={TALK_START_FRAME}
        durationInFrames={talk - OUTRO_TRANSITION}
        layout="none"
      >
        <design.Overlay
          reel={reel}
          keywords={keywords}
          talkFrames={talk}
          src={src}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

export const youTubeReelComposition = {
  id: "YouTubeReel",
  width: YT_WIDTH,
  height: YT_HEIGHT,
  fps: 30,
  durationInFrames: 300, // replaced by calculateYouTubeReelMetadata
} as const;
