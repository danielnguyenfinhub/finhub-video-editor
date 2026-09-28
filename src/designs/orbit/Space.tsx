// "orbit" backdrop and the core. A deep-navy space with a faint starfield,
// thin concentric orbit rings with dots travelling on them, and at the centre
// the CORE: a glowing ring that pulses with the voice (the faceless
// "presenter"). The core moves with the story: it grows to hold a number
// (hook, figures, a bank logo), docks top-left as the origin of the points
// timeline, and shrinks to the "VS" node between the two compare planets.
// Talk and Overlay both read the same spans (coreSpans), so the core and the
// numbers drawn over it always agree on where it is.
import { visualizeAudio } from "@remotion/media-utils";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { useCoveredAudioData } from "../../elements/useCoveredAudioData";
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
} from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp, reelFontReady } from "../../mortgage/style";
import type { Segment } from "../../mortgage/timeline";

// Brand sky: the logo blue lifted towards white (no new colour token).
export const SKY = `color-mix(in srgb, ${brand.primary} 40%, #ffffff)`;
export const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1.5px solid rgba(255,255,255,0.2)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 20px 50px rgba(6,19,42,0.45)",
};

// Where the core lives. Everything on the stage sits between STAGE_TOP (under
// the LogoMark tile) and STAGE_BOTTOM (above the captions).
export const STAGE_TOP = 600;
export const STAGE_BOTTOM = 1195;
export const HOME = { x: 540, y: 860, r: 120 };
export const BIG_R = 172; // the core while it holds a number or a logo
export const GAUGE_R = 208; // the orbit arc sweeping round a number
export const DOCK = { x: 140, y: 650, r: 40 }; // points: origin of the timeline
export const VS = { x: 540, y: 880, r: 54 }; // compare: the node between planets
const RINGS = [200, 272, 350];
const RAMP = 12;

type Span = [number, number];
export type CoreSpans = { big: Span[]; dock: Span[]; vs: Span[]; dim: Span[] };

export const coreSpans = (reel: Reel, fps: number): CoreSpans => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const cueSpans = (keep: (k: string) => boolean): Span[] =>
    cues.filter((c) => keep(c.kind)).map((c) => [at(c.fromMs), at(c.toMs)]);
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  return {
    big: [
      ...(reel.edit.hook ? [[0, HOOK_FRAMES] as Span] : []),
      ...figuresOf(reel, fps).map(
        (f): Span => [f.fromFrame, f.fromFrame + f.frames],
      ),
      ...lenderMentionsOf(reel).map(
        (m): Span => [toFrame(m.startMs), toFrame(m.endMs)],
      ),
    ],
    dock: cueSpans((k) => k === "points"),
    vs: cueSpans((k) => k === "compare"),
    // MotionTrack panels (every other kind but the emoji sticker).
    dim: cueSpans((k) => k !== "points" && k !== "compare" && k !== "emoji"),
  };
};

const weight = (spans: Span[], t: number): number =>
  spans.reduce((w, [a, b]) => {
    const end = Math.max(b, a + 1);
    return Math.max(
      w,
      interpolate(t, [a - RAMP, a, end, end + RAMP], [0, 1, 1, 0], {
        ...clamp,
        easing: (x) => x * x * (3 - 2 * x),
      }),
    );
  }, 0);

export type CoreState = {
  x: number;
  y: number;
  r: number;
  dim: number; // 0..1, behind a MotionTrack panel
  calm: number; // 0..1, the rings fade while a cue owns the stage
};

export const coreAt = (s: CoreSpans, t: number): CoreState => {
  const dock = weight(s.dock, t);
  const vs = weight(s.vs, t);
  const dim = weight(s.dim, t);
  // A number during a cue stays on the cue's own layout (the core does not
  // jump back to the centre under the panel).
  const big = weight(s.big, t) * (1 - Math.max(dock, vs));
  return {
    x: HOME.x + dock * (DOCK.x - HOME.x) + vs * (VS.x - HOME.x),
    y: HOME.y + dock * (DOCK.y - HOME.y) + vs * (VS.y - HOME.y),
    r: Math.max(
      DOCK.r,
      HOME.r +
        big * (BIG_R - HOME.r) +
        dock * (DOCK.r - HOME.r) +
        vs * (VS.r - HOME.r),
    ),
    dim,
    calm: Math.max(dock, vs, dim),
  };
};

