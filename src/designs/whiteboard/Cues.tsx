// "whiteboard" cues drawn on the board: points (a hand-numbered list, each
// item written and ticked in marker as it is said, the current one under a
// gold highlighter) and compare (the board split by a drawn vertical line into
// two columns with "VS" circled at the top, the takeaway highlighted below).
// Every other kind goes to the classic MotionTrack (index.tsx).
import { Audio } from "@remotion/media";
import { Circle, Underline } from "@remotion/rough-notation";
import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  outFrameOf,
  type Cue,
  type Reel,
  type Tone,
} from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  BLUE,
  DrawnIcon,
  GOLD,
  GREEN,
  INK,
  MarkerUnderline,
  RED,
  SOFT,
  Written,
  alpha,
  swipe,
} from "./Board";
import { StageBox, STAGE_W, erased } from "./Stage";

type BoardCue = Extract<Cue, { kind: "points" | "compare" }>;
export const drawnHere = (c: Cue): c is BoardCue =>
  c.kind === "points" || c.kind === "compare";

// Erased at the end of the cue's Sequence.
const useErase = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
};

const Title: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "relative", maxWidth: STAGE_W - 60 }}>
    <Written frames={14}>
      <div
        style={{
          fontSize: 50,
          fontWeight: 900,
          lineHeight: 1.2,
          color: INK,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    </Written>
    <MarkerUnderline at={12} color={BLUE} width={7} seed={text} />
  </div>
);

// ------------------------------------------------------------- points

const Item: React.FC<{
  n: number;
  text: string;
  at: number;
  current: boolean;
  size: number;
}> = ({ n, text, at, current, size }) => {
  const frame = useCurrentFrame();
  const tick = interpolate(frame, [at + 10, at + 20], [0, 1], clamp);
  const hl = interpolate(frame, [at + 4, at + 16], [0, 1], clamp);
  const box = `M4 4 L${size - 4} 5 L${size - 5} ${size - 4} L5 ${size - 5} Z`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        opacity: interpolate(frame, [at, at + 3], [0, 1], clamp),
      }}
    >
      <Written at={at} frames={6}>
        <div
          style={{
            width: size * 1.1,
            fontSize: size,
            fontWeight: 900,
            color: BLUE,
            textAlign: "right",
          }}
        >
          {n}.
        </div>
      </Written>
      <div
        style={{ position: "relative", flex: `0 0 ${size}px`, height: size }}
      >
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          <path
            d={box}
            fill="none"
            stroke={INK}
            strokeWidth={4}
            strokeLinejoin="round"
            {...evolvePath(
              interpolate(frame, [at, at + 8], [0, 1], clamp),
              box,
            )}
          />
        </svg>
        <DrawnIcon
          icon="tick"
          size={size * 1.25}
          progress={tick}
          color={GREEN}
          stroke={12}
          style={{ position: "absolute", left: 2, top: -size * 0.4 }}
        />
      </div>
      <Written at={at + 2} frames={12} style={{ flex: 1 }}>
        <div
          style={{
            fontSize: size,
            fontWeight: current ? 900 : 800,
            lineHeight: 1.3,
            color: current ? INK : alpha(INK, 0.7),
          }}
        >
          <span style={current ? swipe(hl, GOLD, 0.6) : undefined}>{text}</span>
        </div>
      </Written>
    </div>
  );
};

const BoardPoints: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const e = useErase();
  const starts = cue.items.map((it) => rel(it.atMs));
  const size = cue.items.length > 4 ? 38 : 44;
  return (
    <StageBox place="top">
      <div
        style={{
          width: STAGE_W,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          ...erased(e),
        }}
      >
        <Title text={cue.title} />
        <div
          style={{
            width: STAGE_W - 40,
            marginTop: 56,
            display: "flex",
            flexDirection: "column",
            gap: size * 0.75,
          }}
        >
          {cue.items.map((it, i) =>
            frame < starts[i] ? null : (
              <Item
                key={it.atMs}
                n={i + 1}
                text={it.text}
                at={starts[i]}
                current={i === starts.length - 1 || frame < starts[i + 1]}
                size={size}
              />
            ),
          )}
        </div>
      </div>
    </StageBox>
  );
};

// ------------------------------------------------------------- compare

const inkOf = (tone: Tone) =>
  tone === "bad" ? RED : tone === "good" ? GREEN : INK;

