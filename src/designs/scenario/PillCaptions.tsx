// "scenario" captions: a moving amber pill slides from word to word as
// Daniel says them, copied from designs/studio/PillCaptions.tsx and adapted
// — the pill is brand.accent (not brand.primary). Placed by CaptionZone.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { FONT, emphasised, reelFontReady } from "../../mortgage/style";

const SIZE = 72;
const PAD_X = 14;
const PAD_Y = 10;
const MOVE_FRAMES = 5;

type Box = { left: number; top: number; width: number; height: number };

const PillPage: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  // Measure only once Be Vietnam Pro is in: measured in the fallback font,
  // the line wraps differently and the pill lands beside the words. The frame
  // is held (delayRender) until the measurement is in.
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("measuring caption words"));
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => setFontReady(true))
      .catch(cancelRender);
  }, [cancelRender]);
  useLayoutEffect(() => {
    if (!fontReady) return;
    setBoxes(
      refs.current.map((el) =>
        el
          ? {
              left: el.offsetLeft,
              top: el.offsetTop,
              width: el.offsetWidth,
              height: el.offsetHeight,
            }
          : { left: 0, top: 0, width: 0, height: 0 },
      ),
    );
    continueRender(handle);
  }, [fontReady, page, handle, continueRender]);
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  // Fractional index of the word the pill sits on, springing between words.
  const at = page.tokens.reduce((sum, t, i) => {
    if (i === 0) return sum;
    const start = ((t.fromMs - page.startMs) / 1000) * fps;
    return (
      sum +
      spring({
        frame,
        fps,
        delay: Math.max(0, start - MOVE_FRAMES / 2),
        durationInFrames: MOVE_FRAMES,
        config: { damping: 100 },
      })
    );
  }, 0);
  const ready = boxes.length === page.tokens.length && boxes.length > 0;
  const idx = boxes.map((_, i) => i);
  const lerp = (pick: (b: Box) => number) =>
    boxes.length === 1
      ? pick(boxes[0])
      : interpolate(Math.min(at, boxes.length - 1), idx, boxes.map(pick));
  const started = nowMs >= page.tokens[0].fromMs;
  return (
    <CaptionZone>
      <div
        style={{
          position: "relative",
          textAlign: "center",
          fontFamily: FONT,
          fontSize: SIZE,
          fontWeight: 900,
          lineHeight: 1.45,
          color: "#fff",
          paintOrder: "stroke fill",
          WebkitTextStroke: `${SIZE / 7}px #000`,
        }}
      >
        {ready && started ? (
          <div
            style={{
              position: "absolute",
              left: lerp((b) => b.left) - PAD_X,
              top: lerp((b) => b.top) + PAD_Y / 2,
              width: lerp((b) => b.width) + PAD_X * 2,
              height: lerp((b) => b.height) - PAD_Y,
              borderRadius: 14,
              background: brand.accent,
            }}
          />
        ) : null}
        {page.tokens.map((t, i) => (
          <span key={t.fromMs}>
            {/* each word keeps its own spacing: ".1" in "4.1" has none */}
            {i > 0 && t.text.startsWith(" ") ? " " : ""}
            <span
              ref={(el) => {
                refs.current[i] = el;
              }}
              style={{
                position: "relative",
                display: "inline-block",
                whiteSpace: "pre",
                color: hit.has(i) ? brand.highlight : "#fff",
              }}
            >
              {t.text.trim()}
            </span>
          </span>
        ))}
      </div>
    </CaptionZone>
  );
};

export const ScenarioPillCaptions: React.FC<{
  reel: Reel;
  keywords: string[];
}> = ({ reel, keywords }) => (
  <PagedCaptions
    reel={reel}
    render={(page) => <PillPage page={page} keywords={keywords} />}
  />
);
