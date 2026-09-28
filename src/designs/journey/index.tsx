// "journey" (Hành trình): the video is a trip along a winding road on an
// illustrated map seen from above, like a board game or a treasure map. Pale
// sand land, a brand-blue river, mint trees and contour rings; one long
// S-curved road. A gold pin travels the road at the talk's pace and the
// camera follows it (the map slides under it with a slight tilt and zoom);
// every hook, figure, cue, chapter and bank plants a flag where the pin was.
// Pure motion graphics: source.mp4's picture is never shown, only the voice.
// Map.tsx (map, road, camera), Stage.tsx (cartouche, signposts, bank sign,
// captions), Cues.tsx (pin, route plan for points, fork for compare).
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
import { Outro } from "../classic/Outro";
import { Captions, EnglishLine } from "./Captions";
import { Compass } from "./Compass";
import { JourneyCueTrack } from "./Cues";
import { CueWash, Marker, Pin } from "./Pin";
import { Chapters } from "./Signs";
import { MapWorld, useFlags } from "./World";
import { GOLD, INK, MARKER_Y, alpha, useFontReady } from "./Map";
import { StageLayer } from "./Stage";

const COVER_W = SAFE.right - SAFE.left - 40;

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("journey cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        100,
        fitText({
          text: title,
          withinWidth: COVER_W - 100,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 0;
  const p = enter(frame, fps, 4);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* The map is already rolling: frame 75 of the cover is talk frame 0. */}
      <MapWorld t={frame - 75} />
      <Pin x={540} y={MARKER_Y} s={1} o={1} t={frame} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 18,
          background: "#ffffff",
          border: `4px solid ${INK}`,
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      {ready ? (
        <div
          style={{
            position: "absolute",
            left: 540 - COVER_W / 2,
            width: COVER_W,
            top: 610,
            background: "#ffffff",
            border: `5px solid ${INK}`,
            borderRadius: 10,
            padding: 12,
            boxShadow: `0 14px 30px ${alpha(brand.navy, 0.25)}`,
            opacity: interpolate(p, [0, 0.4], [0, 1]),
            transform: `scale(${interpolate(p, [0, 1], [0.92, 1])})`,
          }}
        >
          <div
            style={{
              border: `2px solid ${INK}`,
              borderRadius: 4,
              padding: "40px 40px 36px",
              textAlign: "center",
            }}
          >
            <div
              style={{
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
                    color: hit.has(i) ? brand.primary : INK,
                    opacity: enter(frame, fps, 8 + i * 3),
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
            <div
              style={{
                margin: "20px auto",
                width: 360,
                borderTop: `5px dashed ${GOLD}`,
              }}
            />
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1.3,
                color: brand.slate,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
      ) : null}
      <Compass x={SAFE.left + 64} y={SAFE.top + 70} r={54} t={frame} />
    </AbsoluteFill>
  );
};

// No footage: the map (with the flags planted so far), {behind}, and the
// voice (foreground.webm is fully transparent; source.mp4's picture is never
// shown).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  const { props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  const flags = useFlags(reel);
  return (
    <AbsoluteFill>
      <MapWorld t={seg.outFrom + frame} flags={flags} />
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
    <CueWash reel={reel} />
    <JourneyCueTrack reel={reel} />
    <StageLayer reel={reel} />
    <Marker reel={reel} />
    <Chapters reel={reel} />
    <Captions reel={reel} keywords={keywords} />
    <EnglishLine reel={reel} />
    <LogoMark
      talkFrames={talkFrames}
      style={{ borderRadius: 18, border: `4px solid ${INK}` }}
    />
  </>
);

export const journey: Design = {
  id: "journey",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "ĐANG NHẮC TỚI",
    "CHẶNG",
    "VS",
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
