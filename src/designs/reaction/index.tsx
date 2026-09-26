// "reaction" — Reaction Desk (Anh Daniel đọc tin): Daniel reacts to a generic
// artefact card that fills the top of the frame, cut out bottom-right at
// ~62% scale. See src/designs/README.md for the design contract.
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
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { figuresOf, lenderMentionsOf, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { foregroundOf, retryVideoFetch } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { Artefact, ArtefactCover } from "./Artefact";
import { ReactionCaptions } from "./Captions";
import { Backdrop, HookText, LenderTag, LogoBadge, SoWhatCard } from "./Pieces";

const HOOK_FRAMES = 105;
// Daniel's cut-out, anchored bottom-right at ~62% scale — the same transform
// on the Cover and every Talk segment, so the cut to Talk reads as continuous.
const CUTOUT_STYLE = {
  transform: "scale(0.62)",
  transformOrigin: "100% 100%",
} as const;

const Cover: React.FC<CoverProps> = ({ src, coverFrame, title, subtitle }) => (
  <AbsoluteFill>
    <Backdrop />
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
          objectFit: "cover",
          ...CUTOUT_STYLE,
        }}
      />
    </Freeze>
    <ArtefactCover title={title} subtitle={subtitle} />
    <LogoBadge />
  </AbsoluteFill>
);

// backdrop="none": this design draws its own navy backdrop behind Daniel's
// cut-out, scaled and anchored to the bottom-right so the whole talk keeps
// the top of the frame free for the artefact. `behind` (the Behind layer,
// wired by the core) renders between the backdrop and the cut-out, so the
// artefact card sits behind him — his cut-out overlaps its bottom-right
// corner, which is the intended green-screen look.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Golden rule 5b: a visual change every 1.5-3s. The artefact's own Ken
  // Burns push is slow, so give Daniel a quick punch-in of his own at the
  // start of every cut instead of leaving him static between chart beats.
  const punch = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  const scale = interpolate(punch, [0, 1], [0.6, 0.62]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1F3D" }}>
      <Backdrop />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
        style={{ transform: `scale(${scale})`, transformOrigin: "100% 100%" }}
      />
    </AbsoluteFill>
  );
};

// Charts BEHIND him (golden rule 3b): the artefact card and every so-what
// figure card render here, between the backdrop and his cut-out.
const Behind: React.FC<OverlayProps> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Artefact reel={reel} />
      {figuresOf(reel, fps).map((f) => (
        <Sequence
          key={`${f.fromFrame}${f.big}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
        >
          <SoWhatCard figure={f} />
        </Sequence>
      ))}
    </>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {/* Cue panels at the top of SAFE, in the artefact's place (the
          artefact steps out while a cue is up, Artefact.tsx cueUp), above
          his cut-out; grain stays full-frame. The old offset (his face
          bottom - 110) put them at y 1300+, over captions and off frame. */}
      <MotionTrack reel={reel} panelOffset={SAFE.top - 110} />
      {lenderMentionsOf(reel).map((m) => {
        // Mentions are already on the talk timeline (ms), not source ms:
        // passing them through outFrame shifted the tag past the mention.
        const from = Math.round((m.startMs / 1000) * fps);
        const to = Math.round((m.endMs / 1000) * fps);
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={Math.max(1, to - from)}
          >
            <LenderTag lender={m.lender} />
          </Sequence>
        );
      })}
      <ReactionCaptions reel={reel} keywords={keywords} />
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <HookText big={reel.edit.hook.big} sub={reel.edit.hook.sub} />
        </Sequence>
      ) : null}
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const reaction: Design = {
  id: "reaction",
  Cover,
  Talk,
  Overlay,
  Behind,
  Outro,
  chapterTransition,
  copy: [
    "PHẦN",
    "NGHĨA LÀ",
    "· được nhắc",
    "VS",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
    "Daniel Nguyen",
  ],
};
