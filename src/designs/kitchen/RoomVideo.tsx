// "background": "room": his real room can't sit behind anything, so the video
// becomes a photo card on the cream, framed so NOTHING covers his head
// (Daniel, 27/09/2026: "no panel, card or graphic may cover any part of his
// head"). Everything drawn at the top (hook bubble, logo tile, chapter tag,
// figure polaroid) lives in the band SAFE.top..TOP_BAND; while a cue panel is
// up (it ends by PANEL_BAND) the card eases smaller and lower. In both, his
// mouth stays above the caption page (2 lines start ~y 1268).
import type React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { useCueRoom } from "../../mortgage/cueRoom";
import { PacedVideo } from "../../mortgage/PacedVideo";
import type { Segment } from "../../mortgage/timeline";
import type { Look } from "../../mortgage/schema";

// Measured on this recording's source frames (1080x1920): top of the hair
// ~y 580, mouth ~y 1340. ponytail: per-recording guesses; measure again if a
// room video is framed differently.
const HAIR_Y = 570;
const MOUTH_Y = 1340;
// Bottom of whatever may be up at the top of the frame.
const TOP_BAND = 630; // hook bubble (2 lines, ~628), polaroid (~610), logo (~564)
const PANEL_BAND = 800; // points panels of up to 2 short items (~780)
const GAP = 20; // card edge below the band
const HAIR_GAP = 20; // his hair below the card edge
// A points panel drops in with a spring that overshoots ~90 px for a few
// frames (classic Panel pop), so under a panel his hair sits lower still.
const PANEL_HAIR_GAP = 100;
const MOUTH_MAX = 1255; // above the caption page
const MAX_SCALE = 0.8;
const RADIUS = 40;

// Screen mapping y' = a + b * y (and x' = 540 + (x - 540) * b) for a band.
const layout = (band: number, hairGap: number) => {
  const top = band + GAP;
  const hair = top + hairGap;
  const b = Math.min(MAX_SCALE, (MOUTH_MAX - hair) / (MOUTH_Y - HAIR_Y));
  return { top, a: hair - HAIR_Y * b, b };
};

export const RoomVideo: React.FC<{
  seg: Segment;
  src: string;
  look?: Look;
}> = ({ seg, src, look }) => {
  const { width, height } = useVideoConfig();
  const k = useCueRoom(seg); // 0..1, eased in and out around each panel
  const rest = layout(TOP_BAND, HAIR_GAP);
  const panel = layout(PANEL_BAND, PANEL_HAIR_GAP);
  const mix = (x: number, y: number) => interpolate(k, [0, 1], [x, y]);
  const a = mix(rest.a, panel.a);
  const b = mix(rest.b, panel.b);
  const top = mix(rest.top, panel.top);
  const side = (width - width * b) / 2;
  const bottom = Math.max(0, height - (a + height * b));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        clipPath: `inset(${top}px ${side}px ${bottom}px ${side}px round ${RADIUS}px)`,
      }}
    >
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        backdrop="none"
        style={{
          transform: `translateY(${a}px) scale(${b})`,
          transformOrigin: "50% 0",
        }}
      />
    </div>
  );
};
