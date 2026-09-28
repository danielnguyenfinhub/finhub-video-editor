// "whiteboard" pieces: the board itself (glossy white surface, faint ghosts of
// erased marker, a slow sheen, an aluminium frame and a marker tray), marker
// text that is written left to right, a marker underline, hand-drawn doodle
// icons (house, coins, calendar, percent, trend arrow, bank, tick) drawn
// stroke by stroke with evolvePath, and a curved hand-drawn arrow. Every
// colour is a brand token or a mix of two, built at runtime.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useDelayRender,
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

// Marker colours: navy writes, blue numbers, gold highlights, red only for a
// real negative, green ticks (darkened so they read on white).
export const INK = brand.textOnCard;
export const BLUE = brand.primary;
export const GOLD = brand.highlight;
export const RED = mix(brand.bad, brand.navy, 0.18);
export const GREEN = mix(brand.good, brand.navy, 0.4);
export const SOFT = brand.slate;
const SURFACE = mix(brand.card, brand.slate, 0.03);
const SURFACE_EDGE = mix(brand.card, brand.slate, 0.12);

// Hold the frame until Be Vietnam Pro is in (measure text only after that).
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

// 0..1 over [at, at + frames] of the current frame.
export const useDraw = (at = 0, frames = 14) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + frames], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 2,
  });
};

// Gold highlighter swipe behind inline text, growing left to right.
export const swipe = (p: number, color: string = GOLD, a = 0.75) => ({
  backgroundImage: `linear-gradient(100deg, transparent 1%, ${alpha(color, a)} 3% 97%, transparent 99%)`,
  backgroundRepeat: "no-repeat",
  backgroundSize: `${p * 100}% 62%`,
  backgroundPosition: "0 78%",
  boxDecorationBreak: "clone" as const,
  WebkitBoxDecorationBreak: "clone" as const,
});

// ------------------------------------------------------------- the board

// Erased marker leaves ghosts: a few soft, faint strokes, fixed per video.
const GHOSTS = Array.from({ length: 9 }, (_, i) => ({
  x: 80 + random(`gx${i}`) * 860,
  y: 160 + random(`gy${i}`) * 1560,
  w: 160 + random(`gw${i}`) * 320,
  rot: (random(`gr${i}`) - 0.5) * 40,
  a: 0.035 + random(`ga${i}`) * 0.035,
}));
const FRAME_W = 22;

