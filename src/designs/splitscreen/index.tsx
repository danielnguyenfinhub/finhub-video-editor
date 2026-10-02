// "splitscreen" (Chia đôi, Split Slider): the before/after slider for faceless
// finance videos. Pure motion graphics, no footage: a stage cut in two by a
// gold divider with a round ◀ ▶ handle, a cool steel BEFORE pane on the left
// and a brand-navy AFTER pane with gold light on the right. A compare or a
// change parks the divider far right (all BEFORE), then sweeps it left at the
// reveal with a small overshoot and settles it in the middle: each side its
// TRƯỚC / SAU tag, title, huge value and rows. Idle, the divider is a thin
// wobbling gold line; the hook slides out from behind it; figures are split
// chips; points are rows each swept open by its own handle. Captions sit on a
// dark strip under the stage, keywords gold. Every other cue kind goes to the
// classic MotionTrack, mounted only while it is up.
// Slider.tsx (backdrop, panes, divider), Plan.ts (what the stage shows),
// Scenes.tsx (the stage), Cues.tsx (compare, change, points), Chip.tsx,
// Text.tsx (captions, English line, chapters), numbers.ts.
import { Audio } from "@remotion/media";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
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
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, emphasised } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import {
  ChipLayer,
  FIGURE_WORD,
  LENDER_WORD,
  YEAR_KICKER,
  DATE_KICKER,
} from "./Chip";
import { POINTS_UNIT } from "./numbers";
import { isOwn, usePlan } from "./Plan";
import { StageLayer } from "./Scenes";
import {
  AFTER_TAG,
  BEFORE_TAG,
  Backdrop,
  Divider,
  GOLD,
  MID,
  MUTED,
  Pane,
  STAGE,
  STRIP_TOP,
  StageBox,
  Tag,
  W,
  useFontReady,
} from "./Slider";
import { CHAPTER_WORD, Captions, Chapters, EnglishLine } from "./Text";

// MotionTrack panels sit at top 110 + offset: start them under the chip rail.
const PANEL_OFFSET = STAGE.top + 44 - 110;
const NUMBERS: NumbersLook = {
  change: "swap",
  trendZoom: 0.84,
  trendHeight: 400,
};

// ------------------------------------------------------------------ cover

// The title sits across the stage: muted steel on the BEFORE side, bright on
// the AFTER side; the handle sweeps left and the whole title turns "after".
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
          withinWidth: W - 120,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 92;
  const s = spring({
    frame: frame - 10,
    fps,
    config: { damping: 11, stiffness: 60, mass: 1 },
  });
  const x = MID + (46 - MID) * s;
  const text = (after: boolean) => (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.2,
        textWrap: "balance",
        opacity: ready ? 1 : 0,
      }}
    >
      <div>
        {words.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              color: after ? (hit.has(i) ? GOLD : "#ffffff") : MUTED,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop t={frame} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top - 20,
          left: STAGE.left + MID,
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 20,
          background: "#ffffff",
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <StageBox>
        <Pane side="before" x={x} t={frame}>
          {text(false)}
          <div
            style={{
              position: "absolute",
              left: 28,
              top: 26,
              opacity: interpolate(x, [120, 220], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <Tag text={BEFORE_TAG} />
          </div>
        </Pane>
        <Pane side="after" x={x} t={frame}>
          {text(true)}
          <div style={{ position: "absolute", right: 28, top: 26 }}>
            <Tag text={AFTER_TAG} after />
          </div>
        </Pane>
        <Divider
          x={x}
          knob={1}
          opacity={1}
          nudge={frame < 10 ? 3 + 4 * Math.sin(frame / 3) : 0}
        />
      </StageBox>
      {subtitle ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: SAFE.right - SAFE.left,
            top: STRIP_TOP + 40,
            textAlign: "center",
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.25,
            color: brand.textDim,
            textWrap: "balance",
            opacity: interpolate(frame, [14, 26], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the backdrop is the picture. The voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
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

// ------------------------------------------------------------------ cues

type Sfx = { atMs: number; file: string; volume: number };

// Every cue the slider does not draw as a classic panel, mounted only while
// it is up (its film vignette would otherwise darken the whole video), and
// the sound for the slider's own cues, chapters and stats.
const ClassicCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const sfx: Sfx[] = [
    ...cues.filter(isOwn).flatMap((c): Sfx[] =>
      c.kind === "change"
        ? [{ atMs: c.swapAtMs, file: "whoosh", volume: 0.4 }]
        : c.kind === "compare"
          ? [
              ...c.cards.map((k) => ({
                atMs: k.atMs,
                file: "mouse-click",
                volume: 0.45,
              })),
              {
                atMs: c.cards[1].highlightAtMs ?? c.cards[1].atMs,
                file: "whoosh",
                volume: 0.4,
              },
            ]
          : c.items.map((it) => ({
              atMs: it.atMs,
              file: "mouse-click",
              volume: 0.4,
            })),
    ),
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
  ];
  return (
    <>
      {cues
        .filter((c) => !isOwn(c))
        .map((c) => {
          const from = outFrame(c.fromMs);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
              layout="none"
            >
              <Sequence from={-from} layout="none">
                <MotionTrack
                  reel={{
                    ...reel,
                    edit: { ...reel.edit, cues: [c], chapters: [], stats: [] },
                  }}
                  panelOffset={PANEL_OFFSET}
                  numbers={NUMBERS}
                  leak={false}
                />
              </Sequence>
            </Sequence>
          );
        })}
      {sfx.map((s) => (
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

// ------------------------------------------------------------------ overlay

const Stage: React.FC<{ reel: Reel }> = ({ reel }) => {
  const plan = usePlan(reel);
  // The stage measures Be Vietnam Pro (fitText): wait for it.
  const ready = useFontReady();
  if (!ready) return null;
  return (
    <>
      <StageLayer plan={plan} reel={reel} />
      <ChipLayer chips={plan.chips} />
    </>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => (
  <>
    <Stage reel={reel} />
    <ClassicCues reel={reel} />
    <Chapters reel={reel} />
    <Captions reel={reel} keywords={keywords} />
    <EnglishLine reel={reel} />
    <LogoMark talkFrames={talkFrames} />
  </>
);

export const splitscreen: Design = {
  id: "splitscreen",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    BEFORE_TAG,
    AFTER_TAG,
    FIGURE_WORD,
    YEAR_KICKER,
    DATE_KICKER,
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
