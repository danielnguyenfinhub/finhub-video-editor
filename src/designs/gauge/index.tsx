// "gauge" (Đồng hồ, Rate Gauge): the rate-alert flash. Pure motion graphics
// on a dark navy instrument panel (brushed metal, no footage): a big analogue
// dial is the hero. The hook sweeps the needle to its number; a `change` cue
// puts the needle on the old rate and swings it, with a spring overshoot, to
// the new one at swapAtMs while the readout under the hub counts and the arc
// between old and new lights up; a date stat turns the face into a month
// dial. Other figures that find the dial busy become small readout chips.
// Captions sit in a dark strip under the dial, keywords gold. Every cue kind
// but `change` goes to classic MotionTrack, mounted only while it is up.
// Dial.tsx (backdrop, dial parts), Scenes.tsx (what the dial shows), Stage.tsx
// (captions, English line, chapters).
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
import { FONT, LOGO, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import {
  DialBody,
  GOLD,
  Hub,
  Needle,
  PanelBackdrop,
  STRIP_TOP,
  SWEEP,
  Ticks,
  useFontReady,
} from "./Dial";
import { ChipLayer } from "./Readouts";
import { DialLayer, LENDER_LABEL, usePlan } from "./Scenes";
import { CHAPTER_WORD, Captions, Chapters, EnglishLine } from "./Stage";

// MotionTrack panels sit at top 110 + offset: start them under the LogoMark.
const PANEL_OFFSET = 600 - 110;

// ------------------------------------------------------------------ cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        84,
        fitText({
          text: title,
          withinWidth: SAFE.right - SAFE.left,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 84;
  // The needle wakes: a fast sweep up, then settles into a gentle wobble.
  const wake = spring({
    frame: frame - 4,
    fps,
    config: { damping: 8, stiffness: 70, mass: 1 },
  });
  const angle = -SWEEP - 4 + wake * (SWEEP * 1.25 + 6 * Math.sin(frame / 9));
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <PanelBackdrop t={frame} />
      {/* Dropped a little so the logo tile clears the bezel. */}
      <svg
        width={1080}
        height={1920}
        style={{
          position: "absolute",
          inset: 0,
          transform: "translateY(34px)",
        }}
      >
        <DialBody t={frame} lamp={0.5 + 0.5 * Math.cos(frame / 3)} />
        <Ticks n={8} opacity={1} />
        <Needle angle={angle} />
        <Hub />
      </svg>
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 20,
          background: "#ffffff",
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: STRIP_TOP + 26,
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
              color: hit.has(i) ? GOLD : "#ffffff",
              opacity: enter(frame, fps, 6 + i * 2),
              transform: `translateY(${interpolate(enter(frame, fps, 6 + i * 2), [0, 1], [20, 0])}px)`,
            }}
          >
            {w}
          </span>
        ))}
        {subtitle ? (
          <div
            style={{
              marginTop: 16,
              fontSize: 36,
              fontWeight: 700,
              color: brand.textDim,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the panel is the picture. The voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PanelBackdrop t={seg.outFrom + frame} />
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

// Every cue but `change` as a classic panel, mounted only while it is up (its
// film vignette would otherwise darken the panel for the whole video); the
// sounds MotionTrack would give when mounted whole, plus a whip on each swing.
const ClassicCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const sfx: Sfx[] = [
    ...cues.flatMap((c): Sfx[] =>
      c.kind === "change"
        ? [{ atMs: c.swapAtMs, file: "whip", volume: 0.4 }]
        : [],
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
        .filter((c) => c.kind !== "change")
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
  // The readout measures Be Vietnam Pro (fitText): wait for it.
  const ready = useFontReady();
  if (!ready) return null;
  return (
    <>
      <DialLayer plan={plan} />
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

export const gauge: Design = {
  id: "gauge",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    LENDER_LABEL,
    CHAPTER_WORD,
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
