// Captions on a dark strip under the printer (keywords gold, the word being
// said underlined in gold) while the stage is taken; while it is free they
// print on a paper slip out of the printer instead. The English line sits
// on SAFE.bottom under them.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { DIM, FONT, emphasised, enter } from "../../mortgage/style";
import { CAPTION_BOTTOM, GOLD, INK, PAPER, SLOT_Y } from "./Paper";

const SIZE = 50;
const SLIP_SIZE = 70;
const SLIP_W = 860;

// Zig-zag top edge in % across, so it fits a slip of any width.
const TORN_TOP = `polygon(${Array.from({ length: 41 }, (_, i) => `${i * 2.5}% ${i % 2 ? 0 : 8}px`).join(",")}, 100% 100%, 0% 100%)`;

type Variant = "strip" | "slip";

// strip: the dark strip under the slot (while the stage is taken). slip:
// while nothing else prints, the words print on a paper slip rising out of
// the printer, dark type, keywords on a gold highlighter.
const Page: React.FC<{
  page: TikTokPage;
  keywords: string[];
  variant: Variant;
  from: number;
  idle: number[];
}> = ({ page, keywords, variant, from, idle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const p = enter(frame, fps);
  const level = idle[from + frame] ?? 0;
  const shown = variant === "slip" ? level : 1 - level;
  if (shown <= 0) return null;
  const slip = variant === "slip";
  return (
    <CaptionZone bottom={slip ? SLOT_Y + 10 : CAPTION_BOTTOM}>
      {/* The slip rises out of the printer mouth (clipped at it), opaque. */}
      <div style={{ overflow: slip ? "hidden" : undefined }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: slip ? 900 : 800,
            fontSize: slip ? SLIP_SIZE : SIZE,
            lineHeight: 1.3,
            textAlign: "center",
            textWrap: "balance",
            color: slip ? INK : "#fff",
            maxWidth: slip ? SLIP_W : undefined,
            padding: slip ? "30px 36px 34px" : "12px 26px 16px",
            borderRadius: slip ? 0 : 14,
            background: slip ? PAPER : "rgba(6,19,42,0.92)",
            clipPath: slip ? TORN_TOP : undefined,
            borderTop: slip ? undefined : `4px dashed rgba(255,185,56,0.7)`,
            boxShadow: slip ? undefined : "0 16px 40px rgba(0,0,0,0.5)",
            opacity: slip ? 1 : Math.min(p, shown),
            transform: slip
              ? `translateY(${(1 - Math.min(p, shown)) * 100}%)`
              : `translateY(${interpolate(Math.min(p, shown), [0, 1], [16, 0])}px)`,
          }}
        >
          {page.tokens.map((t, i) => {
            const spoken = nowMs >= t.fromMs;
            const now = spoken && nowMs < t.toMs;
            const key = hit.has(i);
            return (
              <span key={t.fromMs}>
                {i > 0 && t.text.startsWith(" ") ? " " : ""}
                <span
                  style={{
                    color: key && !slip ? GOLD : undefined,
                    background:
                      key && slip
                        ? "linear-gradient(180deg, transparent 55%, rgba(255,185,56,0.8) 55%)"
                        : undefined,
                    opacity: spoken ? 1 : slip ? 0.35 : 0.55,
                    textDecorationLine: now ? "underline" : undefined,
                    textDecorationColor: GOLD,
                    textDecorationThickness: 6,
                    textUnderlineOffset: 8,
                  }}
                >
                  {t.text.trim()}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </CaptionZone>
  );
};

export const Captions: React.FC<{
  reel: Reel;
  keywords: string[];
  variant: Variant;
  idle: number[];
}> = ({ reel, keywords, variant, idle }) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1100}
    tailMs={300}
    render={(page, from) => (
      <Page
        page={page}
        keywords={keywords}
        variant={variant}
        from={from}
        idle={idle}
      />
    )}
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
                  fontSize: 26,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: DIM,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "4px 18px",
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
