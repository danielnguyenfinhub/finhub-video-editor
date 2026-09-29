// "gauge" text pieces: captions in the dark strip under the dial (keywords
// gold, the word being said lit), the English line at the bottom of the
// strip, and the chapter as an engraved instrument plate.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised, enter } from "../../mortgage/style";
import { GOLD, SKY } from "./Dial";

export const CHAPTER_WORD = "PHẦN";
const CAPTION_BOTTOM = 1378;
const CAPTION_SIZE = 50;

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
  const p = enter(frame, fps);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: CAPTION_SIZE,
          lineHeight: 1.26,
          textWrap: "balance",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const now = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  color: hit.has(i) ? GOLD : "#ffffff",
                  opacity: spoken ? 1 : 0.4,
                  borderBottom: now
                    ? `5px solid ${hit.has(i) ? GOLD : SKY}`
                    : "5px solid transparent",
                  textShadow: now
                    ? `0 0 16px ${hit.has(i) ? "rgba(255,185,56,0.7)" : "rgba(0,100,168,0.9)"}`
                    : undefined,
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
                  fontSize: 27,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: SKY,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "4px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.14)",
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

const Plate: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const out = interpolate(
    frame,
    [Math.round(2.5 * fps) - 8, Math.round(2.5 * fps)],
    [1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        maxWidth: 480,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px 10px 12px",
        borderRadius: 10,
        background: `linear-gradient(180deg, ${brand.slate}, ${brand.navy})`,
        border: "2px solid rgba(255,255,255,0.3)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.5)",
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [-24, 0])}px)`,
      }}
    >
      <div
        style={{
          flex: "0 0 50px",
          height: 50,
          borderRadius: 8,
          background: brand.navy,
          color: GOLD,
          fontSize: 30,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
        }}
      >
        {index}
      </div>
      <div
        style={{
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 30,
          lineHeight: 1.2,
        }}
      >
        <span
          style={{
            display: "block",
            color: SKY,
            fontSize: 20,
            letterSpacing: 4,
          }}
        >
          {CHAPTER_WORD} {index}
        </span>
        {title}
      </div>
    </div>
  );
};

export const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <Plate index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};
