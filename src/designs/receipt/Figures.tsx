// Figures (golden rule 1) as tear-off stubs: a gold counterfoil with the
// kicker, a perforation, the number (counted up unless it is a year or a
// date) and a stat's label. Big on the stage; small in the top band (chip)
// when the stage is taken. Banks (rule 2) as a printed slip with the logo
// on the stage, or a white tag in the top band. Neutral labels only.
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE, type Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { FONT, clamp } from "../../mortgage/style";
import {
  CHIP_RIGHT,
  FADED,
  GOLD,
  INK,
  PAPER,
  PrintedReceipt,
  STAGE,
  TABULAR,
  TOP_BAND,
  W,
  counted,
  fit,
  inOrder,
  type Line,
} from "./Paper";
import { HEAD_H, HeadLine, TextLine, stubClip } from "./Rows";

export const FIGURE_KICKER = "CON SỐ";
export const LENDER_KICKER = "ĐANG NHẮC TỚI";
export const LENDER_SUB = "Ngân hàng";

export const COUNT = 20; // frames a number counts up

export const Stub: React.FC<{
  big: string;
  label: string;
  width: number;
  height: number;
  bigMax: number;
  kickerSize?: number;
}> = ({ big, label, width, height, bigMax, kickerSize = 26 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const perf = Math.round(Math.min(height * 0.36, 110));
  const inner = width - perf - 50;
  const p = spring({ frame, fps, config: { damping: 13, stiffness: 150 } });
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  const shown = counted(big, interpolate(frame, [4, 4 + COUNT], [0, 1], clamp));
  const b = fit(big, inner, 1, bigMax, 900, true);
  const l = label ? fit(label, inner, 2, Math.round(bigMax * 0.3), 800) : null;
  const tilt = interpolate(p, [0, 1], [-7, -1.5]) + Math.sin(frame / 30) * 0.4;
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [-60, 0])}px) rotate(${tilt}deg)`,
        filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.55))",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: stubClip(width, height, perf),
          background: `linear-gradient(90deg, ${GOLD} ${perf}px, ${PAPER} ${perf}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: perf - 2,
          top: 18,
          bottom: 18,
          borderLeft: `4px dashed rgba(91,107,128,0.5)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: perf,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            transform: "rotate(-90deg)",
            whiteSpace: "nowrap",
            fontWeight: 900,
            fontSize: kickerSize,
            letterSpacing: "0.22em",
            color: INK,
          }}
        >
          {FIGURE_KICKER}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: perf + 26,
          width: inner,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          color: INK,
        }}
      >
        <div
          style={{
            fontSize: b.size,
            fontWeight: 900,
            lineHeight: 1.05,
            whiteSpace: "nowrap",
            ...TABULAR,
          }}
        >
          {shown}
        </div>
        {l ? (
          <div
            style={{
              marginTop: 12,
              fontSize: l.size,
              fontWeight: 800,
              lineHeight: 1.22,
              color: FADED,
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const figureLabel = (f: Figure) => (f.source === "stat" ? f.label : "");

export const StageStub: React.FC<{ figure: Figure }> = ({ figure }) => {
  const label = figureLabel(figure);
  const width = Math.min(W, 800);
  const height = label ? 360 : 280;
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - width / 2,
        top: (STAGE.top + STAGE.bottom) / 2 - height / 2 - 10,
      }}
    >
      <Stub
        big={figure.big}
        label={label}
        width={width}
        height={height}
        bigMax={170}
      />
    </div>
  );
};

// Top-band chips, left of the LogoMark tile.
export const CHIP_W = CHIP_RIGHT - SAFE.left;
const CHIP_H = 128;

export const FigureChip: React.FC<{ figure: Figure }> = ({ figure }) => (
  <div style={{ position: "absolute", left: SAFE.left, top: TOP_BAND.top + 8 }}>
    <Stub
      big={figure.big}
      label={figureLabel(figure)}
      width={CHIP_W}
      height={CHIP_H}
      bigMax={62}
      kickerSize={16}
    />
  </div>
);

export const LenderChip: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 13 } });
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: TOP_BAND.top + 8,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "12px 20px",
        borderRadius: 12,
        background: PAPER,
        fontFamily: FONT,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
        boxShadow: "0 14px 30px rgba(0,0,0,0.5)",
      }}
    >
      <LenderLogo lender={lender} height={54} />
      <span
        style={{
          color: FADED,
          fontWeight: 900,
          fontSize: 22,
          letterSpacing: "0.2em",
        }}
      >
        {LENDER_KICKER}
      </span>
    </div>
  );
};

const LW = 620;

export const LenderSlip: React.FC<{ lender: Lender }> = ({ lender }) => {
  const lines: Line[] = inOrder([
    { key: "head", at: 0, h: HEAD_H, node: <HeadLine /> },
    {
      key: "kicker",
      at: 0,
      h: 50,
      node: (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 26,
            letterSpacing: "0.3em",
            color: FADED,
          }}
        >
          {LENDER_KICKER}
        </div>
      ),
    },
    {
      key: "logo",
      at: 0,
      h: 200,
      node: (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LenderLogo lender={lender} height={116} />
        </div>
      ),
    },
    {
      key: "sub",
      at: 0,
      h: 64,
      node: <TextLine text={LENDER_SUB} size={36} weight={800} color={FADED} />,
    },
  ]);
  return (
    <PrintedReceipt
      x={540 - LW / 2}
      width={LW}
      lines={lines}
      tearAt={lines[lines.length - 1].at + 14}
      seed="lender"
      pad={30}
    />
  );
};
