// A past tile in the history strip: the widget type and its result in one
// glance (the final state, since the beat is over).
import type React from "react";
import { brand } from "../../../brand/theme";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import { toneColor } from "../../../mortgage/style";
import type { Tile } from "./beats";
import { MiniBars, Spark } from "./Charts";
import { COPY, P } from "./layout";
import { Arrow, Check, Cross, Mini, Tri, clampLines, line1 } from "./Parts";

const Big: React.FC<{ big: string; label?: string }> = ({ big, label }) => (
  <>
    <div style={{ fontSize: 52, fontWeight: 900, color: P.gold, ...line1 }}>
      {big}
    </div>
    {label ? (
      <div style={{ fontSize: 18, fontWeight: 600, color: P.dim, ...line1 }}>
        {label}
      </div>
    ) : null}
  </>
);

const Text: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = P.text,
}) => (
  <div
    style={{
      fontSize: 24,
      fontWeight: 800,
      lineHeight: 1.25,
      color,
      ...clampLines(2),
    }}
  >
    {children}
  </div>
);

export const Compact: React.FC<{ tile: Tile }> = ({ tile: t }) => {
  if (t.kind === "hook" || t.kind === "figure")
    return (
      <Mini type={COPY.figure}>
        <Big big={t.big} label={t.label} />
      </Mini>
    );
  if (t.kind === "lender")
    return (
      <Mini type={COPY.mentioned}>
        <div>
          <LenderLogo lender={t.lender} height={52} />
        </div>
      </Mini>
    );
  const c = t.cue;
  switch (c.kind) {
    case "points":
      return (
        <Mini type={COPY.list}>
          <Text>{c.title}</Text>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {c.items.map((it) => (
              <Check key={it.atMs} size={22} color={P.gold} />
            ))}
          </div>
        </Mini>
      );
    case "kinetic":
      return (
        <Mini type={COPY.kinetic}>
          <Text color={P.gold}>{c.slam.text}</Text>
        </Mini>
      );
    case "compare": {
      const [a, b] = c.cards.map((k) => k.rows[0]);
      return (
        <Mini type={COPY.compare}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 34, fontWeight: 900 }}>{a?.value}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: P.dim }}>
              {COPY.vs}
            </span>
            <span
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: b ? toneColor(b.tone, P.text) : P.text,
              }}
            >
              {b?.value}
            </span>
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 600, color: P.dim, ...line1 }}
          >
            {a?.label}
          </div>
        </Mini>
      );
    }
    case "change": {
      const color = c.tone ? toneColor(c.tone) : P.gold;
      return (
        <Mini type={COPY.change}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: P.dim }}>
              {c.from}
            </span>
            <Arrow size={24} color={P.dim} />
            <span style={{ fontSize: 40, fontWeight: 900, color }}>{c.to}</span>
            {c.direction ? (
              <Tri up={c.direction === "up"} size={22} color={color} />
            ) : null}
          </div>
          <div
            style={{ fontSize: 18, fontWeight: 600, color: P.dim, ...line1 }}
          >
            {c.label}
          </div>
        </Mini>
      );
    }
    case "trend":
      return (
        <Mini type={COPY.trend}>
          <div
            style={{ fontSize: 18, fontWeight: 600, color: P.dim, ...line1 }}
          >
            {c.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Spark values={c.points.map((p) => p.value)} w={150} h={56} />
          </div>
        </Mini>
      );
    case "bars":
      return (
        <Mini type={COPY.bars}>
          <div
            style={{ fontSize: 18, fontWeight: 600, color: P.dim, ...line1 }}
          >
            {c.title}
          </div>
          <MiniBars cue={c} h={56} />
        </Mini>
      );
    case "verdict":
      return (
        <Mini type={COPY.verdict}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {c.ok ? (
              <Check size={40} color={brand.good} />
            ) : (
              <Cross size={40} color={brand.bad} />
            )}
            <Text>{c.text}</Text>
          </div>
        </Mini>
      );
    case "venn":
      return (
        <Mini type={COPY.venn}>
          <Text color={P.gold}>{c.label}</Text>
        </Mini>
      );
    case "lenders":
      return (
        <Mini type={COPY.mentioned}>
          <Text>{c.title ?? COPY.mentioned}</Text>
        </Mini>
      );
    default:
      return null;
  }
};
