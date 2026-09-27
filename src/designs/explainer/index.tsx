// "explainer": a teacher at a whiteboard (design-space.md EXPLAINER). Daniel
// plays in a taped-on card over ruled paper; captions are marker on the page;
// numbers go on sticky notes; everything draws itself in pen.
import { Box, Circle, Highlight, Underline } from "@remotion/rough-notation";
import { evolvePath } from "@remotion/paths";
import { Star } from "@remotion/shapes";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BadgeRow } from "../../brand/BadgeRow";
import { brand } from "../../brand/theme";
import type { CoverProps, Design, TalkProps } from "../../mortgage/design";
import { SAFE } from "../../mortgage/golden";
import { CoverCutOut, PacedVideo } from "../../mortgage/PacedVideo";
import { CTA_BUTTON } from "../../mortgage/schema";
import {
  FONT,
  LOGO,
  clamp,
  emphasised,
  enter,
} from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { Oscilloscope } from "../../elements/Oscilloscope";
import { Overlay } from "./Overlay";
import { INK, MARKER, NOTE, Paper, PencilLine } from "./Paper";

// The talking-head card; captions use the paper below it (Overlay.tsx).
const CARD = { left: 70, top: 150, width: 940, height: 1150, border: 14 };

const Tape: React.FC<{ left: number; top: number; rotate: number }> = ({
  left,
  top,
  rotate,
}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: 190,
      height: 54,
      background: "rgba(255,224,138,0.8)",
      transform: `rotate(${rotate}deg)`,
      boxShadow: "0 4px 10px rgba(11,31,61,0.15)",
    }}
  />
);

// Cuts alternate between a wide and a closer framing inside the card, each
// landing with a small spring punch, so jump cuts read as intentional.
const Talk: React.FC<TalkProps> = ({
  seg,
  index,
  src,
  look,
  foreground,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const base =
    index === 0
      ? interpolate(frame, [0, 24], [1.2, 1], clamp)
      : seg.zoomed
        ? 1.1
        : 1.0;
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        0.04;
  return (
    <AbsoluteFill>
      <Paper />
      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top: CARD.top,
          width: CARD.width,
          height: CARD.height,
          border: `${CARD.border}px solid #fff`,
          boxShadow: "0 24px 50px rgba(11,31,61,0.3)",
          transform: "rotate(-1deg)",
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        {/* 360 px taller than the card (clipped at its bottom): the cover
            crop takes less off the top, so his head sits ~180 px lower, eyes
            below the notes band (Paper.tsx BAND). A wrapper, not the video's
            style, which the graded <Video> does not size by. The punch-in
            zooms around his face so the chin stays in the card. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "calc(100% + 360px)",
          }}
        >
          <PacedVideo
            seg={seg}
            src={src}
            look={look}
            foreground={foreground}
            style={{
              transform: `scale(${base + punch})`,
              transformOrigin: "50% 60%",
            }}
          />
        </div>
      </div>
      <Tape left={20} top={120} rotate={-28} />
      <Tape left={880} top={120} rotate={24} />
      {/* Daniel's voice as a pencil-blue line on the paper under the
          captions, following the paced source (not the output clock). */}
      <div style={{ position: "absolute", left: 90, top: 1560 }}>
        <Oscilloscope
          src={src}
          frame={seg.srcFrom + frame * seg.rate}
          width={900}
          height={200}
          lineWidth={5}
          amplitude={2.5}
        />
      </div>
    </AbsoluteFill>
  );
};

// The cover's pen-circled porthole (was 580 at y 900, which ran past
// SAFE.bottom once the title moved down to SAFE.top).
// Its pen circle reaches ~110 px above and ~120 px below the photo.
const PORTHOLE = { top: 940, size: 320 };

// A hand-drawn arrow from the title down to Daniel's face.
const ARROW =
  "M 300 0 C 180 90, 170 200, 250 300 M 250 300 L 205 262 M 250 300 L 262 245";

// Whiteboard-sketch cover: title in ink with its keywords marked, Daniel's
// frozen frame in a pen-circled porthole, an arrow drawn between them.
const Cover: React.FC<CoverProps> = ({
  src,
  coverFrame,
  title,
  subtitle,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = Math.round(
    // Smaller than before (118/112/78) so the title, from SAFE.top, ends
    // above the porthole's pen circle.
    Math.min(100, Math.max(72, 96 * Math.sqrt(40 / title.length))),
  );
  const face = enter(frame, fps, 4);
  const arrow = evolvePath(interpolate(frame, [18, 40], [0, 1], clamp), ARROW);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: INK }}>
      <Paper />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: 90,
          right: 1080 - SAFE.right,
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 22px",
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.3,
        }}
      >
        {words.map((w, i) =>
          hit.has(i) ? (
            <Highlight
              key={i}
              progress={interpolate(
                frame,
                [6 + i * 3, 18 + i * 3],
                [0, 1],
                clamp,
              )}
              color={MARKER}
              iterations={1}
              seed={i + 1}
            >
              <span style={{ color: brand.primary }}>{w}</span>
            </Highlight>
          ) : (
            <span key={i}>{w}</span>
          ),
        )}
      </div>
      <div style={{ position: "absolute", left: 830, top: 90 }}>
        <Star
          points={5}
          innerRadius={20}
          outerRadius={46}
          cornerRadius={6}
          fill={brand.accent}
          style={{ transform: `rotate(${frame * 2}deg) scale(${face})` }}
        />
      </div>
      {/* Title from SAFE.top, porthole under it, credit on SAFE.bottom:
          the arrow is drawn at 0.7 scale in the gap left of the porthole. */}
      <svg
        width={400}
        height={320}
        style={{
          position: "absolute",
          left: 40,
          top: PORTHOLE.top - 20,
          transform: "scale(0.7)",
          transformOrigin: "0 0",
        }}
      >
        <path
          d={ARROW}
          fill="none"
          stroke={INK}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={arrow.strokeDasharray}
          strokeDashoffset={arrow.strokeDashoffset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: (1080 - PORTHOLE.size) / 2,
          top: PORTHOLE.top,
          transform: `scale(${face})`,
        }}
      >
        <Circle
          progress={interpolate(frame, [20, 45], [0, 1], clamp)}
          color="#D2342A"
          strokeWidth={7}
          iterations={2}
          seed={9}
          padding={{ left: 22, right: 22, top: 22, bottom: 22 }}
        >
          <div
            style={{
              width: PORTHOLE.size,
              height: PORTHOLE.size,
              borderRadius: "50%",
              overflow: "hidden",
              border: "10px solid #fff",
            }}
          >
            <CoverCutOut
              room
              src={src}
              trimBefore={coverFrame}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </Circle>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 1920 - SAFE.bottom,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 46,
          fontWeight: 700,
        }}
      >
        <Underline
          progress={interpolate(frame, [30, 50], [0, 1], clamp)}
          color={brand.accent}
          strokeWidth={5}
          iterations={2}
          seed={4}
        >
          <span>{subtitle}</span>
        </Underline>
      </div>
    </AbsoluteFill>
  );
};

