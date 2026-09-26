// Vendored from remocn (MIT, .claude/elements/remocn/components/remocn/value-swap.tsx):
// a value that slides out as the next slides in, at given frames. Values are
// strings, so "5,89%" renders exactly as written. FinHub: Be Vietnam Pro,
// brand text colour, NFC-normalised input.
import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../brand/theme";
import { FONT } from "../../mortgage/style";

const clampOpts = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export interface ValueSwapProps {
  values: string[];
  at: number | number[];
  duration?: number;
  distance?: number;
  direction?: "up" | "down";
  style?: React.CSSProperties;
}

export function ValueSwap({
  values,
  at,
  duration = 10,
  distance = 12,
  direction = "up",
  style,
}: ValueSwapProps) {
  const frame = useCurrentFrame();
  const ats = Array.isArray(at) ? at : [at];
  const d = direction === "down" ? -distance : distance;
  const count = Math.min(values.length, ats.length + 1);
  const rendered = values.slice(0, count).map((v) => v.normalize("NFC"));
  const sizer = rendered.reduce((a, b) => (b.length > a.length ? b : a), "");
  const swapP = (start: number) =>
    interpolate(frame, [start, start + duration], [0, 1], {
      ...clampOpts,
      easing: Easing.inOut(Easing.cubic),
    });
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: FONT,
        color: brand.text,
        ...style,
      }}
    >
      <span style={{ visibility: "hidden" }}>{sizer}</span>
      {rendered.map((value, i) => {
        const pIn = i > 0 ? swapP(ats[i - 1]) : 1;
        const pOut = i < count - 1 ? swapP(ats[i]) : 0;
        const opacity = pIn * (1 - pOut);
        if (opacity <= 0.001) return null;
        const y = (1 - pIn) * d + pOut * -d;
        return (
          <span
            key={`${i}-${value}`}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              whiteSpace: "nowrap",
              opacity,
              translate: `0 ${y}px`,
            }}
          >
            {value}
          </span>
        );
      })}
    </span>
  );
}
