// "isometric" world: a floating isometric island (a tile-grid ground plate on
// a pale-sky-to-navy gradient) with a small city on its edges: apartment
// blocks, a generic bank, houses and trees. Everything is drawn in SVG through
// one projection, `project(cam, x, y, z)`, whose camera drifts a few degrees
// round the island and breathes in and out, so the world never sits still.
// The centre of the island (the PLAZA, |x|,|y| < 2) stays empty: the story's
// objects (figure towers, the hook's block city, compare towers, a bank's
// sign-board) are built there by Stage.tsx and Cues.tsx with the same camera.
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useDelayRender,
} from "remotion";
import { brand } from "../../brand/theme";
import { clamp, reelFontReady } from "../../mortgage/style";
import {
  HALF,
  IsoSvg,
  OX,
  P,
  PAL,
  PALE,
  SKY,
  WHITE,
  box,
  camAt,
  depthOf,
  disc,
  mix,
  project,
  roof,
  tree,
  windows,
  type Cam,
  type Mark,
  type Pal,
  type Shape,
} from "./Iso";

export * from "./Iso";

// ------------------------------------------------------------- the city

type Bld = {
  kind: "block" | "house" | "bank" | "tree";
  x: number;
  y: number;
  w?: number;
  d?: number;
  h?: number;
  pal?: Pal;
};

// On the island's edges only; the front edges stay low so the plaza shows.
const CITY: Bld[] = [
  { kind: "tree", x: -3.3, y: -3.3 },
  { kind: "tree", x: -2.7, y: -3.6 },
  { kind: "tree", x: -3.6, y: -2.6 },
  { kind: "block", x: -3.8, y: -1.4, w: 1.2, d: 1.3, h: 3.2, pal: PAL.blue },
  { kind: "block", x: -0.4, y: -3.8, w: 1.3, d: 1.2, h: 2.6, pal: PAL.white },
  { kind: "block", x: 1.3, y: -3.7, w: 1.0, d: 1.0, h: 1.7, pal: PAL.navy },
  { kind: "bank", x: -3.8, y: 1.0, w: 1.4, d: 1.6, h: 1.3, pal: PAL.white },
  { kind: "house", x: 2.7, y: -3.6, w: 1.0, d: 1.0, h: 0.8, pal: PAL.white },
  { kind: "house", x: -3.6, y: 3.0, w: 1.0, d: 0.9, h: 0.8, pal: PAL.white },
  { kind: "house", x: 2.9, y: -1.9, w: 0.9, d: 0.9, h: 0.7, pal: PAL.white },
  { kind: "tree", x: 3.4, y: 0.4 },
  { kind: "tree", x: 0.4, y: 3.4 },
  { kind: "tree", x: 3.3, y: 2.2 },
  { kind: "tree", x: -2.0, y: 3.4 },
];

// Roof tops where the ambient coins land.
const ROOFS: [number, number, number][] = CITY.filter(
  (b) => b.kind === "block",
).map((b) => [b.x + (b.w ?? 1) / 2, b.y + (b.d ?? 1) / 2, b.h ?? 1]);

