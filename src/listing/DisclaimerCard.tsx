// The end card the law asks for: the agency's name (PSAA s 50(1)), office,
// the licensee and licence, any material facts (PSAR s 60) and the disclaimer
// from docs/agents/real-estate-compliance.md.
import { Img, staticFile } from "remotion";
import { CardStage } from "./CardStage";
import { BUSINESS, COPY, DISCLAIMER, licenceLine, type Agent } from "./copy";
import type { Listing } from "./schema";
import { C, SANS, usePair } from "./theme";

export const DisclaimerCard: React.FC<{
  slug: string;
  listing: Listing;
  licensee: Agent;
}> = ({ slug, listing, licensee }) => {
  const pair = usePair();
  const [licLabel, licLabelSub] = pair(COPY.licensee.vi, COPY.licensee.en);
  const [factsLabel, factsLabelSub] = pair(
    COPY.materialFacts.vi,
    COPY.materialFacts.en,
  );
  const [first, second] = pair(DISCLAIMER.vi, DISCLAIMER.en);
  return (
    <CardStage
      slug={slug}
      photo={null}
      top={440}
      panel={{ padding: "34px 44px", gap: 14, alignItems: "flex-start" }}
    >
      <Img
        src={staticFile(BUSINESS.logo)}
        style={{ width: 170, height: "auto", alignSelf: "center" }}
      />
      <div style={{ fontFamily: SANS, color: C.cream, width: "100%" }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.goldLight }}>
          {BUSINESS.legalName}
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>
          {BUSINESS.office}
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>
          {BUSINESS.phone} · {BUSINESS.website}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 12 }}>
          {licLabel} / {licLabelSub}: {licensee.displayName} ·{" "}
          <span style={{ whiteSpace: "nowrap" }}>{licenceLine(licensee)}</span>
        </div>
        {listing.materialFacts.length ? (
          <div style={{ marginTop: 14, fontSize: 24, lineHeight: 1.35 }}>
            <span style={{ color: C.goldLight, fontWeight: 800 }}>
              {factsLabel} / {factsLabelSub}:
            </span>{" "}
            {listing.materialFacts.join(" · ")}
          </div>
        ) : null}
        <div
          style={{
            height: 2,
            background: "rgba(228,186,97,0.4)",
            margin: "18px 0",
          }}
        />
        <div style={{ fontSize: 23, lineHeight: 1.4, opacity: 0.92 }}>
          {first}
        </div>
        <div
          style={{ fontSize: 21, lineHeight: 1.4, opacity: 0.7, marginTop: 10 }}
        >
          {second}
        </div>
      </div>
    </CardStage>
  );
};
