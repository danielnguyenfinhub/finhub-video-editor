// The trend slide: a line drawn in across the grid, each point labelled as
// the line reaches it, the latest value large on the right.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../../brand/theme";
import type { Cue } from "../../../mortgage/schema";
import { FONT, clamp } from "../../../mortgage/style";
import { Kicker, useP } from "./Charts";
import { GOLD, INK, LINE, NAVY, SLATE, STAGE, colX, span } from "./Chrome";

const STAGE_H = STAGE.bottom - STAGE.top;

const fmt = (v: number, decimals: number, unit?: string) =>
  `${v.toFixed(decimals).replace(".", ",")}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;

type TrendCue = Extract<Cue, { kind: "trend" }>;
export const TrendSlide: React.FC<{ cue: TrendCue }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const W = span(9);
  const H = STAGE_H - 70;
  const PADX = 90;
  const vals = cue.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo || 1) * 0.35;
  const x = (i: number) =>
    PADX + (i * (W - 2 * PADX)) / (cue.points.length - 1);
  const y = (v: number) =>
    60 + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 130);
  const draw = interpolate(frame, [10, 55], [0, 1], clamp);
  const d = cue.points
    .map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  const last = cue.points[cue.points.length - 1];
  const lastIn = useP(58);
  const dec = cue.decimals ?? 0;
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      <Kicker text={cue.kicker} />
      <svg
        style={{
          position: "absolute",
          left: colX(0),
          top: STAGE.top + 60,
          width: W,
          height: H,
        }}
      >
        {[0, 1, 2, 3].map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={40 + g * ((H - 90) / 3)}
            y2={40 + g * ((H - 90) / 3)}
            stroke={LINE}
            strokeWidth={2}
          />
        ))}
        <path
          d={d}
          stroke={NAVY}
          strokeWidth={8}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
        {cue.points.map((p, i) => {
          const on = interpolate(
            draw,
            [
              i / (cue.points.length - 1) - 0.02,
              i / (cue.points.length - 1) + 0.05,
            ],
            [0, 1],
            clamp,
          );
          return (
            <g key={p.label} opacity={on}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={14}
                fill={i === cue.points.length - 1 ? GOLD : NAVY}
                stroke={brand.card}
                strokeWidth={4}
              />
              <text
                x={x(i)}
                y={y(p.value) - 30}
                textAnchor="middle"
                fontSize={32}
                fontWeight={800}
                fill={INK}
              >
                {fmt(p.value, dec, cue.unit)}
              </text>
              <text
                x={x(i)}
                y={H - 20}
                textAnchor="middle"
                fontSize={30}
                fontWeight={700}
                fill={SLATE}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: colX(9) + 20,
          width: span(3) - 20,
          top: STAGE.top + 60,
          height: H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderLeft: `2px solid ${LINE}`,
          paddingLeft: 36,
          boxSizing: "border-box",
          opacity: lastIn,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: SLATE }}>
          {last.label}
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: NAVY,
            lineHeight: 1.1,
          }}
        >
          {fmt(last.value, dec, cue.unit)}
        </div>
      </div>
    </div>
  );
};
