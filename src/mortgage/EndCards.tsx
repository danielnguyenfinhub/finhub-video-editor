// The fixed compliance card that closes every MortgageReel, whatever the
// design (the CTA/contact card belongs to each design).
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { brand } from "../brand/theme";
import {
  CONDITIONS_NOTE_VI,
  CREDIT_REP_STATEMENT,
  DISCLAIMER_EN,
  DISCLAIMER_VI,
  LICENSING_STATEMENT,
  TAX_NOTE,
  comparisonWarningVi,
} from "./compliance";
import type { EditJson } from "./schema";
import { FONT, LOGO, clamp } from "./style";

// ---------------------------------------------------------------- compliance

// Mandatory disclosures under Finance Hub's own ACL, from compliance.ts. Fixed,
// static and as bold as the rest of the ad (disclosures must be as prominent as
// the advert's main content). Not editable per video beyond which notes apply.
// The card's lines, shared with the 16:9 YouTube card (src/youtube/) so both
// always carry the same wording.
export type ComplianceLine = { text: string; base: number; color?: string };
export const complianceLines = (
  compliance: EditJson["compliance"],
): ComplianceLine[] => {
  const [company, ...licence] = LICENSING_STATEMENT.split(" | ");
  const rate = compliance?.advertisedRate;
  return [
    { text: company, base: 50, color: brand.primary },
    { text: licence.join(" | "), base: 44 },
    ...(rate
      ? [
          {
            text: `Lãi suất ${rate.rateFigure} | Lãi suất so sánh ${rate.comparisonRate}`,
            base: 44,
            color: brand.primary,
          },
        ]
      : []),
    { text: CREDIT_REP_STATEMENT, base: 44 },
    { text: DISCLAIMER_EN, base: 44 },
    { text: DISCLAIMER_VI, base: 42 },
    ...(compliance?.illustrativeNumbers === false
      ? []
      : [
          {
            text: "Các con số trong video chỉ là ví dụ minh hoạ, không phải đề nghị lãi suất. Examples are illustrative only.",
            base: 38,
            color: "#33445A",
          },
        ]),
    ...(compliance?.conditionsNote
      ? [{ text: CONDITIONS_NOTE_VI, base: 38, color: "#33445A" }]
      : []),
    ...(compliance?.taxNote
      ? [{ text: TAX_NOTE, base: 38, color: "#33445A" }]
      : []),
    ...(rate
      ? [{ text: comparisonWarningVi(rate.ratesAsAt), base: 34, color: "#33445A" }]
      : []),
  ];
};

export const ComplianceCard: React.FC<{
  compliance: EditJson["compliance"];
}> = ({ compliance }) => {
  const frame = useCurrentFrame();
  const lines = complianceLines(compliance);
  // ponytail: text-fit by an area estimate (glyph ≈0.55em wide, 1.35 line
  // height, 920px column, ~1300px of height); swap for @remotion/layout-utils
  // fitText if a card ever overflows.
  const chars = lines.reduce((n, l) => n + l.text.length, 0);
  const fit = Math.sqrt(((1300 - 34 * lines.length) * 920) / (chars * 0.7425));
  const k = Math.min(1, fit / 44);
  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        fontFamily: FONT,
        padding: "140px 80px 0",
        alignItems: "center",
        textAlign: "center",
        opacity: interpolate(frame, [0, 8], [0, 1], clamp),
      }}
    >
      <Img src={LOGO} style={{ width: 420 }} />
      {lines.map((l) => (
        <div
          key={l.text}
          style={{
            fontSize: Math.round(l.base * k),
            fontWeight: 800,
            color: l.color ?? brand.textOnCard,
            lineHeight: 1.35,
            marginTop: 34 * k,
          }}
        >
          {l.text}
        </div>
      ))}
    </AbsoluteFill>
  );
};

