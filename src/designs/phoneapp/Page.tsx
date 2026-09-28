// "phoneapp" pushed page: a cue slides a new page onto the app from the
// right (over the home screen) and slides it back out at its end; a nav bar
// with a back chevron and the page's title.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { FONT, clamp, enter } from "../../mortgage/style";
import { INK, SCREEN, SCREEN_BG, STATUS, alpha } from "./Phone";

const SLIDE = 14;

// The page: slides in from the right over the home screen, and back out.
export const Page: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = enter(frame, fps);
  const out = interpolate(frame, [dur - SLIDE, dur], [0, 1], clamp);
  const x = (1 - inP + out) * (SCREEN.right - SCREEN.left);
  return (
    <div
      style={{
        position: "absolute",
        left: SCREEN.left,
        right: 1080 - SCREEN.right,
        top: SCREEN.top + STATUS,
        height: 1920,
        background: SCREEN_BG,
        transform: `translateX(${x}px)`,
        boxShadow: `-20px 0 40px ${alpha(brand.navy, 0.15)}`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -SCREEN.left,
          top: -SCREEN.top - STATUS,
          width: 1080,
          height: 1920,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const NavBar: React.FC<{ title: string; lines?: number }> = ({
  title,
  lines = 2,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      color: INK,
    }}
  >
    <span
      style={{
        fontSize: 52,
        fontWeight: 900,
        lineHeight: 0.95,
        color: brand.primary,
      }}
    >
      ‹
    </span>
    <span
      style={{
        fontSize: 40,
        fontWeight: 900,
        lineHeight: 1.2,
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {title}
    </span>
  </div>
);
