// A listing photo, never stretched: a blurred copy fills the frame, the photo
// itself fills the 4:5 window (cropped toward `focus`) and slowly pushes in on
// the focus point, which therefore stays still on screen (the callout's anchor).
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { Listing } from "./schema";
import { clamp, W, WINDOW } from "./theme";

type Photo = Listing["photos"][number];
export type Focus = { x: number; y: number };

// Where the focus point sits in the window, and the photo's box in it.
export const photoBox = (photo: Photo, focus: Focus = { x: 0.5, y: 0.5 }) => {
  const s = Math.max(W / photo.width, WINDOW.height / photo.height);
  const dw = photo.width * s;
  const dh = photo.height * s;
  const ox = Math.min(0, Math.max(W - dw, W / 2 - focus.x * dw));
  const oy = Math.min(
    0,
    Math.max(WINDOW.height - dh, WINDOW.height / 2 - focus.y * dh),
  );
  return { dw, dh, ox, oy, fx: ox + focus.x * dw, fy: oy + focus.y * dh };
};

export const PhotoWindow: React.FC<{
  slug: string;
  photo: Photo;
  focus?: Focus;
  frames: number;
  push?: number; // how far it zooms over the beat
  dim?: number; // 0..1 darkening, for cards over the photo
  blur?: { x: number; y: number; w: number; h: number }[];
}> = ({ slug, photo, focus, frames, push = 0.14, dim = 0, blur }) => {
  const frame = useCurrentFrame();
  const src = staticFile(`listings/${slug}/photos/${photo.file}`);
  const b = photoBox(photo, focus);
  const zoom = interpolate(frame, [0, frames], [1, 1 + push], clamp);
  // The blurred fill drifts the other way: a little depth between the layers.
  const drift = interpolate(frame, [0, frames], [0, -30], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          maxWidth: "none", // Tailwind's preflight caps img at 100%
          inset: -80,
          width: W + 160,
          height: "calc(100% + 160px)",
          objectFit: "cover",
          filter: "blur(38px) brightness(0.45) saturate(1.1)",
          transform: `translateY(${drift}px) scale(1.1)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: WINDOW.top,
          left: 0,
          width: W,
          height: WINDOW.height,
          overflow: "hidden",
          // Soft top and bottom edges into the blurred fill.
          maskImage:
            "linear-gradient(to bottom, transparent 0, #000 70px, #000 calc(100% - 70px), transparent 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: b.ox,
            top: b.oy,
            width: b.dw,
            height: b.dh,
            transformOrigin: `${b.fx - b.ox}px ${b.fy - b.oy}px`,
            transform: `scale(${zoom})`,
          }}
        >
          <Img src={src} style={{ width: "100%", height: "100%", maxWidth: "none" }} />
          {(blur ?? []).map((r) => (
            <div
              key={`${r.x}-${r.y}`}
              style={{
                position: "absolute",
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
                backdropFilter: "blur(14px)",
                borderRadius: 8,
              }}
            />
          ))}
        </div>
      </div>
      {dim > 0 ? (
        <AbsoluteFill style={{ backgroundColor: `rgba(8,12,22,${dim})` }} />
      ) : null}
    </AbsoluteFill>
  );
};
