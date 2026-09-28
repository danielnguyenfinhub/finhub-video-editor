// The floor plan: shown whole on a paper card (a drawing is never cropped),
// with a gentle drift across it.
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { CardStage } from "./CardStage";
import { RoomChip } from "./PhotoScene";
import type { Listing } from "./schema";
import { C, CONTENT_BOTTOM, clamp } from "./theme";

type Photo = Listing["photos"][number];

export const PlanScene: React.FC<{
  slug: string;
  id: string;
  photo: Photo;
  frames: number;
}> = ({ slug, id, photo, frames }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, frames], [1, 1.12], clamp);
  const pan = interpolate(frame, [0, frames], [-2.5, 2.5], clamp);
  return (
    <AbsoluteFill>
      <CardStage
        slug={slug}
        photo={null}
        top={610}
        bottom={CONTENT_BOTTOM}
        panel={{ padding: 20, background: C.cream, overflow: "hidden" }}
      >
        <Img
          src={staticFile(`listings/${slug}/photos/${photo.file}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${zoom}) translateX(${pan}%)`,
          }}
        />
      </CardStage>
      <RoomChip id={id} />
    </AbsoluteFill>
  );
};
