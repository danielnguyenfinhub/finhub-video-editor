// A value over time for the `trend` cue: the existing LineGraph (draws itself,
// every point's value printed, y-axis spanning the data range), with the
// cue's kicker as a tag above it and values in Vietnamese format (4,35%).
// `zoom` lets a design fit the 920 px graph into its panel band; `height`
// shortens the plot instead. Values print at 40 px so a zoomed-out graph
// still reads (>= 32 px on screen down to zoom 0.8).
import type React from "react";
import { brand } from "../brand/theme";
import { FONT } from "../mortgage/style";
import { LineGraph, type GraphPoint } from "./LineGraph";

export const TrendCard: React.FC<{
  kicker?: string;
  title: string;
  unit?: string;
  decimals?: number;
  points: GraphPoint[];
  zoom?: number;
  height?: number;
}> = ({ kicker, title, unit, decimals, points, zoom = 1, height }) => (
  <div style={{ zoom, fontFamily: FONT }}>
    {kicker ? (
      <div
        style={{
          display: "inline-block",
          marginBottom: 12,
          padding: "8px 22px",
          borderRadius: 14,
          background: brand.background,
          color: brand.accent,
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 5,
          lineHeight: 1.3,
        }}
      >
        {kicker.normalize("NFC")}
      </div>
    ) : null}
    <LineGraph
      data={points.map((p) => ({ ...p, label: p.label.normalize("NFC") }))}
      title={title.normalize("NFC")}
      unit={unit?.normalize("NFC")}
      decimals={decimals}
      locale="vi-VN"
      height={height}
      valueSize={40}
    />
  </div>
);
