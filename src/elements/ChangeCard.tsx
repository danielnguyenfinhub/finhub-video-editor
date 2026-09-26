// A value changing from old to new (a rate cut, a repayment drop) on a navy
// card: kicker, what changed, then the value. The value swaps at frame
// `swapAt` with remocn's value-swap, or a strike-through when the design
// prefers one and no direction is given. The arrow shows `direction`; its
// colour is the tone, so green/red appear only when the change is good/bad.
// Every string is on-screen copy: in a reel it goes through the RG 234 check
// (onScreenCopy in src/mortgage/schema.ts).
import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand/theme";
import type { Tone } from "../mortgage/schema";
import { FONT, toneColor } from "../mortgage/style";
import { StrikethroughReplace } from "./remocn/strikethrough-replace";
import { ValueSwap } from "./remocn/value-swap";

const VALUE_SIZE = 116;

export const ChangeCard: React.FC<{
  kicker?: string;
  label: string;
  from: string;
  to: string;
  swapAt: number; // frame
  direction?: "up" | "down";
  tone?: Tone;
  prefer?: "swap" | "strike";
}> = ({ kicker, label, from, to, swapAt, direction, tone = "neutral", prefer = "swap" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strike = prefer === "strike" && !direction;
  const arrowIn = spring({ frame: frame - swapAt, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        padding: "32px 40px 36px",
        borderRadius: 28,
        backgroundColor: "rgba(11, 31, 61, 0.92)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)",
        border: `3px solid ${brand.accent}`,
        fontFamily: FONT,
        color: brand.text,
      }}
    >
      {kicker ? (
        <div
          style={{
            fontSize: 34,
            letterSpacing: 5,
            fontWeight: 900,
            color: brand.accent,
            lineHeight: 1.3,
          }}
        >
          {kicker.normalize("NFC")}
        </div>
      ) : null}
      <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.3 }}>
        {label.normalize("NFC")}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          marginTop: 12,
          fontSize: VALUE_SIZE,
          fontWeight: 900,
          lineHeight: 1.2,
        }}
      >
        {strike ? (
          <StrikethroughReplace
            from={from}
            to={to}
            at={swapAt}
            fontSize={VALUE_SIZE}
            fontWeight={900}
            lineColor={brand.accent}
          />
        ) : (
          <ValueSwap values={[from, to]} at={swapAt} direction={direction} distance={40} />
        )}
        {direction ? (
          <svg
            width={64}
            height={64}
            viewBox="0 0 64 64"
            style={{
              opacity: arrowIn,
              transform: `translateY(${(1 - arrowIn) * (direction === "down" ? -30 : 30)}px)`,
            }}
          >
            <polygon
              points={direction === "down" ? "4,10 60,10 32,58" : "4,54 60,54 32,6"}
              fill={toneColor(tone, brand.highlight)}
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
};
