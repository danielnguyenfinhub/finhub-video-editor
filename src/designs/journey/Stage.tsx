// "journey" figures: every figure as a signpost that pops up beside the pin
// (big number + a tiny route chart: how far along the road the value is), or
// as a small flag chip left of the pin when the stage is already taken (the
// hook, a cue, a bank sign or an earlier signpost). Bank signs join the same
// layer.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import { GOLD, INK, MARKER_Y, alpha, cameraAt, useFontReady } from "./Map";
import {
  Footing,
  HookCartouche,
  RoadsideSign,
  SHADOW,
  ease,
  fadeOut,
} from "./Signs";

const BOARD_BOTTOM = 960; // a figure signpost's board ends here
const BOARD_W = 620;
const PIN_HALF = 44; // half the marker's width, with its glow

// "4,35%" -> counts 0 → 4,35 with the same decimals; text around it kept. A
// year or a date ("2026", "29/9") is shown as said, never counted; thousands
// dots only if the number was said with one.
export const counted = (big: string, t: number): string => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  if (/^(19|20)\d\d$/.test(m[0]) || /\d\s*\/\s*\d/.test(big)) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[0].includes("."),
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// How far along the road a value is: a percentage on a 10 % scale below 10 %
// (rates), else 100 %; a date, count or amount has no scale: the whole road.
const roadFill = (big: string): number => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : 1;
};

// The marker's home x on screen; `from` is the Sequence's talk frame.
// A post's footprint on the map.
const useHomeX = (from: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return cameraAt(from + frame, fps).mx;
};

// ------------------------------------------------------------- figures

// A tiny route as the chart: dashed road, gold trail to the value, a pin at
// its head and a finish flag at the end.
const MiniRoute: React.FC<{ fill: number; t: number; width: number }> = ({
  fill,
  t,
  width,
}) => {
  const end = width - 52; // the road ends, the finish flag stands after it
  const x = 16 + (end - 16) * fill * t;
  const done = fill * t >= 0.999;
  return (
    <svg
      width={width}
      height={70}
      style={{ display: "block", margin: "8px auto 0" }}
    >
      <line
        x1={16}
        x2={end}
        y1={50}
        y2={50}
        stroke={alpha(brand.navy, 0.14)}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <line
        x1={16}
        x2={end}
        y1={50}
        y2={50}
        stroke={INK}
        strokeWidth={4}
        strokeDasharray="12 10"
      />
      <line
        x1={16}
        x2={x}
        y1={50}
        y2={50}
        stroke={GOLD}
        strokeWidth={11}
        strokeLinecap="round"
      />
      <circle
        cx={16}
        cy={50}
        r={9}
        fill="#ffffff"
        stroke={INK}
        strokeWidth={3}
      />
      <line
        x1={end + 26}
        x2={end + 26}
        y1={58}
        y2={10}
        stroke={INK}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d={`M ${end + 28} 10 L ${end + 50} 18 L ${end + 28} 26 Z`}
        fill={done ? GOLD : "#ffffff"}
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d={`M ${x} 48 c -13 -15 -13 -34 0 -34 c 13 0 13 19 0 34 Z`}
        fill={GOLD}
        stroke={INK}
        strokeWidth={3}
      />
      <circle cx={x} cy={26} r={5} fill="#ffffff" />
    </svg>
  );
};

