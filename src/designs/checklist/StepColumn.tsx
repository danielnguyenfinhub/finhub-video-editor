// The checklist's core: a column of numbered step cards (one per
// reel.edit.chapters entry), a k/N progress bar above them, and — inside
// whichever card is current — the golden-rule figure (a one-bar chart) and
// lender polaroid for whatever Daniel is saying right now.
import { fitText } from "@remotion/layout-utils";
import { CrossedOff } from "@remotion/rough-notation";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE, type Figure } from "../../mortgage/golden";
import type { LenderMention } from "../../mortgage/lenders";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT, clamp, enter } from "../../mortgage/style";

const COLUMN_LEFT = SAFE.left;
const COLUMN_WIDTH = 560; // x 54-614, left of Daniel's head (x ~690+)
const CARD_GAP = 10;

// -------------------------------------------------------------- progress bar

export const ProgressTrack: React.FC<{
  filled: number; // 0-1
  label?: string; // omitted on Cover (N unknown there)
}> = ({ filled, label }) => (
  <div style={{ width: COLUMN_WIDTH }}>
    <div
      style={{
        height: 14,
        borderRadius: 999,
        background: "rgba(11,31,61,0.12)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${filled * 100}%`,
          background: brand.accent,
          borderRadius: 999,
        }}
      />
    </div>
    {label ? (
      <div
        style={{
          marginTop: 8,
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 800,
          color: brand.textOnCard,
        }}
      >
        {label}
      </div>
    ) : null}
  </div>
);

// -------------------------------------------------------------- figure card

const MiniBarChart: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const local = frame - figure.fromFrame;
  const grow = spring({
    frame: local,
    fps: 30,
    config: { damping: 14, stiffness: 160, mass: 0.7 },
  });
  const size = Math.min(
    38,
    fitText({
      text: figure.big,
      withinWidth: 380,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 14,
        marginTop: 10,
        paddingLeft: 68, // aligns under the title, past the number circle
      }}
    >
      <div
        style={{
          width: 34,
          height: 54 * grow,
          background: brand.primary,
          borderRadius: "6px 6px 0 0",
        }}
      />
      <div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: size,
            color: brand.textOnCard,
            whiteSpace: "nowrap",
          }}
        >
          {figure.big}
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 18,
            color: "#5B6B80",
            maxWidth: 360,
          }}
        >
          {figure.label}
        </div>
        {figure.source === "stat" ? (
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 14,
              color: "#8B96A6",
              marginTop: 2,
            }}
          >
            ví dụ minh hoạ
          </div>
        ) : null}
      </div>
    </div>
  );
};

// -------------------------------------------------------------- polaroid

