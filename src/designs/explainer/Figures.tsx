// Golden rules 1 and 2 on the explainer's page: the automatic figures
// figuresOf() adds for numbers no edit.json stat or cue covers, as a smaller
// sticky note pinned to the left end of the notes band, and the logo of every
// bank Daniel names, taped to its right end (left of the LogoMark tile while
// that shows), so the two never overlap. The band ends above his eyes (the
// card frames him low, Paper.tsx). Stat notes stay in Overlay.tsx; figuresOf
// skips numbers they cover, so a number is never shown twice.
// ponytail: an edit.json stat note or cue card is centred in the same band;
// a bank named while one shows sits over its right edge. Give banks their own
// slot if that happens in a real video.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { OverlayProps } from "../../mortgage/design";
import { SAFE, figuresOf, lenderMentionsOf } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { clamp, enter } from "../../mortgage/style";
import { StatNote } from "./Overlay";
import { BAND, logoDuring } from "./Paper";

// Drawn 440 px wide, 352 px in the band (x 54-406); the widest bank tile
// (~280 px) starts at x 418 or later.
const AUTO_WIDTH = 440;
const AUTO_BAND: React.CSSProperties = {
  alignSelf: "flex-start",
  transformOrigin: "top left",
};
// 86: every logo file (scale 0.7-1.3) is at least 60 px tall.
const LENDER_HEIGHT = 86;

const LenderNote: React.FC<{ lender: Lender; right: number }> = ({
  lender,
  right,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inP = enter(frame, fps);
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  return (
    <AbsoluteFill
      style={{
        top: BAND.top,
        left: BAND.left,
        width: right - BAND.left,
        alignItems: "flex-end",
      }}
    >
      <LenderLogo
        lender={lender}
        height={LENDER_HEIGHT}
        style={{
          borderRadius: 4,
          boxShadow: "0 10px 26px rgba(11,31,61,0.22)",
          opacity: 1 - outP,
          transform: `translateY(${interpolate(inP, [0, 1], [-80, 0])}px) rotate(${interpolate(inP, [0, 1], [-8, 2])}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Figures: React.FC<
  Pick<OverlayProps, "reel" | "talkFrames">
> = ({ reel, talkFrames }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {figuresOf(reel, fps)
        .filter((f) => f.source === "auto")
        .map((f) => (
          <Sequence
            key={f.fromFrame}
            from={f.fromFrame}
            durationInFrames={f.frames}
          >
            <StatNote
              big={f.big}
              label={f.label}
              width={AUTO_WIDTH}
              bandStyle={AUTO_BAND}
            />
          </Sequence>
        ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const dur = Math.round(((m.endMs - m.startMs) / 1000) * fps);
        if (dur <= 0) return null;
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={dur}
          >
            <LenderNote
              lender={m.lender}
              right={
                logoDuring(from, dur, talkFrames, fps)
                  ? BAND.left + BAND.width
                  : SAFE.right
              }
            />
          </Sequence>
        );
      })}
    </>
  );
};
