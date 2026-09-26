// "studio" pieces, adapted from the Remotion Elements in .claude/elements/
// (liquid-contours background, name lower third, discount callout, circle
// marker, waveform progress): brand tokens instead of the demo blues, Be
// Vietnam Pro instead of Inter/Montserrat (which have no Vietnamese glyphs).
import { liquidContours } from "@remotion/effects/liquid-contours";
import {
  getWaveformPortion,
} from "@remotion/media-utils";
import { Circle } from "@remotion/rough-notation";
import { makeCallout } from "@remotion/shapes";
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Solid,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { FONT, LOGO, clamp } from "../../mortgage/style";
import { useCoveredAudioData } from "../../elements/useCoveredAudioData";

const ease = Easing.bezier(0.65, 0, 0.35, 1);

// Flowing navy/blue contour bands (Elements: backgrounds/liquid-contours).
export const LiquidBg: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <Solid
      color={brand.background}
      width={width}
      height={height}
      effects={[
        liquidContours({
          firstColor: brand.background,
          secondColor: "#0B2F5E",
          phase: interpolate(frame, [0, 240], [3.23, 4.23]),
        }),
      ]}
    />
  );
};

// The FinHub logo on white, top right (the brand kit's rule).
export const LogoBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 28,
      right: 36,
      padding: "10px 16px",
      borderRadius: 18,
      background: "#fff",
      boxShadow: "0 6px 18px rgba(0, 0, 0, 0.3)",
    }}
  >
    <Img src={LOGO} style={{ height: 78, display: "block" }} />
  </div>
);

// Two bars wiping in and out (Elements: overlays/name-lower-third).
export const NameTag: React.FC<{
  name: string;
  role: string;
  frames: number;
}> = ({ name, role, frames }) => {
  const frame = useCurrentFrame();
  const wipe = (d: number) =>
    interpolate(frame, [d, d + 20, frames - 20 - d, frames - d], [1, 0, 0, 1], {
      ...clamp,
      easing: ease,
    });
  const bar = (
    text: string,
    bg: string,
    size: number,
    delay: number,
  ): React.ReactNode => (
    <div
      style={{
        alignSelf: "flex-start",
        padding: "14px 26px",
        background: bg,
        color: "#fff",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        whiteSpace: "nowrap",
        clipPath: `inset(0 ${wipe(delay) * 100}% 0 0)`,
      }}
    >
      {text}
    </div>
  );
  return (
    <div
      style={{
        // Top-left of SAFE, beside the LogoMark tile (both show 3.5-7.5 s)
        // and above a stat callout (STAT_TOP); the bottom of SAFE belongs to
        // the captions.
        position: "absolute",
        left: SAFE.left,
        top: SAFE.top,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {bar(name, brand.primary, 46, 0)}
      {bar(role, brand.background, 34, 4)}
    </div>
  );
};

// Under the LogoMark tile and the name tag (which can show with it), so none
// of the three overlap; drawn at 0.8 (scaled from the pointer tip, so the
// box is shifted up by the 20 % it loses) so the tip stays above his eyes.
const STAT_TOP = SAFE.top + LOGO_HEIGHT + 30;
const STAT_SCALE = 0.8;

// A speech-bubble callout that wobbles in (Elements: commerce/
// product-discount-callout, makeCallout from @remotion/shapes).
// x, y: the drawn bubble's top-left (default: the stat slot); scale shrinks
// it from the pointer tip.
export const StatCallout: React.FC<{
  big: string;
  label: string;
  x?: number;
  y?: number;
  scale?: number;
}> = ({
  big,
  label,
  x = 190 + 350 * (1 - STAT_SCALE),
  y = STAT_TOP,
  scale = STAT_SCALE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bubble = makeCallout({
    width: 700,
    height: 250,
    pointerLength: 60,
    pointerBaseWidth: 110,
    pointerPosition: 0.5,
    pointerDirection: "down",
    cornerRadius: 40,
  });
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x - 350 * (1 - scale),
        top: y - 310 * (1 - scale),
        width: 700,
        height: 310,
        transformOrigin: "50% 100%",
        transform: `scale(${pop * scale}) rotate(${interpolate(
          frame,
          [0, 7, 14, 20, 26],
          [0, 8, -6, 3, 0],
          clamp,
        )}deg)`,
      }}
    >
      <svg
        viewBox={`0 0 ${bubble.width} ${bubble.height}`}
        style={{ position: "absolute", inset: 0, width: 700, height: 310 }}
      >
        <path d={bubble.path} fill={brand.accent} />
      </svg>
      <div
        style={{
          position: "relative",
          height: 250,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          color: brand.textOnCard,
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        <div style={{ fontSize: 110, fontWeight: 900 }}>{big}</div>
        <div style={{ fontSize: 38, fontWeight: 700 }}>{label}</div>
      </div>
    </div>
  );
};

// Chapter card with a hand-drawn circle around "PHẦN n" (Elements:
// storytelling/circle-marker).
export const ChapterMark: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const show = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 160,
        maxWidth: 740,
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "20px 34px",
        borderRadius: 20,
        background: "#fff",
        fontFamily: FONT,
        color: brand.textOnCard,
        opacity: show,
        transform: `translateY(${(1 - show) * -30}px)`,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
      }}
    >
      <Circle
        progress={interpolate(frame, [6, 30], [0, 1], clamp)}
        color={brand.accent}
        strokeWidth={6}
        roughness={1.8}
        seed={index + 3}
        padding={{ left: 10, right: 10, top: 8, bottom: 8 }}
      >
        <span style={{ fontSize: 38, fontWeight: 900 }}>PHẦN {index + 1}</span>
      </Circle>
      <span style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15 }}>
        {title}
      </span>
    </div>
  );
};

// A voice-note style waveform of the talk with the played part in amber
// (Elements: audio/waveform-progress). The waveform is the source's; the
// progress follows the finished video.
export const VoiceNote: React.FC<{ src: string; talkFrames: number }> = ({
  src,
  talkFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = 56;
  const { audioData, dataOffsetInSeconds } = useCoveredAudioData({
    fps,
    frame: 0,
    src,
    windowInSeconds: 600,
  });
  const samples = audioData
    ? getWaveformPortion({
        audioData,
        dataOffsetInSeconds,
        durationInSeconds: audioData.durationInSeconds,
        numberOfSamples: bars,
        startTimeInSeconds: 0,
      })
    : [];
  const played = Math.min(1, frame / Math.max(1, talkFrames - 1));
  const w = (900 - 5 * (bars - 1)) / bars;
  return (
    <AbsoluteFill style={{ top: 1790, left: 90 }}>
      <svg width={900} height={80} viewBox="0 0 900 80">
        {samples.map((s, i) => {
          const h = Math.max(8, Math.min(76, Math.sqrt(s.amplitude) * 76));
          return (
            <rect
              key={s.index}
              x={i * (w + 5)}
              y={40 - h / 2}
              width={w}
              height={h}
              rx={w / 2}
              fill={i / bars < played ? brand.accent : "rgba(255,255,255,0.45)"}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
