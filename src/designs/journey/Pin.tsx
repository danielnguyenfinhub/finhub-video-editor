// "journey" pin: the gold map pin that travels the road (it stands where
// the camera keeps the marker, hops onto each milestone of a route plan, and
// fades under a classic panel), and the sand wash that calms the map while a
// route plan or a fork owns the stage.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import { RAMP, isOwnCue, pointsLayout, spokenOrder } from "./Kit";
import { GOLD, INK, MARKER_Y, SAND, alpha, cameraAt } from "./Map";

type Pose = { x: number; y: number; s: number; o: number };

// Where the marker stands at talk frame t: home (the road), hopping onto the
// latest milestone said during a points cue, faded under a classic panel.
const poseAt = (reel: Reel, fps: number, t: number): Pose => {
  const cam = cameraAt(t, fps);
  const home = { x: cam.mx, y: MARKER_Y };
  const at = outFrameOf(reel.timeline, fps);
  let pose: Pose = { ...home, s: 1, o: 1 };
  for (const c of reel.edit.cues ?? []) {
    const a = at(c.fromMs);
    const b = at(c.toMs);
    const w = interpolate(t, [a - RAMP, a, b, b + RAMP], [0, 1, 1, 0], clamp);
    if (w <= 0) continue;
    if (c.kind === "points") {
      const slots = pointsLayout(c.items.length).map((d) => ({
        x: d.x - 62,
        y: d.y + 22,
      }));
      let p = home;
      spokenOrder(c.items).forEach((it, i) => {
        const s = at(it.atMs);
        const k = interpolate(t, [s, s + 12], [0, 1], {
          ...clamp,
          easing: (x) => x * x * (3 - 2 * x),
        });
        if (k > 0)
          p = {
            x: p.x + (slots[i].x - p.x) * k,
            y: p.y + (slots[i].y - p.y) * k,
          };
      });
      pose = {
        x: home.x + (p.x - home.x) * w,
        y: home.y + (p.y - home.y) * w,
        s: 1 - 0.28 * w,
        o: 1,
      };
    } else if (c.kind !== "compare" && c.kind !== "emoji") {
      pose = { ...pose, o: 1 - 0.9 * w };
    }
  }
  return pose;
};

export const Marker: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Pin {...poseAt(reel, fps, frame)} t={frame} />;
};

// The gold map pin (tip at x, y) with a little house, hopping, a ring
// pulsing out on the ground.
export const Pin: React.FC<Pose & { t: number }> = ({ x, y, s, o, t }) => {
  const frame = t;
  const hop = Math.abs(Math.sin(frame / 9)) * 7;
  const ring = (frame % 45) / 45;
  return (
    <svg
      width={200}
      height={160}
      style={{
        position: "absolute",
        left: x - 100,
        top: y - 130,
        opacity: o,
        overflow: "visible",
      }}
    >
      <g transform={`translate(100 130) scale(${s})`}>
        <ellipse
          rx={30 + ring * 50}
          ry={10 + ring * 16}
          fill="none"
          stroke={GOLD}
          strokeWidth={4}
          opacity={1 - ring}
        />
        <ellipse rx={20 - hop} ry={7} fill={alpha(brand.navy, 0.3)} />
        <g transform={`translate(0 ${-hop})`}>
          <path
            d="M 0 0 C -8 -16 -34 -32 -34 -56 A 34 34 0 1 1 34 -56 C 34 -32 8 -16 0 0 Z"
            fill={GOLD}
            stroke={INK}
            strokeWidth={4}
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 10px ${alpha(GOLD, 0.8)})` }}
          />
          <circle cy={-57} r={21} fill="#ffffff" stroke={INK} strokeWidth={3} />
          {/* A little house: the destination of every trip here. */}
          <path
            d="M -11 -54 L 0 -65 L 11 -54 L 11 -46 L -11 -46 Z"
            fill={INK}
          />
          <rect x={-3} y={-53} width={6} height={7} fill={GOLD} />
        </g>
      </g>
    </svg>
  );
};

// The map calms (a sand wash) while a route plan or a fork owns the stage.
export const CueWash: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const w = (reel.edit.cues ?? []).filter(isOwnCue).reduce((m, c) => {
    const a = at(c.fromMs);
    const b = at(c.toMs);
    return Math.max(
      m,
      interpolate(frame, [a - RAMP, a, b, b + RAMP], [0, 1, 1, 0], clamp),
    );
  }, 0);
  return w > 0 ? (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: SAND,
        opacity: 0.62 * w,
      }}
    />
  ) : null;
};
