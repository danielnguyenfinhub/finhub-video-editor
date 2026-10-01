// Figures and named banks on a MINI PAN: when the stage is free a small pan
// swings down on a chain into the middle (the big scale dims behind it) and
// a brass weight carrying the number drops into it, or the bank's logo tile
// does; a stat's label sits under the pan. A figure or bank that lands while
// the stage is taken rides as a chip, top-left: a tiny pan icon and the
// number (or logo) on a dark plaque.
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
import { SAFE, asSaid } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT, clamp, pop } from "../../mortgage/style";
import { FALL, type Hero } from "./Plan";
import { BRASS_DARK, BRASS_LIGHT, CX, GOLD, SKY } from "./Scale";
import { PLAQUE } from "./Stage";

export const LENDER_LABEL = "ĐANG NHẮC TỚI";
const FADE = 8;
const HOOK_Y = 515; // where the chain meets the pan's three chains
const MINI_CHAIN = 200;
const MINI_PAN = 150; // half width
const RIM_Y = HOOK_Y + MINI_CHAIN;
export const CHIP_TOP = 502;

// "4,35%" counts 0 → 4,35 with the same decimals; a year or a date is shown
// as said, never counted.
export const counted = (big: string, p: number): string => {
  if (asSaid(big)) return big; // a year or a date: as said (golden rule 1)
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  if (/^(19|20)\d\d$/.test(m[0]) || /\d\/\d/.test(big)) return big;
  const grouped = /^\d{1,3}(\.\d{3})+/.test(m[0]);
  const num = grouped
    ? m[0].replace(/\./g, "").replace(",", ".")
    : m[0].replace(",", ".");
  const target = parseFloat(num);
  if (!Number.isFinite(target)) return big;
  const decimals = num.includes(".") ? num.split(".")[1].length : 0;
  const now = (target * p).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

const weightSize = (big: string) =>
  Math.min(
    78,
    fitText({ text: big, withinWidth: 380, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

// The mini pan: chain from above the safe band, hook, three chains, dish.
const MiniRig: React.FC<{ swing: number; drop: number }> = ({
  swing,
  drop,
}) => (
  <svg
    width={1080}
    height={1920}
    style={{ position: "absolute", left: 0, top: 0 }}
  >
    <g transform={`translate(0 ${drop})`}>
      <line
        x1={CX}
        y1={0}
        x2={CX}
        y2={HOOK_Y}
        stroke={GOLD}
        strokeWidth={4}
        strokeDasharray="9 5"
      />
      <g transform={`rotate(${swing} ${CX} ${HOOK_Y})`}>
        <circle
          cx={CX}
          cy={HOOK_Y}
          r={10}
          fill="none"
          stroke={GOLD}
          strokeWidth={4}
        />
        {[-MINI_PAN + 6, MINI_PAN - 6].map((dx) => (
          <line
            key={dx}
            x1={CX}
            y1={HOOK_Y}
            x2={CX + dx}
            y2={RIM_Y}
            stroke={GOLD}
            strokeWidth={3}
            strokeDasharray="7 4"
          />
        ))}
        <path
          d={`M ${CX - MINI_PAN} ${RIM_Y} Q ${CX} ${RIM_Y + 70} ${CX + MINI_PAN} ${RIM_Y} Z`}
          fill={BRASS_DARK}
          stroke={GOLD}
          strokeWidth={2}
        />
        <ellipse
          cx={CX}
          cy={RIM_Y}
          rx={MINI_PAN}
          ry={16}
          fill="none"
          stroke={BRASS_LIGHT}
          strokeWidth={4}
        />
      </g>
    </g>
  </svg>
);

const MiniPanScene: React.FC<{ hero: Hero }> = ({ hero }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = hero.to - hero.from;
  const inP = spring({ frame, fps, config: { damping: 11, stiffness: 90 } });
  const drop = interpolate(inP, [0, 1], [-520, 0]);
  const landAt = 10 + FALL;
  const k = (frame - 10) / FALL;
  const fall = frame < 10 ? 400 : k < 1 ? 400 * (1 - k * k) : 0;
  const dt = frame - landAt;
  const swing =
    (dt >= 0 ? 3.5 * Math.exp(-dt / 16) * Math.sin(dt / 3.4) : 0) +
    0.8 * Math.sin(frame / 25);
  const out = interpolate(frame, [dur - FADE, dur], [1, 0], clamp);
  const count = interpolate(frame, [landAt, landAt + 24], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const label =
    hero.kind === "figure" && hero.figure.source === "stat"
      ? hero.figure.label
      : hero.kind === "lender"
        ? LENDER_LABEL
        : "";
  const labelIn = interpolate(frame, [landAt, landAt + 10], [0, 1], clamp);
  return (
    <div
      style={{ position: "absolute", inset: 0, opacity: out, fontFamily: FONT }}
    >
      <MiniRig swing={swing} drop={drop} />
      <div
        style={{
          position: "absolute",
          left: CX,
          top: RIM_Y + drop - 4,
          transform: `translate(-50%, -100%) translateY(${-fall}px) rotate(${swing * 0.6}deg)`,
          transformOrigin: "bottom center",
          opacity: frame >= 10 ? 1 : 0,
        }}
      >
        {hero.kind === "figure" ? (
          <Weight
            big={hero.figure.big}
            text={counted(hero.figure.big, count)}
          />
        ) : (
          <LenderLogo
            lender={hero.lender}
            height={92}
            style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}
          />
        )}
      </div>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left + 40,
            right: 1080 - SAFE.right + 40,
            top: RIM_Y + 70,
            textAlign: "center",
            fontSize: hero.kind === "lender" ? 30 : 42,
            fontWeight: 800,
            letterSpacing: hero.kind === "lender" ? 5 : 0,
            lineHeight: 1.25,
            color: hero.kind === "lender" ? SKY : "#ffffff",
            textWrap: "balance",
            opacity: labelIn,
            transform: `translateY(${interpolate(labelIn, [0, 1], [16, 0])}px)`,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

// A brass weight: trapezoid body with a knob, the number engraved in navy.
const Weight: React.FC<{ big: string; text: string }> = ({ big, text }) => {
  const size = weightSize(big);
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div
        style={{
          width: 54,
          height: 26,
          borderRadius: "27px 27px 6px 6px",
          background: `linear-gradient(180deg, ${BRASS_LIGHT}, ${GOLD})`,
          border: `2px solid ${BRASS_DARK}`,
          marginBottom: -2,
        }}
      />
      <div
        style={{
          padding: "14px 44px 12px",
          clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0 100%)",
          borderRadius: 10,
          background: `linear-gradient(180deg, ${BRASS_LIGHT} 0%, ${GOLD} 45%, ${BRASS_DARK} 100%)`,
          color: brand.navy,
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
          minWidth: 160,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- chips

const Chip: React.FC<{ hero: Hero }> = ({ hero }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = hero.to - hero.from;
  const p = pop(frame, fps, 0);
  const out = interpolate(frame, [dur - FADE, dur], [1, 0], clamp);
  const sway = 4 * Math.exp(-frame / 18) * Math.sin(frame / 3.5);
  return (
    <div
      style={{
        ...PLAQUE,
        position: "absolute",
        left: SAFE.left + 6,
        top: CHIP_TOP,
        maxWidth: 236,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px 8px 12px",
        borderRadius: 16,
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [-24, 0])}px) rotate(${sway}deg)`,
        transformOrigin: "top left",
      }}
    >
      <svg width={40} height={40} style={{ flex: "0 0 40px" }}>
        {/* A tiny balance: post, beam, two pans. */}
        <rect x={18.5} y={6} width={3} height={30} fill={GOLD} />
        <rect x={12} y={34} width={16} height={4} rx={2} fill={GOLD} />
        <rect x={4} y={8} width={32} height={3} rx={1.5} fill={GOLD} />
        <path d="M 0 22 Q 7 30 14 22 Z" fill={GOLD} />
        <path d="M 26 22 Q 33 30 40 22 Z" fill={GOLD} />
        <path
          d="M 7 10 L 1 22 M 7 10 L 13 22 M 33 10 L 27 22 M 33 10 L 39 22"
          stroke={GOLD}
          strokeWidth={1.2}
        />
      </svg>
      {hero.kind === "figure" ? (
        <span
          style={{
            color: GOLD,
            fontSize: 38,
            fontWeight: 900,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {hero.figure.big}
        </span>
      ) : (
        <LenderLogo lender={hero.lender} height={40} />
      )}
    </div>
  );
};

export const HeroLayer: React.FC<{ heroes: Hero[]; chips: Hero[] }> = ({
  heroes,
  chips,
}) => (
  <>
    {heroes.map((h) => (
      <Sequence
        key={`h${h.from}`}
        from={h.from}
        durationInFrames={Math.max(1, h.to - h.from)}
        layout="none"
      >
        <MiniPanScene hero={h} />
      </Sequence>
    ))}
    {chips.map((h) => (
      <Sequence
        key={`c${h.from}`}
        from={h.from}
        durationInFrames={Math.max(1, h.to - h.from)}
        layout="none"
      >
        <Chip hero={h} />
      </Sequence>
    ))}
  </>
);
