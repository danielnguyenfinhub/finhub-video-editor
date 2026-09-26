// "scenario" overlay pieces: the hook counter, spoken-number figures, a bank
// chip in a column header slot with a one-time shine sweep, and the chapter
// strip.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import type { Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { EditJson } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";

const HOOK_FRAMES = 105;

export const ScenarioHook: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [HOOK_FRAMES - 10, HOOK_FRAMES],
    [1, 0],
    clamp,
  );
  const big =
    hook.countTo === undefined
      ? hook.big
      : [
          interpolate(frame, [4, 40], [0, hook.countTo], clamp).toLocaleString(
            "vi-VN",
            {
              minimumFractionDigits: hook.decimals ?? 0,
              maximumFractionDigits: hook.decimals ?? 0,
            },
          ),
          hook.suffix ?? "",
        ]
          .join(" ")
          .trim();
  const sub = enter(frame, fps, 12);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        // Top of the safe band (SAFE.top + 60): centred, the hook sat on
        // Daniel's face.
        justifyContent: "flex-start",
        paddingTop: SAFE.top + 60,
        opacity: outP,
        fontFamily: FONT,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: big.length > 10 ? 110 : 150,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: -3,
          lineHeight: 1.05,
          textShadow: "0 10px 40px rgba(0,0,0,0.6)",
          transform: `scale(${interpolate(inP, [0, 1], [1.8, 1])})`,
          opacity: inP,
        }}
      >
        {big}
      </div>
      {hook.sub ? (
        <div
          style={{
            marginTop: 14,
            fontSize: 46,
            fontWeight: 800,
            color: brand.accent,
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [30, 0])}px)`,
          }}
        >
          {hook.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const ILLUSTRATIVE = "Ví dụ minh hoạ · tuỳ hoàn cảnh từng người";

// Left-aligned in the A half: the number runs above Daniel's head (top ~y
// 800), its label and note wrap in the left column (to x ~350), beside his
// head rather than behind it.
const FIGURE_TEXT_WIDTH = 300;

export const FigureCard: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
  const big = figure.source === "stat";
  const size = Math.min(
    big ? 112 : 92,
    fitText({
      text: figure.big,
      withinWidth: SAFE.right - SAFE.left,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const lineW = interpolate(frame, [6, 20], [0, big ? 220 : 160], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 1080 - SAFE.right,
        // Under LogoMark's corner (first/last 10 s), not behind it.
        top: SAFE.top + 170,
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          color: "#fff",
          // Room above the cap height for a stacked diacritic ("TỶ"), which
          // would otherwise poke up into LogoMark's tile.
          lineHeight: 1.3,
        }}
      >
        {figure.big}
      </div>
      <div
        style={{
          width: lineW,
          height: 6,
          background: brand.accent,
          marginTop: 4,
          borderRadius: 3,
        }}
      />
      <div
        style={{
          marginTop: 12,
          width: FIGURE_TEXT_WIDTH,
          fontSize: big ? 30 : 28,
          fontWeight: 700,
          lineHeight: 1.2,
          color: "#fff",
        }}
      >
        {figure.label}
      </div>
      {figure.source === "stat" ? (
        <div
          style={{
            marginTop: 8,
            width: FIGURE_TEXT_WIDTH,
            fontSize: 22,
            fontWeight: 600,
            color: brand.textDim,
          }}
        >
          {ILLUSTRATIVE}
        </div>
      ) : null}
    </div>
  );
};

// Slot b sits under LogoMark (golden rule: y >= SAFE.top + 170), same as the
// compare column it shares a header row with.
const SLOT = {
  a: { left: 60, width: 440, top: SAFE.top },
  b: { left: 580, width: 380, top: SAFE.top + 170 },
} as const;

// A lender chip in the column header slot, with a diagonal shine sweeping
// across it once. Drawn as a CSS gradient sweep rather than
// @remotion/effects/shine's HtmlInCanvas: that needs GPU/HTML-in-canvas
// support the still renderer isn't guaranteed to have, and a chip this small
// doesn't need a WebGL budget for one sweep.
export const LenderChip: React.FC<{ lender: Lender; slot: "a" | "b" }> = ({
  lender,
  slot,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const sweep = interpolate(frame, [0, 26], [-60, 160], clamp);
  const col = SLOT[slot];
  return (
    <div
      style={{
        position: "absolute",
        left: col.left,
        top: col.top,
        width: col.width,
        display: "flex",
        justifyContent: "center",
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
      }}
    >
      <div
        style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}
      >
        <LenderLogo lender={lender} height={44} />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${sweep}%`,
            width: "40%",
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.75), transparent)",
            transform: "skewX(-20deg)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

export const ChapterStrip: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const show = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 1080 - SAFE.right,
        top: SAFE.top,
        padding: "16px 24px",
        background: brand.accent,
        borderRadius: 14,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 36,
        color: brand.textOnCard,
        textAlign: "center",
        opacity: show,
        transform: `translateY(${interpolate(show, [0, 1], [-20, 0])}px)`,
      }}
    >
      PHẦN {index + 1} · {title}
    </div>
  );
};
