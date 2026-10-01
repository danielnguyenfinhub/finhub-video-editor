// "blueprint" (Bản vẽ): a faceless explainer drawn as an engineer's blueprint
// while the voice explains. Pure motion graphics: source.mp4's picture is
// never shown, only its voice (the transparent foreground PacedVideo).
// Deep navy sheet, panning technical grid, a title block carrying the chapter;
// the stage (Stage.tsx, Cues.tsx) holds the hook, figures, bank logos and the
// points/compare cues, and when it is free an elevation of a house is traced
// on it (Paper.tsx). Captions sit in a fixed annotation band under the stage,
// the English line below them.
import { fitText } from "@remotion/layout-utils";
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
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
import { busyFrames } from "../faceless/Stage";
import { DrawnCueTrack, drawnHere } from "./Cues";
import {
  HouseSketch,
  INK,
  MID_X,
  Paper,
  STAGE,
  Seg,
  TitleBlock,
  Trace,
  draw,
  rectPath,
  tint,
} from "./Paper";
import { StageLayer } from "./Stage";

const RAMP_FRAMES = 10;
// Caption band: bottom-anchored under the stage, above the English line,
// which keeps ENGLISH_ROOM px over SAFE.bottom (1473 - 173 = 1300).
const ENGLISH_ROOM = 173;
const CAPTION_BOTTOM = SAFE.bottom - ENGLISH_ROOM;
const CAPTION_SIZE = 54;

// ---------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const { fontSize } = fitText({
    text: title,
    withinWidth: 780,
    fontFamily: FONT,
    fontWeight: 900,
  });
  const size = Math.min(104, fontSize * 1.7);
  const box = {
    x: SAFE.left + 20,
    y: 760,
    w: SAFE.right - SAFE.left - 40,
    h: 520,
  };
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Paper />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Trace
          d={rectPath(box.x, box.y, box.w, box.h)}
          p={draw(frame, 0, 24)}
          width={4}
        />
        <Trace
          d={rectPath(box.x + 14, box.y + 14, box.w - 28, box.h - 28)}
          p={draw(frame, 6, 30)}
          width={1.5}
          color={tint(INK, 0.5)}
        />
        {/* Width dimension above the frame, height dimension on its left. */}
        <Seg
          x1={box.x}
          y1={box.y - 40}
          x2={box.x + box.w}
          y2={box.y - 40}
          p={draw(frame, 14, 34)}
          width={2}
        />
        <Seg
          x1={box.x}
          y1={box.y - 60}
          x2={box.x}
          y2={box.y - 10}
          p={draw(frame, 12, 20)}
          width={2}
        />
        <Seg
          x1={box.x + box.w}
          y1={box.y - 60}
          x2={box.x + box.w}
          y2={box.y - 10}
          p={draw(frame, 12, 20)}
          width={2}
        />
        <Trace
          d={`M ${MID_X - 120} ${box.y + box.h - 110} H ${MID_X + 120}`}
          p={draw(frame, 30, 44)}
          width={4}
          color={brand.highlight}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: box.x + 40,
          width: box.w - 80,
          top: box.y + 40,
          height: box.h - 170,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          textAlign: "center",
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.18,
          color: brand.text,
        }}
      >
        {words.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{
              marginRight: "0.25em",
              color: hit.has(i) ? brand.highlight : brand.text,
              opacity: interpolate(
                frame,
                [8 + i * 3, 16 + i * 3],
                [0, 1],
                clamp,
              ),
            }}
          >
            {w}
          </span>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: box.x + 40,
          width: box.w - 80,
          top: box.y + box.h - 94,
          textAlign: "center",
          fontSize: 40,
          fontWeight: 800,
          lineHeight: 1.25,
          color: INK,
          opacity: interpolate(frame, [30, 42], [0, 1], clamp),
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 20,
          background: brand.card,
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- talk

// The sheet, the design's Behind layer, and the voice. foreground.webm is
// fully transparent (no one on screen); the footage PacedVideo the faceless
// design dims is left out on purpose: pure motion graphics.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <Paper />
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

// ---------------------------------------------------------------- captions

