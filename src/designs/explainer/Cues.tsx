// The explainer's infographic cues: the same edit.json cue data as classic,
// drawn as pen-on-paper (index cards, sticky notes, strike-throughs, drawn
// ticks and circles). Beat timing uses the same rel() mapping as classic.
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import { evolvePath } from "@remotion/paths";
import { Box, Circle, CrossedOff, Highlight } from "@remotion/rough-notation";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LenderRow } from "../../brand/LenderRow";
import { TrendCard } from "../../elements/TrendCard";
import { NotoEmoji } from "../../brand/NotoEmoji";
import { brand } from "../../brand/theme";
import {
  outFrameOf,
  type Cue,
  type Reel,
  type Tone,
} from "../../mortgage/schema";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { FONT, clamp, pop } from "../../mortgage/style";
import {
  PANEL_TOP,
  PanelPlace,
  Points,
  useExit,
  type CueOf,
  type Rel,
} from "../classic/Infographics";
import { BandWide, INK, MARKER, NOTE, NoteBand, logoDuring } from "./Paper";

// brand.good/bad are for dark backgrounds; these are the ink versions that
// read on paper.
const GOOD_INK = "#1E8A5A";
const BAD_INK = "#C8322B";
const toneInk = (t: Tone) =>
  t === "good" ? GOOD_INK : t === "bad" ? BAD_INK : INK;

// A white ruled index card pinned near the top of the page; drops in, lifts
// out at the end of the cue.
const IndexCard: React.FC<{
  children: React.ReactNode;
  rotate?: number;
  width?: number;
}> = ({ children, rotate = -1.5, width = 940 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 0);
  const exit = useExit();
  return (
    <NoteBand width={width}>
      <div
        style={{
          position: "relative",
          width,
          background:
            "repeating-linear-gradient(#fff 0 58px, #d6e6f5 58px 60px)",
          padding: "30px 40px 36px",
          boxShadow: "0 22px 48px rgba(11,31,61,0.3)",
          fontFamily: FONT,
          color: INK,
          opacity: Math.min(1, p) * (1 - exit),
          transform: `translateY(${interpolate(p, [0, 1], [-90, 0]) - exit * 140}px) rotate(${rotate}deg)`,
        }}
      >
        {children}
      </div>
    </NoteBand>
  );
};

const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: 2,
      color: brand.primary,
      marginBottom: 6,
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------- kinetic

