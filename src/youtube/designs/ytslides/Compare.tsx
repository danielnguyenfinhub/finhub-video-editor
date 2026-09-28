// The comparison slide: two cards on the grid, a divider and a gold "VS",
// the spoken question as a banner underneath.
import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import type { Cue } from "../../../mortgage/schema";
import { FONT, toneColor } from "../../../mortgage/style";
import {
  GOLD,
  INK,
  LINE,
  NAVY,
  PAPER,
  SLATE,
  STAGE,
  colX,
  span,
} from "./Chrome";
import { SLIDES_COPY, useIn } from "./Slides";

type At = (ms: number) => number;
const soft = { damping: 200 } as const;

type CompareCue = Extract<Cue, { kind: "compare" }>;
const CARD_H = 380;
export const CompareSlide: React.FC<{
  cue: CompareCue;
  at: At;
  from: number;
}> = ({ cue, at, from }) => {
  const vs = useIn(at(cue.vsAtMs ?? cue.cards[1].atMs) - from);
  const q = useIn(cue.question ? at(cue.question.atMs) - from : 1e9);
  return (
    <>
      {cue.cards.map((card, ci) => (
        <CompareCard
          key={card.title}
          card={card}
          left={colX(ci === 0 ? 0 : 7)}
          at={at}
          from={from}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 960 - 1,
          top: STAGE.top,
          width: 2,
          height: CARD_H,
          background: LINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 960 - 60,
          top: STAGE.top + CARD_H / 2 - 60,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: GOLD,
          color: NAVY,
          fontFamily: FONT,
          fontSize: 46,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: vs,
          transform: `scale(${0.6 + 0.4 * vs})`,
        }}
      >
        {SLIDES_COPY[1]}
      </div>
      {cue.question ? (
        <div
          style={{
            position: "absolute",
            left: colX(0),
            width: span(12),
            top: STAGE.top + CARD_H + 36,
            textAlign: "center",
            fontFamily: FONT,
            opacity: q,
            transform: `translateY(${(1 - q) * 20}px)`,
          }}
        >
          <span
            style={{
              padding: "12px 34px",
              borderRadius: 14,
              background: GOLD,
              color: NAVY,
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            {cue.question.text}
          </span>
        </div>
      ) : null}
    </>
  );
};

const CompareCard: React.FC<{
  card: CompareCue["cards"][number];
  left: number;
  at: At;
  from: number;
}> = ({ card, left, at, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = useIn(at(card.atMs) - from);
  const lit =
    card.highlightAtMs !== undefined && frame >= at(card.highlightAtMs) - from;
  const size = card.rows.length > 1 ? 72 : 120;
  return (
    <div
      style={{
        position: "absolute",
        left,
        width: span(5),
        top: STAGE.top,
        height: CARD_H,
        boxSizing: "border-box",
        padding: "34px 44px",
        borderRadius: 24,
        background: PAPER,
        border: lit ? `5px solid ${GOLD}` : `2px solid ${LINE}`,
        boxShadow: lit ? `0 18px 50px ${brand.navy}33` : "none",
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 800, color: SLATE }}>
        {card.title}
      </div>
      {card.rows.map((r) => {
        const rp = spring({
          frame: frame - (at(r.atMs) - from),
          fps,
          config: soft,
          durationInFrames: 14,
        });
        return (
          <div key={r.label} style={{ marginTop: 22, opacity: rp }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: SLATE }}>
              {r.label}
            </div>
            <div
              style={{
                fontSize: size,
                fontWeight: 900,
                color: toneColor(r.tone, INK),
                lineHeight: 1.1,
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
