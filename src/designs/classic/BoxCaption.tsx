// edit.json "captionStyle": "box" — a caption page in a white rounded box that
// hugs each line (@remotion/rounded-text-box), the word being said in brand
// blue and finance keywords underlined. Lines are measured with the real font,
// so the page waits for Be Vietnam Pro (a measure taken before the font loads
// is cached wrong — the same fix as NewsTicker).
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
import { FONT, emphasised, enter, reelFontReady } from "../../mortgage/style";
import { CaptionZone } from "../../mortgage/PagedCaptions";

const SIZE = 66;
const WEIGHT = 800; // a weight reelFontReady() loads, so the measure is exact
const LINE_HEIGHT = 1.3;
const PAD = 26;
const RADIUS = 18;
const MAX_LINE = 880;

// Page words, keeping each word's own spacing (a glued ".1" stays in "4.1").
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

export const BoxCaptionPage: React.FC<{
  page: TikTokPage;
  keywords: string[];
}> = ({ page, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("measuring caption box"));
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

  // Greedy wrap: a word moves to a new line when the line would overflow.
  const lines: TikTokPage["tokens"][] = [[]];
  for (const t of page.tokens) {
    const current = lines[lines.length - 1];
    if (current.length && measure(lineText([...current, t])).width > MAX_LINE)
      lines.push([t]);
    else current.push(t);
  }
  const box = createRoundedTextBox({
    textMeasurements: lines.map((l) => measure(lineText(l))),
    textAlign: "center",
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
    <CaptionZone>
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
                textAlign: "center",
                whiteSpace: "pre",
                color: brand.textOnCard,
              }}
            >
              {line.map((t, j) => {
                const active = nowMs >= t.fromMs && nowMs < t.toMs;
                return (
                  <span
                    key={t.fromMs}
                    style={{
                      color: active ? brand.primary : undefined,
                      opacity: nowMs >= t.fromMs ? 1 : 0.5,
                      textDecoration: hit.has(firstIndex[li] + j)
                        ? "underline"
                        : undefined,
                      textDecorationColor: brand.accent,
                      textDecorationThickness: 6,
                      textUnderlineOffset: 8,
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
