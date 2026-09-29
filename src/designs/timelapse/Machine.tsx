// "timelapse" machine: the backdrop, the big clock dial (hour, minute and
// sweep hands, motion-blurred with layered copies while they spin), the
// horizontal timeline track with its playhead, the fast-forward badge and the
// speed lines. Pure drawing; when and where comes from Plan.ts via motion().
import type React from "react";
import { useEffect, useState } from "react";
import { AbsoluteFill, interpolate, random, useDelayRender } from "remotion";
import { brand } from "../../brand/theme";
import { HOOK_FRAMES, SAFE } from "../../mortgage/golden";
import { clamp, reelFontReady } from "../../mortgage/style";
import type { Plan, Scrub, Span } from "./Plan";

// Brand sky: the logo blue lifted towards white (no new colour token).
export const SKY = `color-mix(in srgb, ${brand.primary} 45%, #ffffff)`;
export const INK = `color-mix(in srgb, ${brand.navy} 88%, transparent)`;

export const CLOCK = { x: 540, y: 790, r: 205 };
export const DISC_R = 160; // the dark disc a value sits on
export const MINI = { x: SAFE.left + 58, y: SAFE.top + 60, r: 54 }; // points
export const TRACK = { y: 1118, x0: 118, x1: 930 };
export const PINS = [300, 780] as const; // before, after
export const TOP = SAFE.top + 6; // the top slot (titles, small chips)
export const TOP_RIGHT = 690; // left of the LogoMark tile

export const ease = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const smooth = (x: number) => x * x * (3 - 2 * x);

// 0 -> 1 -> 0 over a span with `ramp`-frame edges.
export const weight = (spans: Span[], t: number, ramp = 10): number =>
  spans.reduce((w, [a, b]) => {
    const e = Math.max(b, a + 1);
    return Math.max(
      w,
      interpolate(t, [a - ramp, a, e, e + ramp], [0, 1, 1, 0], {
        ...clamp,
        easing: smooth,
      }),
    );
  }, 0);

const progress = (s: Scrub, t: number) =>
  interpolate(t, [s.at, s.at + s.dur], [0, 1], clamp);

// Extra turns the fast-forwards have added by frame t.
const spun = (scrubs: Scrub[], t: number) =>
  scrubs.reduce((sum, s) => sum + s.turns * ease(progress(s, t)), 0);

// How hard the machine is fast-forwarding (0..1), and whether a big one.
export const scrubbing = (scrubs: Scrub[], t: number, minTurns = 1) =>
  scrubs.reduce((m, s) => {
    const p = progress(s, t);
    return s.turns >= minTurns && p > 0 && p < 1
      ? Math.max(m, Math.sin(Math.PI * p) * Math.min(1, s.turns / 3))
      : m;
  }, 0);

// The white flash when a big fast-forward lands.
export const flashAt = (scrubs: Scrub[], t: number) =>
  scrubs.reduce(
    (m, s) =>
      s.turns >= 3
        ? Math.max(
            m,
            interpolate(
              t,
              [s.at + s.dur - 2, s.at + s.dur, s.at + s.dur + 14],
              [0, 1, 0],
              clamp,
            ),
          )
        : m,
    0,
  );

// Hand angles (radians, 0 = 12 o'clock): an idle clock that runs a minute
// per minute of talk, plus every fast-forward's turns.
export const handsAt = (scrubs: Scrub[], t: number, fps: number) => {
  const sec = t / fps;
  const extra = spun(scrubs, t) * 2 * Math.PI;
  return {
    hour: (sec / 720) * 2 * Math.PI + extra / 12,
    minute: (sec / 60) * 2 * Math.PI + extra,
    second: (sec / 6) * 2 * Math.PI + extra * 6,
  };
};

// Where the playhead sits: the talk's progress, pulled to the scene's pins.
export const playheadAt = (plan: Plan, t: number, talkFrames: number) => {
  const { x0, x1 } = TRACK;
  let x =
    x0 + (x1 - x0) * Math.min(1, Math.max(0, t / Math.max(1, talkFrames)));
  if (plan.hook) {
    const race = interpolate(t, [6, 40], [x0, PINS[1]], {
      ...clamp,
      easing: ease,
    });
    x += (race - x) * weight([[0, HOOK_FRAMES]], t, 1);
  }
  for (const s of plan.scenes) {
    const w = weight([[s.from, s.to]], t, 12);
    if (w === 0) continue;
    let target: number;
    if (s.kind === "points") {
      const n = s.items.length;
      target = x0;
      s.items.forEach((it, i) => {
        target = interpolate(t, [it.at, it.at + 10], [target, pinX(i, n)], {
          ...clamp,
          easing: ease,
        });
      });
    } else {
      target = interpolate(t, [s.reveal, s.reveal + 22], [PINS[0], PINS[1]], {
        ...clamp,
        easing: ease,
      });
    }
    x += (target - x) * w;
  }
  return x;
};

