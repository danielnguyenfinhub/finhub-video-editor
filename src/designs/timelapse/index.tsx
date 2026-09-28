// "timelapse" (Tua nhanh, Time Machine): before -> after as a FAST-FORWARD
// through time, for faceless finance videos. No footage: deep navy, a big
// clock dial in the upper stage and a timeline track under it with a
// playhead. A before value sits on the dial under its own title; at the
// reveal the hands spin (motion-blurred), the playhead races right with
// speed lines, the number scrubs through the values in between (only when
// both ends are clean numbers in one unit, else a blur swap) and lands on the
// after value with a flash, a ⏩ badge flickering meanwhile. Pins on the
// track keep both values; the difference shows only when the data gives one.
// Points are milestones lighting up on the track, figures timestamp chips,
// captions a dark timeline strip. Plan.ts (when), Machine.tsx (dial, track),
// Scenes.tsx (what sits on them), Captions.tsx.
import { Audio } from "@remotion/media";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { HOOK_FRAMES, LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, clamp, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { CHAPTER_WORD, Captions, ChapterFlag, EnglishLine } from "./Captions";
import {
  Backdrop,
  CLOCK,
  Dial,
  DialStreaks,
  FastForward,
  MINI,
  Track,
  flashAt,
  handsAt,
  playheadAt,
  scrubbing,
  useFontReady,
  weight,
} from "./Machine";
import { POINTS_UNIT, isOwnCue, planOf, type Plan, type Scrub } from "./Plan";
import {
  AFTER_WORD,
  BEFORE_WORD,
  ChangeDisc,
  ChangeTitle,
  CompareDisc,
  FigureDisc,
  HookDisc,
  LENDER_WORD,
  LenderDisc,
  MiniFigure,
  MiniLender,
  PointsPins,
  PointsScene,
  Question,
  ScenePins,
  Timecode,
  fade,
} from "./Scenes";

// MotionTrack panels sit at top 110 + offset: under the top slot, over the dial.
const PANEL_OFFSET = CLOCK.y - CLOCK.r - 110;
const NUMBERS: NumbersLook = { change: "swap", trendZoom: 0.84 };
const BADGE = { x: CLOCK.x + 150, y: CLOCK.y - 200 };

// ------------------------------------------------------------------ cover

const COVER_SPIN: Scrub[] = [{ at: 4, dur: 46, turns: 5 }];

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        92,
        fitText({
          text: title,
          withinWidth: SAFE.right - SAFE.left,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.6,
      )
    : 92;
  const speed = scrubbing(COVER_SPIN, frame, 1);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop t={frame} />
      <DialStreaks speed={speed} t={frame} />
      <Dial
        hands={(lag) => handsAt(COVER_SPIN, frame - lag, fps)}
        blur={speed}
        open={1}
        disc={0}
        flash={flashAt([{ ...COVER_SPIN[0], turns: 3 }], frame)}
      />
      <FastForward
        on={scrubbing(COVER_SPIN, frame, 3)}
        t={frame}
        x={BADGE.x}
        y={BADGE.y}
      />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 0 40px rgba(0,100,168,0.6)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: CLOCK.y + CLOCK.r + 60,
          textAlign: "center",
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.18,
          color: "#ffffff",
          textWrap: "balance",
          opacity: ready ? 1 : 0,
        }}
      >
        {words.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              color: hit.has(i) ? brand.highlight : "#ffffff",
              opacity: enter(frame, fps, 4 + i * 2),
              transform: `translateX(${interpolate(enter(frame, fps, 4 + i * 2), [0, 1], [40, 0])}px)`,
            }}
          >
            {w}
          </span>
        ))}
        <div
          style={{
            marginTop: 24,
            fontSize: 38,
            fontWeight: 700,
            color: brand.textDim,
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the backdrop, {behind}, and the voice (foreground.webm is fully
// transparent; source.mp4's picture is never shown).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop t={seg.outFrom + frame} />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ machine

const TimeMachine: React.FC<{ reel: Reel; plan: Plan; talkFrames: number }> = ({
  reel,
  plan,
  talkFrames,
}) => {
  const t = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dimW = weight(plan.dim, t, 10);
  const pointsW = weight(
    plan.scenes.filter((s) => s.kind === "points").map((s) => [s.from, s.to]),
    t,
    12,
  );
  const scene = plan.scenes.find((s) => t >= s.from && t < s.to);
  const hook = reel.edit.hook;
  const hookShow =
    hook && t < HOOK_FRAMES && !scene
      ? interpolate(t, [HOOK_FRAMES - 8, HOOK_FRAMES], [1, 0], clamp)
      : 0;
  const disc = scene && scene.kind !== "points" ? scene : null;
  const discShow = disc ? fade(t, disc.from, disc.to) : 0;
  const figure = plan.figures.find(
    (f) => f.slot === "center" && t >= f.from && t < f.to,
  );
  const lender = plan.lenders.find(
    (l) => l.slot === "center" && t >= l.from && t < l.to,
  );
  const centerW = Math.max(
    hookShow,
    discShow,
    figure ? fade(t, figure.from, figure.to) : 0,
    lender ? fade(t, lender.from, lender.to) : 0,
  );
  const speed = scrubbing(plan.scrubs, t, 1);
  const big = scrubbing(plan.scrubs, t, 3);
  const k = 1 + (MINI.r / CLOCK.r - 1) * pointsW;
  const x = playheadAt(plan, t, talkFrames);
  const at = outFrameOf(reel.timeline, fps);
  const onDisc = (1 - pointsW) * (1 - dimW);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.85 * dimW }}>
        <DialStreaks speed={speed * (1 - pointsW)} t={t} />
        <Dial
          hands={(lag) => handsAt(plan.scrubs, t - lag, fps)}
          blur={speed}
          open={Math.max(1 - centerW, big)}
          disc={centerW}
          flash={flashAt(plan.scrubs, t)}
          style={{
            transform: `translate(${(MINI.x - CLOCK.x) * pointsW}px, ${(MINI.y - CLOCK.y) * pointsW}px) scale(${k})`,
            transformOrigin: "50% 50%",
          }}
        />
        <div style={{ position: "absolute", inset: 0, opacity: onDisc }}>
          <Timecode
            t={t}
            opacity={interpolate(centerW, [0, 0.08], [1, 0], clamp)}
          />
          {hookShow && hook ? (
            <div style={{ opacity: hookShow }}>
              <HookDisc t={t} hook={hook} />
            </div>
          ) : null}
          {disc ? (
            <div style={{ opacity: discShow }}>
              {disc.kind === "compare" ? (
                <CompareDisc t={t} s={disc} />
              ) : (
                <ChangeDisc t={t} s={disc} />
              )}
            </div>
          ) : null}
          {figure ? (
            <div style={{ opacity: fade(t, figure.from, figure.to) }}>
              <FigureDisc t={t} from={figure.from} figure={figure.figure} />
            </div>
          ) : null}
          {lender ? (
            <div style={{ opacity: fade(t, lender.from, lender.to) }}>
              <LenderDisc t={t} from={lender.from} lender={lender.lender} />
            </div>
          ) : null}
        </div>
        <Track x={x} speed={speed} t={t} />
        {disc ? <ScenePins t={t} s={disc} show={discShow} /> : null}
        {scene?.kind === "points" ? (
          <PointsPins t={t} s={scene} show={fade(t, scene.from, scene.to)} />
        ) : null}
        {(reel.edit.chapters ?? []).map((c, i) => (
          <ChapterFlag
            key={c.atMs}
            t={t}
            at={at(c.atMs)}
            index={i + 1}
            title={c.title}
            x={x}
          />
        ))}
      </div>
      {disc?.kind === "change" ? (
        <ChangeTitle s={disc} show={discShow} />
      ) : null}
      {disc?.kind === "compare" && disc.question && t >= disc.question.at ? (
        <Question
          text={disc.question.text}
          show={fade(t, disc.question.at, disc.to)}
        />
      ) : null}
      {scene?.kind === "points" ? (
        <PointsScene t={t} s={scene} show={fade(t, scene.from, scene.to)} />
      ) : null}
      {plan.figures.map((f) =>
        f.slot === "mini" && t >= f.from && t < f.to ? (
          <MiniFigure
            key={`${f.figure.source}${f.from}`}
            t={t}
            figure={f.figure}
            show={fade(t, f.from, f.to)}
          />
        ) : null,
      )}
      {plan.lenders.map((l) =>
        l.slot === "mini" && t >= l.from && t < l.to ? (
          <MiniLender
            key={`${l.lender.name}${l.from}`}
            lender={l.lender}
            show={fade(t, l.from, l.to)}
          />
        ) : null,
      )}
      <FastForward
        on={big * (1 - pointsW) * (1 - dimW)}
        t={t}
        x={BADGE.x}
        y={BADGE.y}
      />
    </AbsoluteFill>
  );
};

