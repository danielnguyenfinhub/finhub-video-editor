// "ticker" (Bảng điện, market board): a faceless finance video as a live
// exchange board. Pure motion graphics, no footage: near-black navy with LED
// dots and scanlines, a status bar, split-flap numbers, departure-board points,
// a bid/ask compare board and a ticker tape of the video's own headlines.
// Captions sit big on the board when the stage is free and drop to an LED
// strip above the tape while the hook, a figure, a bank or a cue holds it.
import type { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
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
import { HOOK_FRAMES, LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, emphasised } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { busyFrames } from "../faceless/Stage";
import {
  AMBER,
  BoardBackdrop,
  CHAPTER_WORD,
  FlipText,
  INK,
  Led,
  SKY,
  STAGE,
  STATUS_LABEL,
  STRIP_BOTTOM,
  StatusBar,
  TAPE,
  TAPE_LABEL,
  Tape,
  tapeItems,
  useFontReady,
} from "./Board";
import { BoardCueTrack, VS, onBoard } from "./Cues";
import {
  FIGURE_KICKER,
  HOOK_KICKER,
  LENDER_KICKER,
  LENDER_SUB,
  TickerStage,
  YEAR_KICKER,
  DATE_KICKER,
} from "./Stage";

const RAMP_FRAMES = 8;
const BIG = 78;
const SMALL = 50;
// Free stage: the page's bottom edge in the lower half of the stage.
const IDLE_BOTTOM = STAGE.bottom - 90;
const NUMBERS: NumbersLook = { change: "swap", trendZoom: 0.84 };

// ------------------------------------------------------------------ cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  // Measure only once Be Vietnam Pro is in: fitText caches its measurement,
  // so a fallback-font width taken on mount would stick for the whole render.
  const ready = useFontReady("ticker cover: Be Vietnam Pro");
  const fontSize = useMemo(
    () =>
      ready
        ? fitText({
            text: title,
            withinWidth: SAFE.right - SAFE.left - 60,
            fontFamily: FONT,
            fontWeight: 900,
          }).fontSize
        : 104 / 1.6,
    [ready, title],
  );
  let offset = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <BoardBackdrop />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 20,
          background: "#fff",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: 690,
          padding: "30px 30px 40px",
          boxSizing: "border-box",
          background: `linear-gradient(180deg, ${INK}, ${brand.background})`,
          borderTop: `8px solid ${AMBER}`,
          borderRadius: 16,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <Led />
          <span
            style={{
              color: AMBER,
              fontWeight: 900,
              fontSize: 30,
              letterSpacing: 4,
            }}
          >
            {STATUS_LABEL}
          </span>
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: Math.min(104, fontSize * 1.6),
            lineHeight: 1.22,
            color: "#fff",
          }}
        >
          {words.map((w, i) => {
            const start = offset;
            offset += Array.from(w).length + 1;
            return (
              <span
                key={`${w}${i}`}
                style={{
                  display: "inline-block",
                  marginRight: "0.25em",
                  color: hit.has(i) ? AMBER : "#fff",
                }}
              >
                <FlipText text={w} start={start * 0.3} stagger={0.3} />
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 42,
            fontWeight: 700,
            color: SKY,
            opacity: interpolate(frame, [8, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {subtitle}
        </div>
      </div>
      <Tape items={[title, subtitle].filter(Boolean)} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the board is the picture. The voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <BoardBackdrop />
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

// ------------------------------------------------------------------ captions

// 1 while something holds the stage, ramped so the captions glide.
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
  const current = page.tokens.filter((t) => nowMs >= t.fromMs).length - 1;
  return (
    <CaptionZone bottom={interpolate(low, [0, 1], [IDLE_BOTTOM, STRIP_BOTTOM])}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.32,
          letterSpacing: "0.01em",
          color: "#fff",
          textAlign: "center",
          padding: "10px 22px",
          borderRadius: 12,
          background: "rgba(6,19,42,0.88)",
          borderBottom: `4px solid ${AMBER}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        {page.tokens.map((t, i) => {
          const spoken = nowMs >= t.fromMs;
          const lit = i === current;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  color: lit ? INK : hit.has(i) ? AMBER : "#fff",
                  background: lit ? AMBER : undefined,
                  borderRadius: 8,
                  padding: lit ? "0.3em 8px 0.04em" : undefined,
                  margin: lit ? "0 -8px" : undefined,
                  boxShadow: lit ? `0 0 24px rgba(255,185,56,0.7)` : undefined,
                  textShadow:
                    !lit && hit.has(i)
                      ? "0 0 16px rgba(255,185,56,0.6)"
                      : undefined,
                  opacity: spoken ? 1 : 0.38,
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

const Captions: React.FC<{
  reel: Reel;
  keywords: string[];
  level: number[];
}> = ({ reel, keywords, level }) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1100}
    tailMs={300}
    render={(page, from) => (
      <Page page={page} keywords={keywords} from={from} level={level} />
    )}
  />
);

// ------------------------------------------------------------------ english

// Under the tape, on SAFE.bottom; small enough that three lines stay below it.
const EnglishLine: React.FC<{ reel: Reel }> = ({ reel }) => {
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
                  fontSize: 28,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: SKY,
                  textAlign: "center",
                  padding: "6px 18px",
                  maxHeight: SAFE.bottom - (TAPE.top + TAPE.height) - 8,
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

// ------------------------------------------------------------------ overlay

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const level = useBusyLevel(reel, talkFrames);
  // Points and compare are drawn on the board; every other cue kind keeps
  // the classic panels (placed from the top of the stage).
  const rest = useMemo(
    () => ({
      ...reel,
      edit: {
        ...reel.edit,
        cues: (reel.edit.cues ?? []).filter((c) => !onBoard(c)),
      },
    }),
    [reel],
  );
  const items = useMemo(() => tapeItems(reel), [reel]);
  return (
    <>
      <StatusBar reel={reel} />
      <MotionTrack
        reel={rest}
        panelOffset={STAGE.top - 110}
        numbers={NUMBERS}
        leak={false}
      />
      <TickerStage reel={reel} />
      <BoardCueTrack reel={reel} />
      <Captions reel={reel} keywords={keywords} level={level} />
      {/* The hook board is the one mover in the hook: the tape starts after it. */}
      <Sequence from={reel.edit.hook ? HOOK_FRAMES : 0} layout="none">
        <Tape items={items} />
      </Sequence>
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const ticker: Design = {
  id: "ticker",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    STATUS_LABEL,
    CHAPTER_WORD,
    TAPE_LABEL,
    HOOK_KICKER,
    FIGURE_KICKER,
    YEAR_KICKER,
    DATE_KICKER,
    LENDER_KICKER,
    LENDER_SUB,
    VS,
    "▌",
    "· · · · · ·",
    "· · ·",
    // classic Outro and MotionTrack panels
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
