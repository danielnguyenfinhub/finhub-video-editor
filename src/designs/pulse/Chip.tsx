// "pulse" chip: a figure that cannot take the stage (or a bank named while
// it is taken) sits as a small pill at the right of the header, or under a
// classic panel while one is up. Chips up at once stack downward.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT, enter } from "../../mortgage/style";
import type { Placed } from "./Plan";
import { CHIP, GOLD, fadeOut } from "./Scope";

const CHIP_H = 76;

export const Chip: React.FC<{ placed: Placed }> = ({ placed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const top =
    (placed.foot ? CHIP.foot : CHIP.top) + placed.lane * (CHIP_H + 10);
  const { beat } = placed;
  return (
    <div
      style={{
        position: "absolute",
        right: 1080 - CHIP.right,
        top,
        height: CHIP_H,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: beat.kind === "figure" ? "0 26px 0 20px" : "0 8px 0 20px",
        borderRadius: 999,
        background: "rgba(6,19,42,0.88)",
        border: `2.5px solid ${GOLD}`,
        boxShadow: `0 0 24px rgba(255,185,56,0.35)`,
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, placed.frames)),
        transform: `translateX(${interpolate(p, [0, 1], [40, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: GOLD,
          boxShadow: `0 0 12px ${GOLD}`,
          opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 8)),
        }}
      />
      {beat.kind === "figure" ? (
        <span
          style={{
            fontSize: 40,
            fontWeight: 900,
            color: "#ffffff",
            whiteSpace: "nowrap",
          }}
        >
          {beat.figure.big}
        </span>
      ) : (
        <LenderLogo
          lender={beat.lender}
          height={60}
          style={{ borderRadius: 999 }}
        />
      )}
    </div>
  );
};
