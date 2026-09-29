// MortgageReel: the reusable FinHub talking-head template. Per video, only
// public/videos/<slug>/edit.json and its recording (source.mp4, words.json,
// foreground.webm; see recording.ts) change; this code doesn't.
// calculateMetadata loads the edit, enforces ASIC RG 234 on every on-screen
// string (the render FAILS rather than ship a non-compliant claim), builds
// the paced timeline and hands it to the component as props.
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { Audio } from "@remotion/media";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { z } from "zod";
import { DEFAULT_DESIGN, getDesign } from "../designs";
import { assertCompliantCopy, assertRateGate } from "./compliance";
import { recordingPath } from "./recording";
import { ComplianceCard } from "./EndCards";
import { Visuals } from "./Visuals";
import {
  DEFAULT_CTA_QUESTION,
  DEFAULT_SUBTITLE,
  onScreenCopy,
  parseEdit,
  type EditJson,
  type Reel,
} from "./schema";
import { readingFloor } from "./golden";
import { SafeZones } from "./SafeZones";
import { KEYWORDS, clamp, useReelFont } from "./style";
import {
  CHAPTER_TRANSITION_FRAMES,
  COVER_FRAMES,
  COVER_TRANSITION_FRAMES,
  TALK_START_FRAME,
  buildTimeline,
  type OutCaption,
  type Word,
} from "./timeline";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
export const OUTRO_FRAMES = 150;
export const OUTRO_TRANSITION = 18;
// Compliance disclosures close the video, held for 5 s.
export const COMPLIANCE_FRAMES = 150;
export const COMPLIANCE_TRANSITION = 10;
const DEFAULT_COVER_FRAME_MS = 1500;
const MUSIC_VOLUME = 0.3;
// While Daniel talks the music plays at this fraction of its volume.
const MUSIC_DUCK = 0.3;
// Pauses shorter than this stay ducked, so the music doesn't pump between words.
const MUSIC_HOLD_MS = 700;
// Frames for a full swing between ducked and full, either way.
const MUSIC_RAMP_FRAMES = 10;
const MUSIC_FADE_IN_FRAMES = 15;
const MUSIC_FADE_OUT_FRAMES = 45;

// `design` overrides edit.json's, so one video can be previewed in every
// template (`--props={"slug":"ty-do","design":"newsroom"}`) without editing it.
export const mortgageReelSchema = z.object({
  slug: z.string(),
  design: z.string().optional(),
  // QC stills only: draw the SAFE band and FACE box (golden.ts) over the frame.
  safeZones: z.boolean().optional(),
});
export type MortgageReelProps = z.infer<typeof mortgageReelSchema> & {
  reel: Reel | null;
};

// Designs that break in quick mode (the opaque full frame hides what their
// cut-out let through): editorial's Behind column covers his face once drawn
// on top; checklist, datalab and kitchen covers put him over their title.
// Quick mode renders these in classic instead (buildReel).
// ponytail: whole-design fallback; fix a cover's layer order to drop it here.
const QUICK_FALLBACK = new Set(["editorial", "checklist", "datalab", "kitchen"]);

const fetchJson = async (slug: string, path: string): Promise<unknown> => {
  const res = await fetch(staticFile(path));
  if (!res.ok)
    throw new Error(
      `MortgageReel "${slug}": public/${path} not found (HTTP ${res.status}). ` +
        `Run scripts/prep-video.py <video> ${slug} first, then write edit.json.`,
    );
  return res.json();
};

