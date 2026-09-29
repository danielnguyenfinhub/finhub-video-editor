// Cue kinds "bigdigit" draws itself on the stage, and the stage frame they
// share. Here: `change` (the star: the old value hollow and huge, each digit
// rolls odometer-style into the new value and lands solid, a thick arrow
// draws in the data's direction, the old value shrinks to a "trước: …"
// caption). Tables.tsx: `trend`, `points`, `compare`. Every other kind goes
// to the classic MotionTrack.
import { measureText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { SAFE } from "../../mortgage/golden";
import type { Cue } from "../../mortgage/schema";
import { FONT, clamp, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  ACCENT,
  Caps,
  Glyph,
  HAIR,
  INK,
  LABEL_W,
  LINE,
  Rule,
  SLATE,
  STAGE,
  W,
  charW,
  ease,
  fadeOut,
  giantSize,
} from "./Paper";

export const BEFORE = "trước";
export type OwnCue = Extract<
  Cue,
  { kind: "change" | "trend" | "points" | "compare" }
>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "change" ||
  c.kind === "trend" ||
  c.kind === "points" ||
  c.kind === "compare";

export const H = STAGE.bottom - STAGE.top;
export const NUM_TOP = 64; // below the kicker row, stage coordinates
// Where a digit's ink sits in its 1-em box (Be Vietnam Pro Black).
const CAP_TOP = 0.08;
const CAP_H = 0.71;

export const StageFrame: React.FC<{
  dur: number;
  children: React.ReactNode;
}> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: STAGE.top,
        width: W,
        height: H,
        fontFamily: FONT,
        color: INK,
        opacity: Math.min(inP, fadeOut(frame, dur)),
      }}
    >
      {children}
    </div>
  );
};

// Kicker row: a short accent bar and small caps.
export const Kicker: React.FC<{ text: string; at?: number }> = ({
  text,
  at = 0,
}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame - at, [0, 12], [0, 1], {
    ...clamp,
    easing: ease,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 44 * k, height: 8, background: ACCENT }} />
      <Caps color={ACCENT} style={{ opacity: k }}>
        {text}
      </Caps>
    </div>
  );
};

// Bottom-left source/label: a hairline, then small caps (up to two lines).
export const Label: React.FC<{ text: string; at?: number }> = ({
  text,
  at = 14,
}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame - at, [0, 10], [0, 1], {
    ...clamp,
    easing: ease,
  });
  return (
    <div style={{ position: "absolute", left: 0, bottom: 0, width: LABEL_W }}>
      <div style={{ position: "relative", height: 2 }}>
        <Rule
          top={0}
          at={at - 4}
          weight={2}
          color={HAIR}
          left={0}
          width={LABEL_W}
        />
      </div>
      <Caps
        size={30}
        color={INK}
        style={{
          marginTop: 12,
          opacity: k,
          transform: `translateY(${(1 - k) * 14}px)`,
        }}
      >
        {text}
      </Caps>
    </div>
  );
};

// ------------------------------------------------------------- change

type Col = { from: string; to: string };

// "3,6%" / "4,35%" -> columns aligned on the decimal comma: the integer part
// right-aligned, the decimals and the unit left-aligned.
const parts = (s: string) => {
  const m = s.match(/^(\D*?)([\d.]*)(,?)(\d*)(.*)$/) ?? ["", "", s, "", "", ""];
  return { pre: m[1], int: m[2], sep: m[3], frac: m[4], suf: m[5] };
};
const padL = (a: string[], n: number) => [
  ...Array<string>(n - a.length).fill(""),
  ...a,
];
const padR = (a: string[], n: number) => [
  ...a,
  ...Array<string>(n - a.length).fill(""),
];
const zip = (a: string, b: string, right: boolean): Col[] => {
  const x = Array.from(a);
  const y = Array.from(b);
  const n = Math.max(x.length, y.length);
  const [p, q] = right ? [padL(x, n), padL(y, n)] : [padR(x, n), padR(y, n)];
  return p.map((from, i) => ({ from, to: q[i] }));
};
export const columnsOf = (from: string, to: string): Col[] => {
  const a = parts(from);
  const b = parts(to);
  return [
    ...zip(a.pre, b.pre, true),
    ...zip(a.int, b.int, true),
    ...zip(a.sep, b.sep, false),
    ...zip(a.frac, b.frac, false),
    ...zip(a.suf, b.suf, false),
  ];
};

// The characters a column passes through: digits count round the dial in the
// data's direction (an odometer), anything else swaps directly.
const stripOf = (c: Col, up: boolean): string[] => {
  if (c.from === c.to) return [c.to];
  if (/^\d$/.test(c.from) && /^\d$/.test(c.to)) {
    const out = [c.from];
    let d = Number(c.from);
    while (d !== Number(c.to)) {
      d = (d + (up ? 1 : 9)) % 10;
      out.push(String(d));
    }
    return out;
  }
  return [c.from, c.to];
};

