// "flipcard" look primitives: the layout bands, the navy bokeh backdrop, the
// hero card in 3D (a front and a back face, a flip on the Y axis with a light
// sheen and a shadow that stretches while it turns), the two faces (navy foil
// = before, gold foil = after), and the text-fitting helpers.
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, clamp, reelFontReady } from "../../mortgage/style";

export const GOLD = brand.highlight;
export const NAVY = brand.navy;
export const BG = brand.background;
export const DIM = brand.textDim;
export const INK = brand.navy; // text on the gold face

// Bands, top to bottom, all inside SAFE: chapter tab (left, beside the
// LogoMark tile), the chip lane under the logo tile, the stage with the hero
// card, the ribbon hanging from the card, the caption strip, the English line.
export const W = SAFE.right - SAFE.left;
export const MID_X = (SAFE.left + SAFE.right) / 2;
export const CHAPTER = { top: SAFE.top + 10, height: 76, maxWidth: 620 };
export const LANE = { top: 586, height: 104 };
export const STAGE = { top: 704, bottom: 1206 };
export const CARD = { w: 820, h: 440, top: 712 };
export const CARD_LEFT = MID_X - CARD.w / 2;
export const RIBBON = { top: CARD.top + CARD.h - 14, height: 66 };
export const CAPTION_BOTTOM = 1386;

export const useFontReady = (label = "flipcard: Be Vietnam Pro"): boolean => {
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

export const fit1 = (text: string, width: number, max: number) =>
  Math.min(
    max,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

export const fitN = (text: string, width: number, max: number, lines = 2) =>
  fitTextOnNLines({
    text,
    maxLines: lines,
    maxBoxWidth: width,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: max,
  }).fontSize;

export const ease = (x: number) => 1 - (1 - x) ** 3;

// Fade over the last `frames` frames of the Sequence.
export const useExitOut = (frames = 8) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - frames, durationInFrames],
    [1, 0],
    clamp,
  );
};

// The card is dealt onto the stage: up from below with a small spin.
export const deal = (frame: number, fps: number, at = 0) => {
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 14, stiffness: 150, mass: 0.7 },
  });
  return {
    s,
    opacity: interpolate(frame - at, [0, 5], [0, 1], clamp),
    y: interpolate(s, [0, 1], [120, 0]),
    rot: interpolate(s, [0, 1], [-7, 0]),
  };
};

// Flip angle 0 → 180 around `mid` (the back shows from `mid` on).
export const FLIP_FRAMES = 18;
export const flipAngle = (frame: number, mid: number) =>
  interpolate(frame, [mid - FLIP_FRAMES / 2, mid + FLIP_FRAMES / 2], [0, 180], {
    ...clamp,
    easing: (x) => x * x * (3 - 2 * x),
  });

// The idle float: a slow bob and tilt on a continuous clock; the backdrop
// moves the other way (parallax).
export const idleTilt = (t: number) => ({
  rx: Math.sin(t / 53) * 4,
  ry: Math.sin(t / 71) * 7,
  y: Math.sin(t / 37) * 8,
});

// ------------------------------------------------------------ backdrop

const BOKEH = 16;

