// "splitscreen" text: captions on the dark strip under the stage (keywords
// gold, the word being said wiped in by a gold bar), the English line at the
// bottom of the strip, and the chapter as a split pill (steel "PHẦN n" half,
// handle, navy title half).
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
import { busyAt, usePlan, type Plan } from "./Plan";
import { GOLD, MUTED, SKY, STAGE } from "./Slider";

export const CHAPTER_WORD = "PHẦN";
const CAPTION_BOTTOM = 1390;
const CAPTION_SIZE = 50;
// On the free stage: bigger, the page's bottom a little under its middle.
const FREE_BOTTOM = STAGE.top + 350;
const FREE_SIZE = 70;
const STAGE_INSET = 40;

const Page: React.FC<{
  page: TikTokPage;
  keywords: string[];
  from: number;
  plan: Plan;
}> = ({ page, keywords, from, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Free stage: the page sits big on it; taken: down on the strip.
  const low = busyAt(plan, from + frame);
  const inset = interpolate(low, [0, 1], [STAGE_INSET, 0]);
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const p = enter(frame, fps);
  return (
    <CaptionZone
      bottom={interpolate(low, [0, 1], [FREE_BOTTOM, CAPTION_BOTTOM])}
      left={SAFE.left + inset}
      right={SAFE.right - inset}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: interpolate(low, [0, 1], [FREE_SIZE, CAPTION_SIZE]),
          textShadow: "0 4px 18px rgba(6,19,42,0.85)",
          lineHeight: 1.28,
          textWrap: "balance",
          opacity: p,
          transform: `translateX(${interpolate(p, [0, 1], [-18, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const spoken = nowMs >= t.fromMs;
          const now = spoken && nowMs < t.toMs;
          // The bar under the word being said wipes left to right.
          const wipe = now
            ? interpolate(nowMs, [t.fromMs, t.fromMs + 160], [0, 100], clamp)
            : 0;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  color: hit.has(i) ? GOLD : "#ffffff",
                  opacity: spoken ? 1 : 0.42,
                  paddingBottom: 4,
                  backgroundImage: `linear-gradient(${GOLD}, ${GOLD})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "0 100%",
                  backgroundSize: `${wipe}% 6px`,
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
}) => {
  const plan = usePlan(reel);
  return (
    <PagedCaptions
      reel={reel}
      combineWithinMs={1000}
      tailMs={300}
      render={(page, from) => (
        <Page page={page} keywords={keywords} from={from} plan={plan} />
      )}
    />
  );
};

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
                  fontStyle: "italic",
                  color: SKY,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "4px 16px",
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

const ChapterPill: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = Math.round(2.5 * fps);
  const p = enter(frame, fps);
  const out = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  // The navy half opens from the handle, like a mini slider.
  const open = interpolate(frame, [4, 18], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        display: "flex",
        alignItems: "stretch",
        maxWidth: 500,
        borderRadius: 999,
        overflow: "hidden",
        border: "2px solid rgba(255,185,56,0.55)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [-20, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 18px 0 22px",
          background: `linear-gradient(165deg, ${brand.slate}, ${brand.navy})`,
          color: MUTED,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 4,
          whiteSpace: "nowrap",
          borderRight: `4px solid ${GOLD}`,
        }}
      >
        {CHAPTER_WORD} {index}
      </div>
      <div
        style={{
          padding: "12px 26px 12px 18px",
          background: `linear-gradient(170deg, ${brand.background}, ${brand.navy})`,
          color: "#ffffff",
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.22,
          clipPath: `inset(0 ${(1 - open) * 100}% 0 0)`,
        }}
      >
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
          <ChapterPill index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};
