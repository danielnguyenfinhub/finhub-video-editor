// iMessage-style pieces for "chatstory", adapted from .claude/elements/
// storytelling/on-screen-messages: grey bubble (the illustrative question)
// with a left tail, brand.primary bubble (Daniel's reply) with a right tail,
// typing dots, the tiny compliance label, the hook bubbles and the chapter
// bubble. FONT and brand tokens replace Inter/the demo blue.
import type React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { LOGO_HEIGHT, SAFE, hookText } from "../../mortgage/golden";
import type { EditJson } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";

const GREY = "#E5E5EA";
const GREY_TEXT = "#1C1C1E";
const clampOpt = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const Bubble: React.FC<{
  text: string;
  side: "left" | "right";
  delay?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({ text, side, delay = 0, fontSize = 40, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 200, mass: 0.7 },
  });
  const mine = side === "right";
  return (
    <div
      style={{
        position: "relative",
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "84%",
        padding: "18px 30px",
        borderRadius: 40,
        fontFamily: FONT,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.25,
        background: mine ? brand.primary : GREY,
        color: mine ? "#fff" : GREY_TEXT,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
        boxShadow: "0 10px 26px rgba(11,31,61,0.14)",
        ...style,
      }}
    >
      {text}
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          width: 26,
          height: 26,
          background: mine ? brand.primary : GREY,
          ...(mine
            ? {
                right: -9,
                clipPath: "path('M0 0h20v16c0 8 4 13 12 16C14 32 0 25 0 16Z')",
              }
            : {
                left: -9,
                clipPath: "path('M26 0H9v16c0 8-4 13-12 16 18 0 29-7 29-16Z')",
              }),
        }}
      />
    </div>
  );
};

// The three dots of a message being typed.
export const TypingDots: React.FC<{
  side?: "left" | "right";
  delay?: number;
}> = ({ side = "right", delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  const mine = side === "right";
  return (
    <div
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        display: "flex",
        gap: 8,
        padding: "22px 28px",
        borderRadius: 40,
        background: mine ? brand.primary : GREY,
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.85, 1])})`,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: mine ? "#fff" : "#8E8E93",
            opacity: interpolate(
              (((frame - delay - i * 4) % 24) + 24) % 24,
              [0, 8, 16, 24],
              [0.3, 1, 0.3, 0.3],
              clamp,
            ),
          }}
        />
      ))}
    </div>
  );
};

// A tiny, letter-spaced compliance label above the illustrative exchange:
// the question must never look like a real client's.
export const Label: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 26,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: "#7C8698",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

// FinHub logo on white, top-right, inside SAFE — the Cover's own logo, same
// size and place as LogoMark (golden rule 3c) since the Cover has no talk
// timeline to gate visibility on.
export const LogoBadge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top,
      right: 1080 - SAFE.right,
      padding: "14px 22px",
      borderRadius: 22,
      background: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    }}
  >
    <Img
      src={staticFile("brand/finhub-logo.png")}
      style={{ height: LOGO_HEIGHT, display: "block" }}
    />
  </div>
);

const HOOK_FRAMES = 105;

// The hook (reel.edit.hook): Daniel's answer pops in as a blue reply bubble,
// the supporting line as a grey bubble under it, both near the top of SAFE.
export const HookBubbles: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const outP = interpolate(
    frame,
    [HOOK_FRAMES - 10, HOOK_FRAMES],
    [0, 1],
    clampOpt,
  );
  const big = hookText(hook, interpolate(frame, [4, 40], [0, 1], clamp));
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 1080 - SAFE.right,
        top: SAFE.top + 130,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        opacity: 1 - outP,
      }}
    >
      <Bubble
        text={big}
        side="right"
        fontSize={66}
        style={{ fontWeight: 900 }}
      />
      {hook.sub ? (
        <Bubble text={hook.sub} side="left" delay={12} fontSize={38} />
      ) : null}
    </div>
  );
};

// A chapter cut: "PHẦN n · title" as a blue bubble sliding in from the right.
// Its own slot: top-right of SAFE, under where the logo sits (LogoMark shows
// only in the talk's first/last 10 s, and a chapter never starts before 3.5 s
// — HOOK_FRAMES — so the two never share a frame either). This used to share
// SAFE.left/SAFE.top with the figure polaroid (Behind layer) and land near
// the lender stickers (LENDER_TOP = SAFE.top + 380 in Lenders.tsx) — golden
// rule 3b: concurrent elements need their own place. Capped at 420 wide and
// wrapped so it stays a compact badge instead of a banner over his face.
const CHAPTER_WIDTH = 420;
export const ChapterBubble: React.FC<{
  index: number;
  title: string;
  frames: number;
}> = ({ index, title, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame, fps, config: { damping: 16, stiffness: 170 } });
  const outP = interpolate(frame, [frames - 10, frames], [0, 1], clampOpt);
  return (
    <div
      style={{
        position: "absolute",
        right: 1080 - SAFE.right,
        top: SAFE.top + 170,
        maxWidth: CHAPTER_WIDTH,
        width: "max-content",
        padding: "20px 40px",
        borderRadius: 40,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 44,
        lineHeight: 1.15,
        color: "#fff",
        background: brand.primary,
        boxShadow: "0 14px 34px rgba(11,31,61,0.3)",
        opacity: (1 - outP) * interpolate(inP, [0, 1], [0, 1]),
        transform: `translateX(${interpolate(inP, [0, 1], [900, 0])}px)`,
      }}
    >
      PHẦN {index + 1} · {title}
    </div>
  );
};
