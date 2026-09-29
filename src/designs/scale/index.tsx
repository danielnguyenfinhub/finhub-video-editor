// "scale" (Cán cân, balance scale): before/after money videos as a brass
// balance scale. Pure motion graphics, no footage: a soft navy room with a
// marble floor, and on it the scale. The BEFORE value sits on the left pan,
// the AFTER value on the right, each a stack of coins as tall as its value
// (only when both parse in the same unit); when the second weight lands the
// beam tips towards the heavier side by an angle proportional to the
// difference, a damped spring with the chains swinging and a puff of dust,
// and the difference (as the reel says it, or computed) hangs as a tag from
// the heavier pan. `change` starts balanced with `from` on both pans and
// re-tips when `to` replaces it. The hook lands on one pan; figures and banks
// drop onto a mini pan; points stack as numbered weights; every other cue is
// a classic panel. Captions sit on the dark marble strip, keywords gold.
// Plan.ts (what the scale does when), Scale.tsx (room and rig), Stage.tsx
// (the scale in motion, plaques, tag), MiniPan.tsx (figures, banks, chips),
// Cues.tsx (points, classic panels, sounds), Captions.tsx.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
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
import { FONT, LOGO, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { Outro } from "../classic/Outro";
import { CHAPTER_WORD, Captions, Chapters, EnglishLine } from "./Captions";
import { CueTrack } from "./Cues";
import { HeroLayer, LENDER_LABEL } from "./MiniPan";
import { AFTER, BEFORE, FALL, POINTS, planOf, type Span } from "./Plan";
import { FLOOR, GOLD, ScaleRig, ScaleRoom, useFontReady } from "./Scale";
import { ScaleStage, angleAt } from "./Stage";

// ------------------------------------------------------------------ cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        78,
        fitText({
          text: title,
          withinWidth: SAFE.right - SAFE.left,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 78;
  // A coin stack lands on each pan and the beam rings round level.
  const drop = (at: number) => {
    const k = (frame - at) / FALL;
    return frame < at ? 0 : k < 1 ? 200 * (1 - k * k) : 0;
  };
  const angle = angleAt(
    [
      { at: 2 + FALL, angle: -9 },
      { at: 9 + FALL, angle: 0 },
    ],
    frame,
    fps,
  );
  const pan = (at: number) => ({
    height: frame >= at ? 70 : 0,
    fall: drop(at),
    opacity: 1,
    swing: 0.8 * Math.sin(frame / 20 + at),
  });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <ScaleRoom t={frame} />
      <ScaleRig angle={angle} pans={[pan(2), pan(9)]} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          right: 1080 - SAFE.right,
          padding: "14px 22px",
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: FLOOR + 24,
          textAlign: "center",
          opacity: ready ? 1 : 0,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.15,
            color: "#ffffff",
            textWrap: "balance",
          }}
        >
          {words.map((w, i) => {
            const p = enter(frame, fps, 6 + i * 3);
            return (
              <span
                key={`${w}${i}`}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                  color: hit.has(i) ? GOLD : "#ffffff",
                  opacity: p,
                  transform: `translateY(${interpolate(p, [0, 1], [-40, 0])}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 34,
            fontWeight: 700,
            color: brand.textDim,
            opacity: enter(frame, fps, 14),
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the room is the picture. The voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <ScaleRoom t={seg.outFrom + frame} />
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

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const plan = useMemo(() => planOf(reel, fps), [reel, fps]);
  // The scale dims while points, a classic panel or the mini pan hold the stage.
  const dim = useMemo(
    (): Span[] => [
      ...plan.dim,
      ...plan.heroes.map((h): Span => [h.from, h.to]),
    ],
    [plan],
  );
  // Plaques and weights measure Be Vietnam Pro (fitText): wait for it.
  const ready = useFontReady();
  return (
    <>
      {ready ? (
        <>
          <ScaleStage plan={plan} dim={dim} />
          <HeroLayer heroes={plan.heroes} chips={plan.chips} />
        </>
      ) : null}
      <CueTrack reel={reel} plan={plan} />
      <Chapters reel={reel} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const scale: Design = {
  id: "scale",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    BEFORE,
    AFTER,
    POINTS,
    LENDER_LABEL,
    CHAPTER_WORD,
    "?",
    "▲",
    "▼",
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
