// "pulse" (Nhịp) scope: the monitor every beat is drawn on. A deep-navy
// screen with a faint grid, a y-axis and a baseline; the plot box (PLOT) is
// shared by the idle trace and every data line, so all of them sit on the
// same chart. The idle trace is a heart-monitor sweep, gold, with no values
// or labels anywhere near it: it only says "the line is live", never data.
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useDelayRender,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE, asSaid } from "../../mortgage/golden";
import { clamp, reelFontReady } from "../../mortgage/style";

// ------------------------------------------------------------- layout

// Header band (cue kicker + label, stat label), left; the chip slot, right.
export const HEADER = { top: 600, width: 610 };
// The chart. Everything with a value is drawn inside it.
export const PLOT = { left: 170, right: 930, top: 740, bottom: 1150 };
export const PLOT_W = PLOT.right - PLOT.left;
// x labels / hook sub, under the plot; captions under that.
export const FOOT_TOP = 1160;
export const CAPTION_BOTTOM = 1352;
export const MID = (PLOT.top + PLOT.bottom) / 2;
// The idle trace's resting level (a little under the middle).
export const IDLE_BASE = PLOT.top + (PLOT.bottom - PLOT.top) * 0.64;

export const GOLD = brand.highlight;
// Brand sky: the logo blue lifted towards white (no new colour token).
export const SKY = `color-mix(in srgb, ${brand.primary} 45%, #ffffff)`;
export const GLOW = (c: string, r = 14) => `drop-shadow(0 0 ${r}px ${c})`;

export const ease = (x: number) => 1 - (1 - x) ** 3;
export const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);

// fitText needs Be Vietnam Pro loaded: false until it is, frame held.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("pulse: Be Vietnam Pro"));
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

// ------------------------------------------------------------- values

// "3,6%" -> 3.6; "3.388" -> 3388; null when there is no number.
export const numberOf = (s: string): number | null => {
  const m = s.match(/-?\d[\d.,]*/);
  if (!m) return null;
  const raw = m[0];
  const v = parseFloat(
    raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : /\.\d{3}(?!\d)/.test(raw)
        ? raw.replace(/\./g, "")
        : raw,
  );
  return Number.isFinite(v) ? v : null;
};

// A date ("29/9") or a year ("2026"): drawn as a marker (counting uses the core asSaid).
export const isDateLike = (big: string) =>
  /\d\/\d/.test(big) || /^(19|20)\d\d$/.test(big.trim());

// "4,35%" counts 0 → 4,35 with the same decimals; text around it kept.
export const counted = (big: string, t: number): string => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined || asSaid(big)) return big;
  const target = numberOf(m[0]);
  if (target === null) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[0].includes("."),
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// ------------------------------------------------------------- lines

export type Pt = [number, number];

// The part of a left-to-right polyline up to x, plus its head point.
export const clipTo = (pts: Pt[], x: number): { d: string; head: Pt } => {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    if (bx <= x) {
      out.push(pts[i]);
      continue;
    }
    if (ax < x) out.push([x, ay + ((x - ax) / (bx - ax)) * (by - ay)]);
    break;
  }
  return {
    d: `M ${out.map(([px, py]) => `${px} ${py}`).join(" L ")}`,
    head: out[out.length - 1],
  };
};

// A data line: thick gold (or the data's tone) with a glow.
export const DataLine: React.FC<{
  d: string;
  color?: string;
  width?: number;
}> = ({ d, color = GOLD, width = 7 }) => (
  <path
    d={d}
    fill="none"
    stroke={color}
    strokeWidth={width}
    strokeLinejoin="round"
    strokeLinecap="round"
    style={{ filter: GLOW(color, 12) }}
  />
);

// The bright head of the line, with a ring that breathes out every `every`
// frames (motion while a value holds).
export const HeadDot: React.FC<{
  at: Pt;
  t: number;
  color?: string;
  every?: number;
  r?: number;
}> = ({ at, t, color = GOLD, every = 30, r = 12 }) => {
  const k = (((t % every) + every) % every) / every;
  return (
    <g>
      <circle
        cx={at[0]}
        cy={at[1]}
        r={r + k * 34}
        fill="none"
        stroke={color}
        strokeWidth={3}
        opacity={0.8 * (1 - k)}
      />
      <circle
        cx={at[0]}
        cy={at[1]}
        r={r}
        fill="#ffffff"
        stroke={color}
        strokeWidth={4}
        style={{ filter: GLOW(color, 16) }}
      />
    </g>
  );
};

// A dashed horizontal guide across the plot.
export const Guide: React.FC<{
  y: number;
  color?: string;
  opacity?: number;
  from?: number;
}> = ({
  y,
  color = "rgba(255,255,255,0.55)",
  opacity = 1,
  from = PLOT.left,
}) => (
  <line
    x1={from}
    x2={PLOT.right}
    y1={y}
    y2={y}
    stroke={color}
    strokeWidth={2.5}
    strokeDasharray="14 12"
    opacity={opacity}
  />
);

export const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width={1080}
    height={1920}
    style={{ position: "absolute", inset: 0, overflow: "visible" }}
  >
    {children}
  </svg>
);

// ------------------------------------------------------------- backdrop

const GRID_Y = 6;
const GRID_X = 95;

