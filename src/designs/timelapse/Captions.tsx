// "timelapse" captions on a dark editing-timeline strip (a ruler of ticks
// along its top edge, keywords gold), the English line under it, and the
// chapter marker: a flag raised on the timeline track at the playhead.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised, enter } from "../../mortgage/style";
import { INK, SKY, TRACK } from "./Machine";

export const CAPTION_BOTTOM = 1372;
const CAPTION_SIZE = 50;
export const CHAPTER_WORD = "PHẦN";

const Ruler: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 18,
      right: 18,
      top: 0,
      height: 10,
      display: "flex",
      justifyContent: "space-between",
    }}
  >
    {Array.from({ length: 31 }, (_, i) => (
      <div
        key={i}
        style={{
          width: 2,
          height: i % 5 === 0 ? 10 : 5,
          background: i % 5 === 0 ? brand.highlight : "rgba(255,255,255,0.3)",
        }}
      />
    ))}
  </div>
);

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
          position: "relative",
          padding: "22px 30px 16px",
          borderRadius: 16,
          background: INK,
          borderTop: `3px solid ${brand.highlight}`,
          boxShadow: "0 16px 40px rgba(6,19,42,0.6)",
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
        <Ruler />
        {page.tokens.map((t, i) => {
          const now = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  color: hit.has(i) ? brand.highlight : "#ffffff",
                  opacity: spoken ? 1 : 0.45,
                  transform: `scale(${now ? 1.06 : 1})`,
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
                  lineHeight: 1.35,
                  fontWeight: 600,
                  color: brand.textDim,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "6px 20px",
                  borderRadius: 12,
                  background: "rgba(6,19,42,0.6)",
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

// A chapter: a flag raised on the track at the playhead for 2.5 s.
export const ChapterFlag: React.FC<{
  t: number;
  at: number;
  index: number;
  title: string;
  x: number;
}> = ({ t, at, index, title, x }) => {
  const { fps } = useVideoConfig();
  const dur = Math.round(2.5 * fps);
  if (t < at || t >= at + dur) return null;
  const p = enter(t - at, fps);
  const out = interpolate(t, [at + dur - 8, at + dur], [1, 0], clamp);
  const W = 440;
  const left = Math.min(Math.max(x - 24, SAFE.left), SAFE.right - W);
  return (
    <div
      style={{
        position: "absolute",
        left,
        width: W,
        bottom: 1920 - (TRACK.y - 30),
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "10px 20px",
          borderRadius: 14,
          background: INK,
          border: `2px solid ${SKY}`,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 4,
            color: brand.highlight,
          }}
        >
          {CHAPTER_WORD} {index}
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 900,
            lineHeight: 1.2,
            color: "#ffffff",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: x - left - 2,
          bottom: -30,
          width: 4,
          height: 30,
          background: SKY,
        }}
      />
    </div>
  );
};
