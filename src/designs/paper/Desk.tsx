// "paper" pieces: the desk (cream paper with grain and slowly drifting cut-paper
// shapes), the paper card every element sits on (drops in with a soft shadow
// and a small tilt), the gold washi tape that pins it, and a torn edge.
// Colours: brand tokens only; the cream is white with a touch of the brand
// highlight, mixed here rather than written as a literal.
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { clamp, reelFontReady } from "../../mortgage/style";

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

export const INK = brand.textOnCard; // navy text on paper
export const CREAM = mix(brand.card, brand.highlight, 0.12);
const CREAM_DEEP = mix(brand.card, brand.highlight, 0.22);
export const NAVY_PAPER = brand.background;
export const GOLD_PAPER = brand.highlight;

// Soft layered shadow of paper resting on paper; `lift` 0..1 raises it.
export const paperShadow = (lift = 0) =>
  [
    `0 ${2 + lift * 6}px ${3 + lift * 6}px ${alpha(brand.navy, 0.2)}`,
    `0 ${10 + lift * 24}px ${22 + lift * 30}px ${alpha(brand.navy, 0.16)}`,
    `0 ${26 + lift * 40}px ${48 + lift * 40}px ${alpha(brand.navy, 0.1)}`,
  ].join(", ");

// A paper-edge polygon: straight sides, torn (jittered) top and bottom.
export const tornEdge = (seed: string, teeth = 36, depth = 1.6): string => {
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++)
    pts.push(`${(i / teeth) * 100}% ${random(`${seed}t${i}`) * depth}%`);
  for (let i = teeth; i >= 0; i--)
    pts.push(`${(i / teeth) * 100}% ${100 - random(`${seed}b${i}`) * depth}%`);
  return `polygon(${pts.join(", ")})`;
};

// Hold the frame until Be Vietnam Pro is in, then report ready (measure text
// with fitText only after that).
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

// A strip of gold washi tape, frayed ends, faint stripes.
export const Tape: React.FC<{
  width?: number;
  rotate?: number;
  style?: React.CSSProperties;
  delay?: number;
}> = ({ width = 150, rotate = -4, style, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 220, mass: 0.5 },
  });
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: 44,
        background: `repeating-linear-gradient(90deg, ${alpha(brand.highlight, 0.82)} 0 14px, ${alpha(brand.accent, 0.82)} 14px 18px)`,
        clipPath:
          "polygon(0 8%, 3% 0, 6% 10%, 9% 2%, 12% 0, 88% 0, 91% 8%, 94% 0, 97% 10%, 100% 4%, 100% 92%, 97% 100%, 94% 90%, 91% 100%, 88% 94%, 12% 100%, 9% 92%, 6% 100%, 3% 90%, 0 96%)",
        opacity: p,
        transform: `rotate(${rotate}deg) scale(${interpolate(p, [0, 1], [1.4, 1])})`,
        zIndex: 2,
        ...style,
      }}
    />
  );
};

