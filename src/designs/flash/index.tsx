// "flash" (Tin nhanh, Breaking Flash): a rate-alert reel as a breaking-news
// flash. Pure motion graphics, no footage: a deep navy frame, a thick gold
// alert bar slammed in at the top of SAFE ("CẬP NHẬT LÃI SUẤT", pulsing dot;
// chapters swap into it), diagonal gold/navy hazard stripes sweeping through
// on every beat, a light-sweep glint over headlines. The `change` cue is the
// star (old value struck, new value slams in with a shockwave), then the hook
// flash-card and the date card. Captions on a navy strip under the stage.
// Frame.tsx (look), Stage.tsx (hook, figures, banks), Change.tsx, Cues.tsx
// (trend, points, compare), Captions.tsx.
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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
import { FONT, LOGO, clamp, emphasised } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { Captions, EnglishLine } from "./Captions";
import { AlertBar } from "./AlertBar";
import { VS } from "./Compare";
import { FlashCueTrack, cueBeats, isOwnCue } from "./Cues";
import { FIGURE_TAG, YEAR_KICKER, DATE_KICKER } from "./Figures";
import { POINTS_UNIT } from "./diff";
import {
  ALERT_LABEL,
  CHAPTER_WORD,
  DIM,
  FlashBackdrop,
  GOLD,
  Glint,
  STAGE,
  STRIPES,
  NAVY,
  Sweeps,
  W,
  punch,
  shake,
  useFontReady,
} from "./Frame";
import {
  FlashStage,
  HOOK_TAG,
  LENDER_SUB,
  LENDER_TAG,
  stageBeats,
} from "./Stage";

// ------------------------------------------------------------------ cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("flash cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        112,
        fitText({
          text: title,
          withinWidth: W - 60,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.8,
      )
    : 112;
  const p = punch(frame, fps, 10);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <FlashBackdrop t={frame} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: SAFE.left,
          padding: "14px 24px",
          borderRadius: 20,
          background: "#fff",
          boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <AlertBar t={frame} top={640} right={SAFE.right} />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: W,
          top: 780,
          opacity: ready ? p.opacity : 0,
          transform: `${shake(frame, 10)} scale(${p.scale})`,
        }}
      >
        <Glint first={18} every={40}>
          <div
            style={{
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.18,
              color: "#fff",
              textWrap: "balance",
              padding: "0 6px",
            }}
          >
            {words.map((w, i) => (
              <span
                key={`${w}${i}`}
                style={{ color: hit.has(i) ? GOLD : "#fff" }}
              >
                {i ? " " : ""}
                {w}
              </span>
            ))}
          </div>
        </Glint>
        <div
          style={{
            marginTop: 28,
            fontSize: 42,
            fontWeight: 800,
            color: DIM,
            opacity: interpolate(frame, [18, 26], [0, 1], clamp),
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: -100,
          right: -100,
          top: 1330,
          height: 64,
          background: STRIPES(GOLD, NAVY, 26),
          backgroundPosition: `${(frame * 5) % 74}px 0`,
          transform: "rotate(-4deg)",
          opacity: 0.9,
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the navy flash frame, {behind}, and the voice (foreground.webm
// is fully transparent; source.mp4's picture is never shown).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FlashBackdrop t={seg.outFrom + frame} />
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

// ------------------------------------------------------------------ overlay

// MotionTrack's chapter and stat sounds, for videos that don't mount it.
const StatChapterSfx: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const sfx = [
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
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, at(s.atMs))}
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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Kinds this design doesn't draw go to the classic panels on the stage,
  // mounted only when such a cue exists (its film finish darkens corners).
  const others = (reel.edit.cues ?? []).filter((c) => !isOwnCue(c));
  const beats = [
    ...stageBeats(reel, fps),
    ...cueBeats(reel, fps),
    ...(reel.edit.chapters ?? []).map((c) =>
      outFrameOf(reel.timeline, fps)(c.atMs),
    ),
  ];
  return (
    <>
      <Sweeps beats={beats} />
      {others.length ? (
        <MotionTrack
          reel={{ ...reel, edit: { ...reel.edit, cues: others } }}
          panelOffset={STAGE.top - 110}
          leak={false}
        />
      ) : (
        <StatChapterSfx reel={reel} />
      )}
      <FlashStage reel={reel} keywords={keywords} talkFrames={talkFrames} />
      <FlashCueTrack reel={reel} />
      <AlertBar reel={reel} t={frame} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const flash: Design = {
  id: "flash",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    ALERT_LABEL,
    CHAPTER_WORD,
    HOOK_TAG,
    FIGURE_TAG,
    YEAR_KICKER,
    DATE_KICKER,
    LENDER_TAG,
    LENDER_SUB,
    POINTS_UNIT,
    VS,
    // classic Outro and MotionTrack panels (other cue kinds)
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
