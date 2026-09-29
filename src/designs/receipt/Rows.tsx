// Receipt rows and marks: the header, rules, text lines, label ..... value
// rows (the total bold under a double rule), the pen strike, the gold stamp,
// the tick and the tear-off stub outline. Sizes are fitted by the caller.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { FONT, clamp } from "../../mortgage/style";
import { FADED, GOLD, HEADER, INK, TABULAR, fit } from "./Paper";

export type Sfx = { at: number; file: string; volume: number };

export const Snd: React.FC<{ s: Sfx }> = ({ s }) => (
  <Sequence from={Math.max(0, s.at)} durationInFrames={90} layout="none">
    <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={() => s.volume} />
  </Sequence>
);

// ------------------------------------------------------------- lines

export const HEAD_H = 58;

export const HeadLine: React.FC = () => (
  <div
    style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    }}
  >
    <div
      style={{
        fontWeight: 900,
        fontSize: 24,
        letterSpacing: "0.34em",
        color: INK,
      }}
    >
      {HEADER}
    </div>
    <Rule />
  </div>
);

export const Rule: React.FC<{ double?: boolean }> = ({ double }) => (
  <div
    style={{
      width: "100%",
      borderTop: double
        ? `6px double ${INK}`
        : `3px dashed rgba(91,107,128,0.55)`,
    }}
  />
);

// A title or free text line, centred, pre-fitted by the caller.
export const TextLine: React.FC<{
  text: string;
  size: number;
  weight?: number;
  color?: string;
}> = ({ text, size, weight = 900, color = INK }) => (
  <div
    style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.22,
      color,
    }}
  >
    {text}
  </div>
);

// label ...................... value
export const Leader: React.FC = () => (
  <div
    style={{
      flex: 1,
      minWidth: 20,
      margin: "0 10px 0.32em",
      borderBottom: `4px dotted rgba(91,107,128,0.6)`,
      alignSelf: "flex-end",
    }}
  />
);

// ------------------------------------------------------------- value rows

export type RowFit = {
  labelSize: number;
  valueSize: number;
  stacked: boolean;
  h: number;
};

// Inline (label ..... value on one line) on a wide receipt; stacked (label
// ..... on its own line, the value right-aligned under it) on a narrow one.
export const fitRow = (
  label: string,
  value: string,
  inner: number,
  max: number,
  total: boolean,
  stacked = false,
): RowFit => {
  const extra = total ? 40 : 22;
  if (stacked) {
    const l = fit(label, inner - 40, 1, 30, 900).size;
    const v = fit(value, inner - 16, 1, max, 900, true).size;
    return {
      labelSize: l,
      valueSize: v,
      stacked,
      h: l * 1.35 + v * 1.1 + extra,
    };
  }
  const l = fit(label, inner * 0.36, 1, 30, 900).size;
  const v = fit(value, inner * 0.56 - 16, 1, max, 900, true).size;
  return { labelSize: l, valueSize: v, stacked, h: v * 1.1 + extra };
};

const Value: React.FC<{
  value: string;
  size: number;
  total: boolean;
  tone?: "good" | "bad" | "neutral";
  highlightAt?: number;
  children?: React.ReactNode;
}> = ({ value, size, total, tone, highlightAt, children }) => {
  const frame = useCurrentFrame();
  const hl =
    highlightAt === undefined
      ? 0
      : interpolate(frame, [highlightAt, highlightAt + 8], [0, 1], clamp);
  const bar =
    tone === "bad" ? brand.bad : tone === "good" ? brand.good : undefined;
  return (
    <span
      style={{
        position: "relative",
        fontSize: size,
        fontWeight: total ? 900 : 800,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        padding: "0 6px",
        ...TABULAR,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: "0.08em",
          height: "0.55em",
          width: `${hl * 100}%`,
          background: "rgba(255,185,56,0.55)",
          borderRadius: 4,
        }}
      />
      <span style={{ position: "relative" }}>{value}</span>
      {bar ? (
        <span
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            bottom: -6,
            height: 6,
            borderRadius: 3,
            background: bar,
          }}
        />
      ) : null}
      {children}
    </span>
  );
};