const Polaroid: React.FC<{ mention: FrameMention }> = ({ mention }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - mention.startFrame;
  const drop = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.7 },
  });
  return (
    <div
      style={{
        position: "absolute",
        right: -70,
        top: -20,
        background: "#fff",
        padding: "10px 10px 26px",
        borderRadius: 4,
        boxShadow: "0 12px 24px rgba(11,31,61,0.3)",
        transform: `rotate(-4deg) translateY(${interpolate(drop, [0, 1], [-140, 0])}px) scale(${interpolate(drop, [0, 1], [0.7, 1])})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -14,
          left: "50%",
          transform: "translateX(-50%) rotate(2deg)",
          width: 70,
          height: 26,
          background: "rgba(245,165,36,0.55)",
        }}
      />
      <LenderLogo lender={mention.lender} height={44} />
    </div>
  );
};

// -------------------------------------------------------------- step card

const StepCard: React.FC<{
  index: number;
  title: string;
  state: "current" | "done" | "future";
  becameDoneAtFrame: number | null;
  figure?: Figure;
  mention?: FrameMention;
}> = ({ index, title, state, becameDoneAtFrame, figure, mention }) => {
  const frame = useCurrentFrame();
  const strike =
    becameDoneAtFrame === null
      ? 0
      : interpolate(
          frame,
          [becameDoneAtFrame, becameDoneAtFrame + 18],
          [0, 1],
          clamp,
        );
  const opacity = state === "current" ? 1 : state === "done" ? 0.55 : 0.35;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        background: "#fff",
        borderRadius: 14,
        padding: "14px 20px",
        opacity,
        boxShadow: "0 10px 24px rgba(11,31,61,0.18)",
        border:
          state === "current"
            ? `3px solid ${brand.accent}`
            : "3px solid transparent",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "50%",
          background: brand.textOnCard,
          color: brand.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 22,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 28,
            color: brand.textOnCard,
            lineHeight: 1.2,
          }}
        >
          {state === "done" ? (
            <CrossedOff
              progress={strike}
              color={brand.bad}
              strokeWidth={5}
              iterations={1}
              seed={index + 1}
            >
              {title}
            </CrossedOff>
          ) : (
            title
          )}
        </div>
        {figure ? <MiniBarChart figure={figure} /> : null}
      </div>
      {mention ? <Polaroid mention={mention} /> : null}
    </div>
  );
};

// -------------------------------------------------------------- loose card

// Fallback for a figure or lender mention that lands outside any chapter's
// span (or when the video has no chapters at all): a small stand-alone card
// at the top of the column, same visual language as a step card.
export const LooseFigureCard: React.FC<{ figure: Figure }> = ({ figure }) => (
  <div
    style={{
      position: "relative",
      background: "#fff",
      borderRadius: 14,
      padding: "14px 20px",
      boxShadow: "0 10px 24px rgba(11,31,61,0.18)",
      border: `3px solid ${brand.accent}`,
    }}
  >
    <MiniBarChart figure={{ ...figure, fromFrame: figure.fromFrame }} />
  </div>
);

export const LoosePolaroidCard: React.FC<{ mention: FrameMention }> = ({
  mention,
}) => (
  <div
    style={{
      position: "relative",
      background: "#fff",
      borderRadius: 14,
      padding: 20,
      boxShadow: "0 10px 24px rgba(11,31,61,0.18)",
      display: "flex",
      justifyContent: "flex-end",
    }}
  >
    <Polaroid mention={mention} />
  </div>
);

// -------------------------------------------------------------- column

export type FrameMention = LenderMention & { startFrame: number };

export const StepColumn: React.FC<{
  chapters: { title: string; startFrame: number }[];
  figures: Figure[];
  mentions: FrameMention[];
  // The hook occupies the same top-of-column spot for its first frames
  // (index.tsx's HOOK_FRAMES), including its own "0/N" bar; the column fades
  // in once that clears so the two never overlap.
  revealFrame?: number;
  // Talk-timeline frame ranges where a MotionTrack cue card is up (golden
  // rule 4): the column fades to 0 for the span so the two never collide.
  cueSpans?: [number, number][];
}> = ({ chapters, figures, mentions, revealFrame = 0, cueSpans = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, revealFrame);
  let cueFade = 1;
  for (const [a, b] of cueSpans) {
    if (frame >= a && frame < b) {
      cueFade = 0;
      break;
    }
    if (frame >= a - 8 && frame < a) {
      cueFade = Math.min(
        cueFade,
        interpolate(frame, [a - 8, a], [1, 0], clamp),
      );
    } else if (frame >= b && frame < b + 8) {
      cueFade = Math.min(
        cueFade,
        interpolate(frame, [b, b + 8], [0, 1], clamp),
      );
    }
  }
  if (chapters.length === 0) return null;
  const starts = chapters.map((c) => c.startFrame);
  const ownerOf = (f: number) => {
    let owner = -1;
    for (let i = 0; i < starts.length; i++) if (starts[i] <= f) owner = i;
    return owner;
  };
  const currentIndex = ownerOf(frame);
  const doneCount = Math.max(0, currentIndex);

  const activeFigureFor = (i: number) =>
    figures.find(
      (f) =>
        ownerOf(f.fromFrame) === i &&
        frame >= f.fromFrame &&
        frame < f.fromFrame + f.frames,
    );
  const activeMentionFor = (i: number) =>
    mentions.find(
      (m) =>
        ownerOf(m.startFrame) === i &&
        frame >= m.startFrame &&
        frame < m.startFrame + Math.round(((m.endMs - m.startMs) / 1000) * fps),
    );
  const looseFigure = figures.find(
    (f) =>
      ownerOf(f.fromFrame) === -1 &&
      frame >= f.fromFrame &&
      frame < f.fromFrame + f.frames,
  );
  const looseMention = mentions.find(
    (m) =>
      ownerOf(m.startFrame) === -1 &&
      frame >= m.startFrame &&
      frame < m.startFrame + Math.round(((m.endMs - m.startMs) / 1000) * fps),
  );

  return (
    <AbsoluteFill
      style={{
        left: COLUMN_LEFT,
        top: SAFE.top,
        width: COLUMN_WIDTH,
        opacity: p * cueFade,
        transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: CARD_GAP }}>
        <ProgressTrack
          filled={doneCount / chapters.length}
          label={`${doneCount}/${chapters.length}`}
        />
        {looseFigure ? <LooseFigureCard figure={looseFigure} /> : null}
        {looseMention ? <LoosePolaroidCard mention={looseMention} /> : null}
        {/* A step shows once Daniel reaches it: the agenda never gives away
            the titles ahead (the "k/N" track counts them). */}
        {chapters.slice(0, currentIndex + 1).map((c, i) => (
          <StepCard
            key={c.title + c.startFrame}
            index={i}
            title={c.title}
            state={
              i === currentIndex
                ? "current"
                : i < currentIndex
                  ? "done"
                  : "future"
            }
            becameDoneAtFrame={
              i < currentIndex && i + 1 < starts.length ? starts[i + 1] : null
            }
            figure={activeFigureFor(i)}
            mention={activeMentionFor(i)}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
