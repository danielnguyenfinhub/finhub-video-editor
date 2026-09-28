// ytcinema's numbers kit, as a data documentary draws it: thin gold lines,
// huge numerals, small-caps labels. change: the old value, then (at swapAtMs)
// the new one; trend: a gold line drawn point by point; bars: tall columns.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp, toneColor } from "../../../mortgage/style";
import type { CueProps } from "./Cues";
import {
  GOLD,
  IMG_BOTTOM,
  IMG_TOP,
  LEFT,
  RIGHT,
  Rule,
  caps,
  slow,
} from "./Stage";

const Heading: React.FC<{ kicker?: string; title: string }> = ({
  kicker,
  title,
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: LEFT, top: IMG_TOP + 60 }}>
      {kicker ? <div style={caps(24)}>{kicker}</div> : null}
      <div
        style={{
          fontFamily: FONT,
          fontSize: 46,
          fontWeight: 800,
          color: brand.text,
          lineHeight: 1.3,
          marginTop: 6,
        }}
      >
        {title}
      </div>
      <Rule
        p={slow(f, 4, 30)}
        width={240}
        align="left"
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

// "becomes": a thin gold arrow drawn left to right.
const Arrow: React.FC<{ p: number }> = ({ p }) => (
  <svg width={220} height={40} viewBox="0 0 220 40">
    <line
      x1={10}
      y1={20}
      x2={10 + 195 * p}
      y2={20}
      stroke={GOLD}
      strokeWidth={3}
    />
    <polyline
      points="186,6 206,20 186,34"
      fill="none"
      stroke={GOLD}
      strokeWidth={3}
      opacity={p > 0.9 ? 1 : 0}
    />
  </svg>
);

export const Change: React.FC<CueProps<"change">> = ({ c, t }) => {
  const f = useCurrentFrame();
  const swap = t(c.swapAtMs);
  const s = slow(f, swap, 28);
  const fromIn = slow(f, 6, 24);
  const color = c.tone ? toneColor(c.tone, GOLD) : GOLD;
  const mid = (IMG_TOP + IMG_BOTTOM) / 2 + 40;
  const num = (size: number): React.CSSProperties => ({
    position: "absolute",
    top: mid,
    fontFamily: FONT,
    fontSize: size,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: LEFT,
          width: RIGHT - LEFT,
          top: IMG_TOP + 70,
          textAlign: "center",
        }}
      >
        {c.kicker ? <div style={caps(24)}>{c.kicker}</div> : null}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 800,
            color: brand.text,
            marginTop: 8,
          }}
        >
          {c.label}
        </div>
      </div>
      {/* The old value: centre stage, then aside, smaller and struck. */}
      <div
        style={{
          ...num(interpolate(s, [0, 1], [250, 130])),
          left: interpolate(s, [0, 1], [960, 520]),
          color: s > 0 ? brand.textDim : brand.text,
          opacity: fromIn * (1 - 0.35 * s),
          transform: `translate(-50%, -50%) scale(${1 + f * 0.0004})`,
        }}
      >
        {c.from}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "52%",
            height: 3,
            width: `${100 * s}%`,
            background: brand.textDim,
          }}
        />
      </div>
      {s > 0 ? (
        <>
          <div style={{ position: "absolute", left: 790, top: mid - 20 }}>
            <Arrow p={s} />
          </div>
          <div
            style={{
              ...num(220),
              left: 1400,
              color,
              opacity: s,
              transform: `translate(-50%, calc(-50% + ${(1 - s) * 30}px))`,
            }}
          >
            {c.to}
          </div>
        </>
      ) : null}
      <Rule
        p={slow(f, 10, 40)}
        width={900}
        style={{ position: "absolute", left: 960 - 450, top: mid + 170 }}
      />
    </>
  );
};

const fmt = (v: number, decimals: number, unit?: string) =>
  v.toFixed(decimals).replace(".", ",") + (unit ?? "");

