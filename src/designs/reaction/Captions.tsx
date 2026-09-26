// "reaction" captions: word-highlight, bottom-left under Daniel's chin line
// (never over the artefact, which keeps the top of the frame). The current
// word gets the amber marker stroke; keywords stay amber year-round.
import { Highlight } from "@remotion/rough-notation";
import type React from "react";
import { useEffect, useState } from "react";
import {
  interpolate,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type { Reel } from "../../mortgage/schema";
import {
  FONT,
  STROKE,
  clamp,
  emphasised,
  reelFontReady,
} from "../../mortgage/style";
import type { TikTokPage } from "@remotion/captions";

const SIZE = 52;

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
  return (
    <CaptionZone align="flex-start">
      <div
        style={{
          width: 500,
          fontFamily: FONT,
          fontSize: SIZE,
          fontWeight: 900,
          lineHeight: 1.35,
          textAlign: "left",
          color: "#fff",
          paintOrder: "stroke fill",
          WebkitTextStroke: `${SIZE / 8}px #000`,
          textShadow: STROKE,
        }}
      >
        {page.tokens.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          const color = hit.has(i) ? "#FFB938" : "#fff";
          const word = (
            <span key={t.fromMs} style={{ color }}>
              {t.text}
            </span>
          );
          return active ? (
            <Highlight
              key={`m${t.fromMs}`}
              progress={interpolate(
                nowMs,
                [t.fromMs, t.fromMs + 120],
                [0, 1],
                clamp,
              )}
              color="rgba(245,165,36,0.55)"
              padding={{ left: 4, right: 4, top: 2, bottom: 2 }}
            >
              {word}
            </Highlight>
          ) : (
            word
          );
        })}
      </div>
    </CaptionZone>
  );
};

export const ReactionCaptions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("loading Be Vietnam Pro"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [handle, continueRender, cancelRender]);
  if (!ready) return null;
  return (
    <PagedCaptions
      reel={reel}
      render={(page) => <Page page={page} keywords={keywords} />}
    />
  );
};
