// "editorial": magazine-cover authority for explainers, opinion and deep
// dives (design-space.md EDITORIAL). Cream page, navy masthead rule, a giant
// stacked headline standing behind Daniel's cut-out, amber highlighter marks.
import { Underline } from "@remotion/rough-notation";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { CoverProps, Design, TalkProps } from "../../mortgage/design";
import { cueRoomStyle, useCueRoom } from "../../mortgage/cueRoom";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { CoverCutOut, PacedVideo } from "../../mortgage/PacedVideo";
import type { Reel } from "../../mortgage/schema";
import {
  FONT,
  LOGO,
  clamp,
  emphasised,
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
import { panelBottomAt } from "./RoomCues";
import { Outro } from "../classic/Outro";

const HEADLINE_WIDTH = 900;
// Cover cut-out size: his hair line (source y ~600) lands near y 1075, under
// a two-line headline plus standfirst (~y 690-1000).
const COVER_CUTOUT_SCALE = 0.64;
// Line cap so two lines + standfirst end above his head (~y 1000).
const COVER_LINE_MAX = 130;
// Room cover: the photo's top edge at y ~1010, under the standfirst; the
// clip is in the frame's own (unscaled) pixels.
const COVER_PHOTO_TOP = 1010;
const COVER_PHOTO_CLIP =
  (COVER_PHOTO_TOP - 1920 * (1 - COVER_CUTOUT_SCALE)) / COVER_CUTOUT_SCALE;

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
  foreground,
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
            COVER_LINE_MAX,
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
                // fitText sizes the line to one row; never let it rewrap.
                whiteSpace: "nowrap",
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
        {/* The subtitle is the headline's standfirst, under it in the same
            column, so no cover text sits behind Daniel. */}
        <div
          style={{
            marginTop: 26,
            fontSize: 40,
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
      </div>
      {/* Daniel stands below the headline, scaled from the bottom edge so
          his head starts under the text (the whole title reads as a
          thumbnail) and his face ends inside SAFE.bottom. The cut-out (or
          quick mode's framed full frame), or with "background": "room" the
          recorded frame as a photo clipped under the standfirst (the room
          above it would sit behind the text). */}
      <CoverCutOut
        src={src}
        trimBefore={coverFrame}
        room={!foreground}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${COVER_CUTOUT_SCALE})`,
          transformOrigin: "50% 100%",
          clipPath: foreground
            ? undefined
            : `inset(${COVER_PHOTO_CLIP}px 0 0 0 round 28px)`,
        }}
      />
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
// under it; Talk makes room under a cue panel (useCueRoom, "cueRoom": true).
// The smaller layer ends above the frame's bottom and inside its sides, so
// its bottom and side edges fade out instead of cutting hard.
// cueRoomStyle lands the point at `headY` on CUE_HEAD_Y. At this design's
// 0.85 framing he ends at ~0.47 (not classic's 0.55), so his eyebrows sit
// closer under his hair line and a leaning-in frame put them at the panel's
// edge. Passing a headY 110 px above his hair line lands the hair line
// 0.55 * 110 ~ 60 px lower (y ~860): eyebrows ~y 1010, mouth ~y 1230.
const CUE_DROP = 110;
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

// "background": "room": the full frame is opaque, so it becomes a photo on
// the page, smaller (0.7) and clipped just under the masthead rule, so the
// masthead, hook and chapter line stay on cream above it, never on the room
// or on his head. Scaled so his mouth (source y ~1275) stays at ~y 1175,
// above the caption strip; his hair line (source ~600) lands at ~y 700.
const ROOM_SCALE = 0.7;
const ROOM_LIFT = 1175 - 1275 * ROOM_SCALE;
const ROOM_CLIP = (MASTHEAD_BOTTOM + 10 - ROOM_LIFT) / ROOM_SCALE;
// While a cue panel is up nothing may cover his head (Daniel's review), and
// captions must not cover his mouth (QC). RoomCues knows each panel's bottom
// edge per frame (panelBottomAt), so the photo's top (clipped ~60 source px
// above his hair) sits GAP under it, and the photo is only as small as it must
// be to keep his lower lip (source ~1400 leaning in) above LIP_MAX, over the top of a
// two-line caption page (~y 1276). A short panel (verdict, compare) leaves
// him at the full 0.7. cueRoomStyle is not used in room mode.
const GAP = 26;
const LIP = 1400; // his lower lip when he leans in (measured on frame 3030)
const LIP_MAX = 1245;
const ROOM_TOP = ROOM_LIFT + ROOM_CLIP * ROOM_SCALE;
const roomFraming = (panelBottom: number): React.CSSProperties => {
  const top = Math.max(ROOM_TOP, panelBottom + GAP);
  const scale = Math.min(ROOM_SCALE, (LIP_MAX - top) / (LIP - ROOM_CLIP));
  return {
    ...FRAMING,
    transform: `translate(${540 * (1 - scale)}px, ${top - ROOM_CLIP * scale}px) scale(${scale})`,
    clipPath: `inset(${ROOM_CLIP}px 0 0 0)`,
  };
};

const useRoomPanelBottom = (seg: TalkProps["seg"]): number => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  return reel ? panelBottomAt(reel, seg.outFrom + frame, fps) : 0;
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
  const room = useCueRoom(seg);
  const panelBottom = useRoomPanelBottom(seg);
  return (
    <AbsoluteFill>
      <CreamBackdrop />
      {/* The masthead fades out under a cue panel (panels are see-through). */}
      <AbsoluteFill style={{ opacity: 1 - room }}>
        <MastheadRule />
      </AbsoluteFill>
      {index === 0 ? <HeadlineWatermark /> : null}
      {/* Figures go behind his cut-out; the room video is opaque, so they
          are drawn in front of it (below), in the band above his head. */}
      {foreground ? behind : null}
      {/* Make room under a cue panel (golden rule 3b). The drift zooms his
          hair line around y 1248. */}
      <AbsoluteFill
        style={
          foreground ? cueRoomStyle(room, 1248 - 648 * drift - CUE_DROP) : {}
        }
      >
        <AbsoluteFill
          style={{ transform: `scale(${drift})`, transformOrigin: "50% 65%" }}
        >
          <AbsoluteFill style={foreground ? FRAMING : roomFraming(panelBottom)}>
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
      {foreground ? null : behind}
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
    "NĂM",
    "NGÀY",
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
