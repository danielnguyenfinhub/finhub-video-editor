// "journey" shared pieces for the cue layers: which cues the design draws
// itself, fades, the ribbon banner and the route plan's layout (the pin reads
// it to hop onto a milestone).
import type React from "react";
import { interpolate } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import type { Cue } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import { INK, alpha } from "./Map";

export type OwnCue = Extract<Cue, { kind: "points" | "compare" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare";

export const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);
export const SHADOW = `0 12px 26px ${alpha(brand.navy, 0.22)}`;
export const RAMP = 10;
// MotionTrack panels sit at top 110 + offset: start them under the LogoMark.
export const PANEL_OFFSET = 600 - 110;

// ------------------------------------------------------------- layouts

export const TOP = 604; // title / question banner
export const LOW = 1070; // the lowest milestone (nearest the road)
const HIGH = 742; // the first milestone, at the top: the list reads down
export const DISC = 30;
// Card text shrinks for long lists so cards never touch (step >= card).
export const cardFont = (n: number) => (n >= 6 ? 30 : n >= 5 ? 34 : 36);
export const CARD_LEFT = 272;

export const pointsLayout = (n: number) => {
  const step = Math.min(118, (LOW - HIGH) / Math.max(1, n - 1));
  return Array.from({ length: n }, (_, i) => ({
    x: i % 2 ? 214 : 150,
    y: HIGH + i * step,
  }));
};

// ------------------------------------------------------------- banner

export const Banner: React.FC<{ text: string; p: number; color?: string }> = ({
  text,
  p,
  color = "#ffffff",
}) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      right: 1080 - SAFE.right,
      top: TOP,
      display: "flex",
      justifyContent: "center",
      opacity: p,
      transform: `translateY(${(1 - p) * -24}px)`,
    }}
  >
    <div
      style={{
        background: INK,
        color,
        fontSize: 42,
        fontWeight: 900,
        lineHeight: 1.25,
        padding: "10px 60px 12px",
        textAlign: "center",
        clipPath:
          "polygon(0 0, 100% 0, calc(100% - 24px) 50%, 100% 100%, 0 100%, 24px 50%)",
      }}
    >
      {text}
    </div>
  </div>
);

// A points cue's items in the order they are said (milestone 1 = first said).
export const spokenOrder = <T extends { atMs: number }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.atMs - b.atMs);
