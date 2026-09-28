// "pulse" cues on the monitor. `change`: the line runs flat at the old
// level (dashed guide, value label), and at swapAtMs steps to the new level
// in the data's direction, a bright head at its tip, the gap between the two
// guides shaded. `trend`: the real points drawn as the line, every value
// printed, the axis spanning the data. Every other cue kind goes to classic
// MotionTrack, mounted only while that cue is up (its film vignette would
// otherwise dim the monitor for the whole video).
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, enter, pop, toneColor } from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import type { CueOf, Rel } from "../classic/Infographics";
import { Header } from "./Beats";
import type { Plan } from "./Plan";
import {
  DataLine,
  FOOT_TOP,
  GOLD,
  Guide,
  HEADER,
  HeadDot,
  MID,
  PLOT,
  SKY,
  Svg,
  clipTo,
  ease,
  fadeOut,
  numberOf,
  type Pt,
} from "./Scope";

// MotionTrack panels sit at top 110 + offset: start them at the header.
const PANEL_OFFSET = HEADER.top - 110;

// ------------------------------------------------------------- change

const HI = PLOT.top + 140;
const LO = PLOT.bottom - 150;
const X_SWAP = PLOT.left + 0.52 * (PLOT.right - PLOT.left);
const X_END = PLOT.right - 30;
const MIN_BEFORE = 24; // the old value is readable before the step

