// "checklist": a numbered process on notebook paper, one card per step
// (design-space concept "Checklist Card — 5 bước, đừng bỏ bước nào"). The
// STEPS are reel.edit.chapters; chapter n = step n. See src/designs/README.md
// for the contract every design implements.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  Img,
  OffthreadVideo,
  Sequence,
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
import {
  LOGO_HEIGHT,
  SAFE,
  figuresOf,
  lenderMentionsOf,
} from "../../mortgage/golden";
import {
  CUE_HEAD_Y,
  CUE_SCALE,
  HEAD_Y,
  useCueRoom,
} from "../../mortgage/cueRoom";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf } from "../../mortgage/schema";
import {
  FONT,
  LOGO,
  clamp,
  enter,
  foregroundOf,
  retryVideoFetch,
} from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { PagedCaptions } from "../../mortgage/PagedCaptions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { BoxCaptionPage } from "./BoxCaption";
import { NotebookBackdrop } from "./Paper";
import { ProgressTrack, StepColumn, type FrameMention } from "./StepColumn";

const HOOK_FRAMES = 105;
// Daniel on the right at 0.6 (face x ~700-1000), bleeding off the right
// edge, lifted so his chin (source y ~1440 when he leans in) lands at y 1270:
// a two-line caption page (top ~1290) sits under it. The layer's left and
// bottom edges end inside the frame, so they fade out instead of cutting hard.
// The step column (Behind) is x 54-614: at its height (y < 1200) he is head
// and neck only, right of x 690.
const SCALE = 0.6;
const EDGE_FADE =
  "linear-gradient(to right, transparent, #000 14%), linear-gradient(to bottom, #000 80%, transparent)";
// k (useCueRoom, 0..1) eases him to CUE_SCALE (face centre kept at x 850)
// with his hair line (source HEAD_Y) on CUE_HEAD_Y, so his eyebrows clear a
// cue panel (golden rule 3b). He is already small, so the framing moves
// rather than the shared cueRoomStyle shrinking him again.
const framing = (k: number): React.CSSProperties => {
  const s = interpolate(k, [0, 1], [SCALE, CUE_SCALE]);
  const hair = interpolate(
    k,
    [0, 1],
    [1270 - (1440 - HEAD_Y) * SCALE, CUE_HEAD_Y],
  );
  return {
    position: "absolute",
    inset: 0,
    transform: `translate(${850 - 540 * s}px, ${hair - HEAD_Y * s}px) scale(${s})`,
    transformOrigin: "0 0",
    maskImage: EDGE_FADE,
    WebkitMaskImage: EDGE_FADE,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
};
const FRAMING = framing(0);

// ---------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({ src, coverFrame, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 4);
  const size = Math.min(
    100,
    fitText({
      text: title,
      withinWidth: 880,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <NotebookBackdrop />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          right: 1080 - SAFE.right,
          padding: "14px 22px",
          borderRadius: 22,
          background: "#fff",
          boxShadow: "0 10px 30px rgba(11,31,61,0.2)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      {/* The track inside SAFE, left of the logo tile; the title below the
          tile (SAFE.top + 170) so a long title never runs under it. */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          width: 560,
          opacity: p,
        }}
      >
        <ProgressTrack filled={0} />
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top + 170,
          width: 900,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.25,
          color: brand.textOnCard,
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
        }}
      >
        {title}
      </div>
      <div style={FRAMING}>
        <Freeze frame={0}>
          <OffthreadVideo
            src={foregroundOf(src)}
            trimBefore={coverFrame}
            muted
            transparent
            {...retryVideoFetch}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Freeze>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- talk

// Daniel framed by FRAMING (above); the step column sits behind him.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const room = useCueRoom(seg);
  return (
    <AbsoluteFill>
      <NotebookBackdrop />
      {behind}
      <div style={framing(room)}>
        <PacedVideo
          seg={seg}
          src={src}
          look={look}
          foreground={foreground}
          backdrop="none"
        />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- hook

const Hook: React.FC<{
  big: string;
  sub?: string;
  chapterCount: number;
}> = ({ big, sub, chapterCount }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = enter(frame, fps);
  const out = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [0, 1],
    clamp,
  );
  const size = Math.min(
    90,
    fitText({ text: big, withinWidth: 880, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          width: 900,
          fontFamily: FONT,
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [-24, 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: size,
            fontWeight: 900,
            color: brand.textOnCard,
            lineHeight: 1.2,
          }}
        >
          {big}
        </div>
        {sub ? (
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#5B6B80",
              marginTop: 12,
            }}
          >
            {sub}
          </div>
        ) : null}
        <div style={{ marginTop: 24 }}>
          <ProgressTrack filled={0} label={`0/${chapterCount}`} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- captions

const Captions: React.FC<{
  reel: OverlayProps["reel"];
  keywords: string[];
}> = ({ reel, keywords }) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1200}
    render={(page) => <BoxCaptionPage page={page} keywords={keywords} />}
  />
);

// ---------------------------------------------------------------- behind
// Golden rule 3b: figures, chapter cards and the lender polaroid render
// BEHIND Daniel, never over him. Golden rule 4: while a cue card (Overlay's
// MotionTrack) is up, fade the column out so the two never collide — cue
// spans come from reel.edit.cues via outFrameOf, same as MotionTrack uses.
const Behind: React.FC<OverlayProps> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const chapters = (reel.edit.chapters ?? []).map((c) => ({
    title: c.title,
    startFrame: outFrame(c.atMs),
  }));
  const figures = figuresOf(reel, fps);
  const mentions: FrameMention[] = lenderMentionsOf(reel).map((m) => ({
    ...m,
    startFrame: Math.round((m.startMs / 1000) * fps),
  }));
  const cueSpans: [number, number][] = (reel.edit.cues ?? []).map((c) => {
    const from = outFrame(c.fromMs);
    return [from, Math.max(from + 1, outFrame(c.toMs))];
  });
  return (
    <StepColumn
      chapters={chapters}
      figures={figures}
      mentions={mentions}
      cueSpans={cueSpans}
      revealFrame={reel.edit.hook ? HOOK_FRAMES : 0}
    />
  );
};

// ---------------------------------------------------------------- overlay

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const chapterCount = (reel.edit.chapters ?? []).length;
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <Captions reel={reel} keywords={keywords} />
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <Hook
            big={reel.edit.hook.big}
            sub={reel.edit.hook.sub}
            chapterCount={chapterCount}
          />
        </Sequence>
      ) : null}
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const checklist: Design = {
  id: "checklist",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "ví dụ minh hoạ",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Daniel Nguyen",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
