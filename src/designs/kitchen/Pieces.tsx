// Overlay pieces that stay small and unhurried: a tilted polaroid for numbers
// (adapted from .claude/elements/storytelling/polaroid-pictures), a plain
// white tag for a named bank, and a chapter title with a brief amber wash.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { Figure } from "../../mortgage/golden";
import { SAFE } from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT } from "../../mortgage/style";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const WARM_GREY = "#8C8271";
const PALE_NAVY = "rgba(11,31,61,0.16)";

// A single tilted polaroid across the top-left of SAFE, laid out as one row
// (the number, then its label beside it) so the whole card sits in the band
// above Daniel's head (SAFE.top to ~560, his hair starts ~570 in a full-frame
// talk). The old square card (ring over label) ran down to ~760 and his head
// hid the label. Ends at x 700, clear of the top-right LogoMark.
const CARD_W = 646;
const NUMBER_W = 330;

export const Polaroid: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [0, 18], [0, 1], clamp);
  const outP = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    clamp,
  );
  const opacity = Math.min(inP, outP);
  const numberSize = Math.min(
    88,
    fitText({
      text: figure.big,
      withinWidth: NUMBER_W,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top,
        left: SAFE.left,
        width: CARD_W,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 22,
        background: "#fff",
        borderRadius: 18,
        padding: "16px 24px",
        boxShadow: `0 18px 40px ${brand.navy}38`, // navy at ~22%
        transform: "rotate(-2deg)",
        opacity,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          flex: "none",
          fontWeight: 900,
          fontSize: numberSize,
          lineHeight: 1.05,
          color: brand.textOnCard,
          whiteSpace: "nowrap",
          paddingBottom: 6,
          borderBottom: `8px solid ${PALE_NAVY}`,
        }}
      >
        {figure.big}
      </div>
      {figure.label ? (
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: brand.textOnCard,
            lineHeight: 1.25,
          }}
        >
          {figure.label}
        </div>
      ) : null}
    </div>
  );
};

// A small white tag, never a hero: a warm-grey "Ngân hàng ·" then the logo.
// Fades only, no spring, no colour claim of endorsement.
export const LenderTag: React.FC<{ lender: Lender; frames: number }> = ({
  lender,
  frames,
}) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    interpolate(frame, [0, 10], [0, 1], clamp),
    interpolate(frame, [frames - 10, frames], [1, 0], clamp),
  );
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: SAFE.top + 830, // ~1250: left edge, above the caption strip
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 18px",
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 10px 26px rgba(60,45,20,0.16)",
        opacity,
        fontFamily: FONT,
      }}
    >
      <span style={{ color: WARM_GREY, fontWeight: 700, fontSize: 26 }}>
        Ngân hàng ·
      </span>
      <LenderLogo lender={lender} height={60} />
    </div>
  );
};

// A brief amber wash (8 frames) into a small title line, top-left inside
// SAFE, for the chapter's whole 2.5 s — no "PHẦN n" numbering; a story has
// beats, not parts.
export const ChapterCard: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 4, 8], [0, 0.3, 0], clamp);
  const textIn = interpolate(frame, [4, 18], [0, 1], clamp);
  return (
    <>
      <AbsoluteFill
        style={{
          background: brand.accent,
          opacity: flash,
          mixBlendMode: "multiply",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          opacity: textIn,
          transform: `translateY(${interpolate(textIn, [0, 1], [10, 0])}px)`,
          fontFamily: FONT,
          fontSize: 48,
          fontWeight: 800,
          color: brand.textOnCard,
        }}
      >
        {title}
      </div>
    </>
  );
};
