// "reaction" pieces: the backdrop behind Daniel's cut-out, the FinHub logo
// tile (Cover only — the Overlay uses LogoMark, golden rule 3c), the
// bottom-left hook text and the two tags pinned to the artefact's corners (a
// "so what" figure card and a lender-mention tag).
import { Highlight } from "@remotion/rough-notation";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { LOGO_HEIGHT, SAFE, type Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { FONT, LOGO, STROKE, clamp, enter } from "../../mortgage/style";
import { ARTEFACT } from "./Artefact";

// Desaturated navy backdrop behind Daniel's cut-out (Talk, backdrop="none").
export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{ background: "linear-gradient(160deg, #14304F 0%, #0B1F3D 100%)" }}
  />
);

// The FinHub logo, always on a white tile — used by the Cover only (its own
// logo, golden rule 3c: LogoMark's size and place, top-right inside SAFE).
// The Overlay renders LogoMark instead.
export const LogoBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top,
      right: 1080 - SAFE.right,
      padding: "10px 16px",
      borderRadius: 18,
      background: "#fff",
      boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
    }}
  >
    <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
  </div>
);

// hook.big / hook.sub, bottom-left of SAFE — never over the artefact, which
// keeps the top of the frame.
export const HookText: React.FC<{ big: string; sub?: string }> = ({
  big,
  sub,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const subP = enter(frame, fps, 12);
  const markProgress = interpolate(frame, [4, 22], [0, 1], clamp);
  return (
    <div
      style={{ position: "absolute", left: SAFE.left, top: 1150, width: 500 }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 74,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.1,
          textShadow: STROKE,
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [50, 0])}px)`,
        }}
      >
        <Highlight
          progress={markProgress}
          color="rgba(245,165,36,0.55)"
          padding={{ left: 8, right: 8, top: 4, bottom: 4 }}
        >
          {big}
        </Highlight>
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 14,
            display: "inline-block",
            fontFamily: FONT,
            fontSize: 38,
            fontWeight: 800,
            color: brand.textOnCard,
            background: "#fff",
            padding: "8px 22px",
            borderRadius: 12,
            opacity: subP,
            transform: `translateY(${interpolate(subP, [0, 1], [40, 0])}px)`,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

// A figure card pinned to the artefact's bottom-left corner, protruding below
// its bottom edge. "auto" figures render smaller than a declared "stat".
export const SoWhatCard: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const small = figure.source === "auto";
  // ponytail: a light heuristic (first run of digits, comma as the decimal
  // mark) — good enough for edit.json's "$4,1 TỶ" / "~$400" style figures;
  // upgrade to a real formatter if a figure needs true locale parsing.
  const m = figure.big.match(/\d[\d.,]*/);
  const target = m
    ? parseFloat(m[0].replace(/\./g, "").replace(",", "."))
    : null;
  const decimals = m && m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const count =
    target === null
      ? figure.big
      : figure.big.slice(0, m!.index) +
        interpolate(frame, [0, 20], [0, target], clamp).toLocaleString(
          "vi-VN",
          { minimumFractionDigits: decimals, maximumFractionDigits: decimals },
        ) +
        figure.big.slice((m!.index ?? 0) + m![0].length);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left + 26,
        // Protrudes below the artefact card's bottom edge (Behind layer —
        // it's fine for Daniel's cut-out to overlap this, that's the look).
        top: ARTEFACT.top + ARTEFACT.height - (small ? 50 : 80),
        maxWidth: 420,
        padding: small ? "14px 22px" : "20px 28px",
        borderRadius: 20,
        background: brand.primary,
        fontFamily: FONT,
        textAlign: "center",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
      }}
    >
      {/* "NGHĨA LÀ" states a conclusion: only over Daniel's own stats,
          never over an automatic figure (just a number he said). */}
      {small ? null : (
        <div
          style={{
            fontSize: 26,
            letterSpacing: 4,
            fontWeight: 900,
            color: brand.highlight,
          }}
        >
          NGHĨA LÀ
        </div>
      )}
      <div
        style={{
          fontSize: small ? 56 : 80,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.05,
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: small ? 22 : 26,
          fontWeight: 700,
          color: brand.textDim,
          marginTop: 4,
        }}
      >
        {figure.label}
      </div>
    </div>
  );
};

// A white tag pinned to the artefact's top-left corner, sliding in from the
// left. Never suggests the bank made or endorses the video.
export const LenderTag: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  return (
    <div
      style={{
        position: "absolute",
        // Pinned to the card's right edge, in the empty space under the paper
        // lines: at the top it covered the card's kicker line.
        left: ARTEFACT.left + ARTEFACT.width - 290,
        top: ARTEFACT.top + ARTEFACT.height - 150,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px 8px 8px",
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-260, 0])}px)`,
      }}
    >
      <LenderLogo lender={lender} height={44} />
      <span
        style={{
          fontFamily: FONT,
          fontSize: 24,
          fontWeight: 700,
          color: "#5B6B80",
        }}
      >
        · được nhắc
      </span>
    </div>
  );
};
