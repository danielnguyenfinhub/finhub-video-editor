// "gauge" instrument: the brushed-metal navy panel (backdrop) and the big
// analogue dial that is the hero of every rate-alert flash. A 240° arc with a
// sky→gold band, ticks and numerals, a heavy needle on a hub, and a digital
// readout under the hub. Scenes.tsx decides what the dial shows each frame;
// this file only draws it.
import type React from "react";
import { useEffect, useState } from "react";
import { AbsoluteFill, useDelayRender } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, reelFontReady } from "../../mortgage/style";

// Brand sky: the logo blue lifted towards white (no new colour token).
export const SKY = `color-mix(in srgb, ${brand.primary} 45%, #ffffff)`;
export const GOLD = brand.highlight;

// Geometry. The needle sweeps θ ∈ [-SWEEP, SWEEP] degrees, clockwise from 12
// o'clock; the open bottom of the dial (never swept) holds the readout.
export const C = { x: 540, y: 890 };
export const R = 270; // the colour band
export const BEZEL_R = 306;
export const SWEEP = 120;
export const READOUT = { top: 962, width: 268, height: 94 };
export const LABEL_TOP = 1072; // text under the dial, ends by ~1175
export const STRIP_TOP = 1190; // the dark caption strip
export const CHIP_TOP = 600; // secondary readouts beside the dial

const rad = (deg: number) => (deg * Math.PI) / 180;
export const pt = (r: number, deg: number): [number, number] => [
  C.x + r * Math.sin(rad(deg)),
  C.y - r * Math.cos(rad(deg)),
];
export const arcPath = (r: number, a: number, b: number): string => {
  const [x1, y1] = pt(r, a);
  const [x2, y2] = pt(r, b);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

// ------------------------------------------------------------- numbers

export type Parsed = {
  value: number;
  decimals: number;
  grouped: boolean;
  before: string;
  after: string;
};

// "4,35%" -> 4.35 (Vietnamese: "." groups thousands, "," is the decimal).
// A year or a date is not a value on a scale: null.
export const parseValue = (s: string): Parsed | null => {
  const m = s.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return null;
  const raw = m[0].replace(/[.,]$/, "");
  if (/^(19|20)\d\d$/.test(raw) || /\d\s*\/\s*\d/.test(s)) return null;
  const value = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return null;
  return {
    value,
    decimals: raw.includes(",") ? raw.split(",")[1].length : 0,
    grouped: raw.includes("."),
    before: s.slice(0, m.index),
    after: s.slice(m.index + raw.length),
  };
};

export const fmt = (v: number, decimals: number, grouped = true): string =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });

export type Scale = { lo: number; hi: number; step: number; n: number };

// Round ticks covering [lo, hi]: step 1/2/2,5/5 × 10^k, 4–7 intervals.
export const niceScale = (lo: number, hi: number): Scale => {
  const span = Math.max(hi - lo, 1e-6);
  let step = 1;
  for (let k = Math.floor(Math.log10(span)) - 2; ; k++) {
    const hit = [1, 2, 2.5, 5]
      .map((s) => s * 10 ** k)
      .find((s) => span / s <= 7);
    if (hit) {
      step = hit;
      break;
    }
  }
  const a = Math.floor(lo / step + 1e-9) * step;
  const b = Math.ceil(hi / step - 1e-9) * step;
  return { lo: a, hi: b, step, n: Math.max(1, Math.round((b - a) / step)) };
};

export const angleOf = (v: number, s: Scale): number =>
  Math.max(
    -SWEEP - 6,
    Math.min(SWEEP + 6, -SWEEP + (2 * SWEEP * (v - s.lo)) / (s.hi - s.lo)),
  );

export const scaleLabels = (s: Scale): string[] => {
  let dec = 0; // the step's decimals: 0,5 -> 1, 0,25 -> 2, 2,5 -> 1
  while (
    dec < 3 &&
    Math.abs(s.step * 10 ** dec - Math.round(s.step * 10 ** dec)) > 1e-6
  )
    dec++;
  return Array.from({ length: s.n + 1 }, (_, i) =>
    (s.lo + i * s.step).toLocaleString("vi-VN", { maximumFractionDigits: dec }),
  );
};

// ------------------------------------------------------------- font

// fitText needs Be Vietnam Pro loaded: false until it is, frame held meanwhile.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("gauge: Be Vietnam Pro"));
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

// ------------------------------------------------------------- backdrop

// Dark navy instrument panel: brushed-metal grain, a blue glow behind the
// dial, screw heads in the corners, and the dark caption strip under it.
export const PanelBackdrop: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle 560px at ${C.x}px ${C.y}px, rgba(0,100,168,${0.3 + 0.06 * Math.sin(t / 22)}), transparent 72%),
        linear-gradient(180deg, ${brand.background} 0%, ${brand.navy} 55%, ${brand.background} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 2px, transparent 2px, transparent 9px)",
      }}
    />
    {/* A slow light sweep over the brushed metal. */}
    <AbsoluteFill
      style={{
        background: `linear-gradient(105deg, transparent ${30 + ((t * 0.35) % 120) - 20}%, rgba(255,255,255,0.05) ${30 + ((t * 0.35) % 120) - 10}%, transparent ${30 + ((t * 0.35) % 120)}%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: STRIP_TOP,
        bottom: 1920 - SAFE.bottom - 20,
        background: `linear-gradient(180deg, rgba(6,19,42,0.92), rgba(6,19,42,0.98))`,
        borderTop: `3px solid rgba(255,185,56,0.55)`,
        boxShadow: "0 -18px 40px rgba(0,0,0,0.45)",
      }}
    />
    {[
      [70, 330],
      [1010, 330],
      [70, 1590],
      [1010, 1590],
    ].map(([x, y]) => (
      <div
        key={`${x}${y}`}
        style={{
          position: "absolute",
          left: x - 14,
          top: y - 14,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), ${brand.slate} 55%, ${brand.navy})`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 5,
            right: 5,
            top: 12,
            height: 4,
            background: brand.navy,
            transform: "rotate(-30deg)",
          }}
        />
      </div>
    ))}
  </AbsoluteFill>
);

