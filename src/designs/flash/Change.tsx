// The star of the flash: a `change` cue. The old value sits big, a strike
// line draws across it just before the swap, it shrinks up out of the way,
// and on the spoken swap the new value SLAMS in huge below it with a
// shockwave ring, a camera shake and an arrow only when the cue gives a
// direction. The difference chip ("+0,75 điểm %") only when both values
// parse with the same unit (diff.ts). Colours: gold, or the cue's own tone.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { toneColor, clamp } from "../../mortgage/style";
import { FONT } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { changeDiff } from "./diff";
import {
  DIM,
  FlashCard,
  GOLD,
  Glint,
  NAVY,
  STAGE_H,
  Shockwave,
  Tag,
  W,
  slam,
} from "./Frame";

const PAD = 18;
const CW = W - 60; // content width inside the card padding
const CH = STAGE_H - 14 - 2 * PAD; // content height under the hazard strip
const OLD_Y = { big: 225, small: 108 };
const OLD_SMALL = 84;
const NEW_Y = 268;
const CHIP_TOP = 378;

const fit = (text: string, width: number, max: number) =>
  Math.min(
    max,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

const Arrow: React.FC<{ up: boolean; color: string; h: number }> = ({
  up,
  color,
  h,
}) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 5) * 6 * (up ? -1 : 1);
  const w = h * 0.7;
  const d = `M${w / 2} 0 L${w} ${h * 0.45} L${w * 0.68} ${h * 0.45} L${w * 0.68} ${h} L${w * 0.32} ${h} L${w * 0.32} ${h * 0.45} L0 ${h * 0.45} Z`;
  return (
    <svg
      width={w}
      height={h}
      style={{
        flex: `0 0 ${w}px`,
        transform: `translateY(${bob}px) rotate(${up ? 0 : 180}deg)`,
        filter: `drop-shadow(0 0 16px ${color})`,
      }}
    >
      <path d={d} fill={color} />
    </svg>
  );
};

export const FlashChange: React.FC<{ cue: CueOf<"change">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swap = Math.max(14, rel(cue.swapAtMs));
  const strikeAt = swap - 12;
  const moveAt = swap - 6;
  const color = cue.tone ? toneColor(cue.tone, GOLD) : GOLD;
  const arrowH = cue.direction ? 132 : 0;
  const oldBig = fit(cue.from, CW - 40, 170);
  const newSize = fit(cue.to, CW - 40 - (arrowH ? arrowH * 0.7 + 30 : 0), 180);
  const labelSize = fit(cue.label, CW - (cue.kicker ? 220 : 0), 40);
  const strike = interpolate(frame, [strikeAt, strikeAt + 7], [0, 1], clamp);
  const move = interpolate(frame, [moveAt, moveAt + 8], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const s = slam(frame, fps, swap);
  const chip = changeDiff(cue.from, cue.to, cue.direction);
  const chipP = interpolate(frame, [swap + 8, swap + 13], [0, 1], clamp);
  return (
    <FlashCard shakeAt={[swap]} padding={`${PAD}px 30px`}>
      <div style={{ position: "relative", height: CH }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            height: 56,
          }}
        >
          {cue.kicker ? <Tag text={cue.kicker} /> : null}
          <span
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: labelSize,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
            }}
          >
            {cue.label}
          </span>
        </div>
        {/* old value: big, struck, then shrunk up out of the way */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: interpolate(move, [0, 1], [OLD_Y.big, OLD_Y.small]),
            display: "flex",
            justifyContent: "center",
            transform: `translateY(-50%) scale(${interpolate(move, [0, 1], [1, OLD_SMALL / oldBig])})`,
          }}
        >
          <Glint first={6} every={48} style={{ padding: "0 14px" }}>
            <span
              style={{
                display: "block",
                position: "relative",
                fontWeight: 900,
                fontSize: oldBig,
                lineHeight: 1.15,
                color: frame >= moveAt ? DIM : "#fff",
                opacity: interpolate(move, [0, 1], [1, 0.75]),
              }}
            >
              {cue.from}
              <span
                style={{
                  position: "absolute",
                  left: -10,
                  top: "52%",
                  height: Math.max(8, oldBig * 0.08),
                  width: `calc(${strike * 100}% + ${strike * 20}px)`,
                  background: GOLD,
                  borderRadius: 6,
                  transform: "rotate(-5deg)",
                  transformOrigin: "left center",
                  boxShadow: "0 0 18px rgba(255,185,56,0.8)",
                }}
              />
            </span>
          </Glint>
        </div>
        {/* new value: slams in on the swap */}
        {frame >= swap ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: NEW_Y,
              height: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Shockwave at={swap} size={560} color={color} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 30,
                opacity: s.opacity,
                transform: `scale(${s.scale})`,
              }}
            >
              <Glint first={swap + 10} every={48}>
                <span
                  style={{
                    display: "block",
                    fontWeight: 900,
                    fontSize: newSize,
                    lineHeight: 1.15,
                    color,
                    padding: "0 10px",
                    textShadow: `0 0 40px ${color}, 0 10px 30px rgba(0,0,0,0.5)`,
                  }}
                >
                  {cue.to}
                </span>
              </Glint>
              {cue.direction ? (
                <Arrow up={cue.direction === "up"} color={color} h={arrowH} />
              ) : null}
            </div>
          </div>
        ) : null}
        {chip && chipP > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CHIP_TOP,
              display: "flex",
              justifyContent: "center",
              opacity: chipP,
              transform: `translateY(${(1 - chipP) * 16}px)`,
            }}
          >
            <span
              style={{
                background: NAVY,
                border: `3px solid ${color}`,
                color,
                fontWeight: 900,
                fontSize: 36,
                lineHeight: 1.25,
                padding: "4px 22px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              {chip}
            </span>
          </div>
        ) : null}
      </div>
    </FlashCard>
  );
};
