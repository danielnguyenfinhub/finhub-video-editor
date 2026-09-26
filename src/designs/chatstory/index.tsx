// "chatstory" — Chat Story: Hỏi đáp. A question clients often ask, answered
// warmly, told as an iMessage-style exchange over a soft ice-blue paper
// backdrop. The only LIGHT template. Cues, hook and outro reuse classic's
// (already RG 234-scanned and brand-checked); everything else here is new.
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
import { SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import { toOutMs, type Segment } from "../../mortgage/timeline";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { Backdrop } from "./Backdrop";
import { ChapterBubble, HookBubbles } from "./Bubbles";
import { ChatCaptions } from "./ChatCaption";
import { Cover } from "./Cover";
import { Figures } from "./Figures";
import { Lenders } from "./Lenders";

const HOOK_FRAMES = 105;
const CHAPTER_FRAMES_S = 2.5;

// Framing. Talking: 0.85 (0.92 on alternate "zoomed" cuts), centred, lifted
// so his chin (source y ~1400 when he leans in) lands at CHIN_Y and a
// two-line caption page (top ~1290) sits under it. While a cue panel is up
// (top of SAFE down to ~y 925), he shrinks to CUE_SCALE with the top of his
// head at CUE_HEAD_Y, under the panel and over the captions, then grows back.
// The layer ends inside the frame, so its sides and bottom fade out.
const SCALE = 0.85;
const ZOOMED_SCALE = 0.92;
const CHIN_Y = 1280;
const CUE_SCALE = 0.46;
const CUE_HEAD_Y = 935; // source hair line ~y 600
const CUE_EASE = 12;
const EDGE_FADE =
  "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, #000 80%, transparent)";

// 0..1: how far into a cue panel the talk is. Talk gets no reel (the Design
// contract), so it reads the composition's resolved props; an emoji cue is a
// small corner sticker, not a panel, and leaves him as he is.
const useCuePanel = (seg: Segment): number => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel }).reel;
  if (!reel) return 0;
  const t = seg.outFrom + frame;
  const outFrame = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? [])
    .filter((c) => c.kind !== "emoji")
    .reduce((k, c) => {
      const a = outFrame(c.fromMs);
      const b = Math.max(a + 1, outFrame(c.toMs));
      return Math.max(
        k,
        interpolate(t, [a - CUE_EASE, a, b, b + CUE_EASE], [0, 1, 1, 0], clamp),
      );
    }, 0);
};

// Ice-blue backdrop behind Daniel's cut-out; a gentle punch-in on each cut.
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
  const cue = useCuePanel(seg);
  const talkScale = seg.zoomed ? ZOOMED_SCALE : SCALE;
  const s = interpolate(cue, [0, 1], [talkScale, CUE_SCALE]);
  const y = interpolate(
    cue,
    [0, 1],
    [CHIN_Y - 1400 * talkScale, CUE_HEAD_Y - 600 * CUE_SCALE],
  );
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        0.04;
  return (
    <AbsoluteFill>
      <Backdrop />
      {behind}
      <AbsoluteFill
        style={{
          transform: `scale(${1 + punch})`,
          transformOrigin: `50% ${CHIN_Y}px`,
        }}
      >
        <AbsoluteFill
          style={{
            transform: `translate(${540 * (1 - s)}px, ${y}px) scale(${s})`,
            transformOrigin: "0 0",
            maskImage: EDGE_FADE,
            WebkitMaskImage: EDGE_FADE,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <PacedVideo
            seg={seg}
            src={src}
            look={look}
            foreground={foreground}
            backdrop="none"
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Chapters: React.FC<{ reel: OverlayProps["reel"] }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => {
        const at = toOutMs(reel.timeline.segments, c.atMs, fps);
        if (at === null) return null;
        const frames = Math.round(CHAPTER_FRAMES_S * fps);
        return (
          <Sequence
            key={c.atMs}
            from={Math.round((at / 1000) * fps)}
            durationInFrames={frames}
            layout="none"
          >
            <ChapterBubble index={i} title={c.title} frames={frames} />
          </Sequence>
        );
      })}
    </>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <LogoMark talkFrames={talkFrames} />
      <Lenders reel={reel} />
      <Chapters reel={reel} />
      <ChatCaptions reel={reel} keywords={keywords} />
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookBubbles hook={reel.edit.hook} />
        </Sequence>
      ) : null}
    </>
  );
};

export const chatstory: Design = {
  id: "chatstory",
  Cover,
  Talk,
  Overlay,
  Behind: Figures,
  Outro,
  chapterTransition,
  copy: [
    "CÂU HỎI MINH HOẠ",
    "So sánh",
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Daniel Nguyen",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
