// "orbit" cues drawn in the design's own language (the two faceless videos
// use most): points as a glowing vertical timeline whose origin is the core
// (docked top-left, Space.tsx DOCK), each item a node that lights up as it is
// said; compare as two planets with orbit arcs and the shrunken core as the
// "VS" node between them. Every other cue kind goes to classic MotionTrack.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { FONT, clamp, pop, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { DOCK, GLASS, SKY, STAGE_BOTTOM, VS } from "./Space";
import { Gauge } from "./Stage";

type OwnCue = Extract<Cue, { kind: "points" | "compare" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare";

const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);

// ------------------------------------------------------------- points

const FIRST_NODE = 760;
const NODE = 30;
const TEXT_LEFT = DOCK.x + 62;

const PointsOrbit: React.FC<{
  cue: CueOf<"points">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.items.length;
  const step = Math.min(
    120,
    (STAGE_BOTTOM - 60 - FIRST_NODE) / Math.max(1, n - 1),
  );
  const ys = cue.items.map((_, i) => FIRST_NODE + i * step);
  const starts = cue.items.map((it) => rel(it.atMs));
  const said = starts.filter((s) => frame >= s).length;
  // The glowing line grows down to the latest node said.
  let lineTo = DOCK.y + DOCK.r;
  starts.forEach((s, i) => {
    if (frame >= s)
      lineTo = interpolate(frame, [s, s + 10], [lineTo, ys[i]], clamp);
  });
  const title = pop(frame, fps, 2);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: TEXT_LEFT,
          right: 1080 - SAFE.right,
          top: DOCK.y - 32,
          fontSize: 46,
          fontWeight: 900,
          lineHeight: 1.2,
          color: brand.highlight,
          textShadow: `0 0 24px rgba(255,185,56,0.45)`,
          opacity: title,
          transform: `translateX(${interpolate(title, [0, 1], [-30, 0])}px)`,
        }}
      >
        {cue.title}
      </div>
      {/* Track (faint, full length) and the lit part. */}
      <div
        style={{
          position: "absolute",
          left: DOCK.x - 2,
          top: DOCK.y + DOCK.r,
          width: 4,
          height: ys[n - 1] - DOCK.y - DOCK.r,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 2,
          opacity: title,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: DOCK.x - 3,
          top: DOCK.y + DOCK.r,
          width: 6,
          height: Math.max(0, lineTo - DOCK.y - DOCK.r),
          background: `linear-gradient(180deg, ${SKY}, ${brand.highlight})`,
          boxShadow: `0 0 18px ${SKY}`,
          borderRadius: 3,
        }}
      />
      {cue.items.map((it, i) => {
        if (frame < starts[i]) return null;
        const p = pop(frame, fps, starts[i]);
        const current = i === said - 1;
        const glow = current
          ? 0.6 + 0.4 * Math.sin((frame - starts[i]) / 6)
          : 0;
        return (
          <div key={it.atMs}>
            <div
              style={{
                position: "absolute",
                left: DOCK.x - NODE / 2,
                top: ys[i] - NODE / 2,
                width: NODE,
                height: NODE,
                borderRadius: "50%",
                background: current ? brand.highlight : SKY,
                boxShadow: `0 0 ${14 + glow * 22}px ${current ? brand.highlight : SKY}`,
                transform: `scale(${p})`,
              }}
            />
            <div
              style={{
                ...GLASS,
                position: "absolute",
                left: TEXT_LEFT,
                maxWidth: SAFE.right - TEXT_LEFT,
                top: ys[i],
                padding: "14px 26px",
                borderRadius: 22,
                borderColor: current
                  ? brand.highlight
                  : "rgba(255,255,255,0.2)",
                fontSize: 38,
                fontWeight: current ? 900 : 700,
                lineHeight: 1.25,
                color: current ? "#ffffff" : brand.textDim,
                opacity: p,
                transform: `translate(${interpolate(p, [0, 1], [40, 0])}px, -50%)`,
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------- compare

const PLANET_R = 142;
const PLANET_X = [300, 780];

const Planet: React.FC<{
  card: CueOf<"compare">["cards"][number];
  cx: number;
  rel: Rel;
}> = ({ card, cx, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = rel(card.atMs);
  if (frame < start) return null;
  const p = spring({
    frame: frame - start,
    fps,
    config: { damping: 14, stiffness: 120 },
  });
  const sweep = interpolate(frame - start, [0, 26], [0, 1], clamp);
  const rows = card.rows.filter((r) => frame >= rel(r.atMs));
  const last = rows[rows.length - 1];
  const tone = last ? toneColor(last.tone, SKY) : SKY;
  const hi =
    card.highlightAtMs === undefined
      ? 0
      : interpolate(
          frame,
          [rel(card.highlightAtMs), rel(card.highlightAtMs) + 12],
          [0, 1],
          clamp,
        );
  const cy = VS.y;
  const valueSize = card.rows.length > 1 ? 46 : 70;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cx - 200,
          width: 400,
          bottom: 1920 - (cy - PLANET_R - 34),
          textAlign: "center",
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.2,
          color: "#ffffff",
          textWrap: "balance",
          opacity: p,
        }}
      >
        {card.title}
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - PLANET_R,
          top: cy - PLANET_R,
          width: 2 * PLANET_R,
          height: 2 * PLANET_R,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, rgba(0,100,168,0.55), rgba(6,19,42,0.92) 70%)`,
          border: `3px solid ${tone}`,
          boxShadow: `0 0 ${30 + hi * 40}px ${tone}, inset 0 0 40px rgba(0,100,168,0.5)`,
          transform: `scale(${p * (1 + hi * 0.05)})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {rows.map((r) => {
          const rp = pop(frame, fps, rel(r.atMs));
          return (
            <div key={r.label} style={{ textAlign: "center", opacity: rp }}>
              <div
                style={{
                  fontSize: valueSize,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: toneColor(r.tone, "#ffffff"),
                  transform: `scale(${interpolate(rp, [0, 1], [1.4, 1])})`,
                }}
              >
                {r.value}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: brand.textDim,
                  maxWidth: 220,
                  lineHeight: 1.2,
                }}
              >
                {r.label}
              </div>
            </div>
          );
        })}
      </div>
      <Gauge
        cx={cx}
        cy={cy}
        R={PLANET_R + 22}
        fill={sweep}
        t={1}
        width={5}
        color={tone}
      />
      {/* A moon on the planet's orbit, never still. */}
      <div
        style={{
          position: "absolute",
          left: cx + (PLANET_R + 22) * Math.cos(frame / 40 + cx) - 7,
          top: cy + (PLANET_R + 22) * Math.sin(frame / 40 + cx) - 7,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: `0 0 14px ${tone}`,
          opacity: sweep,
        }}
      />
    </>
  );
};

const CompareOrbit: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vs = pop(frame, fps, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const q = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      {cue.cards.map((card, i) => (
        <Planet key={card.title} card={card} cx={PLANET_X[i]} rel={rel} />
      ))}
      <div
        style={{
          position: "absolute",
          left: VS.x - 60,
          width: 120,
          top: VS.y - 30,
          textAlign: "center",
          fontSize: 44,
          fontWeight: 900,
          lineHeight: 1.3,
          color: brand.highlight,
          opacity: vs,
          transform: `scale(${interpolate(vs, [0, 1], [2, 1])})`,
          textShadow: `0 0 20px rgba(255,185,56,0.7)`,
        }}
      >
        VS
      </div>
      {cue.question ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: VS.y + PLANET_R + 50,
            display: "flex",
            justifyContent: "center",
            opacity: q,
            transform: `translateY(${interpolate(q, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              ...GLASS,
              maxWidth: 900,
              padding: "14px 32px",
              borderRadius: 999,
              borderColor: brand.highlight,
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.25,
              color: brand.highlight,
              textAlign: "center",
            }}
          >
            {cue.question.text}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------- track

// The same sounds the classic MotionTrack gives these kinds.
const sfxOf = (c: OwnCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const OrbitCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(isOwnCue);
  return (
    <>
      {cues.map((c) => {
        const from = outFrame(c.fromMs);
        const dur = Math.max(1, outFrame(c.toMs) - from);
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            {c.kind === "points" ? (
              <PointsOrbit cue={c} rel={rel} dur={dur} />
            ) : (
              <CompareOrbit cue={c} rel={rel} dur={dur} />
            )}
          </Sequence>
        );
      })}
      {cues.flatMap(sfxOf).map((s) => (
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
