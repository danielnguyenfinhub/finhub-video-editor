// "kitchen" — Kitchen Table: Chuyện nhà mình. Warm, unhurried, a story told
// the way you'd tell family: the slowest template on purpose — slow
// crossfades, no punch-ins, sentence-paced captions. Cues and the outro reuse
// classic's (already RG 234-scanned and brand-checked); every chapter
// transition fades.
import { fade } from "@remotion/transitions/fade";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { figuresOf, lenderMentionsOf, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { HEAD_Y, cueRoomStyle, useCueRoom } from "../../mortgage/cueRoom";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf } from "../../mortgage/schema";
import {
  FONT,
  foregroundOf,
  LOGO,
  retryVideoFetch,
} from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { KitchenBackdrop } from "./Backdrop";
import { KitchenHook, MessageBubble } from "./Bubbles";
import { KitchenCaptions } from "./Captions";
import { ChapterCard, LenderTag, Polaroid } from "./Pieces";

const HOOK_FRAMES = 105;
const LABEL = "TÌNH HUỐNG MINH HOẠ";
const NAME = "Daniel Nguyen";
// Cover cut-out scale: head top at 1920 - (1920 - 580) * 0.64 ~ 1060, under
// the subtitle bubble (ends ~900).
const COVER_SCALE = 0.64;

const LogoTile: React.FC<{ height?: number }> = ({ height = 120 }) => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top,
      right: 1080 - SAFE.right,
      padding: "12px 20px",
      borderRadius: 18,
      background: "#fff",
      boxShadow: "0 10px 26px rgba(60,45,20,0.18)",
    }}
  >
    <Img src={LOGO} style={{ height, display: "block" }} />
  </div>
);

// ---------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({ src, coverFrame, title, subtitle }) => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <KitchenBackdrop />
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: SAFE.top,
        color: "#8C8271",
        fontWeight: 800,
        fontSize: 28,
        letterSpacing: 4,
      }}
    >
      {LABEL}
    </div>
    <div style={{ position: "absolute", left: SAFE.left, top: SAFE.top + 170 }}>
      {/* Below the logo tile's footprint (it ends ~y564), so the bubble can
          use the full SAFE width for 2 lines at 64px without ducking under
          it. The old top+60 placement sat title text under the logo. */}
      <MessageBubble fontSize={64} maxWidth={SAFE.right - SAFE.left}>
        {title}
      </MessageBubble>
    </div>
    <div style={{ position: "absolute", left: SAFE.left, top: SAFE.top + 400 }}>
      <MessageBubble
        fontSize={40}
        weight={700}
        padding="16px 26px"
        maxWidth={SAFE.right - SAFE.left}
      >
        {subtitle}
      </MessageBubble>
    </div>
    {/* His whole cut-out, scaled down from the bottom so his head (top
        ~580 at full size) lands below the subtitle bubble instead of being
        cropped: a box from y 940 with objectFit cover cut the top of his
        head off. */}
    <AbsoluteFill>
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
            transform: `scale(${COVER_SCALE})`,
            transformOrigin: "50% 100%",
          }}
        />
      </Freeze>
    </AbsoluteFill>
    <LogoTile />
  </AbsoluteFill>
);

// ---------------------------------------------------------------- talk

const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(
    frame,
    [0, Math.max(1, seg.outDuration)],
    [0, 0.015],
  );
  const zoom = 1.05 + drift;
  const room = useCueRoom(seg);
  return (
    <AbsoluteFill>
      <KitchenBackdrop />
      {behind}
      {/* Makes room under cue panels (golden rule 3b). The zoom is around
          y 1152, so his hair line (HEAD_Y) sits at 1152 - 552 * zoom. */}
      <AbsoluteFill style={cueRoomStyle(room, 1152 - (1152 - HEAD_Y) * zoom)}>
        <PacedVideo
          seg={seg}
          src={src}
          look={look}
          foreground={foreground}
          backdrop="none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "50% 60%",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- behind
// Charts and figures render behind Daniel's cut-out, never over his face.

const Behind: React.FC<OverlayProps> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  return (
    <>
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
        >
          <Polaroid figure={f} />
        </Sequence>
      ))}
    </>
  );
};

// ---------------------------------------------------------------- overlay

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const mentions = lenderMentionsOf(reel);
  const outFrame = outFrameOf(reel.timeline, fps);
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <KitchenCaptions reel={reel} keywords={keywords} />
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
          >
            <LenderTag lender={m.lender} frames={frames} />
          </Sequence>
        );
      })}
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={`${c.atMs}${i}`}
          from={outFrame(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
        >
          <ChapterCard title={c.title} />
        </Sequence>
      ))}
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <KitchenHook hook={reel.edit.hook} left={SAFE.left} top={SAFE.top} />
        </Sequence>
      ) : null}
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const kitchen: Design = {
  id: "kitchen",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition: () => fade(),
  copy: [
    LABEL,
    "Ngân hàng ·",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    NAME,
    "Điện thoại",
    "Email",
    "Website",
  ],
};
