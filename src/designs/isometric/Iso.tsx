// "isometric" primitives: brand tints, the drifting camera, the projection
// and the marks everything is drawn with (boxes, windows, gable roofs, coins,
// trees), and the SVG that paints them in depth order. World.tsx builds the
// island and its city from these; Stage, Plaza and Cues build the story.
import type React from "react";
import { brand } from "../../brand/theme";

export const WHITE = "#ffffff";
export const HALF = 4; // the island spans -HALF..HALF on x and y
export const S = 84; // pixels per world unit at zoom 1
export const K = 0.8; // vertical pixels per unit, relative to S
export const OX = 540;
export const OY = 1000; // screen y of the island's centre

// Brand tints computed from theme tokens (no new colours).
const channels = (h: string) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number): string => {
  const A = channels(a);
  const B = channels(b);
  return `#${A.map((v, i) =>
    Math.round(v + (B[i] - v) * t)
      .toString(16)
      .padStart(2, "0"),
  ).join("")}`;
};
export const SKY = mix(brand.primary, WHITE, 0.6);
export const PALE = mix(brand.primary, WHITE, 0.86);

export type Pal = { top: string; left: string; right: string };
export const PAL: Record<"white" | "blue" | "navy" | "gold", Pal> = {
  white: { top: WHITE, left: PALE, right: mix(brand.primary, WHITE, 0.7) },
  blue: {
    top: SKY,
    left: brand.primary,
    right: mix(brand.primary, brand.navy, 0.35),
  },
  navy: {
    top: mix(brand.background, WHITE, 0.25),
    left: brand.background,
    right: brand.navy,
  },
  gold: {
    top: brand.highlight,
    left: brand.accent,
    right: mix(brand.accent, brand.navy, 0.3),
  },
};

// ------------------------------------------------------------- camera

export type Cam = { a: number; s: number; ox: number; oy: number };

// `t` is the talk frame (or the cover's): azimuth 45° ± 3°, zoom ± 2 %.
export const camAt = (t: number): Cam => ({
  a: ((45 + 3 * Math.sin(t / 210)) * Math.PI) / 180,
  s: S * (1 + 0.02 * Math.sin(t / 330)),
  ox: OX,
  oy: OY,
});

export type Pt = [number, number];
export const project = (c: Cam, x: number, y: number, z: number): Pt => [
  c.ox + (x * Math.cos(c.a) - y * Math.sin(c.a)) * c.s,
  c.oy + (x * Math.sin(c.a) + y * Math.cos(c.a)) * c.s * 0.5 - z * c.s * K,
];
// Painter's order: larger is nearer the viewer.
export const depthOf = (c: Cam, x: number, y: number) =>
  x * Math.sin(c.a) + y * Math.cos(c.a);

// ------------------------------------------------------------- marks

export type Mark =
  | { k: "poly"; pts: Pt[]; fill: string; stroke?: string; op?: number }
  | {
      k: "ell";
      c: Pt;
      rx: number;
      ry: number;
      fill: string;
      stroke?: string;
      op?: number;
    };
export type Shape = { depth: number; marks: Mark[] };

export const P = (c: Cam, pts: [number, number, number][]): Pt[] =>
  pts.map(([x, y, z]) => project(c, x, y, z));

// A box: its +x face (right), +y face (left) and top, the three the camera sees.
export const box = (
  c: Cam,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  pal: Pal,
): Mark[] => {
  if (h <= 0.001) return [];
  const [x1, y1, z1] = [x + w, y + d, z + h];
  return [
    {
      k: "poly",
      fill: pal.right,
      pts: P(c, [
        [x1, y, z],
        [x1, y1, z],
        [x1, y1, z1],
        [x1, y, z1],
      ]),
    },
    {
      k: "poly",
      fill: pal.left,
      pts: P(c, [
        [x, y1, z],
        [x1, y1, z],
        [x1, y1, z1],
        [x, y1, z1],
      ]),
    },
    {
      k: "poly",
      fill: pal.top,
      pts: P(c, [
        [x, y, z1],
        [x1, y, z1],
        [x1, y1, z1],
        [x, y1, z1],
      ]),
    },
  ];
};