export const pinX = (i: number, n: number) =>
  TRACK.x0 + ((TRACK.x1 - TRACK.x0) * (i + 1)) / (n + 1);

// fitText needs Be Vietnam Pro: false until it has loaded, frame held meanwhile.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("timelapse: Be Vietnam Pro"));
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

// Deep navy, a glow behind the dial, and a faint timeline ruler grid that
// scrolls left as the talk runs. `t` is continuous across cuts.
export const Backdrop: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle 620px at ${CLOCK.x}px ${CLOCK.y}px, rgba(0,100,168,0.32), transparent 72%),
        linear-gradient(180deg, ${brand.navy} 0%, ${brand.background} 55%, ${brand.navy} 100%)`,
    }}
  >
    {Array.from({ length: 14 }, (_, i) => {
      const x = ((((i * 90 - t * 0.6) % 1260) + 1260) % 1260) - 90;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: 0,
            bottom: 0,
            width: 1,
            background:
              i % 3 === 0
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.025)",
          }}
        />
      );
    })}
  </AbsoluteFill>
);

// ------------------------------------------------------------- clock

type Hands = ReturnType<typeof handsAt>;

// One hand from radius a to b at `angle`; `copies` fading ghosts trail it.
const Hand: React.FC<{
  angle: (lag: number) => number;
  a: number;
  b: number;
  width: number;
  color: string;
  blur: number;
}> = ({ angle, a, b, width, color, blur }) => {
  const copies = blur > 0.05 ? 7 : 0;
  return (
    <>
      {Array.from({ length: copies + 1 }, (_, k) => {
        const g = angle(k * 0.22) - Math.PI / 2;
        return (
          <line
            key={k}
            x1={a * Math.cos(g)}
            y1={a * Math.sin(g)}
            x2={b * Math.cos(g)}
            y2={b * Math.sin(g)}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            opacity={k === 0 ? 1 : 0.42 * blur * (1 - k / (copies + 1))}
          />
        );
      })}
    </>
  );
};

// The dial at CLOCK, drawn in its own box so it can shrink to MINI.
// `open` 1 = full hands from the centre, 0 = only their tips on the rim
// (a value is on the disc); `disc` the dark disc's opacity.
export const Dial: React.FC<{
  hands: (lag: number) => Hands;
  blur: number;
  open: number;
  disc: number;
  flash: number;
  style?: React.CSSProperties;
}> = ({ hands, blur, open, disc, flash, style }) => {
  const R = CLOCK.r;
  const S = R + 30;
  // Retracted, each hand is a short pointer riding just outside the ring.
  const from = (full: number) => interpolate(open, [0, 1], [R + 20, full]);
  const to = (full: number, tip: number) =>
    interpolate(open, [0, 1], [R + 20 + tip, full]);
  return (
    <svg
      width={2 * S}
      height={2 * S}
      viewBox={`${-S} ${-S} ${2 * S} ${2 * S}`}
      style={{
        position: "absolute",
        left: CLOCK.x - S,
        top: CLOCK.y - S,
        overflow: "visible",
        ...style,
      }}
    >
      <circle r={R + 14} fill="rgba(6,19,42,0.55)" />
      <circle
        r={R}
        fill="none"
        stroke={SKY}
        strokeWidth={5}
        opacity={0.9}
        style={{ filter: `drop-shadow(0 0 16px ${brand.primary})` }}
      />
      <circle
        r={R + 14}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={2}
      />
      {Array.from({ length: 60 }, (_, i) => {
        const g = (i / 60) * 2 * Math.PI;
        const big = i % 5 === 0;
        const r0 = R - (big ? 30 : 14);
        return (
          <line
            key={i}
            x1={r0 * Math.sin(g)}
            y1={-r0 * Math.cos(g)}
            x2={(R - 6) * Math.sin(g)}
            y2={-(R - 6) * Math.cos(g)}
            stroke={i === 0 ? brand.highlight : "#ffffff"}
            strokeWidth={big ? 6 : 2}
            opacity={big ? 0.85 : 0.35}
          />
        );
      })}
      <Hand
        angle={(l) => hands(l).hour}
        a={from(-14)}
        b={to(118, 12)}
        width={5 + 7 * open}
        color="#ffffff"
        blur={blur}
      />
      <Hand
        angle={(l) => hands(l).minute}
        a={from(-18)}
        b={to(172, 18)}
        width={4 + 4 * open}
        color="#ffffff"
        blur={blur}
      />
      <Hand
        angle={(l) => hands(l).second}
        a={from(-26)}
        b={to(186, 12)}
        width={3}
        color={brand.highlight}
        blur={blur}
      />
      <circle r={14 * open} fill={brand.highlight} />
      <circle r={DISC_R} fill="rgba(6,19,42,0.9)" opacity={disc} />
      <circle
        r={DISC_R}
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={2}
        opacity={disc}
      />
      {flash > 0.01 ? (
        <circle
          r={DISC_R + (1 - flash) * 70}
          fill="none"
          stroke={brand.highlight}
          strokeWidth={10 * flash}
          opacity={flash}
          style={{ filter: `drop-shadow(0 0 18px ${brand.highlight})` }}
        />
      ) : null}
    </svg>
  );
};

// ------------------------------------------------------------- track

export const Track: React.FC<{ x: number; speed: number; t: number }> = ({
  x,
  speed,
  t,
}) => {
  const { y, x0, x1 } = TRACK;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x0,
          width: x1 - x0,
          top: y - 3,
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.14)",
        }}
      />
      {Array.from({ length: 28 }, (_, i) => {
        const tx = x0 + ((x1 - x0) * i) / 27;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: tx - 1,
              top: y + 10,
              width: 2,
              height: i % 3 === 0 ? 14 : 7,
              background: "rgba(255,255,255,0.22)",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: x0,
          width: Math.max(0, x - x0),
          top: y - 4,
          height: 8,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${brand.primary}, ${SKY} 70%, ${brand.highlight})`,
          boxShadow: `0 0 16px ${brand.primary}`,
        }}
      />
      {/* Speed lines streaming out behind the playhead while it races. */}
      {speed > 0.02
        ? Array.from({ length: 10 }, (_, i) => {
            const r = (k: string) => random(`tl-trail-${k}-${i}`);
            const len = 60 + r("l") * 180;
            const drift = ((t * 38 + r("o") * 400) % 400) * 0.6;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - 26 - len - drift,
                  width: len,
                  top: y - 34 + r("y") * 68,
                  height: 3,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? brand.highlight : SKY})`,
                  opacity: speed * (0.35 + 0.5 * r("a")),
                }}
              />
            );
          })
        : null}
      <div
        style={{
          position: "absolute",
          left: x - 9,
          top: y - 26,
          width: 18,
          height: 52,
          borderRadius: 9,
          background: brand.highlight,
          boxShadow: `0 0 ${16 + speed * 30}px ${brand.highlight}`,
        }}
      />
    </>
  );
};

// Streaks either side of the dial while it fast-forwards.
export const DialStreaks: React.FC<{ speed: number; t: number }> = ({
  speed,
  t,
}) =>
  speed > 0.02 ? (
    <>
      {Array.from({ length: 16 }, (_, i) => {
        const r = (k: string) => random(`tl-streak-${k}-${i}`);
        const left = i % 2 === 0;
        const len = 90 + r("l") * 220;
        const run = ((t * 55 + r("o") * 500) % 500) - 250;
        const edge = left ? CLOCK.x - CLOCK.r - 40 : CLOCK.x + CLOCK.r + 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left ? edge - len + run * 0.3 : edge + run * 0.3,
              width: len,
              top: CLOCK.y - 170 + r("y") * 340,
              height: 2 + Math.round(r("h") * 3),
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${r("c") > 0.7 ? brand.highlight : SKY}, transparent)`,
              opacity: speed * (0.3 + 0.5 * r("a")),
            }}
          />
        );
      })}
    </>
  ) : null;

