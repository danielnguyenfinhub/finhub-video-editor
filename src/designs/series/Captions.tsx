// Rounded white box captions (copied from classic/BoxCaption.tsx), repositioned
// to the free right-bottom of the frame (x 400-960, bottom at SAFE.bottom) since Daniel's
// cut-out sits bottom-left. Keywords pop (scale 1.2, brand.primary) instead of
// classic's underline.
import type { TikTokPage } from "@remotion/captions";
import { measureText } from "@remotion/layout-utils";
import { createRoundedTextBox } from "@remotion/rounded-text-box";
import type React from "react";
import { useEffect, useState } from "react";
import {
  interpolate,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type { Reel } from "../../mortgage/schema";
import { FONT, emphasised, enter, reelFontReady } from "../../mortgage/style";

const SIZE = 46;
const WEIGHT = 800;
const LINE_HEIGHT = 1.3;
const PAD = 20;
const RADIUS = 16;
const MAX_LINE = 520; // fits inside x 400-960

const lineText = (tokens: TikTokPage["tokens"]) =>
  tokens.map((t, j) => (j === 0 ? t.text.trimStart() : t.text)).join("");

const measure = (text: string) =>
  measureText({
    text,
    fontFamily: FONT,
    fontSize: SIZE,
    fontWeight: WEIGHT,
    additionalStyles: { lineHeight: LINE_HEIGHT },
    validateFontIsLoaded: true,
  });

const SeriesCaptionPage: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("measuring series caption box"));
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

  const lines: TikTokPage["tokens"][] = [[]];
  for (const t of page.tokens) {
    const current = lines[lines.length - 1];
    if (current.length && measure(lineText([...current, t])).width > MAX_LINE)
      lines.push([t]);
    else current.push(t);
  }
  const box = createRoundedTextBox({
    textMeasurements: lines.map((l) => measure(lineText(l))),
    textAlign: "left",
    horizontalPadding: PAD,
    borderRadius: RADIUS,
  });
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const p = enter(frame, fps);
  const firstIndex = lines.map((_, li) =>
    lines.slice(0, li).reduce((n, l) => n + l.length, 0),
  );
  return (
    <CaptionZone left={400} align="flex-end">
      <div
        style={{
          position: "relative",
          width: box.boundingBox.width,
          height: box.boundingBox.height,
          transform: `scale(${interpolate(p, [0, 1], [0.9, 1])}) translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
          opacity: p,
          filter: "drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35))",
        }}
      >
        <svg
          viewBox={box.boundingBox.viewBox}
          style={{
            position: "absolute",
            inset: 0,
            width: box.boundingBox.width,
            height: box.boundingBox.height,
            overflow: "visible",
          }}
        >
          <path fill="#fff" d={box.d} />
        </svg>
        <div style={{ position: "relative" }}>
          {lines.map((line, li) => (
            <div
              key={li}
              style={{
                paddingInline: PAD,
                fontFamily: FONT,
                fontSize: SIZE,
                fontWeight: WEIGHT,
                lineHeight: LINE_HEIGHT,
                textAlign: "left",
                whiteSpace: "pre",
                color: brand.textOnCard,
              }}
            >
              {line.map((t, j) => {
                const active = nowMs >= t.fromMs && nowMs < t.toMs;
                const keyword = hit.has(firstIndex[li] + j);
                // A literal scale() pop on adjacent keyword tokens overlaps
                // them (transform doesn't reflow layout) — per the brief's own
                // fallback, keywords pop through colour + weight only.
                return (
                  <span
                    key={t.fromMs}
                    style={{
                      color: keyword ? brand.primary : undefined,
                      opacity: nowMs >= t.fromMs ? 1 : 0.5,
                      fontWeight: active || keyword ? 900 : WEIGHT,
                    }}
                  >
                    {j === 0 ? t.text.trimStart() : t.text}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </CaptionZone>
  );
};

export const SeriesCaptions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    render={(page) => <SeriesCaptionPage page={page} keywords={keywords} />}
  />
);