// Windows on a box's left (+y) or right (+x) face, `lit(i)` picks the bright ones.
export const windows = (
  c: Cam,
  b: { x: number; y: number; z?: number; w: number; d: number; h: number },
  face: "x" | "y",
  cols: number,
  rows: number,
  dim: string,
  lit: (i: number) => boolean,
): Mark[] => {
  const out: Mark[] = [];
  const z0 = b.z ?? 0;
  const len = face === "y" ? b.w : b.d;
  const floor = 0.42; // one floor's height in units
  const nRows = Math.min(rows, Math.floor(b.h / floor));
  for (let r = 0; r < nRows; r++)
    for (let q = 0; q < cols; q++) {
      const u0 = ((q + 0.28) / cols) * len;
      const u1 = ((q + 0.72) / cols) * len;
      const v0 = z0 + r * floor + 0.14;
      const v1 = v0 + 0.2;
      const at = (u: number, v: number): [number, number, number] =>
        face === "y" ? [b.x + u, b.y + b.d, v] : [b.x + b.w, b.y + u, v];
      out.push({
        k: "poly",
        fill: lit(r * cols + q) ? brand.highlight : dim,
        pts: P(c, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]),
      });
    }
  return out;
};

// A gable roof along x on top of a box.
export const roof = (
  c: Cam,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  r: number,
  pal: Pal,
): Mark[] => {
  const [x1, y1, ym, zr] = [x + w, y + d, y + d / 2, z + r];
  return [
    {
      k: "poly",
      fill: pal.top,
      pts: P(c, [
        [x, y, z],
        [x1, y, z],
        [x1, ym, zr],
        [x, ym, zr],
      ]),
    },
    {
      k: "poly",
      fill: pal.left,
      pts: P(c, [
        [x, y1, z],
        [x1, y1, z],
        [x1, ym, zr],
        [x, ym, zr],
      ]),
    },
    {
      k: "poly",
      fill: pal.right,
      pts: P(c, [
        [x1, y, z],
        [x1, y1, z],
        [x1, ym, zr],
      ]),
    },
  ];
};

// A vertical cylinder (a coin, a stack of coins): bottom rim, side, top.
export const disc = (
  c: Cam,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  top: string,
  side: string,
): Mark[] => {
  const [cx, cyB] = project(c, x, y, z);
  const cyT = cyB - h * c.s * K;
  const rx = r * c.s;
  const ry = rx * 0.5;
  return [
    { k: "ell", c: [cx, cyB], rx, ry, fill: side },
    {
      k: "poly",
      fill: side,
      pts: [
        [cx - rx, cyT],
        [cx + rx, cyT],
        [cx + rx, cyB],
        [cx - rx, cyB],
      ],
    },
    { k: "ell", c: [cx, cyT], rx, ry, fill: top, stroke: side },
  ];
};

export const tree = (c: Cam, x: number, y: number, k: number): Mark[] => {
  if (k <= 0.01) return [];
  const trunk = box(c, x - 0.06, y - 0.06, 0, 0.12, 0.12, 0.34 * k, PAL.navy);
  const [cx, cy] = project(c, x, y, 0.34 * k + 0.34 * k);
  const r = 0.36 * c.s * k;
  return [
    ...trunk,
    {
      k: "ell",
      c: [cx, cy],
      rx: r,
      ry: r,
      fill: mix(brand.good, brand.navy, 0.35),
    },
    {
      k: "ell",
      c: [cx - r * 0.25, cy - r * 0.25],
      rx: r * 0.62,
      ry: r * 0.62,
      fill: brand.good,
      op: 0.9,
    },
  ];
};

// Draws shapes in painter's order.
export const IsoSvg: React.FC<{
  shapes: Shape[];
  style?: React.CSSProperties;
}> = ({ shapes, style }) => (
  <svg
    width={1080}
    height={1920}
    style={{ position: "absolute", inset: 0, ...style }}
  >
    {[...shapes]
      .sort((a, b) => a.depth - b.depth)
      .flatMap((s) => s.marks)
      .map((m, i) =>
        m.k === "poly" ? (
          <polygon
            key={i}
            points={m.pts.map((p) => p.join(",")).join(" ")}
            fill={m.fill}
            stroke={m.stroke ?? m.fill}
            strokeWidth={m.stroke ? 2 : 0.6}
            strokeLinejoin="round"
            opacity={m.op}
          />
        ) : (
          <ellipse
            key={i}
            cx={m.c[0]}
            cy={m.c[1]}
            rx={m.rx}
            ry={m.ry}
            fill={m.fill}
            stroke={m.stroke}
            strokeWidth={m.stroke ? 2 : 0}
            opacity={m.op}
          />
        ),
      )}
  </svg>
);
