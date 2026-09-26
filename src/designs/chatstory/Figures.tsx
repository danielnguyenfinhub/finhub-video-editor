// Golden rule 1: every spoken number gets a visual. A tilted polaroid at the
// top of SAFE holds a one-bar chart (edit.json `stats`) or a counter (an
// automatic figure figuresOf() found in the captions), the value ringed with
// a hand-drawn amber circle (adapted from .claude/elements/text/
// circle-marker), the figure's label as the polaroid caption. It swings in
// (Polaroid's spring rotation) and lifts out at the end of its Sequence.
import { fitText } from "@remotion/layout-utils";
import { Circle } from "@remotion/rough-notation";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { OverlayProps } from "../../mortgage/design";
import { figuresOf, SAFE, type Figure } from "../../mortgage/golden";
import { FONT, clamp } from "../../mortgage/style";
import { Polaroid } from "./Polaroid";

// A single real bar for the figure (edit.json `stats` figures only — an
// automatic figure has no scale to plot against, so it gets a counter).
const OneBarChart: React.FC = () => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [10, 30], [0, 1], clamp);
  return (
    <div
      style={{
        width: 180,
        height: 130,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 110 * h,
          borderRadius: "10px 10px 0 0",
          background: `linear-gradient(180deg, ${brand.primary}, ${brand.background})`,
        }}
      />
    </div>
  );
};

// An automatic figure has no scale to plot against, so instead of a bar it
// pops in like a counter landing on its final value.
const FigureCard: React.FC<{ f: Figure }> = ({ f }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [16, 40], [0, 1], clamp);
  const pop =
    f.source === "auto" ? interpolate(frame, [0, 14], [0.6, 1], clamp) : 1;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `scale(${pop})`,
      }}
    >
      {f.source === "stat" ? <OneBarChart /> : null}
      {/* The rough-notation circle overshoots its box on every side, so it
          needs its own breathing room below or it dips into the caption. */}
      <div style={{ paddingBottom: 28 }}>
        <Circle
          progress={progress}
          color={brand.accent}
          strokeWidth={7}
          roughness={1.6}
          seed={Math.round(f.fromFrame) + 1}
          padding={{ left: 14, right: 14, top: 10, bottom: 10 }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: Math.min(
                f.source === "stat" ? 40 : 60,
                fitText({
                  text: f.big,
                  withinWidth: BIG_WIDTH,
                  fontFamily: FONT,
                  fontWeight: 900,
                }).fontSize,
              ),
              color: "#0B1F3D",
              whiteSpace: "nowrap",
            }}
          >
            {f.big}
          </span>
        </Circle>
      </div>
    </div>
  );
};

// Narrow enough that left + width clears FACE.left (250), whatever SAFE.left
// is, so it never disappears behind his head — only its own drop shadow may
// touch him.
const CARD_WIDTH = 220;
// The number's room inside it: less the polaroid's 18px sides and the
// circle's 14px padding on each side, so "$4,1 TỶ" never runs past the card.
const BIG_WIDTH = CARD_WIDTH - 2 * 18 - 2 * 14;

// Rendered in the design's Behind layer (between the backdrop and Daniel's
// cut-out): anchored at the top of SAFE, beside his left shoulder, so the
// number and caption always read clear of his face (golden rule 3b).
export const Figures: React.FC<OverlayProps> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  return (
    <>
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          <Polaroid
            rotate={-3}
            width={CARD_WIDTH}
            frames={f.frames}
            caption={f.label}
            captionSize={22}
            style={{ left: SAFE.left, top: SAFE.top }}
          >
            <FigureCard f={f} />
          </Polaroid>
        </Sequence>
      ))}
    </>
  );
};
