// The explainer's overlay: marker-pen captions on the paper under the card,
// sticky-note stats, chapter tabs, the hook note and a pencil progress line.
// Timing comes from the same core data as every design (toOutMs on the paced
// timeline); only the drawing differs.
import type { TikTokPage } from "@remotion/captions";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import { Trail } from "@remotion/motion-blur";
import { Box, Circle, Highlight, Underline } from "@remotion/rough-notation";
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { OverlayProps } from "../../mortgage/design";
import { HOOK_FRAMES, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import type { EditJson, Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised, enter } from "../../mortgage/style";
import { toOutMs } from "../../mortgage/timeline";
import { CueTrack } from "./Cues";
import { Figures } from "./Figures";
import {
  BAND,
  BandWide,
  INK,
  MARKER,
  NoteBand,
  PencilLine,
  Sticky,
  logoDuring,
} from "./Paper";

// Captions sit on the paper below the talking-head card (see index.tsx),
// growing up from SAFE.bottom.

// ---------------------------------------------------------------- captions

// Each word is marked with a highlighter stroke as it is spoken, so the
// sentence fills with marker; keywords are ink-blue and underlined.
const CaptionPage: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
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
    <CaptionZone>
      <div
        style={{
          width: 900,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px 16px",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 66,
          lineHeight: 1.35,
          color: INK,
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [20, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const marked = interpolate(
            nowMs,
            [t.fromMs, t.fromMs + 180],
            [0, 1],
            clamp,
          );
          const word = (
            <span style={{ color: hit.has(i) ? brand.primary : INK }}>
              {t.text.trim()}
            </span>
          );
          return (
            <Highlight
              key={t.fromMs}
              progress={marked}
              color={MARKER}
              iterations={1}
              seed={i + 1}
              padding={{ left: 4, right: 4 }}
            >
              {hit.has(i) ? (
                <Underline
                  progress={marked}
                  color={brand.primary}
                  strokeWidth={4}
                  iterations={1}
                  seed={i + 7}
                >
                  {word}
                </Underline>
              ) : (
                word
              )}
            </Highlight>
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
    combineWithinMs={1200}
    render={(page) => <CaptionPage page={page} keywords={keywords} />}
  />
);

// ---------------------------------------------------------------- stats

// width: the note as drawn (NoteBand scales it to the band); bandStyle moves
// it in the band (Figures.tsx pins automatic figures to its left end).
export const StatNote: React.FC<{
  big: string;
  label: string;
  width?: number;
  bandStyle?: React.CSSProperties;
}> = ({ big, label, width = 760, bandStyle }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  // Long figures shrink to the note (its width less 120 px of padding),
  // never above 110 px.
  const size = Math.min(
    110,
    fitText({
      text: big,
      withinWidth: width - 120,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <NoteBand width={width} style={bandStyle}>
      <Audio src={staticFile("sfx/ding.wav")} volume={() => 0.3} />
      <Sticky
        rotate={0}
        style={{
          width,
          textAlign: "center",
          fontFamily: FONT,
          color: INK,
          opacity: 1 - outP,
          transform: `scale(${interpolate(inP, [0, 1], [1.4, 1])}) rotate(${interpolate(inP, [0, 1], [-12, 2])}deg)`,
        }}
      >
        <Underline
          progress={interpolate(frame, [10, 26], [0, 1], clamp)}
          color={brand.primary}
          strokeWidth={6}
          iterations={2}
          seed={3}
        >
          <span
            style={{ fontSize: size, fontWeight: 900, whiteSpace: "nowrap" }}
          >
            {big}
          </span>
        </Underline>
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            marginTop: 12,
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      </Sticky>
    </NoteBand>
  );
};

const StatNotes: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {(reel.edit.stats ?? []).map((c) => {
        const at = toOutMs(reel.timeline.segments, c.atMs, fps);
        if (at === null) return null;
        const from = Math.round((at / 1000) * fps);
        const frames = Math.round((c.durMs / 1000) * fps);
        return (
          <Sequence key={c.atMs} from={from} durationInFrames={frames}>
            <BandWide.Provider
              value={!logoDuring(from, frames, reel.timeline.talkFrames, fps)}
            >
              <StatNote big={c.big} label={c.label} />
            </BandWide.Provider>
          </Sequence>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- chapters

const ChapterTab: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [0, 1],
    clamp,
  );
  return (
    <AbsoluteFill style={{ top: BAND.top, left: BAND.left }}>
      <Audio src={staticFile("sfx/whoosh.wav")} volume={() => 0.3} />
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 26,
          alignSelf: "flex-start",
          // Stays left of the LogoMark tile (BAND); a long title wraps.
          // ponytail: shares the band with notes and cues; edit.json keeps
          // chapter starts clear of them (true for every live video).
          maxWidth: BAND.width,
          background: "#fff",
          padding: "18px 34px",
          fontFamily: FONT,
          color: INK,
          boxShadow: "0 10px 26px rgba(11,31,61,0.22)",
          transform: `translateX(${interpolate(inP, [0, 1], [-900, 0]) - outP * 900}px) rotate(-1.5deg)`,
        }}
      >
        <Box
          progress={interpolate(frame, [8, 22], [0, 1], clamp)}
          color={brand.accent}
          strokeWidth={4}
          iterations={2}
          seed={index + 11}
          padding={{ left: 8, right: 8, top: 4, bottom: 4 }}
        >
          <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: 2 }}>
            PHẦN {index + 1}
          </span>
        </Box>
        <span style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15 }}>
          {title}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const ChapterTabs: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => {
        const at = toOutMs(reel.timeline.segments, c.atMs, fps);
        if (at === null) return null;
        return (
          <Sequence
            key={c.atMs}
            from={Math.round((at / 1000) * fps)}
            durationInFrames={Math.round(2.6 * fps)}
          >
            <ChapterTab index={i} title={c.title} />
          </Sequence>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- hook

// A sticky note slapped onto the page (motion-blurred as it lands), its big
// figure counting up and then circled in red pen.
const HookNote: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [0, 1],
    clamp,
  );
  const big =
    hook.countTo === undefined
      ? hook.big
      : [
          interpolate(frame, [4, 40], [0, hook.countTo], clamp).toLocaleString(
            "vi-VN",
            {
              minimumFractionDigits: hook.decimals ?? 0,
              maximumFractionDigits: hook.decimals ?? 0,
            },
          ),
          hook.suffix ?? "",
        ]
          .join(" ")
          .trim();
  // Sized once from the string shown when the count-up ends (number + suffix),
  // so the text doesn't jitter or outgrow the note mid-count.
  const finalText =
    hook.countTo === undefined
      ? hook.big
      : [
          hook.countTo.toLocaleString("vi-VN", {
            minimumFractionDigits: hook.decimals ?? 0,
            maximumFractionDigits: hook.decimals ?? 0,
          }),
          hook.suffix ?? "",
        ]
          .join(" ")
          .trim();
  const size = Math.min(
    120,
    fitText({
      text: finalText,
      withinWidth: 700,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - outP }}>
      <Audio src={staticFile("sfx/mouse-click.wav")} volume={() => 0.5} />
      <Trail layers={4} lagInFrames={0.6} trailOpacity={0.5}>
        {/* No logo during the hook (logoVisible), so the full SAFE width. */}
        <AbsoluteFill
          style={{
            top: SAFE.top,
            left: SAFE.left,
            width: SAFE.right - SAFE.left,
            alignItems: "center",
          }}
        >
          <Sticky
            rotate={0}
            style={{
              width: 820,
              textAlign: "center",
              fontFamily: FONT,
              color: INK,
              transform: `translateY(${interpolate(inP, [0, 1], [-700, 0])}px) rotate(${interpolate(inP, [0, 1], [8, -3])}deg)`,
            }}
          >
            <Circle
              progress={interpolate(frame, [30, 55], [0, 1], clamp)}
              color="#D2342A"
              strokeWidth={6}
              iterations={1}
              seed={5}
              padding={{ left: 24, right: 24, top: 6, bottom: 2 }}
            >
              <span
                style={{
                  fontSize: size,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                {big}
              </span>
            </Circle>
            {hook.sub ? (
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  marginTop: 40,
                  lineHeight: 1.3,
                }}
              >
                {hook.sub}
              </div>
            ) : null}
          </Sticky>
        </AbsoluteFill>
      </Trail>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- progress

const ProgressLine: React.FC<{ talkFrames: number }> = ({ talkFrames }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ top: 1860, left: 60 }}>
      <PencilLine
        progress={Math.min(1, frame / talkFrames)}
        width={960}
        seed="progress"
        color={brand.primary}
      />
    </AbsoluteFill>
  );
};

export const Overlay: React.FC<OverlayProps> = ({
  reel,
  keywords,
  talkFrames,
}) => (
  <>
    <CueTrack reel={reel} />
    <ProgressLine talkFrames={talkFrames} />
    <StatNotes reel={reel} />
    <Figures reel={reel} talkFrames={talkFrames} />
    <ChapterTabs reel={reel} />
    <Captions reel={reel} keywords={keywords} />
    {reel.edit.hook ? (
      <Sequence durationInFrames={HOOK_FRAMES}>
        <HookNote hook={reel.edit.hook} />
      </Sequence>
    ) : null}
    {/* Golden rule 3c; drawn last so nothing covers it. */}
    <LogoMark talkFrames={talkFrames} />
  </>
);
