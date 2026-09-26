// "newsroom" pieces: news-desk chrome shared by Cover and Overlay — the
// striped studio backdrop, the logo tile, the RGB-glitch hook, figure cards
// that slide down from the top of SAFE, and the lender lower-third strap.
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
import type { Figure } from "../../mortgage/golden";
import { SAFE } from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT, LOGO, clamp } from "../../mortgage/style";
import { RgbSplitText } from "../../elements/RgbSplitText";

const X_LEFT = SAFE.left;
const X_RIGHT = 1080 - SAFE.right; // right inset matching SAFE.right's x-max

// Slow-moving navy studio backdrop: diagonal brand-blue stripes at ~25% opacity.
export const NewsroomBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.7) % 160;
  return (
    <AbsoluteFill style={{ backgroundColor: brand.background }}>
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(135deg, ${brand.primary}40 0px, ${brand.primary}40 40px, transparent 40px, transparent 160px)`,
          transform: `translate(${shift}px, ${shift}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// FinHub logo for the Cover only (the talk overlay uses LogoMark from the
// core instead): white tile, 120px high, top-right inside SAFE.
export const LogoTile: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top,
      right: X_RIGHT,
      padding: "14px 22px",
      borderRadius: 22,
      background: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    }}
  >
    <Img src={LOGO} style={{ height: 120, display: "block" }} />
  </div>
);

// The "TIN NÓNG · TÀI CHÍNH" bar that slashes in from the left, rotated -4°.
export const NewsBar: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        left: X_LEFT,
        top: 330,
        transform: `translateX(${interpolate(p, [0, 1], [-760, 0])}px) rotate(-4deg)`,
        transformOrigin: "0% 50%",
        background: brand.accent,
        color: brand.textOnCard,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 38,
        letterSpacing: 2,
        padding: "16px 36px",
        boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
      }}
    >
      {text}
    </div>
  );
};

// Hook / chapter title: an RGB-split glitch for the opening frames, then a
// plain heavy-white label — reused by both beats per the brief.
export const GlitchLabel: React.FC<{
  text: string;
  fontSize: number;
  color?: string;
}> = ({ text, fontSize, color = "#fff" }) => {
  const frame = useCurrentFrame();
  return frame < 12 ? (
    <RgbSplitText text={text} fontSize={fontSize} frequency={0.6} />
  ) : (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 900,
        fontSize,
        lineHeight: 1.15,
        color,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
};

// A number card sliding down from above SAFE, resting just below SAFE.top so
// it reads above Daniel's head (golden rule: figures render in Behind, sized
// so the top and label clear FACE.top). One real bar for a "stat" figure, a
// compact counter-with-growing-bar for an "auto" figure.
// `right` (px from the frame's right edge) lets the card stop short of the
// top-right LogoMark while the logo is up (index.tsx Behind).
export const FigureCard: React.FC<{ figure: Figure; right?: number }> = ({
  figure,
  right = X_RIGHT,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 15, stiffness: 160 } });
  const top = interpolate(drop, [0, 1], [-260, SAFE.top]);
  const grow = interpolate(frame, [8, 30], [0, 1], clamp);
  const isStat = figure.source === "stat";
  return (
    <div
      style={{
        position: "absolute",
        left: X_LEFT,
        right,
        top,
        background: "#fff",
        borderRadius: 20,
        padding: isStat ? "26px 32px" : "22px 30px",
        boxShadow: "0 24px 50px rgba(0,0,0,0.4)",
        fontFamily: FONT,
      }}
    >
      {isStat ? (
        <>
          <div
            style={{
              fontWeight: 800,
              fontSize: 30,
              color: brand.textOnCard,
              marginBottom: 16,
            }}
          >
            {figure.label}
          </div>
          <div
            style={{
              height: 64,
              borderRadius: 14,
              background: "#EEF2F7",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${grow * 100}%`,
                background: brand.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "0 22px",
              }}
            >
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 34 }}>
                {figure.big}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: 24, color: "#5B6B80" }}>
            {figure.label}
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: 64,
              color: brand.primary,
              lineHeight: 1.1,
            }}
          >
            {figure.big}
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 6,
              background: "#EEF2F7",
              marginTop: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${grow * 100}%`,
                background: brand.primary,
                borderRadius: 6,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

// News ticker bar, taken over for a named bank: same amber tab ("ĐANG NHẮC
// TỚI") and full-width footprint as NewsTicker, but the scrolling text is
// replaced with LenderLogo's white tile centred in the bar, extended into one
// continuous white shape that also carries the bank name in navy (the bar
// itself is navy, so the name needs the white backdrop to read).
// Renders on top of NewsTicker (same left/width, bottom pinned to SAFE.bottom,
// taller) so it fully covers the scrolling text for the mention's duration;
// the ticker resumes scrolling once this Sequence ends. Slides up + fades in
// and out at the edges of its own Sequence.
export const LENDER_BAR_HEIGHT = 96;

export const LenderBar: React.FC<{ lender: Lender; frames: number }> = ({
  lender,
  frames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const EDGE = 12;
  const inP = spring({ frame, fps, config: { damping: 18, stiffness: 180 } });
  const outP = interpolate(frame, [frames - EDGE, frames], [0, 1], clamp);
  const p = Math.max(inP, 0) - outP;
  const y = interpolate(p, [0, 1], [24, 0]);
  const opacity = interpolate(p, [0, 1], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: SAFE.bottom - LENDER_BAR_HEIGHT,
        height: LENDER_BAR_HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        background: brand.background,
        borderTop: `4px solid ${brand.accent}`,
        transform: `translateY(${y}px)`,
        opacity,
      }}
    >
      <div
        style={{
          background: brand.accent,
          color: brand.background,
          fontFamily: FONT,
          fontWeight: 900,
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 26px",
          flex: "none",
        }}
      >
        ĐANG NHẮC TỚI
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "#fff",
            borderRadius: 16,
            padding: "0 22px 0 0",
          }}
        >
          {/* LenderLogo's own tile (height*1.6 = 96 at height=60) already
              equals LENDER_BAR_HEIGHT, so this wrapper adds no extra
              vertical padding — it would push the tile taller than the bar. */}
          <LenderLogo lender={lender} height={60} />
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 32,
              color: brand.textOnCard,
              whiteSpace: "nowrap",
            }}
          >
            {lender.name}
          </span>
        </div>
      </div>
    </div>
  );
};

// A chapter card: "PHẦN n" glitching in, title below, top-left inside SAFE.
export const ChapterCard: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const show = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: X_LEFT,
        top: SAFE.top + 10,
        maxWidth: 1080 - X_RIGHT - X_LEFT,
        opacity: show,
        transform: `translateY(${(1 - show) * -30}px)`,
      }}
    >
      <GlitchLabel
        text={`PHẦN ${index + 1}`}
        fontSize={52}
        color={brand.accent}
      />
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 46,
          color: "#fff",
          marginTop: 10,
          lineHeight: 1.2,
          textShadow: "0 6px 20px rgba(0,0,0,0.5)",
        }}
      >
        {title}
      </div>
    </div>
  );
};
