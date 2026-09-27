// "editorial" with "background": "room": nothing may cover Daniel's head
// (Daniel's review of pre-approval-tu-dong). In room mode editorial draws its
// cue panels itself (points, verdict, compare), with fixed row heights so
// their bottom edge is known in advance: panelBottomAt() gives it per talk
// frame, and Talk places the room photo just under it (index.tsx). Panels
// grow with what has been said, slide in without overshoot (an eased
// translate, not a spring), and keep MotionTrack's sfx for these kinds
// (MotionTrack no longer sees them, so nothing plays twice).
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { DIM, FONT, clamp, pop, toneColor } from "../../mortgage/style";
import { useExit, type CueOf, type Rel } from "../classic/Infographics";

// Kinds drawn here instead of by MotionTrack.
export const ROOM_KINDS = new Set(["points", "verdict", "compare"]);

// Geometry (px). Panels start at SAFE.top.
const TOP = SAFE.top;
const WIDTH = SAFE.right - SAFE.left;
const PAD = 20;
const BORDER = 3;
const CHROME = 2 * (PAD + BORDER);
const TITLE_H = 52; // points title row
const ITEM_H = 58; // one points item
const VERDICT_H = 84 + CHROME - 12; // badge row, 14 px padding
const CARD_PAD = 14;
const CARD_TITLE_H = 40;
const ROW_H = 48;
const VS_W = 86;
const CARD_W = (WIDTH - CHROME - VS_W) / 2;
const ENTER = 12; // frames to slide in
const LEAD = 8; // the photo starts moving this many frames before a panel grows

const ease = (x: number) => x * x * (3 - 2 * x);

const compareHeight = (c: CueOf<"compare">) =>
  CHROME +
  2 * CARD_PAD +
  CARD_TITLE_H +
  ROW_H * Math.max(...c.cards.map((k) => k.rows.length));