// edit.json + words.json -> the reel and its length. Validates the edit,
// enforces ASIC RG 234 and the rate gate (throws, so a render FAILS rather
// than ship a non-compliant claim). Shared by calculateMetadata and the
// review page (review/), which previews unsaved edits in a <Player>.
export const buildReel = (
  editJson: unknown,
  words: unknown,
  slug: string,
  designOverride?: string,
): { reel: Reel; durationInFrames: number } => {
  const parsed = parseEdit(editJson, slug);
  const picked = designOverride
    ? { ...parsed, design: designOverride }
    : parsed;
  const fallback =
    picked.background === "vignette" &&
    QUICK_FALLBACK.has(picked.design ?? DEFAULT_DESIGN);
  if (fallback)
    console.warn(
      `MortgageReel "${slug}": design "${picked.design}" does not work in quick mode ` +
        `("background": "vignette"), so this video renders in "classic". ` +
        `Remove "background" (and make the cut-out) to keep "${picked.design}".`,
    );
  const edit = fallback ? { ...picked, design: "classic" } : picked;
  // Throws for an unknown name, listing the designs there are.
  const design = getDesign(edit.design ?? DEFAULT_DESIGN);
  if (!Array.isArray(words) || words.length === 0)
    throw new Error(
      `public/${recordingPath(slug, edit.source, "words.json")} has no words.`,
    );
  // Throws "RG 234: restricted terminology found".
  assertCompliantCopy(
    { ...onScreenCopy(edit), [`design:${design.id}`]: design.copy },
    edit.exemptions ?? [],
  );
  // Visuals are resolved at prep time, never during a render.
  const unresolved = (edit.visuals ?? []).flatMap((v) =>
    typeof v.asset === "string" ? [] : [`"${v.asset.find}"`],
  );
  if (unresolved.length)
    throw new Error(
      `MortgageReel "${slug}": visuals ${unresolved.join(", ")} still say {find}. ` +
        `Run \`node scripts/library.mjs resolve ${slug}\` to pick library files first.`,
    );
  const rate = edit.compliance?.advertisedRate;
  if (rate)
    assertRateGate(rate.rateFigure, rate.comparisonRate, rate.ratesAsAt);
  const timeline = buildTimeline(words as Word[], edit, FPS);
  return {
    // Cards and cues held to their reading time (WP5); speech is untouched.
    reel: { edit: readingFloor({ edit, timeline }, FPS).edit, timeline },
    durationInFrames:
      TALK_START_FRAME +
      timeline.talkFrames +
      OUTRO_FRAMES -
      OUTRO_TRANSITION +
      COMPLIANCE_FRAMES -
      COMPLIANCE_TRANSITION,
  };
};

export const calculateMortgageReelMetadata: CalculateMetadataFunction<
  MortgageReelProps
> = async ({ props }) => {
  const { slug, design, safeZones } = props;
  const editJson = await fetchJson(slug, `videos/${slug}/edit.json`);
  const { source, visuals, background } = parseEdit(editJson, slug);
  const cutOutPath = recordingPath(slug, source, "foreground.webm");
  const assets = (visuals ?? []).flatMap((v) =>
    typeof v.asset === "string" ? [v.asset] : [],
  );
  const [words, cutOut, ...found] = await Promise.all([
    fetchJson(slug, recordingPath(slug, source, "words.json")),
    // Quick mode and room mode need no cut-out; not asking keeps a 404 out of the log.
    background === "vignette" || background === "room"
      ? null
      : fetch(staticFile(cutOutPath), { method: "HEAD" }),
    ...assets.map((a) => fetch(staticFile(a), { method: "HEAD" })),
  ]);
  const missing = assets.filter((_, i) => !(found[i] as Response).ok);
  if (missing.length)
    throw new Error(
      `MortgageReel "${slug}": visuals point at files that aren't in public/: ${missing.join(", ")}. ` +
        `Add them with \`node scripts/library.mjs add\` or change the visual.`,
    );
  // Golden rule: the background is always removed, so the cut-out must exist,
  // unless edit.json opts out ("background": "vignette" or "room").
  if (cutOut && !cutOut.ok)
    throw new Error(
      `MortgageReel "${slug}": public/${cutOutPath} is missing. ` +
        `Run \`npm run review\`, open http://localhost:4100/matte.html?slug=${slug} and wait for "Saved".`,
    );
  const { reel, durationInFrames } = buildReel(editJson, words, slug, design);
  return {
    durationInFrames,
    defaultOutName: slug,
    props: { slug, design, reel, safeZones },
  };
};

