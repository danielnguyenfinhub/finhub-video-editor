// "scenario": "Scenario Split — Nếu... thì..." — option A and option B side
// by side, inputs typed in live, the outcome drawn as Daniel talks. Highest
// compliance care of all templates: every figure is labelled illustrative,
// and the verdict never says "best" / "tốt nhất".
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Freeze,
  Img,
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
import {
  LOGO_HEIGHT,
  SAFE,
  figuresOf,
  lenderMentionsOf,
} from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import type { Cue } from "../../mortgage/schema";
import { outFrameOf } from "../../mortgage/schema";
import { chapterTransition } from "../../mortgage/transitions";
import {
  FONT,
  LOGO,
  enter,
  foregroundOf,
  retryVideoFetch,
} from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { SplitBackdrop } from "./Backdrop";
import { IdlePlaceholders, ScenarioCompare } from "./Compare";
import {
  ChapterStrip,
  FigureCard,
  ILLUSTRATIVE,
  LenderChip,
  ScenarioHook,
} from "./Pieces";
import { ScenarioPillCaptions } from "./PillCaptions";

const HOOK_FRAMES = 105;
const LOGO_BOX: React.CSSProperties = {
  position: "absolute",
  top: SAFE.top,
  right: 1080 - SAFE.right,
  padding: "10px 16px",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
};

// Daniel at 0.6, centred, lifted so his chin (source y ~1440 when he leans
// in) lands at CHIN_Y: a two-line caption page (top ~1290) sits under it,
// and his head (top ~y 800) stays under the compare columns' rows and the
// figure card's label. The layer's sides and bottom end inside the frame, so
// they fade out instead of cutting hard across his shoulders.
const SCALE = 0.6;
const CHIN_Y = 1270;
const EDGE_FADE =
  "linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, #000 78%, transparent)";
const FRAMING: React.CSSProperties = {
  transform: `translate(${540 * (1 - SCALE)}px, ${CHIN_Y - 1440 * SCALE}px) scale(${SCALE})`,
  transformOrigin: "0 0",
  maskImage: EDGE_FADE,
  WebkitMaskImage: EDGE_FADE,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};
// The cover still: his whole 9:16 frame, 950 tall, bottom-centre.
const COVER_H = 950;
const COVER_W = (COVER_H * 1080) / 1920;

