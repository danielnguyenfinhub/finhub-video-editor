// One kept piece of the source at its pacing rate, with its audio: the part of
// a talk segment every design must use. Designs frame it through `style`
// (scale, mask, position) and can add a `muted` second copy (blurred backdrop,
// mirror). Volume ramps 2 frames at each edge so cuts don't click.
// Only trimBefore is set: <OffthreadVideo>'s trimAfter is applied as a timeline
// duration (trimAfter - trimBefore frames), not scaled by playbackRate, so at a
// rate below 1 it would blank the segment's tail. The enclosing sequence of
// outDuration frames ends playback at srcFrom + outDuration * rate ≈ srcTo.
import { colorCorrection } from "@remotion/effects/color-correction";
import { grayscale } from "@remotion/effects/grayscale";
import { vignette } from "@remotion/effects/vignette";
import { Video } from "@remotion/media";
import type React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  interpolate,
  type EffectsProp,
} from "remotion";
import type { Look } from "./schema";
import { retryVideoFetch } from "./style";
import type { Segment } from "./timeline";

// edit.json `look` recipes. Values stay inside each effect's documented range
// (contrast/saturation 0-3, temperature -1..1, vignette amount 0-1).
const LOOK_EFFECTS: Record<Look, EffectsProp> = {
  warm: [
    colorCorrection({ temperature: 0.15, saturation: 1.1, contrast: 1.05 }),
    vignette({ amount: 0.25 }),
  ],
  cinematic: [
    colorCorrection({ temperature: 0.05, saturation: 0.9, contrast: 1.15 }),
    vignette({ amount: 0.4 }),
  ],
  mono: [
    grayscale({ amount: 1 }),
    colorCorrection({ contrast: 1.1 }),
    vignette({ amount: 0.3 }),
  ],
};

// edit.json "background": "brand" — what sits behind Daniel once the room is
// removed: navy into brand blue with a soft light behind his head.
export const BrandBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse 70% 45% at 50% 32%, rgba(79, 163, 224, 0.45), transparent 70%), linear-gradient(170deg, #0B1F3D 0%, #0B2F5E 55%, #0064A8 100%)",
    }}
  />
);

export const PacedVideo: React.FC<{
  seg: Segment;
  src: string;
  look?: Look;
  style?: React.CSSProperties;
  muted?: boolean;
  // foreground.webm (Daniel cut out, with alpha; review/matte.html makes it):
  // set, the room is replaced by the brand backdrop. Same frames as src, so it
  // plays through the same trimBefore and rate; the voice still comes from src.
  foreground?: string;
  // "none": the design draws its own backdrop behind this component.
  backdrop?: "brand" | "none";
}> = ({ seg, src, look, style, muted, foreground, backdrop = "brand" }) => {
  const dur = seg.outDuration;
  const shared = {
    src,
    trimBefore: seg.srcFrom,
    playbackRate: seg.rate,
    muted,
    volume: (f: number) =>
      interpolate(f, [0, 2, dur - 2, dur], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      ...style,
    } as const,
  };
  // A graded video plays through @remotion/media's <Video>, whose `effects`
  // run the grade on each decoded frame. <OffthreadVideo> has no effects prop
  // and wrapping it in <HtmlInCanvas> never paints, so the render hangs.
  // No fallback to <OffthreadVideo>: that would ship the video ungraded. Its
  // objectFit prop (default "contain") overrides style.objectFit, so it is set
  // too. No onError: after delayRenderRetries the render fails, as it should.
  // `transparent` keeps the cut-out's alpha (<OffthreadVideo> otherwise
  // extracts opaque JPEG frames).
  const player = (props: typeof shared, transparent = false) =>
    look ? (
      <Video
        {...props}
        objectFit="cover"
        effects={LOOK_EFFECTS[look]}
        disallowFallbackToOffthreadVideo
        delayRenderRetries={retryVideoFetch.delayRenderRetries}
        delayRenderTimeoutInMilliseconds={
          retryVideoFetch.delayRenderTimeoutInMilliseconds
        }
      />
    ) : (
      <OffthreadVideo
        {...props}
        {...retryVideoFetch}
        transparent={transparent}
      />
    );
  if (!foreground) return player(shared);
  return (
    <AbsoluteFill>
      {muted ? null : (
        <Audio
          src={src}
          trimBefore={seg.srcFrom}
          playbackRate={seg.rate}
          volume={(f) => shared.volume(f)}
        />
      )}
      {backdrop === "brand" ? <BrandBackdrop /> : null}
      {player({ ...shared, src: foreground, muted: true }, true)}
    </AbsoluteFill>
  );
};
