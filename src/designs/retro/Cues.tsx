// "retro" cues drawn in the print style on the stage: points (a ribbon title
// and one row per point, each numbered by a round rubber stamp that thumps in
// with a bounce and leaves a faint gold smudge) and compare (two poster panels
// with a big spinning starburst "VS"). Every other kind goes to the classic
// MotionTrack (index.tsx).
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import type { Rel } from "../classic/Infographics";
import {
  BLUE,
  CREAM,
  GOLD,
  INK,
  NAVY,
  Ribbon,
  StarBadge,
  alpha,
  halftone,
  hardBox,
  mix,
  useStamp,
} from "./Print";
import { STAGE_W, StageBox } from "./Stage";

type RetroCue = Extract<Cue, { kind: "points" | "compare" }>;
type PointsCue = Extract<Cue, { kind: "points" }>;
type CompareCue = Extract<Cue, { kind: "compare" }>;
export const drawnHere = (c: Cue): c is RetroCue =>
  c.kind === "points" || c.kind === "compare";

// ------------------------------------------------------------- points

const Stamp: React.FC<{ n: number; size: number; current: boolean }> = ({
  n,
  size,
  current,
}) => {
  const s = useStamp(0);
  const frame = useCurrentFrame();
  const smudge = interpolate(frame, [2, 20], [0.55, 0.18], clamp);
  const face = (color: string, ink: string): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: color,
    border: `5px solid ${ink}`,
    boxShadow: `inset 0 0 0 5px ${color}, inset 0 0 0 8px ${ink}`,
  });
  return (
    <div
      style={{
        position: "relative",
        flex: `0 0 ${size}px`,
        height: size,
        transform: `scale(${interpolate(s, [0, 1], [2.2, 1])}) rotate(${interpolate(s, [0, 1], [-25, -8])}deg)`,
        opacity: interpolate(s, [0, 0.15], [0, 1], clamp),
      }}
    >
      {/* Ink smudge: the stamp's gold ghost, knocked off register. */}
      <div
        style={{
          ...face(alpha(GOLD, smudge), alpha(GOLD, smudge)),
          transform: "translate(7px, 5px) scale(1.08)",
        }}
      />
      <div style={face(current ? GOLD : CREAM, INK)} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          fontWeight: 900,
          color: INK,
        }}
      >
        {n}
      </div>
    </div>
  );
};