// `t` is a continuous clock (talk frame, or the cover's), so the grid's slow
// scroll never jumps at a cut.
// `dim` (0..1) fades the grid and axis under a classic MotionTrack panel.
export const ScopeBackdrop: React.FC<{ t: number; dim?: number }> = ({
  t,
  dim = 0,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 760px 520px at 540px ${MID}px, rgba(0,100,168,0.30), transparent 72%),
        radial-gradient(circle 420px at 880px 1620px, rgba(255,185,56,0.08), transparent 70%),
        linear-gradient(180deg, ${brand.navy} 0%, ${brand.background} 50%, ${brand.navy} 100%)`,
    }}
  >
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0, opacity: 1 - 0.9 * dim }}
    >
      {Array.from({ length: GRID_Y + 1 }, (_, i) => {
        const y = PLOT.top + (i * (PLOT.bottom - PLOT.top)) / GRID_Y;
        return (
          <line
            key={`h${i}`}
            x1={PLOT.left}
            x2={PLOT.right}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1.5}
          />
        );
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const x =
          PLOT.left + ((((i * GRID_X - t * 0.8) % PLOT_W) + PLOT_W) % PLOT_W);
        return (
          <line
            key={`v${i}`}
            x1={x}
            x2={x}
            y1={PLOT.top}
            y2={PLOT.bottom}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1.5}
          />
        );
      })}
      {/* y-axis with ticks, and the baseline */}
      <line
        x1={PLOT.left}
        x2={PLOT.left}
        y1={PLOT.top - 24}
        y2={PLOT.bottom}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={2.5}
      />
      {Array.from({ length: GRID_Y + 1 }, (_, i) => {
        const y = PLOT.top + (i * (PLOT.bottom - PLOT.top)) / GRID_Y;
        return (
          <line
            key={`k${i}`}
            x1={PLOT.left - 12}
            x2={PLOT.left}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={2.5}
          />
        );
      })}
      <line
        x1={PLOT.left}
        x2={PLOT.right}
        y1={PLOT.bottom}
        y2={PLOT.bottom}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={2}
      />
    </svg>
    {/* faint scanlines: a monitor, not a slide */}
    <AbsoluteFill
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 6px)",
      }}
    />
  </AbsoluteFill>
);

// ------------------------------------------------------------- idle trace

const SPEED = 9; // px per frame: one sweep of the plot in ~2.8 s
const PERIOD = 36; // frames per beat
const TRAIL = 600; // px of trace behind the head; the rest is the gap
const STEP = 4;
const CHUNK = 10;

// One heartbeat, u in [0, 1): small P wave, the QRS spike, the T wave.
// Up is negative y. Clearly a pulse shape, never a value.
const beat = (u: number): number => {
  const bump = (c: number, w: number, h: number) =>
    h * Math.exp(-(((u - c) / w) ** 2));
  return (
    bump(0.14, 0.035, -14) +
    bump(0.3, 0.012, 14) +
    bump(0.335, 0.014, -150) +
    bump(0.37, 0.014, 42) +
    bump(0.6, 0.06, -26)
  );
};

// The sweep: the head crosses the plot left to right and wraps; the trace
// fades behind it. `opacity` hides it while a data beat owns the stage.
export const IdleTrace: React.FC<{ opacity: number }> = ({ opacity }) => {
  const t = useCurrentFrame();
  if (opacity <= 0.01) return null;
  const head = (t * SPEED) % PLOT_W;
  const pts: { x: number; y: number; wrap: boolean }[] = [];
  for (let dx = 0; dx <= TRAIL; dx += STEP) {
    const raw = head - dx;
    const x = PLOT.left + (raw < 0 ? raw + PLOT_W : raw);
    const at = t - dx / SPEED;
    const u = (((at / PERIOD) % 1) + 1) % 1;
    pts.push({ x, y: IDLE_BASE + beat(u), wrap: raw < 0 });
  }
  const chunks: React.ReactNode[] = [];
  for (let i = 0; i + 1 < pts.length; i += CHUNK) {
    const seg = pts.slice(i, i + CHUNK + 1);
    // Break the polyline where the sweep wraps.
    const parts: (typeof seg)[] = [[]];
    seg.forEach((p, j) => {
      if (j > 0 && p.wrap !== seg[j - 1].wrap) parts.push([]);
      parts[parts.length - 1].push(p);
    });
    const a = 1 - i / pts.length;
    parts.forEach((part, k) =>
      part.length > 1
        ? chunks.push(
            <polyline
              key={`${i}-${k}`}
              points={part.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={GOLD}
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={a * a}
            />,
          )
        : null,
    );
  }
  const u = (((t / PERIOD) % 1) + 1) % 1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Svg>
        <g style={{ filter: GLOW(GOLD, 10) }}>{chunks}</g>
        <HeadDot
          at={[pts[0].x, pts[0].y]}
          t={t - PERIOD * 0.33}
          every={PERIOD}
          r={u > 0.3 && u < 0.4 ? 12 : 9}
        />
      </Svg>
    </div>
  );
};

// Right edge of the header, where a figure that cannot take the stage (or a
// bank named while it is taken) sits as a chip.
export const CHIP = { right: SAFE.right, top: HEADER.top, foot: FOOT_TOP };
