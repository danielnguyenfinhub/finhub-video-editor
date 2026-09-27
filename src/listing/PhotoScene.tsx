// One room of the tour: the photo pushing in on its feature, the room chip,
// the highlight callout, and "Image edited" when listing.txt says so.
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Callout } from "./Callout";
import { COPY } from "./copy";
import { photoBox, PhotoWindow } from "./PhotoWindow";
import { roomOf } from "./rooms";
import type { Listing, Scene } from "./schema";
import { C, clamp, SAFE, SANS, SHADOW, usePair, WINDOW } from "./theme";

type Photo = Listing["photos"][number];

export const RoomChip: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { vi, en, Icon } = roomOf(id);
  const [main, sub] = usePair()(vi, en);
  const x = interpolate(frame, [4, 16], [-40, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: 530,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 24px 12px 16px",
        borderRadius: 999,
        background: "rgba(14,23,38,0.82)",
        border: `2px solid ${C.gold}`,
        fontFamily: SANS,
        opacity: interpolate(frame, [4, 16], [0, 1], clamp),
        transform: `translateX(${x}px)`,
      }}
    >
      <Icon size={36} color={C.gold} strokeWidth={2.2} />
      <span style={{ color: C.cream, fontSize: 34, fontWeight: 800 }}>
        {main}
      </span>
      <span style={{ color: C.goldLight, fontSize: 26, fontWeight: 600 }}>
        · {sub}
      </span>
    </div>
  );
};

const EditedTag: React.FC = () => {
  const [main, sub] = usePair()(COPY.edited.vi, COPY.edited.en);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: 608,
        padding: "8px 16px",
        borderRadius: 10,
        background: "rgba(0,0,0,0.6)",
        color: C.cream,
        fontFamily: SANS,
        fontSize: 22,
        fontWeight: 600,
        textShadow: SHADOW,
      }}
    >
      {main} / {sub}
    </div>
  );
};

export const PhotoScene: React.FC<{
  slug: string;
  scene: Scene;
  photo: Photo;
  frames: number;
}> = ({ slug, scene, photo, frames }) => {
  const b = photoBox(photo, scene.focus);
  return (
    <AbsoluteFill>
      <PhotoWindow
        slug={slug}
        photo={photo}
        focus={scene.focus}
        frames={frames}
      />
      {/* Readability for the captions over the lower photo. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, transparent 1040px, rgba(0,0,0,0.72) 1360px, rgba(0,0,0,0.72) 100%)",
        }}
      />
      <RoomChip id={scene.id} />
      {scene.highlight && scene.focus ? (
        <Callout x={b.fx} y={WINDOW.top + b.fy} text={scene.highlight} />
      ) : null}
      {photo.edited ? <EditedTag /> : null}
    </AbsoluteFill>
  );
};
