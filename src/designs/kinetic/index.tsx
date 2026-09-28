// "kinetic" (Chữ động): typography is the picture. A faceless video (voice
// only, scripts/voice-video.mjs), no footage at all: the frame is flat brand
// colour blocks that wipe across on every beat (blocks.tsx), captions are
// huge slammed words (Captions.tsx), a number is a GIANT counter, the hook a
// stack of slammed lines (Stage.tsx), points and compare are drawn in the same
// type (Cues.tsx). Best for myths vs facts, lists, hooks, short punchy clips.
import type React from "react";
import { useCallback, useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fitText } from "@remotion/layout-utils";
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
import { FONT, LOGO, clamp } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { Outro } from "../classic/Outro";
import {
  BlockBackdrop,
  GOLD,
  H,
  NAVY,
  SAFE_W,
  W,
  useBlocks,
  useFontReady,
} from "./blocks";
import { EnglishLine, KineticCaptions } from "./Captions";
import { KineticCueTrack, SplitLayer, splitSpans } from "./Cues";
import { Stack, StageLayer } from "./Stage";

const LENDER_LABEL = "ĐANG NHẮC TỚI";
const CHAPTER_WORD = "PHẦN";
const VS = "VS";

// Upper-case title lines of at most 13 characters, split between words.
const titleLines = (title: string): string[] => {
  const out: string[] = [];
  for (const w of title
    .toLocaleUpperCase("vi-VN")
    .split(/\s+/)
    .filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && `${last} ${w}`.length <= 13)
      out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
};

const COVER_SLAB = 1330;

const Cover: React.FC<CoverProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("cover");
  const lines = useMemo(() => titleLines(title), [title]);
  const sub = useMemo(
    () =>
      ready
        ? Math.min(
            52,
            fitText({
              text: subtitle,
              withinWidth: SAFE_W,
              fontFamily: FONT,
              fontWeight: 800,
            }).fontSize,
          )
        : 0,
    [ready, subtitle],
  );
  const slab = interpolate(frame, [0, 10], [H, COVER_SLAB], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const logo = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: NAVY.bg, fontFamily: FONT }}>
      <AbsoluteFill
        style={{
          background: GOLD.bg,
          clipPath: `polygon(0 ${slab + 26}px, ${W}px ${slab - 26}px, ${W}px ${H}px, 0 ${H}px)`,
        }}
      />
      {ready ? (
        <>
          <div
            style={{
              position: "absolute",
              left: SAFE.left,
              width: SAFE_W,
              top: SAFE.top + 170,
              height: COVER_SLAB - 60 - (SAFE.top + 170),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Stack
              lines={lines}
              s={NAVY}
              max={150}
              start={2}
              every={4}
              gap={14}
              boxed={(i) => /\d/.test(lines[i])}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: SAFE.left,
              width: SAFE_W,
              top: COVER_SLAB + 50,
              textAlign: "center",
              fontSize: sub,
              fontWeight: 800,
              lineHeight: 1.2,
              color: GOLD.ink,
              whiteSpace: "nowrap",
              opacity: interpolate(frame, [12, 20], [0, 1], clamp),
            }}
          >
            {subtitle}
          </div>
        </>
      ) : null}
      {/* Same size and place as the talk's LogoMark. */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          right: W - SAFE.right,
          padding: "14px 22px",
          borderRadius: 22,
          background: brand.card,
          transform: `scale(${logo})`,
          transformOrigin: "top right",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

// No footage: the blocks (Behind) under the voice, whose foreground.webm is
// fully transparent.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill style={{ background: NAVY.bg }}>
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

const Behind: React.FC<OverlayProps> = ({ reel, talkFrames }) => (
  <BlockBackdrop reel={reel} talkFrames={talkFrames} />
);

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const blocks = useBlocks(reel, talkFrames);
  const spans = useMemo(() => splitSpans(reel, fps), [reel, fps]);
  const splitAt = useCallback(
    (g: number) => spans.some(([a, b]) => g >= a && g < b),
    [spans],
  );
  return (
    <>
      <SplitLayer reel={reel} blocks={blocks} />
      <KineticCueTrack reel={reel} blocks={blocks} vsText={VS} />
      <StageLayer
        reel={reel}
        blocks={blocks}
        lenderLabel={LENDER_LABEL}
        chapterWord={CHAPTER_WORD}
      />
      <KineticCaptions
        reel={reel}
        keywords={keywords}
        blocks={blocks}
        splitAt={splitAt}
      />
      <EnglishLine reel={reel} blocks={blocks} splitAt={splitAt} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const kinetic: Design = {
  id: "kinetic",
  Cover,
  Talk,
  Behind,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    LENDER_LABEL,
    CHAPTER_WORD,
    VS,
    // classic Outro and MotionTrack panels (other cue kinds).
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
