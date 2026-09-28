// The text slides: big number (hook and figures), section divider, bullets,
// comparison, bank, statement. Each fills the stage between the title bar and
// the caption strip; Push (Chrome.tsx) moves it in and out. `from` is the
// slide's first frame on the talk timeline, so cue times map to local frames.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import type { Lender } from "../../../mortgage/lenders";
import type { Cue } from "../../../mortgage/schema";
import { FONT } from "../../../mortgage/style";
import { Waffle, percentOf } from "./Charts";
import {
  GOLD,
  INK,
  LINE,
  MIST,
  NAVY,
  SLATE,
  STAGE,
  STRIP_TOP,
  BAR_H,
  colX,
  span,
} from "./Chrome";

export const DIVIDER_COPY = ["Chương"];
export const SLIDES_COPY = ["So sánh", "VS"];
type At = (ms: number) => number;
const STAGE_H = STAGE.bottom - STAGE.top;
const soft = { damping: 200 } as const;

export const useIn = (at: number, frames = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at,
    fps,
    config: soft,
    durationInFrames: frames,
  });
};

// Huge number, then (when it is a percent) it glides left for a 100-dot grid.
export const NumberSlide: React.FC<{ big: string; label: string }> = ({
  big,
  label,
}) => {
  const pct = percentOf(big);
  const move = useIn(18, 20);
  const m = pct === null ? 0 : move;
  const labelIn = useIn(pct === null ? 10 : 30);
  const boxW = pct === null ? span(12) : span(7);
  const { fontSize } = fitText({
    text: big,
    withinWidth: boxW - 40,
    fontFamily: FONT,
    fontWeight: 900,
  });
  const size = Math.min(250 - 40 * m, fontSize);
  const centre = colX(0) + (span(12) - boxW) / 2;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: centre + (colX(0) - centre) * m,
          width: boxW,
          top: STAGE.top,
          height: STAGE_H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: pct === null ? "center" : "flex-start",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            fontSize: size,
            fontWeight: 900,
            color: NAVY,
            lineHeight: 1.05,
          }}
        >
          {big}
        </div>
        <div
          style={{
            width: 160 * labelIn,
            height: 10,
            background: GOLD,
            borderRadius: 5,
            margin: "18px 0 22px",
          }}
        />
        {label ? (
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.25,
              opacity: labelIn,
              textAlign: pct === null ? "center" : "left",
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
      {pct !== null ? <Waffle pct={pct} delay={30} /> : null}
    </>
  );
};

export const DividerSlide: React.FC<{ index: number; titles: string[] }> = ({
  index,
  titles,
}) => {
  const title = useIn(6);
  const row = useIn(16);
  const n = titles.length;
  const rowW = span(8);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: BAR_H,
        width: 1920,
        height: STRIP_TOP - BAR_H,
        background: NAVY,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: colX(0),
          width: span(4),
          top: 0,
          height: STRIP_TOP - BAR_H,
          display: "flex",
          alignItems: "center",
          fontSize: 300,
          fontWeight: 900,
          color: GOLD,
          letterSpacing: -10,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div
        style={{ position: "absolute", left: colX(4), width: rowW, top: 110 }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: GOLD,
            letterSpacing: 6,
            opacity: title,
          }}
        >
          {DIVIDER_COPY[0].toUpperCase()} {index + 1} / {n}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 84,
            fontWeight: 900,
            color: brand.text,
            lineHeight: 1.15,
            opacity: title,
            transform: `translateY(${(1 - title) * 30}px)`,
          }}
        >
          {titles[index]}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 56, opacity: row }}>
          {titles.map((t, i) => (
            <div key={t} style={{ width: (rowW - 14 * (n - 1)) / n }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: i <= index ? GOLD : `${brand.text}33`,
                }}
              />
              <div
                style={{
                  marginTop: 12,
                  fontSize: 22,
                  fontWeight: 700,
                  color: i === index ? brand.text : `${brand.text}80`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {i + 1}. {t}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type PointsCue = Extract<Cue, { kind: "points" }>;
export const PointsSlide: React.FC<{
  cue: PointsCue;
  at: At;
  from: number;
}> = ({ cue, at, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = cue.items.filter((it) => at(it.atMs) - from <= frame).length;
  const countIn = useIn(0);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: colX(0),
          width: span(8),
          top: STAGE.top,
          height: STAGE_H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
          fontFamily: FONT,
        }}
      >
        {cue.items.map((it, i) => {
          const p = spring({
            frame: frame - (at(it.atMs) - from),
            fps,
            config: soft,
            durationInFrames: 14,
          });
          return (
            <div
              key={it.atMs}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                opacity: p,
                transform: `translateX(${(1 - p) * -40}px)`,
              }}
            >
              <div
                style={{
                  flex: "0 0 64px",
                  height: 64,
                  borderRadius: 14,
                  background: i === shown - 1 ? GOLD : NAVY,
                  color: i === shown - 1 ? NAVY : brand.text,
                  fontSize: 32,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: INK,
                  lineHeight: 1.2,
                }}
              >
                {it.text}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: colX(9),
          width: span(3),
          top: STAGE.top,
          height: STAGE_H,
          borderRadius: 24,
          background: MIST,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          opacity: countIn,
        }}
      >
        <span style={{ fontSize: 200, fontWeight: 900, color: NAVY }}>
          {Math.max(1, shown)}
        </span>
        <span
          style={{ fontSize: 64, fontWeight: 700, color: SLATE, marginTop: 70 }}
        >
          /{cue.items.length}
        </span>
      </div>
    </>
  );
};

export const LenderSlide: React.FC<{ lender: Lender }> = ({ lender }) => {
  const p = useIn(0);
  return (
    <div
      style={{
        position: "absolute",
        left: colX(0),
        width: span(12),
        top: STAGE.top,
        height: STAGE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${0.9 + 0.1 * p})`,
      }}
    >
      <LenderLogo
        lender={lender}
        height={170}
        style={{
          border: `2px solid ${LINE}`,
          boxShadow: `0 20px 60px ${brand.navy}22`,
        }}
      />
    </div>
  );
};

// The spoken sentence itself is drawn big by the caption layer; this is its frame.
export const StatementSlide: React.FC = () => {
  const p = useIn(4, 20);
  return (
    <div
      style={{
        position: "absolute",
        left: colX(1) - 50,
        top: STAGE.top + 60,
        width: 12,
        height: (STAGE_H - 120) * p,
        borderRadius: 6,
        background: GOLD,
      }}
    />
  );
};
