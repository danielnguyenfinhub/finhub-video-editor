// "classic"'s Behind layer (golden rules 1, 2, 3b): the automatic figures
// figuresOf() adds for numbers no edit.json stat or cue covers, as a compact
// stat card, and the logo of every bank Daniel names. Both sit in the band
// above his head (SAFE.top down to ~y 600, his hair top) and are drawn behind
// his cut-out (index.tsx Talk), so they never cover his face. Stat cards stay
// in the Overlay (Captions.tsx); figuresOf skips numbers they cover, so a
// number is never shown twice. Classic has no LogoMark in SAFE (its logo sits
// in Chrome, above SAFE), so the lender takes the band's right end.
// ponytail: a cue panel or stat card (Overlay, y 110+) can sit over the band
// while a bank is named; give the lender its own slot if that shows up.
import { Underline } from "@remotion/rough-notation";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { OverlayProps } from "../../mortgage/design";
import { SAFE, figuresOf, lenderMentionsOf } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";

const CARD_WIDTH = 480; // x 54-534; the lender tile (<= 280) starts at 680+
// 86: every logo file (scale 0.7-1.3) is at least 60 px tall.
const LENDER_HEIGHT = 86;

const useFade = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  return { frame, inP, outP };
};

// The stat card (Captions.tsx StatCardView) cut down to the band: same navy
// gradient, amber border, highlight number with a pen underline.
const AutoCard: React.FC<{ big: string; label: string }> = ({ big, label }) => {
  const { frame, inP, outP } = useFade();
  const size = Math.min(
    86,
    fitText({
      text: big,
      withinWidth: CARD_WIDTH - 60,
      fontFamily: FONT,
      fontWeight: 900,
      letterSpacing: "-2px",
    }).fontSize,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: SAFE.top,
        width: CARD_WIDTH,
        padding: "12px 28px 16px",
        borderRadius: 26,
        background:
          "linear-gradient(135deg, rgba(0,100,168,0.95), rgba(11,31,61,0.95))",
        border: `3px solid ${brand.accent}`,
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
        fontFamily: FONT,
        textAlign: "center",
        opacity: 1 - outP,
        transform: `translateY(${interpolate(inP, [0, 1], [-60, 0])}px) rotate(${interpolate(inP, [0, 1], [-4, 0])}deg)`,
      }}
    >
      <Underline
        progress={interpolate(frame, [8, 24], [0, 1], clamp)}
        color={brand.highlight}
        strokeWidth={5}
        iterations={2}
      >
        <span
          style={{
            fontSize: size,
            fontWeight: 900,
            color: brand.highlight,
            letterSpacing: -2,
            whiteSpace: "nowrap",
          }}
        >
          {big}
        </span>
      </Underline>
      {label ? (
        <div
          style={{ fontSize: 30, fontWeight: 600, color: "#fff", marginTop: 4 }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

const LenderTile: React.FC<{ lender: Lender }> = ({ lender }) => {
  const { inP, outP } = useFade();
  return (
    <AbsoluteFill
      style={{
        top: SAFE.top,
        left: SAFE.left,
        width: SAFE.right - SAFE.left,
        alignItems: "flex-end",
      }}
    >
      <LenderLogo
        lender={lender}
        height={LENDER_HEIGHT}
        style={{
          border: `3px solid ${brand.accent}`,
          boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
          opacity: 1 - outP,
          transform: `translateY(${interpolate(inP, [0, 1], [-60, 0])}px) scale(${interpolate(inP, [0, 1], [0.7, 1])})`,
        }}
      />
    </AbsoluteFill>
  );
};

const Figures: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {figuresOf(reel, fps)
        .filter((f) => f.source === "auto")
        .map((f) => (
          <Sequence
            key={f.fromFrame}
            from={f.fromFrame}
            durationInFrames={f.frames}
          >
            <AutoCard big={f.big} label={f.label} />
          </Sequence>
        ))}
    </>
  );
};

const Lenders: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const dur = Math.round(((m.endMs - m.startMs) / 1000) * fps);
        return dur > 0 ? (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={dur}
          >
            <LenderTile lender={m.lender} />
          </Sequence>
        ) : null;
      })}
    </>
  );
};

export const Behind: React.FC<OverlayProps> = ({ reel }) => (
  <>
    <Figures reel={reel} />
    <Lenders reel={reel} />
  </>
);