// Same split as the talk: "A"/"B" headers top-left/top-right, the title
// centred over the divider, Daniel's cut-out bottom-centre.
const Cover: React.FC<CoverProps> = ({ src, coverFrame, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = enter(frame, fps, 4);
  const subIn = enter(frame, fps, 10);
  const size = Math.min(
    84,
    fitText({
      text: title,
      withinWidth: SAFE.right - SAFE.left,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SplitBackdrop />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top + 10,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 8,
          color: brand.accent,
        }}
      >
        A
      </div>
      {/* Under LogoMark's tile (golden rule: y >= SAFE.top + 170) so the two
          never overlap. */}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 170,
          right: 1080 - SAFE.right,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 8,
          color: brand.accent,
        }}
      >
        B
      </div>
      {/* One flow container so the subtitle always lands below the title,
          however many lines the title wraps to. */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          right: 1080 - SAFE.right,
          top: 760,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.15,
            textShadow: "0 6px 24px rgba(0,0,0,0.55)",
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 22,
            color: brand.accent,
            fontSize: 40,
            fontWeight: 800,
            opacity: subIn,
          }}
        >
          {subtitle}
        </div>
      </div>
      {/* Sized to the video's own 9:16 box so the edge fade lands on the
          cut-out's sides, not on empty letterbox. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: COVER_W,
          height: COVER_H,
          marginLeft: -COVER_W / 2,
          maskImage: EDGE_FADE,
          WebkitMaskImage: EDGE_FADE,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        <Freeze frame={0}>
          <OffthreadVideo
            src={foregroundOf(src)}
            trimBefore={coverFrame}
            muted
            transparent
            {...retryVideoFetch}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </Freeze>
      </div>
      <div style={LOGO_BOX}>
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

// The split backdrop behind Daniel, who straddles the divider. The divider nudges
// left or right on every cut (a fresh spring each time Talk remounts). The
// design's Behind layer (charts, columns, bank chips) renders between the
// backdrop and Daniel's cut-out so it never covers his face.
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
        0.05;
  return (
    <AbsoluteFill style={{ backgroundColor: brand.background }}>
      <SplitBackdrop seed={index} />
      {behind}
      <AbsoluteFill
        style={{
          transform: `scale(${1 + punch})`,
          transformOrigin: `50% ${CHIN_Y}px`,
        }}
      >
        <AbsoluteFill style={FRAMING}>
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

const isCompare = (c: Cue): c is Extract<Cue, { kind: "compare" }> =>
  c.kind === "compare";

// Charts BEHIND Daniel (golden rule 3b): the two-column compare table, its
// A/B header chips (bank logo or idle placeholder) and every figuresOf figure
// card. Hidden during the hook (frame < HOOK_FRAMES) since the hook and the
// columns share the top of SAFE.
const Behind: React.FC<OverlayProps> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const outFrame = outFrameOf(reel.timeline, fps);
  if (reel.edit.hook && frame < HOOK_FRAMES) return null;
  const compareCues = (reel.edit.cues ?? []).filter(isCompare);
  const hasCompare = compareCues.length > 0;
  // Idle "A"/"B" placeholders sit in the same column region another cue
  // (kinetic, bars, verdict, venn, emoji, lenders) uses for its panel, so
  // they hide whenever ANY cue is on screen, not only while a compare cue
  // itself is active.
  const anyCueActive = (reel.edit.cues ?? []).some(
    (c) => frame >= outFrame(c.fromMs) && frame < outFrame(c.toMs),
  );
  const figures = figuresOf(reel, fps);
  const mentions = lenderMentionsOf(reel);
  // A figure card spans the same y590 row as the idle "B" placeholder
  // (both share the top of SAFE): hide the placeholders while one is up too,
  // not only while a cue is.
  const anyFigureActive = figures.some(
    (f) => frame >= f.fromFrame && frame < f.fromFrame + f.frames,
  );
  return (
    <>
      {compareCues.map((c) => {
        const from = outFrame(c.fromMs);
        const dur = Math.max(1, outFrame(c.toMs) - from);
        return (
          <Sequence
            key={`cmp${c.fromMs}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            <ScenarioCompare cue={c} rel={(ms) => outFrame(ms) - from} />
          </Sequence>
        );
      })}
      {hasCompare && !anyCueActive && !anyFigureActive ? (
        <IdlePlaceholders />
      ) : null}
      {figures.map((f) => (
        <Sequence
          key={`${f.fromFrame}${f.source}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          <FigureCard figure={f} />
        </Sequence>
      ))}
      {mentions.map((m, i) => (
        <Sequence
          key={`${m.lender.name}${m.startMs}`}
          from={Math.round((m.startMs / 1000) * fps)}
          durationInFrames={Math.round(((m.endMs - m.startMs) / 1000) * fps)}
          layout="none"
        >
          <LenderChip lender={m.lender} slot={i % 2 === 0 ? "a" : "b"} />
        </Sequence>
      ))}
    </>
  );
};

// Captions, hook, chapter strip and cue cards (kinetic/bars/verdict/venn/
// emoji/lenders, via MotionTrack) — everything drawn IN FRONT of Daniel.
// MotionTrack's Panel is fixed at top:110 (classic/Infographics.tsx, not
// ours to edit); translateY(SAFE.top - 110) carries it down to the new SAFE
// band without touching that file.
const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const outFrame = outFrameOf(reel.timeline, fps);
  // The hook's big number sits centred across the same top-of-SAFE row as
  // LogoMark's tile: hide the logo while the hook is up (same "share the
  // top, hide the other one" rule as the hook vs. the columns).
  const hookUp = Boolean(reel.edit.hook) && frame < HOOK_FRAMES;
  return (
    <>
      {/* Cue panels shifted into the safe band; grain stays full-frame. */}
      <MotionTrack
          reel={{
            ...reel,
            edit: {
              ...reel.edit,
              cues: reel.edit.cues?.filter((c) => c.kind !== "compare"),
            },
          }} panelOffset={SAFE.top - 110} />
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={Math.max(0, outFrame(c.atMs))}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <ChapterStrip index={i} title={c.title} />
        </Sequence>
      ))}
      <ScenarioPillCaptions reel={reel} keywords={keywords} />
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <ScenarioHook hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {hookUp ? null : <LogoMark talkFrames={talkFrames} />}
    </>
  );
};

export const scenario: Design = {
  id: "scenario",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "A",
    "B",
    ILLUSTRATIVE,
    "PHẦN",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
