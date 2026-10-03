// Motion-graphics cues from edit.json, plus the film finish, chapter light
// leaks and the sound-design track. Every cue and every beat inside it is keyed
// to SOURCE ms and remapped through the cut list, so beats stay locked to the
// speech however the silences were trimmed and the pace changed. The panel
// infographics (kinetic, compare, bars) live in Infographics.tsx.
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import { useContext } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ChangeCard } from "../../elements/ChangeCard";
import { TrendCard } from "../../elements/TrendCard";
import { LenderRow } from "../../brand/LenderRow";
import { NotoEmoji } from "../../brand/NotoEmoji";
import { brand } from "../../brand/theme";
import { FilmFinish, LeakFlash } from "./Frame";
import {
  Bars,
  Compare,
  Kinetic,
  Panel,
  PanelPlace,
  Points,
  panelInset,
  useExit,
  type CueOf,
  type Rel,
} from "./Infographics";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { FONT, clamp, pop } from "../../mortgage/style";

// ---------------------------------------------------------------- verdict

const Verdict: React.FC<{ cue: CueOf<"verdict"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit(8);
  const color = cue.ok ? brand.good : brand.bad;
  // One line only: a wrapped pill drops below the band cue room keeps clear
  // above Daniel's eyebrows (cueRoom.ts), so long verdicts shrink instead.
  const pillWidth = 2 * (SAFE.right - 540);
  const fontSize = Math.min(
    64,
    fitText({
      text: cue.text,
      withinWidth: pillWidth - 60,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const len = 260;
  const stroke = (a: number) =>
    len * (1 - interpolate(frame, [a, a + 12], [0, 1], clamp));
  const mark = (d: string, at: number) => (
    <path
      d={d}
      stroke={color}
      strokeWidth={24}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={len}
      strokeDashoffset={stroke(at)}
    />
  );
  return (
    <AbsoluteFill
      style={{ alignItems: "center", paddingTop: 160, opacity: 1 - exit }}
    >
      <svg
        width={300}
        height={300}
        viewBox="0 0 300 300"
        style={{ transform: `scale(${pop(frame, fps, 0)})` }}
      >
        <circle
          cx={150}
          cy={150}
          r={130}
          fill="rgba(11,31,61,0.9)"
          stroke={color}
          strokeWidth={14}
        />
        {cue.ok ? (
          mark("M85 155 L130 200 L215 105", 2)
        ) : (
          <>
            {mark("M95 95 L205 205", 2)}
            {mark("M205 95 L95 205", 8)}
          </>
        )}
      </svg>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize,
          color: "#fff",
          background: color,
          padding: "8px 30px",
          borderRadius: 14,
          marginTop: 16,
          // Centred on x 540: this keeps it inside SAFE.right.
          maxWidth: pillWidth,
          whiteSpace: "nowrap",
          textAlign: "center",
          transform: `scale(${pop(frame, fps, 6)})`,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- venn

const Venn: React.FC<{ cue: CueOf<"venn"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit();
  const join = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const left = (side: -1 | 1) =>
    540 - 150 + side * interpolate(join, [0, 1], [420, 95]);
  const circle = (side: -1 | 1, color: string) => (
    <div
      style={{
        position: "absolute",
        left: left(side),
        top: 0,
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: `${color}CC`,
        border: `4px solid ${brand.accent}`,
      }}
    />
  );
  // Labels sit on the outer, non-overlapping part of each circle, drawn above
  // both, sized so the longest word fits the 128px lune ("Broker" at 38px).
  const label = (text: string, side: -1 | 1) => (
    <div
      style={{
        position: "absolute",
        left: left(side) + (side < 0 ? 22 : 150),
        top: 122,
        width: 128,
        textAlign: "center",
        fontSize: Math.min(
          46,
          Math.floor(230 / Math.max(...text.split(" ").map((w) => w.length))),
        ),
        lineHeight: 1.1,
        fontWeight: 900,
        color: "#fff",
      }}
    >
      {text}
    </div>
  );
  return (
    <AbsoluteFill style={{ top: 150, fontFamily: FONT, opacity: 1 - exit }}>
      {circle(-1, brand.primary)}
      {circle(1, brand.accent)}
      {label(cue.left, -1)}
      {label(cue.right, 1)}
      <div
        style={{
          position: "absolute",
          top: 320,
          width: "100%",
          textAlign: "center",
          fontSize: 66,
          fontWeight: 900,
          color: brand.highlight,
          textShadow: "0 4px 0 #000, 0 0 20px rgba(0,0,0,0.8)",
          transform: `scale(${pop(frame, fps, 22)})`,
        }}
      >
        {cue.label}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- emoji / lenders

const Emoji: React.FC<{ cue: CueOf<"emoji"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = useExit(6);
  const p = pop(frame, fps, 0);
  return (
    <div
      style={{
        position: "absolute",
        top: 520,
        [cue.position === "left" ? "left" : "right"]: 60,
        opacity: 1 - exit,
        transform: `scale(${p})`,
      }}
    >
      <NotoEmoji name={cue.name} size={240} loop />
    </div>
  );
};

const Lenders: React.FC<{ cue: CueOf<"lenders"> }> = ({ cue }) => (
  <Panel style={{ textAlign: "center" }}>
    <div
      style={{
        fontSize: 52,
        fontWeight: 900,
        color: brand.highlight,
        marginBottom: 24,
      }}
    >
      {cue.title ?? "Các ngân hàng Finance Hub làm việc cùng"}
    </div>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <LenderRow height={50} />
    </div>
  </Panel>
);

// ---------------------------------------------------------------- numbers kit

// Which way a design shows a `change` value, and how far it shrinks the
// 920 px trend graph (and optionally its plot height) to fit its panel band.
// Classic: a strike-through, and a wide, short graph that ends above y ~930
// (cueRoom) with its values at 36 px on screen.
export type NumbersLook = {
  change: "swap" | "strike";
  trendZoom: number;
  trendHeight?: number;
};
const CLASSIC_NUMBERS: NumbersLook = {
  change: "strike",
  trendZoom: 0.9,
  trendHeight: 390,
};
// The cards bring their own navy card; Panel only places and moves them.
const BARE: React.CSSProperties = {
  padding: 0,
  background: "none",
  border: "none",
  boxShadow: "none",
};

const Change: React.FC<{
  cue: CueOf<"change">;
  rel: Rel;
  look: NumbersLook;
}> = ({ cue, rel, look }) => (
  <Panel style={BARE}>
    <ChangeCard
      kicker={cue.kicker}
      label={cue.label}
      from={cue.from}
      to={cue.to}
      swapAt={rel(cue.swapAtMs)}
      direction={cue.direction}
      tone={cue.tone}
      prefer={look.change}
    />
  </Panel>
);

// The trend graph is TREND_W wide at zoom 1: never wider than its panel, so
// it narrows with the panel while the logo shows (values then print under
// 32 px; review 557b020).
const TREND_W = 920;
const Trend: React.FC<{ cue: CueOf<"trend">; look: NumbersLook }> = ({
  cue,
  look,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const place = useContext(PanelPlace);
  const room =
    SAFE.right - SAFE.left - panelInset(place, frame, durationInFrames, fps);
  return (
    <Panel style={{ ...BARE, textAlign: "center" }}>
      <div style={{ display: "inline-block", textAlign: "left" }}>
        <TrendCard
          kicker={cue.kicker}
          title={cue.title}
          unit={cue.unit}
          decimals={cue.decimals}
          points={cue.points}
          zoom={Math.min(look.trendZoom, room / TREND_W)}
          height={look.trendHeight}
        />
      </div>
    </Panel>
  );
};

const CueView: React.FC<{ cue: Cue; rel: Rel; look: NumbersLook }> = ({
  cue,
  rel,
  look,
}) => {
  switch (cue.kind) {
    case "change":
      return <Change cue={cue} rel={rel} look={look} />;
    case "trend":
      return <Trend cue={cue} look={look} />;
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
    case "points":
      return <Points cue={cue} rel={rel} />;
  }
};

// ---------------------------------------------------------------- sound design

type Sfx = { atMs: number; file: string; volume: number };

// Derived from the edit, so a new video gets the same sound design for free.
const sfxFor = (reel: Reel): Sfx[] => [
  ...(reel.edit.chapters ?? []).map((c) => ({
    atMs: c.atMs - 250,
    file: "whoosh",
    volume: 0.35,
  })),
  ...(reel.edit.stats ?? []).map((c) => ({
    atMs: c.atMs,
    file: "ding",
    volume: 0.22,
  })),
  ...(reel.edit.cues ?? []).flatMap((c): Sfx[] => {
    switch (c.kind) {
      case "kinetic":
        return [{ atMs: c.slam.atMs, file: "whip", volume: 0.4 }];
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
        return [{ atMs: c.fromMs, file: "vine-boom", volume: 0.3 }];
      case "venn":
        return [{ atMs: c.fromMs + 700, file: "whoosh", volume: 0.3 }];
      case "points":
        return c.items.map((it) => ({
          atMs: it.atMs,
          file: "mouse-click",
          volume: 0.4,
        }));
      default:
        return [];
    }
  }),
];

// `panelOffset` moves only the cue panels (they sit at top 110 in classic);
// the film grain and light leaks stay full-frame. Designs built to the 4:5
// safe band pass SAFE.top - 110. `numbers` is the design's NumbersLook.
export const MotionTrack: React.FC<{
  reel: Reel;
  panelOffset?: number;
  numbers?: NumbersLook;
  // The WebGL light leak on each chapter cut; a calm design turns it off.
  leak?: boolean;
  // false: the design draws no LogoMark (classic), so panels keep full width;
  // a function: the frames the host's own logo shows (YouTube's LogoMark16).
  logo?: boolean | ((frame: number) => boolean);
}> = ({
  reel,
  panelOffset = 0,
  numbers = CLASSIC_NUMBERS,
  leak = true,
  logo = true,
}) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  return (
    <>
      <FilmFinish />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: panelOffset ? `translateY(${panelOffset}px)` : undefined,
        }}
      >
        {(reel.edit.cues ?? []).map((c) => {
          const from = outFrame(c.fromMs);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
              layout="none"
            >
              <PanelPlace.Provider
                value={{
                  offset: panelOffset,
                  from,
                  talkFrames: reel.timeline.talkFrames,
                  logo,
                }}
              >
                <CueView
                  cue={c}
                  rel={(ms) => outFrame(ms) - from}
                  look={numbers}
                />
              </PanelPlace.Provider>
            </Sequence>
          );
        })}
      </div>
      {/* One WebGL light leak per chapter cut; at most one mounted at a time. */}
      {(leak ? (reel.edit.chapters ?? []) : []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={Math.max(0, outFrame(c.atMs) - 12)}
          durationInFrames={26}
          layout="none"
        >
          <LeakFlash seed={i + 2} />
        </Sequence>
      ))}
      {sfxFor(reel).map((s) => (
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
