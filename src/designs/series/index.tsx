// "series": Meta Series hub episodes — a persistent amber strip naming the
// episode, a right-hand sidebar tracking the numbers Daniel says and the banks
// he names, and a numbered cover. Cues, hook entrance and outro reuse existing,
// already-compliant pieces; this design's own job is the strip/sidebar/cover.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { SAFE, figuresOf, lenderMentionsOf } from "../../mortgage/golden";
import {
  CUE_HEAD_Y,
  CUE_SCALE,
  HEAD_Y,
  useCueRoom,
} from "../../mortgage/cueRoom";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { FONT, foregroundOf, retryVideoFetch } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { SocialHandle } from "../../elements/SocialHandle";
import { StaggerTitle } from "../../elements/StaggerTitle";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { SeriesCaptions } from "./Captions";
import { parseEpisode, stripLine } from "./episode";
import {
  AutoFigureCard,
  LenderTracker,
  Tracker,
  useSidebarFade,
} from "./Sidebar";
import { Strip, StripBar, StripLogo } from "./Strip";
import { SeriesBackdrop } from "./Waves";

const HOOK_FRAMES = 105;
const HANDLE = "@financehub.au";
// Classic's Panel-based cues sit at top 110 natively; shift them to land at
// SAFE.top + 70 (just below the strip, matching the LogoMark's own offset).
const CUE_PANEL_SHIFT = SAFE.top + 70 - 110;

// A ring showing the episode number, adapted from elements/CountdownRing:
// the same ring-and-number look, but static — a cover doesn't count down.
const EpisodeRing: React.FC<{ number?: number }> = ({ number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const draw = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={brand.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - draw)}
        />
      </svg>
      {number !== undefined ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontSize: size * 0.4,
            fontWeight: 900,
            color: "#fff",
          }}
        >
          {number}
        </div>
      ) : null}
    </div>
  );
};

// Backdrop + strip; a ring with the episode number; the title stacked white
// 900 with its last word in brand.highlight; the handle under it; Daniel
// bottom-left as a still cut-out, kept short enough to clear the title.
const Cover: React.FC<CoverProps> = ({ src, coverFrame, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const episode = parseEpisode(subtitle);
  const words = title.split(/\s+/).filter(Boolean);
  const size = Math.min(
    84,
    fitText({
      text: title,
      withinWidth: 860,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const p = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
    delay: 10,
  });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SeriesBackdrop />
      <StripBar text={stripLine(subtitle)} />
      <StripLogo />
      {/* Under the strip (SAFE.top..+60), left of the logo tile. */}
      <div style={{ position: "absolute", left: 60, top: SAFE.top + 90 }}>
        <EpisodeRing number={episode?.ep} />
      </div>
      {/* Title and handle in one flow, below the ring and the logo tile
          (which ends at SAFE.top + 218), so neither can run under the tile
          however many lines the title takes. */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 1080 - SAFE.right,
          top: SAFE.top + 320,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.15,
            color: "#fff",
            opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
          }}
        >
          {words.map((w, i) => (
            <span
              key={`${w}${i}`}
              style={{
                color: i === words.length - 1 ? brand.highlight : "#fff",
              }}
            >
              {w}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 30 }}>
          <SocialHandle platform="facebook" handle={HANDLE} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 680,
          height: 850,
        }}
      >
        <Freeze frame={0}>
          <OffthreadVideo
            src={foregroundOf(src)}
            trimBefore={coverFrame}
            muted
            transparent
            {...retryVideoFetch}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom left",
            }}
          />
        </Freeze>
      </div>
    </AbsoluteFill>
  );
};

// Daniel at 0.63 from the left edge (x 0-684, the sidebar at x 700-960 stays
// free), lifted so his chin (source y ~1400 when he leans in) lands at
// CHIN_Y: a caption page (x 400-960, top ~1290 for two lines) sits under it.
// The layer ends above the frame's bottom and short of the sidebar, so its
// right and bottom edges fade out instead of cutting hard.
const SCALE = 0.633;
const CHIN_Y = 1280;
const EDGE_FADE =
  "linear-gradient(to right, #000 88%, transparent), linear-gradient(to bottom, #000 80%, transparent)";