const ChangeLine: React.FC<{
  cue: CueOf<"change">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = numberOf(cue.from);
  const b = numberOf(cue.to);
  const dir =
    cue.direction ??
    (a !== null && b !== null && a !== b ? (b > a ? "up" : "down") : undefined);
  const yFrom = dir === "up" ? LO : dir === "down" ? HI : MID;
  const yTo = dir === "up" ? HI : dir === "down" ? LO : MID;
  const color = toneColor(cue.tone ?? "neutral", GOLD);
  const swap = Math.max(rel(cue.swapAtMs), MIN_BEFORE);
  const arrive = Math.min(30, swap - 2);
  const x1 = interpolate(frame, [0, arrive], [PLOT.left, X_SWAP], {
    ...clamp,
    easing: ease,
  });
  const k = interpolate(frame, [swap, swap + 5], [0, 1], clamp);
  const yNow = yFrom + (yTo - yFrom) * k;
  const x3 = interpolate(frame, [swap + 5, swap + 32], [X_SWAP, X_END], {
    ...clamp,
    easing: ease,
  });
  const before = `M ${PLOT.left} ${yFrom} L ${x1} ${yFrom}`;
  const after = `M ${X_SWAP} ${yFrom} L ${X_SWAP} ${yNow}${k >= 1 ? ` L ${x3} ${yTo}` : ""}`;
  const head: Pt =
    frame < swap ? [x1, yFrom] : k < 1 ? [X_SWAP, yNow] : [x3, yTo];
  const p0 = enter(frame, fps, 2);
  const p1 = pop(frame, fps, swap);
  const outside = (y: number, other: number, up: boolean) =>
    up || (y === other && y === MID)
      ? { bottom: 1920 - (y - 16) }
      : { top: y + 16 };
  // The old value sits on the far side from the new one, and vice versa.
  const fromUp = dir === "down" || dir === undefined;
  const toUp = dir === "up";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <Header kicker={cue.kicker} text={cue.label} opacity={p0} />
      <Svg>
        <defs>
          <linearGradient id="pulse-gap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0.08} />
          </linearGradient>
        </defs>
        {frame >= swap && yTo !== yFrom ? (
          <rect
            x={X_SWAP}
            width={Math.max(0, head[0] - X_SWAP)}
            y={Math.min(yFrom, yNow)}
            height={Math.abs(yNow - yFrom)}
            fill="url(#pulse-gap)"
          />
        ) : null}
        <Guide y={yFrom} opacity={p0} />
        {frame >= swap ? <Guide y={yTo} color={color} opacity={p1} /> : null}
        <DataLine d={before} />
        {frame >= swap ? <DataLine d={after} color={color} /> : null}
        <HeadDot at={head} t={frame} color={color} />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: PLOT.left + 18,
          ...outside(yFrom, yTo, fromUp),
          fontSize: 54,
          fontWeight: 800,
          lineHeight: 1.1,
          color: frame >= swap ? brand.textDim : "#ffffff",
          opacity: p0 * (frame >= swap ? 0.85 : 1),
        }}
      >
        {cue.from}
      </div>
      {frame >= swap ? (
        <div
          style={{
            position: "absolute",
            right: 1080 - PLOT.right,
            ...outside(yTo, yFrom, toUp),
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 104,
            fontWeight: 900,
            lineHeight: 1.05,
            color,
            textShadow: `0 0 34px ${color}`,
            opacity: p1,
            transform: `scale(${interpolate(p1, [0, 1], [1.5, 1])})`,
            transformOrigin: "100% 50%",
          }}
        >
          {dir ? (
            <svg width={52} height={52} viewBox="0 0 64 64">
              <polygon
                points={dir === "down" ? "4,10 60,10 32,58" : "4,54 60,54 32,6"}
                fill={color}
              />
            </svg>
          ) : null}
          {cue.to}
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------- trend

const TrendLine: React.FC<{ cue: CueOf<"trend">; dur: number }> = ({
  cue,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const values = cue.points.map((p) => p.value);
  const decimals =
    cue.decimals ?? (values.every((v) => Number.isInteger(v)) ? 0 : 2);
  const fmt = (v: number) =>
    `${v.toLocaleString("vi-VN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${cue.unit ?? ""}`;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const top = PLOT.top + 110;
  const bottom = PLOT.bottom - 80;
  const y = (v: number) =>
    hi === lo ? MID : bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const n = values.length;
  const x0 = PLOT.left + 80;
  const x1 = PLOT.right - 60;
  const xs = values.map((_, i) => x0 + (i * (x1 - x0)) / (n - 1));
  const pts: Pt[] = values.map((v, i) => [xs[i], y(v)]);
  const drawn = Math.max(40, 14 * n);
  const headX = interpolate(frame, [6, 6 + drawn], [PLOT.left, x1], clamp);
  const { d, head } = clipTo([[PLOT.left, pts[0][1]], ...pts], headX);
  const p0 = enter(frame, fps, 2);
  const size = n > 5 ? 30 : 38;
  // Above a peak, below a dip, so no label sits on its own line.
  const above = (i: number) => {
    const nb = [values[i - 1], values[i + 1]].filter(
      (v): v is number => v !== undefined,
    );
    return values[i] >= nb.reduce((s, v) => s + v, 0) / nb.length;
  };
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <Header kicker={cue.kicker} text={cue.title} opacity={p0} />
      <Svg>
        {hi !== lo ? (
          <>
            <Guide y={y(hi)} opacity={0.5 * p0} />
            <Guide y={y(lo)} opacity={0.5 * p0} />
          </>
        ) : null}
        <DataLine d={d} />
        {pts.map(([px, py], i) =>
          headX >= px ? (
            <circle
              key={cue.points[i].label}
              cx={px}
              cy={py}
              r={
                9 *
                pop(
                  frame,
                  fps,
                  6 + (drawn * (px - PLOT.left)) / (x1 - PLOT.left),
                )
              }
              fill={i === n - 1 ? GOLD : "#ffffff"}
              stroke={GOLD}
              strokeWidth={3}
            />
          ) : null,
        )}
        <HeadDot at={headX >= x1 ? pts[n - 1] : head} t={frame} every={36} />
      </Svg>
      {/* The axis spans the data: its low and high, at their levels. */}
      {(hi !== lo ? [hi, lo] : [hi]).map((v) => (
        <div
          key={`axis${v}`}
          style={{
            position: "absolute",
            right: 1080 - (PLOT.left - 18),
            top: y(v) - 18,
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.3,
            color: SKY,
            whiteSpace: "nowrap",
            opacity: p0,
          }}
        >
          {fmt(v)}
        </div>
      ))}
      {pts.map(([px, py], i) => {
        const at = 6 + (drawn * (px - PLOT.left)) / (x1 - PLOT.left);
        const p = pop(frame, fps, at);
        const last = i === n - 1;
        const up = above(i);
        return frame >= at ? (
          <div key={`v${cue.points[i].label}`}>
            <div
              style={{
                position: "absolute",
                left: px - 100,
                width: 200,
                textAlign: "center",
                ...(up ? { bottom: 1920 - (py - 20) } : { top: py + 20 }),
                fontSize: last ? size + 10 : size,
                fontWeight: 900,
                lineHeight: 1.1,
                color: last ? GOLD : "#ffffff",
                textShadow: "0 2px 12px rgba(6,19,42,0.9)",
                opacity: p,
                transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
              }}
            >
              {fmt(values[i])}
            </div>
          </div>
        ) : null;
      })}
      {pts.map(([px], i) => (
        <div
          key={`x${cue.points[i].label}`}
          style={{
            position: "absolute",
            left: px - 80,
            width: 160,
            top: FOOT_TOP,
            textAlign: "center",
            fontSize: 30,
            fontWeight: 700,
            color: brand.textDim,
            opacity: p0,
          }}
        >
          {cue.points[i].label}
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------- track

export const PulseCueTrack: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const sfx = [
    // MotionTrack plays these when mounted whole; here it never is.
    ...(reel.edit.chapters ?? []).map((c) => ({
      atMs: c.atMs - 250,
      file: "whoosh",
      volume: 0.35,
    })),
    ...(reel.edit.stats ?? []).map((s) => ({
      atMs: s.atMs,
      file: "ding",
      volume: 0.22,
    })),
    ...plan.cues.flatMap(({ cue }) =>
      cue.kind === "change"
        ? [{ atMs: cue.swapAtMs, file: "ding", volume: 0.25 }]
        : [],
    ),
  ];
  return (
    <>
      {plan.cues.map(({ cue, from, frames, own }) => {
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${cue.kind}${cue.fromMs}`}
            from={from}
            durationInFrames={frames}
            layout="none"
          >
            {cue.kind === "change" ? (
              <ChangeLine cue={cue} rel={rel} dur={frames} />
            ) : cue.kind === "trend" ? (
              <TrendLine cue={cue} dur={frames} />
            ) : own ? null : (
              // Classic panel, mounted only for this cue; the inner Sequence
              // gives it the talk timeline back.
              <Sequence from={-from} layout="none">
                <MotionTrack
                  reel={{
                    ...reel,
                    edit: {
                      ...reel.edit,
                      cues: [cue],
                      chapters: [],
                      stats: [],
                    },
                  }}
                  panelOffset={PANEL_OFFSET}
                  numbers={{ change: "swap", trendZoom: 0.84 }}
                  leak={false}
                />
              </Sequence>
            )}
          </Sequence>
        );
      })}
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, outFrame(s.atMs))}
          durationInFrames={fps * 3}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${s.file}.wav`)}
            volume={() => s.volume}
          />
        </Sequence>
      ))}
    </>
  );
};
