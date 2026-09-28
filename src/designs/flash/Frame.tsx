// "flash" look primitives: the layout bands, the navy backdrop, the gold
// alert bar (with the chapter tag), the hazard-stripe sweep, the light-sweep
// glint, the punch-in + camera shake and the shockwave ring.
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
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

export const ALERT_LABEL = "CẬP NHẬT LÃI SUẤT";
export const CHAPTER_WORD = "PHẦN";

// Bands, top to bottom, all inside SAFE. The alert bar stops left of the
// LogoMark tile (120 px logo, 2000x1215 png, 22 px padding: ~242 px wide).
export const W = SAFE.right - SAFE.left;
export const ALERT = { top: SAFE.top, height: 100, right: 700 };
export const CHIP = { top: 590, height: 84 };
export const STAGE = { top: 692, bottom: 1182 };
export const STAGE_H = STAGE.bottom - STAGE.top;
export const CAPTION_BOTTOM = 1384;

export const STRIPES = (a: string, b: string, w = 22) =>
  `repeating-linear-gradient(-45deg, ${a} 0 ${w}px, ${b} ${w}px ${2 * w}px)`;

export const useFontReady = (label = "flash: Be Vietnam Pro"): boolean => {
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

// ------------------------------------------------------------ backdrop

// `t` is a continuous clock (talk frame or cover frame): a siren glow pulses
// from the alert bar every second and a fine diagonal texture drifts, so the
// frame is never still (rule 5b).
export const FlashBackdrop: React.FC<{ t: number }> = ({ t }) => {
  const pulse = 0.5 + 0.5 * Math.sin((t / 30) * Math.PI * 2);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 620px at 260px ${ALERT.top + 50}px, rgba(255,185,56,${0.1 + 0.1 * pulse}), transparent 70%),
          radial-gradient(circle 700px at 900px 1500px, rgba(0,100,168,0.28), transparent 70%),
          linear-gradient(172deg, ${BG} 0%, ${NAVY} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 46px)",
          backgroundPosition: `${(t * 0.8) % 65}px 0`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ motion helpers

// Punch in: 1.12 -> 1 in ~5 frames with a small overshoot (kept small so
// a punching card never leaves SAFE).
export const punch = (frame: number, fps: number, at = 0) => {
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 11, stiffness: 320, mass: 0.5 },
  });
  return {
    scale: interpolate(s, [0, 1], [1.12, 1]),
    opacity: interpolate(frame - at, [0, 3], [0, 1], clamp),
  };
};

// Slam: 2.2 -> 1, harder than punch (the new value).
export const slam = (frame: number, fps: number, at = 0) => {
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 13, stiffness: 420, mass: 0.6 },
  });
  return {
    scale: interpolate(s, [0, 1], [2.2, 1]),
    opacity: interpolate(frame - at, [0, 2], [0, 1], clamp),
  };
};

// Camera shake: a few px for 6 frames after `at`, then still.
const SHAKE = [
  [7, -5],
  [-6, 6],
  [5, -4],
  [-4, 3],
  [2, -2],
  [-1, 1],
];
export const shake = (frame: number, at: number, amp = 1): string => {
  const k = frame - at;
  const [x, y] = k >= 0 && k < SHAKE.length ? SHAKE[k] : [0, 0];
  return `translate(${x * amp}px, ${y * amp}px)`;
};

// Fade + drop over the last 7 frames of the Sequence.
export const useExitOut = (frames = 7) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - frames, durationInFrames],
    [1, 0],
    clamp,
  );
};

// ------------------------------------------------------------ glint