const Roll: React.FC<{
  col: Col;
  size: number;
  start: number;
  up: boolean;
}> = ({ col, size, start, up }) => {
  const frame = useCurrentFrame();
  const strip = stripOf(col, up);
  const steps = strip.length - 1;
  const len = Math.min(26, 12 + steps * 2);
  const k = interpolate(frame - start, [0, len], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const fill = interpolate(frame - start, [len * 0.6, len + 4], [0, 1], clamp);
  const width = interpolate(
    k,
    [0, 1],
    [charW(col.from, size), charW(col.to, size)],
  );
  // Up: the new character comes from below; down: from above.
  const items = up ? strip : [...strip].reverse();
  const step = size * LINE;
  const y = up ? -k * steps * step : -(1 - k) * steps * step;
  return (
    <div style={{ width, height: step, overflow: "hidden", flex: "0 0 auto" }}>
      <div style={{ transform: `translateY(${y}px)` }}>
        {items.map((ch, i) => (
          <div key={`${ch}${i}`} style={{ height: step }}>
            <Glyph
              ch={ch}
              size={size}
              fill={ch === col.to && (up ? i === steps : i === 0) ? fill : 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// A thick bar with a head, drawn upward or downward beside the number.
const Arrow: React.FC<{
  up: boolean;
  h: number;
  at: number;
  color: string;
}> = ({ up, h, at, color }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame - at, [0, 16], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const w = 26;
  const head = 44;
  const shaft = (h - head) * k;
  return (
    <svg width={110} height={h} style={{ flex: "0 0 110px" }}>
      <g transform={up ? undefined : `rotate(180 55 ${h / 2})`}>
        <rect
          x={55 - w / 2}
          y={h - shaft}
          width={w}
          height={shaft}
          fill={color}
        />
        <polygon
          points={`${55 - head},${h - shaft + 2} 55,${h - shaft - head} ${55 + head},${h - shaft + 2}`}
          fill={color}
          opacity={k > 0.05 ? 1 : 0}
        />
      </g>
    </svg>
  );
};

export const ChangeStage: React.FC<{
  cue: CueOf<"change">;
  rel: Rel;
  dur: number;
}> = ({ cue, rel, dur }) => {
  const frame = useCurrentFrame();
  const swap = rel(cue.swapAtMs);
  const up = cue.direction !== "down";
  const cols = columnsOf(cue.from, cue.to);
  const room = W - (cue.direction ? 130 : 0);
  const size = giantSize([cue.from, cue.to], room, 260);
  const after = frame >= swap;
  const colour = toneColor(cue.tone ?? "neutral", ACCENT);
  // The old value shrinks from the giant line into the "trước" caption.
  const g = interpolate(frame - swap, [4, 22], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const capSize = 46;
  const capTop = NUM_TOP + size * LINE + 10;
  const prefixW =
    measureText({
      text: `${BEFORE.toUpperCase()}: `,
      fontFamily: FONT,
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: "4.8px",
    }).width + 8;
  const push = interpolate(frame, [0, dur], [1, 1.035]);
  return (
    <StageFrame dur={dur}>
      <Kicker text={cue.kicker ?? cue.label} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: NUM_TOP,
          display: "flex",
          height: size * LINE,
          transform: `scale(${push})`,
          transformOrigin: "0% 100%",
        }}
      >
        {cols.map((c, i) => (
          <Roll key={i} col={c} size={size} start={swap + i * 3} up={up} />
        ))}
      </div>
      {cue.direction ? (
        <div
          style={{
            position: "absolute",
            left: W - 110,
            top: NUM_TOP + size * CAP_TOP,
          }}
        >
          <Arrow up={up} h={size * CAP_H} at={swap + 6} color={colour} />
        </div>
      ) : null}
      {after ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: capTop,
            display: "flex",
            alignItems: "center",
            opacity: interpolate(g, [0.7, 1], [0, 1], clamp),
          }}
        >
          <Caps size={30}>{`${BEFORE}: `}</Caps>
          <div style={{ marginLeft: 8 }}>
            <Glyph ch={cue.from} size={capSize} fill={1} color={SLATE} />
          </div>
        </div>
      ) : null}
      {after && g < 1 ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(g, [0, 1], [0, prefixW]),
            top: interpolate(g, [0, 1], [NUM_TOP, capTop - 2]),
            opacity: interpolate(g, [0, 0.2, 0.85, 1], [0, 0.5, 0.5, 0]),
            transform: `scale(${interpolate(g, [0, 1], [1, capSize / size])})`,
            transformOrigin: "0 0",
          }}
        >
          <Glyph ch={cue.from} size={size} fill={0} color={SLATE} />
        </div>
      ) : null}
      <Label text={cue.label} at={4} />
    </StageFrame>
  );
};
