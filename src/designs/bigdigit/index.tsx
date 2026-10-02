// "bigdigit" (Số lớn, Big Number): a faceless rate-alert flash as a Swiss,
// editorial page. White paper on a strict grid, navy ink, the logo blue as
// the one accent, hairline rules and small caps. ONE enormous number owns the
// stage at a time: the hook assembles digit by digit, a `change` rolls each
// digit of the old rate into the new one (hollow to black) with a thick arrow
// in the data's direction, the date stat is set in the same giant type, other
// figures at half size. Points are a numbered list, compare a two-column
// table, trend a hairline line chart. Paper.tsx (grid, type, number motions),
// Cues.tsx (own cue kinds), Stage.tsx (who holds the stage, when).
import type { TikTokPage } from "@remotion/captions";
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
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
import { Outro } from "../classic/Outro";
import { BEFORE } from "./Cues";
import {
  ACCENT,
  CAPTION_BOTTOM,
  Caps,
  HAIR,
  HEADER_RULE,
  HEADER_W,
  INK,
  LOWER_RULE,
  PaperBackdrop,
  Rule,
  SLATE,
  STAGE,
  W,
  ease,
  useFontReady,
} from "./Paper";
import {
  FIGURE_KICKER,
  HOOK_KICKER,
  LENDER_KICKER,
  LENDER_SUB,
  StageTrack,
  YEAR_KICKER,
  DATE_KICKER,
} from "./Stage";
import { busySpans, planOf } from "./Plan";

const BRAND_KICKER = "FINANCE HUB";
const CHAPTER_WORD = "PHẦN";
const CAPTION_SIZE = 50;
const IDLE_SIZE = 76;
const IDLE_BOTTOM = STAGE.bottom - 40;
const RAMP_FRAMES = 8;

