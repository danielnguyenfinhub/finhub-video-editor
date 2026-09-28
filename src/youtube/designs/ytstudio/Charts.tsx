// The chart cues on the wall screen: a trend line that draws itself (values
// printed at every point, Vietnamese decimals) and up to three bars.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { Fragment } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp, enter, pop, toneColor } from "../../../mortgage/style";
import { Area, PIC, Title, type P } from "./Cues";
import { tint } from "./tokens";

export const Trend: React.FC<P<"trend">> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = PIC.w;
  const H = 330;
  const pad = { l: 60, r: 60, t: 56, b: 50 };
  const vals = cue.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) =>
    pad.l + (i / (vals.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - (lo - span * 0.15)) / (span * 1.3)) * (H - pad.t - pad.b);
  const d = `M ${vals.map((v, i) => `${x(i)},${y(v)}`).join(" L ")}`;
  const draw = interpolate(frame, [8, 8 + 20 * vals.length], [0, 1], clamp);
  const { strokeDasharray, strokeDashoffset } = evolvePath(draw, d);
  const dec = cue.decimals ?? 2;
  const fmt = (v: number) =>
    `${v.toLocaleString("vi-VN", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${cue.unit ?? ""}`;
  return (
    <Area>
      <Title kicker={cue.kicker} text={cue.title} />
      <svg width={W} height={H} style={{ marginTop: 10, overflow: "visible" }}>
        <path
          d={`${d} L ${x(vals.length - 1)},${H - pad.b} L ${x(0)},${H - pad.b} Z`}
          fill={tint(brand.primary, 0.25 * draw)}
        />
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={H - pad.b}
          y2={H - pad.b}
          stroke={tint(brand.textDim, 0.35)}
          strokeWidth={2}
        />
        <path
          d={d}
          fill="none"
          stroke={brand.highlight}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />
        {cue.points.map((p, i) => {
          const at = 8 + 20 * i;
          const q = pop(frame, fps, at);
          const last = i === vals.length - 1;
          return (
            <Fragment key={p.label}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={11 * q}
                fill={last ? brand.highlight : brand.text}
              />
              <text
                x={x(i)}
                y={y(p.value) - 24}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={32}
                fontWeight={900}
                fill={last ? brand.highlight : brand.text}
                opacity={frame < at ? 0 : q}
              >
                {fmt(p.value)}
              </text>
              <text
                x={x(i)}
                y={H - pad.b + 38}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={28}
                fontWeight={700}
                fill={brand.textDim}
              >
                {p.label}
              </text>
            </Fragment>
          );
        })}
      </svg>
    </Area>
  );
};

export const Bars: React.FC<P<"bars">> = ({ cue, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const MAXH = 250;
  const st = cue.stamp ? beat(cue.stamp.atMs) : Infinity;
  const sp = pop(frame, fps, st);
  return (
    <Area>
      <Title kicker={cue.kicker} text={cue.title} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 90,
          position: "relative",
        }}
      >
        {cue.bars.map((b) => {
          const g = enter(frame, fps, beat(b.atMs));
          const up = frame >= beat(b.atMs);
          const col = toneColor(b.tone, brand.textDim);
          return (
            <div
              key={b.label + b.atMs}
              style={{ width: 190, textAlign: "center" }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  color: col,
                  opacity: up ? g : 0,
                }}
              >
                {b.value}
              </div>
              <div
                style={{
                  height: MAXH * (b.overflow ? 1.12 : b.height) * (up ? g : 0),
                  borderRadius: "12px 12px 0 0",
                  background: b.overflow
                    ? `linear-gradient(0deg, ${col} 70%, ${tint(brand.text, 0.6)} 100%)`
                    : col,
                  marginTop: 8,
                }}
              />
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: brand.text,
                  marginTop: 10,
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
        {cue.stamp ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 10,
              padding: "10px 24px",
              border: `4px solid ${toneColor(cue.stamp.tone)}`,
              borderRadius: 12,
              color: toneColor(cue.stamp.tone),
              fontSize: 34,
              fontWeight: 900,
              opacity: frame < st ? 0 : 1,
              transform: `rotate(-8deg) scale(${1.6 - 0.6 * sp})`,
            }}
          >
            {cue.stamp.text}
          </div>
        ) : null}
      </div>
    </Area>
  );
};
