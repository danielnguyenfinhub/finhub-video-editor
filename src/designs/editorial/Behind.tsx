// "editorial"'s Behind layer: figuresOf() drawn as a full-height navy COLUMN
// on the left (the 60/40 split from the concept) that Daniel stands in front
// of, never as a card floating over his face. Rendered between the backdrop
// and PacedVideo (see index.tsx Talk), so his cut-out always paints on top.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { OverlayProps } from "../../mortgage/design";
import { SAFE, figuresOf } from "../../mortgage/golden";
import type { Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import { MASTHEAD_BOTTOM } from "./Masthead";

// x 0-560: a backdrop-scale fill (golden rule: backdrops may fill the frame),
// from the masthead down to the bottom of the page. Purely decorative now
// (Daniel's measured footage: hair top y~600, face x 250-830) — the readable
// kicker/number/label live in FIGURE_BAND below, above his head, never on it.
const COLUMN_WIDTH = 560;

// Daniel says the number every design must show gets hidden behind his head
// when it renders mid-column. The only free space above a full-frame talk is
// y 420 (SAFE.top) to ~580 (just above his hairline at y~600), x 54-560 (the
// column's width). Kicker + number + label must total <=160px tall here.
const FIGURE_BAND = { top: SAFE.top, bottom: 580, left: SAFE.left, right: 560 };
const FIGURE_BAND_WIDTH = FIGURE_BAND.right - FIGURE_BAND.left;
// ponytail: vertical padding is tight (8px) so kicker(16) + number(86) +
// label(~26) + margins + padding lands at ~158px, clearing the masthead
// rule (which starts at MASTHEAD_BOTTOM, well below 580) with room to spare.
const FIGURE_PAD_X = 20;
const FIGURE_PAD_Y = 8;

const FigurePanel: React.FC<{
  big: string;
  label: string;
  column: boolean;
}> = ({ big, label, column }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  // number ~86px cap (band height forces this a touch under the ~90px
  // guideline), fitText within 500px so it never busts the band.
  const size = Math.min(
    86,
    fitText({
      text: big,
      withinWidth: Math.min(500, FIGURE_BAND_WIDTH - FIGURE_PAD_X * 2),
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - outP }}>
      {/* Decorative full-height column behind him (unchanged position).
          Left out with "background": "room": drawn in front of the opaque
          video, it would cover his face. */}
      {column ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: MASTHEAD_BOTTOM,
            bottom: 0,
            width: COLUMN_WIDTH,
            background: "rgba(11,31,61,0.94)",
          }}
        />
      ) : null}
      {/* Kicker, big figure and label sit ABOVE his head (y 420-580) — the
          only place a big number reads clean on a full-frame talk. */}
      <div
        style={{
          position: "absolute",
          left: FIGURE_BAND.left,
          top: FIGURE_BAND.top,
          width: FIGURE_BAND_WIDTH,
          padding: `${FIGURE_PAD_Y}px ${FIGURE_PAD_X}px`,
          borderRadius: 12,
          background: "rgba(11,31,61,0.94)",
          transform: `translateX(${interpolate(inP, [0, 1], [-FIGURE_BAND_WIDTH - 40, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 16,
            lineHeight: 1,
            letterSpacing: 4,
            color: brand.accent,
          }}
        >
          CON SỐ
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: size,
            color: "#fff",
            marginTop: 6,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {big}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 20,
            color: brand.textDim,
            marginTop: 4,
            lineHeight: 1.15,
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Figures: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {figuresOf(reel, fps).map((f) => (
        <Sequence
          key={f.fromFrame}
          from={f.fromFrame}
          durationInFrames={f.frames}
        >
          <FigurePanel
            big={f.big}
            label={f.label}
            column={reel.edit.background !== "room"}
          />
        </Sequence>
      ))}
    </>
  );
};

export const Behind: React.FC<OverlayProps> = ({ reel }) => (
  <Figures reel={reel} />
);
