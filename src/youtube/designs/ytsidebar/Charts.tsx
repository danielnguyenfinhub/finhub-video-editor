// Chart cues for "Mục lục": trend as a line chart drawn left to right, bars
// rising as each is said. Split from Cues.tsx to keep files small.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { clamp, pop, toneColor } from "../../../mortgage/style";
import { Title, type Beat } from "./Cues";
import { INK, PAGE_W, type DrawnCue } from "./Plan";

export const Trend: React.FC<Beat<Extract<DrawnCue, { kind: "trend" }>>> = ({
  cue,
}) => {
  const frame = useCurrentFrame();
  const W = PAGE_W;
  const H = 400;
  const pad = { l: 70, r: 70, t: 60, b: 60 };
  const vals = cue.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) =>
    pad.l + (i / (cue.points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - lo + span * 0.15) / (span * 1.3)) * (H - pad.t - pad.b);
  const d = cue.points
    .map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  const draw = interpolate(frame, [8, 58], [0, 1], clamp);
  const path = evolvePath(draw, d);
  const fmt = (v: number) =>
    `${v.toLocaleString("vi-VN", {
      minimumFractionDigits: cue.decimals ?? 2,
      maximumFractionDigits: cue.decimals ?? 2,
    })}${cue.unit ?? ""}`;
  return (
    <div>
      <Title kicker={cue.kicker} text={cue.title} />
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        <line
          x1={0}
          x2={W}
          y1={H - pad.b + 20}
          y2={H - pad.b + 20}
          stroke={`${INK}33`}
          strokeWidth={3}
        />
        <path
          d={d}
          fill="none"
          stroke={INK}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...path}
        />
        {cue.points.map((p, i) => {
          const show = draw >= i / (cue.points.length - 1) - 0.001;
          return show ? (
            <g key={p.label}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={14}
                fill={brand.highlight}
                stroke={INK}
                strokeWidth={5}
              />
              <text
                x={x(i)}
                y={y(p.value) - 30}
                textAnchor="middle"
                fontSize={40}
                fontWeight={900}
                fill={INK}
              >
                {fmt(p.value)}
              </text>
              <text
                x={x(i)}
                y={H - pad.b + 66}
                textAnchor="middle"
                fontSize={32}
                fontWeight={700}
                fill={brand.slate}
              >
                {p.label}
              </text>
            </g>
          ) : null;
        })}
      </svg>
    </div>
  );
};

export const Bars: React.FC<Beat<Extract<DrawnCue, { kind: "bars" }>>> = ({
  cue,
  now,
  at,
}) => {
  const { fps } = useVideoConfig();
  const H = 330;
  return (
    <div>
      <Title kicker={cue.kicker} text={cue.title} />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 70,
          height: H + 120,
        }}
      >
        {cue.bars.map((b) => {
          const p = Math.min(1, pop(now, fps, at(b.atMs)));
          const color = b.tone === "neutral" ? INK : toneColor(b.tone);
          return (
            <div
              key={b.label}
              style={{ width: 230, textAlign: "center", opacity: p ? 1 : 0.2 }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, color, opacity: p }}>
                {b.value}
              </div>
              <div
                style={{
                  margin: "10px auto 0",
                  width: 150,
                  height: Math.max(8, H * b.height * p),
                  borderRadius: "14px 14px 0 0",
                  background: color,
                }}
              />
              <div
                style={{
                  marginTop: 12,
                  fontSize: 30,
                  fontWeight: 700,
                  color: brand.slate,
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
        {cue.stamp && now >= at(cue.stamp.atMs) ? (
          <div
            style={{
              alignSelf: "center",
              padding: "14px 30px",
              border: `6px solid ${cue.stamp.tone === "neutral" ? INK : toneColor(cue.stamp.tone)}`,
              borderRadius: 16,
              fontSize: 44,
              fontWeight: 900,
              transform: "rotate(-6deg)",
            }}
          >
            {cue.stamp.text}
          </div>
        ) : null}
      </div>
    </div>
  );
};
