// Cue kinds the flash draws itself on the stage: `change` (Change.tsx),
// `trend` as an alert line that draws itself, `points` as numbered bulletins
// slamming in top-down as they are said, `compare` as two flash columns cut
// by a hazard slash. Every other kind goes to the classic MotionTrack.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HOOK_FRAMES } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { FlashChange } from "./Change";
import { FlashCompare } from "./Compare";
import { CH, CW, Header, fitN } from "./CueKit";
import { FlashTrend } from "./Trend";
import {
  DIM,
  FlashCard,
  GOLD,
  NAVY,
  STRIPES,
  punch,
  useFontReady,
} from "./Frame";

type OwnCue = Extract<Cue, { kind: "change" | "trend" | "points" | "compare" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "change" ||
  c.kind === "trend" ||
  c.kind === "points" ||
  c.kind === "compare";

// Talk-frame span of every cue; an own cue that starts under the hook waits
// for it (its beats said before then show at once).
export const cueSpans = (reel: Reel, fps: number) => {
  const at = outFrameOf(reel.timeline, fps);
  const hookEnd = reel.edit.hook ? HOOK_FRAMES : 0;
  return (reel.edit.cues ?? []).map((c) => {
    const a = at(c.fromMs);
    const b = Math.max(a + 1, at(c.toMs));
    const from = isOwnCue(c) && a < hookEnd ? Math.min(hookEnd, b - 1) : a;
    return { cue: c, from, to: b };
  });
};

// ------------------------------------------------------------ points

const FlashPoints: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = cue.items.length;
  const starts = cue.items.map((it) => rel(it.atMs));
  const rowH = Math.min(110, (CH - 76) / n);
  const textW = CW - 90 - 24;
  return (
    <FlashCard padding="22px 30px">
      <Header title={cue.title} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
          justifyContent: "center",
        }}
      >
        {cue.items.map((it, i) => {
          const at = starts[i];
          const said = frame >= at;
          const current = said && (i === n - 1 || frame < starts[i + 1]);
          const p = punch(frame, fps, at);
          return (
            <div
              key={it.atMs}
              style={{
                height: rowH - 10,
                display: "flex",
                alignItems: "center",
                gap: 24,
                borderRadius: 12,
                background: said
                  ? current
                    ? "rgba(0,100,168,0.45)"
                    : "rgba(255,255,255,0.04)"
                  : STRIPES("rgba(255,255,255,0.05)", "transparent", 14),
                borderLeft: `8px solid ${current ? GOLD : said ? "rgba(255,255,255,0.2)" : "transparent"}`,
                opacity: said ? p.opacity : 1,
                transform: said
                  ? `translateX(${interpolate(frame - at, [0, 6], [140, 0], { ...clamp, easing: (x) => 1 - (1 - x) ** 3 })}px)`
                  : undefined,
              }}
            >
              {said ? (
                <>
                  <div
                    style={{
                      flex: "0 0 66px",
                      height: 66,
                      borderRadius: 10,
                      background: current ? GOLD : NAVY,
                      border: `3px solid ${GOLD}`,
                      color: current ? NAVY : GOLD,
                      fontWeight: 900,
                      fontSize: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      width: textW,
                      color: current ? "#fff" : DIM,
                      fontWeight: 900,
                      fontSize: fitN(it.text, textW, 40),
                      lineHeight: 1.25,
                    }}
                  >
                    {it.text}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </FlashCard>
  );
};

// ------------------------------------------------------------ track

type Sfx = { atMs: number; file: string; volume: number };
const sfxOf = (c: OwnCue): Sfx[] => {
  switch (c.kind) {
    case "change":
      return [{ atMs: c.swapAtMs, file: "whip", volume: 0.35 }];
    case "points":
      return c.items.map((it) => ({
        atMs: it.atMs,
        file: "mouse-click",
        volume: 0.4,
      }));
    case "compare":
      return c.cards.map((k) => ({
        atMs: k.atMs,
        file: "mouse-click",
        volume: 0.5,
      }));
    case "trend":
      return [];
  }
};

// Beat frames (talk timeline) for the hazard sweeps.
export const cueBeats = (reel: Reel, fps: number): number[] => {
  const at = outFrameOf(reel.timeline, fps);
  return cueSpans(reel, fps).flatMap(({ cue: c, from }) => {
    const later = (ms: number) => Math.max(from, at(ms));
    switch (c.kind) {
      case "change":
        return [from, later(c.swapAtMs)];
      case "points":
        return [from, ...c.items.map((it) => later(it.atMs))];
      case "compare":
        return [from, ...c.cards.map((k) => later(k.atMs))];
      default:
        return [from];
    }
  });
};

export const FlashCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const ready = useFontReady("flash cues: Be Vietnam Pro");
  const spans = cueSpans(reel, fps).filter(
    (s): s is { cue: OwnCue; from: number; to: number } => isOwnCue(s.cue),
  );
  return (
    <>
      {(ready ? spans : []).map(({ cue: c, from, to }) => {
        const rel: Rel = (ms) => at(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={Math.max(1, to - from)}
            layout="none"
          >
            {c.kind === "change" ? (
              <FlashChange cue={c} rel={rel} />
            ) : c.kind === "trend" ? (
              <FlashTrend cue={c} />
            ) : c.kind === "points" ? (
              <FlashPoints cue={c} rel={rel} />
            ) : (
              <FlashCompare cue={c} rel={rel} />
            )}
          </Sequence>
        );
      })}
      {spans
        .flatMap(({ cue }) => sfxOf(cue))
        .map((s) => (
          <Sequence
            key={`${s.file}${s.atMs}`}
            from={Math.max(0, at(s.atMs))}
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
