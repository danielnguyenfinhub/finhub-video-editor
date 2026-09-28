// "scale" backdrop and the balance scale itself, drawn in SVG. A soft navy
// room with a marble floor line (gradients only), and on it a brass scale:
// a pillar with a pointer and its little arc of ticks, a beam that tips
// round the pivot, and two pans hanging on chains, each able to hold a stack
// of coins. Where things go is computed here (panAt) so the plaques drawn in
// HTML over the pans always agree with the SVG.
import type React from "react";
import { useEffect, useState } from "react";
import { AbsoluteFill, useDelayRender } from "remotion";
import { brand } from "../../brand/theme";
import { reelFontReady } from "../../mortgage/style";

// Brass from the brand golds, darkened with black for the shaded side.
export const GOLD = brand.highlight;
export const BRASS = brand.accent;
export const BRASS_DARK = `color-mix(in srgb, ${brand.accent} 52%, #000000)`;
export const BRASS_LIGHT = `color-mix(in srgb, ${brand.highlight} 55%, #ffffff)`;
export const SKY = `color-mix(in srgb, ${brand.primary} 40%, #ffffff)`;

// Geometry (1080 x 1920). CX is the middle of the safe band (54–960).
export const CX = 507;
export const PIVOT = { x: CX, y: 660 };
export const BEAM = 230; // pivot to each hook
export const CHAIN = 180; // hook to pan rim
export const PAN = 125; // half the pan's width
export const FLOOR = 1195;
const COIN = { rx: 60, ry: 12, step: 11, side: 9 };

const rad = (deg: number) => (deg * Math.PI) / 180;

// The pan rim's centre for a beam angle (deg, + = right side down) and the
// pan's own swing on its chains (deg).
export const panAt = (angle: number, side: 0 | 1, swing: number) => {
  const s = side === 0 ? -1 : 1;
  const ex = PIVOT.x + s * BEAM * Math.cos(rad(angle));
  const ey = PIVOT.y + s * BEAM * Math.sin(rad(angle));
  return {
    hook: { x: ex, y: ey },
    x: ex - CHAIN * Math.sin(rad(swing)),
    y: ey + CHAIN * Math.cos(rad(swing)),
  };
};

// fitText needs Be Vietnam Pro loaded: false until it is, frame held meanwhile.
export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("scale: Be Vietnam Pro"));
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

