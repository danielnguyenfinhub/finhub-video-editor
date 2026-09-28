// "gauge" readouts: the digital readout under the hub (Scenes.tsx fills it)
// and the small chips beside the dial for a figure or a bank that lands while
// the dial is taken (figures right, banks left, with a mini gauge).
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
import { SAFE, type Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { FONT, clamp } from "../../mortgage/style";
import { C, CHIP_TOP, GOLD, READOUT, SKY, SWEEP, parseValue } from "./Dial";

const FADE = 8;
const ease = (x: number) => 1 - (1 - x) ** 3;

export type ReadoutData = {
  kicker?: string;
  text: string;
  widest: string;
  color: string;
  arrow?: "up" | "down";
  arrowColor?: string;
};
export type Chip = {
  from: number;
  to: number;
  figure?: Figure;
  lender?: Lender;
};

const Arrow: React.FC<{ dir: "up" | "down"; color: string; size: number }> = ({
  dir,
  color,
  size,
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ flex: "none" }}>
    <polygon
      points={dir === "down" ? "4,12 60,12 32,58" : "4,52 60,52 32,6"}
      fill={color}
    />
  </svg>
);

export const Readout: React.FC<{ r: ReadoutData; o: number }> = ({ r, o }) => {
  const room = READOUT.width - (r.arrow ? 90 : 44);
  const size = Math.min(
    r.kicker ? 58 : 70,
    fitText({
      text: r.widest,
      withinWidth: room,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: C.x - READOUT.width / 2,
        top: READOUT.top,
        width: READOUT.width,
        height: READOUT.height,
        boxSizing: "border-box",
        borderRadius: 16,
        background: `linear-gradient(180deg, ${brand.navy}, rgba(11,31,61,0.96))`,
        border: `2px solid rgba(255,255,255,0.18)`,
        boxShadow: `inset 0 4px 14px rgba(0,0,0,0.7), 0 0 30px rgba(0,100,168,0.35)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        opacity: o,
      }}
    >
      {r.kicker ? (
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 4,
            color: SKY,
            lineHeight: 1.1,
          }}
        >
          {r.kicker}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.15,
          color: r.color,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          textShadow: `0 0 18px ${r.color === GOLD ? "rgba(255,185,56,0.55)" : "rgba(0,100,168,0.8)"}`,
        }}
      >
        {r.text}
        {r.arrow ? (
          <Arrow
            dir={r.arrow}
            color={r.arrowColor ?? GOLD}
            size={size * 0.62}
          />
        ) : null}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- chips

// A figure or bank the dial could not take: a small readout beside the dial
// (figures right, banks left), with a mini gauge for a value on a scale.
const ChipView: React.FC<{ chip: Chip }> = ({ chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = chip.to - chip.from;
  const p = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const o = Math.min(p, interpolate(frame, [dur - FADE, dur], [1, 0], clamp));
  const base: React.CSSProperties = {
    position: "absolute",
    top: CHIP_TOP,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 18px 10px 12px",
    borderRadius: 16,
    background: `linear-gradient(180deg, ${brand.navy}, ${brand.background})`,
    border: `2px solid rgba(255,255,255,0.2)`,
    boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
    fontFamily: FONT,
    opacity: o,
    transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
  };
  if (chip.lender)
    return (
      <div
        style={{
          ...base,
          left: SAFE.left,
          transformOrigin: "left top",
          padding: 10,
        }}
      >
        <LenderLogo lender={chip.lender} height={40} />
      </div>
    );
  const big = chip.figure?.big ?? "";
  const val = parseValue(big);
  const fill = val ? Math.min(1, 1 / 1.35) : 0;
  const k = interpolate(frame, [2, 20], [0, 1], { ...clamp, easing: ease });
  const a = -SWEEP + 2 * SWEEP * fill * k;
  const mini = (deg: number) => [
    28 + 22 * Math.sin((deg * Math.PI) / 180),
    32 - 22 * Math.cos((deg * Math.PI) / 180),
  ];
  const [x1, y1] = mini(-SWEEP);
  const [x2, y2] = mini(SWEEP);
  const [nx, ny] = mini(a);
  return (
    <div
      style={{
        ...base,
        right: 1080 - SAFE.right,
        transformOrigin: "right top",
        maxWidth: 260,
      }}
    >
      <svg width={56} height={56} style={{ flex: "none" }}>
        <path
          d={`M ${x1} ${y1} A 22 22 0 1 1 ${x2} ${y2}`}
          fill="none"
          stroke={SKY}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <line
          x1={28}
          y1={32}
          x2={nx}
          y2={ny}
          stroke={GOLD}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={28} cy={32} r={5} fill="#ffffff" />
      </svg>
      <div
        style={{
          fontSize: big.length > 6 ? 34 : 42,
          fontWeight: 900,
          color: GOLD,
          whiteSpace: "nowrap",
        }}
      >
        {big}
      </div>
    </div>
  );
};

export const ChipLayer: React.FC<{ chips: Chip[] }> = ({ chips }) => (
  <>
    {chips.map((c) => (
      <Sequence
        key={`${c.from}${c.figure?.big ?? c.lender?.name}`}
        from={c.from}
        durationInFrames={Math.max(1, c.to - c.from)}
        layout="none"
      >
        <ChipView chip={c} />
      </Sequence>
    ))}
  </>
);
