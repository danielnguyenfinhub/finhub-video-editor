// Key facts: beds, baths, cars (and land / internal size when given) as
// counters that roll up, with icons. Every number comes from listing.json.
import { Bath, Bed, Car, LandPlot, Ruler, type LucideIcon } from "lucide-react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CardStage } from "./CardStage";
import { CardTitle } from "./CardTitle";
import { COPY } from "./copy";
import type { Listing } from "./schema";
import { C, clamp, SANS, SERIF, usePair } from "./theme";

type Stat = {
  Icon: LucideIcon;
  n: number;
  unit?: string;
  label: { vi: string; en: string };
};

const Counter: React.FC<{ stat: Stat; at: number; wide?: boolean }> = ({
  stat,
  at,
  wide,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [main, sub] = usePair()(stat.label.vi, stat.label.en);
  const pop = spring({
    frame: frame - at,
    fps,
    config: { damping: 13, stiffness: 170 },
  });
  const n = Math.round(
    interpolate(frame, [at, at + 26], [0, stat.n], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }),
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: wide ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: wide ? 24 : 6,
        opacity: pop,
        transform: `scale(${0.8 + 0.2 * pop})`,
        fontFamily: SANS,
      }}
    >
      <stat.Icon size={wide ? 58 : 70} color={C.gold} strokeWidth={1.8} />
      <div
        style={{
          color: C.cream,
          fontFamily: SERIF,
          fontSize: wide ? 84 : 112,
          lineHeight: 1.05,
        }}
      >
        {n.toLocaleString("en-AU")}
        {stat.unit ? (
          <span style={{ fontSize: wide ? 44 : 52 }}> {stat.unit}</span>
        ) : null}
      </div>
      <div style={{ textAlign: wide ? "left" : "center" }}>
        <div
          style={{
            color: C.goldLight,
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.3,
          }}
        >
          {main}
        </div>
        <div
          style={{
            color: C.cream,
            fontSize: 22,
            fontWeight: 600,
            opacity: 0.7,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
};

export const FactsCard: React.FC<{
  slug: string;
  listing: Listing;
  photo: string | null;
}> = ({ slug, listing, photo }) => {
  const rooms: Stat[] = [
    { Icon: Bed, n: listing.bedrooms, label: COPY.bedrooms },
    { Icon: Bath, n: listing.bathrooms, label: COPY.bathrooms },
    // Some listings give no car count ("secure parking" is a feature, not a number).
    ...(listing.carSpaces === null ? [] : [{ Icon: Car, n: listing.carSpaces, label: COPY.carSpaces }]),
  ];
  const sizes: Stat[] = [
    ...(listing.landSizeM2
      ? [
          {
            Icon: LandPlot,
            n: listing.landSizeM2,
            unit: "m²",
            label: COPY.land,
          },
        ]
      : []),
    ...(listing.internalSizeM2
      ? [
          {
            Icon: Ruler,
            n: listing.internalSizeM2,
            unit: "m²",
            label: COPY.internal,
          },
        ]
      : []),
  ];
  return (
    <CardStage slug={slug} photo={photo}>
      <CardTitle {...COPY.facts} />
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-around",
          marginTop: 10,
        }}
      >
        {rooms.map((s, i) => (
          <Counter key={s.label.en} stat={s} at={10 + i * 8} />
        ))}
      </div>
      {sizes.length ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginTop: 44,
            width: "100%",
            borderTop: `2px solid rgba(228,186,97,0.35)`,
            paddingTop: 34,
          }}
        >
          {sizes.map((s, i) => (
            <Counter key={s.label.en} stat={s} at={36 + i * 8} wide />
          ))}
        </div>
      ) : null}
    </CardStage>
  );
};
