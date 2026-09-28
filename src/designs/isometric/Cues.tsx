// "isometric" cues drawn in the design's own language: points as numbered
// isometric steps rising one by one down the left of the island, each with its
// line on a floating white slab; compare as two coin towers built on the
// island, growing to their values, with a gold "VS" block between them. Every
// other cue kind goes to classic MotionTrack (index.tsx).
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
import type { Rel } from "../classic/Infographics";
import { FRONT_BOTTOM, FrontSlab, SLAB, STAGE_TOP, fadeOut } from "./Stage";
import {
  IsoSvg,
  PAL,
  SKY,
  WHITE,
  box,
  camAt,
  disc,
  project,
  slabEdge,
  type Shape,
} from "./World";

type OwnCue = Extract<Cue, { kind: "points" | "compare" }>;
type Points = Extract<Cue, { kind: "points" }>;
type Compare = Extract<Cue, { kind: "compare" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare";

// Talk frames while points are up: the city fades back under the steps.
export const calmAt = (
  reel: Reel | null | undefined,
  fps: number,
  t: number,
) => {
  if (!reel) return 0;
  const at = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? [])
    .filter((c) => c.kind === "points")
    .reduce((w, c) => {
      const a = at(c.fromMs);
      const b = Math.max(a + 13, at(c.toMs) - 8);
      return Math.max(
        w,
        interpolate(t, [a, a + 12, b, b + 12], [0, 1, 1, 0], clamp),
      );
    }, 0);
};

// ------------------------------------------------------------- points

const TILE_X = SAFE.left + 86;
const TILE_S = 64;
const TEXT_LEFT = TILE_X + 96;

