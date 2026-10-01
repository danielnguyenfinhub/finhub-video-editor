// "isometric" text layers: the chapter slab (navy, a gold number block), the
// captions (white words on a navy slab, keywords amber, the word being said
// lifts like a block) and the English line on a pale slab at the bottom.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, emphasised, enter } from "../../mortgage/style";
import { CAPTION_BOTTOM, SLAB, fadeOut } from "./Stage";
import { PALE, SKY, WHITE, slabEdge } from "./World";

// The said word's scale grows it past its layout box and into the space to
// its neighbours ("ThángHai"). Every word keeps a fixed side margin of half
// that overflow (width about 0.6 em a character); with the neighbour's half
// the space stays about as wide as said, and the line never reflows.
// ponytail: width estimated from the character count; measure it with
// measureText if a caption font ever differs much from 0.6 em a character.
const saidRoom = (scale: number, text: string) =>
  +(((scale - 1) / 4) * 0.6 * text.trim().length).toFixed(3);

// ------------------------------------------------------------- chapters

const ChapterSlab: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(enter(frame, fps), fadeOut(frame, Math.round(2.5 * fps)));
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top,
        left: SAFE.left,
        maxWidth: 560,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 26px 12px 12px",
        borderRadius: 18,
        background: brand.background,
        boxShadow: slabEdge(10, brand.primary),
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [-40, 0])}px)`,
      }}
    >
      <div
        style={{
          flex: "0 0 56px",
          height: 56,
          borderRadius: 12,
          background: brand.highlight,
          boxShadow: slabEdge(6, brand.accent),
          color: brand.textOnCard,
          fontSize: 30,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index}
      </div>
      <div
        style={{ color: WHITE, fontWeight: 800, fontSize: 32, lineHeight: 1.2 }}
      >
        <span
          style={{
            color: brand.highlight,
            fontSize: 22,
            letterSpacing: 4,
            display: "block",
          }}
        >
          PHẦN {index}
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
          <ChapterSlab index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- captions

// White words on a navy slab with a blue edge; keywords amber, the word being
// said lifts like a block.
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
          background: brand.background,
          borderRadius: 20,
          boxShadow: slabEdge(12, brand.primary),
          padding: "14px 28px 18px",
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 50,
          lineHeight: 1.25,
          textWrap: "balance",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
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
                  display: "inline-block",
                  color: hit.has(i) ? brand.highlight : WHITE,
                  opacity: spoken ? 1 : 0.6,
                  margin: `0 ${saidRoom(1.07, t.text)}em`,
                  transform: `translateY(${now ? -4 : 0}px) scale(${now ? 1.07 : 1})`,
                  textShadow: now ? `0 5px 0 ${brand.primary}` : "none",
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
                  ...SLAB,
                  background: PALE,
                  boxShadow: slabEdge(6, SKY),
                  fontFamily: FONT,
                  fontSize: 28,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "7px 20px",
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
