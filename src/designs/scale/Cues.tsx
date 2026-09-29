// "scale" cues and sounds. Points are weights stacked top-down in spoken
// order: each item drops in as it is said, a brass weight disc with its
// number and the text on a plaque beside it (the scale dims behind them).
// change and compare live on the scale itself (Plan.ts, Stage.tsx). Every
// other kind is a classic MotionTrack panel, mounted only while it is up (its
// film vignette would dirty the room otherwise), with the sounds MotionTrack
// would give when mounted whole.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { FONT, clamp, pop } from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import type { Rel } from "../classic/Infographics";
import { FALL, onScale, type Plan } from "./Plan";
import { BRASS_DARK, BRASS_LIGHT, GOLD } from "./Scale";
import { PLAQUE } from "./Stage";

type PointsCue = Extract<Cue, { kind: "points" }>;
const isPoints = (c: Cue): c is PointsCue => c.kind === "points";

// Classic panels sit at top 110 + offset: start them under the chip row.
export const STAGE_TOP = 590;
const PANEL_OFFSET = STAGE_TOP - 110;
const FIRST = 745;
const LAST_MAX = 1135;
const DISC = 66;

const PointsWeights: React.FC<{ cue: PointsCue; rel: Rel; dur: number }> = ({
  cue,
  rel,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.items.length;
  const step = Math.min(120, (LAST_MAX - FIRST) / Math.max(1, n - 1));
  const starts = cue.items.map((it) => rel(it.atMs));
  const said = starts.filter((s) => frame >= s).length;
  const title = pop(frame, fps, 0);
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <div
      style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: out }}
    >
      <div
        style={{
          position: "absolute",
          left: SAFE.left + 10,
          right: 1080 - SAFE.right,
          top: STAGE_TOP + 4,
          fontSize: 46,
          fontWeight: 900,
          lineHeight: 1.2,
          color: GOLD,
          opacity: title,
          transform: `translateX(${interpolate(title, [0, 1], [-30, 0])}px)`,
        }}
      >
        {cue.title}
      </div>
      {cue.items.map((it, i) => {
        if (frame < starts[i]) return null;
        const k = (frame - starts[i]) / FALL;
        const fall = k < 1 ? 50 * (1 - k * k) : 0;
        const current = i === said - 1;
        const y = FIRST + i * step;
        return (
          <div
            key={it.atMs}
            style={{
              position: "absolute",
              left: SAFE.left + 10,
              right: 1080 - SAFE.right,
              top: y,
              display: "flex",
              alignItems: "center",
              gap: 20,
              transform: `translateY(calc(-50% - ${fall}px))`,
              opacity: Math.min(1, Math.max(0, k)),
            }}
          >
            <div
              style={{
                flex: `0 0 ${DISC}px`,
                height: DISC,
                borderRadius: "50%",
                background: current
                  ? `radial-gradient(circle at 35% 30%, ${BRASS_LIGHT}, ${GOLD} 55%, ${BRASS_DARK})`
                  : `radial-gradient(circle at 35% 30%, ${GOLD}, ${BRASS_DARK})`,
                border: `3px solid ${BRASS_DARK}`,
                boxShadow: current ? "0 0 24px rgba(255,185,56,0.6)" : "none",
                color: brand.navy,
                fontSize: 34,
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
                ...PLAQUE,
                borderTop: undefined,
                borderLeft: `6px solid ${current ? GOLD : BRASS_DARK}`,
                padding: "12px 24px",
                borderRadius: 16,
                fontSize: 38,
                fontWeight: current ? 900 : 700,
                lineHeight: 1.25,
                color: current ? "#ffffff" : brand.textDim,
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

type Sfx = { atMs?: number; atFrame?: number; file: string; volume: number };

// Sounds: chapter whoosh and stat ding (as MotionTrack whole), a click for
// each point and compare card, a clack for each weight landing on the scale
// and a whip at each change swap.
const sfxOf = (reel: Reel, plan: Plan): Sfx[] => [
  ...(reel.edit.chapters ?? []).map((c) => ({
    atMs: c.atMs - 250,
    file: "whoosh",
    volume: 0.35,
  })),
  ...(reel.edit.stats ?? []).map((s) => ({
    atMs: s.atMs,
    file: "ding",
    volume: 0.22,
  })),
  ...(reel.edit.cues ?? []).filter(isPoints).flatMap((c) =>
    c.items.map((it) => ({
      atMs: it.atMs,
      file: "mouse-click",
      volume: 0.4,
    })),
  ),
  ...plan.scenes.flatMap((s) => [
    ...s.pans.flatMap((p) =>
      p ? [{ atFrame: p.dropAt + FALL, file: "mouse-click", volume: 0.5 }] : [],
    ),
    ...(s.swapAt === undefined
      ? []
      : [{ atFrame: s.swapAt, file: "whip", volume: 0.35 }]),
  ]),
];

export const CueTrack: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  return (
    <>
      {cues
        .filter((c) => !onScale(c))
        .map((c) => {
          const from = outFrame(c.fromMs);
          const dur = Math.max(1, outFrame(c.toMs) - from);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={dur}
              layout="none"
            >
              {isPoints(c) ? (
                <PointsWeights
                  cue={c}
                  rel={(ms) => outFrame(ms) - from}
                  dur={dur}
                />
              ) : (
                <Sequence from={-from} layout="none">
                  <MotionTrack
                    reel={{
                      ...reel,
                      edit: {
                        ...reel.edit,
                        cues: [c],
                        chapters: [],
                        stats: [],
                      },
                    }}
                    panelOffset={PANEL_OFFSET}
                    leak={false}
                  />
                </Sequence>
              )}
            </Sequence>
          );
        })}
      {sfxOf(reel, plan).map((s, i) => {
        const at = s.atFrame ?? outFrame(s.atMs ?? 0);
        return (
          <Sequence
            key={`${s.file}${at}-${i}`}
            from={Math.max(0, at)}
            durationInFrames={fps * 3}
            layout="none"
          >
            <Audio
              src={staticFile(`sfx/${s.file}.wav`)}
              volume={() => s.volume}
            />
          </Sequence>
        );
      })}
    </>
  );
};
