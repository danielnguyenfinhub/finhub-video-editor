// Captions on a dark strip under the stage: bold white, keywords gold, the
// word being said lifted on a small gold card; the English line under it.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAFE } from "../../mortgage/golden";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised } from "../../mortgage/style";
import { CAPTION_BOTTOM, DIM, GOLD, INK } from "./Look";

// Two lines at most between the ribbon and CAPTION_BOTTOM.
const sizeFor = (chars: number) => (chars > 64 ? 42 : chars > 44 ? 48 : 54);

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
  const chars = page.tokens
    .map((t) => t.text)
    .join("")
    .trim().length;
  const p = interpolate(frame, [0, 6], [0, 1], clamp);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          boxSizing: "border-box",
          maxWidth: "100%",
          padding: "12px 28px 14px",
          background: "rgba(6,19,42,0.9)",
          borderRadius: 22,
          border: "1.5px solid rgba(255,185,56,0.35)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: sizeFor(chars),
          lineHeight: 1.34,
          color: "#ffffff",
          textAlign: "center",
          textWrap: "balance",
          opacity: p,
          transform: `translateY(${(1 - p) * 16}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const spoken = nowMs >= t.fromMs;
          const now = spoken && nowMs < t.toMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  color: now ? INK : hit.has(i) ? GOLD : "#ffffff",
                  background: now ? GOLD : undefined,
                  borderRadius: 10,
                  padding: now ? "0 8px" : undefined,
                  margin: now ? "0 -8px" : undefined,
                  opacity: spoken ? 1 : 0.42,
                  transform: now ? "translateY(-3px) rotate(-2deg)" : undefined,
                  boxShadow: now ? "0 8px 18px rgba(0,0,0,0.4)" : undefined,
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
    combineWithinMs={1000}
    tailMs={300}
    render={(page) => <Page page={page} keywords={keywords} />}
  />
);

// Between the caption strip and SAFE.bottom: two lines of 26 px fit.
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
                  fontSize: s.text.length > 110 ? 24 : 27,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: DIM,
                  textAlign: "center",
                  padding: "0 12px",
                  maxHeight: SAFE.bottom - CAPTION_BOTTOM - 6,
                  overflow: "hidden",
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
