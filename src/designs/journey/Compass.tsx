// "journey" compass rose: the old map's ornament on the cover and the hook.
import type React from "react";
import { INK, GOLD, WATER_LIGHT } from "./Map";

// A compass rose: gold north point, needle swinging and settling.
export const Compass: React.FC<{
  x: number;
  y: number;
  r: number;
  t: number;
}> = ({ x, y, r, t }) => {
  const swing =
    28 * Math.exp(-t / 22) * Math.sin(t / 3.2) + 3 * Math.sin(t / 40);
  const star = (
    len: number,
    w: number,
    rot: number,
    fill: string,
    key: string,
  ) => (
    <path
      key={key}
      d={`M 0 ${-len} L ${w} 0 L 0 ${len} L ${-w} 0 Z`}
      fill={fill}
      stroke={INK}
      strokeWidth={2}
      strokeLinejoin="round"
      transform={`rotate(${rot})`}
    />
  );
  return (
    <svg
      width={2 * r + 20}
      height={2 * r + 20}
      style={{
        position: "absolute",
        left: x - r - 10,
        top: y - r - 10,
        overflow: "visible",
      }}
    >
      <g transform={`translate(${r + 10} ${r + 10})`}>
        <circle r={r} fill="#ffffff" stroke={INK} strokeWidth={4} />
        <circle
          r={r - 10}
          fill="none"
          stroke={INK}
          strokeWidth={1.5}
          strokeDasharray="2 6"
        />
        {[45, 135].map((a) =>
          star(r * 0.55, r * 0.12, a, WATER_LIGHT, `d${a}`),
        )}
        <g transform={`rotate(${swing})`}>
          {star(r * 0.86, r * 0.17, 90, "#ffffff", "ew")}
          <path
            d={`M 0 ${-r * 0.86} L ${r * 0.17} 0 L ${-r * 0.17} 0 Z`}
            fill={GOLD}
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path
            d={`M 0 ${r * 0.86} L ${r * 0.17} 0 L ${-r * 0.17} 0 Z`}
            fill={INK}
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </g>
        <circle r={r * 0.08} fill={GOLD} stroke={INK} strokeWidth={2} />
      </g>
    </svg>
  );
};
