// The studio set: back wall with light panels, soft stage lights, a curved
// reflective floor, the wall screen's bezel, and the camera (a slow dolly
// across each chapter, a gentle push to a tight framing of the screen on big
// numbers). All colours are brand tokens through tint().
import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../../brand/theme";
import { clamp } from "../../../mortgage/style";
import type { Plan, Span } from "./Plan";
import { DOLLY, SCREEN, TIGHT_RAMP, tint } from "./tokens";

const WALL: React.CSSProperties = {
  position: "absolute",
  left: -400,
  top: -200,
  width: 2720,
  height: 1480,
};

// Wall, lights and floor. `t` = frame, for the lights' slow breathing.
export const StudioBackdrop: React.FC<{ t: number }> = ({ t }) => {
  const breathe = 0.85 + 0.15 * Math.sin(t / 70);
  return (
    <AbsoluteFill style={{ background: brand.navy }}>
      {/* back wall, oversized so the tight framing never shows its edge:
          navy into deep blue, vertical light panels */}
      <div
        style={{
          ...WALL,
          background: `linear-gradient(180deg, ${brand.navy} 0%, ${brand.background} 55%, ${tint(brand.primary, 0.35)} 72%, ${brand.navy} 90%)`,
        }}
      />
      <div
        style={{
          ...WALL,
          background: `repeating-linear-gradient(90deg, transparent 0px, transparent 150px, ${tint(brand.primary, 0.2)} 150px, ${tint(brand.primary, 0.2)} 156px, transparent 156px, transparent 240px)`,
          maskImage:
            "linear-gradient(180deg, transparent 10%, black 28%, black 55%, transparent 70%)",
          opacity: 0.9,
        }}
      />
      {/* stage lights: soft cones from the grid */}
      {[380, 1280, 1640].map((x, i) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x - 420,
            top: -120,
            width: 840,
            height: 900,
            background: `radial-gradient(ellipse 38% 70% at 50% 0%, ${tint(brand.textDim, 0.3 * breathe * (i === 1 ? 1.2 : 1))}, transparent 70%)`,
          }}
        />
      ))}
      {/* the curved floor, with the screen's glow reflected in it */}
      <div
        style={{
          position: "absolute",
          left: -500,
          width: 3000,
          top: 790,
          height: 700,
          borderRadius: "50% 50% 0 0 / 22% 22% 0 0",
          background: `linear-gradient(180deg, ${tint(brand.primary, 0.3)} 0%, ${brand.navy} 45%)`,
          borderTop: `2px solid ${tint(brand.textDim, 0.28)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SCREEN.x - 60,
          width: SCREEN.w + 120,
          top: 800,
          height: 240,
          background: `radial-gradient(ellipse 50% 60% at 50% 0%, ${tint(brand.primary, 0.55 * breathe)}, transparent 75%)`,
          filter: "blur(6px)",
        }}
      />
      {/* the column's riser: a thin plate the key point stands on */}
      <div
        style={{
          position: "absolute",
          left: 90,
          width: 640,
          top: 792,
          height: 30,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at 50% 50%, ${tint(brand.highlight, 0.22)}, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// The screen's glass and thin bright bezel; children are its picture.
export const ScreenFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: SCREEN.x,
      top: SCREEN.y,
      width: SCREEN.w,
      height: SCREEN.h,
      borderRadius: 22,
      border: `3px solid ${tint(brand.textDim, 0.85)}`,
      boxShadow: `0 0 0 8px ${tint(brand.navy, 0.9)}, 0 0 60px ${tint(brand.primary, 0.55)}, 0 30px 80px ${tint(brand.navy, 0.9)}`,
      overflow: "hidden",
      background: `linear-gradient(160deg, ${brand.background} 0%, ${tint(brand.primary, 0.55)} 100%)`,
    }}
  >
    {children}
    {/* glass: a faint diagonal sheen and scanlines over the picture */}
    <AbsoluteFill
      style={{
        background: `linear-gradient(115deg, ${tint(brand.text, 0.07)} 0%, transparent 32%), repeating-linear-gradient(0deg, ${tint(brand.navy, 0.05)} 0px, ${tint(brand.navy, 0.05)} 1px, transparent 1px, transparent 4px)`,
        pointerEvents: "none",
      }}
    />
  </div>
);

// 0 = wide, 1 = tight on the screen, eased in and out of each span.
export const tightness = (tight: Span[], frame: number): number => {
  let k = 0;
  for (const s of tight) {
    const v = interpolate(
      frame,
      [s.from, s.from + TIGHT_RAMP, s.to - TIGHT_RAMP, s.to],
      [0, 1, 1, 0],
      { ...clamp, easing: Easing.inOut(Easing.cubic) },
    );
    k = Math.max(k, v);
  }
  return k;
};

const WIDE = { ox: 960, oy: 540, cx: 960, cy: 540 };
// Tight: the screen's centre to the frame's, scaled so it clears the logo
// tile (top right) and the lower third.
const TIGHT = {
  ox: SCREEN.x + SCREEN.w / 2,
  oy: SCREEN.y + SCREEN.h / 2,
  cx: 900,
  cy: 458,
  scale: 1.14,
};

// Wraps the whole set. The dolly restarts at each chapter (under its slate).
export const Camera: React.FC<{
  plan: Plan;
  talkFrames: number;
  children: (tight: number) => React.ReactNode;
}> = ({ plan, talkFrames, children }) => {
  const frame = useCurrentFrame();
  const ch = [...plan.chapters].reverse().find((c) => c.from <= frame);
  const from = ch?.from ?? 0;
  const to = ch?.to ?? talkFrames;
  const dolly = 1 + DOLLY * interpolate(frame, [from, to], [0, 1], clamp);
  const k = tightness(plan.tight, frame);
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const s = lerp(dolly, TIGHT.scale);
  const ox = lerp(WIDE.ox, TIGHT.ox);
  const oy = lerp(WIDE.oy, TIGHT.oy);
  const cx = lerp(WIDE.cx, TIGHT.cx);
  const cy = lerp(WIDE.cy, TIGHT.cy);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `${ox}px ${oy}px`,
        transform: `translate(${cx - ox}px, ${cy - oy}px) scale(${s})`,
      }}
    >
      {children(k)}
    </AbsoluteFill>
  );
};
