// The words on screen: a caption page (in the strip, or big on the stage
// during a statement slide), the English line, and the chips (a figure or bank
// arriving while another slide holds the stage).
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import { FONT, clamp } from "../../../mortgage/style";
import { YT_SAFE } from "../../frame";
import {
  COUNTER_W,
  INK,
  Marked,
  PAPER,
  SLATE,
  STAGE,
  colX,
  span,
} from "./Chrome";
import { slideAt, type Chip, type Deck } from "./Plan";

export const CAPTION_W = YT_SAFE.right - YT_SAFE.left - COUNTER_W - 60;
const EN_BOTTOM = 1080 - YT_SAFE.bottom;
const VI_BOTTOM = EN_BOTTOM + 46;

// One caption page: in the strip, or big on the stage while a statement slide
// holds it (then the strip shows only the English line).
export const CaptionPage: React.FC<{
  page: TikTokPage;
  from: number;
  deck: Deck;
  keywords: string[];
}> = ({ page, from, deck, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = page.tokens.map((t) => t.text);
  const statement =
    deck.slides[slideAt(deck, from + frame)]?.kind === "statement";
  if (statement) {
    const p = spring({
      frame,
      fps,
      config: { damping: 200 },
      durationInFrames: 14,
    });
    return (
      <div
        style={{
          position: "absolute",
          left: colX(1),
          width: span(10),
          top: STAGE.top,
          height: STAGE.bottom - STAGE.top,
          display: "flex",
          alignItems: "center",
          fontFamily: FONT,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.3,
          color: INK,
          opacity: p,
          transform: `translateY(${(1 - p) * 24}px)`,
        }}
      >
        <div>
          <Marked words={words} keywords={keywords} />
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        left: YT_SAFE.left,
        width: CAPTION_W,
        bottom: VI_BOTTOM,
        fontFamily: FONT,
        fontSize: 54,
        fontWeight: 800,
        lineHeight: 1.28,
        color: INK,
      }}
    >
      <Marked words={words} keywords={keywords} />
    </div>
  );
};

export const EnglishLine: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      left: YT_SAFE.left,
      width: CAPTION_W,
      bottom: EN_BOTTOM,
      fontFamily: FONT,
      fontSize: 30,
      fontWeight: 600,
      color: SLATE,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {text}
  </div>
);

// A chip rides the title bar's right side (left of the logo mark).
export const Chips: React.FC<{ chips: Chip[] }> = ({ chips }) => (
  <>
    {chips.map((c) => (
      <Sequence
        key={`${c.from}${c.figure?.big ?? c.lender?.name}`}
        from={c.from}
        durationInFrames={c.to - c.from}
        layout="none"
      >
        <ChipView chip={c} dur={c.to - c.from} />
      </Sequence>
    ))}
  </>
);

const ChipView: React.FC<{ chip: Chip; dur: number }> = ({ chip, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 12,
  });
  const o = p * interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        right: 1920 - 1590,
        top: 128,
        height: 76,
        maxWidth: 480,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: chip.lender ? 0 : "0 22px",
        borderRadius: 14,
        background: chip.lender ? "transparent" : PAPER,
        fontFamily: FONT,
        opacity: o,
        transform: `translateY(${(1 - p) * -16}px)`,
      }}
    >
      {chip.lender ? (
        <LenderLogo lender={chip.lender} height={42} />
      ) : (
        <>
          <span style={{ fontSize: 44, fontWeight: 900, color: INK }}>
            {chip.figure?.big}
          </span>
          {chip.figure?.label ? (
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: SLATE,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {chip.figure.label}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
};
