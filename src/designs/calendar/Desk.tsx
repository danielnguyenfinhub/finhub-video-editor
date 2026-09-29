// "calendar" (Lịch) building blocks: the off-white desk, the wall calendar
// (navy header band, binder rings, a stack of tear-off pages), page motion
// (flip down in, tear off up), sticky notes and the gold marker circle.
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, clamp } from "../../mortgage/style";

export const NAVY = brand.background;
export const INK = brand.navy;
export const GOLD = brand.highlight;
export const SLATE = brand.slate;
export const PAPER = "#ffffff";

// Layout (y): chapter tab under SAFE.top (logo tile top-right), the calendar,
// the caption strip, the English line on SAFE.bottom. Sticky notes stick on
// the calendar's right edge, in the column under the logo tile.
export const TAB = { top: SAFE.top + 20, left: SAFE.left, width: 640 };
export const CAL = { left: 104, right: 910, top: 616, head: 124, bottom: 1176 };
export const PAGE_TOP = CAL.top + CAL.head;
export const CAL_W = CAL.right - CAL.left;
export const NOTE = { left: 722, width: 228, top: 772 };
export const CAPTION_BOTTOM = 1394;

// ------------------------------------------------------------------ desk

// Clean off-white desk: a cool white with a warm lamp glow that drifts, a
// faint planner dot grid and a soft shadow where the calendar hangs.
export const DeskBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 50 + 12 * Math.sin(frame / 90);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 1100px 900px at ${x}% 30%, rgba(255,185,56,0.14), transparent 70%),
          linear-gradient(180deg, rgba(0,100,168,0.05), rgba(11,31,61,0.08)), ${PAPER}`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(11,31,61,0.10) 1.4px, transparent 2px)",
          backgroundSize: "36px 36px",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(11,31,61,0.12) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ calendar

const RINGS = 5;

// The binder rings over the header band's top edge.
export const Rings: React.FC<{ left: number; width: number; top: number }> = ({
  left,
  width,
  top,
}) => (
  <>
    {Array.from({ length: RINGS }, (_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: left + ((i + 1) * width) / (RINGS + 1) - 13,
          top: top - 30,
          width: 26,
          height: 58,
          borderRadius: 13,
          border: `7px solid ${SLATE}`,
          borderBottomColor: "transparent",
          boxShadow: "0 4px 6px rgba(0,0,0,0.18)",
        }}
      />
    ))}
  </>
);

// A header band: navy, holes for the rings, a kicker and a line of text.
export const HeaderBand: React.FC<{
  left: number;
  width: number;
  top: number;
  height: number;
  kicker?: string;
  text?: string;
  size?: number;
}> = ({ left, width, top, height, kicker, text, size = 44 }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      boxSizing: "border-box",
      padding: "34px 30px 12px",
      borderRadius: "18px 18px 0 0",
      background: `linear-gradient(180deg, ${NAVY}, ${INK})`,
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    {kicker ? (
      <div
        style={{
          color: GOLD,
          fontWeight: 900,
          fontSize: 26,
          letterSpacing: 4,
          lineHeight: 1.3,
        }}
      >
        {kicker}
      </div>
    ) : null}
    {text ? (
      <div
        style={{
          color: PAPER,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.25,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    ) : null}
  </div>
);

// The calendar's body: header band, rings, a stack of page edges under the
// top page. Children draw on the top page (x/y relative to the page).
export const CalendarShell: React.FC<{
  opacity?: number;
  header: React.ReactNode;
  children?: React.ReactNode;
}> = ({ opacity = 1, header, children }) => (
  <div style={{ position: "absolute", inset: 0, opacity }}>
    {/* page stack: the edges of the pages under the top one */}
    {[3, 2, 1].map((k) => (
      <div
        key={k}
        style={{
          position: "absolute",
          left: CAL.left + k * 3,
          width: CAL_W - k * 6,
          top: PAGE_TOP,
          height: CAL.bottom - PAGE_TOP + k * 6,
          background: PAPER,
          borderRadius: "0 0 14px 14px",
          boxShadow: "0 2px 3px rgba(11,31,61,0.18)",
        }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        left: CAL.left,
        width: CAL_W,
        top: PAGE_TOP,
        height: CAL.bottom - PAGE_TOP,
        background: PAPER,
        borderRadius: "0 0 14px 14px",
        boxShadow: "0 30px 60px rgba(11,31,61,0.22)",
      }}
    />
    {header}
    <div
      style={{
        position: "absolute",
        left: CAL.left,
        width: CAL_W,
        top: PAGE_TOP,
        height: CAL.bottom - PAGE_TOP,
        perspective: 1800,
      }}
    >
      {children}
    </div>
    <Rings left={CAL.left} width={CAL_W} top={CAL.top} />
  </div>
);

// ------------------------------------------------------------------ pages

// One sheet of the pad, filling the page area: white, faint ruled lines.
export const Sheet: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `repeating-linear-gradient(180deg, transparent 0 62px, rgba(0,100,168,0.08) 62px 64px), ${PAPER}`,
      borderRadius: "0 0 14px 14px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      color: NAVY,
      padding: "20px 44px",
      boxSizing: "border-box",
      backfaceVisibility: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

// Page flips down into place from the binding (a new page, 0..1).
export const useFlipIn = (at = 0): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - at,
    fps,
    config: { damping: 15, stiffness: 170, mass: 0.7 },
  });
};

export const flipInStyle = (p: number): React.CSSProperties => ({
  transformOrigin: "50% 0%",
  transform: `rotateX(${interpolate(p, [0, 1], [-88, 0])}deg)`,
  opacity: interpolate(p, [0, 0.15], [0, 1], clamp),
});

// A page torn off: lifts from the bottom and flips up over the binding,
// twisting, with its top edge torn along the perforation (0..1).
export const tearStyle = (p: number): React.CSSProperties => ({
  transformOrigin: "50% 0%",
  transform: `translateY(${-60 * p}px) rotateX(${100 * p}deg) rotateZ(${-7 * p}deg)`,
  opacity: interpolate(p, [0.7, 1], [1, 0], clamp),
  boxShadow: `0 ${30 * p}px ${60 * p}px rgba(11,31,61,${0.35 * p})`,
  clipPath:
    p > 0
      ? `polygon(0 10px, ${Array.from({ length: 23 }, (_, i) => `${(i + 1) * (100 / 24)}% ${i % 2 ? 10 : 2}px`).join(", ")}, 100% 10px, 100% 100%, 0 100%)`
      : undefined,
});

// The shadow a lifting page throws on the page under it.
export const LiftShadow: React.FC<{ p: number }> = ({ p }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: "0 0 14px 14px",
      background: `linear-gradient(180deg, rgba(11,31,61,${0.35 * Math.sin(Math.PI * p)}), transparent 70%)`,
      pointerEvents: "none",
    }}
  />
);

// ------------------------------------------------------------------ marks

// A hand-drawn gold marker ring round a value, drawn from `at`.
export const MarkerCircle: React.FC<{
  w: number;
  h: number;
  at: number;
  color?: string;
}> = ({ w, h, at, color = GOLD }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [at, at + 14], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 2,
  });
  const rx = w / 2;
  const ry = h / 2;
  // An open ellipse that overshoots its start, like a quick marker stroke.
  const d = `M ${rx * 1.9} ${ry * 0.55}
    C ${rx * 2.1} ${ry * 1.6}, ${rx * 1.4} ${ry * 2}, ${rx} ${ry * 1.96}
    C ${rx * 0.2} ${ry * 1.95}, ${rx * -0.05} ${ry * 1.2}, ${rx * 0.06} ${ry * 0.8}
    C ${rx * 0.2} ${ry * 0.1}, ${rx * 1.1} ${ry * -0.05}, ${rx * 1.55} ${ry * 0.12}
    C ${rx * 1.9} ${ry * 0.25}, ${rx * 2} ${ry * 0.5}, ${rx * 1.96} ${ry * 0.75}`;
  const len = Math.PI * (rx + ry) * 1.25;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
        opacity={0.9}
      />
    </svg>
  );
};

// Highlighter swipe behind a word (keywords, the question line).
export const highlight = (on: boolean): React.CSSProperties =>
  on
    ? {
        background: `linear-gradient(180deg, transparent 52%, ${GOLD} 52%, ${GOLD} 92%, transparent 92%)`,
        padding: "0 4px",
        margin: "0 -4px",
      }
    : {};

// ------------------------------------------------------------------ sticky

// A square sticky note stuck on the calendar's right edge; it slaps on with
// a little overshoot and its corner curls. Content is the caller's.
export const StickyNote: React.FC<{
  top: number;
  tilt?: number;
  children: React.ReactNode;
}> = ({ top, tilt = 3, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 190, mass: 0.6 },
  });
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: NOTE.left,
        width: NOTE.width,
        top,
        minHeight: NOTE.width * 0.82,
        boxSizing: "border-box",
        padding: "22px 18px 26px",
        background: `linear-gradient(160deg, ${GOLD} 0%, ${GOLD} 80%, rgba(245,165,36,1) 100%)`,
        clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
        boxShadow: "0 18px 30px rgba(11,31,61,0.28)",
        fontFamily: FONT,
        color: NAVY,
        textAlign: "center",
        opacity: Math.min(1, p * 2, out),
        transform: `rotate(${tilt}deg) scale(${interpolate(p, [0, 1], [1.35, 1])}) translateY(${interpolate(out, [0, 1], [30, 0])}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      {children}
    </div>
  );
};

// ------------------------------------------------------------------ text

// Font size for one line of `text` within `width` (Be Vietnam Pro loaded).
export const fitSize = (
  text: string,
  width: number,
  cap: number,
  weight: 800 | 900 = 900,
) =>
  Math.min(
    cap,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: weight })
      .fontSize,
  );

export const lines = (text: string, width: number, max: number, cap: number) =>
  fitTextOnNLines({
    text,
    maxLines: max,
    maxBoxWidth: width,
    fontFamily: FONT,
    fontWeight: 800,
    maxFontSize: cap,
  }).fontSize;

// Font size for `text` on up to `lines` lines, black weight.
export const fit = (text: string, width: number, lines: number, cap: number) =>
  fitTextOnNLines({
    text,
    maxLines: lines,
    maxBoxWidth: width,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: cap,
  }).fontSize;

// Fade out over a Sequence's last 8 frames.
export const useOut = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
};
