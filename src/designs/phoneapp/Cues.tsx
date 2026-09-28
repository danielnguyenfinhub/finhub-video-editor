// "phoneapp" cue pages: a cue pushes a new page onto the app (slides in from
// the right, slides back out at its end). Points are a checklist: each item
// slides up when said and its box is tapped and ticked, a progress bar fills.
// Compare is two app cards side by side with "VS" between them, each value
// with a bar sized against the other, and the question as a gold banner.
// Every other cue kind goes to classic MotionTrack (index.tsx).
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp, enter } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  CONTENT,
  Card,
  Check,
  GOLD,
  INK,
  MUTED,
  PAGE_TOP,
  Ripple,
  alpha,
} from "./Phone";
import { isOwnCue, type OwnCue } from "./plan";
import { ComparePage } from "./Compare";
import { NavBar, Page } from "./Page";

// ------------------------------------------------------------- points

const Checklist: React.FC<{ cue: CueOf<"points">; rel: Rel; dur: number }> = ({
  cue,
  rel,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.items.length;
  const starts = cue.items.map((it) => rel(it.atMs));
  const said = starts.filter((s) => frame >= s).length;
  // The bar grows smoothly to the items ticked so far.
  let prog = 0;
  starts.forEach((s, i) => {
    prog = Math.max(
      prog,
      interpolate(frame, [s + 6, s + 16], [i / n, (i + 1) / n], clamp),
    );
  });
  const size = n >= 4 ? 34 : 38;
  return (
    <Page dur={dur}>
      <div
        style={{
          position: "absolute",
          left: CONTENT.left,
          width: CONTENT.width,
          top: PAGE_TOP,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <NavBar title={cue.title} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 14,
              borderRadius: 7,
              background: alpha(brand.slate, 0.18),
            }}
          >
            <div
              style={{
                width: `${prog * 100}%`,
                height: "100%",
                borderRadius: 7,
                background: `linear-gradient(90deg, ${brand.primary}, ${GOLD})`,
              }}
            />
          </div>
          <span style={{ fontSize: 34, fontWeight: 800, color: MUTED }}>
            {said}/{n}
          </span>
        </div>
        {cue.items.map((it, i) => {
          if (frame < starts[i]) return null;
          const p = enter(frame, fps, starts[i]);
          const tick = interpolate(
            frame,
            [starts[i] + 6, starts[i] + 12],
            [0, 1],
            clamp,
          );
          const current = i === said - 1;
          return (
            <Card
              key={it.atMs}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "16px 22px",
                borderRadius: 26,
                border: `3px solid ${current ? GOLD : "transparent"}`,
                opacity: p,
                transform: `translateY(${(1 - p) * 50}px)`,
              }}
            >
              <Check on={tick} size={52} />
              <span
                style={{
                  fontSize: size,
                  fontWeight: current ? 900 : 700,
                  lineHeight: 1.22,
                  color: current ? INK : alpha(INK, 0.72),
                }}
              >
                {it.text}
              </span>
              <div style={{ position: "absolute", left: 0, top: 0 }}>
                <Ripple
                  x={48}
                  y={42}
                  frame={frame - starts[i] - 4}
                  size={120}
                  color={GOLD}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
};

// ------------------------------------------------------------- track

// The same sounds the classic MotionTrack gives these kinds.
const sfxOf = (c: OwnCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

// The pages, on the phone screen (inside <Phone>).
export const CuePages: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.cues ?? []).filter(isOwnCue).map((c) => {
        const from = outFrame(c.fromMs);
        const dur = Math.max(1, outFrame(c.toMs) - from);
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            {c.kind === "points" ? (
              <Checklist cue={c} rel={rel} dur={dur} />
            ) : (
              <ComparePage cue={c} rel={rel} dur={dur} />
            )}
          </Sequence>
        );
      })}
    </>
  );
};

export const CueSfx: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.cues ?? [])
        .filter(isOwnCue)
        .flatMap(sfxOf)
        .map((s) => (
          <Sequence
            key={`${s.file}${s.atMs}`}
            from={Math.max(0, outFrame(s.atMs))}
            durationInFrames={fps * 3}
            layout="none"
          >
            <Audio
              src={staticFile(`sfx/${s.file}.wav`)}
              volume={() => s.volume}
            />
          </Sequence>
        ))}
    </>
  );
};
