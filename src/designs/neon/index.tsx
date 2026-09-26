// "neon" design: short, punchy "3 điều cần biết" Reels. Fastest of the
// templates — something moves on every beat. Neon Energy backdrop (rotating
// starburst + amber sparks), a glowing audio ring behind Daniel, a countdown-
// ring cover, one-big-glowing-word captions, gauge-ring figures, a flipping
// bank card and a star-wipe between chapters. Cues and outro reuse the
// classic design's (already RG 234-scanned and brand-checked).
import { fitText } from "@remotion/layout-utils";
import type { TransitionPresentation } from "@remotion/transitions";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
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
import {
  figuresOf,
  lenderMentionsOf,
  LOGO_HEIGHT,
  logoVisible,
  SAFE,
} from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf } from "../../mortgage/schema";
import {
  FONT,
  clamp,
  foregroundOf,
  retryVideoFetch,
} from "../../mortgage/style";
import { starWipe } from "../../elements/starWipe";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { NeonAudioRing } from "./AudioRing";
import { NeonBackdrop } from "./Backdrop";
import { NeonCaptions } from "./Captions";
import { NeonTitle } from "./NeonTitle";
import { ChapterCard, GaugeRing, LenderFlipCard, LogoTile } from "./Pieces";

const HOOK_FRAMES = 105;
const RIGHT_EDGE = 1080 - SAFE.right; // px from the right edge to SAFE.right

// ---------------------------------------------------------------- cover

// A ring that fills over the cover's length, no number inside (the reel
// isn't known yet at Cover time) — a decorative countdown-ring look.
const CoverRing: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const size = 150;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: SAFE.top,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: "rotate(-90deg)",
          filter: `drop-shadow(0 0 10px ${brand.highlight})`,
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={brand.highlight}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
    </div>
  );
};

const Cover: React.FC<CoverProps> = ({ src, coverFrame, title }) => {
  const { fontSize } = fitText({
    text: title,
    withinWidth: SAFE.right - SAFE.left,
    fontFamily: FONT,
    fontWeight: 900,
  });
  const size = Math.min(88, fontSize);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <NeonBackdrop />
      <CoverRing />
      {/* Below the logo tile (SAFE.top + its 120 px logo + padding): at
          top 500 the title ran under the logo. */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          right: RIGHT_EDGE,
          top: SAFE.top + LOGO_HEIGHT + 40,
        }}
      >
        <NeonTitle text={title} fontSize={size} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1100,
          overflow: "hidden",
        }}
      >
        <Freeze frame={0}>
          <OffthreadVideo
            src={foregroundOf(src)}
            trimBefore={coverFrame}
            muted
            transparent
            {...retryVideoFetch}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 100%",
            }}
          />
        </Freeze>
      </div>
      <LogoTile />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- talk

const Talk: React.FC<TalkProps> = ({
  seg,
  index,
  src,
  look,
  foreground,
  behind,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch =
    index === 0
      ? 1
      : interpolate(
          spring({ frame, fps, config: { damping: 16, stiffness: 260 } }),
          [0, 1],
          [1.06, 1],
        );
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <NeonBackdrop />
      <NeonAudioRing src={src} frame={seg.srcFrom + frame * seg.rate} />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
        style={{ transform: `scale(${punch})`, transformOrigin: "50% 60%" }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- overlay

const At: React.FC<{
  reel: OverlayProps["reel"];
  atMs: number;
  frames: number;
  children: React.ReactNode;
}> = ({ reel, atMs, frames, children }) => {
  const { fps } = useVideoConfig();
  const from = outFrameOf(reel.timeline, fps)(atMs);
  return (
    <Sequence from={from} durationInFrames={frames} layout="none">
      {children}
    </Sequence>
  );
};

const Hook: React.FC<{ big: string; sub?: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const outP = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const zoom = interpolate(
    spring({ frame, fps, config: { damping: 14, stiffness: 170 } }),
    [0, 1],
    [1.3, 1],
  );
  return (
    <AbsoluteFill style={{ opacity: outP, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          right: RIGHT_EDGE,
          top: SAFE.top,
          textAlign: "center",
          transform: `scale(${zoom})`,
        }}
      >
        <NeonTitle text={big} fontSize={big.length > 10 ? 96 : 130} />
        {sub ? (
          <div
            style={{
              marginTop: 22,
              fontWeight: 800,
              fontSize: 36,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: brand.highlight,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const Overlay: React.FC<OverlayProps> = ({
  reel,
  keywords,
  talkFrames,
  src,
}) => {
  void src; // no waveform element reads the source in this overlay
  const { fps } = useVideoConfig();
  const mentions = lenderMentionsOf(reel);
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <NeonCaptions reel={reel} keywords={keywords} />
      {mentions.map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const frames = Math.max(
          1,
          Math.round(((m.endMs - m.startMs) / 1000) * fps),
        );
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={frames}
            layout="none"
          >
            <LenderFlipCard lender={m.lender} />
          </Sequence>
        );
      })}
      {(reel.edit.chapters ?? []).map((c, i) => (
        <At
          key={c.atMs}
          reel={reel}
          atMs={c.atMs}
          frames={Math.round(2.5 * fps)}
        >
          <ChapterCard index={i} title={c.title} />
        </At>
      ))}
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <Hook big={reel.edit.hook.big} sub={reel.edit.hook.sub} />
        </Sequence>
      ) : null}
      <LogoMark
        talkFrames={talkFrames}
        style={{
          padding: "10px 16px",
          borderRadius: 18,
          boxShadow: `0 0 20px ${brand.highlight}55`,
        }}
      />
    </>
  );
};

// Golden rule 1/3b: figuresOf's gauge rings render BEHIND Daniel's cut-out
// (a halo around his head), never in Overlay.
// LogoMark's tile (the 2000x1215 logo at LOGO_HEIGHT plus 16px padding each
// side, this design's tile style) and a gap: a figure up with the logo stops
// short of it (at SAFE width the number ran under the logo).
const LOGO_TILE_W = Math.round((LOGO_HEIGHT * 2000) / 1215) + 32;
const LOGO_GAP = 20;

const Behind: React.FC<OverlayProps> = ({ reel, talkFrames }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  const withLogo = (from: number, frames: number) =>
    Array.from({ length: frames }, (_, i) => from + i).some((fr) =>
      logoVisible(fr, talkFrames, fps),
    );
  return (
    <>
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          <GaugeRing
            big={f.big}
            label={f.label}
            right={
              withLogo(f.fromFrame, f.frames)
                ? RIGHT_EDGE + LOGO_TILE_W + LOGO_GAP
                : undefined
            }
          />
        </Sequence>
      ))}
    </>
  );
};

export const neon: Design = {
  id: "neon",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition: () =>
    starWipe({
      width: 1080,
      height: 1920,
      points: 6,
    }) as unknown as TransitionPresentation<Record<string, unknown>>,
  copy: [
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
