// "editorial": magazine-cover authority for explainers, opinion and deep
// dives (design-space.md EDITORIAL). Cream page, navy masthead rule, a giant
// stacked headline standing behind Daniel's cut-out, amber highlighter marks.
import { Underline } from "@remotion/rough-notation";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { brand } from "../../brand/theme";
import type { CoverProps, Design, TalkProps } from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { PacedVideo } from "../../mortgage/PacedVideo";
import {
  FONT,
  LOGO,
  clamp,
  emphasised,
  foregroundOf,
  retryVideoFetch,
} from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import {
  CreamBackdrop,
  HeadlineWatermark,
  INK,
  LOGO_BOX,
  MASTHEAD_BOTTOM,
  MastheadRule,
} from "./Masthead";
import { Behind } from "./Behind";
import { Overlay } from "./Overlay";
import { Outro } from "../classic/Outro";

const HEADLINE_WIDTH = 900;

// Two stacked lines (the cover's giant masthead headline), each filled to the
// page width with @remotion/layout-utils so a short or long title both read
// as a magazine cover, not a shrunk paragraph.
const splitLines = (title: string): string[] => {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return [words.join(" ")];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
};

const Cover: React.FC<CoverProps> = ({
  src,
  coverFrame,
  title,
  subtitle,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const lines = splitLines(title);
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  let wi = 0;
  const underline = interpolate(frame, [10, 32], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <CreamBackdrop />
      <MastheadRule />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: MASTHEAD_BOTTOM + 40,
          width: HEADLINE_WIDTH,
        }}
      >
        {lines.map((line, li) => {
          const size = Math.min(
            160,
            fitText({
              text: line,
              withinWidth: HEADLINE_WIDTH,
              fontFamily: FONT,
              fontWeight: 900,
            }).fontSize,
          );
          return (
            <div
              key={li}
              style={{
                fontWeight: 900,
                fontSize: size,
                letterSpacing: "-0.03em",
                lineHeight: 0.86,
              }}
            >
              {line.split(/\s+/).map((w) => {
                const idx = wi++;
                return (
                  <span
                    key={idx}
                    style={{ color: hit.has(idx) ? brand.primary : INK }}
                  >
                    {w}{" "}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      {/* Daniel's cut-out stands in front of the headline (depth). */}
      <Freeze frame={0}>
        <OffthreadVideo
          src={foregroundOf(src)}
          trimBefore={coverFrame}
          muted
          transparent
          {...retryVideoFetch}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Freeze>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 1920 - SAFE.bottom + 40,
          textAlign: "center",
          fontSize: 46,
          fontWeight: 700,
          color: INK,
        }}
      >
        <Underline
          progress={underline}
          color={`${brand.accent}99`}
          strokeWidth={6}
          iterations={1}
          seed={2}
        >
          <span>{subtitle}</span>
        </Underline>
      </div>
      <div
        style={{
          position: "absolute",
          top: LOGO_BOX.top,
          right: LOGO_BOX.right,
          padding: "14px 20px",
          borderRadius: 18,
          background: "#fff",
          boxShadow: "0 6px 18px rgba(11,31,61,0.2)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

const EDGE_FADE =
  "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, #000 80%, transparent)";

// Framing: 0.85 from the top centre, lifted so his chin (source y ~1400 when
// he leans in) lands at y 1280 and a two-line caption page (top ~1290) sits
// under it, while his eyes (~y 990) stay below a cue panel (bottom ~y 925).
// The smaller layer ends above the frame's bottom and inside its sides, so
// its bottom and side edges fade out instead of cutting hard.
const SCALE = 0.85;
const LIFT = 1280 - 1400 * SCALE;
const FRAMING: React.CSSProperties = {
  transform: `translate(${540 * (1 - SCALE)}px, ${LIFT}px) scale(${SCALE})`,
  transformOrigin: "0 0",
  maskImage: EDGE_FADE,
  WebkitMaskImage: EDGE_FADE,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

// A slow 1.02 zoom drift on Daniel's cut-out over the segment so the frame
// is never perfectly still (golden rule 5b), independent of caption/marker
// pop-ins which cover the same rule for text.
const Talk: React.FC<TalkProps> = ({
  seg,
  index,
  src,
  look,
  foreground,
  behind,
}) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, seg.outDuration], [1, 1.02], clamp);
  return (
    <AbsoluteFill>
      <CreamBackdrop />
      <MastheadRule />
      {index === 0 ? <HeadlineWatermark /> : null}
      {behind}
      <AbsoluteFill
        style={{ transform: `scale(${drift})`, transformOrigin: "50% 65%" }}
      >
        <AbsoluteFill style={FRAMING}>
          <PacedVideo
            seg={seg}
            src={src}
            look={look}
            foreground={foreground}
            backdrop="none"
            style={{ objectFit: "cover" }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const editorial: Design = {
  id: "editorial",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "FINANCE HUB",
    "GÓC NHÌN",
    "CON SỐ",
    "NGÂN HÀNG",
    "được nhắc tới trong đoạn này",
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Daniel Nguyen",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
