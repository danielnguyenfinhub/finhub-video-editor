// "editorial"'s overlay: ink captions with amber highlighter marks on
// keywords/numbers, a masthead-style hook and chapter banners, and a sidebar
// card for lenderMentionsOf(). figuresOf() moved to Behind.tsx (golden rule:
// charts never cover Daniel's face) and the logo is LogoMark (golden rule:
// no other always-on logo). Timing follows the same core data as every
// design (toOutMs / figuresOf / lenderMentionsOf); only the drawing differs.
import type { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import { Underline } from "@remotion/rough-notation";
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { OverlayProps } from "../../mortgage/design";
import { lenderMentionsOf, SAFE } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { LogoMark } from "../../mortgage/LogoMark";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised, enter } from "../../mortgage/style";
import { StaggerTitle } from "../../elements/StaggerTitle";
import { MotionTrack } from "../classic/Cues";
import { INK, MASTHEAD_BOTTOM } from "./Masthead";

const HOOK_FRAMES = 105;
// The Finance Hub logo doesn't show during the hook (logoVisible starts at
// HOOK_FRAMES), so the hook owns the full SAFE width. On a full-frame talk
// the only space clear of Daniel's face is above his head: y 420-580
// (SAFE.top to just above his hairline at y~600), x 54-960 (SAFE width).
const HOOK_BAND = {
  top: SAFE.top,
  left: SAFE.left,
  width: SAFE.right - SAFE.left,
};
const SIDEBAR = {
  left: 700,
  // Clears both LogoMark (SAFE.top + 170) and the masthead rule, whichever
  // is lower, so the sidebar never collides with either.
  top: Math.max(SAFE.top + 170, MASTHEAD_BOTTOM + 20),
  width: SAFE.right - 700,
};

// ---------------------------------------------------------------- captions

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
          gap: "10px 14px",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 62,
          lineHeight: 1.35,
          color: INK,
          // Ink over Daniel's dark shirt is unreadable: a strip of the paper
          // behind the words (the column look of a printed pull quote).
          background: "rgba(247, 242, 231, 0.92)",
          padding: "10px 28px",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(11, 31, 61, 0.18)",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [20, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const word = <span>{t.text.trim()}</span>;
          if (!hit.has(i)) return <span key={t.fromMs}>{word}</span>;
          const marked = interpolate(
            nowMs,
            [t.fromMs, t.fromMs + 180],
            [0, 1],
            clamp,
          );
          return (
            <Underline
              key={t.fromMs}
              progress={marked}
              color={`${brand.accent}99`}
              strokeWidth={10}
              iterations={1}
              seed={i + 1}
              padding={{ top: 2 }}
            >
              <span style={{ color: brand.primary }}>{t.text.trim()}</span>
            </Underline>
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

// ---------------------------------------------------------------- hook

const Hook: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const outP = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    clamp,
  );
  const sub = enter(frame, fps, 20);
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
  // Cap so big + sub together stay inside the 420-580 above-head band
  // (~152px tall including margins); fitText shrinks long hooks further.
  const bigSize = Math.min(
    76,
    fitText({
      text: big,
      withinWidth: HOOK_BAND.width - 40,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const subTop = Math.round(bigSize * 1.3) + 14;
  return (
    <AbsoluteFill style={{ opacity: outP }}>
      <div
        style={{
          position: "absolute",
          top: HOOK_BAND.top,
          left: HOOK_BAND.left,
          width: HOOK_BAND.width,
        }}
      >
        <StaggerTitle text={big} color={INK} fontSize={bigSize} />
        {hook.sub ? (
          <AbsoluteFill style={{ top: subTop, alignItems: "center" }}>
            <Underline
              progress={interpolate(frame, [22, 42], [0, 1], clamp)}
              color={`${brand.accent}99`}
              strokeWidth={8}
              iterations={1}
              seed={9}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 30,
                  color: INK,
                  opacity: sub,
                }}
              >
                {hook.sub}
              </span>
            </Underline>
          </AbsoluteFill>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- lender sidebar

const LenderCard: React.FC<{ name: string; height56: React.ReactNode }> = ({
  name,
  height56,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - outP }}>
      <div
        style={{
          position: "absolute",
          left: SIDEBAR.left,
          top: SIDEBAR.top,
          width: SIDEBAR.width,
          borderLeft: `2px solid ${INK}`,
          paddingLeft: 24,
          transform: `translateX(${interpolate(inP, [0, 1], [SIDEBAR.width + 40, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: 4,
            color: brand.blue,
          }}
        >
          NGÂN HÀNG
        </div>
        <div style={{ marginTop: 16 }}>{height56}</div>
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 34,
            color: INK,
            lineHeight: 1.15,
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 24,
            color: "#5B6B80",
          }}
        >
          được nhắc tới trong đoạn này
        </div>
      </div>
    </AbsoluteFill>
  );
};

const LenderSidebar: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const dur = Math.round(((m.endMs - m.startMs) / 1000) * fps);
        if (dur <= 0) return null;
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={dur}
          >
            <LenderCard
              name={m.lender.name}
              height56={<LenderLogo lender={m.lender} height={56} />}
            />
          </Sequence>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- chapters

const ChapterBanner: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - outP }}>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: MASTHEAD_BOTTOM + 20,
          maxWidth: 700,
          transform: `translateX(${interpolate(inP, [0, 1], [-600, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: 5,
            color: brand.accent,
          }}
        >
          PHẦN {index + 1}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 56,
            color: INK,
            marginTop: 8,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => {
        const at = outFrame(c.atMs);
        return (
          <Sequence
            key={c.atMs}
            from={at}
            durationInFrames={Math.round(2.5 * fps)}
          >
            <ChapterBanner index={i} title={c.title} />
          </Sequence>
        );
      })}
    </>
  );
};

export const Overlay: React.FC<OverlayProps> = ({
  reel,
  keywords,
  talkFrames,
}) => (
  <>
    {/* Cue panels shifted into the safe band; grain stays full-frame. */}
    <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
    <LenderSidebar reel={reel} />
    <Chapters reel={reel} />
    <Captions reel={reel} keywords={keywords} />
    {reel.edit.hook ? (
      <Sequence durationInFrames={HOOK_FRAMES}>
        <Hook hook={reel.edit.hook} />
      </Sequence>
    ) : null}
    <LogoMark talkFrames={talkFrames} />
  </>
);
