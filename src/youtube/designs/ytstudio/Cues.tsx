// The five common cue kinds, drawn on the wall screen's picture area (below
// its header band). Frame 0 = the cue's start; `beat(ms)` = a source-ms beat
// on that clock. Lists read top-down in spoken order; `change` shows `from`
// until swapAtMs, `to` after; red/green only from a cue's own tone.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp, enter, pop, toneColor } from "../../../mortgage/style";
import type { DrawnCue } from "./Plan";
import { Bars, Trend } from "./Charts";
import { SCREEN, SCREEN_HEADER, STUDIO_COPY, tint } from "./tokens";

const PAD = 48;
export const PIC = {
  w: SCREEN.w - PAD * 2,
  h: SCREEN.h - SCREEN_HEADER - 30,
};
export type Beat = (ms: number) => number;
export type P<K extends DrawnCue["kind"]> = {
  cue: Extract<DrawnCue, { kind: K }>;
  beat: Beat;
};

export const Area: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: PAD,
      top: SCREEN_HEADER + 6,
      width: PIC.w,
      height: PIC.h,
      fontFamily: FONT,
      color: brand.text,
      display: "flex",
      flexDirection: "column",
    }}
  >
    {children}
  </div>
);

export const Title: React.FC<{ kicker?: string; text: string }> = ({
  kicker,
  text,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
      {kicker ? (
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 4,
            color: brand.highlight,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.2 }}>
        {text}
      </div>
    </div>
  );
};

const Points: React.FC<P<"points">> = ({ cue, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = cue.items.filter((it) => frame >= beat(it.atMs));
  const current = shown.length - 1;
  return (
    <Area>
      <Title text={cue.title} />
      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexDirection: "column",
          gap: cue.items.length > 4 ? 10 : 16,
        }}
      >
        {cue.items.map((it, i) => {
          const p = enter(frame, fps, beat(it.atMs));
          const on = i === current;
          return (
            <div
              key={it.atMs}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "10px 22px",
                borderRadius: 14,
                background: on
                  ? tint(brand.highlight, 0.14)
                  : tint(brand.navy, 0.45),
                borderLeft: `6px solid ${on ? brand.highlight : tint(brand.textDim, 0.3)}`,
                opacity: frame < beat(it.atMs) ? 0 : p,
                transform: `translateX(${(1 - p) * 40}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                  color: on ? brand.highlight : brand.textDim,
                  minWidth: 44,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: on ? brand.text : brand.textDim,
                  lineHeight: 1.2,
                }}
              >
                {it.text}
              </span>
            </div>
          );
        })}
      </div>
    </Area>
  );
};

const Compare: React.FC<P<"compare">> = ({ cue, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vs = cue.vsAtMs === undefined ? 0 : beat(cue.vsAtMs);
  const card = (c: (typeof cue.cards)[number], label: string) => {
    const p = enter(frame, fps, beat(c.atMs));
    const lit = c.highlightAtMs !== undefined && frame >= beat(c.highlightAtMs);
    return (
      <div
        style={{
          flex: 1,
          padding: "22px 28px",
          borderRadius: 20,
          background: tint(brand.navy, 0.6),
          border: `3px solid ${lit ? brand.highlight : tint(brand.textDim, 0.25)}`,
          boxShadow: lit ? `0 0 34px ${tint(brand.highlight, 0.35)}` : "none",
          opacity: frame < beat(c.atMs) ? 0 : p,
          transform: `translateY(${(1 - p) * 30}px)`,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 4,
            color: brand.highlight,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.2 }}>
          {c.title}
        </div>
        {c.rows.map((r) => {
          const q = pop(frame, fps, beat(r.atMs));
          return (
            <div
              key={r.atMs + r.label}
              style={{
                marginTop: 18,
                opacity: frame < beat(r.atMs) ? 0 : 1,
              }}
            >
              <div
                style={{ fontSize: 26, fontWeight: 600, color: brand.textDim }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: 84,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: toneColor(r.tone, brand.text),
                  transform: `scale(${0.85 + 0.15 * q})`,
                  transformOrigin: "left center",
                }}
              >
                {r.value}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const v = pop(frame, fps, vs);
  const qa = cue.question ? beat(cue.question.atMs) : Infinity;
  const qp = enter(frame, fps, qa);
  return (
    <Area>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 70,
          position: "relative",
        }}
      >
        {card(cue.cards[0], STUDIO_COPY.before)}
        {card(cue.cards[1], STUDIO_COPY.after)}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 76,
            height: 76,
            marginLeft: -38,
            marginTop: -38,
            borderRadius: 38,
            background: brand.highlight,
            color: brand.navy,
            fontSize: 28,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: frame < vs ? 0 : 1,
            transform: `scale(${v})`,
          }}
        >
          {STUDIO_COPY.vs}
        </div>
      </div>
      {cue.question ? (
        <div
          style={{
            marginTop: 26,
            alignSelf: "center",
            padding: "12px 34px",
            borderRadius: 999,
            background: tint(brand.highlight, 0.16),
            border: `2px solid ${brand.highlight}`,
            fontSize: 36,
            fontWeight: 900,
            color: brand.highlight,
            opacity: frame < qa ? 0 : qp,
            transform: `translateY(${(1 - qp) * 20}px)`,
          }}
        >
          {cue.question.text}
        </div>
      ) : null}
    </Area>
  );
};

const Change: React.FC<P<"change">> = ({ cue, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swap = beat(cue.swapAtMs);
  const s = pop(frame, fps, swap);
  const after = frame >= swap;
  const col = cue.tone ? toneColor(cue.tone) : brand.highlight;
  const arrow =
    cue.direction === "down" ? "▼" : cue.direction === "up" ? "▲" : "→";
  return (
    <Area>
      <Title kicker={cue.kicker} text={cue.label} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            fontSize: after ? interpolate(s, [0, 1], [190, 84], clamp) : 190,
            fontWeight: 900,
            color: after ? brand.textDim : brand.text,
            textDecoration: after ? "line-through" : "none",
            textDecorationColor: tint(brand.textDim, 0.8),
            opacity: after
              ? interpolate(s, [0, 1], [1, 0.7], clamp)
              : enter(frame, fps, 6),
          }}
        >
          {cue.from}
        </div>
        {after ? (
          <>
            <div style={{ fontSize: 64, color: col, opacity: s }}>{arrow}</div>
            <div
              style={{
                fontSize: 150,
                fontWeight: 900,
                color: col,
                transform: `scale(${s})`,
                textShadow: `0 0 40px ${tint(brand.highlight, 0.3)}`,
              }}
            >
              {cue.to}
            </div>
          </>
        ) : null}
      </div>
    </Area>
  );
};

export const ScreenCue: React.FC<{ cue: DrawnCue; beat: Beat }> = ({
  cue,
  beat,
}) => {
  switch (cue.kind) {
    case "points":
      return <Points cue={cue} beat={beat} />;
    case "compare":
      return <Compare cue={cue} beat={beat} />;
    case "change":
      return <Change cue={cue} beat={beat} />;
    case "trend":
      return <Trend cue={cue} beat={beat} />;
    case "bars":
      return <Bars cue={cue} beat={beat} />;
  }
};
