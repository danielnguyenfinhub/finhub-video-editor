// "Make room" (golden rule 3b): while a MotionTrack cue panel is up (SAFE.top
// down to CUE_PANEL_BOTTOM), a full-frame design eases Daniel smaller and
// lower so his whole head sits under the panel, then eases him back. The same
// move chatstory makes; a design adopting it sets "cueRoom": true in its
// template.json so check-golden stops counting its cue time as face-hidden.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { isCuePanel } from "./golden";
import { outFrameOf, type Reel } from "./schema";
import { clamp } from "./style";
import type { Segment } from "./timeline";

// Where his hair line (HEAD_Y at full size) sits while a panel is up. The
// panel (ends by y ~930 at SAFE.top) may cover the top of his hair and
// forehead; his eyebrows (~320 px under the hair line at full size) land
// ~y 975 and his mouth (~780 px under it) ~y 1230, above a caption page
// (~y 1285). Daniel's review of PR #75: 0.38 left him too small.
export const CUE_SCALE = 0.55;
export const CUE_HEAD_Y = 800;
// Hair line of the cut-out at full size (the highest it goes, leaning in).
export const HEAD_Y = 600;
const EASE_FRAMES = 15;

// 0..1: how far into a cue panel this talk frame is. Talk gets no reel (the
// Design contract), so it reads the composition's resolved props, the same
// (reading-floored) reel the Overlay's MotionTrack draws from.
export const useCueRoom = (seg: Segment): number => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  if (!reel) return 0;
  const t = seg.outFrom + frame;
  const outFrame = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? []).filter(isCuePanel).reduce((k, c) => {
    const a = outFrame(c.fromMs);
    const b = Math.max(a + 1, outFrame(c.toMs));
    return Math.max(
      k,
      interpolate(t, [a - EASE_FRAMES, a, b, b + EASE_FRAMES], [0, 1, 1, 0], {
        ...clamp,
        easing: (x) => x * x * (3 - 2 * x),
      }),
    );
  }, 0);
};

// Style for the layer holding his cut-out (not the backdrop): at k = 1 the
// point at `headY` lands on CUE_HEAD_Y at CUE_SCALE. `headY` is where the
// design's own framing puts his hair line. The sides and bottom of the
// shrunken layer fade out, so the cut-out's frame edges never show.
export const cueRoomStyle = (
  k: number,
  headY = HEAD_Y,
): React.CSSProperties => {
  if (k <= 0) return {};
  // Fully faded by k = 1/8, while the layer's edges are still near the frame
  // edge; a fade that followed k let them show mid-ease.
  const fade = `rgba(0,0,0,${Math.max(0, 1 - 8 * k)})`;
  const mask = `linear-gradient(to right, ${fade}, #000 7%, #000 93%, ${fade}), linear-gradient(to bottom, #000 75%, ${fade})`;
  return {
    transform: `translateY(${(CUE_HEAD_Y - headY) * k}px) scale(${1 - (1 - CUE_SCALE) * k})`,
    transformOrigin: `50% ${headY}px`,
    maskImage: mask,
    WebkitMaskImage: mask,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
};
