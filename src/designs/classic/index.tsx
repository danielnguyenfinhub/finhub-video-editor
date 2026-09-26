// "classic": the MortgageReel look every video had before designs existed.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Design, OverlayProps, TalkProps } from "../../mortgage/design";
import { cueRoomStyle, useCueRoom } from "../../mortgage/cueRoom";
import { SAFE } from "../../mortgage/golden";
import { BrandBackdrop, PacedVideo } from "../../mortgage/PacedVideo";
import { chapterTransition } from "../../mortgage/transitions";
import { Behind } from "./Behind";
import { Captions, Chapters, StatCards } from "./Captions";
import { MotionTrack } from "./Cues";
import {
  Chrome,
  Cover,
  HookBurst,
  HookSfx,
  HookTitle,
  MoneyRain,
} from "./Frame";
import { MirroredSpectrum } from "../../elements/MirroredSpectrum";
import { Outro } from "./Outro";

const HOOK_FRAMES = 105;

// The first segment eases in from a 1.3 zoom; alternate segments sit
// punched-in on the face, so every jump cut reads as an intentional zoom-cut,
// and each cut lands with a small spring "punch" and a slow 2% drift.
const Talk: React.FC<TalkProps> = ({
  seg,
  index,
  src,
  look,
  foreground,
  behind,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base =
    index === 0
      ? interpolate(frame, [0, 24], [1.3, 1], { extrapolateRight: "clamp" })
      : seg.zoomed
        ? 1.13
        : 1.0;
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        0.05;
  const drift = interpolate(frame, [0, seg.outDuration], [0, 0.02]);
  const room = useCueRoom(seg);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* The brand backdrop PacedVideo would draw, then the Behind layer
          (figures, bank logos) under his cut-out: golden rule 3b. */}
      <BrandBackdrop />
      {behind}
      {/* Zooms around y 576, so his hair line stays near HEAD_Y. */}
      <AbsoluteFill style={cueRoomStyle(room)}>
        <PacedVideo
          seg={seg}
          src={src}
          look={look}
          foreground={foreground}
          backdrop="none"
          style={{
            transform: `scale(${base + punch + drift})`,
            transformOrigin: "50% 30%",
          }}
        />
      </AbsoluteFill>
      {/* Daniel's voice as mirrored bars low on the frame, following the
          paced source; white with a shadow so it reads over the footage. */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 1640,
          opacity: 0.85,
          filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5))",
        }}
      >
        <MirroredSpectrum
          src={src}
          frame={seg.srcFrom + frame * seg.rate}
          color="#fff"
          width={840}
          height={150}
          bars={41}
        />
      </div>
    </AbsoluteFill>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => (
  <>
    {/* Panels in the safe band; Talk makes room under them (cueRoom). */}
    <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
    <Chrome talkFrames={talkFrames} />
    <StatCards reel={reel} />
    <Chapters reel={reel} />
    <Captions reel={reel} keywords={keywords} />
    {reel.edit.hook ? (
      <Sequence durationInFrames={HOOK_FRAMES}>
        <MoneyRain />
        <HookTitle hook={reel.edit.hook} />
        <HookBurst />
        <HookSfx />
      </Sequence>
    ) : null}
  </>
);

export const classic: Design = {
  id: "classic",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Daniel Nguyen",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
