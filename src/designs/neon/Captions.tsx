// "neon" captions: a short 2-4 word phrase per page on a dark pill, the word
// being spoken glowing amber and popping, the rest soft white. One word per
// page read as single syllables (Vietnamese tokens run ~200 ms each), so the
// pages come from the shared pager (PagedCaptions) with a short combine
// window. Keywords and numbers (emphasised) stay amber.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { useEffect, useState } from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type { Reel } from "../../mortgage/schema";
import { emphasised, FONT, reelFontReady } from "../../mortgage/style";

// 72 px at 1.1 leading: a two-line page stays at or below y 1300 (under
// his mouth) when it sits on SAFE.bottom.
const SIZE = 72;
// ~3 syllables a page: short enough to read at a glance, long enough to read
// as a phrase, not a syllable.
const COMBINE_MS = 700;

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
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  return (
    <CaptionZone>
      <div
        style={{
          maxWidth: "100%",
          fontFamily: FONT,
          fontSize: SIZE,
          fontWeight: 900,
          lineHeight: 1.1,
          textAlign: "center",
          // A dark pill behind the phrase: it sits over Daniel's chest in a
          // full-frame talk, legible over moving video.
          background: `${brand.navy}9E`, // navy at ~62%
          padding: "4px 28px 10px",
          borderRadius: 48,
          transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
        }}
      >
        {page.tokens.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          const pop = active
            ? interpolate(nowMs, [t.fromMs, t.fromMs + 120], [1.18, 1.08], {
                extrapolateRight: "clamp",
              })
            : 1;
          const glow = active ? 30 : hit.has(i) ? 14 : 0;
          return (
            <span
              key={t.fromMs}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                color: active || hit.has(i) ? brand.highlight : "#fff",
                transform: `scale(${pop})`,
                textShadow: glow
                  ? `0 0 6px #fff, 0 0 ${glow}px ${brand.highlight}, 0 0 ${glow * 2}px ${brand.highlight}`
                  : `0 0 8px ${brand.navy}`,
              }}
            >
              {t.text}
            </span>
          );
        })}
      </div>
    </CaptionZone>
  );
};

export const NeonCaptions: React.FC<{ reel: Reel; keywords: string[] }> = ({
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
      combineWithinMs={COMBINE_MS}
      render={(page) => <Page page={page} keywords={keywords} />}
    />
  );
};
