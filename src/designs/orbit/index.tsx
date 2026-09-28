// "orbit" (Quỹ đạo): premium, calm fintech-app motion graphics for faceless
// videos. No footage at all: a deep-navy space with a starfield and thin orbit
// rings, and at the centre a glowing CORE that pulses with the voice (the
// faceless presenter). Numbers appear inside the core with an orbit arc
// sweeping round it; a bank's logo orbits in and docks on it; points light up
// as nodes on a timeline that starts at the docked core; compare is two
// planets with the core as the VS node. Captions sit below the core, the
// English line under them. Space.tsx (backdrop, core), Stage.tsx (over the
// core, captions), Cues.tsx (points, compare).
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
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
import type { Reel } from "../../mortgage/schema";
import { FONT, LOGO, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { OrbitCueTrack, isOwnCue } from "./Cues";
import {
  CoreBody,
  OrbitSpace,
  STAGE_TOP,
  VoiceCore,
  coreAt,
  useCoreSpans,
  useFontReady,
} from "./Space";
import { Captions, Chapters, EnglishLine, StageLayer } from "./Stage";

// MotionTrack panels sit at top 110 + offset: start them at the stage top,
// under the LogoMark tile.
const PANEL_OFFSET = STAGE_TOP - 110;
const ORBIT_NUMBERS: NumbersLook = { change: "swap", trendZoom: 0.84 };
const COVER_CORE = { x: 540, y: 830, r: 150 };

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        96,
        fitText({
          text: title,
          withinWidth: 900,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 96;
  const grow = enter(frame, fps);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <OrbitSpace t={frame} />
      <CoreBody
        state={{ ...COVER_CORE, r: COVER_CORE.r * grow, dim: 0, calm: 0 }}
        t={frame}
        level={0.35 + 0.25 * Math.sin(frame / 7)}
      />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          right: 1080 - SAFE.right,
          top: COVER_CORE.y + COVER_CORE.r + 90,
          textAlign: "center",
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.2,
          color: "#ffffff",
          textWrap: "balance",
          textShadow: "0 0 40px rgba(0,100,168,0.8)",
          opacity: ready ? 1 : 0,
        }}
      >
        {words.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              color: hit.has(i) ? brand.highlight : "#ffffff",
              opacity: enter(frame, fps, 6 + i * 3),
              transform: `translateY(${interpolate(enter(frame, fps, 6 + i * 3), [0, 1], [24, 0])}px)`,
            }}
          >
            {w}
          </span>
        ))}
        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            fontWeight: 700,
            color: brand.textDim,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 0 40px rgba(0,100,168,0.6)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

// No footage: the space, the voice-driven core, {behind}, and the voice
// (foreground.webm is fully transparent, source.mp4's picture is never shown).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  const { props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  const spans = useCoreSpans(reel);
  const t = seg.outFrom + frame;
  return (
    <AbsoluteFill>
      <OrbitSpace t={t} calm={coreAt(spans, t).calm} />
      <VoiceCore seg={seg} src={src} t={t} />
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

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => (
  <>
    {/* Every cue kind but points and compare: the classic panels. */}
    <MotionTrack
      reel={{
        ...reel,
        edit: {
          ...reel.edit,
          cues: (reel.edit.cues ?? []).filter((c) => !isOwnCue(c)),
        },
      }}
      panelOffset={PANEL_OFFSET}
      numbers={ORBIT_NUMBERS}
      leak={false}
    />
    <OrbitCueTrack reel={reel} />
    <StageLayer reel={reel} />
    <Chapters reel={reel} />
    <Captions reel={reel} keywords={keywords} />
    <EnglishLine reel={reel} />
    <LogoMark talkFrames={talkFrames} />
  </>
);

export const orbit: Design = {
  id: "orbit",
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
