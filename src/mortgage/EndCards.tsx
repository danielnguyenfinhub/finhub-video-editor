// The fixed compliance card that closes every MortgageReel, whatever the
// design (the CTA/contact card belongs to each design).
import { measureText } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { useTyDoFont } from "../brand/font";
import { brand } from "../brand/theme";
import {
  CONDITIONS_NOTE_VI,
  CREDIT_REP_STATEMENT,
  DISCLAIMER_EN,
  DISCLAIMER_VI,
  LICENSING_STATEMENT,
  TAX_NOTE,
  comparisonWarningVi,
  policyAsAtLine,
} from "./compliance";
import { SAFE } from "./golden";
import type { EditJson } from "./schema";
import { FONT, LOGO, clamp } from "./style";

// Logo width on the card (the file is 2000×1215).
const CARD_LOGO_W = 300;
const CARD_LOGO_H = (CARD_LOGO_W * 1215) / 2000;

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
    ...(compliance?.policyAsAt
      ? [{ text: policyAsAtLine(compliance.policyAsAt), base: 38, color: "#33445A" }]
      : []),
    ...(rate
      ? [
          {
            text: comparisonWarningVi(rate.ratesAsAt),
            base: 34,
            color: "#33445A",
          },
        ]
      : []),
  ];
};

export const ComplianceCard: React.FC<{
  compliance: EditJson["compliance"];
}> = ({ compliance }) => {
  const frame = useCurrentFrame();
  const lines = useMemo(() => complianceLines(compliance), [compliance]);
  // The largest scale (at most the base sizes) whose word-wrapped lines fit
  // the SAFE band under the logo, measured with the real font.
  const width = SAFE.right - SAFE.left;
  const height = SAFE.bottom - SAFE.top - CARD_LOGO_H;
  // measureText caches, so measure only once the real font is in.
  const fontReady = useTyDoFont();
  const k = useMemo(() => {
    if (!fontReady) return 1;
    const wrapped = (text: string, fontSize: number) => {
      let rows = 1;
      let row = "";
      for (const word of text.split(" ")) {
        const next = row ? `${row} ${word}` : word;
        const w = measureText({
          text: next,
          fontFamily: FONT,
          fontSize,
          fontWeight: 800,
        }).width;
        if (row && w > width * 0.98) {
          rows++;
          row = word;
        } else row = next;
      }
      return rows;
    };
    for (let s = 1; s > 0.3; s -= 0.01) {
      const used = lines.reduce((h, l) => {
        const size = Math.round(l.base * s);
        return h + wrapped(l.text, size) * size * 1.35 + 34 * s;
      }, 0);
      if (used <= height) return s;
    }
    return 0.3;
  }, [fontReady, lines, width, height]);
  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        fontFamily: FONT,
        opacity: interpolate(frame, [0, 8], [0, 1], clamp),
      }}
    >
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: SAFE.left,
          width,
          height: SAFE.bottom - SAFE.top,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Img src={LOGO} style={{ width: CARD_LOGO_W, height: CARD_LOGO_H }} />
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
      </div>
    </AbsoluteFill>
  );
};
