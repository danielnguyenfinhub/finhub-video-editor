// During the room tour: the Global RE logo and a gold progress bar with one
// icon per room, lit as the tour reaches it (so viewers see how far is left).
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BUSINESS } from "./copy";
import type { Beat } from "./data";
import { roomOf } from "./rooms";
import { C, clamp, SAFE, SHADOW } from "./theme";

const TOP = 438;
const LOGO_W = 120;

export const TourBar: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  const frame = useCurrentFrame();
  const tour = beats.filter((b) => b.photoIndex !== null);
  if (!tour.length) return null;
  const start = tour[0].from;
  const end = tour[tour.length - 1].from + tour[tour.length - 1].frames;
  const visible = interpolate(
    frame,
    [start - 6, start + 8, end - 8, end + 4],
    [0, 1, 1, 0],
    clamp,
  );
  if (visible <= 0) return null;
  // Progress runs room by room, each room's share filling while it is shown.
  const cur = tour.findIndex(
    (b) => frame >= b.from && frame < b.from + b.frames,
  );
  const within =
    cur < 0
      ? frame >= end
        ? 1
        : 0
      : (frame - tour[cur].from) / tour[cur].frames;
  const progress = cur < 0 ? within : (cur + within) / tour.length;
  const left = SAFE.left + LOGO_W + 26;
  const width = SAFE.right - left;
  // Icons shrink so a long tour (15+ rooms) never overlaps.
  const d = Math.min(42, width / tour.length - 8);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: visible }}>
      <Img
        src={staticFile(BUSINESS.logo)}
        style={{
          position: "absolute",
          left: SAFE.left,
          top: TOP - 4,
          width: LOGO_W,
          height: "auto",
          filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.7))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left,
          top: TOP + 46,
          width,
          height: 8,
          borderRadius: 4,
          background: "rgba(247,241,227,0.28)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left,
          top: TOP + 46,
          width: width * progress,
          height: 8,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
          boxShadow: `0 0 12px ${C.gold}`,
        }}
      />
      {tour.map((b, i) => {
        const { Icon } = roomOf(b.scene.id);
        const x = left + (width * (i + 0.5)) / tour.length;
        const lit = i <= cur || frame >= end;
        return (
          <div
            key={b.scene.id}
            style={{
              position: "absolute",
              left: x - d / 2,
              top: TOP + 25 - d / 2,
              width: d,
              height: d,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: lit ? C.gold : "rgba(14,23,38,0.8)",
              border: `2px solid ${lit ? C.goldLight : "rgba(247,241,227,0.4)"}`,
              boxShadow: SHADOW,
              transform: `scale(${i === cur ? 1.18 : 1})`,
            }}
          >
            <Icon
              size={Math.round(d * 0.57)}
              color={lit ? C.ink : C.cream}
              strokeWidth={2.2}
            />
          </div>
        );
      })}
    </div>
  );
};
