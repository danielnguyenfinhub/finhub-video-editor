// "scale" text layers: captions on the dark marble strip under the scale
// (keywords gold, the word being said lifts with a warm glow), the English
// line at the bottom of the strip, and the chapter plate top-left.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised, enter } from "../../mortgage/style";
import { BRASS_DARK, GOLD } from "./Scale";
import { PLAQUE } from "./Stage";

export const CHAPTER_WORD = "PHẦN";
export const CAPTION_BOTTOM = 1386;
const CAPTION_SIZE = 52;

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
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  color: hit.has(i) ? GOLD : "#ffffff",
                  opacity: spoken ? 1 : 0.45,
                  textShadow: now
                    ? "0 0 22px rgba(255,185,56,0.75), 0 4px 14px rgba(0,0,0,0.8)"
                    : "0 4px 14px rgba(0,0,0,0.8)",
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

export const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
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
export const EnglishLine: React.FC<{ reel: Reel }> = ({ reel }) => {
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
                  fontStyle: "italic",
                  color: brand.textDim,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "6px 18px",
                  borderTop: `1px solid rgba(255,185,56,0.3)`,
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

const ChapterPlate: React.FC<{ index: number; title: string; dur: number }> = ({
  index,
  title,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <div
      style={{
        ...PLAQUE,
        position: "absolute",
        top: SAFE.top + 8,
        left: SAFE.left + 6,
        maxWidth: 236,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px 8px 10px",
        borderRadius: 16,
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [-30, 0])}px)`,
      }}
    >
      <div
        style={{
          flex: "0 0 44px",
          height: 44,
          borderRadius: "50%",
          background: GOLD,
          border: `3px solid ${BRASS_DARK}`,
          color: brand.navy,
          fontSize: 24,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index}
      </div>
      <div
        style={{
          color: "#ffffff",
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        <span
          style={{
            color: GOLD,
            fontSize: 18,
            letterSpacing: 3,
            display: "block",
          }}
        >
          {CHAPTER_WORD} {index}
        </span>
        {title}
      </div>
    </div>
  );
};

export const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const dur = Math.round(2.5 * fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={dur}
          layout="none"
        >
          <ChapterPlate index={i + 1} title={c.title} dur={dur} />
        </Sequence>
      ))}
    </>
  );
};