// A drawing annotation: white text in a thin outlined label box with corner
// ticks; the word being said full white, keywords and numbers amber.
const Page: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const nowMs = page.startMs + (frame / fps) * 1000;
  const inP = interpolate(frame, [0, 6], [0, 1], clamp);
  const tick = 16;
  const corner: React.CSSProperties = {
    position: "absolute",
    width: tick,
    height: tick,
    borderColor: brand.highlight,
    borderStyle: "solid",
    borderWidth: 0,
  };
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          position: "relative",
          maxWidth: SAFE.right - SAFE.left,
          padding: "12px 26px 14px",
          border: `2px solid ${tint(INK, 0.75)}`,
          background: tint(brand.navy, 0.82),
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: CAPTION_SIZE,
          lineHeight: 1.3,
          textAlign: "center",
          color: brand.text,
          opacity: inP,
          transform: `translateY(${interpolate(inP, [0, 1], [10, 0])}px)`,
        }}
      >
        <div
          style={{
            ...corner,
            left: -6,
            top: -6,
            borderLeftWidth: 4,
            borderTopWidth: 4,
          }}
        />
        <div
          style={{
            ...corner,
            right: -6,
            top: -6,
            borderRightWidth: 4,
            borderTopWidth: 4,
          }}
        />
        <div
          style={{
            ...corner,
            left: -6,
            bottom: -6,
            borderLeftWidth: 4,
            borderBottomWidth: 4,
          }}
        />
        <div
          style={{
            ...corner,
            right: -6,
            bottom: -6,
            borderRightWidth: 4,
            borderBottomWidth: 4,
          }}
        />
        {page.tokens.map((t, i) => {
          const spoken = nowMs >= t.fromMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  color: hit.has(i) ? brand.highlight : brand.text,
                  opacity: spoken ? 1 : 0.4,
                }}
              >
                {t.text.trim()}
              </span>
            </span>
          );
        })}
      </div>
    </CaptionZone>
  );
};

// The English line (edit.json subtitles) as a note at the foot of the sheet.
const EnglishNote: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.subtitles ?? []).map((s) => {
        const from = at(s.fromMs);
        return (
          <Sequence
            key={s.fromMs}
            from={from}
            durationInFrames={Math.max(1, at(s.toMs) - from)}
            layout="none"
          >
            <CaptionZone>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 32,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: tint(brand.textDim, 0.95),
                  textAlign: "center",
                  padding: "6px 18px",
                  borderTop: `1.5px dashed ${tint(INK, 0.55)}`,
                  background: tint(brand.navy, 0.55),
                }}
              >
                {s.text}
              </div>
            </CaptionZone>
          </Sequence>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- overlay

// Per talk frame: 1 while the hook, a figure, a logo or a cue holds the
// stage, ramped so the idle house fades instead of cutting.
const useBusyLevel = (reel: Reel, talkFrames: number): number[] => {
  const { fps } = useVideoConfig();
  return useMemo(() => {
    const l = new Array<number>(talkFrames + 1).fill(0);
    for (const [a, b] of busyFrames(reel, fps))
      for (let f = Math.max(0, a); f < Math.min(l.length, b); f++) l[f] = 1;
    const step = 1 / RAMP_FRAMES;
    for (let f = 1; f < l.length; f++) l[f] = Math.min(l[f], l[f - 1] + step);
    for (let f = l.length - 2; f >= 0; f--)
      l[f] = Math.max(l[f], l[f + 1] - step);
    return l;
  }, [reel, fps, talkFrames]);
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const level = useBusyLevel(reel, talkFrames);
  return (
    <>
      <HouseSketch level={level} />
      {/* Kinds this design does not draw keep the classic panels, dropped
          to the top of the stage (under the title block and logo tile). */}
      <MotionTrack
        reel={{
          ...reel,
          edit: {
            ...reel.edit,
            cues: (reel.edit.cues ?? []).filter((c) => !drawnHere(c)),
          },
        }}
        panelOffset={STAGE.top - 110}
        leak={false}
      />
      <DrawnCueTrack reel={reel} />
      <StageLayer reel={reel} />
      <TitleBlock reel={reel} talkFrames={talkFrames} />
      <PagedCaptions
        reel={reel}
        combineWithinMs={900}
        tailMs={300}
        render={(page) => <Page page={page} keywords={keywords} />}
      />
      <EnglishNote reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const blueprint: Design = {
  id: "blueprint",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "TỜ",
    "FINANCE HUB · BẢN VẼ",
    "CHI TIẾT A · ĐANG NHẮC TỚI",
    "VS",
    // classic MotionTrack panels and Outro
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
