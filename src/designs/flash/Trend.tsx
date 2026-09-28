// `trend` as an alert line: it draws itself in gold, each point pops with
// its value printed, the last one pulses. No up/down colour: a trend cue
// carries no direction of its own.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT, clamp } from "../../mortgage/style";
import type { CueOf } from "../classic/Infographics";
import { CH, CW, Header } from "./CueKit";
import { DIM, FlashCard, GOLD } from "./Frame";

const PLOT = { w: CW, h: CH - 70, left: 80, right: 80, top: 70, bottom: 56 };

export const FlashTrend: React.FC<{ cue: CueOf<"trend"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const pts = cue.points;
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) =>
    PLOT.left + (i / (pts.length - 1)) * (PLOT.w - PLOT.left - PLOT.right);
  const y = (v: number) =>
    PLOT.top +
    (1 - (v - (lo - span * 0.12)) / (span * 1.24)) *
      (PLOT.h - PLOT.top - PLOT.bottom);
  const path = `M ${pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" L ")}`;
  const draw = interpolate(frame, [6, 42], [0, 1], clamp);
  const { strokeDasharray, strokeDashoffset } = evolvePath(draw, path);
  const fmt = (v: number) =>
    `${v.toLocaleString("vi-VN", {
      minimumFractionDigits: cue.decimals ?? 2,
      maximumFractionDigits: cue.decimals ?? 2,
    })}${cue.unit ?? ""}`;
  const ring = ((frame - 42) % 30) / 30;
  return (
    <FlashCard padding="22px 30px">
      <Header kicker={cue.kicker} title={cue.title} />
      <svg width={PLOT.w} height={PLOT.h} style={{ overflow: "visible" }}>
        {[0, 1, 2, 3].map((g) => {
          const gy = PLOT.top + (g / 3) * (PLOT.h - PLOT.top - PLOT.bottom);
          return (
            <line
              key={g}
              x1={0}
              x2={PLOT.w}
              y1={gy}
              y2={gy}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={2}
              strokeDasharray="8 10"
            />
          );
        })}
        <path
          d={path}
          fill="none"
          stroke={GOLD}
          strokeWidth={10}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ filter: "drop-shadow(0 0 12px rgba(255,185,56,0.7))" }}
        />
        {pts.map((p, i) => {
          const reach = i / (pts.length - 1);
          const k = frame - (6 + reach * 36);
          if (k < 0) return null;
          const s = interpolate(k, [0, 5], [1.8, 1], clamp);
          const last = i === pts.length - 1;
          return (
            <g key={p.label}>
              {last && frame >= 42 ? (
                <circle
                  cx={x(i)}
                  cy={y(p.value)}
                  r={14 + ring * 30}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth={4}
                  opacity={1 - ring}
                />
              ) : null}
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={12 * s}
                fill="#fff"
                stroke={GOLD}
                strokeWidth={5}
              />
              <text
                x={x(i)}
                y={y(p.value) - 26}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={900}
                fontSize={34}
                fill={last ? GOLD : "#fff"}
                opacity={interpolate(k, [0, 4], [0, 1], clamp)}
              >
                {fmt(p.value)}
              </text>
              <text
                x={x(i)}
                y={PLOT.h - 12}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={800}
                fontSize={30}
                fill={DIM}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </FlashCard>
  );
};
