// The first 2 seconds: "Global RE presents", the hook line and the suburb
// (never the street) over the front photo.
import { MapPin } from "lucide-react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BUSINESS, COPY } from "./copy";
import { PhotoWindow } from "./PhotoWindow";
import type { Listing, Scene } from "./schema";
import {
  C,
  clamp,
  SAFE,
  SANS,
  SERIF,
  SHADOW,
  splitBilingual,
  usePair,
} from "./theme";

export const IntroCard: React.FC<{
  slug: string;
  scene: Scene;
  listing: Listing;
  frames: number;
}> = ({ slug, scene, listing, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pair = usePair();
  const photo =
    listing.photos.find((p) => p.file === scene.photo) ?? listing.photos[0];
  const [hook, hookSub] = pair(
    ...splitBilingual(scene.highlight ?? `${listing.suburb}`),
  );
  const [presents] = pair(COPY.presents.vi, COPY.presents.en);
  const up = (at: number) =>
    spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 150 } });
  const rise = (at: number) => ({
    opacity: up(at),
    transform: `translateY(${(1 - up(at)) * 40}px)`,
  });
  return (
    <AbsoluteFill>
      <PhotoWindow
        slug={slug}
        photo={photo}
        focus={{ x: 0.5, y: 0.45 }}
        frames={frames}
        push={0.08}
        dim={0.55}
        blur={scene.blur}
      />
      <AbsoluteFill
        style={{
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: 450,
          height: 700,
          alignItems: "center",
          textAlign: "center",
          fontFamily: SANS,
        }}
      >
        <Img
          src={staticFile(BUSINESS.logo)}
          style={{
            width: 300,
            height: "auto",
            ...rise(0),
            filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))",
          }}
        />
        <div
          style={{
            marginTop: 34,
            color: C.goldLight,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 6,
            textTransform: "uppercase",
            textShadow: SHADOW,
            ...rise(6),
          }}
        >
          {presents}
        </div>
        <div
          style={{
            marginTop: 22,
            color: C.cream,
            fontFamily: SERIF,
            fontSize: hook.length > 34 ? 64 : 78,
            lineHeight: 1.22,
            textShadow: SHADOW,
            ...rise(10),
          }}
        >
          {hook}
        </div>
        {hookSub ? (
          <div
            style={{
              marginTop: 14,
              color: C.cream,
              fontSize: 32,
              fontWeight: 600,
              textShadow: SHADOW,
              ...rise(14),
            }}
          >
            {hookSub}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 26px",
            borderRadius: 999,
            border: `2px solid ${C.gold}`,
            background: "rgba(14,23,38,0.7)",
            color: C.goldLight,
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            opacity: interpolate(frame, [16, 26], [0, 1], clamp),
          }}
        >
          <MapPin size={34} color={C.gold} strokeWidth={2.4} />
          {listing.suburb} · {listing.state}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
