// "paper" cues drawn in the paper style on the stage: points (a stack of
// numbered note cards dealt one by one as each is said) and compare (two paper
// cards side by side with a round gold VS sticker). Every other kind goes to
// the classic MotionTrack (index.tsx), whose navy panels read on the cream.
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
import { SAFE } from "../../mortgage/golden";
import {
  outFrameOf,
  type Cue,
  type Reel,
  type Tone,
} from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  CREAM,
  GOLD_PAPER,
  INK,
  NAVY_PAPER,
  PaperCard,
  Tape,
  alpha,
  mix,
} from "./Desk";
import { STAGE, STAGE_W } from "./Stage";

type PaperCue = Extract<Cue, { kind: "points" | "compare" }>;
export const drawnHere = (c: Cue): c is PaperCue =>
  c.kind === "points" || c.kind === "compare";

const Area: React.FC<{
  children: React.ReactNode;
  justify: "flex-start" | "center";
}> = ({ children, justify }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      width: STAGE_W,
      top: STAGE.top,
      height: STAGE.bottom - STAGE.top,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: justify,
      fontFamily: FONT,
    }}
  >
    {children}
  </div>
);

// ------------------------------------------------------------- points

const Sticker: React.FC<{ n: number; current: boolean; size: number }> = ({
  n,
  current,
  size,
}) => (
  <div
    style={{
      flex: `0 0 ${size}px`,
      height: size,
      borderRadius: "50%",
      background: current ? GOLD_PAPER : mix(brand.card, brand.highlight, 0.3),
      color: INK,
      fontSize: size * 0.52,
      fontWeight: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 2px 4px ${alpha(brand.navy, 0.25)}`,
    }}
  >
    {n}
  </div>
);

const PaperPoints: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const starts = cue.items.map((it) => rel(it.atMs));
  const size = cue.items.length > 4 ? 34 : 38;
  return (
    <Area justify="flex-start">
      {/* Slides in at its own height, taped on the left: a drop from above,
          or tape on the right end, would sit under the LogoMark tile
          (top-right of SAFE) in the logo's first 10 s. */}
      <PaperCard background={NAVY_PAPER} rotate={-1.2} from="left">
        <Tape
          width={110}
          rotate={-12}
          style={{ top: -22, left: -44 }}
          delay={6}
        />
        <div
          style={{
            padding: "16px 34px",
            maxWidth: STAGE_W - 80,
            fontSize: 44,
            fontWeight: 900,
            lineHeight: 1.25,
            color: CREAM,
            textWrap: "balance",
            textAlign: "center",
          }}
        >
          {cue.title}
        </div>
      </PaperCard>
      <div style={{ width: STAGE_W - 40, marginTop: 18 }}>
        {cue.items.map((it, i) => {
          if (frame < starts[i]) return null;
          const current = i === starts.length - 1 || frame < starts[i + 1];
          return (
            <div key={it.atMs} style={{ marginTop: i === 0 ? 0 : 10 }}>
              <PaperCard
                from="right"
                delay={starts[i]}
                rotate={i % 2 ? 0.9 : -0.9}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 22,
                    padding: "14px 26px",
                    borderLeft: `8px solid ${current ? GOLD_PAPER : "transparent"}`,
                  }}
                >
                  <Sticker n={i + 1} current={current} size={size * 1.45} />
                  <div
                    style={{
                      fontSize: size,
                      fontWeight: current ? 900 : 800,
                      lineHeight: 1.25,
                      textWrap: "balance",
                      color: current ? INK : alpha(INK, 0.62),
                    }}
                  >
                    {it.text}
                  </div>
                </div>
              </PaperCard>
            </div>
          );
        })}
      </div>
    </Area>
  );
};

// ------------------------------------------------------------- compare

const toneOn = (tone: Tone, dark: boolean) =>
  tone === "bad"
    ? brand.bad
    : tone === "good"
      ? dark
        ? brand.good
        : mix(brand.good, brand.navy, 0.35)
      : dark
        ? CREAM
        : INK;

const CompareCard: React.FC<{
  card: CueOf<"compare">["cards"][number];
  rel: Rel;
  dark: boolean;
  side: "left" | "right";
}> = ({ card, rel, dark, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = rel(card.atMs);
  if (frame < start) return <div style={{ flex: 1 }} />;
  const n = card.rows.length;
  const value = n <= 1 ? 88 : n === 2 ? 64 : 52;
  const hl =
    card.highlightAtMs === undefined
      ? 0
      : spring({
          frame: frame - rel(card.highlightAtMs),
          fps,
          config: { damping: 12, stiffness: 180 },
        });
  return (
    <div style={{ flex: 1 }}>
      <PaperCard
        from={side}
        delay={start}
        rotate={side === "left" ? -2 : 2}
        background={dark ? NAVY_PAPER : brand.card}
        style={{
          outline: hl ? `${6 * hl}px solid ${GOLD_PAPER}` : undefined,
          outlineOffset: 6 * hl,
        }}
      >
        <Tape
          width={120}
          rotate={side === "left" ? -10 : 10}
          style={{ top: -16, [side]: 30 }}
          delay={start + 6}
        />
        <div style={{ padding: "34px 28px 30px", textAlign: "center" }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1.25,
              color: dark ? CREAM : INK,
            }}
          >
            {card.title}
          </div>
          {card.rows.map((r) => {
            const at = rel(r.atMs);
            const p = interpolate(frame, [at, at + 8], [0, 1], clamp);
            return (
              <div key={r.label} style={{ marginTop: 18, opacity: p }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: dark ? alpha(brand.card, 0.75) : brand.slate,
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    fontSize: value,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    color: toneOn(r.tone, dark),
                    transform: `translateY(${(1 - p) * 20}px)`,
                  }}
                >
                  {r.value}
                </div>
              </div>
            );
          })}
        </div>
      </PaperCard>
    </div>
  );
};

const PaperCompare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const vs = spring({
    frame: frame - vsAt,
    fps,
    config: { damping: 9, stiffness: 200, mass: 0.6 },
  });
  return (
    <Area justify="center">
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 56,
          width: STAGE_W - 30,
          alignItems: "flex-start",
        }}
      >
        <CompareCard card={cue.cards[0]} rel={rel} dark={false} side="left" />
        <CompareCard card={cue.cards[1]} rel={rel} dark side="right" />
        {frame >= vsAt ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 70,
              width: 124,
              height: 124,
              marginLeft: -62,
              borderRadius: "50%",
              background: GOLD_PAPER,
              border: `5px solid ${brand.card}`,
              boxShadow: `0 6px 12px ${alpha(brand.navy, 0.3)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 900,
              color: INK,
              zIndex: 3,
              transform: `scale(${vs}) rotate(${interpolate(vs, [0, 1], [-40, -10])}deg)`,
            }}
          >
            VS
          </div>
        ) : null}
      </div>
      {cue.question && frame >= rel(cue.question.atMs) ? (
        <div style={{ marginTop: 34, maxWidth: STAGE_W - 40 }}>
          <PaperCard
            background={GOLD_PAPER}
            rotate={-1}
            delay={rel(cue.question.atMs)}
            torn={`q${cue.fromMs}`}
          >
            <div
              style={{
                padding: "22px 40px",
                fontSize: 44,
                fontWeight: 900,
                lineHeight: 1.25,
                color: INK,
                textAlign: "center",
              }}
            >
              {cue.question.text}
            </div>
          </PaperCard>
        </div>
      ) : null}
    </Area>
  );
};

// ------------------------------------------------------------- track

// The same sound the classic MotionTrack gives these kinds.
const sfxOf = (c: PaperCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const PaperCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
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
              <PaperPoints cue={c} rel={rel} />
            ) : (
              <PaperCompare cue={c} rel={rel} />
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
