// The focused tile, one widget per beat: KPI (hook, figures), list (points,
// kinetic), split (compare, venn), delta (change), chart (trend, bars),
// verdict and "mentioned" (lender logos). Laid out at the stage size; every
// reveal keys off the beat's own spoken ms, so the tile tracks the voice.
import { fitText, measureText } from "@remotion/layout-utils";
import type React from "react";
import { Easing, interpolate } from "remotion";
import { brand } from "../../../brand/theme";
import type { LenderMention } from "../../../mortgage/lenders";
import type { Cue } from "../../../mortgage/schema";
import { FONT, clamp, enter, pop, toneColor } from "../../../mortgage/style";
import type { Tile } from "./beats";
import { BarsChart, TrendChart } from "./Charts";
import { Mentioned, Split, Venn, Verdict } from "./Widgets";
import { COPY, FOCUS, P, alpha } from "./layout";
import { Arrow, Check, Shell, Tri, clampLines, line1, rowFit } from "./Parts";

export type TileView = {
  tile: Tile;
  f: number;
  fps: number;
  at: (ms: number) => number;
  tag?: string;
  mentions: LenderMention[];
};
type CueOf<K extends Cue["kind"]> = Extract<Cue, { kind: K }>;
const INNER_W = FOCUS.w - 88;
const KPI_GAP = 64;
const CHART_H = 250;

const Kpi: React.FC<{
  v: TileView;
  big: string;
  label?: string;
  countTo?: number;
  decimals?: number;
  suffix?: string;
}> = ({ v, big, label, countTo, decimals, suffix }) => {
  const { f, fps, tile } = v;
  const p = enter(f, fps, tile.s + 3);
  const k = interpolate(f, [tile.s + 3, tile.s + 36], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  // Count up only the hook's own countTo; figures show as said.
  const shown =
    countTo === undefined || k >= 1
      ? big
      : `${(countTo * k).toLocaleString("vi-VN", {
          minimumFractionDigits: decimals ?? 0,
          maximumFractionDigits: decimals ?? 0,
          useGrouping: /\d\.\d{3}/.test(big),
        })}${suffix ?? ""}`;
  const size = Math.min(
    180,
    fitText({
      text: big,
      withinWidth: 660,
      fontFamily: FONT,
      fontWeight: "900",
    }).fontSize,
  );
  // Beside the number when the label has room for ~2 lines at 52 px; else
  // stacked under it (never cut: it wraps within its box).
  const numW = measureText({
    text: big,
    fontFamily: FONT,
    fontSize: size,
    fontWeight: "900",
  }).width;
  const side = INNER_W - numW - KPI_GAP;
  const labelW = label
    ? measureText({
        text: label,
        fontFamily: FONT,
        fontSize: 52,
        fontWeight: "800",
      }).width
    : 0;
  const stacked = label !== undefined && labelW > side * 2.6;
  return (
    <Shell type={COPY.figure} tag={v.tag}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          alignItems: stacked ? "flex-start" : "center",
          justifyContent: "center",
          gap: stacked ? 18 : KPI_GAP,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontSize: size,
              fontWeight: 900,
              lineHeight: 1.05,
              color: P.gold,
              opacity: p,
              transform: `translateY(${(1 - p) * 24}px)`,
            }}
          >
            {shown}
          </div>
          <div
            style={{
              marginTop: 16,
              height: 10,
              borderRadius: 5,
              background: P.faint,
            }}
          >
            <div
              style={{
                width: `${enter(f, fps, tile.s + 8) * 100}%`,
                height: "100%",
                borderRadius: 5,
                background: P.gold,
              }}
            />
          </div>
        </div>
        {label ? (
          <div
            style={{
              fontSize: stacked ? 40 : 52,
              fontWeight: 800,
              lineHeight: 1.22,
              opacity: enter(f, fps, tile.s + 10),
              ...clampLines(stacked ? 2 : 3),
              ...(stacked ? { maxWidth: INNER_W } : rowFit),
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
    </Shell>
  );
};

const List: React.FC<{ v: TileView; cue: CueOf<"points"> }> = ({ v, cue }) => {
  const { f, fps, at } = v;
  const rowH = Math.min(62, (FOCUS.h - 176) / cue.items.length);
  const box = rowH * 0.7;
  return (
    <Shell type={COPY.list} tag={v.tag}>
      <div
        style={{ fontSize: 44, fontWeight: 800, marginBottom: 12, ...line1 }}
      >
        {cue.title}
      </div>
      {cue.items.map((it) => {
        const a = at(it.atMs);
        const r = enter(f, fps, a);
        const chk = pop(f, fps, a + 6);
        return (
          <div
            key={it.atMs}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <div
              style={{
                width: box,
                height: box,
                flexShrink: 0,
                borderRadius: 10,
                boxSizing: "border-box",
                border: `3px solid ${chk > 0.5 ? P.gold : P.line}`,
                background: alpha(P.gold, chk),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ transform: `scale(${chk})`, display: "flex" }}>
                <Check size={box * 0.8} color={brand.navy} />
              </div>
            </div>
            <div style={{ position: "relative", flex: 1, height: rowH }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: rowH * 0.3,
                  height: rowH * 0.4,
                  width: "46%",
                  borderRadius: 8,
                  background: P.faint,
                  opacity: 1 - r,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  fontSize: rowH * 0.66,
                  fontWeight: 800,
                  lineHeight: `${rowH}px`,
                  opacity: r,
                  transform: `translateX(${(1 - r) * 24}px)`,
                  ...line1,
                }}
              >
                {it.text}
              </div>
            </div>
          </div>
        );
      })}
    </Shell>
  );
};

const Kinetic: React.FC<{ v: TileView; cue: CueOf<"kinetic"> }> = ({
  v,
  cue,
}) => {
  const { f, fps, at } = v;
  return (
    <Shell type={COPY.kinetic} tag={cue.kicker ?? v.tag}>
      {cue.struck.map((s) => {
        const r = enter(f, fps, at(s.atMs));
        const x = enter(f, fps, at(s.strikeMs));
        return (
          <div
            key={s.atMs}
            style={{
              alignSelf: "flex-start",
              position: "relative",
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.35,
              color: x > 0.5 ? P.dim : P.text,
              opacity: r * (1 - 0.45 * x),
            }}
          >
            {s.text}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "52%",
                height: 5,
                width: `${x * 100}%`,
                background: P.dim,
              }}
            />
          </div>
        );
      })}
      <div style={{ marginTop: 14, opacity: enter(f, fps, at(cue.slam.atMs)) }}>
        {cue.slam.kicker ? (
          <div style={{ fontSize: 26, fontWeight: 800, color: P.dim }}>
            {cue.slam.kicker}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: P.gold,
            ...clampLines(2),
          }}
        >
          {cue.slam.text}
        </div>
      </div>
      {cue.sub ? (
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: P.dim,
            opacity: enter(f, fps, at(cue.sub.atMs)),
          }}
        >
          {cue.sub.text}
        </div>
      ) : null}
    </Shell>
  );
};