// Soft navy with a pool of blue light behind the scale, and the marble floor
// the pillar stands on; the floor's dark stone is the caption strip.
export const ScaleRoom: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 620px 560px at ${CX}px ${820 + Math.sin(t / 70) * 18}px, rgba(0,100,168,0.32), transparent 72%),
        linear-gradient(180deg, ${brand.navy} 0%, ${brand.background} 45%, ${brand.background} 62%, ${brand.navy} 100%)`,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: FLOOR,
        bottom: 0,
        background: `repeating-linear-gradient(112deg, rgba(255,255,255,0.028) 0 2px, transparent 2px 86px),
          repeating-linear-gradient(64deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 140px),
          linear-gradient(180deg, rgba(201,211,230,0.13) 0%, rgba(11,31,61,0.9) 16%, rgba(6,19,42,0.97) 100%)`,
        borderTop: "2px solid rgba(255,185,56,0.35)",
      }}
    />
    {/* The scale's soft shadow on the floor. */}
    <div
      style={{
        position: "absolute",
        left: CX - 300,
        width: 600,
        top: FLOOR - 16,
        height: 40,
        borderRadius: "50%",
        background:
          "radial-gradient(closest-side, rgba(0,0,0,0.55), transparent)",
      }}
    />
  </AbsoluteFill>
);

// ------------------------------------------------------------- the scale

export type PanDraw = {
  height: number; // coin stack, px (0 = empty pan)
  fall: number; // px above its resting place while it drops
  opacity: number;
  ghost?: { height: number; opacity: number; lift: number };
  dust?: number; // 0..1 progress of the landing puff
  swing: number; // deg
};

const Defs: React.FC = () => (
  <defs>
    <linearGradient id="scale-brass-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style={{ stopColor: BRASS_LIGHT }} />
      <stop offset="45%" style={{ stopColor: GOLD }} />
      <stop offset="100%" style={{ stopColor: BRASS_DARK }} />
    </linearGradient>
    <linearGradient id="scale-brass-h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" style={{ stopColor: BRASS_DARK }} />
      <stop offset="40%" style={{ stopColor: BRASS_LIGHT }} />
      <stop offset="65%" style={{ stopColor: GOLD }} />
      <stop offset="100%" style={{ stopColor: BRASS_DARK }} />
    </linearGradient>
    <radialGradient id="scale-dish" cx="0.5" cy="0" r="1">
      <stop offset="0%" style={{ stopColor: GOLD }} />
      <stop offset="100%" style={{ stopColor: BRASS_DARK }} />
    </radialGradient>
  </defs>
);

const Coins: React.FC<{ height: number; dashed?: boolean }> = ({
  height,
  dashed,
}) => {
  const n = Math.max(1, Math.round(height / COIN.step));
  const { rx, ry, side } = COIN;
  return (
    <g>
      {Array.from({ length: n }, (_, k) => {
        const y = -6 - k * COIN.step;
        const top = k === n - 1;
        return (
          <g key={k} transform={`translate(0 ${y})`}>
            <path
              d={`M ${-rx} 0 A ${rx} ${ry} 0 0 0 ${rx} 0 L ${rx} ${-side} A ${rx} ${ry} 0 0 1 ${-rx} ${-side} Z`}
              fill={dashed ? "none" : BRASS_DARK}
              stroke={dashed ? GOLD : "rgba(0,0,0,0.35)"}
              strokeWidth={dashed ? 2 : 1}
              strokeDasharray={dashed ? "6 6" : undefined}
            />
            <ellipse
              cx={0}
              cy={-side}
              rx={rx}
              ry={ry}
              fill={dashed ? "none" : top ? BRASS_LIGHT : GOLD}
              stroke={dashed ? GOLD : BRASS_DARK}
              strokeWidth={dashed ? 2 : 1.5}
              strokeDasharray={dashed ? "6 6" : undefined}
            />
          </g>
        );
      })}
    </g>
  );
};

const Dust: React.FC<{ p: number }> = ({ p }) => (
  <g opacity={Math.max(0, 1 - p)}>
    {[-1, -0.55, -0.2, 0.2, 0.55, 1].map((d, i) => (
      <circle
        key={d}
        cx={d * (PAN * 0.7 + p * 70)}
        cy={-8 - p * (20 + (i % 3) * 14)}
        r={5 + p * 10}
        fill="rgba(201,211,230,0.25)"
      />
    ))}
  </g>
);

// One pan on its chains, drawn at the hook and swung round it.
const Pan: React.FC<{ hook: { x: number; y: number }; pan: PanDraw }> = ({
  hook,
  pan,
}) => (
  <g transform={`translate(${hook.x} ${hook.y}) rotate(${pan.swing})`}>
    {[-PAN + 6, 0, PAN - 6].map((x) => (
      <line
        key={x}
        x1={0}
        y1={0}
        x2={x}
        y2={CHAIN - (x === 0 ? 14 : 0)}
        stroke={x === 0 ? BRASS_DARK : GOLD}
        strokeWidth={3}
        strokeDasharray="7 4"
        strokeLinecap="round"
      />
    ))}
    <circle r={9} fill="none" stroke={GOLD} strokeWidth={4} />
    <g transform={`translate(0 ${CHAIN})`}>
      <path
        d={`M ${-PAN} 0 Q 0 ${62} ${PAN} 0 Z`}
        fill="url(#scale-dish)"
        stroke={BRASS_DARK}
        strokeWidth={2}
      />
      {pan.ghost ? (
        <g
          opacity={pan.ghost.opacity}
          transform={`translate(0 ${-pan.ghost.lift})`}
        >
          <Coins height={pan.ghost.height} dashed />
        </g>
      ) : null}
      {pan.height > 0 ? (
        <g opacity={pan.opacity} transform={`translate(0 ${-pan.fall})`}>
          <Coins height={pan.height} />
        </g>
      ) : null}
      <ellipse
        cx={0}
        cy={0}
        rx={PAN}
        ry={15}
        fill="none"
        stroke={BRASS_LIGHT}
        strokeWidth={4}
      />
      {pan.dust !== undefined ? <Dust p={pan.dust} /> : null}
    </g>
  </g>
);

// Pointer arc on the pillar: ticks every 7°, the pointer tips with the beam.
const Pointer: React.FC<{ angle: number }> = ({ angle }) => (
  <g transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
    <path
      d={`M ${-92 * Math.sin(rad(35))} ${-92 * Math.cos(rad(35))} A 92 92 0 0 1 ${92 * Math.sin(rad(35))} ${-92 * Math.cos(rad(35))}`}
      fill="none"
      stroke="rgba(255,185,56,0.45)"
      strokeWidth={2}
    />
    {[-28, -21, -14, -7, 0, 7, 14, 21, 28].map((a) => (
      <line
        key={a}
        x1={0}
        y1={-86}
        x2={0}
        y2={a === 0 ? -104 : -97}
        stroke={a === 0 ? GOLD : "rgba(255,185,56,0.6)"}
        strokeWidth={a === 0 ? 4 : 2}
        transform={`rotate(${a})`}
      />
    ))}
    <path
      d="M -5 -4 L 0 -84 L 5 -4 Z"
      fill={BRASS_LIGHT}
      transform={`rotate(${angle})`}
    />
  </g>
);

export const ScaleRig: React.FC<{
  angle: number;
  pans: [PanDraw, PanDraw];
}> = ({ angle, pans }) => {
  const hooks = ([0, 1] as const).map((s) => panAt(angle, s, 0).hook);
  return (
    <svg
      width={1080}
      height={1920}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <Defs />
      {/* Pillar and plinth. */}
      <rect
        x={CX - 14}
        y={PIVOT.y}
        width={28}
        height={FLOOR - 52 - PIVOT.y}
        fill="url(#scale-brass-h)"
      />
      {[PIVOT.y + 120, PIVOT.y + 300].map((y) => (
        <rect
          key={y}
          x={CX - 22}
          y={y}
          width={44}
          height={14}
          rx={6}
          fill="url(#scale-brass-h)"
        />
      ))}
      <path
        d={`M ${CX - 46} ${FLOOR - 52} L ${CX + 46} ${FLOOR - 52} L ${CX + 96} ${FLOOR - 14} L ${CX - 96} ${FLOOR - 14} Z`}
        fill="url(#scale-brass-h)"
      />
      <rect
        x={CX - 120}
        y={FLOOR - 16}
        width={240}
        height={16}
        rx={5}
        fill={BRASS_DARK}
      />
      <Pointer angle={angle} />
      {/* Pans hang from the hooks, behind the beam. */}
      <Pan hook={hooks[0]} pan={pans[0]} />
      <Pan hook={hooks[1]} pan={pans[1]} />
      <g transform={`rotate(${angle} ${PIVOT.x} ${PIVOT.y})`}>
        <path
          d={`M ${CX - BEAM - 16} ${PIVOT.y - 5} Q ${CX} ${PIVOT.y - 16} ${CX + BEAM + 16} ${PIVOT.y - 5} L ${CX + BEAM + 16} ${PIVOT.y + 5} Q ${CX} ${PIVOT.y + 16} ${CX - BEAM - 16} ${PIVOT.y + 5} Z`}
          fill="url(#scale-brass-v)"
          stroke={BRASS_DARK}
          strokeWidth={1.5}
        />
        {[-1, 1].map((s) => (
          <circle
            key={s}
            cx={CX + s * (BEAM + 20)}
            cy={PIVOT.y}
            r={11}
            fill="url(#scale-brass-v)"
          />
        ))}
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={20} fill="url(#scale-brass-v)" />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={7} fill={BRASS_DARK} />
    </svg>
  );
};