const CONTACTS: [string, string][] = [
  ["Điện thoại", "0430 11 11 88"],
  ["Email", "daniel@finhub.net.au"],
  ["Website", "finhub.net.au"],
];

// Sign-off on the page: the question underlined in pen, the CTA boxed, the
// contact list on a sticky note, badges on their white card.
const Outro: React.FC<{ question: string }> = ({ question }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps, 4);
  const c = enter(frame, fps, 26);
  return (
    <AbsoluteFill
      style={{ fontFamily: FONT, color: INK, alignItems: "center" }}
    >
      <Paper />
      <Img
        src={LOGO}
        style={{ position: "absolute", top: 150, height: 150, opacity: a }}
      />
      {/* The question wraps, so it gets a pencil line under the block
          rather than a rough underline (which can't wrap). */}
      <div
        style={{
          position: "absolute",
          top: 380,
          width: 880,
          textAlign: "center",
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1.3,
          opacity: a,
        }}
      >
        {question}
        <div
          style={{ marginTop: 18, display: "flex", justifyContent: "center" }}
        >
          <PencilLine
            progress={interpolate(frame, [12, 32], [0, 1], clamp)}
            width={560}
            seed="outro"
            color={brand.accent}
            strokeWidth={7}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 720,
          fontSize: 52,
          fontWeight: 800,
          color: brand.primary,
        }}
      >
        <Box
          progress={interpolate(frame, [20, 40], [0, 1], clamp)}
          color={brand.primary}
          strokeWidth={5}
          iterations={2}
          seed={6}
          padding={{ left: 26, right: 26, top: 14, bottom: 14 }}
        >
          <span>{CTA_BUTTON}</span>
        </Box>
      </div>
      <div
        style={{
          position: "absolute",
          top: 930,
          width: 820,
          background: NOTE,
          padding: "36px 48px",
          transform: `rotate(1.5deg) translateY(${interpolate(c, [0, 1], [60, 0])}px)`,
          opacity: c,
          boxShadow: "0 18px 40px rgba(11,31,61,0.25)",
          fontSize: 44,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: 54, fontWeight: 900 }}>Daniel Nguyen</div>
        {CONTACTS.map(([label, value]) => (
          <div key={label}>
            <span style={{ fontWeight: 600 }}>{label}: </span>
            <span style={{ fontWeight: 800 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 150, opacity: c }}>
        <BadgeRow height={90} />
      </div>
    </AbsoluteFill>
  );
};

export const explainer: Design = {
  id: "explainer",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Daniel Nguyen",
    ...CONTACTS.flat(),
  ],
};
