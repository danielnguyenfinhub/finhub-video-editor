// Panel infographics for MortgageReel cues: kinetic type, product compare and
// bar chart. Every beat is a SOURCE ms remapped through `rel` to a frame offset
// from the cue start, so beats stay locked to the speech after cuts and pacing.
import { StrikeThrough } from "@remotion/rough-notation";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import type { Cue } from "../../mortgage/schema";
import { DIM, FONT, clamp, pop, toneColor } from "../../mortgage/style";

export type CueOf<K extends Cue["kind"]> = Extract<Cue, { kind: K }>;
// Frame offset of a source moment relative to the start of the cue.
export type Rel = (srcMs: number) => number;

export const useExit = (frames = 10) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - frames, durationInFrames],
    [0, 1],
    clamp,
  );
};

// Navy glass card that drops in from the top and flies back out at the end.
export const Panel: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit();
  const inP = pop(frame, fps, 0);
  return (
    <div
      style={{
        position: "absolute",
        top: 110,
        // Inside SAFE across (the Reels buttons sit right of SAFE.right).
        left: SAFE.left,
        right: 1080 - SAFE.right,
        padding: "34px 36px",
        borderRadius: 34,
        background:
          "linear-gradient(160deg, rgba(0,100,168,0.96), rgba(11,31,61,0.96))",
        border: `3px solid ${brand.accent}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        fontFamily: FONT,
        color: "#fff",
        transform: `translateY(${interpolate(inP, [0, 1], [-700, 0]) - exit * 800}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; opacity?: number }> = ({
  children,
  opacity,
}) => (
  <div
    style={{
      fontSize: 36,
      letterSpacing: 6,
      color: brand.accent,
      fontWeight: 900,
      opacity,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------- kinetic type

// "Not X, not Y" struck through one by one, then the real point slams in.
export const Kinetic: React.FC<{ cue: CueOf<"kinetic">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = rel(cue.slam.atMs);
  const oldOut = interpolate(frame, [slam - 4, slam + 4], [1, 0], clamp);
  const slamP = pop(frame, fps, slam);
  return (
    <Panel style={{ textAlign: "center", minHeight: 360 }}>
      {frame < slam + 4 ? (
        <>
          {cue.kicker ? <Kicker opacity={oldOut}>{cue.kicker}</Kicker> : null}
          {cue.struck.map((s) => {
            const strikeAt = rel(s.strikeMs);
            return (
              <div
                key={s.text}
                style={{
                  opacity: pop(frame, fps, rel(s.atMs)) * oldOut,
                  fontSize: 64,
                  fontWeight: 800,
                  margin: "8px 0",
                }}
              >
                <StrikeThrough
                  progress={interpolate(
                    frame,
                    [strikeAt, strikeAt + 8],
                    [0, 1],
                    clamp,
                  )}
                  color={brand.bad}
                  strokeWidth={7}
                >
                  <span style={{ color: DIM }}>{s.text}</span>
                </StrikeThrough>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {cue.slam.kicker ? <Kicker>{cue.slam.kicker}</Kicker> : null}
          <div
            style={{
              // 120 px fits ~10 capitals in the SAFE-wide panel.
              fontSize: cue.slam.text.length > 10 ? 96 : 120,
              fontWeight: 900,
              color: brand.highlight,
              lineHeight: 1.05,
              transform: `scale(${interpolate(slamP, [0, 1], [3, 1])})`,
              opacity: slamP,
              textShadow: "0 0 40px rgba(255,185,56,0.45)",
            }}
          >
            {cue.slam.text}
          </div>
          {cue.sub ? (
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                marginTop: 14,
                opacity: pop(frame, fps, rel(cue.sub.atMs)),
              }}
            >
              {cue.sub.text}
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- compare

const Row: React.FC<{
  at: number;
  label: string;
  value: string;
  color: string;
  stacked?: boolean;
}> = ({ at, label, value, color, stacked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: stacked ? "center" : undefined,
        justifyContent: "space-between",
        gap: stacked ? 4 : 12,
        fontSize: 36,
        fontWeight: 600,
        padding: "10px 0",
        borderTop: "2px solid rgba(255,255,255,0.12)",
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
      }}
    >
      <span style={{ color: DIM }}>{label}</span>
      <span style={{ fontWeight: 900, color, whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
};

// 17: with the VS badge in its own column a card has ~350 px for a row, so
// "Trả/tháng (đô) 3.388" (19) no longer fits on one line.
const STACK_AT = 17;

export const Compare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vs = pop(frame, fps, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const qP = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  // A long row (label + value) can't share one line in a half-width card and
  // runs into the VS badge: stack it, centred, clear of the badge.
  // ponytail: character count, not measured width; measure if a row still clips.
  const stacked = cue.cards.some((c) =>
    c.rows.some((r) => r.label.length + r.value.length > STACK_AT),
  );
  return (
    <Panel style={{ padding: 26 }}>
      {/* card | VS | card: the badge has its own column (order 1) so it can
          never sit over a card's value. */}
      <div style={{ display: "flex", gap: 14 }}>
        {cue.cards.map((card, i) => {
          const p = pop(frame, fps, rel(card.atMs));
          const lit =
            card.highlightAtMs !== undefined &&
            frame > rel(card.highlightAtMs);
          return (
            <div
              key={card.title}
              style={{
                flex: 1,
                order: i * 2,
                minWidth: 0,
                padding: "22px 24px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.06)",
                border: `3px solid ${lit ? brand.highlight : "rgba(255,255,255,0.18)"}`,
                opacity: p,
                transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
              }}
            >
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  color: brand.highlight,
                  marginBottom: 8,
                  textAlign: stacked ? "center" : undefined,
                }}
              >
                {card.title}
              </div>
              {card.rows.map((r) => (
                <Row
                  key={r.label}
                  at={rel(r.atMs)}
                  label={r.label}
                  value={r.value}
                  color={toneColor(r.tone, "#fff")}
                  stacked={stacked}
                />
              ))}
            </div>
          );
        })}
        <div
          style={{
            order: 1,
            flex: "0 0 96px",
            alignSelf: "flex-start",
            marginTop: 120,
            height: 96,
            borderRadius: "50%",
            background: brand.accent,
            color: brand.primary,
            fontSize: 42,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${vs}) rotate(${interpolate(vs, [0, 1], [-180, 0])}deg)`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          VS
        </div>
      </div>
      {cue.question ? (
        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            fontSize: 50,
            fontWeight: 900,
            color: brand.highlight,
            opacity: qP,
            transform: `scale(${qP * (1 + Math.sin(frame / 5) * 0.04)})`,
          }}
        >
          {cue.question.text}
        </div>
      ) : null}
    </Panel>
  );
};

// ---------------------------------------------------------------- bars

// Short enough that the whole panel (overflow headroom included) ends above
// y ~930 at SAFE.top, where a cueRoom design puts Daniel's hair line.
const BAR_MAX = 180;
const OVERFLOW_ROOM = 70;

const Bar: React.FC<{
  bar: CueOf<"bars">["bars"][number];
  at: number;
  width: number;
}> = ({ bar, at, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = toneColor(bar.tone);
  const g = spring({
    frame: frame - at,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  // An overflowing bar punches through the chart top (into the headroom Bars
  // reserves for it) and keeps pulsing.
  const h = bar.overflow
    ? BAR_MAX + OVERFLOW_ROOM - 12 + Math.sin(frame / 4) * 8
    : Math.max(bar.height * BAR_MAX, 60);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width,
      }}
    >
      <div
        style={{
          height: BAR_MAX,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            width: 170,
            height: h * g,
            background: `linear-gradient(180deg, ${color}, ${color}99)`,
            borderRadius: bar.overflow ? "0 0 4px 4px" : "16px 16px 4px 4px",
            boxShadow: `0 0 30px ${color}66`,
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            fontSize: 44,
            fontWeight: 900,
            color: brand.background,
            clipPath: bar.overflow
              ? "polygon(0 14px, 12% 0, 25% 14px, 38% 0, 50% 14px, 62% 0, 75% 14px, 88% 0, 100% 14px, 100% 100%, 0 100%)"
              : undefined,
          }}
        >
          {g > 0.6 ? bar.value : ""}
        </div>
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginTop: 12,
          textAlign: "center",
          lineHeight: 1.3,
          opacity: g,
        }}
      >
        {bar.label}
      </div>
    </div>
  );
};

const Stamp: React.FC<{ at: number; text: string; color: string }> = ({
  at,
  text,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = pop(frame, fps, at);
  return (
    <div
      style={{
        position: "absolute",
        right: 30,
        top: 30,
        padding: "10px 26px",
        border: `6px solid ${color}`,
        borderRadius: 18,
        color,
        fontSize: 48,
        fontWeight: 900,
        transform: `rotate(-10deg) scale(${interpolate(p, [0, 1], [2.4, 1])})`,
        opacity: p,
        background: "rgba(11,31,61,0.85)",
      }}
    >
      {text}
    </div>
  );
};

export const Bars: React.FC<{ cue: CueOf<"bars">; rel: Rel }> = ({ cue, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = pop(frame, fps, 0);
  const n = cue.bars.length;
  return (
    <Panel>
      {cue.kicker ? (
        <div
          style={{ fontSize: 40, fontWeight: 700, color: DIM, opacity: title }}
        >
          {cue.kicker}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 84,
          fontWeight: 900,
          color: brand.highlight,
          lineHeight: 1,
          opacity: title,
        }}
      >
        {cue.title}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: n > 2 ? 20 : 60,
          marginTop: cue.bars.some((b) => b.overflow) ? 20 + OVERFLOW_ROOM : 20,
        }}
      >
        {cue.bars.map((b) => (
          <Bar key={b.label} bar={b} at={rel(b.atMs)} width={n > 2 ? 260 : 300} />
        ))}
      </div>
      {cue.stamp ? (
        <Stamp
          at={rel(cue.stamp.atMs)}
          text={cue.stamp.text}
          color={toneColor(cue.stamp.tone)}
        />
      ) : null}
    </Panel>
  );
};

// Key points: a numbered list, each point popping in as it is said; the one
// being said glows amber, the ones before it settle to white.
export const Points: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = cue.items.map((it) => rel(it.atMs));
  return (
    <Panel>
      <div
        style={{
          fontSize: 46,
          fontWeight: 900,
          color: brand.highlight,
          marginBottom: 14,
          lineHeight: 1.25,
        }}
      >
        {cue.title}
      </div>
      {cue.items.map((it, i) => {
        const p = pop(frame, fps, starts[i]);
        const current = frame >= starts[i] && (i === starts.length - 1 || frame < starts[i + 1]);
        return (
          <div
            key={it.atMs}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "12px 0",
              borderTop: "2px solid rgba(255,255,255,0.12)",
              opacity: p,
              transform: `translateX(${interpolate(p, [0, 1], [-60, 0])}px)`,
            }}
          >
            <div
              style={{
                flex: "0 0 64px",
                height: 64,
                borderRadius: "50%",
                background: current ? brand.highlight : "rgba(255,255,255,0.14)",
                color: current ? brand.primary : "#fff",
                fontSize: 36,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: current ? 900 : 700,
                lineHeight: 1.3,
                color: current ? "#fff" : DIM,
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </Panel>
  );
};
