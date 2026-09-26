// "studio": a broadcast-studio look built from the Remotion Elements in
// .claude/elements/ — liquid-contour cover, name lower third, moving-pill
// captions, speech-bubble stat callouts, circle-marked chapter cards and a
// voice-note waveform progress bar. Cues, hook and outro reuse the classic
// design's (they are already RG 234-scanned and brand-checked).
import { fitText } from "@remotion/layout-utils";
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
import { SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { BrandBackdrop, PacedVideo } from "../../mortgage/PacedVideo";
import { FONT, retryVideoFetch } from "../../mortgage/style";
import { toOutMs } from "../../mortgage/timeline";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { HookTitle } from "../classic/Frame";
import { Outro } from "../classic/Outro";
import { Behind } from "./Behind";
import {
  ChapterMark,
  LiquidBg,
  LogoBadge,
  NameTag,
  StatCallout,
  VoiceNote,
} from "./Pieces";
import { PillCaptions } from "./PillCaptions";

const HOOK_FRAMES = 105;
const NAME = "Daniel Nguyen";
const ROLE = "Mortgage Broker · Finance Hub";

// Title on flowing contours above a rounded frame of Daniel.
const Cover: React.FC<CoverProps> = ({ src, coverFrame, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const size = Math.min(
    96,
    fitText({
      text: title,
      withinWidth: 920,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize * 1.9,
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <LiquidBg />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 200,
          color: "#fff",
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.2,
          textAlign: "center",
          opacity: pop,
          transform: `translateY(${(1 - pop) * 40}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: 170,
          top: 620,
          width: 740,
          height: 1000,
          borderRadius: 48,
          overflow: "hidden",
          border: "10px solid #fff",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45)",
          transform: `scale(${interpolate(pop, [0, 1], [0.92, 1])})`,
        }}
      >
        <Freeze frame={0}>
          <OffthreadVideo
            src={src}
            trimBefore={coverFrame}
            muted
            {...retryVideoFetch}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Freeze>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1680,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            padding: "14px 30px",
            borderRadius: 999,
            background: brand.accent,
            color: brand.textOnCard,
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          {subtitle}
        </div>
      </div>
      <LogoBadge />
    </AbsoluteFill>
  );
};

// Full-frame talking head with a small punch-in on each cut.
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
  const base = seg.zoomed ? 1.12 : 1.02;
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        0.05;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* The brand backdrop PacedVideo would draw, then the Behind layer
          (figures, bank logos) under his cut-out: golden rule 3b. */}
      <BrandBackdrop />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
        style={{
          transform: `scale(${base + punch})`,
          // Zoom around his mouth (not his forehead), so a punch-in never
          // pushes the mouth down into the caption band above SAFE.bottom.
          transformOrigin: "50% 60%",
        }}
      />
      {/* Bottom shade so captions and the voice note read over any footage. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 60%, rgba(11,31,61,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const At: React.FC<{
  reel: OverlayProps["reel"];
  atMs: number;
  frames: number;
  children: React.ReactNode;
}> = ({ reel, atMs, frames, children }) => {
  const { fps } = useVideoConfig();
  const at = toOutMs(reel.timeline.segments, atMs, fps);
  return at === null ? null : (
    <Sequence from={Math.round((at / 1000) * fps)} durationInFrames={frames}>
      {children}
    </Sequence>
  );
};

const Overlay: React.FC<OverlayProps> = ({
  reel,
  keywords,
  talkFrames,
  src,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      {(reel.edit.stats ?? []).map((s) => (
        <At
          key={s.atMs}
          reel={reel}
          atMs={s.atMs}
          frames={Math.round((s.durMs / 1000) * fps)}
        >
          <StatCallout big={s.big} label={s.label} />
        </At>
      ))}
      {(reel.edit.chapters ?? []).map((c, i) => (
        <At
          key={c.atMs}
          reel={reel}
          atMs={c.atMs}
          frames={Math.round(2.6 * fps)}
        >
          <ChapterMark index={i} title={c.title} />
        </At>
      ))}
      <PillCaptions reel={reel} keywords={keywords} />
      <VoiceNote src={src} talkFrames={talkFrames} />
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <HookTitle hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      <Sequence from={HOOK_FRAMES} durationInFrames={Math.round(4 * fps)}>
        <NameTag name={NAME} role={ROLE} frames={Math.round(4 * fps)} />
      </Sequence>
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const studio: Design = {
  id: "studio",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    NAME,
    ROLE,
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
