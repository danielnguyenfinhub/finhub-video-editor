// "blueprint" paper and drawing kit: deep navy sheet with a fine and a major
// grid that slowly pans, a sheet border with registration marks, the title
// block (the drawing's legend, carrying the chapter), and the idle elevation
// of a house that is traced part by part while nothing else holds the stage.
// Every line is drawn on with a stroke animation (evolvePath or a growing
// segment), never popped in.
import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";

// The line ink of a blueprint. The one colour the brand kit has no token for.
export const INK = "#8FD3FF"; // theme-exempt: blueprint cyan line ink, the concept's defining colour
// A theme colour at an alpha, as 8-digit hex (no new colour literals).
export const tint = (hex: string, alpha: number): string =>
  hex +
  Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");

// The stage: hook, figures, logos and the two drawn cues live here. Starts
// under the LogoMark tile (SAFE.top + 148) and ends above the caption band.
export const STAGE = { top: 590, bottom: 1110 } as const;
export const MID_X = (SAFE.left + SAFE.right) / 2;
export const STAGE_H = STAGE.bottom - STAGE.top;

// 0 → 1 over [a, b] frames, eased like a pencil stroke (slow start and end).
export const draw = (frame: number, a: number, b: number): number =>
  interpolate(frame, [a, b], [0, 1], {
    ...clamp,
    easing: (x) => x * x * (3 - 2 * x),
  });

// A path traced on by `p` (0..1).
export const Trace: React.FC<{
  d: string;
  p: number;
  color?: string;
  width?: number;
  fill?: string;
}> = ({ d, p, color = INK, width = 3, fill = "none" }) =>
  p <= 0 ? null : (
    <path
      d={d}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...evolvePath(p, d)}
    />
  );

// A straight line grown from (x1,y1) towards (x2,y2); may be dashed.
export const Seg: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  p: number;
  color?: string;
  width?: number;
  dash?: string;
}> = ({ x1, y1, x2, y2, p, color = INK, width = 3, dash }) =>
  p <= 0 ? null : (
    <line
      x1={x1}
      y1={y1}
      x2={x1 + (x2 - x1) * p}
      y2={y1 + (y2 - y1) * p}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dash}
    />
  );

export const rectPath = (x: number, y: number, w: number, h: number) =>
  `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
export const circlePath = (cx: number, cy: number, r: number) =>
  `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;

// An open arrowhead at (x,y) pointing along angle `deg` (0 = right).
export const Arrow: React.FC<{
  x: number;
  y: number;
  deg: number;
  show: number;
  color?: string;
}> = ({ x, y, deg, show, color = INK }) => (
  <path
    d="M -22 -10 L 0 0 L -22 10"
    transform={`translate(${x} ${y}) rotate(${deg})`}
    fill="none"
    stroke={color}
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity={show}
  />
);

// Registration mark: a circle with a cross through it.
const Reg: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g stroke={tint(INK, 0.55)} strokeWidth={2} fill="none">
    <circle cx={x} cy={y} r={13} />
    <line x1={x - 24} y1={y} x2={x + 24} y2={y} />
    <line x1={x} y1={y - 24} x2={x} y2={y + 24} />
  </g>
);

const MINOR = 30;
const MAJOR = 150;

