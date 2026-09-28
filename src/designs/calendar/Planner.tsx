// `trend` as a week-planner spread: a column per point, a gold marker line
// drawn through the values.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE } from "../../mortgage/golden";
import { FONT, clamp } from "../../mortgage/style";
import type { CueOf } from "../classic/Infographics";
import {
  GOLD,
  HeaderBand,
  NAVY,
  PAPER,
  Rings,
  SLATE,
  Sheet,
  fit,
  flipInStyle,
  useFlipIn,
  useOut,
} from "./Desk";

// ------------------------------------------------------------------ trend

const WEEK = {
  left: SAFE.left + 10,
  right: SAFE.right - 10,
  top: 624,
  head: 124,
  bottom: 1150,
};

const fmt = (v: number, decimals: number | undefined, unit = "") =>
  `${(decimals === undefined ? String(v) : v.toFixed(decimals)).replace(".", ",")}${unit}`;

export const WeekPlanner: React.FC<{ cue: CueOf<"trend"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = useOut();
  const p = useFlipIn(0);
  const w = WEEK.right - WEEK.left;
  const n = cue.points.length;
  const colW = w / n;
  const bodyTop = WEEK.top + WEEK.head;
  const labelH = 64;
  const plotTop = bodyTop + labelH + 70;
  const plotBottom = WEEK.bottom - 92;
  const vals = cue.points.map((q) => q.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const y = (v: number) =>
    hi === lo
      ? (plotTop + plotBottom) / 2
      : plotBottom - ((v - lo) / (hi - lo)) * (plotBottom - plotTop);
  const pts = cue.points.map((q, i) => ({
    x: colW * (i + 0.5),
    y: y(q.value) - bodyTop,
  }));
  // The marker draws across the first 60 % of the cue, point by point.
  const draw = interpolate(
    frame,
    [12, Math.max(24, durationInFrames * 0.6)],
    [0, n - 1],
    clamp,
  );
  const path = pts
    .filter((_, i) => i <= Math.ceil(draw))
    .map((pt, i, arr) => {
      const last = i === arr.length - 1 && i > draw ? draw - (i - 1) : 1;
      const prev = arr[i - 1];
      const x = prev ? prev.x + (pt.x - prev.x) * last : pt.x;
      const yy = prev ? prev.y + (pt.y - prev.y) * last : pt.y;
      return `${i ? "L" : "M"}${x} ${yy}`;
    })
    .join(" ");
  // A dip's value sits under its dot, so the marker line never crosses it.
  const below = (i: number) => {
    const near = [vals[i - 1], vals[i + 1]].filter(
      (v): v is number => v !== undefined,
    );
    return near.every((v) => vals[i] < v);
  };
  const valSize = Math.min(
    38,
    fit(fmt(hi, cue.decimals, cue.unit), colW - 16, 1, 38),
  );
  return (
    <div
      style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: out }}
    >
      <div
        style={{
          position: "absolute",
          left: WEEK.left,
          width: w,
          top: bodyTop,
          height: WEEK.bottom - bodyTop,
          perspective: 1600,
          boxShadow: "0 30px 60px rgba(11,31,61,0.22)",
          borderRadius: "0 0 14px 14px",
        }}
      >
        <Sheet style={{ ...flipInStyle(p), padding: 0, display: "block" }}>
          {cue.points.map((q, i) => (
            <div
              key={q.label}
              style={{
                position: "absolute",
                left: colW * i,
                width: colW,
                top: 0,
                bottom: 0,
                borderLeft: i ? "2px solid rgba(11,31,61,0.10)" : undefined,
              }}
            >
              <div
                style={{
                  height: labelH,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,100,168,0.07)",
                  color: SLATE,
                  fontWeight: 900,
                  fontSize: fit(q.label, colW - 16, 1, 32),
                }}
              >
                {q.label}
              </div>
            </div>
          ))}
          <svg
            width={w}
            height={WEEK.bottom - bodyTop}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <path
              d={path}
              fill="none"
              stroke={GOLD}
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {pts.map((pt, i) =>
              draw >= i - 0.02 ? (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={13}
                  fill={NAVY}
                  stroke={PAPER}
                  strokeWidth={4}
                />
              ) : null,
            )}
          </svg>
          {pts.map((pt, i) =>
            draw >= i - 0.02 ? (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: pt.x - colW / 2,
                  width: colW,
                  top: below(i) ? pt.y + valSize * 0.7 : pt.y - valSize * 1.9,
                  textAlign: "center",
                  color: NAVY,
                  fontWeight: 900,
                  fontSize: valSize,
                  whiteSpace: "nowrap",
                }}
              >
                {fmt(cue.points[i].value, cue.decimals, cue.unit)}
              </div>
            ) : null,
          )}
        </Sheet>
      </div>
      <HeaderBand
        left={WEEK.left}
        width={w}
        top={WEEK.top}
        height={WEEK.head}
        kicker={cue.kicker}
        text={cue.title}
        size={fit(cue.title, w - 60, 1, 44)}
      />
      <Rings left={WEEK.left} width={w} top={WEEK.top} />
    </div>
  );
};