// "Not X, but Y": each X is crossed out in pen at its strikeMs, then Y lands
// in big marker-highlighted type.
const Kinetic: React.FC<{ cue: CueOf<"kinetic">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slamAt = rel(cue.slam.atMs);
  const slam = pop(frame, fps, slamAt);
  // Sized with the rows below so the card ends by y ~830, above Daniel's
  // eyebrows in the taped photo (golden rule 3b).
  const size = Math.min(
    86,
    fitText({
      text: cue.slam.text,
      withinWidth: 820,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <IndexCard>
      {cue.kicker ? <Kicker>{cue.kicker}</Kicker> : null}
      {cue.struck.map((s, i) => (
        <div
          key={s.atMs}
          style={{
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1.25,
            opacity: Math.min(1, pop(frame, fps, rel(s.atMs))),
          }}
        >
          <CrossedOff
            progress={interpolate(
              frame,
              [rel(s.strikeMs), rel(s.strikeMs) + 8],
              [0, 1],
              clamp,
            )}
            color={BAD_INK}
            strokeWidth={5}
            iterations={1}
            seed={i + 21}
          >
            <span>{s.text}</span>
          </CrossedOff>
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          opacity: Math.min(1, slam),
          transform: `scale(${interpolate(slam, [0, 1], [1.5, 1])})`,
          transformOrigin: "left center",
        }}
      >
        {cue.slam.kicker ? <Kicker>{cue.slam.kicker}</Kicker> : null}
        <Highlight
          progress={interpolate(
            frame,
            [slamAt + 4, slamAt + 14],
            [0, 1],
            clamp,
          )}
          color={MARKER}
          iterations={1}
          seed={31}
        >
          <span
            style={{ fontSize: size, fontWeight: 900, whiteSpace: "nowrap" }}
          >
            {cue.slam.text}
          </span>
        </Highlight>
      </div>
      {cue.sub ? (
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            marginTop: 16,
            lineHeight: 1.3,
            opacity: Math.min(1, pop(frame, fps, rel(cue.sub.atMs))),
          }}
        >
          {cue.sub.text}
        </div>
      ) : null}
    </IndexCard>
  );
};

// ---------------------------------------------------------------- compare

// Two sticky notes side by side; the highlighted one gets circled in pen,
// a hand-drawn "VS" between them.
const Compare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit();
  const vs = pop(frame, fps, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const q = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  // Two 370 px notes, their pen circles (16 px each side) and the 110 px gap.
  return (
    <NoteBand
      width={2 * (370 + 32) + 110}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
        color: INK,
        opacity: 1 - exit,
      }}
    >
      <div style={{ display: "flex", gap: 110, alignItems: "flex-start" }}>
        {cue.cards.map((card, ci) => {
          const p = pop(frame, fps, rel(card.atMs));
          const hl =
            card.highlightAtMs === undefined
              ? 0
              : interpolate(
                  frame,
                  [rel(card.highlightAtMs), rel(card.highlightAtMs) + 14],
                  [0, 1],
                  clamp,
                );
          return (
            <Circle
              key={card.title}
              progress={hl}
              color={BAD_INK}
              strokeWidth={6}
              iterations={1}
              seed={ci + 41}
              padding={{ left: 16, right: 16, top: 16, bottom: 16 }}
            >
              <div
                style={{
                  width: 370,
                  background: ci === 0 ? NOTE : "#CFE4F7",
                  padding: "26px 30px",
                  boxShadow: "0 16px 36px rgba(11,31,61,0.28)",
                  opacity: Math.min(1, p),
                  transform: `translateY(${interpolate(p, [0, 1], [-80, 0])}px) rotate(${ci === 0 ? -2.5 : 2}deg)`,
                }}
              >
                <div
                  style={{ fontSize: 46, fontWeight: 900, marginBottom: 10 }}
                >
                  {card.title}
                </div>
                {card.rows.map((r) => (
                  <div
                    key={r.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 36,
                      lineHeight: 1.5,
                      opacity: Math.min(1, pop(frame, fps, rel(r.atMs))),
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontWeight: 900, color: toneInk(r.tone) }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </Circle>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          top: 70,
          fontSize: 60,
          fontWeight: 900,
          color: BAD_INK,
          transform: `scale(${vs}) rotate(-8deg)`,
        }}
      >
        VS
      </div>
      {cue.question ? (
        <div
          style={{
            // White strip: the question sits over the footage, not paper.
            marginTop: 40,
            maxWidth: 900,
            background: "#fff",
            padding: "14px 30px",
            boxShadow: "0 10px 26px rgba(11,31,61,0.22)",
            textAlign: "center",
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.3,
            opacity: Math.min(1, q),
          }}
        >
          {cue.question.text}
        </div>
      ) : null}
    </NoteBand>
  );
};

// ---------------------------------------------------------------- bars

// The bars card ends by y ~830 like the venn card, above Daniel's eyebrows.
const BAR_MAX = 200;
const OVERFLOW = 70;

// Hand-drawn bars: an ink outline draws itself, then the fill rises. An
// overflowing bar is drawn taller than the scale.
const Bar: React.FC<{
  bar: CueOf<"bars">["bars"][number];
  at: number;
  width: number;
}> = ({ bar, at, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = interpolate(pop(frame, fps, at), [0, 1], [0, 1], clamp);
  const h = bar.height * BAR_MAX + (bar.overflow ? OVERFLOW : 0);
  const outline = `M 0 ${h} L 0 0 L ${width} 0 L ${width} ${h}`;
  const draw = evolvePath(grow, outline);
  const ink = toneInk(bar.tone);
  return (
    <div style={{ width, textAlign: "center" }}>
      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          color: ink,
          opacity: grow,
          marginBottom: 8,
        }}
      >
        {bar.value}
      </div>
      <div style={{ position: "relative", width, height: h }}>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            width,
            height: h * grow,
            // Weakest stripe 80%: every tone ink reaches 3:1 on the white card
            // (a 20/40% hatch read pale pink, corrections 27/09; check-contrast).
            background: `repeating-linear-gradient(135deg, ${ink}CC 0 10px, ${ink} 10px 14px)`,
          }}
        />
        <svg
          width={width}
          height={h}
          style={{ position: "absolute", overflow: "visible" }}
        >
          <path
            d={outline}
            fill="none"
            stroke={ink}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeDasharray={draw.strokeDasharray}
            strokeDashoffset={draw.strokeDashoffset}
          />
        </svg>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, marginTop: 10 }}>
        {bar.label}
      </div>
    </div>
  );
};