// Slides down from above the frame into place, never past it, and back up
// on exit.
const Slide: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const frame = useCurrentFrame();
  const exit = useExit();
  const inP = interpolate(frame, [0, ENTER], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: "absolute",
        top: TOP,
        left: SAFE.left,
        width: WIDTH,
        boxSizing: "border-box",
        padding: PAD,
        borderRadius: 26,
        background:
          "linear-gradient(160deg, rgba(0,100,168,0.97), rgba(11,31,61,0.97))",
        border: `${BORDER}px solid ${brand.accent}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        fontFamily: FONT,
        color: "#fff",
        overflow: "hidden",
        transform: `translateY(${(inP - 1) * 900 - exit * 900}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Points: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({ cue, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = cue.items.map((it) => rel(it.atMs));
  // Only items already said take space: the panel grows as they land.
  const shown = cue.items.filter((_, i) => frame >= starts[i]);
  return (
    <Slide>
      <div
        style={{
          height: TITLE_H,
          fontSize: 38,
          fontWeight: 900,
          color: brand.highlight,
          whiteSpace: "nowrap",
        }}
      >
        {cue.title}
      </div>
      {shown.map((it, i) => {
        const p = pop(frame, fps, starts[i]);
        const current = i === shown.length - 1;
        return (
          <div
            key={it.atMs}
            style={{
              height: ITEM_H,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 16,
              borderTop: "2px solid rgba(255,255,255,0.12)",
              opacity: p,
              transform: `translateX(${interpolate(p, [0, 1], [-60, 0])}px)`,
            }}
          >
            <div
              style={{
                flex: "0 0 42px",
                height: 42,
                borderRadius: "50%",
                background: current
                  ? brand.highlight
                  : "rgba(255,255,255,0.14)",
                color: current ? brand.primary : "#fff",
                fontSize: 26,
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
                fontSize: 32,
                fontWeight: current ? 900 : 700,
                whiteSpace: "nowrap",
                color: current ? "#fff" : DIM,
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </Slide>
  );
};

// One row: a tick/cross badge and the verdict text.
const Verdict: React.FC<{ cue: CueOf<"verdict"> }> = ({ cue }) => {
  const frame = useCurrentFrame();
  const color = cue.ok ? brand.good : brand.bad;
  const fontSize = Math.min(
    56,
    fitText({
      text: cue.text,
      withinWidth: WIDTH - 170,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const draw = interpolate(frame, [4, 16], [0, 1], clamp);
  return (
    <Slide
      style={{
        padding: "14px 22px",
        border: `${BORDER}px solid ${color}`,
        background: "rgba(11,31,61,0.97)",
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <svg
        width={84}
        height={84}
        viewBox="0 0 300 300"
        style={{ flex: "0 0 84px" }}
      >
        <circle
          cx={150}
          cy={150}
          r={130}
          fill="none"
          stroke={color}
          strokeWidth={22}
        />
        <path
          d={
            cue.ok
              ? "M85 155 L130 200 L215 105"
              : "M95 95 L205 205 M205 95 L95 205"
          }
          stroke={color}
          strokeWidth={30}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
      </svg>
      <div style={{ fontSize, fontWeight: 900, whiteSpace: "nowrap" }}>
        {cue.text}
      </div>
    </Slide>
  );
};

const Card: React.FC<{
  card: CueOf<"compare">["cards"][number];
  rel: Rel;
  rows: number;
}> = ({ card, rel, rows }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, rel(card.atMs));
  return (
    <div
      style={{
        flex: `0 0 ${CARD_W}px`,
        height: 2 * CARD_PAD + CARD_TITLE_H + ROW_H * rows,
        boxSizing: "border-box",
        padding: `${CARD_PAD}px 18px`,
        borderRadius: 18,
        background: "rgba(255,255,255,0.07)",
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      }}
    >
      <div
        style={{
          height: CARD_TITLE_H,
          fontSize: 32,
          fontWeight: 900,
          color: brand.highlight,
          whiteSpace: "nowrap",
        }}
      >
        {card.title}
      </div>
      {card.rows.map((r) => (
        <div
          key={r.atMs}
          style={{
            height: ROW_H,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(255,255,255,0.12)",
            opacity: interpolate(
              frame,
              [rel(r.atMs), rel(r.atMs) + 6],
              [0, 1],
              clamp,
            ),
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 700, color: DIM }}>
            {r.label}
          </span>
          <span
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: toneColor(r.tone, "#fff"),
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Card 1 alone in a panel sized to it; the panel widens as VS and card 2
// land, so no empty card frame waits on screen.
const Compare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = Math.max(...cue.cards.map((k) => k.rows.length));
  const widenAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const widen = interpolate(frame, [widenAt - 10, widenAt], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const vs = pop(frame, fps, widenAt);
  return (
    <Slide
      style={{
        width: interpolate(widen, [0, 1], [CARD_W + CHROME, WIDTH]),
        height: compareHeight(cue),
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", width: WIDTH - CHROME }}
      >
        <Card card={cue.cards[0]} rel={rel} rows={rows} />
        <div
          style={{
            flex: `0 0 ${VS_W}px`,
            display: "flex",
            justifyContent: "center",
            opacity: vs,
            transform: `scale(${vs})`,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: brand.accent,
              color: brand.primary,
              fontSize: 28,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            VS
          </div>
        </div>
        <Card card={cue.cards[1]} rel={rel} rows={rows} />
      </div>
    </Slide>
  );
};

// ---------------------------------------------------------------- geometry

// Height of a room-mode cue panel at a frame offset from the cue start.
const heightAt = (c: Cue, t: number, rel: Rel): number => {
  switch (c.kind) {
    case "points":
      return (
        CHROME +
        TITLE_H +
        c.items.reduce(
          (h, it) =>
            h +
            ITEM_H *
              ease(
                interpolate(
                  t,
                  [rel(it.atMs) - LEAD, rel(it.atMs)],
                  [0, 1],
                  clamp,
                ),
              ),
          0,
        )
      );
    case "verdict":
      return VERDICT_H;
    case "compare":
      return compareHeight(c);
    default:
      return 0;
  }
};

// The lowest y any room-mode panel reaches at talk frame `t`, eased in
// before the panel lands and out after it leaves; 0 when none is up.
export const panelBottomAt = (reel: Reel, t: number, fps: number): number => {
  const outFrame = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? [])
    .filter((c) => ROOM_KINDS.has(c.kind))
    .reduce((bottom, c) => {
      const a = outFrame(c.fromMs);
      const b = Math.max(a + 1, outFrame(c.toMs));
      const on = ease(
        interpolate(t, [a - LEAD, a, b, b + LEAD], [0, 1, 1, 0], clamp),
      );
      if (on <= 0) return bottom;
      const h = heightAt(c, t - a, (ms) => outFrame(ms) - a);
      return Math.max(bottom, TOP + h * on);
    }, 0);
};

// ---------------------------------------------------------------- track

const Click: React.FC<{ from: number; file: string; volume: number }> = ({
  from,
  file,
  volume,
}) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.max(0, from)} durationInFrames={fps * 3} layout="none">
      <Audio src={staticFile(`sfx/${file}.wav`)} volume={() => volume} />
    </Sequence>
  );
};

// Same sfx as MotionTrack (classic/Cues.tsx sfxFor) for these kinds.
const sfxOf = (c: Cue): { atMs: number; file: string; volume: number }[] => {
  switch (c.kind) {
    case "points":
      return c.items.map((it) => ({
        atMs: it.atMs,
        file: "mouse-click",
        volume: 0.4,
      }));
    case "verdict":
      return [{ atMs: c.fromMs, file: "vine-boom", volume: 0.3 }];
    case "compare":
      return c.cards.map((k) => ({
        atMs: k.atMs,
        file: "mouse-click",
        volume: 0.5,
      }));
    default:
      return [];
  }
};

// ponytail: a compare `question` beat is not drawn in room mode (none used
// yet); add a row under the cards when a video needs it.
export const RoomCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter((c) => ROOM_KINDS.has(c.kind));
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
            {c.kind === "points" ? <Points cue={c} rel={rel} /> : null}
            {c.kind === "verdict" ? <Verdict cue={c} /> : null}
            {c.kind === "compare" ? <Compare cue={c} rel={rel} /> : null}
          </Sequence>
        );
      })}
      {cues.flatMap(sfxOf).map((s) => (
        <Click
          key={`${s.file}${s.atMs}`}
          from={outFrame(s.atMs)}
          file={s.file}
          volume={s.volume}
        />
      ))}
    </>
  );
};
