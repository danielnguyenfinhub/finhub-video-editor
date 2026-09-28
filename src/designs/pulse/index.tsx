// "pulse" (Nhịp, Pulse Line): a rate-alert flash as a live line chart. Pure
// motion graphics, no footage: a navy monitor with a faint grid and a y-axis,
// and a bright gold line that is always drawing left to right. Between beats
// it is a heart-monitor sweep with no values on it (decoration, never data);
// the hook and every figure SPIKE the line up into the number; a `change`
// cue runs flat at the old level and steps to the new one at swapAtMs, both
// levels on dashed guides with their values, the gap shaded; a `trend` cue
// draws the real points with every value printed; a date drops a vertical
// marker at the right edge. Captions sit under the chart, the English line
// under them. Scope.tsx (monitor, idle trace), Plan.ts (who owns the stage),
// Beats.tsx (hook, figures, banks, chips), Cues.tsx (change, trend).
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
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, clamp, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { Outro } from "../classic/Outro";
import { BeatLayer, LENDER_KICKER } from "./Beats";
import { PulseCueTrack } from "./Cues";
import { panelLevel, planOf } from "./Plan";
import {
  CAPTION_BOTTOM,
  DataLine,
  GOLD,
  HeadDot,
  IdleTrace,
  PLOT,
  SKY,
  ScopeBackdrop,
  Svg,
  clipTo,
  ease,
  fadeOut,
  useFontReady,
  type Pt,
} from "./Scope";

const CHAPTER_WORD = "PHẦN";
const CAPTION_SIZE = 54;

// ------------------------------------------------------------------ cover

const COVER_BASE = 900;
// Two beats and the big spike: the line runs across the monitor.
const COVER_LINE: Pt[] = [
  [PLOT.left, COVER_BASE],
  [300, COVER_BASE],
  [322, COVER_BASE - 60],
  [344, COVER_BASE + 20],
  [366, COVER_BASE],
  [560, COVER_BASE],
  [600, COVER_BASE + 30],
  [650, 640],
  [700, COVER_BASE + 70],
  [740, COVER_BASE],
  [PLOT.right - 20, COVER_BASE],
];

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        104,
        fitText({
          text: title,
          withinWidth: SAFE.right - SAFE.left,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 104;
  const headX = interpolate(frame, [0, 40], [PLOT.left, PLOT.right - 20], {
    ...clamp,
    easing: ease,
  });
  const { d, head } = clipTo(COVER_LINE, headX);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <ScopeBackdrop t={frame} />
      <Svg>
        <DataLine d={d} width={8} />
        <HeadDot at={head} t={frame} r={14} />
      </Svg>
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 0 40px rgba(255,185,56,0.35)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: PLOT.bottom - 90,
          textAlign: "center",
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.18,
          color: "#ffffff",
          textWrap: "balance",
          opacity: ready ? 1 : 0,
        }}
      >
        {words.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              color: hit.has(i) ? GOLD : "#ffffff",
              textShadow: hit.has(i)
                ? "0 0 30px rgba(255,185,56,0.6)"
                : "0 6px 24px rgba(6,19,42,0.9)",
              opacity: enter(frame, fps, 10 + i * 3),
              transform: `translateY(${interpolate(enter(frame, fps, 10 + i * 3), [0, 1], [26, 0])}px)`,
            }}
          >
            {w}
          </span>
        ))}
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            fontWeight: 700,
            color: SKY,
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the monitor is the picture. The voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  const t = seg.outFrom + frame;
  return (
    <AbsoluteFill>
      <ScopeBackdrop t={t} dim={reel ? panelLevel(reel, fps, t) : 0} />
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

// ------------------------------------------------------------------ chapters

const ChapterTag: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        maxWidth: 520,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 24px 12px 18px",
        borderRadius: 14,
        background: "rgba(6,19,42,0.85)",
        borderLeft: `6px solid ${GOLD}`,
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, Math.round(2.5 * fps))),
        transform: `translateX(${interpolate(p, [0, 1], [-50, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          flex: "0 0 16px",
          borderRadius: "50%",
          background: GOLD,
          boxShadow: `0 0 14px ${GOLD}`,
          opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 6)),
        }}
      />
      <div style={{ fontWeight: 800, fontSize: 32, lineHeight: 1.25 }}>
        <span
          style={{
            display: "block",
            fontSize: 24,
            letterSpacing: 4,
            color: GOLD,
          }}
        >
          {CHAPTER_WORD} {index}
        </span>
        <span style={{ color: "#ffffff" }}>{title}</span>
      </div>
    </div>
  );
};

const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <ChapterTag index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------------ captions

const Page: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const p = enter(frame, fps);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: CAPTION_SIZE,
          lineHeight: 1.25,
          textWrap: "balance",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const now = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          const key = hit.has(i);
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  color: key ? GOLD : "#ffffff",
                  opacity: spoken ? 1 : 0.4,
                  textShadow: now
                    ? `0 0 16px ${key ? GOLD : "#ffffff"}, 0 0 38px rgba(255,185,56,0.75)`
                    : "0 4px 16px rgba(6,19,42,0.85)",
                  transform: `translateY(${now ? -4 : 0}px)`,
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

const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1100}
    tailMs={300}
    render={(page) => <Page page={page} keywords={keywords} />}
  />
);

// The English line, one per scene (edit.json subtitles), on SAFE.bottom.
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
                  fontSize: 30,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  color: SKY,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "6px 20px",
                  borderTop: `2px solid rgba(255,185,56,0.45)`,
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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const plan = useMemo(
    () => planOf(reel, fps, talkFrames),
    [reel, fps, talkFrames],
  );
  return (
    <>
      <IdleTrace opacity={1 - (plan.busy[frame] ?? 0)} />
      <PulseCueTrack reel={reel} plan={plan} />
      {ready ? <BeatLayer hook={reel.edit.hook} plan={plan} /> : null}
      <Chapters reel={reel} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const pulse: Design = {
  id: "pulse",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    CHAPTER_WORD,
    LENDER_KICKER,
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
