// "journey" cues in the map's own language. Points are a route plan:
// numbered milestones on a winding trail that climbs from the pin, each
// lighting up as it is said while the pin hops onto it (Pin.tsx). Compare is
// a fork in the road (Fork.tsx). Every other cue kind goes to classic
// MotionTrack, mounted only while that cue is up (its film vignette would
// otherwise darken the map's corners for the whole video).
import { Audio } from "@remotion/media";
import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, pop } from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import type { CueOf, Rel } from "../classic/Infographics";
import { Fork } from "./Fork";
import {
  Banner,
  CARD_LEFT,
  DISC,
  PANEL_OFFSET,
  SHADOW,
  fadeOut,
  isOwnCue,
  pointsLayout,
  type OwnCue,
} from "./Kit";
import { GOLD, INK, MARKER_Y, cameraAt } from "./Map";

// ------------------------------------------------------------- points

const RoutePlan: React.FC<{
  cue: CueOf<"points">;
  rel: Rel;
  dur: number;
  from: number;
}> = ({ cue, rel, dur, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const discs = pointsLayout(cue.items.length);
  const starts = cue.items.map((it) => rel(it.atMs));
  const said = starts.filter((s) => frame >= s).length;
  const title = pop(frame, fps, 2);
  const home = { x: cameraAt(from, fps).mx, y: MARKER_Y - 20 };
  // The trail: from the road up through every milestone, as soft S-bends.
  const pts = [home, ...discs];
  const d = pts
    .map((q, i) => {
      if (i === 0) return `M ${q.x} ${q.y}`;
      const a = pts[i - 1];
      const my = (a.y + q.y) / 2;
      return `C ${a.x} ${my} ${q.x} ${my} ${q.x} ${q.y}`;
    })
    .join(" ");
  // Share of the trail walked: up to the latest milestone said.
  const walked =
    said === 0
      ? 0
      : interpolate(
          frame,
          [starts[said - 1], starts[said - 1] + 12],
          [said - 1, said],
          clamp,
        ) / discs.length;
  const gold = evolvePath(walked, d);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, dur),
      }}
    >
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0, opacity: title }}
      >
        <path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={30}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={INK}
          strokeWidth={5}
          strokeDasharray="16 14"
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={GOLD}
          strokeWidth={11}
          strokeLinecap="round"
          {...gold}
        />
      </svg>
      <Banner text={cue.title} p={title} />
      {cue.items.map((it, i) => {
        const on = frame >= starts[i];
        const p = on ? pop(frame, fps, starts[i] + 4) : 0;
        const current = i === said - 1;
        const glow = current
          ? 0.5 + 0.5 * Math.sin((frame - starts[i]) / 5)
          : 0;
        return (
          <div key={it.atMs}>
            <div
              style={{
                position: "absolute",
                left: discs[i].x - DISC,
                top: discs[i].y - DISC,
                width: 2 * DISC,
                height: 2 * DISC,
                borderRadius: "50%",
                boxSizing: "border-box",
                background: on ? GOLD : "#ffffff",
                border: `4px ${on ? "solid" : "dashed"} ${INK}`,
                boxShadow: current
                  ? `0 0 ${10 + glow * 20}px ${GOLD}`
                  : undefined,
                color: INK,
                fontSize: 30,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: on ? 1 : 0.55 * title,
                transform: `scale(${on ? 1 + 0.25 * (1 - pop(frame, fps, starts[i])) : 0.85})`,
              }}
            >
              {i + 1}
            </div>
            {on ? (
              <div
                style={{
                  position: "absolute",
                  left: CARD_LEFT,
                  maxWidth: SAFE.right - CARD_LEFT,
                  top: discs[i].y,
                  padding: "12px 26px",
                  borderRadius: 16,
                  background: "#ffffff",
                  border: `${current ? 5 : 3}px solid ${current ? GOLD : INK}`,
                  boxShadow: SHADOW,
                  fontSize: 36,
                  fontWeight: current ? 900 : 700,
                  lineHeight: 1.22,
                  color: INK,
                  opacity: p,
                  transform: `translate(${(1 - p) * 40}px, -50%)`,
                }}
              >
                {it.text}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------- tracks

// The same sounds the classic MotionTrack gives these kinds.
const sfxOf = (c: OwnCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const JourneyCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const sfx = [
    ...cues.filter(isOwnCue).flatMap(sfxOf),
    // MotionTrack plays these when mounted whole; here it never is.
    ...(reel.edit.chapters ?? []).map((c) => ({
      atMs: c.atMs - 250,
      file: "whoosh",
      volume: 0.35,
    })),
    ...(reel.edit.stats ?? []).map((s) => ({
      atMs: s.atMs,
      file: "ding",
      volume: 0.22,
    })),
  ];
  return (
    <>
      {cues.map((c) => {
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
              <RoutePlan cue={c} rel={rel} dur={dur} from={from} />
            ) : c.kind === "compare" ? (
              <Fork cue={c} rel={rel} dur={dur} from={from} />
            ) : (
              // Classic panel, mounted only for this cue; the inner Sequence
              // gives it the talk timeline back.
              <Sequence from={-from} layout="none">
                <MotionTrack
                  reel={{
                    ...reel,
                    edit: { ...reel.edit, cues: [c], chapters: [], stats: [] },
                  }}
                  panelOffset={PANEL_OFFSET}
                  leak={false}
                />
              </Sequence>
            )}
          </Sequence>
        );
      })}
      {sfx.map((s) => (
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