export const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const { ry } = idleTilt(t);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 700px at ${MID_X}px 900px, rgba(0,100,168,0.3), transparent 72%),
          linear-gradient(180deg, ${NAVY} 0%, ${BG} 55%, ${NAVY} 100%)`,
      }}
    >
      {Array.from({ length: BOKEH }, (_, i) => {
        const r = (k: string) => random(`flipcard-bokeh-${k}-${i}`);
        const size = 90 + r("s") * 260;
        const depth = 0.4 + r("d") * 0.9;
        const x =
          r("x") * 1180 - 50 - ry * 6 * depth + Math.sin(t / 90 + i) * 20;
        const y =
          ((((r("y") * 2100 - t * (0.15 + r("v") * 0.35) * depth) % 2100) +
            2100) %
            2100) -
          90;
        const gold = i % 4 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: gold
                ? "radial-gradient(circle, rgba(255,185,56,0.22) 0%, rgba(255,185,56,0.08) 45%, transparent 70%)"
                : "radial-gradient(circle, rgba(0,100,168,0.4) 0%, rgba(0,100,168,0.12) 45%, transparent 70%)",
              opacity: 0.35 + 0.45 * r("o"),
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ faces

const FOIL_NAVY = `repeating-radial-gradient(circle at 88% 16%, rgba(255,185,56,0.07) 0 2px, transparent 2px 15px),
  repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 9px),
  linear-gradient(150deg, color-mix(in srgb, ${brand.primary} 45%, ${BG}) 0%, ${BG} 48%, ${NAVY} 100%)`;

const FOIL_GOLD = `repeating-radial-gradient(circle at 12% 84%, rgba(255,255,255,0.14) 0 2px, transparent 2px 15px),
  repeating-linear-gradient(115deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 9px),
  linear-gradient(135deg, ${GOLD} 0%, color-mix(in srgb, ${GOLD} 55%, #ffffff) 34%, ${brand.accent} 70%, ${GOLD} 100%)`;

export type FaceKind = "navy" | "gold" | "white";

const FACE_BG: Record<FaceKind, string> = {
  navy: FOIL_NAVY,
  gold: FOIL_GOLD,
  white: "#ffffff",
};

// A face fills the card: foil background, an inner hairline frame, padding.
export const Face: React.FC<{
  kind: FaceKind;
  children: React.ReactNode;
  padding?: string;
}> = ({ kind, children, padding = "30px 38px" }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 34,
      overflow: "hidden",
      background: FACE_BG[kind],
      border: `2px solid ${kind === "navy" ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.55)"}`,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 12,
        borderRadius: 26,
        border: `1.5px solid ${kind === "navy" ? "rgba(255,185,56,0.3)" : "rgba(6,19,42,0.18)"}`,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  </div>
);

// Small corner tag on a face ("TRƯỚC" / "SAU", "ĐANG NHẮC TỚI").
export const Tag: React.FC<{ text: string; kind: FaceKind; size?: number }> = ({
  text,
  kind,
  size = 28,
}) => (
  <span
    style={{
      display: "inline-block",
      alignSelf: "flex-start",
      padding: "4px 16px",
      borderRadius: 999,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.3,
      letterSpacing: 3,
      whiteSpace: "nowrap",
      color: kind === "navy" ? INK : GOLD,
      background: kind === "navy" ? GOLD : INK,
    }}
  >
    {text}
  </span>
);

// ------------------------------------------------------------ the card

// The hero card: `angle` 0 shows the front, 180 the back. While it turns it
// lifts towards the camera, a light sheen crosses it and its shadow stretches
// and softens. `sheen` (0..1, or -1 for none) runs an extra idle sweep.
export const FlipCard: React.FC<{
  front: React.ReactNode;
  back?: React.ReactNode;
  angle?: number;
  left?: number;
  top?: number;
  w?: number;
  h?: number;
  tilt?: { rx: number; ry: number; y: number };
  enterY?: number;
  enterRot?: number;
  opacity?: number;
  sheen?: number;
  radius?: number;
}> = ({
  front,
  back,
  angle = 0,
  left = CARD_LEFT,
  top = CARD.top,
  w = CARD.w,
  h = CARD.h,
  tilt = { rx: 0, ry: 0, y: 0 },
  enterY = 0,
  enterRot = 0,
  opacity = 1,
  sheen = -1,
  radius = 34,
}) => {
  const s = Math.sin((angle * Math.PI) / 180); // 0 flat, 1 edge-on
  const lift = 1 + 0.07 * s;
  const showBack = angle >= 90;
  // The sweep crosses the face as the card turns (or on an idle beat).
  const sweep = s > 0.02 ? angle / 180 : sheen;
  const dy = tilt.y + enterY;
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {/* Shadow on the "table": wider, lower and softer while lifted. */}
      <div
        style={{
          position: "absolute",
          left: left + w / 2 - (w * (0.95 + 0.3 * s)) / 2,
          top: top + h - 40 + 36 * s + dy * 0.4,
          width: w * (0.95 + 0.3 * s),
          height: 110 + 70 * s,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(0,0,0,${0.62 - 0.22 * s}) 0%, rgba(0,0,0,${0.3 - 0.12 * s}) 40%, transparent 72%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left,
          top: top + dy,
          width: w,
          height: h,
          perspective: 1900,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `rotateZ(${enterRot}deg) rotateX(${tilt.rx}deg) rotateY(${angle + tilt.ry}deg) scale(${lift})`,
            boxShadow: `0 ${24 + 30 * s}px ${50 + 40 * s}px rgba(0,0,0,0.45)`,
            borderRadius: radius,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: showBack ? "scaleX(-1)" : undefined,
            }}
          >
            {showBack ? back : front}
            {/* Edge-on darkening: the face turns away from the light. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: radius,
                background: `rgba(6,19,42,${0.45 * s})`,
              }}
            />
            {sweep >= 0 && sweep <= 1 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: radius,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -40,
                    bottom: -40,
                    width: "45%",
                    left: `${interpolate(sweep, [0, 1], [-50, 110])}%`,
                    background:
                      "linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.38) 50%, transparent 100%)",
                    transform: "skewX(-14deg)",
                    mixBlendMode: "overlay",
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// Idle sheen: a sweep every `every` frames (0..1 while it runs, else -1).
export const idleSheen = (t: number, every = 75, len = 22) => {
  const k = ((t % every) + every) % every;
  return k < len ? k / len : -1;
};
