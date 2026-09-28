// "phoneapp" compare page: two app cards side by side with "VS" between
// them, each value with a bar sized against the other, the question as a
// gold banner under them.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { clamp, enter, pop, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  CONTENT,
  Card,
  GOLD,
  INK,
  MUTED,
  PAGE_TOP,
  Ripple,
  alpha,
} from "./Phone";
import { NavBar, Page } from "./Page";

const numOf = (v: string) => {
  const n = parseFloat(
    v
      .replace(/[^\d.,]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : null;
};

const CompareCard: React.FC<{
  card: CueOf<"compare">["cards"][number];
  rel: Rel;
  max: number | null;
}> = ({ card, rel, max }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = rel(card.atMs);
  const p = frame >= start ? enter(frame, fps, start) : 0;
  const hi =
    card.highlightAtMs === undefined
      ? 0
      : interpolate(
          frame,
          [rel(card.highlightAtMs), rel(card.highlightAtMs) + 10],
          [0, 1],
          clamp,
        );
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px) scale(${1 + hi * 0.03})`,
      }}
    >
      <Card
        style={{
          padding: "20px 18px 22px",
          textAlign: "center",
          border: `4px solid ${hi > 0 ? alpha(brand.highlight, hi) : "transparent"}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.2,
            color: MUTED,
            minHeight: 82,
            textWrap: "balance",
          }}
        >
          {card.title}
        </div>
        {card.rows.map((r) => {
          if (frame < rel(r.atMs))
            return <div key={r.label} style={{ height: 150 }} />;
          const rp = pop(frame, fps, rel(r.atMs));
          const fill = interpolate(
            frame,
            [rel(r.atMs), rel(r.atMs) + 20],
            [0, 1],
            clamp,
          );
          const v = numOf(r.value);
          const color = toneColor(r.tone, brand.primary);
          return (
            <div key={r.label} style={{ opacity: rp }}>
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: r.tone === "bad" || r.tone === "good" ? color : INK,
                  transform: `scale(${interpolate(rp, [0, 1], [1.3, 1])})`,
                }}
              >
                {r.value}
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: INK,
                  marginTop: 4,
                }}
              >
                {r.label}
              </div>
              {v !== null && max ? (
                <div
                  style={{
                    height: 14,
                    borderRadius: 7,
                    background: alpha(brand.slate, 0.15),
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${(v / max) * fill * 100}%`,
                      height: "100%",
                      borderRadius: 7,
                      background: color,
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>
      <Ripple x={130} y={120} frame={frame - start - 2} />
    </div>
  );
};

const CARD_GAP = 40;

export const ComparePage: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vs = pop(frame, fps, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const q = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  const values = cue.cards.flatMap((c) => c.rows.map((r) => numOf(r.value)));
  const max = values.every((v) => v !== null)
    ? Math.max(...(values as number[]))
    : null;
  return (
    <Page dur={dur}>
      <div
        style={{
          position: "absolute",
          left: CONTENT.left,
          width: CONTENT.width,
          top: PAGE_TOP,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <NavBar title="So sánh" lines={1} />
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: CARD_GAP,
            alignItems: "stretch",
          }}
        >
          {cue.cards.map((card) => (
            <CompareCard key={card.title} card={card} rel={rel} max={max} />
          ))}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 76,
              height: 76,
              marginLeft: -38,
              marginTop: -38,
              borderRadius: "50%",
              background: INK,
              color: GOLD,
              fontSize: 34,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 20px ${alpha(brand.navy, 0.3)}`,
              opacity: vs,
              transform: `scale(${interpolate(vs, [0, 1], [2, 1])})`,
            }}
          >
            VS
          </div>
        </div>
        {cue.question ? (
          <div
            style={{
              padding: "14px 24px",
              borderRadius: 26,
              background: GOLD,
              color: INK,
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.25,
              textAlign: "center",
              textWrap: "balance",
              opacity: q,
              transform: `translateY(${(1 - q) * 30}px)`,
            }}
          >
            {cue.question.text}
          </div>
        ) : null}
      </div>
    </Page>
  );
};