export const useCoreSpans = (reel: Reel | null | undefined): CoreSpans => {
  const { fps } = useVideoConfig();
  return useMemo(
    () =>
      reel ? coreSpans(reel, fps) : { big: [], dock: [], vs: [], dim: [] },
    [reel, fps],
  );
};

// fitText needs Be Vietnam Pro loaded: false until it is, and the frame is
// held meanwhile.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("orbit: Be Vietnam Pro"));
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

const STARS = 90;

// `t` is a continuous clock (talk frame, or the cover's frame), so the drift
// never jumps at a cut between two paced segments.
export const OrbitSpace: React.FC<{ t: number; calm?: number }> = ({
  t,
  calm = 0,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle 760px at ${HOME.x}px ${HOME.y}px, rgba(0,100,168,0.34), transparent 72%),
        radial-gradient(circle 520px at ${820 + Math.sin(t / 140) * 60}px 1580px, rgba(245,165,36,0.1), transparent 70%),
        linear-gradient(180deg, ${brand.navy} 0%, ${brand.background} 52%, ${brand.navy} 100%)`,
    }}
  >
    <Stars t={t} />
    <Rings t={t} opacity={1 - 0.65 * calm} />
  </AbsoluteFill>
);

const Stars: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill>
    {Array.from({ length: STARS }, (_, i) => {
      const r = (k: string) => random(`orbit-star-${k}-${i}`);
      const size = 1.5 + r("s") * 2.6;
      const y =
        (((r("y") * 1920 - t * (0.05 + r("v") * 0.12)) % 1920) + 1920) % 1920;
      const twinkle = 0.5 + 0.5 * Math.sin(t / (18 + r("p") * 30) + r("o") * 6);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: r("x") * 1080,
            top: y,
            width: size,
            height: size,
            borderRadius: "50%",
            background: i % 9 === 0 ? brand.highlight : "#ffffff",
            opacity: 0.15 + 0.55 * twinkle * r("b"),
          }}
        />
      );
    })}
  </AbsoluteFill>
);

// Three circular orbits and one tilted ellipse round HOME, each with a dot.
const Rings: React.FC<{ t: number; opacity: number }> = ({ t, opacity }) => {
  const tilt = (-16 * Math.PI) / 180;
  const e = { rx: 450, ry: 140 };
  const ea = t / 95;
  const ex = e.rx * Math.cos(ea);
  const ey = e.ry * Math.sin(ea);
  return (
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", inset: 0, opacity }}
    >
      <g transform={`translate(${HOME.x} ${HOME.y})`}>
        {RINGS.map((R, i) => (
          <circle
            key={R}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1.5}
            strokeDasharray={i === 1 ? "3 12" : undefined}
          />
        ))}
        <ellipse
          rx={e.rx}
          ry={e.ry}
          fill="none"
          stroke="rgba(0,100,168,0.55)"
          strokeWidth={1.5}
          transform="rotate(-16)"
        />
        {RINGS.map((R, i) => {
          const a = t / (70 + i * 45) + i * 2.1;
          return (
            <circle
              key={`d${R}`}
              cx={R * Math.cos(a)}
              cy={R * Math.sin(a)}
              r={i === 0 ? 6 : 4.5}
              fill={i === 2 ? brand.highlight : SKY}
              style={{
                filter: `drop-shadow(0 0 8px ${i === 2 ? brand.highlight : SKY})`,
              }}
            />
          );
        })}
        <circle
          cx={ex * Math.cos(tilt) - ey * Math.sin(tilt)}
          cy={ex * Math.sin(tilt) + ey * Math.cos(tilt)}
          r={5}
          fill={brand.highlight}
          style={{ filter: `drop-shadow(0 0 10px ${brand.highlight})` }}
        />
      </g>
    </svg>
  );
};

// ------------------------------------------------------------- the core

const BARS = 64; // visualizeAudio needs a power of two

// `bars` (0..1 each) is the voice spectrum; `level` its loudness.
export const CoreBody: React.FC<{
  state: CoreState;
  t: number;
  level: number;
  bars?: number[];
}> = ({ state, t, level, bars }) => {
  const { x, y, r, dim } = state;
  const pulse = r * (1 + level * 0.1);
  const size = r * 4;
  const c = size / 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x - c,
        top: y - c,
        width: size,
        height: size,
        opacity: 1 - 0.8 * dim,
      }}
    >
      {/* Soft halo, breathing with the voice. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, rgba(0,100,168,${0.5 + level * 0.3}) 0%, rgba(0,100,168,0.18) 30%, transparent 62%)`,
          transform: `scale(${1 + level * 0.18})`,
        }}
      />
      <svg
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="orbit-core-body">
            <stop offset="0%" stopColor={brand.navy} stopOpacity={0.95} />
            <stop
              offset="70%"
              stopColor={brand.background}
              stopOpacity={0.92}
            />
            <stop offset="100%" stopColor={brand.primary} stopOpacity={0.85} />
          </radialGradient>
        </defs>
        <g transform={`translate(${c} ${c})`}>
          {/* Voice spectrum as fine radial ticks round the rim. */}
          {(bars ?? []).map((v, i) => {
            const h = Math.min(r * 0.45, 3 + Math.sqrt(v) * r * 0.55);
            return (
              <rect
                key={i}
                x={-1.6}
                y={-pulse - 10 - h}
                width={3.2}
                height={h}
                rx={1.6}
                fill={i % 8 === 0 ? brand.highlight : SKY}
                opacity={0.7}
                transform={`rotate(${(i / BARS) * 360})`}
              />
            );
          })}
          <circle
            r={pulse}
            fill="url(#orbit-core-body)"
            stroke={SKY}
            strokeWidth={Math.max(2, r * 0.03)}
            style={{ filter: `drop-shadow(0 0 ${14 + level * 20}px ${SKY})` }}
          />
          {/* Inner pulse and a slow rotating arc: motion even in silence. */}
          <circle
            r={pulse * (0.62 + level * 0.2)}
            fill="none"
            stroke={brand.highlight}
            strokeWidth={1.5}
            opacity={0.35}
          />
          <circle
            r={pulse + r * 0.2}
            fill="none"
            stroke={brand.highlight}
            strokeWidth={Math.max(2, r * 0.025)}
            strokeLinecap="round"
            strokeDasharray={`${r * 0.5} ${r * 3}`}
            transform={`rotate(${t * 0.9})`}
            opacity={0.85}
          />
        </g>
      </svg>
    </div>
  );
};

// The core inside Talk: the voice comes from the source audio at the paced
// source frame (elements README: seg.srcFrom + frame * seg.rate).
export const VoiceCore: React.FC<{ seg: Segment; src: string; t: number }> = ({
  seg,
  src,
  t,
}) => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  const spans = useCoreSpans(reel);
  const at = Math.max(0, Math.round(seg.srcFrom + frame * seg.rate));
  const { audioData, dataOffsetInSeconds } = useCoveredAudioData({
    fps,
    frame: at,
    src,
    windowInSeconds: 10,
  });
  const bars = audioData
    ? visualizeAudio({
        fps,
        frame: at,
        audioData,
        dataOffsetInSeconds,
        numberOfSamples: BARS,
        optimizeFor: "speed",
      })
    : new Array<number>(BARS).fill(0);
  const low = bars.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  const level = Math.min(1, Math.sqrt(low) * 1.8);
  return <CoreBody state={coreAt(spans, t)} t={t} level={level} bars={bars} />;
};
