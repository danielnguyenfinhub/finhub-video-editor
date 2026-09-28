// Widgets for the focus stage: split (compare), verdict, venn and
// "mentioned" (lender logos). Same contract as Tiles.tsx.
import type React from "react";
import { brand } from "../../../brand/theme";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import type { LenderMention } from "../../../mortgage/lenders";
import type { Cue } from "../../../mortgage/schema";
import { enter, toneColor } from "../../../mortgage/style";
import { COPY, FOCUS, P, alpha } from "./layout";
import { Check, Cross, Shell, clampLines, line1 } from "./Parts";
import type { TileView } from "./Tiles";

type CueOf<K extends Cue["kind"]> = Extract<Cue, { kind: K }>;
const INNER_W = FOCUS.w - 88;

type Card = CueOf<"compare">["cards"][number];
const SplitCard: React.FC<{ v: TileView; card: Card }> = ({ v, card }) => {
  const { f, fps, at } = v;
  const hl =
    card.highlightAtMs === undefined
      ? 0
      : enter(f, fps, at(card.highlightAtMs));
  const one = card.rows.length === 1;
  return (
    <div
      style={{
        flex: 1,
        padding: "18px 30px",
        borderRadius: 16,
        boxSizing: "border-box",
        border: `3px solid ${hl > 0.5 ? P.gold : P.line}`,
        background: P.panel,
        opacity: enter(f, fps, at(card.atMs)),
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 800, ...line1 }}>
        {card.title}
      </div>
      {card.rows.map((r) => {
        const k = enter(f, fps, at(r.atMs));
        const color = toneColor(r.tone, P.text);
        return one ? (
          <div key={r.label} style={{ opacity: k, marginTop: 10 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: P.dim }}>
              {r.label}
            </div>
            <div
              style={{ fontSize: 104, fontWeight: 900, lineHeight: 1.1, color }}
            >
              {r.value}
            </div>
          </div>
        ) : (
          <div
            key={r.label}
            style={{
              opacity: k,
              marginTop: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 20,
            }}
          >
            <span
              style={{ fontSize: 28, fontWeight: 600, color: P.dim, ...line1 }}
            >
              {r.label}
            </span>
            <span style={{ fontSize: 50, fontWeight: 900, color }}>
              {r.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const Split: React.FC<{ v: TileView; cue: CueOf<"compare"> }> = ({
  v,
  cue,
}) => {
  const { f, fps, at } = v;
  const vs = enter(f, fps, at(cue.vsAtMs ?? cue.cards[1].atMs));
  return (
    <Shell type={COPY.compare} tag={v.tag}>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch" }}>
        <SplitCard v={v} card={cue.cards[0]} />
        <div
          style={{
            width: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              border: `3px solid ${P.gold}`,
              color: P.gold,
              fontSize: 26,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: vs,
              transform: `scale(${0.6 + 0.4 * vs})`,
            }}
          >
            {COPY.vs}
          </div>
        </div>
        <SplitCard v={v} card={cue.cards[1]} />
      </div>
      {cue.question ? (
        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontSize: 38,
            fontWeight: 800,
            color: P.gold,
            opacity: enter(f, fps, at(cue.question.atMs)),
            ...line1,
          }}
        >
          {cue.question.text}
        </div>
      ) : null}
    </Shell>
  );
};

export const Verdict: React.FC<{ v: TileView; cue: CueOf<"verdict"> }> = ({
  v,
  cue,
}) => {
  const k = enter(v.f, v.fps, v.tile.s + 3);
  const color = cue.ok ? brand.good : brand.bad;
  return (
    <Shell type={COPY.verdict} tag={v.tag}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 50 }}>
        <div
          style={{
            width: 170,
            height: 170,
            flexShrink: 0,
            borderRadius: 85,
            border: `5px solid ${color}`,
            background: alpha(color, 0.14),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${k})`,
          }}
        >
          {cue.ok ? (
            <Check size={110} color={color} />
          ) : (
            <Cross size={100} color={color} />
          )}
        </div>
        <div
          style={{
            fontSize: 62,
            fontWeight: 900,
            lineHeight: 1.2,
            ...clampLines(3),
          }}
        >
          {cue.text}
        </div>
      </div>
    </Shell>
  );
};

export const Venn: React.FC<{ v: TileView; cue: CueOf<"venn"> }> = ({
  v,
  cue,
}) => {
  const k = enter(v.f, v.fps, v.tile.s + 3);
  const d = 250;
  const circle = (side: -1 | 1, text: string) => (
    <div
      style={{
        position: "absolute",
        left: INNER_W / 2 - d / 2 + side * (d * 0.36) * k,
        top: 0,
        width: d,
        height: d,
        borderRadius: d / 2,
        border: `4px solid ${side < 0 ? P.gold : P.dim}`,
        background: alpha(side < 0 ? P.gold : P.dim, 0.08),
        display: "flex",
        alignItems: "center",
        justifyContent: side < 0 ? "flex-start" : "flex-end",
        padding: "0 26px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: d * 0.5,
          textAlign: side < 0 ? "left" : "right",
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1.2,
          ...clampLines(3),
        }}
      >
        {text}
      </div>
    </div>
  );
  return (
    <Shell type={COPY.venn} tag={v.tag}>
      <div style={{ position: "relative", height: d }}>
        {circle(-1, cue.left)}
        {circle(1, cue.right)}
      </div>
      <div
        style={{
          marginTop: 12,
          textAlign: "center",
          fontSize: 36,
          fontWeight: 900,
          color: P.gold,
          opacity: enter(v.f, v.fps, v.tile.s + 18),
          ...line1,
        }}
      >
        {cue.label}
      </div>
    </Shell>
  );
};

// Lender logos: a named bank, or every bank named inside a `lenders` cue.
export const Mentioned: React.FC<{
  v: TileView;
  title?: string;
  ms: LenderMention[];
}> = ({ v, title, ms }) => (
  <Shell type={COPY.mentioned} tag={v.tag}>
    {title ? (
      <div style={{ fontSize: 44, fontWeight: 800, ...line1 }}>{title}</div>
    ) : null}
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 40 }}>
      {ms.slice(0, 4).map((m, i) => {
        const k = enter(
          v.f,
          v.fps,
          Math.max(v.tile.s, Math.round((m.startMs / 1000) * v.fps)) + i * 4,
        );
        return (
          <div
            key={m.startMs}
            style={{ opacity: k, transform: `scale(${0.85 + 0.15 * k})` }}
          >
            <LenderLogo lender={m.lender} height={ms.length > 1 ? 90 : 140} />
          </div>
        );
      })}
    </div>
  </Shell>
);
