// "bigdigit" cue kinds drawn as tables and charts on the stage: `trend` (a
// hairline line chart), `points` (a numbered typographic list, top-down in
// spoken order) and `compare` (a two-column table with hairline rules).
import { fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT, clamp, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { H, Kicker, StageFrame } from "./Cues";
import {
  ACCENT,
  Assemble,
  Caps,
  Glyph,
  HAIR,
  INK,
  Rule,
  SLATE,
  W,
  ease,
  giantSize,
} from "./Paper";

// ------------------------------------------------------------- trend

const fmt = (v: number, decimals: number, unit?: string) =>
  `${v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${unit ?? ""}`;

export const TrendStage: React.FC<{ cue: CueOf<"trend">; dur: number }> = ({
  cue,
  dur,
}) => {
  const frame = useCurrentFrame();
  const n = cue.points.length;
  const decimals = cue.decimals ?? 0;
  const vals = cue.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const title = fitTextOnNLines({
    text: cue.title,
    maxLines: 2,
    maxBoxWidth: W,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: 46,
  }).fontSize;
  const top = 250; // plot area inside the stage
  const bottom = H - 130;
  const padX = 70;
  const xs = cue.points.map((_, i) => padX + ((W - 2 * padX) * i) / (n - 1));
  const ys = vals.map((v) => bottom - ((v - lo) / span) * (bottom - top));
  // A low point prints its value under the dot, clear of the line.
  const dip = (i: number) =>
    (i === 0 || vals[i] < vals[i - 1]) &&
    (i === n - 1 || vals[i] < vals[i + 1]) &&
    vals[i] < hi;
  const k = interpolate(frame, [10, 10 + 12 * n], [0, 1], clamp);
  const reach = k * (n - 1);
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");
  const len = xs.reduce(
    (s, x, i) => (i ? s + Math.hypot(x - xs[i - 1], ys[i] - ys[i - 1]) : 0),
    0,
  );
  return (
    <StageFrame dur={dur}>
      {cue.kicker ? <Kicker text={cue.kicker} /> : null}
      <div
        style={{
          marginTop: 14,
          fontWeight: 900,
          fontSize: title,
          lineHeight: 1.2,
          maxWidth: W,
        }}
      >
        {cue.title}
      </div>
      <svg
        width={W}
        height={H}
        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
      >
        {[top, bottom].map((y) => (
          <line
            key={y}
            x1={0}
            x2={W}
            y1={y}
            y2={y}
            stroke={HAIR}
            strokeWidth={2}
          />
        ))}
        <path
          d={d}
          fill="none"
          stroke={INK}
          strokeWidth={6}
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - k)}
        />
        {xs.map((x, i) => {
          const on = interpolate(reach - i, [-0.2, 0.2], [0, 1], clamp);
          const last = i === n - 1;
          return (
            <g key={x} opacity={on}>
              <circle
                cx={x}
                cy={ys[i]}
                r={last ? 16 : 11}
                fill={last ? ACCENT : INK}
              />
              <text
                x={x + (i === 0 ? -24 : last ? 24 : 0)}
                y={dip(i) ? ys[i] + (last ? 66 : 54) : ys[i] - 30}
                textAnchor={i === 0 ? "start" : last ? "end" : "middle"}
                fontFamily={FONT}
                fontWeight={900}
                fontSize={last ? 50 : 38}
                fill={last ? ACCENT : INK}
              >
                {fmt(vals[i], decimals, cue.unit)}
              </text>
              <text
                x={x}
                y={H - 16}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={800}
                fontSize={30}
                letterSpacing={4}
                fill={SLATE}
              >
                {cue.points[i].label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </StageFrame>
  );
};

// ------------------------------------------------------------- points

export const PointsStage: React.FC<{
  cue: CueOf<"points">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const n = cue.items.length;
  const starts = cue.items.map((it) => rel(it.atMs));
  const titleSize = fitTextOnNLines({
    text: cue.title,
    maxLines: 1,
    maxBoxWidth: W,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: 50,
  }).fontSize;
  const rowH = Math.min(118, (H - 96) / n);
  const numSize = Math.min(64, rowH * 0.62);
  const textW = W - 130;
  return (
    <StageFrame dur={dur}>
      <div style={{ fontWeight: 900, fontSize: titleSize, lineHeight: 1.25 }}>
        {cue.title}
      </div>
      <Rule top={84} weight={4} left={0} />
      {cue.items.map((it, i) => {
        const said = frame >= starts[i];
        const current = said && (i === n - 1 || frame < starts[i + 1]);
        const t = interpolate(frame - starts[i], [0, 10], [0, 1], {
          ...clamp,
          easing: ease,
        });
        const size = Math.min(
          42,
          fitTextOnNLines({
            text: it.text,
            maxLines: 2,
            maxBoxWidth: textW,
            fontFamily: FONT,
            fontWeight: 800,
            maxFontSize: 42,
          }).fontSize,
        );
        const top = 96 + i * rowH;
        return (
          <div key={it.atMs}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top,
                height: rowH,
                width: W,
                display: "flex",
                alignItems: "center",
                gap: 30,
              }}
            >
              <div style={{ width: 100, flex: "0 0 100px" }}>
                <Glyph
                  ch={String(i + 1).padStart(2, "0")}
                  size={numSize}
                  fill={current ? t : 0}
                  color={said ? INK : HAIR}
                />
              </div>
              <div
                style={{
                  width: textW,
                  fontSize: size,
                  fontWeight: 800,
                  lineHeight: 1.25,
                  color: current ? INK : SLATE,
                  opacity: said ? t : 0,
                  transform: `translateY(${(1 - t) * 24}px)`,
                }}
              >
                {it.text}
              </div>
            </div>
            {i < n - 1 ? (
              <Rule
                top={top + rowH - 1}
                at={starts[i]}
                weight={2}
                color={HAIR}
                left={0}
              />
            ) : null}
          </div>
        );
      })}
    </StageFrame>
  );
};

// ------------------------------------------------------------- compare

const COL_W = (W - 60) / 2;

export const CompareStage: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const rows = Math.max(...cue.cards.map((c) => c.rows.length), 1);
  const headH = 120;
  const qH = cue.question ? 90 : 0;
  const rowH = (H - headH - qH) / rows;
  const valueSize = Math.min(
    124,
    giantSize(
      cue.cards.flatMap((c) => c.rows.map((r) => r.value)),
      COL_W - 10,
      124,
    ),
    rowH - 60,
  );
  const q = cue.question;
  const qAt = q ? rel(q.atMs) : Infinity;
  const vline = interpolate(frame - vsAt, [0, 14], [0, 1], {
    ...clamp,
    easing: ease,
  });
  return (
    <StageFrame dur={dur}>
      {cue.cards.map((card, ci) => {
        const at = rel(card.atMs);
        const x = ci === 0 ? 0 : COL_W + 60;
        const t = interpolate(frame - at, [0, 10], [0, 1], {
          ...clamp,
          easing: ease,
        });
        const hl =
          card.highlightAtMs !== undefined && frame >= rel(card.highlightAtMs)
            ? interpolate(frame - rel(card.highlightAtMs), [0, 12], [0, 1], {
                ...clamp,
                easing: ease,
              })
            : 0;
        const head = fitTextOnNLines({
          text: card.title,
          maxLines: 2,
          maxBoxWidth: COL_W,
          fontFamily: FONT,
          fontWeight: 900,
          maxFontSize: 40,
        }).fontSize;
        return (
          <div
            key={ci}
            style={{ position: "absolute", left: x, top: 0, width: COL_W }}
          >
            <div
              style={{
                height: headH - 20,
                display: "flex",
                alignItems: "flex-end",
                fontWeight: 900,
                fontSize: head,
                lineHeight: 1.2,
                opacity: t,
                transform: `translateY(${(1 - t) * 20}px)`,
              }}
            >
              {card.title}
            </div>
            {card.rows.map((r, ri) => {
              const ra = rel(r.atMs);
              return (
                <div
                  key={r.label}
                  style={{
                    position: "absolute",
                    top: headH + ri * rowH + 16,
                    left: 0,
                    width: COL_W,
                  }}
                >
                  <Caps size={26} style={{ opacity: frame >= at ? 1 : 0 }}>
                    {r.label}
                  </Caps>
                  <div style={{ marginTop: 8 }}>
                    {frame >= ra ? (
                      <Assemble
                        text={r.value}
                        size={valueSize}
                        at={ra}
                        stagger={3}
                        color={toneColor(r.tone, INK)}
                      />
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      width: COL_W * hl,
                      height: 10,
                      background: ACCENT,
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
      <Rule top={headH} weight={4} left={0} />
      {Array.from({ length: rows - 1 }, (_, ri) => (
        <Rule
          key={ri}
          top={headH + (ri + 1) * rowH}
          weight={2}
          color={HAIR}
          left={0}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: COL_W + 29,
          top: 0,
          width: 2,
          height: (H - qH) * vline,
          background: INK,
        }}
      />
      {q && frame >= qAt ? (
        <div style={{ position: "absolute", left: 0, bottom: 0, width: W }}>
          <Rule top={-18} at={qAt} weight={2} color={HAIR} left={0} />
          <div
            style={{
              fontWeight: 900,
              fontSize: fitTextOnNLines({
                text: q.text,
                maxLines: 1,
                maxBoxWidth: W,
                fontFamily: FONT,
                fontWeight: 900,
                maxFontSize: 46,
              }).fontSize,
              lineHeight: 1.3,
              color: ACCENT,
              opacity: interpolate(frame - qAt, [0, 8], [0, 1], clamp),
              transform: `translateX(${interpolate(frame - qAt, [0, 12], [-30, 0], { ...clamp, easing: ease })}px)`,
            }}
          >
            {q.text}
          </div>
        </div>
      ) : null}
    </StageFrame>
  );
};
