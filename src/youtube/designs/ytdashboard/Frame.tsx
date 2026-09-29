// The dashboard's empty frame (navy, dot grid, panel outlines, dashed strip
// slots) under Cover and Talk, so it persists through every transition and
// only the content in Overlay changes.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { Fragment } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import type { CoverProps, TalkProps } from "../../../mortgage/design";
import { PacedVideo } from "../../../mortgage/PacedVideo";
import { FONT, LOGO, clamp, emphasised, enter } from "../../../mortgage/style";
import {
  CONSOLE,
  FOCUS,
  HEADER,
  P,
  RAIL,
  STRIP,
  alpha,
  slotRect,
  type Rect,
} from "./layout";

const box = (r: Rect): React.CSSProperties => ({
  position: "absolute",
  left: r.x,
  top: r.y,
  width: r.w,
  height: r.h,
  borderRadius: 20,
  boxSizing: "border-box",
});

export const Backdrop: React.FC<{ skeleton?: number }> = ({ skeleton = 1 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 30% 15%, ${brand.background} 0%, ${brand.navy} 80%)`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${alpha(brand.text, 0.05)} 1.5px, transparent 1.6px)`,
        backgroundSize: "32px 32px",
      }}
    />
    <AbsoluteFill style={{ opacity: skeleton }}>
      {[RAIL, HEADER, FOCUS].map((r) => (
        <div
          key={`${r.x}${r.y}`}
          style={{
            ...box(r),
            background: P.panel,
            border: `1.5px solid ${P.line}`,
          }}
        />
      ))}
      <div
        style={{
          ...box(CONSOLE),
          background: alpha(brand.navy, 0.75),
          border: `1.5px solid ${P.line}`,
          borderTop: `3px solid ${alpha(P.gold, 0.55)}`,
        }}
      />
      {Array.from({ length: STRIP.n }, (_, i) => (
        <div
          key={i}
          style={{
            ...box(slotRect(i)),
            borderRadius: 18,
            border: `2px dashed ${P.line}`,
          }}
        />
      ))}
    </AbsoluteFill>
  </AbsoluteFill>
);

// Cover: the dashboard booting, the title on a card over the empty frame.
export const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const { fontSize } = fitText({
    text: title,
    withinWidth: 1300,
    fontFamily: FONT,
    fontWeight: "900",
  });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop skeleton={0.5} />
      {/* Positioned, so it paints above the absolute backdrop. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 1440,
            padding: "56px 70px 60px",
            boxSizing: "border-box",
            borderRadius: 30,
            background: alpha(brand.navy, 0.9),
            border: `2px solid ${P.line}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: enter(frame, fps),
          }}
        >
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 16,
              background: brand.card,
              marginBottom: 40,
            }}
          >
            <Img src={LOGO} style={{ height: 96, display: "block" }} />
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: Math.min(100, fontSize),
              fontWeight: 900,
              color: P.text,
              lineHeight: 1.2,
            }}
          >
            {words.map((w, i) => (
              <Fragment key={`${w}${i}`}>
                <span
                  style={{
                    color: hit.has(i) ? P.gold : P.text,
                    opacity: enter(frame, fps, 4 + i * 3),
                  }}
                >
                  {w}
                </span>{" "}
              </Fragment>
            ))}
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 38,
              fontWeight: 700,
              color: P.dim,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              marginTop: 40,
              width: 520,
              height: 8,
              borderRadius: 4,
              background: P.faint,
            }}
          >
            <div
              style={{
                width: `${interpolate(frame, [8, 64], [0, 100], clamp)}%`,
                height: "100%",
                borderRadius: 4,
                background: P.gold,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Talk: React.FC<TalkProps> = ({
  seg,
  src,
  look,
  foreground,
  behind,
}) => (
  <AbsoluteFill>
    <Backdrop />
    {behind}
    <PacedVideo
      seg={seg}
      src={src}
      look={look}
      foreground={foreground}
      backdrop="none"
    />
  </AbsoluteFill>
);