export const Whiteboard: React.FC<{ t: number }> = ({ t }) => {
  // A soft reflection drifts across the gloss, so the board is never still.
  const sheen = ((t * 0.9) % 2600) - 700;
  return (
    <AbsoluteFill style={{ background: SURFACE_EDGE }}>
      <AbsoluteFill
        style={{
          inset: FRAME_W,
          borderRadius: 10,
          overflow: "hidden",
          background: `radial-gradient(ellipse 900px 1300px at 45% 40%, ${brand.card} 0%, ${SURFACE} 70%, ${SURFACE_EDGE} 100%)`,
          boxShadow: `inset 0 3px 10px ${alpha(brand.navy, 0.18)}`,
        }}
      >
        {GHOSTS.map((g, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.x - g.w / 2,
              top: g.y,
              width: g.w,
              height: 26,
              borderRadius: 13,
              background: alpha(i % 3 ? brand.slate : brand.primary, g.a),
              filter: "blur(7px)",
              transform: `rotate(${g.rot}deg)`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: -400,
            left: sheen,
            width: 360,
            height: 2800,
            background: `linear-gradient(90deg, transparent, ${alpha(brand.card, 0.75)}, transparent)`,
            transform: "rotate(18deg)",
          }}
        />
      </AbsoluteFill>
      {/* Aluminium frame and the marker tray under the board. */}
      <AbsoluteFill
        style={{
          border: `${FRAME_W}px solid transparent`,
          borderImage: `linear-gradient(135deg, ${mix(brand.slate, brand.card, 0.55)}, ${brand.card} 30%, ${mix(brand.slate, brand.card, 0.35)} 60%, ${mix(brand.slate, brand.card, 0.7)}) 1`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 60,
          height: 34,
          borderRadius: 8,
          background: `linear-gradient(180deg, ${mix(brand.slate, brand.card, 0.7)}, ${mix(brand.slate, brand.card, 0.3)})`,
          boxShadow: `0 6px 12px ${alpha(brand.navy, 0.2)}`,
        }}
      >
        {[brand.textOnCard, brand.highlight, brand.primary].map((c, i) => (
          <div
            key={c}
            style={{
              position: "absolute",
              bottom: 16,
              left: 90 + i * 150,
              width: 120,
              height: 24,
              borderRadius: 12,
              background: `linear-gradient(90deg, ${c} 0 22%, ${brand.card} 22% 26%, ${mix(c, brand.card, 0.15)} 26%)`,
              boxShadow: `0 3px 4px ${alpha(brand.navy, 0.3)}`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- marker text

// Text written left to right: a wipe that stops as the marker reaches the end.
export const Written: React.FC<{
  at?: number;
  frames?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at = 0, frames = 14, children, style }) => {
  const p = useDraw(at, frames);
  return (
    <div
      style={{
        clipPath: `inset(-30% ${(1 - p) * 100}% -30% -10%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// A wobbly marker line under a block, drawn left to right; `second` draws a
// second, slightly lower stroke (the hook is underlined twice).
export const MarkerUnderline: React.FC<{
  at?: number;
  color?: string;
  width?: number;
  second?: boolean;
  seed?: string;
}> = ({ at = 0, color = BLUE, width = 8, second = false, seed = "u" }) => {
  const one = useDraw(at, 10);
  const two = useDraw(at + 9, 10);
  const j = (k: string) => (random(`${seed}${k}`) - 0.5) * 6;
  const line = (y: number, k: string) =>
    `M2 ${y + j(`${k}a`)} Q 30 ${y + j(`${k}b`)} 55 ${y + j(`${k}c`)} T 98 ${y + j(`${k}d`)}`;
  const stroke = (d: string, p: number) => (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: "-2%",
        width: "104%",
        height: 30,
        bottom: -26,
        overflow: "visible",
        clipPath: `inset(-50% ${(1 - p) * 100}% -50% 0)`,
      }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
  return (
    <>
      {stroke(line(10, "1"), one)}
      {second ? stroke(line(24, "2"), two) : null}
    </>
  );
};

// ------------------------------------------------------------- doodles

// 100x100 doodles, each a list of strokes drawn in order.
export const ICONS = {
  house: [
    "M10 50 L50 14 L90 50",
    "M22 42 L22 88 L78 88 L78 42",
    "M50 88 L50 64 L66 64 L66 88",
    "M30 54 L40 54 L40 64 L30 64 Z",
    "M66 26 L66 16 L74 16 L74 34",
  ],
  coins: [
    "M20 34 A30 10 0 1 0 80 34 A30 10 0 1 0 20 34",
    "M20 34 L20 78",
    "M80 34 L80 78",
    "M20 48 A30 10 0 0 0 80 48",
    "M20 63 A30 10 0 0 0 80 63",
    "M20 78 A30 10 0 0 0 80 78",
  ],
  calendar: [
    "M14 24 L86 24 L86 88 L14 88 Z",
    "M14 40 L86 40",
    "M34 12 L34 30",
    "M66 12 L66 30",
    "M26 56 L38 56 M46 56 L58 56 M66 56 L76 56",
    "M26 72 L38 72 M46 72 L58 72",
    "M62 64 A10 9 0 1 0 80 70 A10 9 0 1 0 64 62",
  ],
  percent: [
    "M24 84 L76 16",
    "M20 30 A11 11 0 1 0 42 30 A11 11 0 1 0 20 30",
    "M58 70 A11 11 0 1 0 80 70 A11 11 0 1 0 58 70",
  ],
  arrow: [
    "M10 80 L36 54 L52 66 L86 28",
    "M64 26 L86 28 L84 50",
    "M10 90 L90 90",
  ],
  bank: [
    "M12 36 L50 12 L88 36 Z",
    "M24 42 L24 76 M42 42 L42 76 M58 42 L58 76 M76 42 L76 76",
    "M16 80 L84 80",
    "M10 88 L90 88",
  ],
  tick: ["M12 54 L40 80 L90 16"],
} as const;
export type IconName = keyof typeof ICONS;

// Strokes pass through a small displacement so they wobble like marker.
export const DrawnIcon: React.FC<{
  icon: IconName;
  size: number;
  progress: number;
  color?: string;
  stroke?: number;
  style?: React.CSSProperties;
}> = ({ icon, size, progress, color = INK, stroke = 6, style }) => {
  const paths = ICONS[icon];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <filter id="wb-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05"
            numOctaves={2}
            seed={7}
          />
          <feDisplacementMap in="SourceGraphic" scale={2.5} />
        </filter>
      </defs>
      <g filter="url(#wb-rough)">
        {paths.map((d, i) => {
          const p = Math.max(0, Math.min(1, progress * paths.length - i));
          return p > 0 ? (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              {...evolvePath(p, d)}
            />
          ) : null;
        })}
      </g>
    </svg>
  );
};

// Which doodle fits a figure or a sentence.
const MONEY = /(đô|\$|tỷ|triệu|nghìn|ngàn|tiền|trả|tiết kiệm)/iu;
export const iconFor = (
  text: string,
  fallback: IconName = "arrow",
): IconName => {
  const s = text.toLowerCase();
  if (/\d\s*\/\s*\d|tháng|ngày|thứ|\b(19|20)\d\d\b/u.test(s)) return "calendar";
  if (/%|phần trăm|lãi suất/u.test(s)) return "percent";
  if (/ngân hàng|rba|bank/u.test(s)) return "bank";
  if (MONEY.test(s)) return "coins";
  if (/nhà|vay|thế chấp/u.test(s)) return "house";
  return fallback;
};

// A curved hand-drawn arrow in a w x h box, from top-left toward bottom-right
// (flip it with CSS to point elsewhere).
export const CurvedArrow: React.FC<{
  w: number;
  h: number;
  progress: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ w, h, progress, color = BLUE, style }) => {
  const body = `M6 6 Q ${w * 0.85} ${h * 0.05} ${w - 10} ${h - 12}`;
  const head = `M${w - 34} ${h - 30} L${w - 10} ${h - 10} L${w - 4} ${h - 42}`;
  const a = Math.min(1, progress * 1.4);
  const b = Math.max(0, progress * 1.4 - 1) / 0.4;
  return (
    <svg width={w} height={h} style={{ overflow: "visible", ...style }}>
      <path
        d={body}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        {...evolvePath(a, body)}
      />
      {b > 0 ? (
        <path
          d={head}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...evolvePath(Math.min(1, b), head)}
        />
      ) : null}
    </svg>
  );
};
