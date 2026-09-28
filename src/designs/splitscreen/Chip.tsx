// The split chip: a pill cut in two by a small handle, a steel BEFORE-coloured
// half on the left and a navy half with the value on the right. Big, it is a
// figure on the free stage (centred on the divider, so the stage's own split
// runs through its handle); compact, it rides on the stage's top edge for a
// figure or a bank that lands while the stage is taken.
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT, clamp } from "../../mortgage/style";
import { counted } from "./numbers";
import type { Chip } from "./Plan";
import { GOLD, MID, SKY, STAGE } from "./Slider";

export const FIGURE_WORD = "CON SỐ";
export const LENDER_WORD = "ĐANG NHẮC TỚI";
const FADE = 8;
const ease = (x: number) => 1 - (1 - x) ** 3;

export const SplitChip: React.FC<{
  halfW: number;
  height: number;
  left: React.ReactNode;
  right: React.ReactNode;
}> = ({ halfW, height, left, right }) => {
  const r = height * 0.24;
  const half: React.CSSProperties = {
    width: halfW,
    height,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  };
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        borderRadius: height / 2,
        overflow: "hidden",
        border: `2px solid rgba(255,185,56,0.55)`,
        boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          ...half,
          padding: `0 ${r + 26}px 0 ${height * 0.3}px`,
          background: `linear-gradient(165deg, ${brand.slate}, ${brand.navy})`,
        }}
      >
        {left}
      </div>
      <div
        style={{
          ...half,
          padding: `0 ${height * 0.3}px 0 ${r + 26}px`,
          background: `linear-gradient(170deg, ${brand.background}, ${brand.navy})`,
        }}
      >
        {right}
      </div>
      <div
        style={{
          position: "absolute",
          left: halfW - 1.5,
          top: 0,
          width: 3,
          height,
          background: GOLD,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: halfW - r,
          top: height / 2 - r,
          width: 2 * r,
          height: 2 * r,
          boxSizing: "border-box",
          borderRadius: "50%",
          background: brand.navy,
          border: `${Math.max(3, r * 0.2)}px solid ${GOLD}`,
          boxShadow: `0 0 14px rgba(255,185,56,0.7)`,
        }}
      />
    </div>
  );
};

// ------------------------------------------------------------- compact

const LANE_X = [STAGE.left + MID, SAFE.left, SAFE.right];
const CHIP_H = 62;

const ChipView: React.FC<{ chip: Chip }> = ({ chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = chip.to - chip.from;
  const p = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const o = Math.min(p, interpolate(frame, [dur - FADE, dur], [1, 0], clamp));
  const t = interpolate(frame, [2, 24], [0, 1], { ...clamp, easing: ease });
  const halfW = chip.lender ? 200 : 170;
  const x = LANE_X[chip.lane % LANE_X.length];
  // Centre lane centres on the stage; the side lanes align to SAFE.
  const left =
    chip.lane % 3 === 0 ? x - halfW : chip.lane % 3 === 1 ? x : x - 2 * halfW;
  const big = chip.figure?.big ?? "";
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: STAGE.top - CHIP_H / 2,
        opacity: o,
        transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
      }}
    >
      <SplitChip
        halfW={halfW}
        height={CHIP_H}
        left={
          <span
            style={{
              fontSize: chip.lender ? 15 : 18,
              fontWeight: 900,
              letterSpacing: 3,
              lineHeight: 1.25,
              color: SKY,
            }}
          >
            {chip.lender ? LENDER_WORD : FIGURE_WORD}
          </span>
        }
        right={
          chip.lender ? (
            <LenderLogo lender={chip.lender} height={30} />
          ) : (
            <span
              style={{
                fontSize: big.length > 6 ? 30 : 36,
                fontWeight: 900,
                color: t >= 1 ? GOLD : "#ffffff",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {counted(big, t)}
            </span>
          )
        }
      />
    </div>
  );
};

export const ChipLayer: React.FC<{ chips: Chip[] }> = ({ chips }) => (
  <>
    {chips.map((c) => (
      <Sequence
        key={`${c.from}${c.figure?.big ?? c.lender?.name}`}
        from={c.from}
        durationInFrames={Math.max(1, c.to - c.from)}
        layout="none"
      >
        <ChipView chip={c} />
      </Sequence>
    ))}
  </>
);
