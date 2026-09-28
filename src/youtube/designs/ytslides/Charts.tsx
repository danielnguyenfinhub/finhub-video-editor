// The number slides: old -> new (change), a line drawn in (trend), bars
// growing (bars), and the 100-dot grid a percent figure glides beside.
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import type { Cue } from "../../../mortgage/schema";
import { FONT, clamp, toneColor } from "../../../mortgage/style";
import { GOLD, INK, LINE, NAVY, SLATE, STAGE, colX, span } from "./Chrome";

export const CHARTS_COPY = ["Giảm", "Tăng", "/ 100"];
type At = (ms: number) => number;
const STAGE_H = STAGE.bottom - STAGE.top;
const soft = { damping: 200 } as const;

// "4,35%" -> 4.35; null when the figure is not a plain percent up to 100.
export const percentOf = (big: string): number | null => {
  const m = /^(\d+(?:,\d+)?)%$/.exec(big.trim());
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  return v > 0 && v <= 100 ? v : null;
};

export const useP = (at: number, frames = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at,
    fps,
    config: soft,
    durationInFrames: frames,
  });
};

// A percent as dots out of 100, filled one by one (the last one partly).
export const Waffle: React.FC<{ pct: number; delay: number }> = ({
  pct,
  delay,
}) => {
  const frame = useCurrentFrame();
  const DOT = 36;
  const GAP = 8;
  const size = 10 * DOT + 9 * GAP;
  const p = useP(delay);
  return (
    <div
      style={{
        position: "absolute",
        left: colX(7) + (span(5) - size) / 2,
        top: STAGE.top + (STAGE_H - size) / 2,
        width: size,
        display: "flex",
        flexWrap: "wrap",
        gap: GAP,
        opacity: p,
      }}
    >
      {Array.from({ length: 100 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, pct - i));
        const on =
          interpolate(
            frame,
            [delay + i * 1.5, delay + i * 1.5 + 6],
            [0, 1],
            clamp,
          ) * fill;
        return (
          <div
            key={i}
            style={{
              width: DOT,
              height: DOT,
              borderRadius: DOT / 2,
              background: LINE,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: DOT * on,
                background: GOLD,
              }}
            />
          </div>
        );
      })}
      <div
        style={{
          width: size,
          marginTop: 10,
          textAlign: "right",
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 700,
          color: SLATE,
        }}
      >
        {String(pct).replace(".", ",")} {CHARTS_COPY[2]}
      </div>
    </div>
  );
};

export const Kicker: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <div
      style={{
        position: "absolute",
        left: colX(0),
        top: STAGE.top,
        padding: "6px 18px",
        borderRadius: 10,
        background: GOLD,
        color: NAVY,
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: 3,
      }}
    >
      {text}
    </div>
  ) : null;

type ChangeCue = Extract<Cue, { kind: "change" }>;
// `from` sits centre stage until the swap, then glides left as `to` arrives.
export const ChangeSlide: React.FC<{
  cue: ChangeCue;
  at: At;
  from: number;
}> = ({ cue, at, from }) => {
  const swap = at(cue.swapAtMs) - from;
  const m = useP(swap, 18);
  const arrow = useP(swap + 6, 16);
  const next = useP(swap + 12, 16);
  const W = span(5);
  const centre = colX(0) + (span(12) - W) / 2;
  const mid = STAGE.top + STAGE_H / 2 + 20;
  const newColor = toneColor(cue.tone ?? "neutral", brand.primary);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      <Kicker text={cue.kicker} />
      <div
        style={{
          position: "absolute",
          left: centre + (colX(0) - centre) * m,
          width: W,
          top: mid - 110,
          textAlign: "center",
          fontSize: 210 - 40 * m,
          fontWeight: 900,
          color: m > 0.5 ? SLATE : NAVY,
          lineHeight: 1,
        }}
      >
        <span style={{ position: "relative" }}>
          {cue.from}
          <span
            style={{
              position: "absolute",
              left: 0,
              top: "52%",
              height: 10,
              width: `${100 * arrow}%`,
              background: brand.bad,
              borderRadius: 5,
            }}
          />
        </span>
      </div>
      <svg
        style={{
          position: "absolute",
          left: colX(5),
          top: mid - 60,
          width: span(2),
          height: 120,
        }}
      >
        <path
          d={`M 10 60 L ${span(2) - 40} 60 M ${span(2) - 70} 25 L ${span(2) - 30} 60 L ${span(2) - 70} 95`}
          stroke={GOLD}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - arrow}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: colX(7),
          width: W,
          top: mid - 110,
          textAlign: "center",
          opacity: next,
          transform: `scale(${0.8 + 0.2 * next})`,
        }}
      >
        <div
          style={{
            fontSize: 190,
            fontWeight: 900,
            color: newColor,
            lineHeight: 1,
          }}
        >
          {cue.to}
        </div>
        {cue.direction ? (
          <div
            style={{ marginTop: 26, fontSize: 34, fontWeight: 800, color: INK }}
          >
            {cue.direction === "down" ? "▼" : "▲"}{" "}
            {CHARTS_COPY[cue.direction === "down" ? 0 : 1]}
          </div>
        ) : null}
      </div>
    </div>
  );
};

type BarsCue = Extract<Cue, { kind: "bars" }>;
export const BarsSlide: React.FC<{ cue: BarsCue; at: At; from: number }> = ({
  cue,
  at,
  from,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.bars.length;
  const slot = span(12) / n;
  const MAXH = STAGE_H - 170;
  const base = STAGE.bottom - 50;
  const stamp = useP(cue.stamp ? at(cue.stamp.atMs) - from : 1e9);
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      <Kicker text={cue.kicker} />
      <div
        style={{
          position: "absolute",
          left: colX(0),
          width: span(12),
          top: base,
          height: 2,
          background: LINE,
        }}
      />
      {cue.bars.map((b, i) => {
        const g = spring({
          frame: frame - (at(b.atMs) - from),
          fps,
          config: soft,
          durationInFrames: 24,
        });
        const h = MAXH * (b.overflow ? 1 : b.height) * g;
        const cx = colX(0) + slot * (i + 0.5);
        return (
          <div
            key={b.label}
            style={{
              position: "absolute",
              left: cx - span(2) / 2,
              width: span(2),
              top: STAGE.top,
              height: base - STAGE.top + 50,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 50 + h + 10,
                width: "100%",
                textAlign: "center",
                fontSize: 54,
                fontWeight: 900,
                color: INK,
                opacity: g,
              }}
            >
              {b.overflow ? "▲ " : ""}
              {b.value}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 50,
                width: "100%",
                height: h,
                borderRadius: "14px 14px 0 0",
                background: toneColor(b.tone, NAVY),
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                textAlign: "center",
                fontSize: 30,
                fontWeight: 700,
                color: SLATE,
                opacity: g,
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
            right: 1920 - (colX(11) + span(1)),
            top: STAGE.top,
            padding: "8px 22px",
            borderRadius: 12,
            border: `4px solid ${toneColor(cue.stamp.tone, NAVY)}`,
            color: toneColor(cue.stamp.tone, NAVY),
            fontSize: 34,
            fontWeight: 900,
            opacity: stamp,
            transform: `scale(${1.3 - 0.3 * stamp})`,
          }}
        >
          {cue.stamp.text}
        </div>
      ) : null}
    </div>
  );
};