const Column: React.FC<{
  card: CueOf<"compare">["cards"][number];
  rel: Rel;
}> = ({ card, rel }) => {
  const frame = useCurrentFrame();
  const start = rel(card.atMs);
  if (frame < start) return <div style={{ flex: 1 }} />;
  const n = card.rows.length;
  const value = n <= 1 ? 96 : n === 2 ? 68 : 54;
  const hlAt =
    card.highlightAtMs === undefined ? null : rel(card.highlightAtMs);
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ position: "relative" }}>
        <Written at={start} frames={12}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.2,
              color: INK,
              textWrap: "balance",
            }}
          >
            {card.title}
          </div>
        </Written>
        <MarkerUnderline
          at={start + 10}
          color={BLUE}
          width={6}
          seed={card.title}
        />
      </div>
      {card.rows.map((r) => {
        const at = rel(r.atMs);
        if (frame < at) return null;
        const hl =
          hlAt === null
            ? 0
            : interpolate(frame, [hlAt, hlAt + 14], [0, 1], clamp);
        return (
          <div key={r.label} style={{ marginTop: 34 }}>
            <Written at={at} frames={8}>
              <div style={{ fontSize: 30, fontWeight: 800, color: SOFT }}>
                {r.label}
              </div>
            </Written>
            <div style={{ marginTop: 8 }}>
              <Underline
                progress={hl}
                color={r.tone === "bad" ? RED : GOLD}
                strokeWidth={7}
                iterations={2}
                seed={17}
                padding={{ top: 4 }}
              >
                <Written at={at + 2} frames={10}>
                  <span
                    style={{
                      fontSize: value,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: inkOf(r.tone),
                    }}
                  >
                    {r.value}
                  </span>
                </Written>
              </Underline>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Columns block height; the divider runs from under the VS circle.
const LINE_H = 400;
const LINE_TOP = 118;

const BoardCompare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const e = useErase();
  const line = `M0 0 Q 4 ${(LINE_H - LINE_TOP) * 0.5} -2 ${LINE_H - LINE_TOP}`;
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const q = cue.question;
  const qAt = q ? rel(q.atMs) : 0;
  return (
    <StageBox>
      <div
        style={{
          width: STAGE_W,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          ...erased(e),
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 140,
            width: STAGE_W - 20,
            minHeight: LINE_H,
            alignItems: "flex-start",
            paddingTop: 110,
          }}
        >
          <Column card={cue.cards[0]} rel={rel} />
          <Column card={cue.cards[1]} rel={rel} />
          <svg
            width={10}
            height={LINE_H - LINE_TOP}
            style={{
              position: "absolute",
              left: "50%",
              top: LINE_TOP,
              overflow: "visible",
            }}
          >
            <path
              d={line}
              fill="none"
              stroke={INK}
              strokeWidth={6}
              strokeLinecap="round"
              {...evolvePath(interpolate(frame, [0, 16], [0, 1], clamp), line)}
            />
          </svg>
          {frame >= vsAt ? (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translateX(-50%)",
                padding: "6px 0",
              }}
            >
              <Circle
                progress={interpolate(
                  frame,
                  [vsAt + 4, vsAt + 16],
                  [0, 1],
                  clamp,
                )}
                color={RED}
                strokeWidth={6}
                iterations={2}
                seed={23}
                padding={{ left: 16, right: 16, top: 10, bottom: 10 }}
              >
                <Written at={vsAt} frames={6}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 52,
                      fontWeight: 900,
                      color: INK,
                      padding: "0 6px",
                    }}
                  >
                    VS
                  </span>
                </Written>
              </Circle>
            </div>
          ) : null}
        </div>
        {q && frame >= qAt ? (
          <Written
            at={qAt}
            frames={16}
            style={{ marginTop: 20, maxWidth: STAGE_W - 40 }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                lineHeight: 1.3,
                color: INK,
                textAlign: "center",
              }}
            >
              <span
                style={swipe(
                  interpolate(frame, [qAt + 8, qAt + 22], [0, 1], clamp),
                  GOLD,
                  0.6,
                )}
              >
                {q.text}
              </span>
            </div>
          </Written>
        ) : null}
      </div>
    </StageBox>
  );
};

// ------------------------------------------------------------- track

// The same sounds the classic MotionTrack gives these kinds.
const sfxOf = (c: BoardCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const BoardCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(drawnHere);
  return (
    <>
      {cues.map((c) => {
        const from = outFrame(c.fromMs);
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
            layout="none"
          >
            {c.kind === "points" ? (
              <BoardPoints cue={c} rel={rel} />
            ) : (
              <BoardCompare cue={c} rel={rel} />
            )}
          </Sequence>
        );
      })}
      {cues.flatMap(sfxOf).map((s) => (
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
