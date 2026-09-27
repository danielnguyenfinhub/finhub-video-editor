// A hook line lit word by word: a soft box sweeps under each word as it
// arrives, and words marked with *asterisks* fill amber with navy text.
// Sized to fit SAFE's width (906 px). Every string is on-screen copy: in a reel
// it goes through the RG 234 check (onScreenCopy in src/mortgage/schema.ts).
// Design concept from reactvideoeditor/remotion-templates' text highlight (MIT).
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../brand/theme";
import { SAFE } from "../mortgage/golden";
import { clamp, FONT } from "../mortgage/style";

export const WordHighlight: React.FC<{
  text: string; // "Is your *fixed rate* ending soon?"
  perWord?: number; // frames between words
  fontSize?: number;
}> = ({ text, perWord = 10, fontSize = 100 }) => {
  const frame = useCurrentFrame();
  const words = text
    .normalize("NFC")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w.replace(/\*/g, ""), key: w.includes("*") }));
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "18px 22px",
        maxWidth: SAFE.right - SAFE.left,
        fontFamily: FONT,
      }}
    >
      {words.map(({ word, key }, i) => {
        const t = interpolate(frame, [i * perWord, i * perWord + perWord / 2], [0, 1], clamp);
        return (
          <span
            key={i}
            style={{
              position: "relative",
              padding: "8px 18px 12px",
              fontSize,
              fontWeight: 800,
              lineHeight: 1.25, // room for stacked Vietnamese marks
              color: key && t >= 1 ? brand.textOnCard : brand.text,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${t * 100}%`,
                borderRadius: 14,
                opacity: t > 0 ? 1 : 0,
                background: key
                  ? `linear-gradient(135deg, ${brand.accent}, ${brand.highlight})`
                  : "rgba(255, 255, 255, 0.14)",
              }}
            />
            <span style={{ position: "relative" }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};
