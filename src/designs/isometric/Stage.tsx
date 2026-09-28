// "isometric" stage, drawn over the island (Overlay): the hook (a block city
// rises on the plaza under a floating billboard), every figure built on the
// plaza (a glass cube filling with gold for a %, a coin column for money, a
// tower rising floor by floor for anything else) with its value on a floating
// white slab, or a small chip when the plaza is taken (Plaza.tsx decides).
// Plus the shared layout, the white slab and the number helpers.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { HOOK_FRAMES, SAFE, type Figure } from "../../mortgage/golden";
import type { EditJson } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import {
  IsoSvg,
  PAL,
  SKY,
  WHITE,
  box,
  camAt,
  disc,
  mix,
  slabEdge,
  windows,
  type Mark,
} from "./World";

// Screen layout, top to bottom (all inside SAFE):
export const CHIP_TOP = SAFE.top + 88; // chips, under the chapter slab, left of the logo
export const STAGE_TOP = SAFE.top + 196; // value slabs and cue titles
export const FRONT_BOTTOM = 1150; // a stat's label, a compare's question
export const CAPTION_BOTTOM = 1322;
export const LABEL_W = SAFE.right - SAFE.left;

const ease = (x: number) => 1 - (1 - x) ** 3;
export const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);

export const SLAB: React.CSSProperties = {
  background: WHITE,
  borderRadius: 18,
  color: brand.textOnCard,
  boxShadow: slabEdge(12, SKY),
};

// ------------------------------------------------------------- numbers

// "4,35%" counts 0 → 4,35 with the same decimals, text around it kept. A year
// or a date ("2026", "29/9") is shown as said; a thousands separator only if
// the spoken number had one.
export const counted = (big: string, t: number): string => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  if (/^(19|20)\d\d$/.test(m[0]) || /\d\/\d/.test(big)) return big;
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

// A percentage below 10 % fills a 10 % cube (rates), else a 100 % one.
const fillOf = (big: string): number => {
  const v = parseFloat((big.match(/\d[\d.,]*/)?.[0] ?? "").replace(",", "."));
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : 1;
};
const MONEY = /đô|tỷ|triệu|nghìn|ngàn|\$|k\b/i;

// The number's model on the plaza, grown by `g` (0..1), all at its centre.
const figureMarks = (t: number, f: Figure, g: number): Mark[] => {
  const c = camAt(t);
  if (f.big.includes("%")) {
    const s = 1.8;
    const lvl = s * fillOf(f.big) * g;
    const glass = { top: WHITE, left: WHITE, right: WHITE };
    return [
      ...box(c, -s / 2, -s / 2, 0, s, s, lvl, PAL.gold),
      ...box(c, -s / 2, -s / 2, 0, s, s, s * Math.min(1, g * 3), glass).map(
        (m) => ({ ...m, op: 0.28, stroke: WHITE }),
      ),
    ];
  }
  if (MONEY.test(`${f.big} ${f.label}`)) {
    const n = Math.round(12 * g);
    return Array.from({ length: n }, (_, i) =>
      disc(c, 0, 0, i * 0.17, 0.72, 0.15, brand.highlight, brand.accent),
    ).flat();
  }
  const h = 2.2 * g;
  const b = { x: -0.7, y: -0.7, w: 1.4, d: 1.4, h };
  const dim = mix(brand.primary, brand.navy, 0.4);
  const lit = (i: number) => random(`iso-fig-${i}-${Math.floor(t / 30)}`) > 0.6;
  return [
    ...box(c, b.x, b.y, 0, b.w, b.d, h, PAL.blue),
    ...windows(c, b, "y", 3, 6, dim, lit),
    ...windows(c, b, "x", 3, 6, dim, lit),
    ...box(c, b.x + 0.2, b.y + 0.2, h, 1.0, 1.0, 0.18 * g, PAL.gold),
  ];
};