const Delta: React.FC<{ v: TileView; cue: CueOf<"change"> }> = ({ v, cue }) => {
  const { f, fps, at } = v;
  const sw = at(cue.swapAtMs);
  const k = f < sw ? 0 : enter(f, fps, sw);
  const color = cue.tone ? toneColor(cue.tone) : P.gold;
  return (
    <Shell type={COPY.change} tag={cue.kicker ?? v.tag}>
      <div style={{ fontSize: 44, fontWeight: 800, ...clampLines(2) }}>
        {cue.label}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 34 }}>
        <div
          style={{
            position: "relative",
            fontSize: interpolate(k, [0, 1], [170, 92]),
            fontWeight: 900,
            color: k > 0.3 ? P.dim : P.text,
          }}
        >
          {cue.from}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "52%",
              height: 6,
              width: `${k * 100}%`,
              background: P.dim,
            }}
          />
        </div>
        {k > 0 ? (
          <>
            <div style={{ opacity: k, display: "flex" }}>
              <Arrow size={80} color={P.dim} />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: k,
                transform: `scale(${0.8 + 0.2 * k})`,
                transformOrigin: "left center",
              }}
            >
              <span style={{ fontSize: 170, fontWeight: 900, color }}>
                {cue.to}
              </span>
              {cue.direction ? (
                <Tri up={cue.direction === "up"} size={70} color={color} />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </Shell>
  );
};

const Chart: React.FC<{ v: TileView; cue: CueOf<"trend" | "bars"> }> = ({
  v,
  cue,
}) => (
  <Shell
    type={cue.kind === "trend" ? COPY.trend : COPY.bars}
    tag={cue.kicker ?? v.tag}
  >
    <div style={{ fontSize: 40, fontWeight: 800, ...line1 }}>{cue.title}</div>
    <div style={{ marginTop: 6 }}>
      {cue.kind === "trend" ? (
        <TrendChart
          cue={cue}
          f={v.f}
          fps={v.fps}
          s={v.tile.s}
          w={INNER_W}
          h={CHART_H}
        />
      ) : (
        <BarsChart
          cue={cue}
          f={v.f}
          fps={v.fps}
          at={v.at}
          w={INNER_W}
          h={CHART_H}
        />
      )}
    </div>
  </Shell>
);

export const Full: React.FC<TileView> = (v) => {
  const t = v.tile;
  if (t.kind === "hook")
    return (
      <Kpi
        v={v}
        big={t.big}
        label={t.label}
        countTo={t.countTo}
        decimals={t.decimals}
        suffix={t.suffix}
      />
    );
  if (t.kind === "figure") return <Kpi v={v} big={t.big} label={t.label} />;
  if (t.kind === "lender")
    return (
      <Mentioned
        v={v}
        ms={[{ lender: t.lender, startMs: (t.s / v.fps) * 1000, endMs: 0 }]}
      />
    );
  const c = t.cue;
  switch (c.kind) {
    case "points":
      return <List v={v} cue={c} />;
    case "kinetic":
      return <Kinetic v={v} cue={c} />;
    case "compare":
      return <Split v={v} cue={c} />;
    case "change":
      return <Delta v={v} cue={c} />;
    case "trend":
    case "bars":
      return <Chart v={v} cue={c} />;
    case "verdict":
      return <Verdict v={v} cue={c} />;
    case "venn":
      return <Venn v={v} cue={c} />;
    case "lenders": {
      const inSpan = v.mentions.filter((m) => {
        const fr = (m.startMs / 1000) * v.fps;
        return fr >= t.s - 15 && fr < t.e;
      });
      return <Mentioned v={v} title={c.title} ms={inSpan} />;
    }
    default:
      return null;
  }
};
