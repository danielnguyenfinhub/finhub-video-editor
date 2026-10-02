// White message bubbles (adapted from
// .claude/elements/storytelling/on-screen-messages): the cover title/subtitle
// and the hook both read as something told across a kitchen table, not
// broadcast. A tail bottom-left, a typing-dots bubble for the hook's lead-in.
import type React from "react";
import { hookText } from "../../mortgage/golden";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { FONT } from "../../mortgage/style";

const BubbleTail: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width={30}
    height={22}
    viewBox="0 0 30 22"
    style={{ position: "absolute", left: 28, bottom: -13 }}
  >
    <path d="M0 0 C3 11 13 19 30 21 C15 21 3 14 0 0 Z" fill={color} />
  </svg>
);

export const MessageBubble: React.FC<{
  children: React.ReactNode;
  color?: string;
  textColor?: string;
  fontSize?: number;
  weight?: number;
  maxWidth?: number;
  padding?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  color = "#fff",
  textColor = brand.textOnCard,
  fontSize = 44,
  weight = 800,
  maxWidth = 740,
  padding = "22px 32px",
  style,
}) => (
  <div
    style={{
      position: "relative",
      display: "inline-block",
      maxWidth,
      background: color,
      color: textColor,
      borderRadius: 28,
      padding,
      fontFamily: FONT,
      fontWeight: weight,
      fontSize,
      lineHeight: 1.28,
      boxShadow: "0 18px 40px rgba(60,45,20,0.18)",
      ...style,
    }}
  >
    {children}
    <BubbleTail color={color} />
  </div>
);

// A brief "..." bubble before the hook's own bubble lands, like someone
// starting to type back at you.
export const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <MessageBubble padding="20px 28px" maxWidth={140}>
      <div style={{ display: "flex", gap: 10 }}>
        {[0, 1, 2].map((i) => {
          const y = Math.sin((frame - i * 3) / 4) * 6;
          return (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#B9AE9A",
                transform: `translateY(${y}px)`,
              }}
            />
          );
        })}
      </div>
    </MessageBubble>
  );
};

const TYPING_FRAMES = 20;

export const KitchenHook: React.FC<{
  hook: {
    big: string;
    countTo?: number;
    decimals?: number;
    suffix?: string;
    sub?: string;
  };
  left: number;
  top: number;
}> = ({ hook, left, top }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const outP = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const bigIn = interpolate(
    frame,
    [TYPING_FRAMES - 4, TYPING_FRAMES + 12],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const subIn = interpolate(
    frame,
    [TYPING_FRAMES + 14, TYPING_FRAMES + 30],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const big = hookText(
    hook,
    interpolate(frame, [TYPING_FRAMES, TYPING_FRAMES + 60], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return (
    <AbsoluteFill style={{ opacity: outP }}>
      {frame < TYPING_FRAMES ? (
        <div style={{ position: "absolute", left, top }}>
          <TypingDots />
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left,
          top,
          opacity: bigIn,
          transform: `translateY(${interpolate(bigIn, [0, 1], [18, 0])}px)`,
        }}
      >
        <MessageBubble fontSize={64}>{big}</MessageBubble>
      </div>
      {hook.sub ? (
        <div
          style={{
            position: "absolute",
            left,
            top: top + 150,
            opacity: subIn,
            transform: `translateY(${interpolate(subIn, [0, 1], [18, 0])}px)`,
          }}
        >
          <MessageBubble fontSize={40} weight={700} padding="16px 26px">
            {hook.sub}
          </MessageBubble>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
