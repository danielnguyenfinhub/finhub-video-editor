// The cue kinds the slider draws itself: `compare` and `change` as a genuine
// BEFORE → AFTER reveal (the divider waits far right, all BEFORE, then sweeps
// left at the reveal and settles in the middle: each side its tag, title, a
// huge value and its rows). Points.tsx draws `points`. Each returns its
// layers; the stage (Scenes.tsx) places them in the panes and moves the
// divider.
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring } from "remotion";
import type { Cue } from "../../mortgage/schema";
import { DIM, FONT, clamp, pop, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { counted, differenceOf, parseValue, sameUnit } from "./numbers";
import {
  AFTER_TAG,
  BEFORE_TAG,
  GOLD,
  INNER,
  MID,
  MUTED,
  SIDE_W,
  SKY,
  Tag,
  W,
} from "./Slider";

export type Layers = {
  before?: React.ReactNode;
  after?: React.ReactNode;
  over?: React.ReactNode;
};
export type Beat = { lf: number; fps: number; rel: Rel; x: number };

export const RIGHT_PARK = W - 44;
// The AFTER side stays where it settles: the sweep uncovers it; the BEFORE
// side glides with the divider, centred in what is left of it.
const AFTER_X = (MID + W) / 2;
const ease = (x: number) => 1 - (1 - x) ** 3;
const COUNT = 20;

// Frames into the scene at which the divider sweeps; never before it is up.
export const revealOf = (
  cue: Extract<Cue, { kind: "compare" | "change" }>,
  rel: Rel,
): number =>
  Math.max(
    14,
    cue.kind === "change"
      ? rel(cue.swapAtMs)
      : rel(cue.cards[1].highlightAtMs ?? cue.cards[1].atMs),
  );

// Far right (all BEFORE) until the reveal, then a sweep with a small
// overshoot that settles in the middle.
export const sweepX = (lf: number, reveal: number, fps: number): number => {
  if (lf < reveal) return RIGHT_PARK;
  const s = spring({
    frame: lf - reveal,
    fps,
    config: { damping: 11, stiffness: 85, mass: 0.9 },
  });
  return RIGHT_PARK + (MID - RIGHT_PARK) * s;
};

// A side's column, centred on `cx` (stage-local).
const Column: React.FC<{
  cx: number;
  top: number;
  children: React.ReactNode;
}> = ({ cx, top, children }) => (
  <div
    style={{
      position: "absolute",
      left: cx - SIDE_W / 2,
      top,
      width: SIDE_W,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      fontFamily: FONT,
    }}
  >
    {children}
  </div>
);

// The stated or computed difference, or a compare's question: a bar across
// the bottom of the stage, over the divider.
export const BottomBar: React.FC<{ text: string; p: number }> = ({
  text,
  p,
}) => (
  <div
    style={{
      position: "absolute",
      left: 60,
      right: 60,
      bottom: 22,
      display: "flex",
      justifyContent: "center",
      opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
    }}
  >
    <div
      style={{
        padding: "10px 28px",
        borderRadius: 999,
        background: "rgba(6,19,42,0.94)",
        border: `3px solid ${GOLD}`,
        boxShadow: `0 0 28px rgba(255,185,56,0.45)`,
        color: "#ffffff",
        fontFamily: FONT,
        fontWeight: 900,
        whiteSpace: "nowrap",
        lineHeight: 1.3,
        fontSize: fitTextOnNLines({
          text,
          maxLines: 1,
          maxBoxWidth: W - 200,
          fontFamily: FONT,
          fontWeight: 900,
          maxFontSize: 42,
        }).fontSize,
      }}
    >
      {text}
    </div>
  </div>
);

const valueSize = (texts: string[], max: number, room = SIDE_W - 8) =>
  Math.min(
    max,
    ...texts.map(
      (s) =>
        fitText({
          text: s,
          withinWidth: room,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize,
    ),
  );

// ------------------------------------------------------------- compare

type Card = CueOf<"compare">["cards"][number];

const CardSide: React.FC<{
  card: Card;
  other: Card;
  after: boolean;
  b: Beat;
  cx: number;
  sizes: number[];
  glow: number;
}> = ({ card, other, after, b, cx, sizes, glow }) => {
  const { lf, fps, rel } = b;
  const at = rel(card.atMs);
  const tp = lf >= at ? pop(lf, fps, at) : 0;
  const title = fitTextOnNLines({
    text: card.title,
    maxLines: 2,
    maxBoxWidth: SIDE_W,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: 40,
  }).fontSize;
  return (
    <Column cx={cx} top={INNER + 4}>
      <Tag text={after ? AFTER_TAG : BEFORE_TAG} after={after} />
      <div
        style={{
          marginTop: 14,
          fontSize: title,
          fontWeight: 900,
          lineHeight: 1.2,
          color: after ? "#ffffff" : MUTED,
          opacity: tp,
          transform: `translateY(${interpolate(tp, [0, 1], [16, 0])}px)`,
        }}
      >
        {card.title}
      </div>
      {card.rows.slice(0, 3).map((r, i) => {
        const ra = rel(r.atMs);
        const said = lf >= ra;
        const k = interpolate(lf, [ra, ra + COUNT], [0, 1], {
          ...clamp,
          easing: ease,
        });
        // AFTER climbs from BEFORE's value when both are in one unit.
        const from = after ? other.rows[i]?.value : undefined;
        const pair = from ? sameUnit(from, r.value) : null;
        const start = pair ? pair[0].value : 0;
        const size = sizes[i] ?? sizes[sizes.length - 1];
        const color = after ? toneColor(r.tone, GOLD) : MUTED;
        return (
          <div key={r.label} style={{ marginTop: i === 0 ? 18 : 10 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.3,
                color: after ? DIM : "rgba(255,255,255,0.55)",
                opacity: lf >= at ? 1 : 0,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontSize: size,
                fontWeight: 900,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
                color: after && k < 1 ? "#ffffff" : color,
                opacity: said ? Math.min(1, k * 3) : 0,
                textShadow: after
                  ? `0 0 ${18 + 30 * glow}px rgba(255,185,56,${0.35 + 0.4 * glow})`
                  : "none",
                transform: `scale(${1 + 0.06 * glow * (i === 0 ? 1 : 0)})`,
              }}
            >
              {said ? counted(r.value, k, start) : r.value}
            </div>
          </div>
        );
      })}
    </Column>
  );
};

export const compareLayers = (cue: CueOf<"compare">, b: Beat): Layers => {
  const { lf, fps, rel, x } = b;
  const reveal = revealOf(cue, rel);
  const [c0, c1] = cue.cards;
  const rows = Math.max(c0.rows.length, c1.rows.length);
  const sizes = Array.from({ length: Math.min(3, rows) }, (_, i) =>
    valueSize(
      [c0.rows[i]?.value, c1.rows[i]?.value].filter(
        (v): v is string => typeof v === "string",
      ),
      i === 0 ? (rows > 1 ? 92 : 108) : 54,
    ),
  );
  const hl = c1.highlightAtMs !== undefined ? rel(c1.highlightAtMs) : reveal;
  const glow =
    lf >= hl ? interpolate(lf, [hl, hl + 6, hl + 26], [0, 1, 0.45], clamp) : 0;
  // The reel states the difference (the question), or both first rows are
  // one measure in one unit: only then a difference bar.
  const q = cue.question;
  const r0 = c0.rows[0];
  const r1 = c1.rows[0];
  const diff =
    !q && r0 && r1 && r0.label === r1.label
      ? differenceOf(r0.value, r1.value)
      : null;
  const barAt = q ? rel(q.atMs) : Math.max(reveal, r1 ? rel(r1.atMs) : 0) + 24;
  const barText = q?.text ?? diff;
  return {
    before: (
      <CardSide
        card={c0}
        other={c1}
        after={false}
        b={b}
        cx={x / 2}
        sizes={sizes}
        glow={0}
      />
    ),
    after:
      lf >= reveal ? (
        <CardSide
          card={c1}
          other={c0}
          after
          b={b}
          cx={AFTER_X}
          sizes={sizes}
          glow={glow}
        />
      ) : null,
    over:
      barText && lf >= barAt ? (
        <BottomBar text={barText} p={pop(lf, fps, barAt)} />
      ) : null,
  };
};

// ------------------------------------------------------------- change

const Arrow: React.FC<{ dir: "up" | "down"; color: string; size: number }> = ({
  dir,
  color,
  size,
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flex: "none" }}>
    <polygon
      points={dir === "down" ? "6,14 58,14 32,56" : "6,50 58,50 32,8"}
      fill={color}
    />
  </svg>
);

export const changeLayers = (cue: CueOf<"change">, b: Beat): Layers => {
  const { lf, fps, x } = b;
  const reveal = revealOf(cue, b.rel);
  const color = toneColor(cue.tone ?? "neutral", GOLD);
  const size = valueSize([cue.from, cue.to], 150);
  const k = interpolate(lf, [reveal, reveal + COUNT], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const pair = sameUnit(cue.from, cue.to);
  const fromP = parseValue(cue.from);
  const diff = differenceOf(cue.from, cue.to, cue.direction);
  const head = pop(lf, fps, 2);
  const side = (after: boolean, cx: number) => (
    <Column cx={cx} top={INNER + 112}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Tag text={after ? AFTER_TAG : BEFORE_TAG} after={after} />
        {after && cue.direction ? (
          <Arrow dir={cue.direction} color={color} size={34} />
        ) : null}
      </div>
      <div
        style={{
          marginTop: 22,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          color: after ? (k < 1 ? "#ffffff" : color) : MUTED,
          textShadow: after ? `0 0 34px rgba(255,185,56,0.5)` : "none",
          opacity: after ? 1 : pop(lf, fps, 4),
        }}
      >
        {after
          ? pair && fromP
            ? counted(cue.to, k, fromP.value)
            : cue.to
          : cue.from}
      </div>
    </Column>
  );
  return {
    before: side(false, x / 2),
    after: lf >= reveal ? side(true, AFTER_X) : null,
    over: (
      <>
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: INNER,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            fontFamily: FONT,
            opacity: head,
            transform: `translateY(${interpolate(head, [0, 1], [-16, 0])}px)`,
          }}
        >
          <div
            style={{
              padding: "8px 26px",
              borderRadius: 18,
              background: "rgba(6,19,42,0.82)",
              maxWidth: W - 80,
            }}
          >
            {cue.kicker ? (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 5,
                  color: SKY,
                  lineHeight: 1.3,
                }}
              >
                {cue.kicker}
              </div>
            ) : null}
            <div
              style={{
                fontSize: fitTextOnNLines({
                  text: cue.label,
                  maxLines: 1,
                  maxBoxWidth: W - 140,
                  fontFamily: FONT,
                  fontWeight: 900,
                  maxFontSize: 38,
                }).fontSize,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
              }}
            >
              {cue.label}
            </div>
          </div>
        </div>
        {diff && lf >= reveal + COUNT ? (
          <BottomBar text={diff} p={pop(lf, fps, reveal + COUNT)} />
        ) : null}
      </>
    ),
  };
};
