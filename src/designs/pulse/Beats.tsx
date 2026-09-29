// "pulse" beats on the monitor: the hook and every figure as the line
// SPIKING up into the number; a date (or a year) as a vertical marker that
// drops at the right edge with the date on it; a named bank as a logo the
// line blips under. A beat that cannot take the stage rides as a chip.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { HOOK_FRAMES, SAFE, type Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { EditJson } from "../../mortgage/schema";
import { FONT, clamp, enter, pop } from "../../mortgage/style";
import { Chip } from "./Chip";
import type { Placed, Plan } from "./Plan";
import {
  DataLine,
  FOOT_TOP,
  GOLD,
  HEADER,
  HeadDot,
  PLOT,
  SKY,
  Svg,
  clipTo,
  counted,
  ease,
  fadeOut,
  isDateLike,
  type Pt,
} from "./Scope";

export const LENDER_KICKER = "ĐANG NHẮC TỚI";

const BASE = PLOT.bottom - 50;

// Flat, a small dip, the spike to (px, peak), a recoil, flat to the right.
const spikePath = (px: number, peak: number): Pt[] => [
  [PLOT.left, BASE],
  [px - 70, BASE],
  [px - 38, BASE + 22],
  [px, peak],
  [px + 34, BASE + 56],
  [px + 66, BASE],
  [PLOT.right - 20, BASE],
];

export const Header: React.FC<{
  kicker?: string;
  text?: string;
  opacity: number;
}> = ({ kicker, text, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      top: HEADER.top,
      width: HEADER.width,
      fontFamily: FONT,
      opacity,
      transform: `translateX(${interpolate(opacity, [0, 1], [-24, 0])}px)`,
    }}
  >
    {kicker ? (
      <div
        style={{
          display: "inline-block",
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: 5,
          color: brand.navy,
          background: GOLD,
          padding: "4px 14px",
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        {kicker}
      </div>
    ) : null}
    {text ? (
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          lineHeight: 1.2,
          color: "#ffffff",
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    ) : null}
  </div>
);

// Largest size up to `max` at which `text` fits `width` on one line.
const fit = (text: string, width: number, max: number, weight = 900) =>
  Math.min(
    max,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: weight })
      .fontSize,
  );

// ------------------------------------------------------------- spike

