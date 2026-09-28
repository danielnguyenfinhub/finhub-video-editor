// Small shared pieces: SVG icons (the font has no ✓ ▲ ▼ glyphs), the tile
// shells (full and compact) and the value formatter.
import type React from "react";
import { FONT } from "../../../mortgage/style";
import { FOCUS, P, SLOT_W, STRIP } from "./layout";

export const Check: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      fill="none"
      stroke={color}
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Cross: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke={color}
      strokeWidth={3.2}
      strokeLinecap="round"
    />
  </svg>
);

// ▲ / ▼, only ever from the data's own direction.
export const Tri: React.FC<{ up: boolean; size: number; color: string }> = ({
  up,
  size,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d={up ? "M12 3L22 20H2Z" : "M2 4H22L12 21Z"} fill={color} />
  </svg>
);

export const Arrow: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M3 12h16M13 5l7 7-7 7"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// flexShrink 0: in the tiles' flex columns an overflow-hidden line would
// otherwise shrink to nothing when the content is tall.
const oneLine: React.CSSProperties = {
  flexShrink: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
export const clampLines = (n: number): React.CSSProperties => ({
  flexShrink: 0,
  display: "-webkit-box",
  WebkitLineClamp: n,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

// The focused tile, laid out at the stage size: widget type · chapter tag.
export const Shell: React.FC<{
  type: string;
  tag?: string;
  children: React.ReactNode;
}> = ({ type, tag, children }) => (
  <div
    style={{
      width: FOCUS.w,
      height: FOCUS.h,
      padding: "28px 44px 30px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT,
      color: P.text,
    }}
  >
    <div style={{ fontSize: 22, ...oneLine }}>
      <span style={{ color: P.gold, fontWeight: 800, letterSpacing: 3 }}>
        {type}
      </span>
      {tag ? (
        <span style={{ color: P.dim, fontWeight: 600 }}> · {tag}</span>
      ) : null}
    </div>
    <div
      style={{
        flex: 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        marginTop: 14,
      }}
    >
      {children}
    </div>
  </div>
);

// A past tile in the strip: type label and one summary line.
export const Mini: React.FC<{ type: string; children: React.ReactNode }> = ({
  type,
  children,
}) => (
  <div
    style={{
      width: SLOT_W,
      height: STRIP.h,
      padding: "16px 20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT,
      color: P.text,
    }}
  >
    <div
      style={{
        fontSize: 15,
        fontWeight: 800,
        letterSpacing: 2,
        color: P.gold,
        ...oneLine,
      }}
    >
      {type}
    </div>
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 0,
      }}
    >
      {children}
    </div>
  </div>
);

export const line1 = oneLine;

// 4.35 -> "4,35" (Vietnamese decimal comma), as the numbers are said.
export const viNum = (v: number, decimals: number) =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
