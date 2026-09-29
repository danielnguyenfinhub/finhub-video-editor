// "cards" full-screen scenes (Daniel's card is away): compare (two cards and
// a VS badge), trend (a line drawn left to right), bars (columns growing),
// and long points lists as a navy terminal panel whose lines type in.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../brand/theme";
import { FONT, clamp, toneColor } from "../../mortgage/style";
import type { Tone } from "../../mortgage/schema";
import { Label, Panel, grow, rise } from "./Kit";
import type { OwnCue } from "./Plan";
import type { Box } from "./Scenes";
import { BORDER, CREAM, GOLD, INK, MUTED, NAVY, WORD } from "./tokens";

const PAD = 34;
type Of<K extends OwnCue["kind"]> = Extract<OwnCue, { kind: K }>;
type Props<K extends OwnCue["kind"]> = {
  cue: Of<K>;
  rel: (ms: number) => number;
  box: Box;
};

// A small tone dot: green/red only when the data says good/bad.
const ToneDot: React.FC<{ tone: Tone }> = ({ tone }) =>
  tone === "neutral" ? null : (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        background: toneColor(tone),
        flex: "none",
      }}
    />
  );

// ------------------------------------------------------------------ compare

export const CompareScene: React.FC<Props<"compare">> = ({ cue, rel, box }) => {
  const frame = useCurrentFrame();
  const qH = cue.question ? 100 : 0;
  const GAP = 110; // room for the VS badge between the cards
  const cardW = (box.width - GAP) / 2;
  const cardH = box.height - 58 - qH;
  const vs = grow(frame, rel(cue.vsAtMs ?? cue.cards[1].atMs), 12);
  return (
    <div style={{ position: "absolute", ...box, fontFamily: FONT }}>
      <Label icon="swap" text={WORD.compare} />
      {cue.cards.map((card, i) => {
        // The card shells rise with the scene; the title fills in as said.
        const p = grow(frame, i * 6);
        const said = grow(frame, rel(card.atMs));
        const hi =
          card.highlightAtMs === undefined
            ? 0
            : grow(frame, rel(card.highlightAtMs), 10);
        return (
          <Panel
            key={card.title}
            glow={hi}
            style={{
              left: i * (cardW + GAP),
              top: 58,
              width: cardW,
              height: cardH,
              padding: PAD - 6,
              boxSizing: "border-box",
              ...rise(p, 40),
            }}
          >
            <div
              style={{
                fontSize: 38,
                fontWeight: 900,
                color: NAVY,
                lineHeight: 1.2,
                textWrap: "balance",
                paddingBottom: 16,
                borderBottom: `2px solid ${BORDER}`,
                opacity: said,
              }}
            >
              {card.title}
            </div>
            {card.rows.map((r) => (
              <div
                key={r.label}
                style={{ marginTop: 40, ...rise(grow(frame, rel(r.atMs))) }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: MUTED,
                    lineHeight: 1.25,
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      fontWeight: 900,
                      color: INK,
                      lineHeight: 1.15,
                    }}
                  >
                    {r.value}
                  </div>
                  <ToneDot tone={r.tone} />
                </div>
              </div>
            ))}
          </Panel>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: box.width / 2 - 44,
          top: 58 + cardH / 2 - 44,
          width: 88,
          height: 88,
          borderRadius: 44,
          background: NAVY,
          border: `4px solid ${GOLD}`,
          color: "#ffffff",
          fontSize: 32,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: vs,
          transform: `scale(${interpolate(vs, [0, 1], [0.4, 1])})`,
        }}
      >
        {WORD.vs}
      </div>
      {cue.question ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: qH - 16,
            borderRadius: 24,
            background: NAVY,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 30px",
            fontSize: 34,
            fontWeight: 900,
            borderLeft: `10px solid ${GOLD}`,
            ...rise(grow(frame, rel(cue.question.atMs))),
          }}
        >
          {cue.question.text}
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------------ trend

const formatPoint = (v: number, decimals: number, unit?: string) => {
  const n = v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return unit ? (unit === "%" ? `${n}%` : `${n} ${unit}`) : n;
};

export const TrendScene: React.FC<Props<"trend">> = ({ cue, rel, box }) => {
  const frame = useCurrentFrame();
  const span = Math.max(30, rel(cue.toMs) - rel(cue.fromMs));
  const draw = interpolate(frame, [8, 8 + span * 0.55], [0, 1], clamp);
  const decimals = cue.decimals ?? 0;
  const vals = cue.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.25;
  const cw = box.width - 2 * PAD;
  const ch = box.height - 2 * PAD - 190;
  const x = (i: number) => 40 + (i / (cue.points.length - 1)) * (cw - 80);
  const y = (v: number) =>
    60 + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (ch - 110);
  const d = cue.points
    .map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`)
    .join(" ");
  const len = cue.points.reduce(
    (s, p, i) =>
      i ? s + Math.hypot(x(i) - x(i - 1), y(p.value) - y(vals[i - 1])) : 0,
    0,
  );
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="chart" text={cue.kicker ?? WORD.trend} />
      <div
        style={{
          marginTop: 14,
          fontSize: 42,
          fontWeight: 900,
          color: NAVY,
          lineHeight: 1.2,
        }}
      >
        {cue.title}
      </div>
      <svg
        width={cw}
        height={ch}
        style={{
          position: "absolute",
          left: PAD,
          bottom: PAD,
          overflow: "visible",
        }}
      >
        {[0, 1, 2, 3].map((k) => (
          <line
            key={k}
            x1={0}
            x2={cw}
            y1={60 + (k / 3) * (ch - 110)}
            y2={60 + (k / 3) * (ch - 110)}
            stroke={BORDER}
            strokeWidth={2}
          />
        ))}
        <path
          d={d}
          fill="none"
          stroke={NAVY}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - draw)}
        />
        {cue.points.map((p, i) => {
          const on = interpolate(
            draw * (cue.points.length - 1),
            [i - 0.05, i + 0.1],
            [0, 1],
            clamp,
          );
          const last = i === cue.points.length - 1;
          return (
            <g key={p.label} opacity={on}>
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={last ? 16 : 12}
                fill={last ? GOLD : "#ffffff"}
                stroke={NAVY}
                strokeWidth={5}
              />
              <text
                x={x(i)}
                y={y(p.value) - 30}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={36}
                fontWeight={900}
                fill={INK}
              >
                {formatPoint(p.value, decimals, cue.unit)}
              </text>
              <text
                x={x(i)}
                y={ch - 8}
                textAnchor="middle"
                fontFamily={FONT}
                fontSize={28}
                fontWeight={800}
                fill={MUTED}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
};

// ------------------------------------------------------------------ bars

export const BarsScene: React.FC<Props<"bars">> = ({ cue, rel, box }) => {
  const frame = useCurrentFrame();
  const n = cue.bars.length;
  const areaTop = 190;
  const maxH = box.height - areaTop - PAD - 150;
  const barW = Math.min(200, (box.width - 2 * PAD) / n - 70);
  const stamp = cue.stamp ? grow(frame, rel(cue.stamp.atMs), 10) : 0;
  return (
    <Panel style={{ ...box, padding: PAD }}>
      <Label icon="chart" text={cue.kicker ?? WORD.bars} />
      <div
        style={{
          marginTop: 14,
          fontSize: 42,
          fontWeight: 900,
          color: NAVY,
          lineHeight: 1.2,
        }}
      >
        {cue.title}
      </div>
      <div
        style={{
          position: "absolute",
          left: PAD,
          right: PAD,
          bottom: PAD + 70,
          height: 3,
          background: BORDER,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PAD,
          right: PAD,
          bottom: PAD,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-end",
        }}
      >
        {cue.bars.map((b) => {
          const g = grow(frame, rel(b.atMs), 22);
          const h = maxH * (b.overflow ? 1.12 : b.height) * g;
          const col = b.tone === "neutral" ? NAVY : toneColor(b.tone);
          return (
            <div
              key={b.label}
              style={{
                width: barW + 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 50,
                  fontWeight: 900,
                  color: INK,
                  marginBottom: 10,
                  opacity: g,
                }}
              >
                {b.value}
              </div>
              <div
                style={{
                  width: barW,
                  height: h,
                  borderRadius: "18px 18px 6px 6px",
                  background: col,
                  borderTop: b.overflow ? `8px dashed ${GOLD}` : undefined,
                }}
              />
              <div
                style={{
                  height: 70,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  color: MUTED,
                  textAlign: "center",
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
      {cue.stamp ? (
        <div
          style={{
            position: "absolute",
            right: PAD + 10,
            top: 130,
            padding: "10px 24px",
            borderRadius: 16,
            border: `5px solid ${cue.stamp.tone === "neutral" ? GOLD : toneColor(cue.stamp.tone)}`,
            background: "#ffffff",
            color: INK,
            fontSize: 34,
            fontWeight: 900,
            opacity: stamp,
            transform: `rotate(-6deg) scale(${interpolate(stamp, [0, 1], [1.6, 1])})`,
          }}
        >
          {cue.stamp.text}
        </div>
      ) : null}
    </Panel>
  );
};

// ------------------------------------------------------------------ points

// Long lists: a navy terminal whose lines type in as they are said, top-down.
export const TerminalScene: React.FC<Props<"points">> = ({ cue, rel, box }) => {
  const frame = useCurrentFrame();
  const starts = cue.items.map((it) => Math.max(0, rel(it.atMs)));
  const current = starts.reduce((c, s, i) => (frame >= s ? i : c), -1);
  const p = grow(frame, 0);
  return (
    <div
      style={{
        position: "absolute",
        ...box,
        borderRadius: 28,
        background: NAVY,
        boxShadow: "0 24px 60px rgba(11,31,61,0.3)",
        fontFamily: FONT,
        overflow: "hidden",
        ...rise(p, 40),
      }}
    >
      <div
        style={{
          height: 70,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 28px",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        {[GOLD, CREAM, MUTED].map((c) => (
          <div
            key={c}
            style={{ width: 18, height: 18, borderRadius: 9, background: c }}
          />
        ))}
        <div style={{ marginLeft: 18, flex: 1, overflow: "hidden" }}>
          <Label icon="list" text={cue.title} color={GOLD} iconColor={GOLD} />
        </div>
      </div>
      <div
        style={{
          padding: "44px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 46,
        }}
      >
        {cue.items.map((it, i) => {
          const chars = Math.floor(
            interpolate(
              frame,
              [starts[i], starts[i] + 18],
              [0, it.text.length],
              clamp,
            ),
          );
          const shown = frame < starts[i] ? "" : it.text.slice(0, chars);
          const on = i === current;
          return (
            <div
              key={it.atMs}
              style={{ display: "flex", gap: 22, alignItems: "baseline" }}
            >
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 900,
                  color: GOLD,
                  flex: "none",
                  opacity: frame >= starts[i] ? 1 : 0.3,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: on ? 900 : 800,
                  lineHeight: 1.25,
                  color: on ? "#ffffff" : brand.textDim,
                }}
              >
                {shown}
                {on && Math.floor(frame / 8) % 2 === 0 ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 18,
                      height: 40,
                      marginLeft: 6,
                      background: GOLD,
                      verticalAlign: "-4px",
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
