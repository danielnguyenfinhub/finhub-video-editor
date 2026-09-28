// Where it is: a MapTiler map pinned on the suburb's centre when both a key
// and a confident geocode exist, otherwise a drawn gold locator (never a wrong
// map). Then only the distances the agent listed, as chips.
import { MapOverlay, MapViewport } from "@remotion/maptiler";
import { evolvePath } from "@remotion/paths";
import { MapPin } from "lucide-react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CardStage } from "./CardStage";
import { CardTitle } from "./CardTitle";
import { COPY } from "./copy";
import type { Listing } from "./schema";
import { C, clamp, SAFE, SANS, SERIF, SHADOW, usePair } from "./theme";

// "Canley Vale station, 800 m" -> ["Canley Vale station", "800 m"]
const splitNearby = (s: string): [string, string | null] => {
  const i = s.lastIndexOf(",");
  return i > 0
    ? [s.slice(0, i).trim(), s.slice(i + 1).trim()]
    : [s.trim(), null];
};

const Distances: React.FC<{ items: string[]; at: number }> = ({
  items,
  at,
}) => {
  const frame = useCurrentFrame();
  const [main, sub] = usePair()(COPY.distances.vi, COPY.distances.en);
  if (!items.length) return null;
  return (
    <div style={{ width: "100%", fontFamily: SANS }}>
      <div
        style={{
          color: C.goldLight,
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 14,
        }}
      >
        {main}{" "}
        <span
          style={{
            color: C.cream,
            opacity: 0.65,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          · {sub}
        </span>
      </div>
      {items.map((item, i) => {
        const [name, dist] = splitNearby(item);
        const t = at + i * 8;
        return (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              padding: "14px 0",
              borderBottom: "1px solid rgba(247,241,227,0.18)",
              opacity: interpolate(frame, [t, t + 10], [0, 1], clamp),
              transform: `translateY(${interpolate(frame, [t, t + 10], [20, 0], clamp)}px)`,
            }}
          >
            <span style={{ color: C.cream, fontSize: 34, fontWeight: 700 }}>
              {name}
            </span>
            {dist ? (
              <span
                style={{
                  background: C.gold,
                  color: C.ink,
                  fontSize: 30,
                  fontWeight: 800,
                  padding: "6px 18px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                {dist}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

// A pin drawn on, with rings pulsing out of its point.
const PIN =
  "M 90 190 C 60 140 20 110 20 70 A 70 70 0 1 1 160 70 C 160 110 120 140 90 190 Z";
const DrawnPin: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = evolvePath(interpolate(frame, [4, 30], [0, 1], clamp), PIN);
  return (
    <svg
      width={180}
      height={230}
      viewBox="0 0 180 230"
      style={{ overflow: "visible" }}
    >
      {[0, 1, 2].map((k) => {
        const r = ((frame + k * 20) % 60) / 60;
        return (
          <ellipse
            key={k}
            cx={90}
            cy={196}
            rx={20 + r * 80}
            ry={(20 + r * 80) * 0.3}
            fill="none"
            stroke={C.gold}
            strokeWidth={3}
            opacity={(1 - r) * 0.8}
          />
        );
      })}
      <path
        d={PIN}
        fill="rgba(228,186,97,0.18)"
        stroke={C.gold}
        strokeWidth={6}
        strokeLinejoin="round"
        {...draw}
      />
      <circle
        cx={90}
        cy={70}
        r={24}
        fill={C.gold}
        opacity={interpolate(frame, [24, 32], [0, 1], clamp)}
      />
    </svg>
  );
};

export const LocationScene: React.FC<{
  slug: string;
  listing: Listing;
  photo: string | null;
}> = ({ slug, listing, photo }) => {
  const frame = useCurrentFrame();
  // A browser key by design (see .env.local notes); empty counts as none.
  const apiKey = process.env.REMOTION_MAPTILER_KEY || null;
  const loc = listing.location;
  if (apiKey && loc)
    return (
      <AbsoluteFill style={{ backgroundColor: C.night }}>
        <MapViewport
          name="Suburb map"
          apiKey={apiKey}
          centerLongitude={loc.longitude}
          centerLatitude={loc.latitude}
          zoom={13.2}
          bearing={0}
          pitch={0}
          showLabels
          administrativeBorders="none"
          backgroundColor={C.night}
        >
          <MapOverlay
            name="Suburb pin"
            anchor="bottom"
            latitude={loc.latitude}
            longitude={loc.longitude}
            opacity={interpolate(frame, [6, 14], [0, 1], clamp)}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: C.night,
                  border: `3px solid ${C.gold}`,
                  color: C.goldLight,
                  fontFamily: SERIF,
                  fontSize: 52,
                  padding: "8px 26px",
                  borderRadius: 16,
                  textShadow: SHADOW,
                }}
              >
                {listing.suburb}
              </div>
              <MapPin size={96} color={C.gold} fill={C.night} strokeWidth={2} />
            </div>
          </MapOverlay>
        </MapViewport>
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to bottom, transparent 820px, rgba(14,23,38,0.92) 900px, rgba(14,23,38,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: SAFE.right - SAFE.left,
            top: 910,
          }}
        >
          <Distances items={listing.nearby} at={20} />
        </div>
      </AbsoluteFill>
    );
  return (
    <CardStage slug={slug} photo={photo}>
      <CardTitle {...COPY.location} />
      <DrawnPin />
      <div
        style={{
          color: C.cream,
          fontFamily: SERIF,
          fontSize: listing.suburb.length > 16 ? 70 : 88,
          lineHeight: 1.15,
          marginTop: 18,
          textAlign: "center",
        }}
      >
        {listing.suburb}
      </div>
      <div
        style={{
          color: C.goldLight,
          fontFamily: SANS,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 6,
          marginBottom: 34,
        }}
      >
        {listing.state} {listing.postcode}
      </div>
      <Distances items={listing.nearby} at={30} />
    </CardStage>
  );
};