// A fast light sweep across its children, at `first` and then every `every`
// frames (adapted from the Elements "Shine" as plain CSS: no canvas).
export const Glint: React.FC<{
  children: React.ReactNode;
  first?: number;
  every?: number;
  style?: React.CSSProperties;
}> = ({ children, first = 4, every = 54, style }) => {
  const frame = useCurrentFrame();
  const k = frame < first ? -1 : (frame - first) % every;
  const x = interpolate(k, [0, 12], [-130, 130], clamp);
  return (
    <div style={{ position: "relative", ...style }}>
      {children}
      {/* Only the sweep is clipped, never the children's glow. */}
      {k >= 0 && k <= 12 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: style?.borderRadius,
            pointerEvents: "none",
            // Soft sides: the sweep fades out before the box edge.
            maskImage:
              "linear-gradient(90deg, transparent, black 18%, black 82%, transparent)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)",
              transform: `translateX(${x}%)`,
              // Lights the bright text, barely touches the dark card.
              mixBlendMode: "overlay",
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------ shockwave

export const Shockwave: React.FC<{
  at: number;
  size: number;
  color?: string;
}> = ({ at, size, color = GOLD }) => {
  const frame = useCurrentFrame();
  const k = frame - at;
  if (k < 0 || k > 18) return null;
  const r = interpolate(k, [0, 18], [size * 0.15, size * 0.5], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  return (
    <svg
      width={size}
      height={size}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        pointerEvents: "none",
      }}
    >
      {[0, 5].map((d) => (
        <circle
          key={d}
          cx={size / 2}
          cy={size / 2}
          r={Math.max(1, r - d * 6)}
          fill="none"
          stroke={color}
          strokeWidth={interpolate(k, [0, 18], [16, 2], clamp)}
          opacity={interpolate(k, [0, 18], [0.9, 0], clamp) * (d ? 0.5 : 1)}
        />
      ))}
    </svg>
  );
};

// ------------------------------------------------------------ hazard sweep

// A diagonal gold/navy hazard band that crosses the frame in 14 frames. Drawn
// under the stage cards: it shows in the gaps and margins round them, and its
// tilt keeps it off the English line at the bottom of SAFE.
const SWEEP_FRAMES = 14;
const HazardSweep: React.FC<{ y: number }> = ({ y }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, SWEEP_FRAMES], [-1700, 1100], {
    ...clamp,
    easing: (v) => 1 - (1 - v) ** 2,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 60,
        width: 1600,
        height: 120,
        background: STRIPES(GOLD, NAVY, 26),
        opacity: 0.85,
        transform: "rotate(-8deg)",
        boxShadow: "0 0 40px rgba(255,185,56,0.35)",
      }}
    />
  );
};

// One sweep per beat, at least 20 frames apart, alternating high and low.
export const Sweeps: React.FC<{ beats: number[] }> = ({ beats }) => {
  const kept: number[] = [];
  for (const b of [...beats].sort((a, c) => a - c))
    if (b >= 0 && (!kept.length || b - kept[kept.length - 1] >= 20))
      kept.push(b);
  return (
    <>
      {kept.map((b, i) => (
        <Sequence
          key={b}
          from={b}
          durationInFrames={SWEEP_FRAMES}
          layout="none"
        >
          <HazardSweep y={i % 2 ? STAGE.bottom + 18 : STAGE.top - 52} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------ stage card

// The card every stage visual sits on: navy, a gold edge, a hazard strip on
// top whose stripes run, punched in with a shake, dropped out at the end.
export const FlashCard: React.FC<{
  children: React.ReactNode;
  top?: number;
  height?: number;
  shakeAt?: number[];
  padding?: string;
}> = ({
  children,
  top = STAGE.top,
  height = STAGE_H,
  shakeAt = [],
  padding = "26px 30px",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = punch(frame, fps);
  const out = useExitOut();
  const jolt = [0, ...shakeAt].find((a) => frame - a >= 0 && frame - a < 6);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top,
        width: W,
        height,
        fontFamily: FONT,
        opacity: Math.min(p.opacity, out),
        transform: `${jolt === undefined ? "" : shake(frame, jolt)} scale(${p.scale}) translateY(${(1 - out) * 30}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          overflow: "hidden",
          background: `linear-gradient(180deg, ${BG} 0%, ${NAVY} 100%)`,
          border: `3px solid ${GOLD}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            height: 14,
            background: STRIPES(GOLD, NAVY, 14),
            backgroundPosition: `${(frame * 4) % 40}px 0`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: 14,
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
};

// Gold block with navy text: kickers and tags.
export const Tag: React.FC<{ text: string; size?: number }> = ({
  text,
  size = 32,
}) => (
  <span
    style={{
      display: "inline-block",
      background: GOLD,
      color: NAVY,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.3,
      padding: "4px 16px",
      borderRadius: 8,
      whiteSpace: "nowrap",
      letterSpacing: 1,
    }}
  >
    {text}
  </span>
);
