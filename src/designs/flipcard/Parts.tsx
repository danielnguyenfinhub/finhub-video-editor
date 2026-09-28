// Small flipcard parts: the card back (a face-down card in the deck), the
// flip icon, and the ribbon that unfurls under the hero card.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT, clamp } from "../../mortgage/style";
import { GOLD, MID_X, NAVY, RIBBON, W, ease, fit1 } from "./Look";

// Face-down: navy with a dense gold guilloche, no marks (not a bank card).
export const CardBack: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 26,
      border: "2px solid rgba(255,185,56,0.45)",
      background: `repeating-radial-gradient(circle at 50% 50%, rgba(255,185,56,0.16) 0 2px, transparent 2px 12px),
        repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 10px),
        ${NAVY}`,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 14,
        borderRadius: 18,
        border: "1.5px solid rgba(255,185,56,0.35)",
      }}
    />
  </div>
);

// Two curved arrows: "turn over".
export const FlipIcon: React.FC<{ color?: string; size?: number }> = ({
  color = GOLD,
  size = 34,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ flex: "0 0 auto" }}
  >
    <path
      d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    <path
      d="M20 3.5v5.2h-5.2M4 20.5v-5.2h5.2"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// A navy ribbon with folded tails, unfurling from the centre at `at`.
export const Ribbon: React.FC<{
  text: string;
  at: number;
  accent: string;
  icon?: React.ReactNode;
  opacity?: number;
}> = ({ text, at, accent, icon, opacity = 1 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const k = interpolate(frame, [at, at + 12], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const size = fit1(text, W - 200 - (icon ? 50 : 0), 38);
  const tail: React.CSSProperties = {
    position: "absolute",
    top: 14,
    width: 60,
    height: RIBBON.height - 4,
    background: `color-mix(in srgb, ${accent} 30%, ${NAVY})`,
    opacity: k,
  };
  return (
    <div
      style={{
        position: "absolute",
        left: MID_X,
        top: RIBBON.top,
        transform: "translateX(-50%)",
        fontFamily: FONT,
        opacity,
      }}
    >
      <div
        style={{
          ...tail,
          left: -34,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 26% 50%)",
        }}
      />
      <div
        style={{
          ...tail,
          right: -34,
          clipPath: "polygon(0 0, 100% 0, 74% 50%, 100% 100%, 0 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: RIBBON.height,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 34px",
          background: NAVY,
          border: `3px solid ${accent}`,
          borderRadius: 10,
          boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
          color: accent,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          transform: `scaleX(${k})`,
        }}
      >
        {icon}
        <span style={{ opacity: interpolate(k, [0.6, 1], [0, 1], clamp) }}>
          {text}
        </span>
      </div>
    </div>
  );
};
