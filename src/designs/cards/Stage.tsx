// "cards" stage: every scene of the plan in its box (split above Daniel's
// card, or the full frame while his card is away), the idle chapter card
// whenever the stage is free, and the classic MotionTrack for the cue kinds
// this design does not draw (mounted only while such a cue is up).
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { BarsScene, CompareScene, TerminalScene, TrendScene } from "./Big";
import { type Plan, type Scene, isFull, isOwn, ramp } from "./Plan";
import {
  type Box,
  ChangeScene,
  FigureScene,
  HookScene,
  IdleScene,
  LenderScene,
  PointsScene,
} from "./Scenes";
import { STAGE, WORD } from "./tokens";

const WIDTH = STAGE.right - STAGE.left;
const box = (top: number, bottom: number): Box => ({
  left: STAGE.left,
  top,
  width: WIDTH,
  height: bottom - top,
});
const SPLIT = box(STAGE.top, STAGE.splitBottom);
const FULL = box(STAGE.top, STAGE.fullBottom);
const HOOK = box(STAGE.hookTop, STAGE.splitBottom);

const SceneView: React.FC<{ scene: Scene; reel: Reel }> = ({ scene, reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = scene.to - scene.from;
  const out = interpolate(frame, [len - 8, len], [1, 0], clamp);
  const at = outFrameOf(reel.timeline, fps);
  const rel = (ms: number) => at(ms) - scene.from;
  let body: React.ReactNode = null;
  if (scene.kind === "hook") body = <HookScene hook={scene.hook} box={HOOK} />;
  else if (scene.kind === "figure")
    body = <FigureScene figure={scene.figure} box={SPLIT} />;
  else if (scene.kind === "lender")
    body = <LenderScene lender={scene.lender} box={SPLIT} />;
  else {
    const c = scene.cue;
    const b = isFull(c) ? FULL : SPLIT;
    body =
      c.kind === "change" ? (
        <ChangeScene cue={c} rel={rel} box={b} />
      ) : c.kind === "points" ? (
        isFull(c) ? (
          <TerminalScene cue={c} rel={rel} box={b} />
        ) : (
          <PointsScene cue={c} rel={rel} box={b} />
        )
      ) : c.kind === "compare" ? (
        <CompareScene cue={c} rel={rel} box={b} />
      ) : c.kind === "trend" ? (
        <TrendScene cue={c} rel={rel} box={b} />
      ) : (
        <BarsScene cue={c} rel={rel} box={b} />
      );
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: out,
        transform: `translateY(${(1 - out) * -24}px)`,
      }}
    >
      {body}
    </div>
  );
};

// The chapter card: shown whenever no scene or classic panel holds the stage.
const Idle: React.FC<{ reel: Reel; plan: Plan }> = ({ reel, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const busy = ramp(
    [...plan.scenes.map((s): [number, number] => [s.from, s.to]), ...plan.dim],
    frame,
    8,
  );
  if (busy >= 1) return null;
  const chapters = reel.edit.chapters ?? [];
  const starts = chapters.map((c) => at(c.atMs));
  const index = starts.reduce((k, s, i) => (frame >= s ? i : k), -1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - busy }}>
      <IdleScene
        kicker={index >= 0 ? `${WORD.chapter} ${index + 1}` : WORD.topic}
        title={index >= 0 ? chapters[index].title : reel.edit.title}
        index={index}
        count={chapters.length}
        since={index >= 0 ? starts[index] : 0}
        box={SPLIT}
      />
    </div>
  );
};

const NUMBERS: NumbersLook = {
  change: "swap",
  trendZoom: 0.84,
  trendHeight: 400,
};

// Classic panels for kinetic / verdict / venn / lenders / emoji cues.
const ClassicCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.cues ?? [])
        .filter((c) => !isOwn(c))
        .map((c) => {
          const from = at(c.fromMs);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={Math.max(1, at(c.toMs) - from)}
              layout="none"
            >
              <Sequence from={-from} layout="none">
                <MotionTrack
                  reel={{
                    ...reel,
                    edit: { ...reel.edit, cues: [c], chapters: [], stats: [] },
                  }}
                  panelOffset={SPLIT.top - 110 - 170}
                  numbers={NUMBERS}
                  leak={false}
                />
              </Sequence>
            </Sequence>
          );
        })}
    </>
  );
};

// A whoosh as the card slides away, a click per built-in beat.
const Sfx: React.FC<{ reel: Reel; plan: Plan }> = ({ reel, plan }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const hits: { f: number; file: string; volume: number }[] = [
    ...plan.full.map(([a]) => ({ f: a - 12, file: "whoosh", volume: 0.35 })),
    ...plan.scenes.flatMap((s) =>
      s.kind === "figure" || s.kind === "lender"
        ? [{ f: s.from, file: "ding", volume: 0.2 }]
        : s.kind === "cue" && s.cue.kind === "points"
          ? s.cue.items.map((it) => ({
              f: at(it.atMs),
              file: "mouse-click",
              volume: 0.35,
            }))
          : [],
    ),
  ];
  return (
    <>
      {hits.map((h) => (
        <Sequence
          key={`${h.file}${h.f}`}
          from={Math.max(0, h.f)}
          durationInFrames={fps * 2}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${h.file}.wav`)}
            volume={() => h.volume}
          />
        </Sequence>
      ))}
    </>
  );
};

export const StageLayer: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => (
  <>
    <Idle reel={reel} plan={plan} />
    {plan.scenes.map((s) => (
      <Sequence
        key={`${s.kind}${s.from}`}
        from={s.from}
        durationInFrames={Math.max(1, s.to - s.from)}
        layout="none"
      >
        <SceneView scene={s} reel={reel} />
      </Sequence>
    ))}
    <ClassicCues reel={reel} />
    <Sfx reel={reel} plan={plan} />
  </>
);
