// edit.json `visuals`: library b-roll over the talk, drawn once here so every
// design gets it; a design restyles only the pip/overlay frame (visualFrame).
// Sits above the talk and below the design's Overlay, so captions, cues and
// the end cards stay on top. Footage is muted: Daniel's voice is the only
// audio. Frame 0 is the first word of the talk (like Overlay).
import type React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { KenBurns } from "../elements/KenBurns";
import { FACE, SAFE } from "./golden";
import { PacedVideo } from "./PacedVideo";
import { outFrameOf, type Look, type Reel, type Visual } from "./schema";
import { clamp, retryVideoFetch } from "./style";

const FADE = 6;
const PLAIN_FRAME: React.CSSProperties = {
  borderRadius: 24,
  border: "4px solid #FFFFFF",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
};
// pip: Daniel at 9:16 in the top-right of the 4:5 band, clear of the captions.
const PIP = {
  width: 300,
  height: 533,
  top: SAFE.top,
  right: 1080 - SAFE.right,
};
// overlay: the card fits the column left of his face (golden rule: nothing
// over FACE). ponytail: narrow (~180 px) by design; a wider card would need
// the design's Behind layer, which classic doesn't draw.
const CARD = {
  left: SAFE.left,
  top: FACE.top + 160, // below the stat cards at the top of the band
  width: FACE.left - SAFE.left - 16,
  height: 320,
};

const isVideoAsset = (p: string) => /\.(mp4|webm|mov|m4v)$/i.test(p);

// ponytail: a clip shorter than its visual freezes on its last frame; loop it
// (<Loop> with the clip's duration) if short clips turn up.
const Media: React.FC<{ path: string }> = ({ path }) =>
  isVideoAsset(path) ? (
    <OffthreadVideo
      src={staticFile(path)}
      muted
      {...retryVideoFetch}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  ) : (
    <KenBurns
      src={staticFile(path)}
      toScale={1.12}
      from={{ x: 0.45, y: 0.45 }}
      to={{ x: 0.55, y: 0.55 }}
    />
  );

const Shot: React.FC<{
  v: Visual & { asset: string };
  reel: Reel;
  from: number;
  src: string;
  foreground?: string;
  look?: Look;
  frameStyle: React.CSSProperties;
}> = ({ v, reel, from, src, foreground, look, frameStyle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, FADE, durationInFrames - FADE, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  if (v.mode === "overlay")
    return (
      <div
        style={{
          position: "absolute",
          ...CARD,
          overflow: "hidden",
          ...frameStyle,
          opacity,
          transform: `translateX(${(1 - opacity) * -40}px)`,
        }}
      >
        <Media path={v.asset} />
      </div>
    );
  const end = from + durationInFrames;
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      <Media path={v.asset} />
      {v.mode === "pip" ? (
        <div
          style={{
            position: "absolute",
            ...PIP,
            overflow: "hidden",
            ...frameStyle,
          }}
        >
          {/* Daniel's cut-out, paced like the talk (muted: the talk has the
              voice). No negative Sequence `from` for a segment already
              playing: Remotion would skip that part at rate 1, not seg.rate,
              and the pip would drift from the voice; start the segment later instead. */}
          {reel.timeline.segments
            .filter((s) => s.outFrom < end && s.outFrom + s.outDuration > from)
            .map((s) => {
              const skip = Math.max(0, from - s.outFrom);
              return (
                <Sequence
                  key={s.srcFrom}
                  from={s.outFrom + skip - from}
                  durationInFrames={s.outDuration - skip}
                >
                  {/* relative: paint the cut-out above PacedVideo's absolute backdrop. */}
                  <PacedVideo
                    seg={{
                      ...s,
                      srcFrom: s.srcFrom + skip * s.rate,
                      outDuration: s.outDuration - skip,
                    }}
                    src={src}
                    look={look}
                    foreground={foreground}
                    muted
                    style={{ position: "relative" }}
                  />
                </Sequence>
              );
            })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Visuals: React.FC<{
  reel: Reel;
  src: string;
  foreground?: string;
  frameStyle?: React.CSSProperties;
}> = ({ reel, src, foreground, frameStyle = PLAIN_FRAME }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.visuals ?? []).map((v) => {
        // buildReel rejects unresolved {find} assets before a render.
        if (typeof v.asset !== "string") return null;
        const from = outFrame(v.atMs);
        return (
          <Sequence
            key={`${v.mode}${v.atMs}`}
            from={from}
            durationInFrames={Math.max(1, Math.round((v.durMs / 1000) * fps))}
          >
            <Shot
              v={{ ...v, asset: v.asset }}
              reel={reel}
              from={from}
              src={src}
              foreground={foreground}
              look={reel.edit.look}
              frameStyle={frameStyle}
            />
          </Sequence>
        );
      })}
    </>
  );
};
