// Vendored from remocn (MIT, .claude/elements/remocn/components/remocn/strikethrough-replace.tsx):
// a line strikes through the old value, which fades out as the new one rises
// in. FinHub changes: inline (no full-screen white stage), keyed to frame `at`
// instead of the sequence length (the line draws over `strikeFrames` before
// `at`, the swap runs `fadeFrames` from `at`), Be Vietnam Pro, brand colours,
// NFC-normalised input.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../brand/theme";
import { FONT } from "../../mortgage/style";

const clampOpts = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export interface StrikethroughReplaceProps {
  from: string;
  to: string;
  at: number;
  strikeFrames?: number;
  fadeFrames?: number;
  lineColor?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}

export function StrikethroughReplace({
  from,
  to,
  at,
  strikeFrames = 12,
  fadeFrames = 8,
  lineColor = brand.bad,
  fontSize = 48,
  color = brand.text,
  fontWeight = 600,
  style,
}: StrikethroughReplaceProps) {
  const frame = useCurrentFrame();
  const a = from.normalize("NFC");
  const b = to.normalize("NFC");
  const linePct = interpolate(frame, [at - strikeFrames, at], [0, 100], clampOpts);
  const p = interpolate(frame, [at, at + fadeFrames], [0, 1], clampOpts);

  const textStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    fontSize,
    fontWeight,
    color,
    fontFamily: FONT,
    whiteSpace: "nowrap",
  };

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontSize,
        fontWeight,
        fontFamily: FONT,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ visibility: "hidden" }}>{a.length > b.length ? a : b}</span>
      {/* from text with strikethrough line */}
      <span style={{ ...textStyle, opacity: 1 - p }}>
        {a}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            height: Math.max(2, Math.round(fontSize * 0.08)),
            width: `${linePct}%`,
            background: lineColor,
            translate: "0 -50%",
            borderRadius: 2,
          }}
        />
      </span>
      {/* to text */}
      <span style={{ ...textStyle, opacity: p, translate: `0 ${(1 - p) * 8}px` }}>
        {b}
      </span>
    </span>
  );
}
