// "phoneapp" chips: a figure or a named bank that lands while the phone's
// screen is taken floats as a small white card above the phone, in one of
// two lanes left of the LogoMark tile (plan.ts assigns them).
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { FONT, clamp, enter } from "../../mortgage/style";
import {
  CARD_SHADOW,
  CHIP,
  CHIP_LANES,
  INK,
  MUTED,
  Ring,
  WHITE,
  counted,
  ease,
  fadeOut,
  ringFill,
} from "./Phone";
import type { Item, Plan } from "./plan";
import { numberSize } from "./Screens";

const Chip: React.FC<{ item: Item; lane: 0 | 1; dur: number }> = ({
  item,
  lane,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const t = interpolate(frame, [4, 30], [0, 1], { ...clamp, easing: ease });
  const L = CHIP_LANES[lane];
  const inner = L.width - 36;
  return (
    <div
      style={{
        position: "absolute",
        left: L.left,
        width: L.width,
        top: CHIP.top,
        height: CHIP.height,
        padding: "14px 18px",
        borderRadius: 30,
        background: WHITE,
        boxShadow: CARD_SHADOW,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: Math.min(p, fadeOut(frame, dur)),
        transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + 0.15 * p})`,
      }}
    >
      {item.kind === "lender" ? (
        <>
          <LenderLogo lender={item.lender} height={64} style={{ padding: 0 }} />
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: MUTED,
              marginTop: 8,
            }}
          >
            ĐANG NHẮC TỚI
          </div>
        </>
      ) : item.kind === "figure" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: inner - 74,
                fontSize: numberSize(item.figure.big, inner - 74, 64),
                fontWeight: 900,
                lineHeight: 1.15,
                color: INK,
                whiteSpace: "nowrap",
              }}
            >
              {counted(item.figure.big, t)}
            </div>
            <Ring size={60} fill={ringFill(item.figure.big)} t={t} width={10} />
          </div>
          {item.figure.source === "stat" && item.figure.label ? (
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: MUTED,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.figure.label}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

// Chips above the phone (outside it).
export const ChipLayer: React.FC<{ plan: Plan }> = ({ plan }) => (
  <>
    {plan.items.map((i) =>
      i.slot === "screen" ? null : (
        <Sequence
          key={`c${i.kind}${i.from}`}
          from={i.from}
          durationInFrames={i.to - i.from}
          layout="none"
        >
          <Chip item={i} lane={i.slot} dur={i.to - i.from} />
        </Sequence>
      ),
    )}
  </>
);