// The fast-forward badge (two triangles in a gold pill), flickering.
export const FastForward: React.FC<{
  on: number;
  t: number;
  x: number;
  y: number;
}> = ({ on, t, x, y }) =>
  on > 0.05 ? (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "10px 18px",
        borderRadius: 999,
        background: brand.highlight,
        boxShadow: `0 0 30px ${brand.highlight}`,
        opacity: Math.min(1, on * 2) * (Math.floor(t / 2) % 2 === 0 ? 1 : 0.55),
        transform: `scale(${0.8 + 0.2 * Math.min(1, on * 2)})`,
      }}
    >
      <svg
        width={64}
        height={32}
        viewBox="0 0 64 32"
        style={{ display: "block" }}
      >
        <polygon points="2,2 30,16 2,30" fill={brand.navy} />
        <polygon points="32,2 60,16 32,30" fill={brand.navy} />
      </svg>
    </div>
  ) : null;

// A small clock face for chips (the timestamp look).
export const ClockIcon: React.FC<{
  size: number;
  t: number;
  color?: string;
}> = ({ size, t, color = brand.highlight }) => {
  const g = t / 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <circle r={10} fill="none" stroke={color} strokeWidth={2.4} />
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-6}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <line
        x1={0}
        y1={0}
        x2={7 * Math.sin(g)}
        y2={-7 * Math.cos(g)}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
};
