// The chart widgets: a trend line (every point prints its value, so the
// cropped axis never hides the scale), vertical bars, and their strip
// thumbnails (a sparkline only where the data has several values).
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { interpolate, spring } from "remotion";
import { brand } from "../../../brand/theme";
import type { Cue } from "../../../mortgage/schema";
import { FONT, clamp, enter, toneColor } from "../../../mortgage/style";
import { P, alpha } from "./layout";
import { Tri, viNum } from "./Parts";

type TrendCue = Extract<Cue, { kind: "trend" }>;
type BarsCue = Extract<Cue, { kind: "bars" }>;

const DRAW = 50;

export const TrendChart: React.FC<{
  cue: TrendCue;
  f: number;
  fps: number;
  s: number;
  w: number;
  h: number;
}> = ({ cue, f, fps, s, w, h }) => {
  const pad = { l: 60, r: 60, t: 56, b: 46 };
  const vals = cue.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const min = lo - span * 0.15;
  const max = hi + span * 0.15;
  const n = cue.points.length;
  const x = (i: number) => pad.l + (i / (n - 1)) * (w - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
  const path = `M ${cue.points.map((p, i) => `${x(i)},${y(p.value)}`).join(" L ")}`;
  const progress = interpolate(f, [s + 6, s + 6 + DRAW], [0, 1], clamp);
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, path);
  const base = h - pad.b;
  const dec = cue.decimals ?? 2;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {[0, 0.5, 1].map((g) => (
        <line
          key={g}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + g * (base - pad.t)}
          y2={pad.t + g * (base - pad.t)}
          stroke={P.line}
          strokeWidth={2}
        />
      ))}
      <path
        d={`${path} L ${x(n - 1)},${base} L ${x(0)},${base} Z`}
        fill={alpha(P.gold, 0.1 * progress)}
      />
      <path
        d={path}
        fill="none"
        stroke={P.gold}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
      {cue.points.map((p, i) => {
        const k = spring({
          frame: f - (s + 6 + (i / (n - 1)) * DRAW),
          fps,
          config: { damping: 14, stiffness: 160 },
        });
        return (
          <g key={p.label} style={{ fontFamily: FONT }}>
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={10 * k}
              fill={brand.background}
              stroke={P.gold}
              strokeWidth={5}
            />
            <text
              x={x(i)}
              y={y(p.value) - 24}
              textAnchor="middle"
              fontSize={30}
              fontWeight={800}
              fill={P.text}
              opacity={k}
            >
              {viNum(p.value, dec)}
              {cue.unit ?? ""}
            </text>
            <text
              x={x(i)}
              y={base + 36}
              textAnchor="middle"
              fontSize={24}
              fontWeight={600}
              fill={P.dim}
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const BarsChart: React.FC<{
  cue: BarsCue;
  f: number;
  fps: number;
  at: (ms: number) => number;
  w: number;
  h: number;
}> = ({ cue, f, fps, at, w, h }) => {
  const n = cue.bars.length;
  const maxH = h - 110;
  const bw = 170;
  const stamp = cue.stamp;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 50 + maxH,
          height: 2,
          background: P.line,
        }}
      />
      {cue.bars.map((b, i) => {
        const g = enter(f, fps, at(b.atMs));
        const color = toneColor(b.tone, P.gold);
        const bh = Math.max(4, b.height * maxH * g);
        const cx = (w * (i + 1)) / (n + 1);
        return (
          <div key={b.label}>
            <div
              style={{
                position: "absolute",
                left: cx - bw / 2,
                width: bw,
                top: 50 + maxH - bh,
                height: bh,
                borderRadius: "10px 10px 0 0",
                background: color,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: cx - 200,
                width: 400,
                top: 50 + maxH - bh - 50,
                textAlign: "center",
                fontSize: 38,
                fontWeight: 900,
                color,
                opacity: g,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              }}
            >
              {b.overflow ? <Tri up size={28} color={color} /> : null}
              {b.value}
            </div>
            <div
              style={{
                position: "absolute",
                left: cx - 220,
                width: 440,
                top: 50 + maxH + 12,
                textAlign: "center",
                fontSize: 26,
                fontWeight: 600,
                color: P.dim,
                opacity: g,
              }}
            >
              {b.label}
            </div>
          </div>
        );
      })}
      {stamp ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            padding: "8px 22px",
            borderRadius: 12,
            border: `3px solid ${toneColor(stamp.tone, P.gold)}`,
            color: toneColor(stamp.tone, P.gold),
            fontSize: 30,
            fontWeight: 900,
            opacity: enter(f, fps, at(stamp.atMs)),
          }}
        >
          {stamp.text}
        </div>
      ) : null}
    </div>
  );
};

// Strip thumbnails.
export const Spark: React.FC<{ values: number[]; w: number; h: number }> = ({
  values,
  w,
  h,
}) => {
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const pts = values.map(
    (v, i) =>
      [
        4 + (i / (values.length - 1)) * (w - 8),
        4 + (1 - (v - lo) / span) * (h - 8),
      ] as const,
  );
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h}>
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={P.gold}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={5} fill={P.gold} />
    </svg>
  );
};

export const MiniBars: React.FC<{ cue: BarsCue; h: number }> = ({ cue, h }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: h }}>
    {cue.bars.map((b) => (
      <div
        key={b.label}
        style={{
          width: 26,
          height: Math.max(3, Math.min(1, b.height) * h),
          borderRadius: "4px 4px 0 0",
          background: toneColor(b.tone, P.gold),
        }}
      />
    ))}
  </div>
);
