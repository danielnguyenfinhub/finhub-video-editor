// `compare` as two flash columns cut by a diagonal hazard slash with a VS
// disc; values slam in, tone colour only for good/bad rows, the question as
// a gold strip.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { CW, fit1, fitN } from "./CueKit";
import {
  DIM,
  FlashCard,
  GOLD,
  Glint,
  NAVY,
  STRIPES,
  punch,
  slam,
} from "./Frame";

export const VS = "VS";

const COL_W = (CW - 70) / 2;

const Column: React.FC<{
  card: CueOf<"compare">["cards"][number];
  rel: Rel;
}> = ({ card, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = rel(card.atMs);
  if (frame < at) return <div style={{ width: COL_W }} />;
  const p = punch(frame, fps, at);
  const hlAt =
    card.highlightAtMs === undefined ? Infinity : rel(card.highlightAtMs);
  const glow = interpolate(frame - hlAt, [0, 8], [0, 1], clamp);
  const valueMax = card.rows.length > 1 ? 64 : 92;
  return (
    <div
      style={{
        width: COL_W,
        borderRadius: 14,
        padding: "16px 18px 20px",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.05)",
        border: `3px solid ${glow > 0 ? GOLD : "rgba(255,255,255,0.15)"}`,
        boxShadow: `0 0 ${40 * glow}px rgba(255,185,56,${0.55 * glow})`,
        opacity: p.opacity,
        transform: `scale(${p.scale})`,
      }}
    >
      <div
        style={{
          color: GOLD,
          fontWeight: 900,
          fontSize: fitN(card.title, COL_W - 36, 38),
          lineHeight: 1.25,
          minHeight: 96,
        }}
      >
        {card.title}
      </div>
      {card.rows.map((r) => {
        const ra = rel(r.atMs);
        const s = slam(frame, fps, ra);
        return (
          <div key={r.label} style={{ marginTop: 12 }}>
            <div
              style={{
                color: DIM,
                fontWeight: 800,
                fontSize: 28,
                lineHeight: 1.3,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                height: valueMax * 1.2,
                color: toneColor(r.tone, "#fff"),
                fontWeight: 900,
                fontSize: fit1(r.value, COL_W - 40, valueMax),
                lineHeight: 1.2,
                opacity: frame >= ra ? s.opacity : 0,
                transform: `scale(${frame >= ra ? s.scale : 1})`,
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

export const FlashCompare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const vs = punch(frame, fps, vsAt);
  const q = cue.question;
  const qAt = q ? rel(q.atMs) : Infinity;
  const qp = punch(frame, fps, qAt);
  return (
    <FlashCard padding="22px 30px" shakeAt={[vsAt]}>
      <div style={{ position: "relative", display: "flex", gap: 70 }}>
        <Column card={cue.cards[0]} rel={rel} />
        <Column card={cue.cards[1]} rel={rel} />
        {frame >= vsAt ? (
          <div
            style={{
              position: "absolute",
              left: COL_W,
              width: 70,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: vs.opacity,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 22,
                background: STRIPES(GOLD, NAVY, 10),
                transform: "skewX(-12deg)",
              }}
            />
            <div
              style={{
                position: "relative",
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: GOLD,
                color: NAVY,
                fontWeight: 900,
                fontSize: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${vs.scale})`,
                boxShadow: "0 0 30px rgba(255,185,56,0.6)",
              }}
            >
              {VS}
            </div>
          </div>
        ) : null}
      </div>
      {q && frame >= qAt ? (
        <div
          style={{
            marginTop: 18,
            alignSelf: "center",
            background: GOLD,
            color: NAVY,
            fontWeight: 900,
            fontSize: fit1(q.text, CW - 60, 42),
            lineHeight: 1.3,
            padding: "8px 26px",
            borderRadius: 10,
            whiteSpace: "nowrap",
            opacity: qp.opacity,
            transform: `scale(${qp.scale})`,
          }}
        >
          <Glint first={qAt + 6} every={60}>
            {q.text}
          </Glint>
        </div>
      ) : null}
    </FlashCard>
  );
};
