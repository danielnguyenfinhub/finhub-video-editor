// Captions on a navy news strip under the stage (bold white, keywords gold,
// the word being said underlined in gold) and the English line under it.
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
import { CAPTION_BOTTOM, DIM, GOLD, NAVY, STRIPES } from "./Frame";

// Two lines at most inside CAPTION_BOTTOM - STAGE.bottom (~200 px).
const sizeFor = (chars: number) => (chars > 64 ? 44 : chars > 44 ? 50 : 56);

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
  const p = interpolate(frame, [0, 5], [0, 1], clamp);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          position: "relative",
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 26px 16px 44px",
          background: NAVY,
          borderRadius: 12,
          borderTop: `4px solid ${GOLD}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          overflow: "hidden",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: sizeFor(chars),
          lineHeight: 1.3,
          color: "#fff",
          textAlign: "left",
          opacity: p,
          transform: `translateY(${(1 - p) * 14}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 20,
            background: STRIPES(GOLD, NAVY, 8),
            backgroundPosition: `0 ${(frame * 2) % 23}px`,
          }}
        />
        {page.tokens.map((t, i) => {
          const spoken = nowMs >= t.fromMs;
          const now = spoken && nowMs < t.toMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  color: hit.has(i) ? GOLD : "#fff",
                  opacity: spoken ? 1 : 0.4,
                  boxShadow: now ? `inset 0 -7px 0 ${GOLD}` : undefined,
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

// Between the caption strip and SAFE.bottom: two lines of 28 px fit.
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
                  fontSize: s.text.length > 120 ? 24 : 28,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: DIM,
                  textAlign: "center",
                  padding: "0 12px",
                  maxHeight: SAFE.bottom - CAPTION_BOTTOM - 8,
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