// ------------------------------------------------------------------ cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const ready = useFontReady("bigdigit cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        128,
        fitText({
          text: title,
          withinWidth: W,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.9,
      )
    : 128;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: INK }}>
      <PaperBackdrop t={frame} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: SAFE.left,
          padding: "14px 22px",
          background: "#ffffff",
          border: `2px solid ${HAIR}`,
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <Rule top={HEADER_RULE} weight={4} at={2} />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: W,
          top: HEADER_RULE + 50,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.12,
          letterSpacing: "-0.01em",
          opacity: ready ? 1 : 0,
        }}
      >
        {words.map((w, i) => {
          const k = interpolate(frame - 6 - i * 3, [0, 12], [0, 1], {
            ...clamp,
            easing: ease,
          });
          return (
            <span
              key={`${w}${i}`}
              style={{
                display: "inline-block",
                marginRight: "0.24em",
                color: hit.has(i) ? ACCENT : INK,
                opacity: k,
                transform: `translateY(${(1 - k) * 40}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <Rule top={LOWER_RULE} weight={2} color={HAIR} at={10} />
      <Caps
        size={30}
        color={INK}
        style={{
          position: "absolute",
          left: SAFE.left,
          top: LOWER_RULE + 24,
          maxWidth: W,
          opacity: interpolate(frame, [14, 24], [0, 1], clamp),
        }}
      >
        {subtitle}
      </Caps>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the paper is the picture; the voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBackdrop t={seg.outFrom + frame} />
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

// ------------------------------------------------------------------ header

// Top-left: the chapter (or the brand) in small caps and the chapter title
// (or the video title) in black; a thick rule under it that fills with the
// talk's progress in the accent. The logo tile's place is top-right.
const Header: React.FC<{ reel: Reel; talkFrames: number }> = ({
  reel,
  talkFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("bigdigit header: Be Vietnam Pro");
  const at = outFrameOf(reel.timeline, fps);
  const chapters = (reel.edit.chapters ?? []).map((c, i) => ({
    ...c,
    i,
    from: at(c.atMs),
  }));
  const now = chapters.filter((c) => c.from <= frame).pop();
  const since = now ? frame - now.from : frame;
  const k = interpolate(since, [0, 12], [0, 1], { ...clamp, easing: ease });
  const title = now?.title ?? reel.edit.title;
  const size = ready
    ? fitTextOnNLines({
        text: title,
        maxLines: 1,
        maxBoxWidth: HEADER_W,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: 40,
      }).fontSize
    : 40;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top + 8,
          width: HEADER_W,
          fontFamily: FONT,
          color: INK,
          opacity: k,
          transform: `translateY(${(1 - k) * 16}px)`,
        }}
      >
        <Caps size={26} color={now ? ACCENT : SLATE}>
          {now
            ? `${CHAPTER_WORD} ${String(now.i + 1).padStart(2, "0")}`
            : BRAND_KICKER}
        </Caps>
        <div
          style={{
            marginTop: 6,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>
      <Rule top={HEADER_RULE} weight={4} />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: HEADER_RULE,
          height: 4,
          width: W * Math.min(1, frame / Math.max(1, talkFrames)),
          background: ACCENT,
        }}
      />
      <Rule top={LOWER_RULE} weight={2} color={HAIR} at={6} />
    </>
  );
};

// ------------------------------------------------------------------ captions

// Calm, left-aligned, semi-bold; words not yet said in slate, keywords and
// numbers in the accent, the word being said underlined.
// While the stage is free the page moves up onto it, larger.
const useBusyLevel = (reel: Reel, talkFrames: number): number[] => {
  const { fps } = useVideoConfig();
  return useMemo(() => {
    const l = new Array<number>(talkFrames + 1).fill(0);
    const spans = busySpans(planOf(reel, fps), Boolean(reel.edit.hook));
    for (const [a, b] of spans)
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
  const busy = ease(level[from + frame] ?? 1);
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const k = interpolate(frame, [0, 8], [0, 1], { ...clamp, easing: ease });
  return (
    <CaptionZone
      bottom={interpolate(busy, [0, 1], [IDLE_BOTTOM, CAPTION_BOTTOM])}
      align="flex-start"
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: interpolate(busy, [0, 1], [IDLE_SIZE, CAPTION_SIZE]),
          lineHeight: 1.3,
          color: INK,
          opacity: k,
          transform: `translateY(${(1 - k) * 12}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const spoken = nowMs >= t.fromMs;
          const current = spoken && nowMs < t.toMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  color: hit.has(i) ? ACCENT : spoken ? INK : SLATE,
                  opacity: spoken ? 1 : 0.5,
                  fontWeight: hit.has(i) ? 800 : 600,
                  textDecoration: current ? "underline" : undefined,
                  textDecorationThickness: 4,
                  textUnderlineOffset: 10,
                  textDecorationColor: ACCENT,
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

// The English line (edit.json subtitles), small and slate on SAFE.bottom.
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
            <CaptionZone align="flex-start">
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 25,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: SLATE,
                  borderLeft: `4px solid ${ACCENT}`,
                  paddingLeft: 14,
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
  return (
    <>
      <Header reel={reel} talkFrames={talkFrames} />
      <StageTrack reel={reel} />
      <PagedCaptions
        reel={reel}
        combineWithinMs={1100}
        tailMs={300}
        render={(page, from) => (
          <Page page={page} keywords={keywords} from={from} level={level} />
        )}
      />
      <EnglishLine reel={reel} />
      <LogoMark
        talkFrames={talkFrames}
        style={{
          borderRadius: 0,
          border: `2px solid ${HAIR}`,
          boxShadow: "none",
        }}
      />
    </>
  );
};

export const bigdigit: Design = {
  id: "bigdigit",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    BRAND_KICKER,
    CHAPTER_WORD,
    HOOK_KICKER,
    FIGURE_KICKER,
    YEAR_KICKER,
    DATE_KICKER,
    LENDER_KICKER,
    LENDER_SUB,
    BEFORE,
    // classic Outro and MotionTrack panels
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
