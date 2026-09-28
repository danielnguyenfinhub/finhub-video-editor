// The payoff promised at the start: the full address, typed out, with a pin.
import { MapPin } from "lucide-react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COPY } from "./copy";
import { PhotoWindow } from "./PhotoWindow";
import type { Listing } from "./schema";
import { C, clamp, SAFE, SANS, SERIF, SHADOW, usePair } from "./theme";

export const AddressScene: React.FC<{
  slug: string;
  listing: Listing;
  photo: string | null;
  frames: number;
}> = ({ slug, listing, photo, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [main, sub] = usePair()(COPY.address.vi, COPY.address.en);
  const p = listing.photos.find((x) => x.file === photo) ?? listing.photos[0];
  const street = listing.street;
  const rest = `${listing.suburb} ${listing.state} ${listing.postcode}`;
  // Typewriter: street first, then suburb line.
  const typed = Math.floor(
    interpolate(
      frame,
      [14, 14 + (street.length + rest.length) * 1.6],
      [0, street.length + rest.length],
      clamp,
    ),
  );
  const drop = spring({
    frame: frame - 2,
    fps,
    config: { damping: 9, stiffness: 150 },
  });
  const caret =
    frame % 20 < 10 && typed < street.length + rest.length ? "|" : "";
  return (
    <AbsoluteFill>
      <PhotoWindow
        slug={slug}
        photo={p}
        focus={{ x: 0.5, y: 0.5 }}
        frames={frames}
        push={0.1}
        dim={0.62}
      />
      <AbsoluteFill
        style={{
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          top: 520,
          height: 600,
          alignItems: "center",
          textAlign: "center",
          fontFamily: SANS,
        }}
      >
        <div
          style={{
            transform: `translateY(${(1 - drop) * -120}px)`,
            opacity: drop,
          }}
        >
          <MapPin
            size={120}
            color={C.gold}
            fill="rgba(14,23,38,0.8)"
            strokeWidth={1.8}
          />
        </div>
        <div
          style={{
            color: C.goldLight,
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginTop: 16,
            textShadow: SHADOW,
          }}
        >
          {main}{" "}
          <span style={{ color: C.cream, opacity: 0.75, fontSize: 24 }}>
            · {sub}
          </span>
        </div>
        <div
          style={{
            color: C.cream,
            fontFamily: SERIF,
            fontSize: street.length > 22 ? 70 : 84,
            lineHeight: 1.2,
            marginTop: 26,
            minHeight: 100,
            textShadow: SHADOW,
          }}
        >
          {street.slice(0, typed)}
          {typed <= street.length ? caret : ""}
        </div>
        <div
          style={{
            color: C.goldLight,
            fontSize: 46,
            fontWeight: 800,
            marginTop: 10,
            minHeight: 60,
            textShadow: SHADOW,
          }}
        >
          {rest.slice(0, Math.max(0, typed - street.length))}
          {typed > street.length ? caret : ""}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
