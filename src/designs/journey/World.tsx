// "journey" world: the map drawn at talk time. Seeded tiles of land (contour
// rings, tree clumps, houses, a river every third tile), the road (planned
// route, dashed line drawn ahead of the marker, gold trail behind it) and the
// flags every beat of the talk plants beside it.
import { getPointAtLength, getTangentAtLength } from "@remotion/paths";
import type React from "react";
import { useMemo } from "react";
import { random, spring, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { figuresOf, lenderMentionsOf } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import {
  GOLD,
  INK,
  LEAF,
  LEAF_LIGHT,
  ROUTE,
  ROUTE_LENGTH,
  SAND,
  SAND_DEEP,
  WATER,
  WATER_LIGHT,
  alpha,
  cameraAt,
  lengthAt,
  roadX,
  worldTransform,
} from "./Map";

// ------------------------------------------------------------- flags

export type Flag = {
  frame: number;
  kind: "figure" | "cue" | "chapter" | "bank";
};

// Every beat of the talk, where it starts (talk frames).
export const flagsOf = (reel: Reel, fps: number): Flag[] => {
  const at = outFrameOf(reel.timeline, fps);
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  return [
    ...figuresOf(reel, fps).map(
      (x): Flag => ({ frame: x.fromFrame, kind: "figure" }),
    ),
    ...(reel.edit.cues ?? []).map(
      (c): Flag => ({ frame: at(c.fromMs), kind: "cue" }),
    ),
    ...(reel.edit.chapters ?? []).map(
      (c): Flag => ({ frame: at(c.atMs), kind: "chapter" }),
    ),
    ...lenderMentionsOf(reel).map(
      (m): Flag => ({ frame: f(m.startMs), kind: "bank" }),
    ),
  ].sort((a, b) => a.frame - b.frame);
};

export const useFlags = (reel: Reel | null | undefined): Flag[] => {
  const { fps } = useVideoConfig();
  return useMemo(() => (reel ? flagsOf(reel, fps) : []), [reel, fps]);
};

const FLAG_COLOUR: Record<Flag["kind"], string> = {
  figure: GOLD,
  cue: brand.primary,
  chapter: brand.navy,
  bank: brand.good,
};

// A pennant on a pole, planted beside the road (sides alternate).
const PlantedFlag: React.FC<{
  flag: Flag;
  i: number;
  t: number;
  fps: number;
}> = ({ flag, i, t, fps }) => {
  const len = lengthAt(flag.frame, fps);
  const p = getPointAtLength(ROUTE, len);
  const tan = getTangentAtLength(ROUTE, len);
  if (!p || !tan) return null;
  const side = i % 2 ? 1 : -1;
  const x = p.x - tan.y * side * 78;
  const y = p.y + tan.x * side * 78;
  const g = spring({
    frame: t - flag.frame,
    fps,
    config: { damping: 11, stiffness: 160 },
  });
  const wave = Math.sin(t / 7 + i) * 4;
  const c = FLAG_COLOUR[flag.kind];
  return (
    <g transform={`translate(${x} ${y}) scale(${g})`}>
      <ellipse cx={0} cy={4} rx={16} ry={6} fill={alpha(brand.navy, 0.18)} />
      <line
        x1={0}
        y1={4}
        x2={0}
        y2={-74}
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d={`M 2 -74 Q 26 ${-68 + wave} 50 ${-62 + wave} Q 26 ${-54 + wave} 2 -48 Z`}
        fill={c}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <circle cx={0} cy={-76} r={5} fill={GOLD} stroke={INK} strokeWidth={2} />
    </g>
  );
};

// ------------------------------------------------------------- the world

const TILE = 640;
const house = (x: number, y: number, s: number, roof: string, key: string) => (
  <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
    <rect
      x={-18}
      y={-4}
      width={36}
      height={26}
      rx={3}
      fill="#ffffff"
      stroke={INK}
      strokeWidth={2.5}
    />
    <path
      d="M -24 -2 L 0 -24 L 24 -2 Z"
      fill={roof}
      stroke={INK}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <rect x={-5} y={8} width={10} height={14} fill={GOLD} />
  </g>
);

// One seeded tile of land: a hill's contour rings, tree clumps, a house or
// two, and every third tile a river crossing the whole map.
const Tile: React.FC<{ k: number }> = ({ k }) => {
  const top = -k * TILE;
  const r = (s: string) => random(`journey-${k}-${s}`);
  const hx = -200 + r("hx") * 1480;
  const hy = top - r("hy") * TILE;
  const trees: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -300 + r(`tx${i}`) * 1680;
    const y = top - r(`ty${i}`) * TILE;
    if (Math.abs(x - roadX(y)) < 150) continue;
    const n = 2 + Math.floor(r(`tn${i}`) * 3);
    trees.push(
      <g key={`t${i}`}>
        {Array.from({ length: n }, (_, j) => {
          const cx = x + (random(`${k}-${i}-${j}-a`) - 0.5) * 60;
          const cy = y + (random(`${k}-${i}-${j}-b`) - 0.5) * 40;
          const rr = 15 + random(`${k}-${i}-${j}-c`) * 10;
          return (
            <g key={j}>
              <circle
                cx={cx + 4}
                cy={cy + 6}
                r={rr}
                fill={alpha(brand.navy, 0.12)}
              />
              <circle
                cx={cx}
                cy={cy}
                r={rr}
                fill={j % 2 ? LEAF : LEAF_LIGHT}
                stroke={alpha(brand.navy, 0.35)}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </g>,
    );
  }
  const houses: React.ReactNode[] = [];
  for (let i = 0; i < 2; i++) {
    const x = -200 + r(`hx${i}`) * 1480;
    const y = top - r(`hy${i}`) * TILE;
    if (Math.abs(x - roadX(y)) < 170) continue;
    houses.push(house(x, y, 1 + r(`hs${i}`) * 0.4, i ? GOLD : WATER, `h${i}`));
  }
  const ring = (rad: number, seed: string) => {
    const pts = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const w =
        1 +
        0.13 * Math.sin(3 * a + r(`${seed}a`) * 6) +
        0.07 * Math.sin(5 * a + r(`${seed}b`) * 6);
      return `${hx + Math.cos(a) * rad * w * 1.3} ${hy + Math.sin(a) * rad * w}`;
    });
    return `M ${pts.join(" L ")} Z`;
  };
  const riverY = top - TILE / 2;
  const river =
    k % 3 === 1
      ? `M -700 ${riverY} ${Array.from({ length: 25 }, (_, i) => {
          const x = -700 + (i + 1) * 110;
          return `L ${x} ${riverY + 70 * Math.sin(x / 190 + k)}`;
        }).join(" ")}`
      : null;
  return (
    <g>
      {[90, 150, 210].map((rad) => (
        <path
          key={rad}
          d={ring(rad, `c${rad}`)}
          fill="none"
          stroke={alpha(brand.navy, 0.1)}
          strokeWidth={2.5}
        />
      ))}
      {river ? (
        <g>
          <path
            d={river}
            fill="none"
            stroke={WATER}
            strokeWidth={58}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={river}
            fill="none"
            stroke={WATER_LIGHT}
            strokeWidth={14}
            strokeDasharray="40 70"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
      {houses}
      {trees}
    </g>
  );
};

// The road: an outline, a pale casing, the planned route as faint dots, the
// dashed centre line drawn ahead of the marker, and the gold trail behind it.
const Road: React.FC<{ len: number; t: number }> = ({ len, t }) => {
  const reveal = len + 520 + 60 * Math.sin(t / 30);
  return (
    <g>
      <defs>
        <mask
          id="journey-reveal"
          maskUnits="userSpaceOnUse"
          x={-2000}
          y={-40000}
          width={6000}
          height={44000}
        >
          <path
            d={ROUTE}
            fill="none"
            stroke="#ffffff"
            strokeWidth={30}
            strokeDasharray={`${reveal} ${ROUTE_LENGTH}`}
          />
        </mask>
      </defs>
      <path
        d={ROUTE}
        fill="none"
        stroke={alpha(brand.navy, 0.16)}
        strokeWidth={56}
        strokeLinecap="round"
      />
      <path
        d={ROUTE}
        fill="none"
        stroke="#ffffff"
        strokeWidth={44}
        strokeLinecap="round"
      />
      <path
        d={ROUTE}
        fill="none"
        stroke={alpha(brand.navy, 0.28)}
        strokeWidth={6}
        strokeDasharray="3 18"
        strokeLinecap="round"
      />
      <path
        d={ROUTE}
        fill="none"
        stroke={INK}
        strokeWidth={7}
        strokeDasharray="24 18"
        strokeDashoffset={-t * 0.6}
        mask="url(#journey-reveal)"
      />
      <path
        d={ROUTE}
        fill="none"
        stroke={GOLD}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${len} ${ROUTE_LENGTH}`}
      />
    </g>
  );
};

// The whole map at talk time `t` (a continuous clock, so it never jumps at a
// cut). `flags` are planted once the marker has passed them.
export const MapWorld: React.FC<{ t: number; flags?: Flag[] }> = ({
  t,
  flags = [],
}) => {
  const { fps } = useVideoConfig();
  const cam = cameraAt(t, fps);
  const k0 = Math.floor(-(cam.py + 1300) / TILE) - 1;
  const k1 = Math.floor(-(cam.py - 2000) / TILE) + 1;
  const tiles = [];
  for (let k = Math.max(-2, k0); k <= k1; k++)
    tiles.push(<Tile key={k} k={k} />);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect width={1080} height={1920} fill={SAND} />
      <g transform={worldTransform(cam)}>
        {/* Graticule: the faint lines of a printed map. */}
        {Array.from({ length: 9 }, (_, i) => {
          const y = Math.round(cam.py / 300) * 300 + (i - 5) * 300;
          return (
            <line
              key={`g${y}`}
              x1={-900}
              x2={2000}
              y1={y}
              y2={y}
              stroke={alpha(brand.primary, 0.08)}
              strokeWidth={2}
              strokeDasharray="10 14"
            />
          );
        })}
        {[-600, -300, 0, 300, 600, 900, 1200, 1500].map((x) => (
          <line
            key={`v${x}`}
            x1={x}
            x2={x}
            y1={cam.py - 2400}
            y2={cam.py + 2400}
            stroke={alpha(brand.primary, 0.08)}
            strokeWidth={2}
            strokeDasharray="10 14"
          />
        ))}
        {tiles}
        <Road len={cam.len} t={t} />
        {flags.map((f, i) =>
          f.frame <= t && lengthAt(f.frame, fps) > cam.len - 1500 ? (
            <PlantedFlag
              key={`${f.kind}${f.frame}`}
              flag={f}
              i={i}
              t={t}
              fps={fps}
            />
          ) : null,
        )}
      </g>
      {/* Warm edges, like an old printed map. */}
      <rect width={1080} height={1920} fill="url(#journey-edge)" />
      <defs>
        <radialGradient id="journey-edge" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor={SAND_DEEP} stopOpacity={0} />
          <stop offset="100%" stopColor={SAND_DEEP} stopOpacity={0.9} />
        </radialGradient>
      </defs>
    </svg>
  );
};
