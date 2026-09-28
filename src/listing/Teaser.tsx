// Early in the tour: "Full address at the end", a reason to keep watching.
import { MapPin } from "lucide-react";
import { interpolate, useCurrentFrame } from "remotion";
import { COPY } from "./copy";
import { C, clamp, SAFE, SANS, usePair } from "./theme";

export const TEASER_FRAMES = 150;

export const Teaser: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame() - from;
  const [main, sub] = usePair()(COPY.teaser.vi, COPY.teaser.en);
  const o = interpolate(
    frame,
    [0, 10, TEASER_FRAMES - 10, TEASER_FRAMES],
    [0, 1, 1, 0],
    clamp,
  );
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 1080 - SAFE.right,
        top: 690,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 22px 10px 14px",
        borderRadius: 16,
        background: "rgba(228,186,97,0.95)",
        color: C.ink,
        fontFamily: SANS,
        opacity: o,
        transform: `translateX(${interpolate(frame, [0, 10], [40, 0], clamp)}px) rotate(${Math.sin(frame / 6) * (frame < 40 ? 1.2 : 0)}deg)`,
        boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
      }}
    >
      <MapPin size={34} color={C.ink} strokeWidth={2.4} />
      <div>
        <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.25 }}>
          {main}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.8 }}>{sub}</div>
      </div>
    </div>
  );
};
