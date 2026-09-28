// The price exactly as advertised (never reworded), with a gold shimmer, then
// auction, open homes or the move-in date, whichever listing.txt gave.
import { CalendarDays, Gavel, KeyRound, Phone, type LucideIcon } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CardStage } from "./CardStage";
import { CardTitle } from "./CardTitle";
import { COPY, type Agent } from "./copy";
import type { Listing } from "./schema";
import { C, clamp, SANS, SERIF, usePair } from "./theme";

const Row: React.FC<{
  Icon: LucideIcon;
  label: { vi: string; en: string };
  lines: string[];
  at: number;
}> = ({ Icon, label, lines, at }) => {
  const frame = useCurrentFrame();
  const [main, sub] = usePair()(label.vi, label.en);
  return (
    <div
      style={{
        display: "flex",
        gap: 22,
        alignItems: "flex-start",
        width: "100%",
        opacity: interpolate(frame, [at, at + 10], [0, 1], clamp),
        transform: `translateX(${interpolate(frame, [at, at + 10], [-30, 0], clamp)}px)`,
        fontFamily: SANS,
      }}
    >
      <Icon
        size={48}
        color={C.gold}
        strokeWidth={2}
        style={{ flexShrink: 0, marginTop: 6 }}
      />
      <div>
        <div style={{ color: C.goldLight, fontSize: 28, fontWeight: 800 }}>
          {main}{" "}
          <span
            style={{
              color: C.cream,
              opacity: 0.65,
              fontWeight: 600,
              fontSize: 22,
            }}
          >
            · {sub}
          </span>
        </div>
        {lines.map((l) => (
          <div
            key={l}
            style={{
              color: C.cream,
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PriceCard: React.FC<{
  slug: string;
  listing: Listing;
  photo: string | null;
  agent: Agent;
}> = ({ slug, listing, photo, agent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12, stiffness: 160 },
  });
  const sweep = interpolate(frame % 75, [0, 40], [-40, 140], clamp);
  const size =
    listing.price.length <= 14 ? 96 : listing.price.length <= 24 ? 74 : 56;
  const title =
    listing.listingType === "rent" ? COPY.priceRent : COPY.priceSale;
  return (
    <CardStage slug={slug} photo={photo}>
      <CardTitle {...title} />
      <div
        style={{
          fontFamily: SERIF,
          fontSize: size,
          lineHeight: 1.2,
          textAlign: "center",
          padding: "6px 10px",
          // The shimmer: a light band sweeping through gold text.
          backgroundImage: `linear-gradient(100deg, ${C.gold} ${sweep - 30}%, #FFF6D8 ${sweep}%, ${C.gold} ${sweep + 30}%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          transform: `scale(${0.7 + 0.3 * pop})`,
          opacity: pop,
        }}
      >
        {listing.price}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
          width: "100%",
          marginTop: 48,
        }}
      >
        {listing.auction ? (
          <Row
            Icon={Gavel}
            label={COPY.auction}
            lines={[listing.auction]}
            at={24}
          />
        ) : null}
        {listing.openHomes.length ? (
          <Row
            Icon={CalendarDays}
            label={COPY.openHome}
            lines={listing.openHomes}
            at={30}
          />
        ) : null}
        {listing.availableFrom ? (
          <Row
            Icon={KeyRound}
            label={COPY.available}
            lines={[listing.availableFrom]}
            at={36}
          />
        ) : null}
        <Row Icon={Phone} label={COPY.contact} lines={[`${agent.displayName} · ${agent.mobile}`]} at={42} />
      </div>
    </CardStage>
  );
};
