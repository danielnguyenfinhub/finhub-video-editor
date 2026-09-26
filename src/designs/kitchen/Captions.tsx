// Plain, low-key captions: no outline, no box, sentence-paced pages (longer
// pages via captionPages), keywords lit in brand.primary. Centred inside SAFE.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type { Reel } from "../../mortgage/schema";
import { emphasised, FONT } from "../../mortgage/style";

const TEXT = "#3C4B64";

const CaptionPage: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  return (
    <CaptionZone>
      <div
        style={{
          width: 900,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 14px",
          fontFamily: FONT,
          lineHeight: 1.32,
          textAlign: "center",
          // Warm grey over Daniel's dark shirt is unreadable: a soft cream
          // strip behind the words keeps the quiet look and the contrast.
          background: "rgba(255, 248, 235, 0.9)",
          padding: "10px 26px",
          borderRadius: 18,
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => (
          <span
            key={t.fromMs}
            style={{
              fontSize: 70,
              fontWeight: hit.has(i) ? 900 : 700,
              color: hit.has(i) ? brand.primary : TEXT,
            }}
          >
            {t.text.trim()}
          </span>
        ))}
      </div>
    </CaptionZone>
  );
};

export const KitchenCaptions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1400}
    breakOnSilenceAfterMs={500}
    tailMs={500}
    render={(page) => <CaptionPage page={page} keywords={keywords} />}
  />
);