const Bars: React.FC<{ cue: CueOf<"bars">; rel: Rel }> = ({ cue, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.bars.length;
  const stamp = cue.stamp ? pop(frame, fps, rel(cue.stamp.atMs)) : 0;
  return (
    <IndexCard>
      {cue.kicker ? <Kicker>{cue.kicker}</Kicker> : null}
      <div style={{ fontSize: 52, fontWeight: 900, marginBottom: 20 }}>
        {cue.title}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 50,
          borderBottom: `5px solid ${INK}`,
        }}
      >
        {cue.bars.map((b) => (
          <Bar
            key={b.label}
            bar={b}
            at={rel(b.atMs)}
            width={n > 2 ? 220 : 260}
          />
        ))}
      </div>
      {cue.stamp ? (
        <div
          style={{
            position: "absolute",
            right: 50,
            bottom: 120,
            fontSize: 50,
            fontWeight: 900,
            color: toneInk(cue.stamp.tone),
            opacity: Math.min(1, stamp),
            transform: `scale(${interpolate(stamp, [0, 1], [2, 1], clamp)}) rotate(-12deg)`,
          }}
        >
          <Box
            progress={Math.min(1, stamp)}
            color={toneInk(cue.stamp.tone)}
            strokeWidth={6}
            iterations={2}
            seed={51}
            padding={{ left: 14, right: 14, top: 6, bottom: 6 }}
          >
            <span>{cue.stamp.text}</span>
          </Box>
        </div>
      ) : null}
    </IndexCard>
  );
};

// ---------------------------------------------------------------- verdict

const TICK = "M 10 70 L 55 115 L 150 10";
const CROSS = "M 20 20 L 140 140 M 140 20 L 20 140";

// A big pen tick or cross draws itself next to the conclusion.
const Verdict: React.FC<{ cue: CueOf<"verdict"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const path = cue.ok ? TICK : CROSS;
  const mark = evolvePath(interpolate(frame, [4, 18], [0, 1], clamp), path);
  const ink = cue.ok ? GOOD_INK : BAD_INK;
  return (
    <IndexCard rotate={1.5}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <svg width={160} height={160} style={{ flexShrink: 0 }}>
          <path
            d={path}
            fill="none"
            stroke={ink}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={mark.strokeDasharray}
            strokeDashoffset={mark.strokeDashoffset}
          />
        </svg>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.25 }}>
          {cue.text}
        </div>
      </div>
    </IndexCard>
  );
};

// ---------------------------------------------------------------- venn

