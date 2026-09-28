// "retro" print kit: the poster backdrop (a slowly turning sunburst in two
// cream/gold tints, halftone dots, paper grain, a navy poster border), the
// starburst sticker badge, the ribbon banner and the hard offset shadow of
// screen-printed type (a gold plate mis-registered a few px from the navy one).
// Colours: brand tokens only, tinted here with alpha()/mix().
import { makeStar } from "@remotion/shapes";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { reelFontReady } from "../../mortgage/style";

// "#rrggbb" + alpha -> rgba(); a + b mixed (t = share of b) -> "#rrggbb".
const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const alpha = (hex: string, a: number) =>
  `rgba(${channels(hex).join(",")},${a})`; // theme-exempt: rgba() of a theme token, built at runtime
export const mix = (a: string, b: string, t: number) =>
  `#${channels(a)
    .map((v, i) =>
      Math.round(v + (channels(b)[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

export const INK = brand.textOnCard; // navy ink
export const NAVY = brand.background;
export const GOLD = brand.highlight;
export const BLUE = brand.primary;
export const CREAM = mix(brand.card, brand.highlight, 0.16); // warm off-white paper
const RAY_LIGHT = mix(brand.card, brand.highlight, 0.1);
const RAY_GOLD = mix(brand.card, brand.highlight, 0.34);
export const GOLD_DEEP = mix(brand.highlight, brand.accent, 0.6);

// Hard offset shadow (no blur) plus the gold plate printed a little off.
export const printShadow = (d = 6, misreg = 0) =>
  [
    ...(misreg ? [`${-misreg}px ${-misreg * 0.7}px 0 ${GOLD}`] : []),
    `${d}px ${d}px 0 ${INK}`,
  ].join(", ");
export const hardBox = (d = 8, color: string = INK) =>
  `${d}px ${d}px 0 ${color}`;

// Hold the frame until Be Vietnam Pro is in (measure text only after it).
export const useFontReady = (why: string): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(why));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return ready;
};

// A rubber-stamp landing: in from big, overshoots, settles.
export const useStamp = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 9, stiffness: 190, mass: 0.7 },
  });
};

// Halftone dots of `color`, `size` px apart.
export const halftone = (color: string, size = 14, dot = 0.34) =>
  `radial-gradient(circle, ${color} 0 ${dot * size}px, transparent ${dot * size + 0.8}px)`;

// ------------------------------------------------------------- backdrop

export const PrintBackdrop: React.FC<{ t?: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const now = t ?? frame;
  const turn = now * 0.09; // one full turn every ~2 min
  const grainSeed = Math.floor(now / 3) % 6;
  return (
    <AbsoluteFill style={{ background: CREAM, overflow: "hidden" }}>
      {/* The sunburst: rays from a point just above the stage centre. */}
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${turn}deg at 50% 44%, ${RAY_GOLD} 0deg 7.5deg, ${RAY_LIGHT} 7.5deg 15deg)`,
        }}
      />
      {/* Paper light in the middle, so text sits on calm paper. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 560px 720px at 50% 46%, ${alpha(CREAM, 0.72)}, ${alpha(CREAM, 0)} 75%)`,
        }}
      />
      {/* Halftone: navy dots, gold plate off-register, thick at the edges. */}
      {[
        { color: alpha(brand.highlight, 0.7), dx: 4, dy: 3 },
        { color: alpha(INK, 0.2), dx: 0, dy: 0 },
      ].map((l) => (
        <AbsoluteFill
          key={l.color}
          style={{
            backgroundImage: halftone(l.color, 16, 0.3),
            backgroundSize: "16px 16px",
            backgroundPosition: `${l.dx}px ${l.dy}px`,
            maskImage:
              "linear-gradient(180deg, black 0%, transparent 22%, transparent 78%, black 100%)",
          }}
        />
      ))}
      {/* Paper grain. */}
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", mixBlendMode: "multiply", opacity: 0.2 }}
      >
        <filter id="retro-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={2}
            seed={grainSeed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#retro-grain)" />
      </svg>
      {/* Poster border: navy rule with a gold inner line. */}
      <div
        style={{
          position: "absolute",
          inset: 22,
          border: `10px solid ${INK}`,
          borderRadius: 34,
          boxShadow: `inset 0 0 0 6px ${CREAM}, inset 0 0 0 10px ${GOLD}`,
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- starburst badge

// A gold starburst sticker with a navy outline, hard shadow and a dashed inner
// ring; it turns slowly (`spin` deg/frame) while its content stays upright.
export const StarBadge: React.FC<{
  r: number;
  children?: React.ReactNode;
  fill?: string;
  spin?: number;
  points?: number;
  delay?: number;
}> = ({ r, children, fill = GOLD, spin = 0.5, points = 20, delay = 0 }) => {
  const frame = useCurrentFrame();
  const s = useStamp(delay);
  const star = makeStar({
    points,
    innerRadius: r * 0.84,
    outerRadius: r,
    cornerRadius: r * 0.02,
  });
  const pad = 16;
  const size = 2 * r + 2 * pad;
  const wobble = Math.sin((frame - delay) / 9) * 3;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        transform: `scale(${s}) rotate(${(1 - s) * -30 + wobble}deg)`,
        flex: "0 0 auto",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          transform: `rotate(${(frame - delay) * spin}deg)`,
        }}
      >
        <path
          d={star.path}
          transform={`translate(${pad + 9} ${pad + 9})`}
          fill={INK}
        />
        <path
          d={star.path}
          transform={`translate(${pad} ${pad})`}
          fill={fill}
          stroke={INK}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r * 0.72}
          fill="none"
          stroke={INK}
          strokeWidth={4}
          strokeDasharray="10 9"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${-wobble}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- ribbon

// A banner: the band (navy outline, hard shadow) with two notched tails
// folded behind it. `tails` 0 hides them (a plain label).
export const Ribbon: React.FC<{
  children: React.ReactNode;
  color?: string;
  tail?: string;
  tails?: number;
  style?: React.CSSProperties;
}> = ({ children, color = CREAM, tail = GOLD_DEEP, tails = 56, style }) => {
  const tailStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: 20,
    bottom: -20,
    [side]: -tails + 12,
    width: tails,
    background: tail,
    border: `5px solid ${INK}`,
    clipPath:
      side === "left"
        ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 34% 50%)"
        : "polygon(0 0, 100% 0, 66% 50%, 100% 100%, 0 100%)",
  });
  return (
    <div style={{ position: "relative", ...style }}>
      {tails ? (
        <>
          <div style={tailStyle("left")} />
          <div style={tailStyle("right")} />
        </>
      ) : null}
      <div
        style={{
          position: "relative",
          background: color,
          border: `5px solid ${INK}`,
          borderRadius: 10,
          boxShadow: hardBox(7),
        }}
      >
        {children}
      </div>
    </div>
  );
};