// edit.json's music, looped under the whole video and ducked under speech. The
// captions (talk-timeline ms, kept words only) say when Daniel talks; the level
// is precomputed per frame and ramps at most one MUSIC_RAMP_FRAMES step a
// frame, starting to dip before each phrase.
export const Music: React.FC<{
  music: NonNullable<EditJson["music"]>;
  captions: OutCaption[];
}> = ({ music, captions }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const levels = React.useMemo(() => {
    const level = new Array<number>(durationInFrames).fill(1);
    for (const c of captions) {
      const from = Math.floor(((c.startMs - MUSIC_HOLD_MS / 2) * fps) / 1000);
      const to = Math.ceil(((c.endMs + MUSIC_HOLD_MS / 2) * fps) / 1000);
      for (
        let f = Math.max(0, TALK_START_FRAME + from);
        f < Math.min(durationInFrames, TALK_START_FRAME + to);
        f++
      )
        level[f] = MUSIC_DUCK;
    }
    const step = (1 - MUSIC_DUCK) / MUSIC_RAMP_FRAMES;
    for (let f = 1; f < level.length; f++)
      level[f] = Math.min(level[f], level[f - 1] + step);
    for (let f = level.length - 2; f >= 0; f--)
      level[f] = Math.min(level[f], level[f + 1] + step);
    return level;
  }, [captions, fps, durationInFrames]);
  const volume = music.volume ?? MUSIC_VOLUME;
  return (
    <Audio
      src={staticFile(music.file)}
      trimBefore={Math.round(((music.startMs ?? 0) * fps) / 1000)}
      loop
      // The volume curve follows the video, not each pass through the track.
      loopVolumeCurveBehavior="extend"
      volume={(f) =>
        volume *
        (levels[f] ?? 1) *
        interpolate(
          f,
          [
            0,
            MUSIC_FADE_IN_FRAMES,
            durationInFrames - MUSIC_FADE_OUT_FRAMES,
            durationInFrames,
          ],
          [0, 1, 1, 0],
          clamp,
        )
      }
    />
  );
};

export const MortgageReel: React.FC<MortgageReelProps> = ({
  slug,
  reel,
  safeZones,
}) => {
  useReelFont();
  if (!reel) throw new Error("MortgageReel: calculateMetadata did not run.");
  const { edit, timeline } = reel;
  const design = getDesign(edit.design ?? DEFAULT_DESIGN);
  const src = staticFile(recordingPath(slug, edit.source, "source.mp4"));
  const foreground =
    edit.background === "room"
      ? undefined
      : staticFile(recordingPath(slug, edit.source, "foreground.webm"));
  const keywords = [...KEYWORDS, ...(edit.keywords ?? [])];
  const talk = timeline.talkFrames;
  // Quick mode: the full frame is opaque and would hide a Behind layer, so it
  // draws on top of Daniel instead (under the Overlay).
  const quick = edit.background === "vignette";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={COVER_FRAMES}>
          <design.Cover
            src={src}
            foreground={foreground}
            coverFrame={Math.round(
              ((edit.coverFrameMs ?? DEFAULT_COVER_FRAME_MS) * FPS) / 1000,
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
                  design.Behind && !quick ? (
                    // A negative `from` puts the layer on the talk timeline
                    // (frame 0 = first word) inside this segment's sequence.
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
          presentation={wipe({ direction: "from-bottom" })}
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
          <ComplianceCard compliance={edit.compliance} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {edit.music ? (
        <Music music={edit.music} captions={timeline.captions} />
      ) : null}
      {edit.visuals?.length ? (
        <Sequence
          from={TALK_START_FRAME}
          durationInFrames={talk - OUTRO_TRANSITION}
          layout="none"
        >
          <Visuals
            reel={reel}
            src={src}
            foreground={foreground}
            frameStyle={design.visualFrame}
          />
        </Sequence>
      ) : null}
      {quick && design.Behind ? (
        <Sequence
          from={TALK_START_FRAME}
          durationInFrames={talk - OUTRO_TRANSITION}
          layout="none"
        >
          <design.Behind
            reel={reel}
            keywords={keywords}
            talkFrames={talk}
            src={src}
          />
        </Sequence>
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
      {safeZones ? <SafeZones /> : null}
    </AbsoluteFill>
  );
};

export const mortgageReelComposition = {
  id: "MortgageReel",
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  durationInFrames: 300, // replaced by calculateMortgageReelMetadata
} as const;
