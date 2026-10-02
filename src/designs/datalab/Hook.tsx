// The hook (first 105 frames of the Overlay): a giant counter in
// brand.highlight with a glow, counting up when edit.json hook.countTo is
// set, plus a thin amber progress line under it (ProgressBar, clipped to the
// hook's own width so it reads as a data readout, not the whole-video bar).
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { ProgressBar } from "../../elements/ProgressBar";
import type { EditJson } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import { SAFE, hookText } from "../../mortgage/golden";

// LogoMark's tile sits top-right inside SAFE for the same first-10s window
// the hook shows in, so the hook box stops short of it instead of running
// underneath (golden rule 4: no overlaps).
const HOOK_RIGHT_INSET = 1080 - SAFE.right + 260;
const HOOK_WIDTH = 1080 - SAFE.left - HOOK_RIGHT_INSET;

export const HookCounter: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = enter(frame, fps);
  const big = hookText(
    hook,
    interpolate(frame, [0, 60], [0, 1], {
      ...clamp,
      easing: Easing.out(Easing.exp),
    }),
  );
  const sub = enter(frame, fps, 12);
  const bigSize = Math.min(
    180,
    fitText({
      text: big,
      withinWidth: HOOK_WIDTH,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: HOOK_RIGHT_INSET,
        top: SAFE.top,
        textAlign: "center",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: bigSize,
          fontWeight: 900,
          color: brand.highlight,
          letterSpacing: -3,
          lineHeight: 1.05,
          textShadow: `0 0 30px ${brand.highlight}, 0 0 80px ${brand.highlight}99, 0 10px 30px rgba(0,0,0,0.6)`,
          transform: `scale(${interpolate(inP, [0, 1], [1.6, 1])})`,
          opacity: inP,
        }}
      >
        {big}
      </div>
      {hook.sub ? (
        <div
          style={{
            marginTop: 18,
            fontSize: 44,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: 5,
            textTransform: "uppercase",
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [40, 0])}px)`,
          }}
        >
          {hook.sub}
        </div>
      ) : null}
      <div
        style={{
          position: "relative",
          height: 6,
          marginTop: 30,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <ProgressBar position="top" height={6} color={brand.accent} />
      </div>
    </div>
  );
};
