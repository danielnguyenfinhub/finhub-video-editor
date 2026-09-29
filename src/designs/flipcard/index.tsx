// "flipcard" (Lật thẻ, Flip Card): the before/after family as one premium
// card in 3D. Pure motion graphics, no footage: a dark navy stage with soft
// bokeh, and the hero card floating and tilting on it. Front face = BEFORE
// (navy foil), back face = AFTER (gold foil): on the reveal the card turns
// over on its Y axis with a sheen and a stretching shadow, and a difference
// ribbon unfurls under it only when the reel states one or both values parse.
// Points are a dealt deck; the hook turns the card to its value; figures are
// mini gold cards in the lane under the logo. Look.tsx (look, card), Parts.tsx,
// Stage.tsx (hook, idle, figures, banks, chapters), Cues.tsx, Captions.tsx.
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, clamp, emphasised } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { POINTS_UNIT } from "../flash/diff";
import { Captions, EnglishLine } from "./Captions";
import { AFTER, BEFORE, FlipCueTrack, isOwnCue } from "./Cues";
import {
  Backdrop,
  CARD,
  DIM,
  Face,
  FlipCard,
  INK,
  STAGE,
  deal,
  flipAngle,
  idleSheen,
  idleTilt,
  useFontReady,
} from "./Look";
import { CardBack } from "./Parts";
import {
  CHAPTER_WORD,
  Chapters,
  FlipStage,
  LENDER_SUB,
  LENDER_TAG,
} from "./Stage";

// The trend panel is kept short enough to end above the caption strip.
const NUMBERS: NumbersLook = {
  change: "swap",
  trendZoom: 0.84,
  trendHeight: 340,
};
const COVER = { top: 690, h: 500 };

// ------------------------------------------------------------------ cover

// The card is dealt face-down under the logo tile and turns over to the
// title on its gold face; the subtitle under it.
const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("flipcard cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        92,
        fitText({
          text: title,
          withinWidth: CARD.w - 90,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.9,
      )
    : 92;
  const d = deal(frame, fps, 2);
  const mid = 22;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop t={frame} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <FlipCard
        front={<CardBack />}
        back={
          <Face kind="gold" padding="40px 44px">
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1.2,
                color: INK,
                textWrap: "balance",
                opacity: ready ? 1 : 0,
              }}
            >
              <div>
                {words.map((w, i) => (
                  <span
                    key={`${w}${i}`}
                    style={{
                      color: hit.has(i) ? brandInkHit : INK,
                    }}
                  >
                    {i ? " " : ""}
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </Face>
        }
        angle={flipAngle(frame, mid)}
        top={COVER.top}
        h={COVER.h}
        tilt={idleTilt(frame)}
        enterY={d.y}
        enterRot={d.rot}
        opacity={d.opacity}
        sheen={idleSheen(frame - mid - 14, 60)}
      />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: COVER.top + COVER.h + 70,
          textAlign: "center",
          fontSize: 42,
          fontWeight: 800,
          lineHeight: 1.3,
          color: DIM,
          opacity: interpolate(frame, [mid + 8, mid + 18], [0, 1], clamp),
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

// Keywords on the gold face: the brand's deep blue (gold on gold won't read).
const brandInkHit = `color-mix(in srgb, ${brand.primary} 80%, ${brand.navy})`;

// ------------------------------------------------------------------ talk

// No footage: the bokeh stage, {behind}, and the voice (foreground.webm is
// fully transparent; source.mp4's picture is never shown).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop t={seg.outFrom + frame} />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ overlay

// MotionTrack's chapter and stat sounds, for videos that don't mount it.
const StatChapterSfx: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const sfx = [
    ...(reel.edit.chapters ?? []).map((c) => ({
      atMs: c.atMs - 250,
      file: "whoosh",
      volume: 0.35,
    })),
    ...(reel.edit.stats ?? []).map((s) => ({
      atMs: s.atMs,
      file: "ding",
      volume: 0.22,
    })),
  ];
  return (
    <>
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, at(s.atMs))}
          durationInFrames={fps * 3}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${s.file}.wav`)}
            volume={() => s.volume}
          />
        </Sequence>
      ))}
    </>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  // Kinds this design doesn't draw go to the classic panels on the stage,
  // mounted only when such a cue exists (its film finish darkens corners).
  const others = (reel.edit.cues ?? []).filter((c) => !isOwnCue(c));
  return (
    <>
      {others.length ? (
        <MotionTrack
          reel={{ ...reel, edit: { ...reel.edit, cues: others } }}
          panelOffset={STAGE.top - 110}
          numbers={NUMBERS}
          leak={false}
        />
      ) : (
        <StatChapterSfx reel={reel} />
      )}
      <FlipStage reel={reel} keywords={keywords} talkFrames={talkFrames} />
      <FlipCueTrack reel={reel} />
      <Chapters reel={reel} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const flipcard: Design = {
  id: "flipcard",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    BEFORE,
    AFTER,
    CHAPTER_WORD,
    LENDER_TAG,
    LENDER_SUB,
    POINTS_UNIT,
    "·",
    // classic Outro and MotionTrack panels (other cue kinds)
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