// The sheet. The grid pans slowly (a major cell every ~17 s), so the frame is
// never still even between beats.
export const Paper: React.FC = () => {
  const frame = useCurrentFrame();
  const dx = (frame * 0.3) % MAJOR;
  const dy = (frame * 0.18) % MAJOR;
  const pos = `${dx}px ${dy}px`;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 900px 1200px at 50% 42%, ${tint(brand.blue, 0.55)}, transparent 75%),
          linear-gradient(175deg, ${brand.background} 0%, ${brand.navy} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${tint(INK, 0.07)} 1px, transparent 1px),
            linear-gradient(90deg, ${tint(INK, 0.07)} 1px, transparent 1px),
            linear-gradient(${tint(INK, 0.17)} 2px, transparent 2px),
            linear-gradient(90deg, ${tint(INK, 0.17)} 2px, transparent 2px)`,
          backgroundSize: `${MINOR}px ${MINOR}px, ${MINOR}px ${MINOR}px, ${MAJOR}px ${MAJOR}px, ${MAJOR}px ${MAJOR}px`,
          backgroundPosition: `${pos}, ${pos}, ${pos}, ${pos}`,
        }}
      />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <rect
          x={22}
          y={22}
          width={1036}
          height={1876}
          fill="none"
          stroke={tint(INK, 0.45)}
          strokeWidth={3}
        />
        <rect
          x={32}
          y={32}
          width={1016}
          height={1856}
          fill="none"
          stroke={tint(INK, 0.2)}
          strokeWidth={1}
        />
        <Reg x={60} y={60} />
        <Reg x={1020} y={60} />
        <Reg x={60} y={1860} />
        <Reg x={1020} y={1860} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- house

// Elevation of a house, centred on the stage, drawn part by part (one part
// every ~1.4 s, a visual change well inside the 3 s rule), held, then faded
// and redrawn. Shown only while the stage is otherwise free (`level` 0).
const HX = MID_X - 250;
const HW = 500;
const GROUND = STAGE.bottom - 90;
const WALL_TOP = GROUND - 250;
const RIDGE = WALL_TOP - 170;
const HOUSE_PARTS: { d: string; w?: number; c?: string }[] = [
  { d: `M ${HX - 90} ${GROUND} H ${HX + HW + 90}`, w: 4 },
  { d: `M ${HX} ${GROUND} V ${WALL_TOP} H ${HX + HW} V ${GROUND}` },
  {
    d: `M ${HX - 40} ${WALL_TOP + 10} L ${MID_X} ${RIDGE} L ${HX + HW + 40} ${WALL_TOP + 10}`,
  },
  {
    d: `M ${HX + 360} ${RIDGE + 60} V ${RIDGE + 10} H ${HX + 410} V ${RIDGE + 96}`,
  },
  { d: rectPath(MID_X - 45, GROUND - 150, 90, 150) },
  {
    d: `${rectPath(HX + 50, WALL_TOP + 50, 110, 90)} M ${HX + 105} ${WALL_TOP + 50} V ${WALL_TOP + 140} M ${HX + 50} ${WALL_TOP + 95} H ${HX + 160}`,
  },
  {
    d: `${rectPath(HX + HW - 160, WALL_TOP + 50, 110, 90)} M ${HX + HW - 105} ${WALL_TOP + 50} V ${WALL_TOP + 140} M ${HX + HW - 160} ${WALL_TOP + 95} H ${HX + HW - 50}`,
  },
  // Width dimension under the ground line.
  {
    d: `M ${HX} ${GROUND + 20} V ${GROUND + 70} M ${HX + HW} ${GROUND + 20} V ${GROUND + 70} M ${HX} ${GROUND + 50} H ${HX + HW}`,
    w: 2,
    c: tint(brand.highlight, 0.9),
  },
  // Height dimension on the right.
  {
    d: `M ${HX + HW + 60} ${GROUND} V ${RIDGE} M ${HX + HW + 45} ${GROUND} H ${HX + HW + 75} M ${HX + HW + 45} ${RIDGE} H ${HX + HW + 75}`,
    w: 2,
    c: tint(brand.highlight, 0.9),
  },
];
const PART_FRAMES = 42;
const HOLD_FRAMES = 150;
const CYCLE = HOUSE_PARTS.length * PART_FRAMES + HOLD_FRAMES;

export const HouseSketch: React.FC<{ level: number[] }> = ({ level }) => {
  const frame = useCurrentFrame();
  const idle = 1 - (level[frame] ?? 0);
  if (idle <= 0) return null;
  const t = frame % CYCLE;
  const fadeOut = interpolate(t, [CYCLE - 20, CYCLE], [1, 0], clamp);
  return (
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", opacity: idle * fadeOut * 0.85 }}
    >
      {HOUSE_PARTS.map((part, i) => (
        <Trace
          key={part.d}
          d={part.d}
          p={draw(t, i * PART_FRAMES, i * PART_FRAMES + PART_FRAMES - 6)}
          width={part.w ?? 3}
          color={part.c ?? INK}
        />
      ))}
    </svg>
  );
};

// ---------------------------------------------------------------- title block

export const TB_W = 600; // ends at x 654, clear of the LogoMark tile (x >= ~718)
export const TB_H = 112;
const TB_CELL = 118;

const TitleSheet: React.FC<{ sheet: number; title: string }> = ({
  sheet,
  title,
}) => {
  const frame = useCurrentFrame();
  const box = draw(frame, 0, 20);
  const text = interpolate(frame, [12, 24], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: SAFE.top,
        width: TB_W,
        height: TB_H,
        fontFamily: FONT,
      }}
    >
      <svg
        width={TB_W}
        height={TB_H}
        style={{ position: "absolute", overflow: "visible" }}
      >
        <rect
          width={TB_W}
          height={TB_H}
          fill={tint(brand.navy, 0.8 * box)}
          stroke="none"
        />
        <Trace d={rectPath(1.5, 1.5, TB_W - 3, TB_H - 3)} p={box} width={3} />
        <Seg x1={TB_CELL} y1={0} x2={TB_CELL} y2={TB_H} p={box} width={2} />
        <Seg
          x1={TB_CELL}
          y1={40}
          x2={TB_W}
          y2={40}
          p={box}
          width={1.5}
          color={tint(INK, 0.6)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: TB_CELL,
          height: TB_H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: text,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
            color: INK,
          }}
        >
          TỜ
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            lineHeight: 1,
            color: brand.highlight,
          }}
        >
          {String(sheet).padStart(2, "0")}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: TB_CELL + 16,
          top: 8,
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: 3,
          color: INK,
          opacity: text,
        }}
      >
        FINANCE HUB · BẢN VẼ
      </div>
      <div
        style={{
          position: "absolute",
          left: TB_CELL + 16,
          right: 14,
          top: 44,
          height: TB_H - 48,
          display: "flex",
          alignItems: "center",
          fontSize: title.length > 30 ? 25 : 29,
          fontWeight: 800,
          lineHeight: 1.2,
          color: brand.text,
          opacity: text,
          transform: `translateX(${interpolate(text, [0, 1], [-14, 0])}px)`,
        }}
      >
        {title}
      </div>
    </div>
  );
};

// The legend: sheet 01 carries the video's title; each chapter turns to the
// next sheet and redraws the block with its title.
export const TitleBlock: React.FC<{ reel: Reel; talkFrames: number }> = ({
  reel,
  talkFrames,
}) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const sheets = [
    { from: 0, title: reel.edit.title ?? "" },
    ...(reel.edit.chapters ?? []).map((c) => ({
      from: Math.max(0, at(c.atMs)),
      title: c.title,
    })),
  ].filter((s) => s.title);
  return (
    <>
      {sheets.map((s, i) => {
        const to = sheets[i + 1]?.from ?? talkFrames;
        return to > s.from ? (
          <Sequence
            key={`${s.from}${s.title}`}
            from={s.from}
            durationInFrames={to - s.from}
            layout="none"
          >
            <TitleSheet sheet={i + 1} title={s.title} />
          </Sequence>
        ) : null;
      })}
    </>
  );
};
