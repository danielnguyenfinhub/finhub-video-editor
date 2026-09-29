// Classic design's closing CTA/contact card with the credential badges.
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BadgeRow } from "../../brand/BadgeRow";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { CTA_BUTTON } from "../../mortgage/schema";
import { FONT, LOGO, enter } from "../../mortgage/style";

export const Outro: React.FC<{ question: string }> = ({ question }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps, 4);
  const b = enter(frame, fps, 14);
  const c = enter(frame, fps, 26);
  const d = enter(frame, fps, 38);
  const e = enter(frame, fps, 48);
  const pulse = 1 + Math.sin(frame / 6) * 0.03;
  const contact = (label: string, value: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 30,
        padding: "14px 0",
        borderTop: `2px solid ${brand.primary}22`,
      }}
    >
      <span style={{ color: "#5B6B80", fontWeight: 600 }}>{label}</span>
      <span style={{ color: brand.textOnCard, fontWeight: 800 }}>{value}</span>
    </div>
  );
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FB 100%)",
        fontFamily: FONT,
        textAlign: "center",
      }}
    >
      {/* Everything inside SAFE (golden rule 3), spread top to bottom. */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: SAFE.left,
          width: SAFE.right - SAFE.left,
          height: SAFE.bottom - SAFE.top,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Img
          src={LOGO}
          style={{ width: 300, transform: `scale(${a})`, opacity: a }}
        />
        <div
          style={{
            fontSize: 62,
            fontWeight: 900,
            color: brand.textOnCard,
            lineHeight: 1.25,
            opacity: b,
            transform: `translateY(${interpolate(b, [0, 1], [40, 0])}px)`,
          }}
        >
          {question}
        </div>
        <div
          style={{
            padding: "26px 60px",
            borderRadius: 999,
            background: brand.primary,
            color: "#fff",
            fontSize: 54,
            fontWeight: 900,
            opacity: c,
            transform: `scale(${c * pulse})`,
            boxShadow: "0 16px 40px rgba(0,100,168,0.35)",
          }}
        >
          {CTA_BUTTON}
        </div>
        <div
          style={{
            width: 860,
            fontSize: 44,
            opacity: d,
            transform: `translateY(${interpolate(d, [0, 1], [40, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: brand.primary,
              marginBottom: 10,
            }}
          >
            Daniel Nguyen
          </div>
          {contact("Điện thoại", "0430 11 11 88")}
          {contact("Email", "daniel@finhub.net.au")}
          {contact("Website", "finhub.net.au")}
        </div>
        <div
          style={{
            opacity: e,
            transform: `translateY(${interpolate(e, [0, 1], [60, 0])}px)`,
            boxShadow: "0 10px 30px rgba(11,31,61,0.15)",
            borderRadius: 20,
          }}
        >
          <BadgeRow height={80} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