const PointRow: React.FC<{
  n: number;
  text: string;
  current: boolean;
  size: number;
}> = ({ n, text, current, size }) => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [4, 12], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        marginTop: 14,
      }}
    >
      <Stamp n={n} size={size * 1.75} current={current} />
      <div
        style={{
          flex: 1,
          padding: "12px 24px",
          background: current ? CREAM : alpha(CREAM, 0.8),
          border: `4px solid ${INK}`,
          borderRadius: 12,
          boxShadow: hardBox(current ? 7 : 4),
          fontSize: size,
          fontWeight: current ? 900 : 800,
          lineHeight: 1.22,
          color: current ? INK : alpha(INK, 0.6),
          opacity: slide,
          transform: `translateX(${(1 - slide) * 60}px)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const RetroPoints: React.FC<{ cue: PointsCue; rel: Rel }> = ({ cue, rel }) => {
  const frame = useCurrentFrame();
  const starts = cue.items.map((it) => rel(it.atMs));
  const size = cue.items.length > 4 ? 34 : 40;
  const title = useStamp(0);
  return (
    <StageBox place="top">
      <Ribbon
        color={NAVY}
        style={{
          maxWidth: STAGE_W - 130,
          transform: `scaleX(${title}) rotate(-1.5deg)`,
        }}
      >
        <div
          style={{
            padding: "12px 32px",
            fontSize: 42,
            fontWeight: 900,
            lineHeight: 1.2,
            color: CREAM,
            textShadow: `3px 3px 0 ${BLUE}`,
            textAlign: "center",
            textWrap: "balance",
          }}
        >
          {cue.title}
        </div>
      </Ribbon>
      <div style={{ width: STAGE_W - 30, marginTop: 14 }}>
        {cue.items.map((it, i) => (
          <Sequence key={it.atMs} from={starts[i]} layout="none">
            <PointRow
              n={i + 1}
              text={it.text}
              size={size}
              current={i === starts.length - 1 || frame < starts[i + 1]}
            />
          </Sequence>
        ))}
      </div>
    </StageBox>
  );
};

// ------------------------------------------------------------- compare

const toneOf = (tone: string, dark: boolean) =>
  tone === "bad"
    ? brand.bad
    : tone === "good"
      ? dark
        ? brand.good
        : mix(brand.good, brand.navy, 0.4)
      : dark
        ? CREAM
        : INK;

const Poster: React.FC<{
  card: CompareCue["cards"][number];
  rel: Rel;
  dark: boolean;
  side: "left" | "right";
}> = ({ card, rel, dark, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = rel(card.atMs);
  const s = useStamp(start);
  if (frame < start) return <div style={{ flex: 1 }} />;
  const n = card.rows.length;
  const value = n <= 1 ? 84 : n === 2 ? 62 : 50;
  const hl =
    card.highlightAtMs === undefined
      ? 0
      : spring({
          frame: frame - rel(card.highlightAtMs),
          fps,
          config: { damping: 12, stiffness: 180 },
        });
  const text = dark ? CREAM : INK;
  return (
    <div
      style={{
        flex: 1,
        transform: `translateY(${(1 - s) * 260}px) rotate(${side === "left" ? -2 : 2}deg)`,
      }}
    >
      <div
        style={{
          background: dark ? NAVY : CREAM,
          backgroundImage: halftone(alpha(dark ? BLUE : GOLD, 0.45), 12, 0.3),
          backgroundSize: "12px 12px",
          border: `6px solid ${INK}`,
          borderRadius: 18,
          boxShadow: `${hardBox(10)}${hl ? `, 0 0 0 ${8 * hl}px ${GOLD}` : ""}`,
          padding: "28px 22px 26px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 900,
            lineHeight: 1.2,
            color: text,
            paddingBottom: 12,
            borderBottom: `4px dashed ${dark ? alpha(CREAM, 0.6) : INK}`,
          }}
        >
          {card.title}
        </div>
        {card.rows.map((r) => {
          const at = rel(r.atMs);
          const p = interpolate(frame, [at, at + 8], [0, 1], clamp);
          return (
            <div key={r.label} style={{ marginTop: 16, opacity: p }}>
              <div
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  color: dark ? alpha(CREAM, 0.8) : brand.slate,
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: value,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: toneOf(r.tone, dark),
                  textShadow: `4px 4px 0 ${dark ? brand.navy : GOLD}`,
                  transform: `scale(${interpolate(p, [0, 1], [1.4, 1])})`,
                }}
              >
                {r.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RetroCompare: React.FC<{ cue: CompareCue; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const qAt = cue.question ? rel(cue.question.atMs) : Infinity;
  const q = useStamp(qAt);
  return (
    <StageBox place="top">
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 70,
          width: STAGE_W - 40,
          marginTop: 30,
          alignItems: "flex-start",
        }}
      >
        <Poster card={cue.cards[0]} rel={rel} dark={false} side="left" />
        <Poster card={cue.cards[1]} rel={rel} dark side="right" />
        {frame >= vsAt ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 40,
              marginLeft: -86,
              zIndex: 3,
            }}
          >
            <StarBadge r={70} delay={vsAt} spin={1.2} points={14}>
              <div
                style={{
                  fontSize: 50,
                  fontWeight: 900,
                  color: INK,
                  textShadow: `3px 3px 0 ${CREAM}`,
                }}
              >
                VS
              </div>
            </StarBadge>
          </div>
        ) : null}
      </div>
      {cue.question && frame >= qAt ? (
        <Ribbon
          color={GOLD}
          tail={NAVY}
          style={{
            marginTop: 40,
            maxWidth: STAGE_W - 130,
            transform: `scale(${interpolate(q, [0, 1], [1.5, 1])}) rotate(-1.5deg)`,
            opacity: interpolate(q, [0, 0.2], [0, 1], clamp),
          }}
        >
          <div
            style={{
              padding: "16px 34px",
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1.22,
              color: INK,
              textAlign: "center",
              textWrap: "balance",
            }}
          >
            {cue.question.text}
          </div>
        </Ribbon>
      ) : null}
    </StageBox>
  );
};

// ------------------------------------------------------------- track

// The same sounds the classic MotionTrack gives these kinds.
const sfxOf = (c: RetroCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const RetroCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(drawnHere);
  return (
    <>
      {cues.map((c) => {
        const from = outFrame(c.fromMs);
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
            layout="none"
          >
            {c.kind === "points" ? (
              <RetroPoints cue={c} rel={rel} />
            ) : (
              <RetroCompare cue={c} rel={rel} />
            )}
          </Sequence>
        );
      })}
      {cues.flatMap(sfxOf).map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, outFrame(s.atMs))}
          durationInFrames={fps * 3}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${s.file}.wav`)}
            volume={() => s.volume}
          />
        </Sequence>
      ))}
    </>
  );
};
