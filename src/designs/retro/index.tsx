// "retro" (Hoài cổ): a 60s–80s screen-printed pop-art poster for faceless
// videos. Pure motion graphics: source.mp4's picture is never shown, only the
// voice plays. A slowly turning sunburst in cream and gold, halftone dots and
// paper grain, a navy poster border; heavy navy type with a hard shadow and a
// gold plate printed a few px off. Numbers sit in spinning starburst stickers,
// banks on a white coupon, points are rubber stamps, compare is two poster
// panels with a starburst VS. Captions are navy words on a cream ribbon,
// keywords in blue ink blocks. Print.tsx (kit), Stage.tsx (hook, figures,
// lender, chapter, English line), Cues.tsx (points, compare).
import type { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  random,
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
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, clamp, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { busyFrames } from "../faceless/Stage";
import { RetroCueTrack, drawnHere } from "./Cues";
import {
  BLUE,
  CREAM,
  GOLD,
  INK,
  NAVY,
  PrintBackdrop,
  Ribbon,
  StarBadge,
  hardBox,
  printShadow,
  useFontReady,
} from "./Print";
import { ChapterRibbons, EnglishStrip } from "./Bands";
import { ENGLISH_ROOM, STAGE, STAGE_W, StageLayer } from "./Stage";

const RAMP_FRAMES = 8;
const BIG = 70;
const SMALL = 50;
// The caption ribbon's bottom edge: mid-stage when the stage is free, just
// above the English strip while something holds the stage.
const FREE_BOTTOM = (STAGE.top + STAGE.bottom) / 2 + BIG;
const LOW_BOTTOM = SAFE.bottom - ENGLISH_ROOM;

// ------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("retro cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        112,
        fitText({
          text: title,
          withinWidth: STAGE_W - 80,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.8,
      )
    : 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <PrintBackdrop />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 22px",
          borderRadius: 16,
          background: brand.card,
          border: `5px solid ${INK}`,
          boxShadow: hardBox(8),
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      {ready ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: STAGE_W,
            top: STAGE.top + 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: size,
              fontWeight: 900,
              lineHeight: 1.12,
              textWrap: "balance",
              transform: "rotate(-3deg)",
            }}
          >
            {words.map((w, i) => {
              const p = enter(frame, fps, 4 + i * 3);
              return (
                <span
                  key={`${w}${i}`}
                  style={{
                    display: "inline-block",
                    marginRight: "0.24em",
                    color: hit.has(i) ? BLUE : INK,
                    textShadow: printShadow(size / 16, size / 30),
                    opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
                    transform: `scale(${interpolate(p, [0, 1], [1.6, 1])})`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
          <Ribbon
            color={NAVY}
            style={{
              marginTop: 50,
              maxWidth: STAGE_W - 130,
              opacity: interpolate(frame, [14, 22], [0, 1], clamp),
              transform: "rotate(1.5deg)",
            }}
          >
            <div
              style={{
                padding: "16px 34px",
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.25,
                color: CREAM,
                textAlign: "center",
                textWrap: "balance",
              }}
            >
              {subtitle}
            </div>
          </Ribbon>
          <div style={{ marginTop: 50, display: "flex", gap: 60 }}>
            {[0, 1, 2].map((i) => (
              <StarBadge
                key={i}
                r={i === 1 ? 62 : 44}
                fill={i === 1 ? GOLD : CREAM}
                delay={20 + i * 4}
                spin={i === 1 ? 0.9 : -0.7}
                points={i === 1 ? 18 : 12}
              />
            ))}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- talk

// No footage: the poster, the design's Behind layer (none), and the voice.
// foreground.webm is fully transparent, so no one is on screen.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PrintBackdrop t={seg.outFrom + frame} />
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

// ------------------------------------------------------------- captions

const Word: React.FC<{
  text: string;
  hit: boolean;
  spoken: boolean;
  pop: number;
}> = ({ text, hit, spoken, pop }) => (
  <span
    style={{
      display: "inline-block",
      // A keyword or number is printed in a blue ink block.
      padding: hit ? "0 0.14em" : undefined,
      margin: hit ? "0.04em 0.02em" : undefined,
      borderRadius: 6,
      background: hit ? BLUE : undefined,
      boxShadow: hit ? `4px 4px 0 ${GOLD}` : undefined,
      color: hit ? CREAM : INK,
      textShadow: hit ? `2px 2px 0 ${INK}` : `3px 3px 0 ${GOLD}`,
      opacity: spoken ? 1 : 0.38,
      transform: `scale(${pop})`,
    }}
  >
    {text}
  </span>
);

const Page: React.FC<{
  page: TikTokPage;
  keywords: string[];
  from: number;
  level: number[];
}> = ({ page, keywords, from, level }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const low = level[from + frame] ?? 0;
  const size = interpolate(low, [0, 1], [BIG, SMALL]);
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const nowMs = page.startMs + (frame / fps) * 1000;
  const inP = enter(frame, fps);
  const tilt = (random(page.startMs) - 0.5) * 3;
  return (
    <CaptionZone bottom={interpolate(low, [0, 1], [FREE_BOTTOM, LOW_BOTTOM])}>
      <Ribbon
        style={{
          maxWidth: STAGE_W - 110,
          opacity: interpolate(inP, [0, 0.4], [0, 1], clamp),
          transform: `scaleX(${interpolate(inP, [0, 1], [0.7, 1])}) rotate(${tilt}deg)`,
        }}
        tails={size * 0.8}
      >
        <div
          style={{
            padding: `${size * 0.26}px ${size * 0.45}px`,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.3,
          }}
        >
          {page.tokens.map((t, i) => {
            const start = Math.round(((t.fromMs - page.startMs) / 1000) * fps);
            const pop = interpolate(
              frame - start,
              [0, 4, 10],
              [1, 1.16, 1],
              clamp,
            );
            return (
              <span key={t.fromMs}>
                {i > 0 && t.text.startsWith(" ") ? " " : ""}
                <Word
                  text={t.text.trim()}
                  hit={hit.has(i)}
                  spoken={nowMs >= t.fromMs}
                  pop={pop}
                />
              </span>
            );
          })}
        </div>
      </Ribbon>
    </CaptionZone>
  );
};

// Per talk frame: 1 while something holds the stage, ramped each way.
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

// ------------------------------------------------------------- overlay

// MotionTrack's sounds for stats and chapters, for videos that don't mount it.
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
  const level = useBusyLevel(reel, talkFrames);
  // Cue kinds this design doesn't draw go to the classic MotionTrack (navy
  // panels read on the cream), on the stage. Mounted only when such a cue
  // exists: its film finish darkens the poster's corners.
  const others = (reel.edit.cues ?? []).filter((c) => !drawnHere(c));
  return (
    <>
      {others.length ? (
        <MotionTrack
          reel={{ ...reel, edit: { ...reel.edit, cues: others } }}
          panelOffset={STAGE.top - 110}
          leak={false}
        />
      ) : (
        <StatChapterSfx reel={reel} />
      )}
      <StageLayer reel={reel} />
      <RetroCueTrack reel={reel} />
      <ChapterRibbons reel={reel} />
      <PagedCaptions
        reel={reel}
        combineWithinMs={1100}
        tailMs={300}
        render={(page, from) => (
          <Page page={page} keywords={keywords} from={from} level={level} />
        )}
      />
      <EnglishStrip reel={reel} />
      <LogoMark
        talkFrames={talkFrames}
        style={{
          borderRadius: 16,
          border: `5px solid ${INK}`,
          boxShadow: hardBox(8),
        }}
      />
    </>
  );
};

export const retro: Design = {
  id: "retro",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "CON SỐ",
    "ĐANG NHẮC TỚI",
    "PHẦN",
    "VS",
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