// k (useCueRoom, 0..1) eases him to CUE_SCALE (face centre kept at x 342)
// with his hair line (source HEAD_Y) under the cue panel, which sits 70 px
// lower here (CUE_PANEL_SHIFT), so his eyebrows clear it (golden rule 3b).
// He is already small, so the framing moves rather than cueRoomStyle.
const CUE_HAIR_Y = CUE_HEAD_Y + 70;
const framing = (k: number): React.CSSProperties => {
  const s = interpolate(k, [0, 1], [SCALE, CUE_SCALE]);
  const hair = interpolate(
    k,
    [0, 1],
    [CHIN_Y - (1400 - HEAD_Y) * SCALE, CUE_HAIR_Y],
  );
  return {
    transform: `translate(${540 * (SCALE - s)}px, ${hair - HEAD_Y * s}px) scale(${s})`,
    transformOrigin: "0 0",
    maskImage: EDGE_FADE,
    WebkitMaskImage: EDGE_FADE,
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
};

// Backdrop behind Daniel's cut-out (backdrop="none"); a small punch-in per
// cut, centred on his chin line so the caption gap holds.
const Talk: React.FC<TalkProps> = ({
  seg,
  index,
  src,
  look,
  foreground,
  behind,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 260 } })) *
        0.04;
  const room = useCueRoom(seg);
  return (
    <AbsoluteFill>
      <SeriesBackdrop />
      {behind}
      <AbsoluteFill
        style={{
          transform: `scale(${1 + punch})`,
          transformOrigin: `${540 * SCALE}px ${CHIN_Y}px`,
        }}
      >
        <AbsoluteFill style={framing(room)}>
          <PacedVideo
            seg={seg}
            src={src}
            look={look}
            foreground={foreground}
            backdrop="none"
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const hook = reel.edit.hook;
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack reel={reel} panelOffset={CUE_PANEL_SHIFT} />
      <Strip reel={reel} episodeLine={stripLine(reel.edit.subtitle)} />
      <LogoMark talkFrames={talkFrames} style={{ top: SAFE.top + 70 }} />
      <SeriesCaptions reel={reel} keywords={keywords} />
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <div
            style={{
              position: "absolute",
              left: 60,
              top: SAFE.top - 20,
              right: 340,
            }}
          >
            <StaggerTitle text={hook.big} fontSize={70} color="#fff" />
            {hook.sub ? (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: FONT,
                  fontSize: 32,
                  color: brand.textDim,
                }}
              >
                {hook.sub}
              </div>
            ) : null}
          </div>
        </Sequence>
      ) : null}
    </>
  );
};

// Charts drawn between the backdrop and Daniel's cut-out (golden rule 3b):
// the journey tracker, the auto-figure counter card and the "seen so far"
// lender stack. The sidebar sits at x 620-960, right of his head (x 0-684
// layer, face x ~200-490), so he barely reaches it — but this keeps it behind him, and
// fades it out while a cue card is up so the two never fight for space.
const Behind: React.FC<OverlayProps> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const figures = figuresOf(reel, fps);
  const mentions = lenderMentionsOf(reel);
  const fade = useSidebarFade(reel);
  return (
    <div style={{ opacity: fade }}>
      <Tracker reel={reel} />
      <LenderTracker mentions={mentions} />
      {figures
        .filter((f) => f.source === "auto")
        .map((f) => (
          <Sequence
            key={f.fromFrame}
            from={f.fromFrame}
            durationInFrames={f.frames}
          >
            <AutoFigureCard big={f.big} label={f.label} />
          </Sequence>
        ))}
    </div>
  );
};

export const series: Design = {
  id: "series",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "TẬP",
    "PHẦN",
    "HÀNH TRÌNH",
    "ĐÃ NHẮC TỚI",
    "ví dụ minh hoạ",
    HANDLE,
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
