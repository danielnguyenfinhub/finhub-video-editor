// The photo's highlight: a gold dot with a pulsing ring on the feature, and a
// line drawn (@remotion/paths evolvePath) to a label kept inside the text band.
import { evolvePath } from "@remotion/paths";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  C,
  CONTENT_BOTTOM,
  clamp,
  SAFE,
  SANS,
  SHADOW,
  splitBilingual,
  usePair,
} from "./theme";

const LABEL_W = 470;
const LABEL_H = 118;
const TOP = 780; // below the room chip, the teaser and the "staged" tag

export const Callout: React.FC<{
  x: number;
  y: number;
  text: string;
  delay?: number;
}> = ({ x, y, text, delay = 18 }) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const [vi, en] = usePair()(...splitBilingual(text));
  // Label below a high point, above a low one; on the side with more room.
  const ly = Math.min(
    CONTENT_BOTTOM - LABEL_H,
    Math.max(TOP, y < 820 ? y + 150 : y - 150 - LABEL_H),
  );
  const toRight = x < 540;
  const lx = Math.min(
    SAFE.right - LABEL_W,
    Math.max(SAFE.left, toRight ? x + 40 : x - 40 - LABEL_W),
  );
  const ex = toRight ? lx : lx + LABEL_W; // line meets the label's near edge
  const ey = ly + LABEL_H / 2;
  const d = `M ${x} ${y} C ${x} ${(y + ey) / 2}, ${(x + ex) / 2} ${ey}, ${ex} ${ey}`;
  const draw = interpolate(frame, [0, 14], [0, 1], clamp);
  const line = evolvePath(draw, d);
  const pop = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, stiffness: 170 },
  });
  const ring = (frame % 36) / 36;
  if (frame < 0) return null;
  return (
    <AbsoluteFill>
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0 }}
      >
        <circle
          cx={x}
          cy={y}
          r={14 + ring * 40}
          fill="none"
          stroke={C.goldLight}
          strokeWidth={3}
          opacity={1 - ring}
        />
        <path
          d={d}
          fill="none"
          stroke={C.gold}
          strokeWidth={4}
          strokeLinecap="round"
          {...line}
        />
        <circle
          cx={x}
          cy={y}
          r={11}
          fill={C.gold}
          stroke={C.ink}
          strokeWidth={3}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: lx,
          top: ly,
          width: LABEL_W,
          minHeight: LABEL_H,
          boxSizing: "border-box",
          padding: "16px 24px",
          borderRadius: 18,
          background: "rgba(14,23,38,0.86)",
          border: `3px solid ${C.gold}`,
          boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
          fontFamily: SANS,
          opacity: pop,
          transform: `scale(${0.85 + 0.15 * pop})`,
          transformOrigin: toRight ? "left center" : "right center",
        }}
      >
        <div
          style={{
            color: C.goldLight,
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1.3,
            textShadow: SHADOW,
          }}
        >
          {vi}
        </div>
        {en ? (
          <div
            style={{
              color: C.cream,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.3,
              opacity: 0.9,
            }}
          >
            {en}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
