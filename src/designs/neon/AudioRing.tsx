// Voice-driven audio ring behind Daniel's head, adapted from
// elements/AudioRing.tsx: no own <Audio> (PacedVideo already plays the
// voice), no centre image (Daniel's cut-out shows through), amber glow, and
// an explicit `frame` prop (seg.srcFrom + frame * seg.rate) so it follows the
// paced cut instead of the raw current frame. Windowed audio data (via
// useCoveredAudioData, like elements/Oscilloscope): useAudioData fetched and
// decoded the whole source.mp4 in every render tab.
import { visualizeAudio } from "@remotion/media-utils";
import type React from "react";
import { useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { useCoveredAudioData } from "../../elements/useCoveredAudioData";

const BARS = 64; // visualizeAudio needs a power of two

export const NeonAudioRing: React.FC<{
  src: string;
  frame: number;
  radius?: number;
  cx?: number;
  cy?: number;
}> = ({ src, frame, radius = 260, cx = 540, cy = 620 }) => {
  const { fps } = useVideoConfig();
  const at = Math.max(0, Math.round(frame));
  const { audioData, dataOffsetInSeconds } = useCoveredAudioData({
    fps,
    frame: at,
    src,
    windowInSeconds: 10,
  });
  const bars = audioData
    ? visualizeAudio({
        fps,
        frame: at,
        audioData,
        dataOffsetInSeconds,
        numberOfSamples: BARS,
      })
    : new Array<number>(BARS).fill(0);
  const size = radius * 2.6;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          filter: `drop-shadow(0 0 10px ${brand.highlight})`,
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={brand.highlight}
          strokeWidth={2}
          opacity={0.45}
          fill="none"
        />
        <g transform={`translate(${size / 2} ${size / 2})`}>
          {bars.map((a, i) => {
            const h = Math.max(6, Math.min(radius * 0.4, a * radius * 2.2));
            return (
              <rect
                key={i}
                x={-3}
                y={-radius - h}
                width={6}
                height={h}
                rx={3}
                fill={brand.highlight}
                opacity={0.85}
                transform={`rotate(${(i / BARS) * 360})`}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
