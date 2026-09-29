// The cue kinds "Mục lục" draws on its page, in textbook style: points as a
// big checklist, compare as a split page, change old -> new, trend as a line
// chart, bars, verdict. Every beat shows when it is said (t0 + frame = talk
// frame; at() maps edit.json's source ms onto the talk timeline).
import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { pop, toneColor } from "../../../mortgage/style";
import { Bars, Trend } from "./Charts";
import { INK, type DrawnCue } from "./Plan";

type At = (srcMs: number) => number;
export type Beat<C> = { cue: C; now: number; at: At };

export const CUE_COPY = ["VS", "✓", "✗", "→", "·"];

export const Title: React.FC<{ kicker?: string; text: string }> = ({
  kicker,
  text,
}) => (
  <div style={{ marginBottom: 30 }}>
    {kicker ? (
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: 4,
          color: brand.slate,
        }}
      >
        {kicker}
      </div>
    ) : null}
    <div style={{ fontSize: 50, fontWeight: 900, lineHeight: 1.15 }}>
      {text}
    </div>
  </div>
);

const Points: React.FC<Beat<Extract<DrawnCue, { kind: "points" }>>> = ({
  cue,
  now,
  at,
}) => {
  const { fps } = useVideoConfig();
  const size = cue.items.length > 4 ? 40 : 46;
  return (
    <div>
      <Title text={cue.title} />
      {cue.items.map((it) => {
        const p = pop(now, fps, at(it.atMs));
        const said = now >= at(it.atMs);
        return (
          <div
            key={it.atMs}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              marginTop: 18,
              opacity: 0.25 + 0.75 * Math.min(1, p),
            }}
          >
            <div
              style={{
                flex: "none",
                width: 58,
                height: 58,
                borderRadius: 12,
                border: `5px solid ${INK}`,
                background: said ? INK : "transparent",
                color: brand.highlight,
                fontSize: 40,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${said ? 0.8 + 0.2 * p : 1})`,
              }}
            >
              {said ? CUE_COPY[1] : ""}
            </div>
            <div
              style={{
                fontSize: size,
                fontWeight: said ? 800 : 600,
                lineHeight: 1.2,
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

const Compare: React.FC<Beat<Extract<DrawnCue, { kind: "compare" }>>> = ({
  cue,
  now,
  at,
}) => {
  const { fps } = useVideoConfig();
  const vs = cue.vsAtMs === undefined ? 1 : pop(now, fps, at(cue.vsAtMs));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        {cue.cards.map((card, i) => {
          const p = pop(now, fps, at(card.atMs));
          const lit =
            card.highlightAtMs !== undefined && now >= at(card.highlightAtMs);
          return (
            <div key={card.title} style={{ display: "contents" }}>
              {i === 1 ? (
                <div
                  style={{
                    alignSelf: "center",
                    width: 96,
                    height: 96,
                    margin: "0 -14px",
                    zIndex: 1,
                    borderRadius: 48,
                    background: brand.highlight,
                    fontSize: 34,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${Math.min(1, vs)})`,
                  }}
                >
                  {CUE_COPY[0]}
                </div>
              ) : null}
              <div
                style={{
                  flex: 1,
                  padding: "34px 44px",
                  borderRadius: 24,
                  background: brand.card,
                  border: `4px solid ${lit ? INK : `${INK}1F`}`,
                  opacity: Math.min(1, p),
                  transform: `translateY(${(1 - Math.min(1, p)) * 24}px)`,
                }}
              >
                <div
                  style={{ fontSize: 38, fontWeight: 800, color: brand.slate }}
                >
                  {card.title}
                </div>
                {card.rows.map((r) => (
                  <div
                    key={r.label}
                    style={{
                      marginTop: 22,
                      opacity: now >= at(r.atMs) ? 1 : 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 700,
                        color: brand.slate,
                      }}
                    >
                      {r.label}
                    </div>
                    <div
                      style={{
                        fontSize: 96,
                        fontWeight: 900,
                        lineHeight: 1.05,
                        color: r.tone === "neutral" ? INK : toneColor(r.tone),
                      }}
                    >
                      {r.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {cue.question && now >= at(cue.question.atMs) ? (
        <div style={{ marginTop: 34, fontSize: 48, fontWeight: 900 }}>
          <span
            style={{
              background: brand.highlight,
              padding: "2px 16px",
              borderRadius: 8,
            }}
          >
            {cue.question.text}
          </span>
        </div>
      ) : null}
    </div>
  );
};

const Change: React.FC<Beat<Extract<DrawnCue, { kind: "change" }>>> = ({
  cue,
  now,
  at,
}) => {
  const { fps } = useVideoConfig();
  const swap = at(cue.swapAtMs);
  const p = pop(now, fps, swap);
  const after = now >= swap;
  const tone = cue.tone ?? "neutral";
  // A drawn arrow (the font has no arrow glyphs), tilted for up/down.
  const tilt = cue.direction === "up" ? -35 : cue.direction === "down" ? 35 : 0;
  return (
    <div>
      <Title kicker={cue.kicker} text={cue.label} />
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontSize: after ? 100 : 190,
            fontWeight: 900,
            color: after ? brand.slate : INK,
            textDecoration: after ? "line-through" : "none",
            textDecorationThickness: 8,
          }}
        >
          {cue.from}
        </div>
        {after ? (
          <>
            <svg
              width={120}
              height={80}
              viewBox="0 0 120 80"
              style={{
                flex: "none",
                opacity: Math.min(1, p),
                transform: `rotate(${tilt}deg)`,
              }}
            >
              <path
                d="M8 40 H100 M72 14 L104 40 L72 66"
                fill="none"
                stroke={brand.slate}
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                fontSize: 170,
                fontWeight: 900,
                color: tone === "neutral" ? INK : toneColor(tone),
                transform: `scale(${0.6 + 0.4 * Math.min(1, p)})`,
                transformOrigin: "left center",
              }}
            >
              {cue.to}
            </div>
          </>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 10,
          height: 16,
          width: 520,
          borderRadius: 8,
          background: INK,
        }}
      />
    </div>
  );
};

const Verdict: React.FC<Beat<Extract<DrawnCue, { kind: "verdict" }>>> = ({
  cue,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
    <div
      style={{
        flex: "none",
        width: 170,
        height: 170,
        borderRadius: 30,
        background: INK,
        color: brand.highlight,
        fontSize: 120,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {cue.ok ? CUE_COPY[1] : CUE_COPY[2]}
    </div>
    <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.15 }}>
      {cue.text}
    </div>
  </div>
);

export const CueView: React.FC<{ cue: DrawnCue; t0: number; at: At }> = ({
  cue,
  t0,
  at,
}) => {
  const now = useCurrentFrame() + t0;
  switch (cue.kind) {
    case "points":
      return <Points cue={cue} now={now} at={at} />;
    case "compare":
      return <Compare cue={cue} now={now} at={at} />;
    case "change":
      return <Change cue={cue} now={now} at={at} />;
    case "trend":
      return <Trend cue={cue} now={now} at={at} />;
    case "bars":
      return <Bars cue={cue} now={now} at={at} />;
    case "verdict":
      return <Verdict cue={cue} now={now} at={at} />;
  }
};
