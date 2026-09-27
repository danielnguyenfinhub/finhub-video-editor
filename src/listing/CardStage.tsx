// The stage behind every card: the listing's photo, blurred and darkened to
// night navy, and a gold-edged panel inside the text band.
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, CONTENT_BOTTOM, clamp, SAFE } from "./theme";

export const CardStage: React.FC<{
  slug: string;
  photo: string | null;
  top?: number;
  bottom?: number;
  panel?: CSSProperties;
  children: ReactNode;
}> = ({ slug, photo, top = 460, bottom = CONTENT_BOTTOM, panel, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({
    frame: frame - 2,
    fps,
    config: { damping: 16, stiffness: 140 },
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #1B2A44 0%, ${C.night} 60%, #05080F 100%)`,
      }}
    >
      {photo ? (
        <Img
          src={staticFile(`listings/${slug}/photos/${photo}`)}
          style={{
            position: "absolute",
            maxWidth: "none", // Tailwind's preflight caps img at 100%
            inset: -80,
            width: "calc(100% + 160px)",
            height: "calc(100% + 160px)",
            objectFit: "cover",
            filter: "blur(40px) brightness(0.32) saturate(0.9)",
            transform: `scale(${interpolate(frame, [0, 300], [1.05, 1.15], clamp)})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top,
          height: bottom - top,
          boxSizing: "border-box",
          borderRadius: 34,
          border: `3px solid ${C.gold}`,
          background: "rgba(14,23,38,0.88)",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 10px rgba(228,186,97,0.08)",
          padding: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: inn,
          transform: `translateY(${(1 - inn) * 60}px) scale(${0.96 + 0.04 * inn})`,
          ...panel,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
