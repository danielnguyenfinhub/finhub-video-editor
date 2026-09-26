// "newsroom" captions: heavy white words with a black outline; the word being
// spoken jumps into an amber box (navy text), same measure-after-font-loads
// approach as studio/PillCaptions.tsx. Keywords not currently boxed show in
// amber text instead of white.
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
import { SAFE } from "../../mortgage/golden";
import type { Reel } from "../../mortgage/schema";
import { FONT, emphasised, reelFontReady } from "../../mortgage/style";

const SIZE = 66;
// Normal leading: two-line pages keep their Vietnamese diacritics apart.
const LINE_HEIGHT = 1.15;
const PAD_X = 16;
const PAD_Y = 10;
const MOVE_FRAMES = 5;
// Captions sit on SAFE.bottom, below Daniel's mouth, and grow upward. While a
// bottom bar (the ticker, or the taller bank bar during a mention) is up at
// any point of the page, the page sits on top of that bar instead, so it
// never runs into it and never jumps mid-page. (A permanent ticker pushed
// every page up over his mouth.)
const BAR_GAP = 14;
const TAIL_MS = 400; // PagedCaptions' default tail

type Box = { left: number; top: number; width: number; height: number };

const CaptionPage: React.FC<{
  page: TikTokPage;
  keywords: string[];
  bottom: number;
}> = ({ page, keywords, bottom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
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
  const activeIdx = Math.round(Math.min(at, page.tokens.length - 1));
  return (
    <CaptionZone bottom={bottom}>
      <div
        style={{
          position: "relative",
          textAlign: "center",
          fontFamily: FONT,
          fontSize: SIZE,
          fontWeight: 900,
          lineHeight: LINE_HEIGHT,
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
              borderRadius: 12,
              background: brand.highlight,
            }}
          />
        ) : null}
        {page.tokens.map((t, i) => {
          const boxed = started && i === activeIdx;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                ref={(el) => {
                  refs.current[i] = el;
                }}
                style={{
                  position: "relative",
                  display: "inline-block",
                  whiteSpace: "pre",
                  color: boxed
                    ? brand.textOnCard
                    : hit.has(i)
                      ? brand.highlight
                      : "#fff",
                  WebkitTextStroke: boxed ? "0px transparent" : undefined,
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

export const NewsroomCaptions: React.FC<{
  reel: Reel;
  keywords: string[];
  // Height of the bottom bars at a talk frame (0 when none is up).
  barAt: (frame: number) => number;
}> = ({ reel, keywords, barAt }) => {
  const { fps } = useVideoConfig();
  const bottomFor = (page: TikTokPage, from: number) => {
    const shownMs = page.durationMs;
    const frames = Math.round(((shownMs + TAIL_MS) / 1000) * fps);
    let bar = 0;
    for (let f = from; f <= from + frames; f++) bar = Math.max(bar, barAt(f));
    return bar ? SAFE.bottom - bar - BAR_GAP : SAFE.bottom;
  };
  return (
    <PagedCaptions
      reel={reel}
      render={(page, from) => (
        <CaptionPage
          page={page}
          keywords={keywords}
          bottom={bottomFor(page, from)}
        />
      )}
    />
  );
};