const buildingMarks = (c: Cam, b: Bld, k: number, t: number): Mark[] => {
  if (b.kind === "tree") return tree(c, b.x, b.y, k);
  const [w, d, pal] = [b.w ?? 1, b.d ?? 1, b.pal ?? PAL.white];
  const h = (b.h ?? 1) * k;
  const body = box(c, b.x, b.y, 0, w, d, h, pal);
  const flick = Math.floor(t / 40);
  const lit = (face: string) => (i: number) =>
    random(`iso-w-${b.x}-${face}-${i}-${flick}`) > 0.72;
  if (b.kind === "block") {
    const dim = pal === PAL.white ? SKY : mix(pal.left, brand.navy, 0.45);
    return [
      ...body,
      ...windows(c, { x: b.x, y: b.y, w, d, h }, "y", 3, 8, dim, lit("y")),
      ...windows(c, { x: b.x, y: b.y, w, d, h }, "x", 3, 8, dim, lit("x")),
    ];
  }
  if (b.kind === "house") {
    return [
      ...body,
      ...roof(c, b.x, b.y, h, w, d, 0.55 * k, PAL.navy),
      ...windows(c, { x: b.x, y: b.y, w, d, h }, "y", 2, 1, SKY, () => k > 0.9),
    ];
  }
  // Bank: columns on both faces, a navy cornice and pediment, a gold coin.
  const cols = (face: "x" | "y"): Mark[] =>
    [0, 1, 2, 3].map((q) => {
      const len = face === "y" ? w : d;
      const [u0, u1] = [((q + 0.3) / 4) * len, ((q + 0.62) / 4) * len];
      const at = (u: number, v: number): [number, number, number] =>
        face === "y" ? [b.x + u, b.y + d, v] : [b.x + w, b.y + u, v];
      return {
        k: "poly",
        fill: PALE,
        pts: P(c, [
          at(u0, 0.08 * k),
          at(u1, 0.08 * k),
          at(u1, h - 0.1 * k),
          at(u0, h - 0.1 * k),
        ]),
      };
    });
  const coin = project(c, b.x + w, b.y + d / 2, h + 0.42 * k);
  return [
    ...body,
    ...cols("y"),
    ...cols("x"),
    ...box(
      c,
      b.x - 0.08,
      b.y - 0.08,
      h,
      w + 0.16,
      d + 0.16,
      0.14 * k,
      PAL.navy,
    ),
    ...roof(
      c,
      b.x - 0.08,
      b.y - 0.08,
      h + 0.14 * k,
      w + 0.16,
      d + 0.16,
      0.5 * k,
      PAL.navy,
    ),
    { k: "ell", c: coin, rx: 9 * k, ry: 11 * k, fill: brand.highlight },
  ];
};

// The plaza's resting piece: a white home with a gold roof and a lit door.
const homeMarks = (c: Cam, k: number): Mark[] => {
  if (k <= 0.01) return [];
  const b = { x: -0.8, y: -0.7, w: 1.6, d: 1.4, h: 1.0 * k };
  const door = (u: number, v: number): [number, number, number] => [
    b.x + b.w,
    b.y + 0.5 + u,
    v,
  ];
  return [
    ...box(c, b.x, b.y, 0, b.w, b.d, b.h, PAL.white),
    ...windows(c, b, "y", 3, 1, SKY, () => true),
    {
      k: "poly",
      fill: brand.background,
      pts: P(c, [
        door(0, 0),
        door(0.4, 0),
        door(0.4, 0.6 * k),
        door(0, 0.6 * k),
      ]),
    },
    ...roof(
      c,
      b.x - 0.06,
      b.y - 0.06,
      b.h,
      b.w + 0.12,
      b.d + 0.12,
      0.75 * k,
      PAL.gold,
    ),
  ];
};

const Clouds: React.FC<{ t: number }> = ({ t }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    {[0, 1, 2].map((i) => {
      const x =
        ((((170 + i * 430 + t * (0.35 + i * 0.12)) % 1400) + 1400) % 1400) -
        160;
      const y = 470 + i * 95;
      return (
        <g
          key={i}
          opacity={0.75}
          transform={`translate(${x} ${y}) scale(${1 - i * 0.18})`}
        >
          <ellipse cx={0} cy={0} rx={90} ry={26} fill={WHITE} />
          <ellipse cx={-30} cy={-16} rx={42} ry={30} fill={WHITE} />
          <ellipse cx={28} cy={-22} rx={50} ry={36} fill={WHITE} />
        </g>
      );
    })}
  </svg>
);

// A coin drops onto a roof every 72 frames (between beats the city is alive).
const ambientCoin = (c: Cam, t: number): Mark[] => {
  if (t < 0) return [];
  const n = Math.floor(t / 72);
  const u = t - n * 72;
  const [x, y, z] = ROOFS[n % ROOFS.length];
  const fall = interpolate(u, [0, 14], [2.2, 0], {
    ...clamp,
    easing: (q) => q * q,
  });
  const bounce =
    u > 14
      ? Math.abs(Math.sin((u - 14) / 4)) * 0.25 * Math.exp(-(u - 14) / 8)
      : 0;
  const op = interpolate(u, [0, 4, 34, 44], [0, 1, 1, 0], clamp);
  return disc(
    c,
    x,
    y,
    z + fall + bounce,
    0.2,
    0.07,
    brand.highlight,
    brand.accent,
  ).map((m) => ({ ...m, op }));
};