// A value on a floating white slab, centred at the stage top.
const ValueSlab: React.FC<{
  text: string;
  size: number;
  p: number;
  color?: string;
}> = ({ text, size, p, color = brand.textOnCard }) => (
  <div
    style={{
      position: "absolute",
      top: STAGE_TOP,
      left: SAFE.left,
      width: LABEL_W,
      display: "flex",
      justifyContent: "center",
      opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [60, 0])}px)`,
    }}
  >
    <div
      style={{
        ...SLAB,
        padding: "10px 44px 14px",
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.15,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  </div>
);

// A line on a slab at the plaza's front (a stat's label, the hook's sub).
export const FrontSlab: React.FC<{
  children: React.ReactNode;
  p: number;
  bottom?: number;
  size?: number;
  dark?: boolean;
}> = ({ children, p, bottom = FRONT_BOTTOM, size = 36, dark }) => (
  <div
    style={{
      position: "absolute",
      bottom: 1920 - bottom,
      left: SAFE.left,
      width: LABEL_W,
      display: "flex",
      justifyContent: "center",
      opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
    }}
  >
    <div
      style={{
        ...SLAB,
        ...(dark
          ? {
              background: brand.background,
              color: WHITE,
              boxShadow: slabEdge(10, brand.primary),
            }
          : {}),
        padding: "12px 30px",
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.25,
        textAlign: "center",
        textWrap: "balance",
        maxWidth: LABEL_W - 20,
      }}
    >
      {children}
    </div>
  </div>
);

const bigSize = (s: string, max: number, width = 640) =>
  Math.min(
    max,
    fitText({ text: s, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

// ------------------------------------------------------------- hook

const CLUSTER = [-1.7, -0.5, 0.7].flatMap((x) =>
  [-1.7, -0.5, 0.7].map((y) => ({ x, y })),
);
const CLUSTER_PAL = [
  PAL.blue,
  PAL.white,
  PAL.navy,
  PAL.white,
  PAL.gold,
  PAL.blue,
  PAL.white,
  PAL.navy,
  PAL.white,
];

export const HookCity: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = camAt(frame);
  const sink = interpolate(frame, [86, HOOK_FRAMES], [1, 0], {
    ...clamp,
    easing: ease,
  });
  const shapes = CLUSTER.map((b, i) => {
    const k =
      spring({
        frame: frame - 2 - i * 2,
        fps,
        config: { damping: 11, stiffness: 150 },
      }) * sink;
    const h = (0.45 + random(`iso-hook-${i}`) * 0.8) * k;
    const pal = CLUSTER_PAL[i];
    const dim = pal === PAL.white ? SKY : mix(pal.left, brand.navy, 0.4);
    return {
      depth: b.x + b.y,
      marks: [
        ...box(c, b.x, b.y, 0, 1, 1, h, pal),
        ...windows(
          c,
          { ...b, w: 1, d: 1, h },
          "y",
          2,
          3,
          dim,
          (q) => (q + i) % 3 === 0,
        ),
      ],
    };
  });
  const t = interpolate(frame, [8, 42], [0, 1], { ...clamp, easing: ease });
  const big =
    hook.countTo === undefined
      ? hook.big
      : `${(hook.countTo * t).toLocaleString("vi-VN", {
          minimumFractionDigits: hook.decimals ?? 0,
          maximumFractionDigits: hook.decimals ?? 0,
        })}${hook.suffix ?? ""}`;
  const p = enter(frame, fps, 6);
  const bob = Math.sin(frame / 11) * 5;
  const out = fadeOut(frame, HOOK_FRAMES);
  return (
    <div
      style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: out }}
    >
      <IsoSvg shapes={shapes} />
      <div
        style={{
          position: "absolute",
          top: STAGE_TOP + bob,
          left: SAFE.left,
          width: LABEL_W,
          display: "flex",
          justifyContent: "center",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [90, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
        }}
      >
        <div
          style={{
            ...SLAB,
            padding: "14px 46px 20px",
            textAlign: "center",
            maxWidth: LABEL_W - 24,
          }}
        >
          <div
            style={{
              fontSize: bigSize(hook.big, 150, 700),
              fontWeight: 900,
              lineHeight: 1.12,
              color: brand.primary,
            }}
          >
            {big}
          </div>
          {hook.sub ? (
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1.25,
                textWrap: "balance",
                opacity: enter(frame, fps, 18),
              }}
            >
              {hook.sub}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------- figures

export const FigureBuild: React.FC<{ figure: Figure; from: number }> = ({
  figure,
  from,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g =
    interpolate(frame, [2, 30], [0, 1], { ...clamp, easing: ease }) *
    interpolate(frame, [figure.frames - 10, figure.frames], [1, 0], clamp);
  const t = interpolate(frame, [4, 32], [0, 1], { ...clamp, easing: ease });
  const p = Math.min(enter(frame, fps, 6), fadeOut(frame, figure.frames));
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      <IsoSvg
        shapes={[{ depth: 0, marks: figureMarks(from + frame, figure, g) }]}
      />
      <ValueSlab
        text={counted(figure.big, t)}
        size={bigSize(figure.big, 120)}
        p={p}
        color={t >= 1 ? brand.primary : brand.textOnCard}
      />
      {/* An auto figure's words are in the captions; a stat's label is copy. */}
      {figure.source === "stat" && figure.label ? (
        <FrontSlab
          p={Math.min(enter(frame, fps, 14), fadeOut(frame, figure.frames))}
        >
          {figure.label}
        </FrontSlab>
      ) : null}
    </div>
  );
};

// A figure said while the plaza is taken: a small chip, top-left.
export const FigureChip: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(enter(frame, fps), fadeOut(frame, figure.frames));
  const t = interpolate(frame, [4, 28], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{
        ...SLAB,
        boxShadow: slabEdge(8, SKY),
        position: "absolute",
        top: CHIP_TOP,
        left: SAFE.left,
        maxWidth: 330,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 22px 8px 14px",
        fontFamily: FONT,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
      }}
    >
      <svg width={34} height={34} viewBox="-17 -17 34 34">
        <ellipse cx={0} cy={4} rx={15} ry={8} fill={brand.accent} />
        <rect x={-15} y={-4} width={30} height={8} fill={brand.accent} />
        <ellipse cx={0} cy={-4} rx={15} ry={8} fill={brand.highlight} />
      </svg>
      <div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 900,
            lineHeight: 1.1,
            color: brand.primary,
          }}
        >
          {counted(figure.big, t)}
        </div>
        {figure.source === "stat" && figure.label ? (
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
            {figure.label}
          </div>
        ) : null}
      </div>
    </div>
  );
};
