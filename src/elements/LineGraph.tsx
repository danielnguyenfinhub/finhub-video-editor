// A trend line that draws itself left to right (evolvePath), each point popping
// in as the line reaches it, on a navy card. For "rate over time" moments.
// The y-axis spans the data's own range, not zero, so a 3.6%–4.35% move is
// visible. Every point prints its value, so the scale is never hidden (a
// cropped axis without numbers would exaggerate the trend).
// Title and labels are on-screen copy: in a reel they go through the RG 234
// check like any other text.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand/theme";
import { FONT, clamp } from "../mortgage/style";

export type GraphPoint = { label: string; value: number };

const W = 920;
const H = 560;
const PAD = { left: 70, right: 70, top: 60, bottom: 90 };
const GRID = 4;

export const LineGraph: React.FC<{
  data: GraphPoint[];
  title?: string;
  unit?: string; // appended to values, e.g. "%"
  decimals?: number;
  drawFrames?: number;
  locale?: string; // e.g. "vi-VN" prints 4,35%; default keeps 4.35%
}> = ({ data, title, unit = "", decimals = 2, drawFrames = 60, locale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const min = lo - span * 0.15;
  const max = hi + span * 0.15;
  const x = (i: number) =>
    PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const fmt = (v: number) =>
    `${
      locale
        ? v.toLocaleString(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : v.toFixed(decimals)
    }${unit}`;

  const path = `M ${data.map((d, i) => `${x(i)},${y(d.value)}`).join(" L ")}`;
  const progress = interpolate(frame, [0, drawFrames], [0, 1], clamp);
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, path);

  return (
    <div
      style={{
        width: W,
        padding: "32px 0 16px",
        borderRadius: 28,
        backgroundColor: "rgba(11, 31, 61, 0.92)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)",
        fontFamily: FONT,
      }}
    >
      {title ? (
        <div
          style={{
            padding: "0 40px",
            fontSize: 44,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>
      ) : null}
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        {Array.from({ length: GRID + 1 }, (_, g) => {
          const v = min + ((max - min) * g) / GRID;
          return (
            <line
              key={g}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={2}
            />
          );
        })}
        <path
          d={path}
          fill="none"
          stroke={brand.accent}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
        {data.map((d, i) => {
          // Pops when the line reaches it (points are evenly spaced in x).
          const reachAt = (i / (data.length - 1)) * drawFrames;
          const s = spring({
            frame: frame - reachAt,
            fps,
            config: { damping: 11, stiffness: 160 },
          });
          return (
            <g key={i}>
              <g
                style={{
                  transform: `scale(${s})`,
                  transformOrigin: `${x(i)}px ${y(d.value)}px`,
                }}
              >
                <circle
                  cx={x(i)}
                  cy={y(d.value)}
                  r={12}
                  fill={brand.background}
                  stroke={brand.accent}
                  strokeWidth={6}
                />
                <text
                  x={x(i)}
                  y={y(d.value) - 28}
                  textAnchor="middle"
                  fontSize={32}
                  fontWeight={800}
                  fill="#fff"
                >
                  {fmt(d.value)}
                </text>
              </g>
              <text
                x={x(i)}
                y={H - PAD.bottom + 52}
                textAnchor="middle"
                fontSize={28}
                fontWeight={600}
                fill="rgba(255,255,255,0.75)"
                opacity={interpolate(s, [0, 1], [0, 1], clamp)}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
