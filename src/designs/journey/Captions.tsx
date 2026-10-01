// "journey" captions: navy words on a white map ribbon (notched ends, gold
// top edge) under the pin, keywords blue with a gold underline; the English
// line in a dashed plate on SAFE.bottom.
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
import { GOLD, INK, alpha } from "./Map";

export const ENGLISH_ROOM = 108;
const CAPTION_BOTTOM = SAFE.bottom - ENGLISH_ROOM;
const CAPTION_SIZE = 56;
// The said word's scale grows it past its layout box and into the space to
// its neighbours ("ThángHai"). Every word keeps a fixed side margin of half
// that overflow (width about 0.6 em a character); with the neighbour's half
// the space stays about as wide as said, and the line never reflows.
// ponytail: width estimated from the character count; measure it with
// measureText if a caption font ever differs much from 0.6 em a character.
const saidRoom = (scale: number, text: string) =>
  +(((scale - 1) / 4) * 0.6 * text.trim().length).toFixed(3);

// ------------------------------------------------------------- captions

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
          filter: `drop-shadow(0 10px 14px ${alpha(brand.navy, 0.22)})`,
          opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
          transform: `translateY(${(1 - p) * 24}px)`,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            clipPath:
              "polygon(0 0, 100% 0, calc(100% - 26px) 50%, 100% 100%, 0 100%, 26px 50%)",
            padding: "16px 62px 20px",
            borderTop: `6px solid ${GOLD}`,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: CAPTION_SIZE,
            lineHeight: 1.22,
            textWrap: "balance",
          }}
        >
          {page.tokens.map((t, i) => {
            const now = nowMs >= t.fromMs && nowMs < t.toMs;
            const key = hit.has(i);
            return (
              <span key={t.fromMs}>
                {i > 0 && t.text.startsWith(" ") ? " " : ""}
                <span
                  style={{
                    display: "inline-block",
                    color: key ? brand.primary : INK,
                    opacity: nowMs >= t.fromMs ? 1 : 0.35,
                    textDecoration: key ? "underline" : undefined,
                    textDecorationColor: GOLD,
                    textDecorationThickness: 7,
                    textUnderlineOffset: 8,
                    margin: `0 ${saidRoom(1.06, t.text)}em`,
                    transform: `translateY(${now ? -3 : 0}px) scale(${now ? 1.06 : 1})`,
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

export const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1100}
    tailMs={300}
    render={(page) => <Page page={page} keywords={keywords} />}
  />
);

// The English line, one per scene (edit.json subtitles), on SAFE.bottom.
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
                  fontSize: 30,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: alpha(INK, 0.9),
                  textAlign: "center",
                  textWrap: "balance",
                  background: alpha(brand.card, 0.82),
                  border: `2px dashed ${alpha(INK, 0.35)}`,
                  padding: "6px 22px",
                  borderRadius: 14,
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
