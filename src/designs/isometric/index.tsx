// "isometric" (Phố 3D): faceless motion graphics in a clean isometric world.
// No footage: a small floating island city (apartment blocks, a generic bank,
// houses, trees) on a pale-sky-to-navy gradient, the camera drifting a few
// degrees round it. The story is built on the island's plaza: the hook's block
// city rises under a floating billboard, a number becomes a gold-filling glass
// cube (%), a coin column (money) or a tower rising floor by floor, a named
// bank's logo goes up on a sign-board, points are numbered steps rising one by
// one, compare is two coin towers with a gold VS block. Captions are white on
// a navy slab. World.tsx (projection, island, city), Stage.tsx (hook, figures,
// lenders, chapters, captions), Cues.tsx (points, compare).
import { Audio } from "@remotion/media";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
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
import { FONT, LOGO, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { IsoCueTrack, calmAt, isOwnCue } from "./Cues";
import { Captions, Chapters, EnglishLine } from "./Captions";
import { StageLayer, homeAt, plazaSpans } from "./Plaza";
import { SLAB, STAGE_TOP } from "./Stage";
import { IsoWorld, SKY, WHITE, slabEdge, useFontReady } from "./World";

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        92,
        fitText({
          text: title,
          withinWidth: 800,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 92;
  const p = enter(frame, fps, 8);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <IsoWorld t={frame} rise={frame} fps={fps} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 22,
          background: WHITE,
          boxShadow: slabEdge(10, SKY),
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: STAGE_TOP,
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          display: "flex",
          justifyContent: "center",
          opacity: ready ? p : 0,
          transform: `translateY(${interpolate(p, [0, 1], [80, 0]) + Math.sin(frame / 11) * 4}px)`,
        }}
      >
        <div
          style={{
            ...SLAB,
            padding: "18px 36px 24px",
            textAlign: "center",
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.18,
            textWrap: "balance",
          }}
        >
          {words.map((w, i) => (
            <span
              key={`${w}${i}`}
              style={{
                display: "inline-block",
                marginRight: "0.25em",
                color: hit.has(i) ? brand.primary : brand.textOnCard,
                opacity: enter(frame, fps, 10 + i * 3),
              }}
            >
              {w}
            </span>
          ))}
          <div
            style={{
              marginTop: 12,
              fontSize: 38,
              fontWeight: 700,
              color: brand.slate,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// No footage: the island, {behind}, and the voice (foreground.webm is fully
// transparent; source.mp4's picture is never shown).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  const t = seg.outFrom + frame;
  const spans = useMemo(() => (reel ? plazaSpans(reel, fps) : []), [reel, fps]);
  return (
    <AbsoluteFill>
      <IsoWorld t={t} calm={calmAt(reel, fps, t)} home={homeAt(spans, t)} />
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

// MotionTrack's sounds for stats and chapters, for videos that don't mount it.
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
  const ready = useFontReady();
  // Cue kinds this design doesn't draw go to the classic MotionTrack, on the
  // stage. Mounted only when such a cue exists: its film finish darkens the
  // frame's corners.
  const others = (reel.edit.cues ?? []).filter((c) => !isOwnCue(c));
  return (
    <>
      {others.length ? (
        <MotionTrack
          reel={{ ...reel, edit: { ...reel.edit, cues: others } }}
          panelOffset={STAGE_TOP - 110}
          leak={false}
        />
      ) : (
        <StatChapterSfx reel={reel} />
      )}
      {/* Cues first: the points veil sits under the chips. */}
      <IsoCueTrack reel={reel} />
      <StageLayer reel={reel} ready={ready} />
      <Chapters reel={reel} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark
        talkFrames={talkFrames}
        style={{ boxShadow: slabEdge(10, SKY) }}
      />
    </>
  );
};

export const isometric: Design = {
  id: "isometric",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "ĐANG NHẮC TỚI",
    "PHẦN",
    "VS",
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
