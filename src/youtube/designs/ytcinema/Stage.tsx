// ytcinema's film stock: the graded navy-to-black stage with slow drifting
// light volumes, a static grain texture and vignette, the 2.39:1 letterbox,
// and the shared type styles (small caps, the thin gold rule, the slow fade).
import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp } from "../../../mortgage/style";
import { YT_HEIGHT, YT_SAFE, YT_WIDTH } from "../../frame";

export const BLACK = "#000000"; // theme-exempt: film matte (letterbox, chapter card) is pure black
export const GOLD = brand.highlight;
// 1920 / (1080 - 2 * 140) = 2.4: the scope frame. Text stays inside YT_SAFE;
// the chapter marker and captions sit on the bars.
export const BAR = 140;
export const IMG_TOP = BAR;
export const IMG_BOTTOM = YT_HEIGHT - BAR;
export const LEFT = YT_SAFE.left;
export const RIGHT = YT_SAFE.right;
export const WIDE = RIGHT - LEFT;

// Slow, deliberate: every entrance is a 20-frame ease, never a spring.
export const slow = (frame: number, at = 0, len = 20) =>
  interpolate(frame, [at, at + len], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
// Fades a layer out over its last `len` frames.
export const tail = (frame: number, dur: number, len = 12) =>
  interpolate(frame, [dur - len, dur], [1, 0], clamp);

export const caps = (
  size: number,
  color: string = GOLD,
): React.CSSProperties => ({
  fontFamily: FONT,
  fontSize: size,
  fontWeight: 600,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color,
  lineHeight: 1.5,
});

// The thin gold rule, drawn from its centre (or left edge) as p goes 0 -> 1.
export const Rule: React.FC<{
  p: number;
  width: number;
  align?: "center" | "left";
  style?: React.CSSProperties;
}> = ({ p, width, align = "center", style }) => (
  <div
    style={{
      width,
      height: 2,
      background: `linear-gradient(90deg, ${GOLD}00, ${GOLD} 20%, ${GOLD} 80%, ${GOLD}00)`,
      transform: `scaleX(${p})`,
      transformOrigin: align === "center" ? "50% 50%" : "0 50%",
      ...style,
    }}
  />
);

// Static grain: one rasterised noise tile, only its offset jitters (every
// 2 frames), so it reads as film without per-frame noise in the encode.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='256' height='256' filter='url(#g)'/></svg>",
)}")`;

const Volume: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  o: number;
}> = ({ x, y, r, color, o }) => (
  <div
    style={{
      position: "absolute",
      left: x - r,
      top: y - r,
      width: r * 2,
      height: r * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, ${color}00 70%)`,
      opacity: o,
    }}
  />
);

export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / 30;
  const j = Math.floor(f / 2);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${brand.background} 0%, ${brand.navy} 55%, ${BLACK} 100%)`,
        overflow: "hidden",
      }}
    >
      <Volume
        x={560 + Math.sin(s * 0.11) * 260}
        y={430 + Math.cos(s * 0.07) * 90}
        r={620}
        color={brand.primary}
        o={0.34}
      />
      <Volume
        x={1440 + Math.cos(s * 0.09) * 220}
        y={640 + Math.sin(s * 0.08) * 110}
        r={520}
        color={brand.primary}
        o={0.22}
      />
      <Volume
        x={1180 + Math.sin(s * 0.05) * 320}
        y={260 + Math.sin(s * 0.13) * 60}
        r={360}
        color={GOLD}
        o={0.07}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "256px 256px",
          backgroundPosition: `${(j * 97) % 256}px ${(j * 61) % 256}px`,
          opacity: 0.07,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 70% at 50% 50%, ${BLACK}00 55%, ${BLACK}d9 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Letterbox: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: YT_WIDTH,
        height: BAR,
        background: BLACK,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: IMG_BOTTOM,
        width: YT_WIDTH,
        height: BAR,
        background: BLACK,
      }}
    />
  </>
);
