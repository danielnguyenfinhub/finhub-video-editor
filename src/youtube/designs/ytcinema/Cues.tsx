// ytcinema's cues, drawn in the scope frame (y 140-940): points as a numbered
// list on the left with the current item large on the right; compare as two
// tall columns split by a beam of light. change/trend/bars are in Numbers.tsx.
import type React from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { outFrameOf, type Cue, type Reel } from "../../../mortgage/schema";
import { FONT, toneColor } from "../../../mortgage/style";
import { Bars, Change, Trend } from "./Numbers";
import {
  GOLD,
  IMG_BOTTOM,
  IMG_TOP,
  LEFT,
  RIGHT,
  Rule,
  caps,
  slow,
  tail,
} from "./Stage";

export const POINTS_WORD = "ý chính";
export const DRAWN = ["points", "compare", "change", "trend", "bars"];
export type CueProps<K extends Cue["kind"]> = {
  c: Extract<Cue, { kind: K }>;
  t: (ms: number) => number; // source ms -> frame inside this cue
  dur: number;
};

const Points: React.FC<CueProps<"points">> = ({ c, t }) => {
  const f = useCurrentFrame();
  const cur = c.items.filter((it) => f >= t(it.atMs)).length - 1;
  const p = cur >= 0 ? slow(f, t(c.items[cur].atMs), 22) : 1;
  const big = (i: number, o: number) => (
    <div
      key={i}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        opacity: o,
        transform: `translateY(calc(-50% + ${(1 - o) * 24}px))`,
      }}
    >
      <div style={caps(26)}>
        {i < 0
          ? `${c.items.length} ${POINTS_WORD}`
          : `${String(i + 1).padStart(2, "0")} / ${String(c.items.length).padStart(2, "0")}`}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: FONT,
          fontSize: i < 0 ? 84 : 76,
          fontWeight: 800,
          lineHeight: 1.22,
          color: brand.text,
        }}
      >
        {i < 0 ? c.title : c.items[i].text}
      </div>
    </div>
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: IMG_TOP + 70,
          width: 640,
        }}
      >
        <div style={caps(24)}>{c.title}</div>
        <Rule
          p={slow(f, 4, 30)}
          width={220}
          align="left"
          style={{ margin: "16px 0 28px" }}
        />
        {c.items.map((it, i) => {
          const o = slow(f, t(it.atMs), 16);
          const now = i === cur;
          return (
            <div
              key={it.atMs}
              style={{
                display: "flex",
                gap: 24,
                alignItems: "baseline",
                padding: "16px 0",
                borderTop: `1px solid ${brand.slate}55`,
                opacity: o * (now ? 1 : 0.55),
              }}
            >
              <span style={{ ...caps(24), letterSpacing: "0.1em", width: 44 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 34,
                  fontWeight: now ? 800 : 600,
                  color: now ? brand.text : brand.textDim,
                  lineHeight: 1.3,
                }}
              >
                {it.text}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 800,
          top: IMG_TOP + 90,
          width: 1,
          height: (IMG_BOTTOM - IMG_TOP - 200) * slow(f, 0, 40),
          background: `linear-gradient(180deg, ${GOLD}00, ${GOLD}aa, ${GOLD}00)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 880,
          width: RIGHT - 880,
          top: IMG_TOP + 60,
          bottom: 1080 - IMG_BOTTOM + 60,
        }}
      >
        {/* One after the other, never both: the old line clears in the first
            half of the change, the new one arrives in the second. */}
        {cur >= 0 && p < 0.5 ? big(cur - 1, 1 - p * 2) : null}
        {big(cur, cur >= 0 ? Math.max(0, p * 2 - 1) : p)}
      </div>
    </>
  );
};

const Compare: React.FC<CueProps<"compare">> = ({ c, t }) => {
  const f = useCurrentFrame();
  const vs =
    c.vsAtMs !== undefined
      ? slow(f, t(c.vsAtMs), 30)
      : slow(f, t(c.cards[1].atMs), 30);
  const beamTop = IMG_TOP + 60;
  const beamH = IMG_BOTTOM - IMG_TOP - 170;
  const col = (k: 0 | 1) => {
    const card = c.cards[k];
    const o = slow(f, t(card.atMs), 24);
    const hi =
      card.highlightAtMs !== undefined ? slow(f, t(card.highlightAtMs), 24) : 0;
    return (
      <div
        key={k}
        style={{
          position: "absolute",
          left: k === 0 ? 170 : 1060,
          width: 690,
          top: beamTop + 20,
          height: beamH - 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: o,
          transform: `translateY(${(1 - o) * 20}px)`,
          textAlign: "center",
        }}
      >
        <div style={caps(28, k === 0 ? brand.textDim : GOLD)}>{card.title}</div>
        <Rule p={o} width={260} style={{ margin: "20px 0 10px" }} />
        {card.rows.map((r) => {
          const ro = slow(f, t(r.atMs), 22);
          return (
            <div key={r.label} style={{ marginTop: 26, opacity: ro }}>
              <div style={caps(24, brand.textDim)}>{r.label}</div>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: card.rows.length > 1 ? 110 : 168,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: toneColor(r.tone, brand.text),
                  transform: `scale(${0.97 + 0.03 * ro})`,
                  textShadow: hi ? `0 0 ${40 * hi}px ${GOLD}66` : undefined,
                }}
              >
                {r.value}
              </div>
            </div>
          );
        })}
        <Rule p={hi} width={200} style={{ marginTop: 18 }} />
      </div>
    );
  };
  const q = c.question ? slow(f, t(c.question.atMs), 24) : 0;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 960 - 90,
          top: beamTop,
          width: 180,
          height: beamH,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${GOLD}40, ${GOLD}00 70%)`,
          opacity: 0.35 + 0.65 * vs,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 959,
          top: beamTop,
          width: 2,
          height: beamH * slow(f, 0, 40),
          background: `linear-gradient(180deg, ${GOLD}00, ${brand.text}, ${GOLD}00)`,
          opacity: 0.4 + 0.6 * vs,
        }}
      />
      {col(0)}
      {col(1)}
      {c.question ? (
        <div
          style={{
            position: "absolute",
            left: LEFT,
            width: RIGHT - LEFT,
            top: IMG_BOTTOM - 160,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 800,
            color: GOLD,
            opacity: q,
            transform: `translateY(${(1 - q) * 14}px)`,
          }}
        >
          {c.question.text}
        </div>
      ) : null}
    </>
  );
};

const draw = (c: Cue, t: (ms: number) => number, dur: number) => {
  switch (c.kind) {
    case "points":
      return <Points c={c} t={t} dur={dur} />;
    case "compare":
      return <Compare c={c} t={t} dur={dur} />;
    case "change":
      return <Change c={c} t={t} dur={dur} />;
    case "trend":
      return <Trend c={c} t={t} dur={dur} />;
    case "bars":
      return <Bars c={c} t={t} dur={dur} />;
    default:
      return null;
  }
};

// Each drawn cue in its own Sequence, faded in slowly and out over 15 frames.
const Frame: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: Math.min(slow(f, 0, 18), tail(f, dur, 15)),
      }}
    >
      {children}
    </div>
  );
};

export const CinemaCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.cues ?? [])
        .filter((c) => DRAWN.includes(c.kind))
        .map((c) => {
          const from = at(c.fromMs);
          const dur = Math.max(1, at(c.toMs) - from);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={dur}
              layout="none"
            >
              <Frame dur={dur}>{draw(c, (ms) => at(ms) - from, dur)}</Frame>
            </Sequence>
          );
        })}
    </>
  );
};
