// "journey" compare: a FORK in the road. From the pin the road splits in two
// branches, a signboard at each end (title, value, label, tone stripe; the
// highlighted one glows gold) and a "VS" stone at the junction; the question
// rides the ribbon banner above.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, clamp, pop, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { Banner, SHADOW, fadeOut } from "./Kit";
import { GOLD, INK, MARKER_Y, cameraAt } from "./Map";

const CARD_W = 390;
const CARD_X = [SAFE.left + 16 + CARD_W / 2, SAFE.right - 10 - CARD_W / 2];
const CARD_BOTTOM = 890;
const JUNCTION_Y = 958;

const ForkBoard: React.FC<{
  card: CueOf<"compare">["cards"][number];
  cx: number;
  rel: Rel;
}> = ({ card, cx, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = rel(card.atMs);
  if (frame < start) return null;
  const p = spring({
    frame: frame - start,
    fps,
    config: { damping: 13, stiffness: 140 },
  });
  const rows = card.rows.filter((r) => frame >= rel(r.atMs));
  const last = rows[rows.length - 1];
  const tone = last ? toneColor(last.tone, brand.primary) : brand.primary;
  const hi =
    card.highlightAtMs === undefined
      ? 0
      : interpolate(
          frame,
          [rel(card.highlightAtMs), rel(card.highlightAtMs) + 12],
          [0, 1],
          clamp,
        );
  return (
    <div
      style={{
        position: "absolute",
        left: cx - CARD_W / 2,
        width: CARD_W,
        bottom: 1920 - CARD_BOTTOM,
        boxSizing: "border-box",
        background: "#ffffff",
        border: `5px solid ${hi > 0 ? GOLD : INK}`,
        borderTop: `14px solid ${tone}`,
        borderRadius: 20,
        padding: "12px 18px 16px",
        textAlign: "center",
        boxShadow: hi > 0 ? `0 0 ${24 * hi}px ${GOLD}, ${SHADOW}` : SHADOW,
        opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
        transformOrigin: "50% 100%",
        transform: `translateY(${(1 - p) * 60}px) scale(${interpolate(p, [0, 1], [0.5, 1]) * (1 + hi * 0.04)})`,
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          lineHeight: 1.2,
          color: INK,
          textWrap: "balance",
        }}
      >
        {card.title}
      </div>
      {rows.map((r) => {
        const rp = pop(frame, fps, rel(r.atMs));
        return (
          <div key={r.label} style={{ marginTop: 6, opacity: rp }}>
            <div
              style={{
                fontSize: card.rows.length > 1 ? 46 : 64,
                fontWeight: 900,
                lineHeight: 1.1,
                color: toneColor(r.tone, INK),
                transform: `scale(${interpolate(rp, [0, 1], [1.4, 1])})`,
              }}
            >
              {r.value}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.25,
                color: brand.slate,
              }}
            >
              {r.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Fork: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
  dur: number;
  from: number;
}> = ({ cue, rel, dur, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mx = cameraAt(from + frame, fps).mx;
  const vs = pop(frame, fps, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const q = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  const stem = `M ${mx} ${MARKER_Y - 60} L ${mx} ${JUNCTION_Y}`;
  const branch = (cx: number) =>
    `M ${mx} ${JUNCTION_Y} C ${mx} ${JUNCTION_Y - 40} ${cx} ${CARD_BOTTOM + 50} ${cx} ${CARD_BOTTOM - 10}`;
  const grow = (i: number) =>
    interpolate(
      frame,
      [rel(cue.cards[i].atMs) - 10, rel(cue.cards[i].atMs) + 4],
      [0, 1],
      clamp,
    );
  const road = (d: string, g: number, key: string) => (
    <g key={key}>
      <path
        d={d}
        fill="none"
        stroke="#ffffff"
        strokeWidth={30}
        strokeLinecap="round"
        {...evolvePath(g, d)}
      />
      <path
        d={d}
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeDasharray="14 12"
        opacity={g >= 1 ? 1 : 0}
      />
    </g>
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0 }}
      >
        {road(stem, interpolate(frame, [0, 10], [0, 1], clamp), "stem")}
        {CARD_X.map((cx, i) => road(branch(cx), grow(i), `b${i}`))}
      </svg>
      {cue.cards.map((card, i) => (
        <ForkBoard key={card.title} card={card} cx={CARD_X[i]} rel={rel} />
      ))}
      <div
        style={{
          position: "absolute",
          left: mx - 40,
          top: JUNCTION_Y - 40,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: GOLD,
          border: `5px solid ${INK}`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 900,
          color: INK,
          opacity: vs,
          transform: `scale(${interpolate(vs, [0, 1], [2, 1])})`,
        }}
      >
        VS
      </div>
      {cue.question ? (
        <Banner text={cue.question.text} p={q} color={GOLD} />
      ) : null}
    </div>
  );
};
