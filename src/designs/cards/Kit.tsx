// "cards" building blocks: the white info card, its small all-caps label with
// a tiny navy icon, the dot grid, and the arrows Be Vietnam Pro lacks
// (▲ ▼ → ✓ are drawn as SVG).
import type React from "react";
import { interpolate } from "remotion";
import { FONT, clamp } from "../../mortgage/style";
import { BORDER, GOLD, INK, MUTED, NAVY, SHADOW } from "./tokens";

export const Panel: React.FC<{
  style?: React.CSSProperties;
  children?: React.ReactNode;
  glow?: number; // 0..1 gold border (the highlighted card)
}> = ({ style, children, glow = 0 }) => (
  <div
    style={{
      position: "absolute",
      background: "#ffffff",
      borderRadius: 28,
      border: `2px solid ${BORDER}`,
      boxShadow: glow > 0 ? `${SHADOW}, 0 0 0 ${4 * glow}px ${GOLD}` : SHADOW,
      fontFamily: FONT,
      color: INK,
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

export type IconName = "spark" | "list" | "bank" | "chart" | "swap" | "flag";

// 24-unit line icons in navy.
export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
}> = ({ name, size = 26, color = NAVY }) => {
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flex: "none" }}
    >
      {name === "spark" ? (
        <path
          d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3.5 3.5M15.5 15.5L19 19M5 19l3.5-3.5M15.5 8.5L19 5"
          {...p}
        />
      ) : name === "list" ? (
        <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" {...p} />
      ) : name === "bank" ? (
        <path
          d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"
          {...p}
        />
      ) : name === "chart" ? (
        <path d="M3 3v18h18M7 15l4-4 3 3 6-7" {...p} />
      ) : name === "swap" ? (
        <path d="M4 8h14l-4-4M20 16H6l4 4" {...p} />
      ) : (
        <path d="M5 21V4M5 4h11l-2 4 2 4H5" {...p} />
      )}
    </svg>
  );
};

// Small all-caps, letter-spaced label with its icon.
export const Label: React.FC<{
  icon: IconName;
  text: string;
  color?: string;
  iconColor?: string;
  size?: number;
}> = ({ icon, text, color = MUTED, iconColor = NAVY, size = 22 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 800,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    <Icon name={icon} size={size + 4} color={iconColor} />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
  </div>
);

// A grid of dots that fills in navy, left to right, top to bottom, as t goes
// 0 → 1; the last lit dot is gold.
export const DotGrid: React.FC<{
  cols: number;
  rows: number;
  t: number;
  size?: number;
  gap?: number;
}> = ({ cols, rows, t, size = 12, gap = 10 }) => {
  const n = cols * rows;
  const lit = Math.round(n * Math.min(1, Math.max(0, t)));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gap,
      }}
    >
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            background: i < lit ? (i === lit - 1 ? GOLD : NAVY) : BORDER,
          }}
        />
      ))}
    </div>
  );
};

// Up / down triangle and a right arrow, as SVG.
export const Arrow: React.FC<{
  dir: "up" | "down" | "right";
  size?: number;
  color?: string;
}> = ({ dir, size = 40, color = NAVY }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none" }}>
    {dir === "right" ? (
      <path
        d="M3 12h16M13 6l6 6-6 6"
        fill="none"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d={dir === "up" ? "M12 4l9 15H3z" : "M12 20L3 5h18z"}
        fill={color}
      />
    )}
  </svg>
);

// 0..1 build-in over `len` frames starting at `at` (local frames).
export const grow = (frame: number, at: number, len = 14) =>
  interpolate(frame, [at, at + len], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });

// Rise-and-fade entrance style for a build-in value.
export const rise = (p: number, px = 26): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * px}px)`,
});