export const ValueRow: React.FC<{
  label: string;
  value: string;
  f: RowFit;
  total: boolean;
  tone?: "good" | "bad" | "neutral";
  highlightAt?: number;
  children?: React.ReactNode;
}> = ({ label, value, f, total, tone, highlightAt, children }) => {
  const labelEl = (
    <span
      style={{
        fontSize: f.labelSize,
        fontWeight: 900,
        color: total ? INK : FADED,
        whiteSpace: "nowrap",
        paddingBottom: "0.2em",
      }}
    >
      {label}
    </span>
  );
  const valueEl = (
    <Value
      value={value}
      size={f.valueSize}
      total={total}
      tone={tone}
      highlightAt={highlightAt}
    >
      {children}
    </Value>
  );
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingBottom: 12,
      }}
    >
      {total ? <Rule double /> : null}
      {f.stacked ? (
        <>
          <div
            style={{ display: "flex", alignItems: "flex-end", marginTop: 8 }}
          >
            {labelEl}
            <Leader />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {valueEl}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 8 }}>
          {labelEl}
          <Leader />
          {valueEl}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------- marks

// A hand-drawn pen stroke across a value, wiped in from `at`.
export const Strike: React.FC<{ at: number; color: string }> = ({
  at,
  color,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 9], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 2,
  });
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: -10,
        top: "28%",
        height: "44%",
        width: `calc(${p} * (100% + 20px))`,
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <path
          d="M 1 13 C 20 8, 35 12, 52 9 S 85 6, 99 8"
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

export const Chevron: React.FC<{
  up: boolean;
  color: string;
  size: number;
}> = ({ up, color, size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    style={{ transform: up ? undefined : "rotate(180deg)" }}
  >
    <path d="M 20 6 L 36 32 L 4 32 Z" fill={color} />
  </svg>
);

// A gold rubber stamp that thumps down at `at` (scale 1.8 → 1, slight bounce).
export const Stamp: React.FC<{
  at: number;
  kicker: string;
  text: string;
  size?: number;
  rotate?: number;
}> = ({ at, kicker, text, size = 58, rotate = -11 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 9, stiffness: 260, mass: 0.7 },
  });
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 24px 6px",
        border: `6px solid ${GOLD}`,
        outline: `2px solid ${GOLD}`,
        outlineOffset: 4,
        borderRadius: 14,
        color: GOLD,
        background: "rgba(6,19,42,0.92)",
        fontFamily: FONT,
        transform: `rotate(${rotate}deg) scale(${interpolate(s, [0, 1], [1.8, 1])})`,
        opacity: interpolate(s, [0, 0.35], [0, 1], clamp),
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "0.3em" }}>
        {kicker}
      </span>
      <span
        style={{ fontWeight: 900, fontSize: size, lineHeight: 1.1, ...TABULAR }}
      >
        {text}
      </span>
    </div>
  );
};

// A hand tick in a gold circle, drawn in over 8 frames from `at`.
export const Tick: React.FC<{ at: number; size?: number }> = ({
  at,
  size = 46,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 8], [0, 1], clamp);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 46 46"
      style={{ flex: "none" }}
    >
      <circle
        cx={23}
        cy={23}
        r={20}
        fill={p > 0 ? GOLD : "none"}
        stroke={p > 0 ? GOLD : "rgba(91,107,128,0.4)"}
        strokeWidth={3}
      />
      <path
        d="M 13 24 L 20 31 L 34 15"
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

// Tear-off ticket outline: a rectangle with two semicircle bites at the
// perforation (x = `perf`), as a clip-path polygon.
export const stubClip = (w: number, h: number, perf: number, r = 14) => {
  const arc = (cy: number, down: boolean) => {
    const pts: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI - (i / 8) * Math.PI;
      pts.push(
        `${perf + r * Math.cos(a)}px ${cy + (down ? 1 : -1) * r * Math.sin(a)}px`,
      );
    }
    return pts;
  };
  return `polygon(0px 0px, ${arc(0, true).join(",")}, ${w}px 0px, ${w}px ${h}px, ${arc(h, false).reverse().join(",")}, 0px ${h}px)`;
};
