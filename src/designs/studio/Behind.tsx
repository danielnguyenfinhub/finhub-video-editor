// "studio"'s Behind layer (golden rules 1, 2, 3b): the automatic figures
// figuresOf() adds for numbers no edit.json stat or cue covers, as a smaller
// StatCallout bubble, and the logo of every bank Daniel names. Both sit in
// the band above his head (SAFE.top down to ~y 560, his hair top at the
// punch-in) and are drawn behind his cut-out (index.tsx Talk). Stat callouts
// stay in the Overlay; figuresOf skips numbers they cover, so a number is
// never shown twice. Figure on the left, bank on the right: while the LogoMark
// shows (top-right), the bank tile sits left of it.
// ponytail: the widest logo (firstmac, ~280 px tile) can touch a figure
// bubble only if a figure, a bank and the LogoMark all show at once.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { OverlayProps } from "../../mortgage/design";
import {
  HOOK_FRAMES,
  LOGO_HEIGHT,
  LOGO_SECONDS,
  SAFE,
  figuresOf,
  lenderMentionsOf,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { StatCallout } from "./Pieces";

const AUTO_SCALE = 0.55; // 385 x 170 px: x 54-439, y 420-590
// 86: every logo file (scale 0.7-1.3) is at least 60 px tall.
const LENDER_HEIGHT = 86;
// LogoMark's tile (120 px logo, 2000x1215 file, 22 px padding) plus a gap.
const LOGO_TILE = Math.ceil((LOGO_HEIGHT * 2000) / 1215) + 44 + 20;

const LenderTile: React.FC<{ lender: Lender; right: number }> = ({
  lender,
  right,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const out = spring({
    frame: frame - (durationInFrames - 10),
    fps,
    config: { damping: 200 },
  });
  return (
    <AbsoluteFill
      style={{
        top: SAFE.top,
        left: SAFE.left,
        width: right - SAFE.left,
        alignItems: "flex-end",
      }}
    >
      <LenderLogo
        lender={lender}
        height={LENDER_HEIGHT}
        style={{
          border: `6px solid ${brand.accent}`,
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45)",
          transformOrigin: "50% 100%",
          transform: `scale(${pop * (1 - out)})`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Behind: React.FC<OverlayProps> = ({ reel, talkFrames }) => {
  const { fps } = useVideoConfig();
  const logoFrom = talkFrames - LOGO_SECONDS * fps;
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
            <StatCallout
              big={f.big}
              label={f.label}
              x={SAFE.left}
              y={SAFE.top}
              scale={AUTO_SCALE}
            />
          </Sequence>
        ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const dur = Math.round(((m.endMs - m.startMs) / 1000) * fps);
        if (dur <= 0) return null;
        // Left of the LogoMark for the whole mention if the logo shows at
        // any point of it (logoVisible's windows), so the tile never jumps.
        const withLogo =
          (from < LOGO_SECONDS * fps && from + dur > HOOK_FRAMES) ||
          from + dur > logoFrom;
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={dur}
          >
            <LenderTile
              lender={m.lender}
              right={withLogo ? SAFE.right - LOGO_TILE : SAFE.right}
            />
          </Sequence>
        );
      })}
    </>
  );
};