const Spike: React.FC<{
  big: string;
  shown: string;
  sweep: [number, number];
  max: number;
  dur: number;
  children?: React.ReactNode;
}> = ({ big, shown, sweep, max, dur, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const px = 540;
  const size = fit(big, 720, max);
  const peak = PLOT.top + size * 1.15 + 24;
  const pts = spikePath(px, peak);
  const headX = interpolate(frame, sweep, [PLOT.left, pts[6][0]], {
    ...clamp,
    easing: ease,
  });
  const { d, head } = clipTo(pts, headX);
  // Where the head crosses the peak: the number pops there.
  const f = (px - PLOT.left) / (pts[6][0] - PLOT.left);
  const atPeak = sweep[0] + (sweep[1] - sweep[0]) * (1 - (1 - f) ** (1 / 3));
  const p = pop(frame, fps, atPeak);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <Svg>
        <DataLine d={d} />
        {headX >= px ? <HeadDot at={[px, peak]} t={frame} r={10} /> : null}
        <HeadDot at={head} t={frame + 11} />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: PLOT.top,
          textAlign: "center",
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.1,
          color: GOLD,
          whiteSpace: "nowrap",
          textShadow: `0 0 36px rgba(255,185,56,0.55)`,
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px) scale(${interpolate(p, [0, 1], [0.6, 1])})`,
          transformOrigin: `50% 100%`,
        }}
      >
        {shown}
      </div>
      {children}
    </div>
  );
};

const HookSpike: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [14, 40], [0, 1], { ...clamp, easing: ease });
  const shown =
    hook.countTo === undefined
      ? hook.big
      : `${(hook.countTo * t).toLocaleString("vi-VN", {
          minimumFractionDigits: hook.decimals ?? 0,
          maximumFractionDigits: hook.decimals ?? 0,
        })}${hook.suffix ?? ""}`;
  return (
    <Spike
      big={hook.big}
      shown={shown}
      sweep={[0, 34]}
      max={190}
      dur={HOOK_FRAMES}
    >
      {hook.sub ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: SAFE.right - SAFE.left,
            top: FOOT_TOP,
            textAlign: "center",
            fontSize: fit(hook.sub, SAFE.right - SAFE.left, 42, 800),
            fontWeight: 800,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            color: "#ffffff",
            opacity: enter(frame, fps, 18),
          }}
        >
          {hook.sub}
        </div>
      ) : null}
    </Spike>
  );
};

const FigureSpike: React.FC<{ figure: Figure; dur: number }> = ({
  figure,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [10, 34], [0, 1], { ...clamp, easing: ease });
  return (
    <>
      {/* An auto figure's words are already in the captions; a stat's
          label is written copy. */}
      {figure.source === "stat" && figure.label ? (
        <Header
          text={figure.label}
          opacity={Math.min(enter(frame, fps, 6), fadeOut(frame, dur))}
        />
      ) : null}
      <Spike
        big={figure.big}
        shown={counted(figure.big, t)}
        sweep={[0, 30]}
        max={160}
        dur={dur}
      />
    </>
  );
};

// ------------------------------------------------------------- date

const MARK_X = 820;

const DateMarker: React.FC<{ figure: Figure; dur: number }> = ({
  figure,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headX = interpolate(frame, [0, 24], [PLOT.left, MARK_X], {
    ...clamp,
    easing: ease,
  });
  const { d, head } = clipTo(
    [
      [PLOT.left, BASE],
      [MARK_X, BASE],
    ],
    headX,
  );
  const drop = interpolate(frame, [16, 30], [0, 1], { ...clamp, easing: ease });
  const p = pop(frame, fps, 22);
  const size = fit(figure.big, MARK_X - SAFE.left - 40, 150);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      {figure.source === "stat" && figure.label ? (
        <Header text={figure.label} opacity={enter(frame, fps, 8)} />
      ) : null}
      <Svg>
        <DataLine d={d} />
        <line
          x1={MARK_X}
          x2={MARK_X}
          y1={PLOT.top - 20}
          y2={PLOT.top - 20 + (PLOT.bottom - PLOT.top + 20) * drop}
          stroke={SKY}
          strokeWidth={5}
          style={{ filter: `drop-shadow(0 0 12px ${SKY})` }}
        />
        {drop > 0 ? (
          <polygon
            points={`${MARK_X - 16},${PLOT.top - 44} ${MARK_X + 16},${PLOT.top - 44} ${MARK_X},${PLOT.top - 18}`}
            fill={SKY}
            opacity={drop}
          />
        ) : null}
        <HeadDot at={head} t={frame} />
      </Svg>
      <div
        style={{
          position: "absolute",
          right: 1080 - (MARK_X - 30),
          top: PLOT.top + 10,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.1,
          color: "#ffffff",
          whiteSpace: "nowrap",
          textShadow: `0 0 30px rgba(0,100,168,0.9)`,
          opacity: p,
          transform: `translateX(${interpolate(p, [0, 1], [40, 0])}px)`,
        }}
      >
        {figure.big}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- lender

const LenderBlip: React.FC<{ lender: Lender; dur: number }> = ({
  lender,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pts: Pt[] = [
    [PLOT.left, BASE],
    [500, BASE],
    [522, BASE - 70],
    [548, BASE + 24],
    [570, BASE],
    [PLOT.right - 20, BASE],
  ];
  const headX = interpolate(frame, [0, 28], [PLOT.left, PLOT.right - 20], {
    ...clamp,
    easing: ease,
  });
  const { d, head } = clipTo(pts, headX);
  const p = pop(frame, fps, 10);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <Header kicker={LENDER_KICKER} opacity={enter(frame, fps, 4)} />
      <Svg>
        <DataLine d={d} color={SKY} width={5} />
        <HeadDot at={head} t={frame} color={SKY} />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: PLOT.top + 110,
          transform: `translateX(-50%) scale(${p})`,
          borderRadius: 24,
          boxShadow: `0 0 50px rgba(0,100,168,0.7)`,
        }}
      >
        <LenderLogo lender={lender} height={120} style={{ borderRadius: 24 }} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------- layer

const BeatView: React.FC<{ placed: Placed }> = ({ placed }) => {
  if (placed.chip) return <Chip placed={placed} />;
  const { beat, frames } = placed;
  if (beat.kind === "lender")
    return <LenderBlip lender={beat.lender} dur={frames} />;
  return isDateLike(beat.figure.big) ? (
    <DateMarker figure={beat.figure} dur={frames} />
  ) : (
    <FigureSpike figure={beat.figure} dur={frames} />
  );
};

export const BeatLayer: React.FC<{
  hook: EditJson["hook"];
  plan: Plan;
}> = ({ hook, plan }) => (
  <>
    {hook ? (
      <Sequence durationInFrames={HOOK_FRAMES} layout="none">
        <HookSpike hook={hook} />
      </Sequence>
    ) : null}
    {plan.beats.map((b) => (
      <Sequence
        key={`${b.beat.kind}${b.from}`}
        from={b.from}
        durationInFrames={b.frames}
        layout="none"
      >
        <BeatView placed={b} />
      </Sequence>
    ))}
  </>
);