export const Trend: React.FC<CueProps<"trend">> = ({ c, dur }) => {
  const f = useCurrentFrame();
  const L = 260;
  const R = RIGHT - 140;
  const T = IMG_TOP + 250;
  const B = IMG_BOTTOM - 150;
  const vals = c.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo || 1) * 0.35;
  const y = (v: number) =>
    B - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (B - T);
  const x = (i: number) => L + ((R - L) * i) / (c.points.length - 1);
  // The line draws over the first 60 % of the cue, one segment at a time.
  const draw = interpolate(
    f,
    [15, Math.max(40, dur * 0.6)],
    [0, c.points.length - 1],
    clamp,
  );
  const pts = c.points.map((p, i) => [x(i), y(p.value)] as const);
  const whole = Math.floor(draw);
  const part = draw - whole;
  const shown = pts.slice(0, whole + 1);
  if (whole < pts.length - 1) {
    const [ax, ay] = pts[whole];
    const [bx, by] = pts[whole + 1];
    shown.push([ax + (bx - ax) * part, ay + (by - ay) * part]);
  }
  const line = shown.map(([a, b]) => `${a},${b}`).join(" ");
  const d = c.decimals ?? 0;
  return (
    <>
      <Heading kicker={c.kicker} title={c.title} />
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <linearGradient id="ytcinema-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.18} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((k) => (
          <line
            key={k}
            x1={L - 40}
            x2={R + 40}
            y1={T + ((B - T) * k) / 3}
            y2={T + ((B - T) * k) / 3}
            stroke={brand.slate}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}
        <polygon
          points={`${line} ${shown[shown.length - 1][0]},${B} ${L},${B}`}
          fill="url(#ytcinema-area)"
        />
        <polyline points={line} fill="none" stroke={GOLD} strokeWidth={3} />
        {pts.map(([px, py], i) =>
          i <= draw + 0.001 ? (
            <circle key={c.points[i].label} cx={px} cy={py} r={8} fill={GOLD} />
          ) : null,
        )}
      </svg>
      {c.points.map((p, i) => {
        const o = interpolate(draw, [i - 0.2, i + 0.05], [0, 1], clamp);
        return (
          <div
            key={p.label}
            style={{
              position: "absolute",
              left: x(i) - 150,
              width: 300,
              textAlign: "center",
              opacity: o,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: y(p.value) - 78,
                width: 300,
                fontFamily: FONT,
                fontSize: 44,
                fontWeight: 800,
                color: brand.text,
              }}
            >
              {fmt(p.value, d, c.unit)}
            </div>
            <div
              style={{
                position: "absolute",
                top: B + 22,
                width: 300,
                ...caps(24, brand.textDim),
              }}
            >
              {p.label}
            </div>
          </div>
        );
      })}
    </>
  );
};

export const Bars: React.FC<CueProps<"bars">> = ({ c, t }) => {
  const f = useCurrentFrame();
  const B = IMG_BOTTOM - 140;
  const MAX = B - (IMG_TOP + 300);
  const W = 150;
  const gap = 170;
  const total = c.bars.length * W + (c.bars.length - 1) * gap;
  const x0 = 960 - total / 2 + 120;
  const stamp = c.stamp ? slow(f, t(c.stamp.atMs), 24) : 0;
  return (
    <>
      <Heading kicker={c.kicker} title={c.title} />
      <div
        style={{
          position: "absolute",
          left: x0 - 80,
          width: total + 160,
          top: B,
          height: 2,
          background: `${brand.slate}aa`,
        }}
      />
      {c.bars.map((b, i) => {
        const p = slow(f, t(b.atMs), 36);
        const h = (b.overflow ? MAX + 60 : MAX * b.height) * p;
        const col = toneColor(b.tone, GOLD);
        return (
          <div key={b.label}>
            <div
              style={{
                position: "absolute",
                left: x0 + i * (W + gap),
                width: W,
                top: B - h,
                height: h,
                border: `2px solid ${col}`,
                borderBottom: "none",
                background: `linear-gradient(180deg, ${col}${b.overflow ? "00" : "55"}, ${col}10)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x0 + i * (W + gap) - 60,
                width: W + 120,
                top: B - h - 76,
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 52,
                fontWeight: 800,
                color: brand.text,
                opacity: p,
              }}
            >
              {b.value}
            </div>
            <div
              style={{
                position: "absolute",
                left: x0 + i * (W + gap) - 60,
                width: W + 120,
                top: B + 20,
                textAlign: "center",
                ...caps(22, brand.textDim),
                letterSpacing: "0.14em",
                opacity: p,
              }}
            >
              {b.label}
            </div>
          </div>
        );
      })}
      {c.stamp ? (
        <div
          style={{
            position: "absolute",
            right: 1920 - RIGHT,
            top: IMG_TOP + 90,
            padding: "14px 26px",
            border: `2px solid ${toneColor(c.stamp.tone, GOLD)}`,
            ...caps(26, toneColor(c.stamp.tone, GOLD)),
            opacity: stamp,
            transform: `scale(${1.08 - 0.08 * stamp})`,
          }}
        >
          {c.stamp.text}
        </div>
      ) : null}
    </>
  );
};
