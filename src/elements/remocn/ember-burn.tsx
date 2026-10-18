// Ported from remocn-remotion-resoure (MIT, Copyright (c) 2026 Remocn), registry/remocn/ember-burn/index.tsx
// @ 3903a46 (vendored at .claude/elements/remocn/components/remocn/ember-burn.tsx).
// Only its CSS fallback (EmberBurnFallback): opacity plus a screen-blended glow,
// no WebGL shader. The fallback for filmBurn where the browser lacks
// HTML-in-canvas (src/showcase/htmlInCanvasPresentation.ts).
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import type React from "react";
import { AbsoluteFill } from "remotion";

export type EmberBurnProps = {
  glowColor?: string;
};

const EmberBurnFallback: React.FC<
  TransitionPresentationComponentProps<EmberBurnProps>
> = ({
  children,
  presentationProgress,
  presentationDirection,
  passedProps,
}) => {
  const { glowColor = "#ff7a2f" } = passedProps;

  if (presentationDirection === "exiting") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const p = presentationProgress;
  const reveal = Math.min(1, Math.max(0, (p - 0.25) / 0.5));
  const flash = Math.max(0, Math.sin(p * Math.PI)) ** 0.6 * 0.4;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: reveal }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          background: glowColor,
          mixBlendMode: "screen",
          opacity: flash,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

export function emberBurn(
  props: EmberBurnProps = {},
): TransitionPresentation<EmberBurnProps> {
  return { component: EmberBurnFallback, props };
}