// The design's own sounds (MotionTrack only plays its own cues' sounds, and
// is mounted only while one of them is up).
const Sounds: React.FC<{ reel: Reel; plan: Plan }> = ({ reel, plan }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const sfx = [
    ...(reel.edit.chapters ?? []).map((c) => ({
      frame: at(c.atMs - 250),
      file: "whoosh",
      volume: 0.35,
    })),
    ...(reel.edit.stats ?? []).map((s) => ({
      frame: at(s.atMs),
      file: "ding",
      volume: 0.22,
    })),
    ...plan.scenes.flatMap((s) =>
      s.kind === "points"
        ? s.items.map((it) => ({
            frame: it.at,
            file: "mouse-click",
            volume: 0.4,
          }))
        : [{ frame: s.reveal, file: "whoosh", volume: 0.4 }],
    ),
  ];
  return (
    <>
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.frame}`}
          from={Math.max(0, s.frame)}
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

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const t = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const plan = useMemo(() => planOf(reel, fps), [reel, fps]);
  const at = outFrameOf(reel.timeline, fps);
  const others = (reel.edit.cues ?? []).filter((c) => !isOwnCue(c));
  // MotionTrack's grain and vignette only while one of its cues is up.
  const panelUp = others.some(
    (c) => t >= at(c.fromMs) - 1 && t < at(c.toMs) + 1,
  );
  if (!ready) return null;
  return (
    <>
      <TimeMachine reel={reel} plan={plan} talkFrames={talkFrames} />
      {panelUp ? (
        <MotionTrack
          reel={{
            ...reel,
            edit: { ...reel.edit, cues: others, chapters: [], stats: [] },
          }}
          panelOffset={PANEL_OFFSET}
          numbers={NUMBERS}
          leak={false}
        />
      ) : null}
      <Sounds reel={reel} plan={plan} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const timelapse: Design = {
  id: "timelapse",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    BEFORE_WORD,
    AFTER_WORD,
    LENDER_WORD,
    CHAPTER_WORD,
    POINTS_UNIT,
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
