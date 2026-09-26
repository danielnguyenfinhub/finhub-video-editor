// "datalab" — Phòng số liệu: the numbers are the star, a data panel above
// Daniel's head (he stays centred). Dark blueprint backdrop, giant counting
// hook, popping-word captions, a data panel for every figure with a
// voice-oscilloscope PiP, bank "data labels" on a leader line, and mono-ish
// chapter cards. Cues, chapter transitions and the outro reuse the core's
// already-compliant pieces.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE, lenderMentionsOf } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import {
  FONT,
  LOGO,
  clamp,
  enter,
  foregroundOf,
  retryVideoFetch,
} from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { DataLabBackdrop, LIGHT_BLUE } from "./Backdrop";
import { PoppingCaptions } from "./Captions";
import { ChaptersLayer } from "./Chapters";
import { FiguresBehindLayer, FiguresPipLayer } from "./Figures";
import { HookCounter } from "./Hook";
import { LenderLayer } from "./LenderLabel";

const HOOK_FRAMES = 105;
const KICKER = "NGÂN HÀNG ĐƯỢC NHẮC";
const CHAPTER_WORD = "PHẦN";

// The Cover's own logo, same spot and size as LogoMark (120px, top: SAFE.top,
// right: 1080 - SAFE.right) — the Cover is always-on, unlike LogoMark's
// first/last-10s Overlay behaviour, so it isn't the golden-rule LogoMark.
const CoverLogo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top,
        right: 1080 - SAFE.right,
        padding: "14px 22px",
        borderRadius: 22,
        background: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        opacity: interpolate(frame, [0, 8], [0, 1], clamp),
      }}
    >
      <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
    </div>
  );
};

const Cover: React.FC<CoverProps> = ({ src, coverFrame, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kicker = enter(frame, fps);
  const titleIn = enter(frame, fps, 4);
  const size = Math.min(
    96,
    fitText({
      text: title,
      withinWidth: SAFE.right - SAFE.left,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <DataLabBackdrop />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          opacity: kicker,
        }}
      >
        <span
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 6,
            color: LIGHT_BLUE,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          right: 1080 - SAFE.right,
          // Under the logo tile (SAFE.top + 120 px logo + padding): at
          // SAFE.top + 130 the title's first line ran under it.
          top: SAFE.top + LOGO_HEIGHT + 50,
          fontSize: size,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.15,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1080,
          height: 1920,
          transform: "scale(0.8)",
          transformOrigin: "bottom center",
        }}
      >
        <Freeze frame={0}>
          <OffthreadVideo
            src={foregroundOf(src)}
            trimBefore={coverFrame}
            muted
            transparent
            {...retryVideoFetch}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Freeze>
      </div>
      <CoverLogo />
    </AbsoluteFill>
  );
};

// Talk draws its own backdrop (PacedVideo runs with backdrop="none"), then
// the design's Behind layer (charts), then Daniel's cut-out on top.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <DataLabBackdrop />
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

// Golden rule 3b: figure cards render behind Daniel's cut-out.
const Behind: React.FC<OverlayProps> = ({ reel, talkFrames }) => (
  <FiguresBehindLayer reel={reel} talkFrames={talkFrames} />
);

const Overlay: React.FC<OverlayProps> = ({
  reel,
  keywords,
  talkFrames,
  src,
}) => {
  const mentions = lenderMentionsOf(reel);
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <FiguresPipLayer reel={reel} src={src} />
      <LenderLayer mentions={mentions} />
      <ChaptersLayer reel={reel} />
      <PoppingCaptions reel={reel} keywords={keywords} />
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <HookCounter hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const datalab: Design = {
  id: "datalab",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    KICKER,
    CHAPTER_WORD,
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
