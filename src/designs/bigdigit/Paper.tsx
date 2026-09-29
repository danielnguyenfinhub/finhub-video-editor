// "bigdigit" paper: the Swiss grid, the type and the two number motions every
// part of the design shares. White paper, navy ink, the logo blue as the one
// accent, hairline rules. A number is drawn in two weights: HOLLOW (a hairline
// outline, the "thin" state: Be Vietnam Pro ships 600/800/900 only) and SOLID
// (900 black). Numbers either ASSEMBLE (each character rises in, hollow, then
// fills solid) or ROLL (odometer: each column rolls from the old character to
// the new one and lands solid).
import { measureText } from "@remotion/layout-utils";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useDelayRender,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, clamp, reelFontReady } from "../../mortgage/style";

export const PAPER = brand.card;
export const INK = brand.background;
export const ACCENT = brand.primary;
export const SLATE = brand.slate;
export const HAIR = "rgba(11,31,61,0.16)";
export const GHOST = "rgba(11,31,61,0.07)";

// The grid (all y in frame px). Header: brand/chapter kicker top-left, the
// logo tile's place top-right; the stage between two rules; captions and the
// English line under the lower rule.
export const W = SAFE.right - SAFE.left;
export const HEADER_RULE = 592;
export const STAGE = { top: 614, bottom: 1150 } as const;
export const LOWER_RULE = 1170;
export const CAPTION_BOTTOM = 1392;
// Header text stops short of the LogoMark tile (120 px logo, 2000x1215 png).
export const HEADER_W = W - 270;
// Figures and banks that land while the stage is taken sit here as a chip.
export const CHIP = { right: SAFE.right, bottom: STAGE.bottom, w: 300 };
export const LABEL_W = W - CHIP.w - 30;

// A number line's height: the glyph box plus room for a comma's tail.
export const LINE = 1.18;

export const ease = (x: number) => 1 - (1 - x) ** 3;
export const fadeOut = (frame: number, dur: number, len = 8) =>
  interpolate(frame, [dur - len, dur], [1, 0], clamp);

// Be Vietnam Pro must be loaded before measureText/fitText.
export const useFontReady = (label: string): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(label));
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

export const charW = (ch: string, fontSize: number): number =>
  ch === " "
    ? 0
    : measureText({ text: ch, fontFamily: FONT, fontSize, fontWeight: 900 })
        .width;

// The largest size at which `texts` (the widest of them) fits `width`.
export const giantSize = (texts: string[], width: number, max: number) => {
  const at100 = Math.max(
    ...texts.map(
      (t) =>
        measureText({
          text: t,
          fontFamily: FONT,
          fontSize: 100,
          fontWeight: 900,
        }).width,
    ),
  );
  return Math.min(max, Math.floor((width / Math.max(1, at100)) * 100));
};

// White paper with a strict 6-column grid of faint hairlines and a slow
// baseline sweep, so the page is never quite still.
export const PaperBackdrop: React.FC<{ t: number }> = ({ t }) => {
  const cols = 6;
  const sweep = (t * 1.1) % 1920;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: SAFE.left + (W / cols) * i,
            width: 1,
            background: GHOST,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: sweep,
          height: 1,
          background: GHOST,
        }}
      />
    </AbsoluteFill>
  );
};

// A hairline that draws left to right from `at`.
export const Rule: React.FC<{
  top: number;
  at?: number;
  weight?: number;
  color?: string;
  left?: number;
  width?: number;
}> = ({
  top,
  at = 0,
  weight = 2,
  color = INK,
  left = SAFE.left,
  width = W,
}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame - at, [0, 18], [0, 1], {
    ...clamp,
    easing: ease,
  });
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: width * k,
        height: weight,
        background: color,
      }}
    />
  );
};

// Small caps label: the kicker (top-left) and the source/label (bottom-left).
export const Caps: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, size = 28, color = SLATE, style }) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: size * 0.16,
      lineHeight: 1.4,
      textTransform: "uppercase",
      textWrap: "balance",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

// One glyph in the hollow (hairline) or solid (black) weight; `fill` 0..1.
export const Glyph: React.FC<{
  ch: string;
  size: number;
  fill: number;
  color?: string;
}> = ({ ch, size, fill, color = INK }) => (
  <span
    style={{
      position: "relative",
      display: "inline-block",
      fontFamily: FONT,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1,
      color: "transparent",
      WebkitTextStroke: `${Math.max(2, size / 110)}px ${color}`,
    }}
  >
    {ch === " " ? " " : ch}
    <span
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        color,
        WebkitTextStroke: "0px transparent",
        opacity: fill,
      }}
    >
      {ch}
    </span>
  </span>
);

// A number that assembles character by character: each rises into its slot
// hollow and fills solid a few frames later.
export const Assemble: React.FC<{
  text: string;
  size: number;
  at?: number;
  stagger?: number;
  color?: string;
}> = ({ text, size, at = 0, stagger = 4, color = INK }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", height: size * LINE }}>
      {Array.from(text).map((ch, i) => {
        const t0 = at + i * stagger;
        const rise = interpolate(frame - t0, [0, 10], [0, 1], {
          ...clamp,
          easing: ease,
        });
        const fill = interpolate(frame - t0, [8, 16], [0, 1], clamp);
        return (
          <div
            key={`${ch}${i}`}
            style={{ overflow: "hidden", height: size * LINE, lineHeight: 1 }}
          >
            <div
              style={{
                transform: `translateY(${(1 - rise) * size * 0.9}px)`,
                opacity: rise,
              }}
            >
              <Glyph ch={ch} size={size} fill={fill} color={color} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
