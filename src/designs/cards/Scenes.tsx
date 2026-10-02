// "cards" split-mode scenes: each fills the stage box above Daniel's card.
// The hook (count-up + dot grid), a figure (count-up + dot grid), a named
// bank (logo tile), a change (before tile, after tile, difference in
// "điểm %"), short points (numbered rows) and the idle chapter card.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { type Figure, hookText } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { FONT, clamp, toneColor } from "../../mortgage/style";
import { counted, differenceOf, parseValue } from "../splitscreen/numbers";
import { Arrow, DotGrid, Label, Panel, grow, rise } from "./Kit";
import type { Hook, OwnCue } from "./Plan";
import { CREAM, GOLD, GOLD_SOFT, INK, MUTED, NAVY, WORD } from "./tokens";

export type Box = { left: number; top: number; width: number; height: number };
const PAD = 30;

const fit = (text: string, width: number, max: number) =>
  Math.min(
    max,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

// A number with a gold underline that grows under it.
const BigNumber: React.FC<{ text: string; size: number; t: number }> = ({
  text,
  size,
  t,
}) => (
  <div style={{ display: "inline-block" }}>
    <div
      style={{
        fontSize: size,
        fontWeight: 900,
        color: NAVY,
        lineHeight: 1.05,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {text}
    </div>
    <div
      style={{
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        background: GOLD,
        width: `${t * 100}%`,
      }}
    />
  </div>
);

// ------------------------------------------------------------------ hook

export const HookScene: React.FC<{ hook: Hook; box: Box }> = ({
  hook,
  box,
}) => {
  const frame = useCurrentFrame();
  const t = grow(frame, 4, 40);
  const big = hookText(hook, t);
  // Sized on the final text so the count-up never reflows.
  const final = hookText(hook, 1);
  const size = fit(final, box.width - 2 * PAD, 150);
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="spark" text={WORD.hook} />
      <div style={{ marginTop: 30, ...rise(grow(frame, 2)) }}>
        <BigNumber text={big} size={size} t={t} />
      </div>
      {hook.sub ? (
        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.25,
            color: INK,
            maxWidth: box.width - 2 * PAD - 190,
            ...rise(grow(frame, 14)),
          }}
        >
          {hook.sub}
        </div>
      ) : null}
      <div style={{ position: "absolute", right: PAD, bottom: PAD }}>
        <DotGrid cols={8} rows={5} t={grow(frame, 6, 60)} />
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------------ figure

export const FigureScene: React.FC<{ figure: Figure; box: Box }> = ({
  figure,
  box,
}) => {
  const frame = useCurrentFrame();
  const t = grow(frame, 4, 26);
  const size = fit(figure.big, box.width - 2 * PAD - 260, 130);
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="spark" text={WORD.figure} />
      <div style={{ marginTop: 22, ...rise(grow(frame, 0)) }}>
        <BigNumber text={counted(figure.big, t)} size={size} t={t} />
      </div>
      {figure.label ? (
        <div
          style={{
            marginTop: 18,
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.25,
            color: INK,
            maxWidth: box.width - 2 * PAD - 260,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            ...rise(grow(frame, 8)),
          }}
        >
          {figure.label}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          right: PAD,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <DotGrid cols={9} rows={8} t={grow(frame, 2, 40)} size={14} gap={10} />
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------------ lender

export const LenderScene: React.FC<{ lender: Lender; box: Box }> = ({
  lender,
  box,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - 4, fps, config: { damping: 13 } });
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="bank" text={WORD.lender} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 70,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            padding: 18,
            borderRadius: 26,
            background: GOLD_SOFT,
            transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
            opacity: p,
          }}
        >
          <LenderLogo lender={lender} height={110} />
        </div>
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------------ change

type ChangeCue = Extract<OwnCue, { kind: "change" }>;

// Before tile, arrow, after tile. `from` shows until swapAtMs, then the
// after tile fills navy and counts from the old value to the new one.
export const ChangeScene: React.FC<{
  cue: ChangeCue;
  rel: (ms: number) => number;
  box: Box;
}> = ({ cue, rel, box }) => {
  const frame = useCurrentFrame();
  const swap = rel(cue.swapAtMs);
  const s = grow(frame, swap, 16);
  const from = parseValue(cue.from);
  const shown = frame < swap || !from ? cue.to : counted(cue.to, s, from.value);
  const diff = differenceOf(cue.from, cue.to, cue.direction);
  const pf = from ? from.value : null;
  const pt = parseValue(cue.to)?.value ?? null;
  const dir =
    cue.direction ??
    (pf !== null && pt !== null && pt !== pf
      ? pt > pf
        ? "up"
        : "down"
      : null);
  const tone = cue.tone ? toneColor(cue.tone, GOLD) : GOLD;
  const tileW = (box.width - 2 * PAD - 70) / 2;
  const tileH = box.height - 2 * PAD - 100;
  const valueSize = fit(
    cue.from.length > cue.to.length ? cue.from : cue.to,
    tileW - 48,
    84,
  );
  const tile = (after: boolean): React.CSSProperties => ({
    width: tileW,
    height: tileH,
    borderRadius: 22,
    padding: "16px 22px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: after ? NAVY : CREAM,
    border: after ? `3px solid ${tone}` : "3px solid transparent",
  });
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="swap" text={cue.kicker ?? WORD.change} />
      <div
        style={{
          marginTop: 12,
          fontSize: 32,
          fontWeight: 800,
          color: INK,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...rise(grow(frame, 2)),
        }}
      >
        {cue.label}
      </div>
      <div
        style={{
          position: "absolute",
          left: PAD,
          right: PAD,
          bottom: PAD,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ ...tile(false), ...rise(grow(frame, 6)) }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: MUTED,
            }}
          >
            {WORD.before}
          </div>
          <div
            style={{
              fontSize: valueSize,
              fontWeight: 900,
              color: frame < swap ? NAVY : MUTED,
              textDecoration: frame < swap ? "none" : "line-through",
              textDecorationColor: GOLD,
            }}
          >
            {cue.from}
          </div>
        </div>
        <div style={{ opacity: 0.4 + 0.6 * s }}>
          <Arrow dir="right" size={50} color={NAVY} />
        </div>
        <div
          style={{
            ...tile(true),
            opacity: interpolate(s, [0, 1], [0.25, 1]),
            transform: `scale(${interpolate(s, [0, 1], [0.94, 1])})`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.14em",
              color: GOLD,
            }}
          >
            {WORD.after}
            {dir && frame >= swap ? (
              <Arrow dir={dir} size={30} color={tone} />
            ) : null}
          </div>
          <div
            style={{ fontSize: valueSize, fontWeight: 900, color: "#ffffff" }}
          >
            {frame < swap ? "" : shown}
          </div>
        </div>
      </div>
      {diff && frame >= swap ? (
        <div
          style={{
            position: "absolute",
            right: PAD,
            top: PAD - 6,
            padding: "6px 16px",
            borderRadius: 999,
            background: NAVY,
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 900,
            ...rise(grow(frame, swap + 10)),
          }}
        >
          {diff}
        </div>
      ) : null}
    </Panel>
  );
};

// ------------------------------------------------------------------ points

type PointsCue = Extract<OwnCue, { kind: "points" }>;

// Numbered rows, top-down in spoken order, each rising in as it is said;
// the latest has a gold edge.
export const PointsScene: React.FC<{
  cue: PointsCue;
  rel: (ms: number) => number;
  box: Box;
}> = ({ cue, rel, box }) => {
  const frame = useCurrentFrame();
  const starts = cue.items.map((it) => Math.max(0, rel(it.atMs)));
  const current = starts.reduce((c, s, i) => (frame >= s ? i : c), -1);
  const rowH = Math.min(
    88,
    (box.height - 2 * PAD - 56) / cue.items.length - 10,
  );
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="list" text={cue.title} />
      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {cue.items.map((it, i) => {
          const p = grow(frame, starts[i]);
          const on = i === current;
          return (
            <div
              key={it.atMs}
              style={{
                height: rowH,
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "0 18px",
                borderRadius: 18,
                background: on ? GOLD_SOFT : CREAM,
                borderLeft: `8px solid ${on ? GOLD : "transparent"}`,
                ...rise(p),
              }}
            >
              <div
                style={{
                  width: rowH * 0.62,
                  height: rowH * 0.62,
                  borderRadius: 999,
                  background: NAVY,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: rowH * 0.32,
                  fontWeight: 900,
                  flex: "none",
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontSize: Math.min(34, rowH * 0.42),
                  fontWeight: on ? 900 : 800,
                  color: INK,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.text}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------------ idle

// The stage between scenes: which part of the video this is, its title, and
// a segmented progress bar through the chapters.
export const IdleScene: React.FC<{
  kicker: string;
  title: string;
  index: number; // -1: no chapters
  count: number;
  since: number; // local frame the chapter started
  box: Box;
}> = ({ kicker, title, index, count, since, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - since, fps, config: { damping: 15 } });
  const size = Math.min(62, fit(title, (box.width - 2 * PAD) * 1.9, 62));
  const drift = interpolate(frame - since, [0, 600], [1, 1.03], clamp);
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Label icon="flag" text={kicker} />
        {count > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            {Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 44,
                  height: 12,
                  borderRadius: 6,
                  background: i < index ? NAVY : i === index ? GOLD : GOLD_SOFT,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div
        key={index}
        style={{
          marginTop: 26,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.18,
          color: NAVY,
          textWrap: "balance",
          transform: `scale(${drift})`,
          transformOrigin: "left top",
          ...rise(p, 40),
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: PAD,
          bottom: PAD,
          width: 120,
          height: 8,
          borderRadius: 4,
          background: GOLD,
          opacity: p,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: PAD,
          bottom: PAD - 4,
          fontSize: 22,
          fontWeight: 800,
          color: brand.slate,
          letterSpacing: "0.14em",
          opacity: p,
        }}
      >
        {index >= 0 ? `${index + 1} / ${count}` : ""}
      </div>
    </Panel>
  );
};
