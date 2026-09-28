// Shared pieces of the flash's own cue cards: sizes and the header row.
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { FONT } from "../../mortgage/style";
import { STAGE_H, Tag, W } from "./Frame";

export const CW = W - 60;
export const CH = STAGE_H - 14 - 44;

export const fit1 = (text: string, width: number, max: number) =>
  Math.min(
    max,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

export const fitN = (text: string, width: number, max: number, lines = 2) =>
  fitTextOnNLines({
    text,
    maxLines: lines,
    maxBoxWidth: width,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: max,
  }).fontSize;

export const Header: React.FC<{ kicker?: string; title: string }> = ({
  kicker,
  title,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, height: 58 }}>
    {kicker ? <Tag text={kicker} /> : null}
    <span
      style={{
        color: "#fff",
        fontWeight: 900,
        fontSize: fit1(title, CW - (kicker ? 220 : 0), 42),
        lineHeight: 1.3,
        whiteSpace: "nowrap",
      }}
    >
      {title}
    </span>
  </div>
);