// ------------------------------------------------------------- dial face

const TICKS_PER = 5;

// Major ticks with numerals (labels) or plain ticks (labels omitted).
export const Ticks: React.FC<{
  n: number;
  labels?: string[];
  opacity: number;
  size?: number;
}> = ({ n, labels, opacity, size = 30 }) => {
  const count = n * TICKS_PER;
  return (
    <g opacity={opacity}>
      {Array.from({ length: count + 1 }, (_, i) => {
        const a = -SWEEP + (2 * SWEEP * i) / count;
        const major = i % TICKS_PER === 0;
        const [x1, y1] = pt(R - (major ? 38 : 26), a);
        const [x2, y2] = pt(R - 12, a);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#ffffff"
            strokeOpacity={major ? 0.95 : 0.45}
            strokeWidth={major ? 5 : 2}
            strokeLinecap="round"
          />
        );
      })}
      {(labels ?? []).map((l, i) => {
        const [x, y] = pt(R - 70, -SWEEP + (2 * SWEEP * i) / n);
        return (
          <text
            key={`${l}${i}`}
            x={x}
            y={y}
            fill="#ffffff"
            fontFamily={FONT}
            fontWeight={800}
            fontSize={size}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {l}
          </text>
        );
      })}
    </g>
  );
};

// Bezel, face, colour band and the alert lamp: the parts that never change.
export const DialBody: React.FC<{ t: number; lamp: number }> = ({
  t,
  lamp,
}) => {
  const glint = -SWEEP - 10 + ((t * 1.6) % 300);
  return (
    <>
      <defs>
        <radialGradient id="gauge-face" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={brand.background} />
          <stop offset="82%" stopColor={brand.navy} />
          <stop offset="100%" stopColor={brand.navy} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="gauge-bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.7} />
          <stop offset="35%" stopColor={brand.slate} />
          <stop offset="60%" stopColor={brand.navy} />
          <stop offset="85%" stopColor={brand.slate} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.5} />
        </linearGradient>
        <linearGradient id="gauge-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SKY} />
          <stop offset="55%" stopColor={brand.primary} />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <circle cx={C.x} cy={C.y} r={BEZEL_R - 8} fill="url(#gauge-face)" />
      <path
        d={arcPath(BEZEL_R, -SWEEP - 12, SWEEP + 12)}
        fill="none"
        stroke="url(#gauge-bezel)"
        strokeWidth={26}
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.6))" }}
      />
      <path
        d={arcPath(BEZEL_R - 13, -SWEEP - 12, SWEEP + 12)}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.25}
        strokeWidth={1.5}
      />
      {glint < SWEEP + 10 ? (
        <path
          d={arcPath(BEZEL_R, glint, glint + 16)}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.55}
          strokeWidth={10}
          strokeLinecap="round"
          style={{ filter: "blur(3px)" }}
        />
      ) : null}
      <path
        d={arcPath(R, -SWEEP, SWEEP)}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={16}
      />
      <path
        d={arcPath(R, -SWEEP, SWEEP)}
        fill="none"
        stroke="url(#gauge-band)"
        strokeWidth={10}
        opacity={0.85}
      />
      {/* Alert lamp on top of the bezel: pulses while a number is up. */}
      <circle
        cx={C.x}
        cy={C.y - BEZEL_R}
        r={10}
        fill={GOLD}
        opacity={0.35 + 0.65 * lamp}
        style={{ filter: `drop-shadow(0 0 ${6 + 14 * lamp}px ${GOLD})` }}
      />
    </>
  );
};

// The old value's ghost needle, the lit arc between two values, the needle.
export const LitArc: React.FC<{ a: number; b: number; color: string }> = ({
  a,
  b,
  color,
}) =>
  Math.abs(b - a) < 0.5 ? null : (
    <path
      d={arcPath(R, Math.min(a, b), Math.max(a, b))}
      fill="none"
      stroke={color}
      strokeWidth={22}
      strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 16px ${color})` }}
    />
  );

export const Needle: React.FC<{ angle: number; ghost?: boolean }> = ({
  angle,
  ghost,
}) => {
  const L = R - 28;
  return (
    <g
      transform={`rotate(${angle} ${C.x} ${C.y})`}
      opacity={ghost ? 0.45 : 1}
      style={{
        filter: ghost ? undefined : "drop-shadow(0 6px 10px rgba(0,0,0,0.7))",
      }}
    >
      <defs>
        <linearGradient id="gauge-needle" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <polygon
        points={
          ghost
            ? `${C.x - 3},${C.y} ${C.x},${C.y - L + 20} ${C.x + 3},${C.y}`
            : `${C.x - 13},${C.y} ${C.x - 3},${C.y - L} ${C.x + 3},${C.y - L} ${C.x + 13},${C.y} ${C.x + 8},${C.y + 44} ${C.x - 8},${C.y + 44}`
        }
        fill={ghost ? SKY : "url(#gauge-needle)"}
      />
    </g>
  );
};

export const Hub: React.FC = () => (
  <>
    <circle
      cx={C.x}
      cy={C.y}
      r={34}
      fill={brand.navy}
      stroke={GOLD}
      strokeWidth={4}
    />
    <circle cx={C.x} cy={C.y} r={14} fill={brand.slate} />
    <circle cx={C.x - 4} cy={C.y - 4} r={5} fill="#ffffff" opacity={0.6} />
  </>
);
