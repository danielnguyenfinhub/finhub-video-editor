// Popping-word captions (adapted from
// .claude/elements/captions/popping-word-captions/): each word pops in as
// Daniel says it, the current word held larger in brand.highlight. White 900
// with a black outline, centred inside SAFE.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type { Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised } from "../../mortgage/style";

const SIZE = 72;

const PoppingPage: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
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
    <CaptionZone>
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT,
          fontSize: SIZE,
          fontWeight: 900,
          lineHeight: 1.4,
          color: "#fff",
          paintOrder: "stroke fill",
          WebkitTextStroke: `${SIZE / 8}px #000`,
          // Captions sit over Daniel's chin in a full-frame talk: a
          // translucent navy box keeps them readable (his rule 5).
          background: "rgba(6, 19, 42, 0.62)",
          padding: "6px 22px",
          borderRadius: 18,
        }}
      >
        {page.tokens.map((t, i) => {
          const startFrame = Math.round(
            ((t.fromMs - page.startMs) / 1000) * fps,
          );
          const pop = spring({
            frame: frame - startFrame,
            fps,
            config: { damping: 10, stiffness: 220, mass: 0.6 },
          });
          const isCurrent = nowMs >= t.fromMs && nowMs < t.toMs;
          const scale = isCurrent
            ? 1.2
            : interpolate(pop, [0, 1], [0.6, 1], clamp);
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  // Size, not transform: a scaled inline-block keeps its
                  // layout box, so the grown word covered the space next to it.
                  fontSize: SIZE * scale,
                  color: hit.has(i) ? brand.highlight : "#fff",
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

export const PoppingCaptions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    render={(page) => <PoppingPage page={page} keywords={keywords} />}
  />
);
