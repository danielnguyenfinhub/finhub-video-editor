// "chatstory" — Chat Story: Hỏi đáp. A question clients often ask, answered
// warmly, told as an iMessage-style exchange over a soft ice-blue paper
// backdrop. The only LIGHT template. Cues, hook and outro reuse classic's
// (already RG 234-scanned and brand-checked); everything else here is new.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Design, OverlayProps, TalkProps } from "../../mortgage/design";
import { HEAD_Y, cueRoomStyle, useCueRoom } from "../../mortgage/cueRoom";
import { SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { toOutMs, type Segment } from "../../mortgage/timeline";
import { HookBand, useHookBand } from "../../elements/BehindWord";
import { brand } from "../../brand/theme";
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
// two-line caption page (top ~1290) sits under it. While a cue panel is up he
// makes room under it with the shared useCueRoom/cueRoomStyle (golden rule
// 3b). The layer ends inside the frame, so its sides and bottom fade out.
// cueRoomStyle lands the point at `headY` on CUE_HEAD_Y. At this design's
// 0.85 framing he ends at ~0.47 (not classic's 0.55), so his eyebrows sit
// closer under his hair line and a leaning-in frame put them at the panel's
// edge. Passing a headY 110 px above his hair line lands the hair line
// 0.55 * 110 ~ 60 px lower (y ~860): eyebrows ~y 1010, mouth ~y 1230.
const CUE_DROP = 110;
export const SCALE = 0.85;
export const ZOOMED_SCALE = 0.92;
export const CHIN_Y = 1280;
export const CHIN_SRC = 1400; // his chin in the source when he leans in
// A cut's punch-in around CHIN_Y (Talk): spring(0) = 0, so a cut's first
// frame is the full 1 + PUNCH.
export const PUNCH = 0.04;
// His hair line on screen while the hook is up, per reel: each cut in the
// hook at its scale (a zoomed cut at ZOOMED_SCALE) with a cut's punch-in
// lifting it; the highest wins. check-design-figures (k).
export const hookHairY = (segments: Segment[]) =>
  Math.min(
    ...segments
      .filter((s) => s.outFrom < HOOK_FRAMES)
      .map(
        (s, i) =>
          CHIN_Y -
          (CHIN_SRC - HEAD_Y) *
            (s.zoomed ? ZOOMED_SCALE : SCALE) *
            (i ? 1 + PUNCH : 1),
      ),
  );
const BUBBLE_PAD = 40;
const EDGE_FADE =
  "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, #000 80%, transparent)";

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
  const room = useCueRoom(seg);
  const talkScale = seg.zoomed ? ZOOMED_SCALE : SCALE;
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        PUNCH;
  return (
    <AbsoluteFill>
      <Backdrop />
      {behind}
      {/* His hair line (source HEAD_Y) sits at CHIN_Y - (1400 - HEAD_Y) *
          talkScale, then the punch zooms that around CHIN_Y. */}
      <AbsoluteFill
        style={cueRoomStyle(
          room,
          CHIN_Y - (CHIN_SRC - HEAD_Y) * talkScale * (1 + punch) - CUE_DROP,
        )}
      >
        <AbsoluteFill
          style={{
            transform: `scale(${1 + punch})`,
            transformOrigin: `50% ${CHIN_Y}px`,
          }}
        >
          <AbsoluteFill
            style={{
              transform: `translate(${540 * (1 - talkScale)}px, ${CHIN_Y - CHIN_SRC * talkScale}px) scale(${talkScale})`,
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

// The hook as one big sent bubble in the band above his head, sub on top,
// number under it (rule 6 ruling, 07/10/2026); behind his cut-out with the
// figures. The Overlay keeps HookBubbles when the band does not hold it.
const Behind: React.FC<OverlayProps> = (props) => {
  const { reel } = props;
  const band = useHookBand(reel, hookHairY(reel.timeline.segments), {
    padX: BUBBLE_PAD,
  });
  return (
    <>
      <Figures {...props} />
      {band && reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookBand
            hook={reel.edit.hook}
            band={band}
            bigStyle={{ color: "#fff" }}
            subStyle={{ color: "#fff", fontWeight: 700 }}
          >
            <div
              style={{
                position: "absolute",
                left: SAFE.left,
                right: 1080 - SAFE.right,
                top: SAFE.top,
                height: band.big.bottom + 14 - SAFE.top,
                borderRadius: 40,
                background: brand.primary,
                boxShadow: "0 10px 26px rgba(11,31,61,0.14)",
              }}
            />
          </HookBand>
        </Sequence>
      ) : null}
    </>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  // The hook draws in Behind when the band holds it; here otherwise.
  const band = useHookBand(reel, hookHairY(reel.timeline.segments), {
    padX: BUBBLE_PAD,
  });
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <LogoMark talkFrames={talkFrames} />
      <Lenders reel={reel} />
      <Chapters reel={reel} />
      <ChatCaptions reel={reel} keywords={keywords} />
      {reel.edit.hook && !band ? (
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
  Behind,
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