const PointsSteps: React.FC<{
  cue: Points;
  rel: Rel;
  dur: number;
  from: number;
}> = ({ cue, rel, dur, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.items.length;
  const first = STAGE_TOP + 170;
  const step = Math.min(118, (FRONT_BOTTOM - 50 - first) / Math.max(1, n - 1));
  const hMax = Math.max(0.2, (step - 48) / (TILE_S * 0.8));
  const starts = cue.items.map((it) => rel(it.atMs));
  const said = starts.filter((s) => frame >= s).length;
  const base = camAt(from + frame);
  const title = pop(frame, fps, 2);
  const tiles = cue.items.map((it, i) => {
    const k = spring({
      frame: frame - starts[i],
      fps,
      config: { damping: 11, stiffness: 150 },
    });
    const h = Math.min(0.3 + 0.22 * i, hMax) * k;
    const c = { ...base, s: TILE_S, ox: TILE_X, oy: first + i * step + 22 };
    const current = i === said - 1;
    return { it, i, k, h, c, current, top: project(c, 0, 0, h) };
  });
  const shapes: Shape[] = tiles
    .filter((t) => t.k > 0.01)
    .map((t) => ({
      depth: t.i,
      marks: box(
        t.c,
        -0.5,
        -0.5,
        0,
        1,
        1,
        t.h,
        t.current ? PAL.gold : PAL.white,
      ),
    }));
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
          ...SLAB,
          position: "absolute",
          top: STAGE_TOP,
          left: SAFE.left,
          maxWidth: SAFE.right - SAFE.left,
          padding: "12px 30px 14px",
          borderLeft: `14px solid ${brand.highlight}`,
          fontSize: 44,
          fontWeight: 900,
          lineHeight: 1.2,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [-30, 0])}px)`,
        }}
      >
        {cue.title}
      </div>
      <IsoSvg shapes={shapes} />
      {tiles.map(({ it, i, k, current, top }) =>
        k > 0.01 ? (
          <div key={it.atMs}>
            <div
              style={{
                position: "absolute",
                left: top[0] - 30,
                width: 60,
                top: top[1] - 22,
                textAlign: "center",
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1.3,
                color: brand.textOnCard,
                transform: "scaleY(0.8)",
                opacity: k,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                ...SLAB,
                boxShadow: slabEdge(8, current ? brand.accent : SKY),
                position: "absolute",
                left: TEXT_LEFT,
                maxWidth: SAFE.right - TEXT_LEFT,
                top: top[1],
                padding: "10px 24px 12px",
                outline: current ? `3px solid ${brand.highlight}` : "none",
                fontSize: 36,
                fontWeight: current ? 900 : 700,
                lineHeight: 1.25,
                color: current ? brand.textOnCard : brand.slate,
                opacity: k,
                transform: `translate(${interpolate(k, [0, 1], [40, 0])}px, -50%)`,
              }}
            >
              {it.text}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
};

// ------------------------------------------------------------- compare

const TOWER_AT = [-1.9, 1.9]; // world x (y is its negative): left and right
const COINS = 11;
const COIN_H = 0.17;
const num = (s: string) =>
  parseFloat(
    s
      .replace(/[^\d,.]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

const CompareTowers: React.FC<{
  cue: Compare;
  rel: Rel;
  dur: number;
  from: number;
}> = ({ cue, rel, dur, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = camAt(from + frame);
  const values = cue.cards.map((k) => num(k.rows[0]?.value ?? ""));
  const max = Math.max(...values.filter(Number.isFinite), 0);
  const vs = pop(frame, fps, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const q = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  const cards = cue.cards.map((card, i) => {
    const start = rel(card.atMs);
    const target =
      max > 0 && Number.isFinite(values[i])
        ? Math.max(3, Math.round((COINS * values[i]) / max))
        : 8;
    const n = Math.round(
      interpolate(frame, [start, start + 24], [0, target], clamp),
    );
    const wx = TOWER_AT[i];
    const [sx] = project(c, wx, -wx, 0);
    const topY = project(c, wx, -wx, n * COIN_H)[1] - 0.72 * c.s * 0.5;
    const hi =
      card.highlightAtMs === undefined
        ? 0
        : interpolate(
            frame,
            [rel(card.highlightAtMs), rel(card.highlightAtMs) + 12],
            [0, 1],
            clamp,
          );
    return { card, i, start, n, wx, sx, topY, hi };
  });
  const shapes: Shape[] = cards.map(({ n, wx, i }) => ({
    depth: i,
    marks: Array.from({ length: n }, (_, j) =>
      disc(
        c,
        wx,
        -wx,
        j * COIN_H,
        0.72,
        COIN_H - 0.03,
        brand.highlight,
        brand.accent,
      ),
    ).flat(),
  }));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <IsoSvg shapes={shapes} />
      {cards.map(({ card, i, start, sx, topY, hi }) => {
        if (frame < start) return null;
        const p = pop(frame, fps, start);
        const rows = card.rows.filter((r) => frame >= rel(r.atMs));
        const last = rows[rows.length - 1];
        const tone = last ? toneColor(last.tone, SKY) : SKY;
        return (
          <div key={card.title} style={{ opacity: p }}>
            <div
              style={{
                ...SLAB,
                position: "absolute",
                top: STAGE_TOP,
                left: sx - 205,
                width: 410,
                padding: "8px 16px 10px",
                textAlign: "center",
                fontSize: 34,
                fontWeight: 800,
                lineHeight: 1.2,
                background: i === 0 ? WHITE : brand.background,
                color: i === 0 ? brand.textOnCard : WHITE,
                boxShadow: slabEdge(8, i === 0 ? SKY : brand.primary),
              }}
            >
              {card.title}
            </div>
            {rows.length ? (
              <div
                style={{
                  ...SLAB,
                  position: "absolute",
                  left: sx - 180,
                  width: 360,
                  bottom: 1920 - (topY - 16),
                  padding: "8px 14px 10px",
                  textAlign: "center",
                  boxShadow: slabEdge(8, tone),
                  transform: `scale(${1 + hi * 0.06})`,
                }}
              >
                {rows.map((r) => (
                  <div key={r.label}>
                    <div
                      style={{
                        fontSize: card.rows.length > 1 ? 44 : 60,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        color: toneColor(r.tone, brand.textOnCard),
                        opacity: pop(frame, fps, rel(r.atMs)),
                      }}
                    >
                      {r.value}
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: brand.slate,
                        lineHeight: 1.2,
                      }}
                    >
                      {r.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 540 - 62,
          width: 124,
          top: 880,
          padding: "6px 0 10px",
          textAlign: "center",
          borderRadius: 18,
          background: brand.highlight,
          boxShadow: slabEdge(10, brand.accent),
          fontSize: 50,
          fontWeight: 900,
          lineHeight: 1.2,
          color: brand.textOnCard,
          opacity: vs,
          transform: `scale(${interpolate(vs, [0, 1], [1.8, 1])})`,
        }}
      >
        VS
      </div>
      {cue.question ? (
        <FrontSlab p={q} dark size={40}>
          <span style={{ color: brand.highlight }}>{cue.question.text}</span>
        </FrontSlab>
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

export const IsoCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
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
              <PointsSteps cue={c} rel={rel} dur={dur} from={from} />
            ) : (
              <CompareTowers cue={c} rel={rel} dur={dur} from={from} />
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
