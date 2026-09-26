// "newsroom": news-desk urgency for rate moves, fees and market numbers —
// striped studio backdrop, a slashing "breaking news" bar, glitching hook and
// chapter titles, amber-boxed captions, sliding number cards and a news
// ticker, a wipe-in lender lower-third. Cues, transitions and the outro reuse
// the classic design's (already RG 234-scanned and brand-checked).
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
import {
  figuresOf,
  lenderMentionsOf,
  LOGO_HEIGHT,
  logoVisible,
  SAFE,
  type Figure,
} from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf } from "../../mortgage/schema";
import {
  emphasised,
  FONT,
  foregroundOf,
  retryVideoFetch,
} from "../../mortgage/style";
import { Typewriter } from "../../elements/Typewriter";
import { NewsTicker } from "../../elements/NewsTicker";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { chapterTransition } from "../../mortgage/transitions";
import { NewsroomCaptions } from "./Captions";
import {
  ChapterCard,
  FigureCard,
  GlitchLabel,
  LENDER_BAR_HEIGHT,
  LenderBar,
  LogoTile,
  NewsBar,
  NewsroomBackdrop,
} from "./Pieces";

const HOOK_FRAMES = 105;
const X_LEFT = SAFE.left;
const X_RIGHT = 1080 - SAFE.right;
// NewsTicker's own bar is a fixed 84px tall (src/elements/NewsTicker.tsx).
const TICKER_HEIGHT = 84;
// The ticker stays up this long after a figure's card, then leaves so
// captions can drop back to SAFE.bottom (below Daniel's mouth).
const TICKER_TAIL_S = 3;
// LogoMark's tile: the 2000x1215 logo at LOGO_HEIGHT plus 22px padding each
// side, and a gap, so a figure card up with the logo stops short of it.
const LOGO_TILE_W = Math.round((LOGO_HEIGHT * 2000) / 1215) + 44;
const LOGO_GAP = 20;

// One ticker window per figure, from its card to TICKER_TAIL_S after it, each
// listing only the figures already said (a running list: the old ticker
// showed every number from frame 0, before Daniel said them). A window ends
// where the next begins.
type TickerWindow = { from: number; to: number; items: string[] };
const tickerWindows = (figures: Figure[], fps: number): TickerWindow[] => {
  const sorted = [...figures].sort((a, b) => a.fromFrame - b.fromFrame);
  const windows = sorted.map((f, i) => ({
    from: f.fromFrame,
    to: Math.min(
      f.fromFrame + f.frames + TICKER_TAIL_S * fps,
      sorted[i + 1]?.fromFrame ?? Infinity,
    ),
    items: sorted
      .slice(0, i + 1)
      .flatMap((g) => (g.source === "stat" ? [g.big, g.label] : [g.big])),
  }));
  return windows.filter((w) => w.to > w.from);
};

// Height the bottom bars (ticker, lender bar) take at a talk frame: captions
// sit above it, or on SAFE.bottom when it's 0.
const barHeightAt =
  (windows: TickerWindow[], mentions: { from: number; to: number }[]) =>
  (frame: number) =>
    Math.max(
      windows.some((w) => frame >= w.from && frame < w.to) ? TICKER_HEIGHT : 0,
      mentions.some((m) => frame >= m.from && frame < m.to)
        ? LENDER_BAR_HEIGHT
        : 0,
    );
// The LogoMark now waits for the hook to end (golden.ts logoVisible), so the
// hook uses the full safe width and stays on one line above Daniel's head.
const HOOK_RIGHT = X_RIGHT;

// ---------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({
  src,
  coverFrame,
  title,
  subtitle,
  keywords,
}) => {
  const { fontSize } = fitText({
    text: title,
    withinWidth: 1080 - X_RIGHT - X_LEFT,
    fontFamily: FONT,
    fontWeight: 900,
  });
  const size = Math.min(96, fontSize);
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <NewsroomBackdrop />
      <NewsBar text="TIN NÓNG · TÀI CHÍNH" />
      {/* Title and subtitle in one column under the logo tile (SAFE.top +
          120 px logo + 28 px padding): at top 480 the title ran under it. */}
      <div
        style={{
          position: "absolute",
          left: X_LEFT,
          right: X_RIGHT,
          top: SAFE.top + LOGO_HEIGHT + 50,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.15,
            textAlign: "center",
            color: "#fff",
            textShadow: "0 8px 30px rgba(0,0,0,0.55)",
          }}
        >
          {words.map((w, i) => (
            <span
              key={`${w}${i}`}
              style={{ color: hit.has(i) ? brand.highlight : "#fff" }}
            >
              {w}{" "}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Typewriter text={subtitle} color="#fff" fontSize={44} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 1150,
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
  const base = seg.zoomed ? 1.1 : 1.02;
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        0.05;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <NewsroomBackdrop />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
        style={{
          transform: `scale(${base + punch})`,
          transformOrigin: "50% 30%",
        }}
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
    <Sequence from={from} durationInFrames={frames}>
      {children}
    </Sequence>
  );
};

const Hook: React.FC<{ big: string; sub?: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const outP = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
    },
  );
  return (
    <AbsoluteFill style={{ opacity: outP }}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(11,31,61,0.92) 0%, rgba(11,31,61,0.55) 30%, transparent 48%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: X_LEFT,
          right: HOOK_RIGHT,
          top: SAFE.top,
          textAlign: "center",
        }}
      >
        <GlitchLabel text={big} fontSize={140} />
        {sub ? (
          <div
            style={{
              marginTop: 20,
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 44,
              color: brand.textDim,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// Figures render BEHIND Daniel's cut-out (golden rule: charts never cover his
// face). Same props and frame 0 as Overlay.
const Behind: React.FC<OverlayProps> = ({ reel, talkFrames }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  // A card up at any frame the logo shows stops short of it for its whole
  // hold (no width jump when the logo leaves).
  const withLogo = (f: Figure) =>
    Array.from({ length: f.frames }, (_, i) => f.fromFrame + i).some((fr) =>
      logoVisible(fr, talkFrames, fps),
    );
  return (
    <>
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
        >
          <FigureCard
            figure={f}
            right={withLogo(f) ? X_RIGHT + LOGO_TILE_W + LOGO_GAP : undefined}
          />
        </Sequence>
      ))}
    </>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  const mentions = lenderMentionsOf(reel);
  const windows = tickerWindows(figures, fps);
  const barAt = barHeightAt(
    windows,
    mentions.map((m) => ({
      from: Math.round((m.startMs / 1000) * fps),
      to: Math.round((m.endMs / 1000) * fps),
    })),
  );
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      <NewsroomCaptions reel={reel} keywords={keywords} barAt={barAt} />
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
      {windows.map((w) => (
        <Sequence
          key={w.from}
          from={w.from}
          durationInFrames={w.to - w.from}
          layout="none"
        >
          <div
            style={{
              position: "absolute",
              top: SAFE.bottom - TICKER_HEIGHT,
              left: 0,
              width: "100%",
              height: TICKER_HEIGHT,
            }}
          >
            <NewsTicker items={w.items} label="SỐ LIỆU" />
          </div>
        </Sequence>
      ))}
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
            <LenderBar lender={m.lender} frames={frames} />
          </Sequence>
        );
      })}
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <Hook big={reel.edit.hook.big} sub={reel.edit.hook.sub} />
        </Sequence>
      ) : null}
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const newsroom: Design = {
  id: "newsroom",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "TIN NÓNG · TÀI CHÍNH",
    "SỐ LIỆU",
    "ĐANG NHẮC TỚI",
    "PHẦN",
    "Daniel Nguyen",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