// A sheet of paper that drops onto the desk: from above, tilted a little more
// than it rests, shadow shrinking as it lands; it lifts off at the end.
export const PaperCard: React.FC<{
  children: React.ReactNode;
  background?: string;
  rotate?: number;
  delay?: number;
  from?: "top" | "left" | "right";
  exitFrames?: number; // 0: no lift-off (the card leaves with its Sequence)
  torn?: string; // seed: torn top and bottom edges
  style?: React.CSSProperties;
}> = ({
  children,
  background = brand.card,
  rotate = -1.5,
  delay = 0,
  from = "top",
  exitFrames = 8,
  torn,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 11, stiffness: 150, mass: 0.7 },
  });
  const out = exitFrames
    ? interpolate(
        frame,
        [durationInFrames - exitFrames, durationInFrames],
        [0, 1],
        clamp,
      )
    : 0;
  const lift = Math.max(1 - Math.min(p, 1), out);
  const dx = from === "left" ? -700 : from === "right" ? 700 : 0;
  const dy = from === "top" ? -260 : 40;
  const move = interpolate(p, [0, 1], [1, 0]);
  const card = (
    <div
      style={{
        position: "relative",
        background,
        borderRadius: torn ? 0 : 10,
        boxShadow: torn ? undefined : paperShadow(lift),
        clipPath: torn ? tornEdge(torn) : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
  return (
    <div
      style={{
        position: "relative",
        opacity: Math.min(interpolate(p, [0, 0.25], [0, 1], clamp), 1 - out),
        transform: `translate(${dx * move}px, ${dy * move - out * 50}px) rotate(${rotate + move * (from === "left" ? -8 : 8)}deg) scale(${1 + lift * 0.05})`,
        // A torn sheet can't carry a box-shadow (clip-path cuts it off).
        filter: torn
          ? `drop-shadow(0 ${6 + lift * 16}px ${10 + lift * 14}px ${alpha(brand.navy, 0.2)})`
          : undefined,
      }}
    >
      {card}
    </div>
  );
};

// Cut-paper shapes on the desk; each drifts at its own speed (parallax).
type Shape = {
  kind: "house" | "coin" | "circle" | "cloud";
  x: number;
  y: number;
  size: number;
  color: string;
  depth: number; // 0.3 far .. 1 near: speed and shadow
  rot: number;
};
const SHAPES: Shape[] = [
  {
    kind: "circle",
    x: -60,
    y: 300,
    size: 260,
    color: CREAM_DEEP,
    depth: 0.3,
    rot: 0,
  },
  {
    kind: "house",
    x: 820,
    y: 330,
    size: 190,
    color: alpha(brand.primary, 0.14),
    depth: 0.6,
    rot: 6,
  },
  {
    kind: "coin",
    x: 70,
    y: 1180,
    size: 120,
    color: alpha(brand.highlight, 0.55),
    depth: 0.9,
    rot: -8,
  },
  {
    kind: "cloud",
    x: 700,
    y: 1520,
    size: 260,
    color: alpha(brand.primary, 0.1),
    depth: 0.4,
    rot: 0,
  },
  {
    kind: "circle",
    x: 900,
    y: 1050,
    size: 150,
    color: alpha(brand.highlight, 0.28),
    depth: 0.7,
    rot: 0,
  },
  {
    kind: "house",
    x: 40,
    y: 1600,
    size: 150,
    color: alpha(brand.background, 0.1),
    depth: 0.5,
    rot: -5,
  },
  {
    kind: "coin",
    x: 880,
    y: 1720,
    size: 90,
    color: alpha(brand.highlight, 0.5),
    depth: 1,
    rot: 10,
  },
  {
    kind: "cloud",
    x: 120,
    y: 180,
    size: 220,
    color: alpha(brand.primary, 0.08),
    depth: 0.35,
    rot: 0,
  },
];

const ShapeSvg: React.FC<{ s: Shape }> = ({ s }) => {
  const w = s.kind === "cloud" ? s.size * 1.6 : s.size;
  return (
    <svg width={w} height={s.size} viewBox={`0 0 ${w} ${s.size}`}>
      {s.kind === "house" ? (
        <path
          d={`M${s.size * 0.5} ${s.size * 0.06} L${s.size * 0.95} ${s.size * 0.45} L${s.size * 0.82} ${s.size * 0.45} L${s.size * 0.82} ${s.size * 0.95} L${s.size * 0.18} ${s.size * 0.95} L${s.size * 0.18} ${s.size * 0.45} L${s.size * 0.05} ${s.size * 0.45} Z`}
          fill={s.color}
        />
      ) : s.kind === "cloud" ? (
        <g fill={s.color}>
          <circle cx={w * 0.3} cy={s.size * 0.62} r={s.size * 0.3} />
          <circle cx={w * 0.52} cy={s.size * 0.45} r={s.size * 0.38} />
          <circle cx={w * 0.74} cy={s.size * 0.62} r={s.size * 0.28} />
          <rect
            x={w * 0.3}
            y={s.size * 0.6}
            width={w * 0.44}
            height={s.size * 0.32}
          />
        </g>
      ) : (
        <g>
          <circle
            cx={s.size / 2}
            cy={s.size / 2}
            r={s.size / 2}
            fill={s.color}
          />
          {s.kind === "coin" ? (
            <circle
              cx={s.size / 2}
              cy={s.size / 2}
              r={s.size * 0.32}
              fill="none"
              stroke={alpha(brand.card, 0.7)}
              strokeWidth={s.size * 0.06}
            />
          ) : null}
        </g>
      )}
    </svg>
  );
};

// Static paper grain (fractal noise, multiplied), so the cream reads as paper.
const Grain: React.FC = () => (
  <svg
    width="1080"
    height="1920"
    style={{ position: "absolute", opacity: 0.1, mixBlendMode: "multiply" }}
  >
    <filter id="paper-grain">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.75"
        numOctaves={3}
        seed={7}
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#paper-grain)" />
  </svg>
);

export const PaperDesk: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 900px 1300px at 50% 45%, ${CREAM} 55%, ${CREAM_DEEP} 100%)`,
      }}
    >
      {SHAPES.map((s, i) => {
        const dy = Math.sin(frame / (140 - i * 6) + i) * 26 * s.depth;
        const dx = Math.cos(frame / (180 + i * 9) + i * 2) * 18 * s.depth;
        return (
          <div
            key={`${s.kind}${s.x}${s.y}`}
            style={{
              position: "absolute",
              left: s.x + dx,
              top: s.y + dy - frame * 0.08 * s.depth,
              transform: `rotate(${s.rot + Math.sin(frame / 200 + i) * 3}deg)`,
              filter: `drop-shadow(0 ${4 + 10 * s.depth}px ${6 + 12 * s.depth}px ${alpha(brand.navy, 0.12)})`,
            }}
          >
            <ShapeSvg s={s} />
          </div>
        );
      })}
      <Grain />
    </AbsoluteFill>
  );
};
