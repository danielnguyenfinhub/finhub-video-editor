// When listing.txt left an agency-agreement fact "unknown", every frame says
// so: the render is a test and must not be posted.
import { AbsoluteFill } from "remotion";
import { C, SANS } from "./theme";

export const TestWatermark: React.FC<{ unknowns: string[] }> = ({
  unknowns,
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        transform: "rotate(-28deg)",
        color: "rgba(255,255,255,0.16)",
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: 150,
        letterSpacing: 12,
        whiteSpace: "nowrap",
        textAlign: "center",
        lineHeight: 1.1,
      }}
    >
      TEST
      <div style={{ fontSize: 46, letterSpacing: 4 }}>
        KHÔNG ĐĂNG · NOT FOR POSTING
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 54,
        right: 120,
        textAlign: "center",
        padding: "6px 12px",
        borderRadius: 8,
        background: "rgba(180,30,30,0.85)",
        color: C.cream,
        fontFamily: SANS,
        fontSize: 22,
        fontWeight: 700,
      }}
    >
      {unknowns.length ? `TEST — thiếu / missing: ${unknowns.join(", ")}` : "TEST — giá trị giả định, không đăng / assumed values, not for posting"}
    </div>
  </AbsoluteFill>
);