const circlePath = (cx: number, cy: number, r: number) =>
  `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;

// Two circles drawn in pen, overlapping; the shared label is marked in the
// middle.
const Venn: React.FC<{ cue: CueOf<"venn"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const left = circlePath(230, 220, 190);
  const right = circlePath(510, 220, 190);
  const a = evolvePath(interpolate(frame, [0, 18], [0, 1], clamp), left);
  const b = evolvePath(interpolate(frame, [8, 26], [0, 1], clamp), right);
  const mid = interpolate(frame, [26, 38], [0, 1], clamp);
  const label: React.CSSProperties = {
    position: "absolute",
    top: 190,
    width: 190,
    fontSize: 40,
    fontWeight: 800,
    textAlign: "center",
  };
  return (
    <IndexCard>
      <div
        style={{
          position: "relative",
          width: 740,
          height: 440,
          margin: "0 auto",
        }}
      >
        <svg width={740} height={440} style={{ position: "absolute" }}>
          <path
            d={left}
            fill={`${brand.primary}14`}
            stroke={brand.primary}
            strokeWidth={6}
            strokeDasharray={a.strokeDasharray}
            strokeDashoffset={a.strokeDashoffset}
          />
          <path
            d={right}
            fill={`${brand.accent}1f`}
            stroke={brand.accent}
            strokeWidth={6}
            strokeDasharray={b.strokeDasharray}
            strokeDashoffset={b.strokeDashoffset}
          />
        </svg>
        <div style={{ ...label, left: 60 }}>{cue.left}</div>
        <div style={{ ...label, right: 60 }}>{cue.right}</div>
        <div
          style={{
            position: "absolute",
            left: 290,
            top: 185,
            width: 160,
            textAlign: "center",
            fontSize: 30,
            fontWeight: 900,
            opacity: mid,
          }}
        >
          <Highlight progress={mid} color={MARKER} iterations={1} seed={71}>
            <span>{cue.label}</span>
          </Highlight>
        </div>
      </div>
    </IndexCard>
  );
};

// ---------------------------------------------------------------- numbers kit

const ARROW = {
  down: "M 30 6 L 30 74 M 8 50 L 30 74 L 52 50",
  up: "M 30 74 L 30 6 M 8 30 L 30 6 L 52 30",
};

// A value changing on an index card: the old value is crossed out in pen at
// swapAtMs and the new one is written under it in marker, with a pen arrow
// (tone ink) when the cue gives a direction. Paper version of ChangeCard.
const Change: React.FC<{ cue: CueOf<"change">; rel: Rel }> = ({ cue, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swapAt = rel(cue.swapAtMs);
  const to = pop(frame, fps, swapAt);
  const from = cue.from.normalize("NFC");
  const next = cue.to.normalize("NFC");
  const fit = (t: string, max: number, within: number) =>
    Math.min(
      max,
      fitText({
        text: t,
        withinWidth: within,
        fontFamily: FONT,
        fontWeight: 900,
      }).fontSize,
    );
  const arrow = cue.direction
    ? evolvePath(
        interpolate(frame, [swapAt + 4, swapAt + 16], [0, 1], clamp),
        ARROW[cue.direction],
      )
    : null;
  return (
    <IndexCard>
      {cue.kicker ? <Kicker>{cue.kicker.normalize("NFC")}</Kicker> : null}
      <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.25 }}>
        {cue.label.normalize("NFC")}
      </div>
      <div style={{ marginTop: 10, opacity: to < 1 ? 1 : 0.55 }}>
        <CrossedOff
          progress={interpolate(frame, [swapAt - 10, swapAt], [0, 1], clamp)}
          color={BAD_INK}
          strokeWidth={6}
          iterations={1}
          seed={81}
        >
          <span
            style={{
              fontSize: fit(from, 80, 820),
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {from}
          </span>
        </CrossedOff>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: Math.min(1, to),
          transform: `translateY(${interpolate(to, [0, 1], [20, 0], clamp)}px)`,
        }}
      >
        <Highlight
          progress={interpolate(
            frame,
            [swapAt + 4, swapAt + 14],
            [0, 1],
            clamp,
          )}
          color={MARKER}
          iterations={1}
          seed={83}
        >
          <span
            style={{
              fontSize: fit(next, 110, 740),
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {next}
          </span>
        </Highlight>
        {arrow && cue.direction ? (
          <svg width={60} height={80} style={{ flexShrink: 0 }}>
            <path
              d={ARROW[cue.direction]}
              fill="none"
              stroke={toneInk(cue.tone ?? "neutral")}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={arrow.strokeDasharray}
              strokeDashoffset={arrow.strokeDashoffset}
            />
          </svg>
        ) : null}
      </div>
    </IndexCard>
  );
};

// A value over time: the shared navy TrendCard (LineGraph, vi-VN values)
// taped to the page like a printout, with a short plot so the card ends by
// y ~830, above Daniel's eyebrows.
const Trend: React.FC<{ cue: CueOf<"trend"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 0);
  const exit = useExit();
  return (
    <NoteBand width={920}>
      <div
        style={{
          position: "relative",
          opacity: Math.min(1, p) * (1 - exit),
          transform: `translateY(${interpolate(p, [0, 1], [-90, 0]) - exit * 140}px) rotate(-1deg)`,
        }}
      >
        <TrendCard
          kicker={cue.kicker}
          title={cue.title}
          unit={cue.unit}
          decimals={cue.decimals}
          points={cue.points}
          height={330}
        />
        <div
          style={{
            position: "absolute",
            top: -18,
            right: 60,
            width: 150,
            height: 44,
            background: "rgba(255,255,255,0.55)",
            boxShadow: "0 2px 6px rgba(11,31,61,0.15)",
            transform: "rotate(4deg)",
          }}
        />
      </div>
    </NoteBand>
  );
};

// ---------------------------------------------------------------- emoji, lenders

const Emoji: React.FC<{ cue: CueOf<"emoji"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit(6);
  return (
    <div
      style={{
        position: "absolute",
        // Below the LogoMark tile, inside SAFE, beside Daniel's head.
        top: SAFE.top + LOGO_HEIGHT + 50,
        ...(cue.position === "left"
          ? { left: SAFE.left }
          : { right: 1080 - SAFE.right }),
        opacity: 1 - exit,
        transform: `scale(${pop(frame, fps, 0)})`,
      }}
    >
      <NotoEmoji name={cue.name} size={240} loop />
    </div>
  );
};

const Lenders: React.FC<{ cue: CueOf<"lenders"> }> = ({ cue }) => (
  <IndexCard>
    <div
      style={{
        fontSize: 50,
        fontWeight: 900,
        textAlign: "center",
        marginBottom: 24,
      }}
    >
      {cue.title ?? "Các ngân hàng Finance Hub làm việc cùng"}
    </div>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <LenderRow height={50} />
    </div>
  </IndexCard>
);

const CueView: React.FC<{ cue: Cue; rel: Rel }> = ({ cue, rel }) => {
  switch (cue.kind) {
    case "kinetic":
      return <Kinetic cue={cue} rel={rel} />;
    case "compare":
      return <Compare cue={cue} rel={rel} />;
    case "bars":
      return <Bars cue={cue} rel={rel} />;
    case "verdict":
      return <Verdict cue={cue} />;
    case "venn":
      return <Venn cue={cue} />;
    case "emoji":
      return <Emoji cue={cue} />;
    case "lenders":
      return <Lenders cue={cue} />;
    case "change":
      return <Change cue={cue} rel={rel} />;
    case "trend":
      return <Trend cue={cue} />;
    // No paper-style version yet: the classic navy panel.
    case "points":
      return <Points cue={cue} rel={rel} />;
  }
};

// ---------------------------------------------------------------- sound

// Cue sounds only: chapter and stat sounds play inside their own components
// (Overlay.tsx). Pen-and-paper register; no meme sounds.
type Sfx = { atMs: number; file: string; volume: number };
const sfxFor = (cues: Cue[]): Sfx[] =>
  cues.flatMap((c): Sfx[] => {
    switch (c.kind) {
      case "kinetic":
        return [{ atMs: c.slam.atMs, file: "whip", volume: 0.35 }];
      case "compare":
        return c.cards.map((k) => ({
          atMs: k.atMs,
          file: "mouse-click",
          volume: 0.5,
        }));
      case "bars":
        return c.stamp
          ? [{ atMs: c.stamp.atMs, file: "shutter-modern", volume: 0.35 }]
          : [];
      case "verdict":
        return [{ atMs: c.fromMs, file: "ding", volume: 0.3 }];
      case "venn":
        return [{ atMs: c.fromMs + 700, file: "whoosh", volume: 0.3 }];
      default:
        return [];
    }
  });

const POINTS_OFFSET = SAFE.top - PANEL_TOP;
const POINTS_SCALE = 0.8;

export const CueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  return (
    <>
      {cues.map((c) => {
        const from = outFrame(c.fromMs);
        const frames = Math.max(1, outFrame(c.toMs) - from);
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={frames}
            layout="none"
          >
            <BandWide.Provider
              value={!logoDuring(from, frames, reel.timeline.talkFrames, fps)}
            >
              {c.kind === "points" ? (
                // The classic panel: rested at SAFE.top like classic's
                // MotionTrack (it sat at y 110, above SAFE and the logo), at
                // 0.8 from its top-left like every explainer note (NoteBand
                // MAX_SCALE), so 4 points end near y 825, above his eyes.
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    transform: `translateY(${POINTS_OFFSET}px) scale(${POINTS_SCALE})`,
                    transformOrigin: `${SAFE.left}px ${PANEL_TOP}px`,
                  }}
                >
                  <PanelPlace.Provider
                    value={{
                      offset: POINTS_OFFSET,
                      scale: POINTS_SCALE,
                      from,
                      talkFrames: reel.timeline.talkFrames,
                    }}
                  >
                    <CueView cue={c} rel={(ms) => outFrame(ms) - from} />
                  </PanelPlace.Provider>
                </div>
              ) : (
                <CueView cue={c} rel={(ms) => outFrame(ms) - from} />
              )}
            </BandWide.Provider>
          </Sequence>
        );
      })}
      {sfxFor(cues).map((s) => (
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
