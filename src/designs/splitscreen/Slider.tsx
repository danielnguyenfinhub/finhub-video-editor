// "splitscreen" (Chia đôi, Split Slider) parts: the backdrop, the slider
// stage (a cool steel BEFORE pane on the left, a brand-navy AFTER pane with
// gold light on the right, split at the divider), the divider with its round
// ◀ ▶ handle, the TRƯỚC / SAU tags and the split chip. Plan.ts decides where
// the divider stands each frame; Scenes.tsx fills the panes.
import type React from "react";
import { useEffect, useState } from "react";
import { AbsoluteFill, useDelayRender } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, reelFontReady } from "../../mortgage/style";

export const GOLD = brand.highlight;
// Brand sky: the logo blue lifted towards white (no new colour token).
export const SKY = `color-mix(in srgb, ${brand.primary} 45%, #ffffff)`;
export const MUTED = "rgba(255,255,255,0.72)";
export const BEFORE_TAG = "TRƯỚC";
export const AFTER_TAG = "SAU";

// The stage band (global px). Its top edge is the chip rail: a chip rides
// on it, centred on STAGE.top, so stage content starts INNER below it.
export const STAGE = {
  top: 610,
  bottom: 1150,
  left: SAFE.left,
  right: SAFE.right,
} as const;
export const W = STAGE.right - STAGE.left;
export const H = STAGE.bottom - STAGE.top;
export const MID = W / 2; // stage-local x of the settled divider
export const INNER = 50; // stage-local y where content starts
export const KNOB_Y = H / 2; // stage-local y of the handle
export const KNOB_R = 34;
export const GUTTER = 58; // clear space either side of the divider
export const SIDE_W = MID - 2 * GUTTER + 4; // a side's content width
export const STRIP_TOP = 1172; // the dark caption strip
export const RADIUS = 26;

// fitText needs Be Vietnam Pro loaded: false until it is, frame held meanwhile.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("splitscreen: Be Vietnam Pro"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return ready;
};

// ------------------------------------------------------------- backdrop

// Deep navy with a slow diagonal light and the dark caption strip under the
// stage, a gold hairline on its top edge.
export const Backdrop: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle 620px at ${300 + 160 * Math.sin(t / 80)}px ${760 + 90 * Math.cos(t / 95)}px, rgba(0,100,168,0.28), transparent 70%),
        linear-gradient(175deg, ${brand.background} 0%, ${brand.navy} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.6px)",
        backgroundSize: "36px 36px",
        backgroundPosition: `${(t * 0.25) % 36}px 0px`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: STRIP_TOP,
        bottom: 0,
        background: `linear-gradient(180deg, rgba(6,19,42,0.94), ${brand.navy})`,
        borderTop: "2px solid rgba(255,185,56,0.35)",
      }}
    />
  </AbsoluteFill>
);

// ------------------------------------------------------------- panes

const BEFORE_BG = (t: number) =>
  `repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 16px) ${(t * 0.4) % 22.6}px 0 / auto,
   linear-gradient(165deg, rgba(91,107,128,0.62) 0%, rgba(91,107,128,0.28) 55%, rgba(6,19,42,0.9) 100%)`;
const AFTER_BG = (t: number) =>
  `radial-gradient(circle 440px at ${72 + 6 * Math.sin(t / 40)}% 26%, rgba(0,100,168,0.55), transparent 70%),
   linear-gradient(180deg, rgba(255,185,56,0.22) 0, transparent 5px),
   linear-gradient(170deg, ${brand.background}, ${brand.navy})`;

// The stage frame: children are positioned in stage-local px.
export const StageBox: React.FC<{
  children: React.ReactNode;
  opacity?: number;
}> = ({ children, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: STAGE.left,
      top: STAGE.top,
      width: W,
      height: H,
      borderRadius: RADIUS,
      overflow: "hidden",
      border: "2px solid rgba(255,255,255,0.14)",
      boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
      boxSizing: "border-box",
      fontFamily: FONT,
      opacity,
    }}
  >
    {children}
  </div>
);

// One pane, clipped at the divider (x stage-local).
export const Pane: React.FC<{
  side: "before" | "after";
  x: number;
  t: number;
  children?: React.ReactNode;
}> = ({ side, x, t, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: side === "before" ? BEFORE_BG(t) : AFTER_BG(t),
      clipPath:
        side === "before"
          ? `inset(0 ${Math.max(0, W - x)}px 0 0)`
          : `inset(0 0 0 ${Math.max(0, x)}px)`,
    }}
  >
    {children}
  </div>
);

// The divider: a gold line, and (knob > 0) the round handle with ◀ ▶.
// `nudge` pulses the arrows outward (the handle inviting a drag).
export const Divider: React.FC<{
  x: number;
  knob: number;
  opacity: number;
  nudge: number;
  flash?: number; // frames since the reveal
}> = ({ x, knob, opacity, nudge, flash }) => {
  const r = KNOB_R * knob;
  const tri = (dir: -1 | 1) => {
    const cx = x + dir * (r * 0.42 + nudge);
    const s = r * 0.26;
    return `${cx + dir * s},${KNOB_Y} ${cx - dir * s * 0.6},${KNOB_Y - s} ${cx - dir * s * 0.6},${KNOB_Y + s}`;
  };
  return (
    <svg
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, opacity, overflow: "visible" }}
    >
      <line
        x1={x}
        x2={x}
        y1={0}
        y2={H}
        stroke={GOLD}
        strokeWidth={3 + 3 * knob}
        style={{ filter: `drop-shadow(0 0 10px ${GOLD})` }}
      />
      {flash !== undefined && flash < 18 ? (
        <circle
          cx={x}
          cy={KNOB_Y}
          r={KNOB_R + flash * 12}
          fill="none"
          stroke={GOLD}
          strokeWidth={5}
          opacity={1 - flash / 18}
        />
      ) : null}
      {r > 1 ? (
        <>
          <circle
            cx={x}
            cy={KNOB_Y}
            r={r}
            fill={brand.navy}
            stroke={GOLD}
            strokeWidth={5}
            style={{ filter: `drop-shadow(0 0 16px rgba(255,185,56,0.7))` }}
          />
          <polygon points={tri(-1)} fill="#ffffff" />
          <polygon points={tri(1)} fill="#ffffff" />
        </>
      ) : null}
    </svg>
  );
};

// A small TRƯỚC / SAU pill at the top of a side.
export const Tag: React.FC<{ text: string; after?: boolean }> = ({
  text,
  after,
}) => (
  <div
    style={{
      display: "inline-block",
      padding: "5px 16px 4px",
      borderRadius: 999,
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 5,
      lineHeight: 1.3,
      color: after ? brand.navy : MUTED,
      background: after ? GOLD : "rgba(255,255,255,0.1)",
      border: after ? "none" : "2px solid rgba(255,255,255,0.28)",
    }}
  >
    {text}
  </div>
);