// The island and its city. `rise`: frames since the city started building
// (the cover builds it; the talk shows it built).
export const IsoWorld: React.FC<{
  t: number;
  rise?: number;
  fps?: number;
  calm?: number; // 0..1: the city fades back while a cue owns the island
  home?: number; // 0..1: the gold-roofed home on the plaza while it is free
}> = ({ t, rise, fps = 30, calm = 0, home = 0 }) => {
  const c = camAt(t);
  const g = (x: number, y: number) => project(c, x, y, 0);
  const H = HALF;
  const plate: Mark[] = [
    {
      k: "poly",
      fill: brand.primary,
      pts: P(c, [
        [-H, H, -0.6],
        [H, H, -0.6],
        [H, H, 0],
        [-H, H, 0],
      ]),
    },
    {
      k: "poly",
      fill: brand.background,
      pts: P(c, [
        [H, -H, -0.6],
        [H, H, -0.6],
        [H, H, 0],
        [H, -H, 0],
      ]),
    },
  ];
  const grid = Array.from({ length: 2 * H + 1 }, (_, i) => i - H);
  const city: Shape[] = CITY.map((b, i) => {
    const k =
      rise === undefined
        ? 1
        : spring({
            frame: rise - 4 - i * 3,
            fps,
            config: { damping: 12, stiffness: 140 },
          });
    return {
      depth: depthOf(c, b.x + (b.w ?? 0) / 2, b.y + (b.d ?? 0) / 2),
      marks: buildingMarks(c, b, k, t),
    };
  });
  const [bx, by] = g(-H, -H);
  const [fx, fy] = g(H, H);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${PALE} 0%, ${mix(brand.primary, WHITE, 0.62)} 34%, ${brand.primary} 66%, ${brand.background} 84%, ${brand.navy} 100%)`,
      }}
    >
      <Clouds t={t} />
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient
            id="iso-ground"
            gradientUnits="userSpaceOnUse"
            x1={bx}
            y1={by}
            x2={fx}
            y2={fy}
          >
            <stop offset="0%" stopColor={WHITE} />
            <stop offset="100%" stopColor={SKY} />
          </linearGradient>
          <filter id="iso-blur">
            <feGaussianBlur stdDeviation={24} />
          </filter>
        </defs>
        {/* The island floats: a soft navy shadow under it. */}
        <ellipse
          cx={OX}
          cy={fy + 110}
          rx={430}
          ry={60}
          fill={brand.navy}
          opacity={0.45}
          filter="url(#iso-blur)"
        />
        {plate.map((m, i) =>
          m.k === "poly" ? (
            <polygon
              key={i}
              points={m.pts.map((p) => p.join(",")).join(" ")}
              fill={m.fill}
            />
          ) : null,
        )}
        <polygon
          points={[g(-H, -H), g(H, -H), g(H, H), g(-H, H)]
            .map((p) => p.join(","))
            .join(" ")}
          fill="url(#iso-ground)"
        />
        {grid.map((i) => (
          <g
            key={i}
            stroke={brand.primary}
            strokeOpacity={0.16}
            strokeWidth={1.5}
          >
            <line
              x1={g(i, -H)[0]}
              y1={g(i, -H)[1]}
              x2={g(i, H)[0]}
              y2={g(i, H)[1]}
            />
            <line
              x1={g(-H, i)[0]}
              y1={g(-H, i)[1]}
              x2={g(H, i)[0]}
              y2={g(H, i)[1]}
            />
          </g>
        ))}
        {/* The plaza: a pale lot where the story's objects are built. */}
        <polygon
          points={[g(-2, -2), g(2, -2), g(2, 2), g(-2, 2)]
            .map((p) => p.join(","))
            .join(" ")}
          fill={WHITE}
          fillOpacity={0.55}
          stroke={brand.primary}
          strokeOpacity={0.35}
          strokeWidth={2}
          strokeDasharray="10 8"
        />
      </svg>
      <IsoSvg
        shapes={[
          ...city,
          { depth: 0, marks: homeMarks(c, home) },
          { depth: 99, marks: ambientCoin(c, t) },
        ]}
        style={{ opacity: 1 - 0.7 * calm }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- shared

// fitText needs Be Vietnam Pro loaded: false until it is; the frame is held.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("isometric: Be Vietnam Pro"));
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

// An isometric slab edge under an HTML card: stacked 2:1 shadows (right, down)
// read as the slab's thickness, plus a soft drop shadow.
export const slabEdge = (depth: number, color: string): string =>
  [
    ...Array.from(
      { length: depth },
      (_, i) => `${(i + 1) * 0.5}px ${i + 1}px 0 ${color}`,
    ),
    `0 ${depth + 18}px 30px ${brand.navy}66`,
  ].join(", ");