const Signpost: React.FC<{ figure: Figure; from: number }> = ({
  figure,
  from,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mx = useHomeX(from);
  const t = interpolate(frame, [8, 38], [0, 1], { ...clamp, easing: ease });
  const up = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const swing = Math.sin(frame / 6) * 3 * Math.exp(-frame / 25);
  const cx = Math.min(
    SAFE.right - BOARD_W / 2,
    Math.max(SAFE.left + BOARD_W / 2, mx - 110),
  );
  const size = Math.min(
    130,
    fitText({
      text: figure.big,
      withinWidth: BOARD_W - 100,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, figure.frames),
      }}
    >
      <Footing x={mx - 110} k={up} />
      <div
        style={{
          position: "absolute",
          left: mx - 110 - 8,
          top: BOARD_BOTTOM - 10,
          width: 16,
          height: MARKER_Y - BOARD_BOTTOM + 10,
          borderRadius: 8,
          background: INK,
          transformOrigin: "50% 100%",
          transform: `scaleY(${up})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx - BOARD_W / 2,
          width: BOARD_W,
          bottom: 1920 - BOARD_BOTTOM,
          transformOrigin: `${mx - 110 - (cx - BOARD_W / 2)}px 100%`,
          transform: `translateY(${(1 - up) * 120}px) scale(${interpolate(up, [0, 1], [0.3, 1])}) rotate(${swing}deg)`,
          opacity: interpolate(up, [0, 0.3], [0, 1], clamp),
          background: "#ffffff",
          border: `5px solid ${INK}`,
          borderRadius: 24,
          padding: "22px 30px 26px",
          boxShadow: SHADOW,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.1,
            color: INK,
          }}
        >
          {counted(figure.big, t)}
        </div>
        <MiniRoute fill={roadFill(figure.big)} t={t} width={BOARD_W - 110} />
        {/* An auto figure's words are already in the captions; a stat's label
            is written copy. */}
        {figure.source === "stat" && figure.label ? (
          <div
            style={{
              marginTop: 14,
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1.25,
              color: INK,
              textWrap: "balance",
              opacity: interpolate(frame, [12, 24], [0, 1], clamp),
            }}
          >
            {figure.label}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// The stage is taken: a small flag chip left of the marker.
const FlagChip: React.FC<{ figure: Figure; from: number }> = ({
  figure,
  from,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mx = useHomeX(from);
  const t = interpolate(frame, [4, 30], [0, 1], { ...clamp, easing: ease });
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left + 10,
        maxWidth: mx - PIN_HALF - 24 - SAFE.left - 10,
        bottom: 1920 - MARKER_Y,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 26px 12px 16px",
        borderRadius: 18,
        background: INK,
        boxShadow: SHADOW,
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, figure.frames)),
        transform: `translateX(${(1 - p) * -60}px)`,
      }}
    >
      <svg width={34} height={46}>
        <line
          x1={5}
          x2={5}
          y1={4}
          y2={44}
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d={`M 7 5 L 32 ${13 + Math.sin(frame / 5) * 2} L 7 22 Z`}
          fill={GOLD}
        />
      </svg>
      <div
        style={{
          fontSize: 54,
          fontWeight: 900,
          lineHeight: 1.15,
          color: "#ffffff",
          whiteSpace: "nowrap",
        }}
      >
        {counted(figure.big, t)}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- layer

type Span = [number, number];
const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

// Where each figure goes. The stage is taken by the hook, a cue, a bank sign
// or an earlier signpost: a figure that lands just before the stage frees up
// (within WAIT) waits for it and gets its signpost, holding its full length;
// otherwise it rides as a chip beside the marker.
const WAIT = 15;
type Placed = { figure: Figure; from: number; chip: boolean };
const placeFigures = (reel: Reel, fps: number, figures: Figure[]): Placed[] => {
  const at = outFrameOf(reel.timeline, fps);
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const taken: Span[] = [
    ...(reel.edit.hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...(reel.edit.cues ?? [])
      .filter((c) => c.kind !== "emoji")
      .map((c): Span => [at(c.fromMs), at(c.toMs)]),
    ...lenderMentionsOf(reel).map((m): Span => [f(m.startMs), f(m.endMs)]),
  ];
  return figures.map((figure) => {
    const span: Span = [figure.fromFrame, figure.fromFrame + figure.frames];
    const hit = taken.filter((s) => overlaps(s, span));
    const free = Math.max(figure.fromFrame, ...hit.map((s) => s[1]));
    const late: Span = [free, free + figure.frames];
    if (
      free - figure.fromFrame <= WAIT &&
      !taken.some((s) => overlaps(s, late))
    ) {
      taken.push(late);
      return { figure, from: free, chip: false };
    }
    return { figure, from: figure.fromFrame, chip: true };
  });
};

export const StageLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  const placed = placeFigures(reel, fps, figures);
  // fitText (hook, signposts) measures Be Vietnam Pro: wait for it.
  const ready = useFontReady("journey stage: Be Vietnam Pro");
  if (!ready) return null;
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookCartouche hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {placed.map(({ figure: f, from, chip }) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={from}
          durationInFrames={f.frames}
          layout="none"
        >
          {chip ? (
            <FlagChip figure={f} from={from} />
          ) : (
            <Signpost figure={f} from={from} />
          )}
        </Sequence>
      ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const dur = Math.max(1, Math.round((m.endMs / 1000) * fps) - from);
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            <RoadsideSign lender={m.lender} frames={dur} />
          </Sequence>
        );
      })}
    </>
  );
};
