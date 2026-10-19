import {MapOverlay, MapPolyline, MapViewport, type MapPolylineFeature} from "@remotion/maptiler";
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from "remotion";
import {palette} from "./palette";
import {poppins} from "./font";

const SYDNEY_CBD = {longitude: 151.2093, latitude: -33.8688};
const PARRAMATTA = {longitude: 151.0011, latitude: -33.815};

// An illustrative line roughly along Parramatta Road, not a surveyed route.
const route = {
  type: "Feature",
  properties: {name: "Sydney CBD to Parramatta"},
  geometry: {
    type: "LineString",
    coordinates: [
      [SYDNEY_CBD.longitude, SYDNEY_CBD.latitude],
      [151.185, -33.884],
      [151.155, -33.88],
      [151.125, -33.87],
      [151.093, -33.866],
      [151.058, -33.844],
      [151.03, -33.827],
      [PARRAMATTA.longitude, PARRAMATTA.latitude],
    ],
  },
} as const satisfies MapPolylineFeature;

const Pin: React.FC<{label: string}> = ({label}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: poppins,
    }}
  >
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        background: palette.accent2,
        border: `4px solid ${palette.text}`,
      }}
    />
    <div
      style={{
        background: palette.bg,
        color: palette.text,
        fontSize: 24,
        fontWeight: 700,
        padding: "6px 14px",
        borderRadius: 10,
      }}
    >
      {label}
    </div>
  </div>
);

// Demonstrates: @remotion/maptiler, Remotion's MapTiler components (an
// internal package: no docs, so this follows packages/example/src/
// SwitzerlandMap in the Remotion source and the remotion-best-practices/remotion-maps guide's
// MapTiler technique). <MapViewport> holds the render with delayRender()
// until the tiles have loaded; the camera stays fixed, as the skill advises
// for stable renders, while <MapPolyline progress> draws the route and two
// <MapOverlay> pins pop in. Needs REMOTION_MAPTILER_KEY in .env (a free
// MapTiler key); without one this shows how to add it instead (what
// renders in this sandbox, which also can't reach api.maptiler.com).
export const MapTilerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const clamp = {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  } as const;
  // An empty value (as copied from .env.example) counts as no key.
  const apiKey = process.env.REMOTION_MAPTILER_KEY || null;

  return (
    <AbsoluteFill style={{background: palette.bg}}>
      {apiKey === null ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            fontFamily: poppins,
            color: palette.text,
            textAlign: "center",
          }}
        >
          <div style={{fontSize: 44, fontWeight: 700}}>Sydney CBD → Parramatta map</div>
          <div
            style={{
              fontSize: 26,
              color: palette.textDim,
              marginTop: 18,
              lineHeight: 1.5,
            }}
          >
            Add a free MapTiler key to <span style={{color: palette.accent2}}>.env</span> as
            <br />
            <span style={{color: palette.accent2}}>REMOTION_MAPTILER_KEY=…</span> and render again.
          </div>
        </AbsoluteFill>
      ) : (
        <MapViewport
          name="Sydney camera"
          apiKey={apiKey}
          centerLongitude={151.105}
          centerLatitude={-33.848}
          zoom={10.9}
          bearing={0}
          pitch={0}
          showLabels={false}
          administrativeBorders="none"
          backgroundColor={palette.bg}
        >
          <MapPolyline
            name="Sydney CBD to Parramatta"
            layerId="cbd-to-parramatta"
            data={route}
            progress={interpolate(frame, [12, 60], [0, 1], {
              ...clamp,
              easing: Easing.inOut(Easing.cubic),
            })}
            lineColor={palette.accent}
            lineWidth={8}
            outline
            outlineColor={palette.text}
            outlineWidth={6}
            outlineOpacity={0.6}
          />
          <MapOverlay name="Sydney CBD pin" anchor="left" {...SYDNEY_CBD} opacity={interpolate(frame, [4, 12], [0, 1], clamp)}>
            <Pin label="Sydney CBD" />
          </MapOverlay>
          <MapOverlay name="Parramatta pin" anchor="right" {...PARRAMATTA} opacity={interpolate(frame, [56, 64], [0, 1], clamp)}>
            <Pin label="Parramatta" />
          </MapOverlay>
        </MapViewport>
      )}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 30,
          fontFamily: poppins,
          color: palette.text,
          fontSize: 34,
          fontWeight: 700,
          textShadow: "0 2px 8px #000",
        }}
      >
        @remotion/maptiler
      </div>
    </AbsoluteFill>
  );
};
