// The board's stage (STAGE band): the hook as a split-flap headline, every
// figure (golden rule 1) as flip digits with a meter and a neutral tick line,
// every named bank (rule 2) as a quote card: logo + neutral label, no prices.
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import {
  HOOK_FRAMES,
  SAFE,
  asSaid,
  figuresOf,
  lenderMentionsOf,
  type Figure,
  saidKind,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { EditJson, Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import {
  AMBER,
  FlipText,
  FlipTiles,
  INK,
  Led,
  SKY,
  STAGE,
  tileFor,
} from "./Board";

export const HOOK_KICKER = "TIÊU ĐIỂM";
export const FIGURE_KICKER = "CON SỐ";
export const YEAR_KICKER = "NĂM";
export const DATE_KICKER = "NGÀY";
// A year or a date is not "the number" of anything (recheck 09): its own
// neutral word, shown as said (golden rule 1).
export const kickerOf = (big: string): string => {
  const kind = saidKind(big);
  return kind === "year"
    ? YEAR_KICKER
    : kind === "date"
      ? DATE_KICKER
      : FIGURE_KICKER;
};
export const LENDER_KICKER = "ĐANG NHẮC TỚI";
export const LENDER_SUB = "Ngân hàng";

const W = SAFE.right - SAFE.left;

const StageBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = enter(frame, fps);
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: W,
        top: STAGE.top,
        height: STAGE.bottom - STAGE.top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Kicker: React.FC<{ text: string; color?: string }> = ({
  text,
  color = AMBER,
}) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}
  >
    <Led color={color} size={16} />
    <span style={{ color, fontWeight: 900, fontSize: 32, letterSpacing: 6 }}>
      <FlipText text={text} start={0} />
    </span>
  </div>
);

const HookBoard: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const frame = useCurrentFrame();
  return (
    <StageBox>
      <Kicker text={HOOK_KICKER} />
      <FlipTiles
        text={hook.big}
        start={2}
        tileW={tileFor(hook.big, W - 40, 150)}
        color={AMBER}
      />
      {hook.sub ? (
        <div
          style={{
            marginTop: 30,
            maxWidth: W - 40,
            textAlign: "center",
            fontSize: 50,
            fontWeight: 800,
            lineHeight: 1.3,
            color: "#fff",
            opacity: interpolate(frame, [18, 24], [0, 1], clamp),
          }}
        >
          <FlipText text={hook.sub} start={18} />
        </div>
      ) : null}
    </StageBox>
  );
};

// How far the meter fills: a percentage on a 10 % scale below 10 % (rates),
// else 100 %; a date, count or amount has no scale, so the meter fills.
// A year or a date has no meter (null): shown as said.
export const meterFill = (big: string): number | null => {
  if (asSaid(big)) return null;
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, v / (v < 10 ? 10 : 100));
};

// A flat tick line with a travelling dot: movement, no direction (a figure
// carries no up/down in the data, so the board claims none).
const NeutralTick: React.FC<{ h: number }> = ({ h }) => {
  const frame = useCurrentFrame();
  const x = 10 + ((frame * 2.2) % 100);
  return (
    <svg width={120} height={h} style={{ flex: "0 0 120px" }}>
      <line
        x1={8}
        x2={112}
        y1={h / 2}
        y2={h / 2}
        stroke={SKY}
        strokeWidth={4}
        strokeDasharray="10 8"
        opacity={0.6}
      />
      <circle cx={x} cy={h / 2} r={8} fill={SKY} />
    </svg>
  );
};

const FigureBoard: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const tileW = tileFor(figure.big, W - 200, 130);
  const fillTo = meterFill(figure.big);
  const fill =
    (fillTo ?? 0) *
    interpolate(frame, [10, 34], [0, 1], {
      ...clamp,
      easing: (x) => 1 - (1 - x) ** 3,
    });
  const label = figure.source === "stat" ? figure.label : "";
  return (
    <StageBox>
      <Kicker text={kickerOf(figure.big)} color={SKY} />
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <FlipTiles text={figure.big} start={2} tileW={tileW} color={AMBER} />
        <NeutralTick h={tileW * 1.38} />
      </div>
      {fillTo === null ? null : (
        <div
          style={{
            marginTop: 30,
            width: Math.min(W - 80, 720),
            height: 14,
            borderRadius: 7,
            background: "rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${fill * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${SKY}, ${AMBER})`,
              boxShadow: `0 0 18px ${AMBER}`,
            }}
          />
        </div>
      )}
      {label ? (
        <div
          style={{
            marginTop: 26,
            maxWidth: W - 40,
            textAlign: "center",
            fontSize: 44,
            lineHeight: 1.3,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          <FlipText text={label} start={12} />
        </div>
      ) : null}
    </StageBox>
  );
};

const LenderQuote: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13, stiffness: 170 } });
  return (
    <StageBox>
      <div
        style={{
          width: W - 40,
          display: "flex",
          alignItems: "center",
          gap: 34,
          padding: "30px 34px",
          borderRadius: 18,
          background: `linear-gradient(90deg, ${INK}, ${brand.background})`,
          borderLeft: `8px solid ${AMBER}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          transform: `translateX(${interpolate(pop, [0, 1], [-80, 0])}px)`,
          opacity: pop,
        }}
      >
        <LenderLogo lender={lender} height={110} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Led size={14} />
            <span
              style={{
                color: AMBER,
                fontWeight: 900,
                fontSize: 30,
                letterSpacing: 4,
              }}
            >
              <FlipText text={LENDER_KICKER} start={4} />
            </span>
          </div>
          <span style={{ color: brand.textDim, fontWeight: 800, fontSize: 36 }}>
            {LENDER_SUB}
            <span
              style={{
                opacity: Math.floor(frame / 12) % 2 ? 0 : 1,
                color: SKY,
              }}
            >
              {" "}
              ▌
            </span>
          </span>
        </div>
      </div>
    </StageBox>
  );
};

// A figure said during the hook waits for it to end: the core does that
// (figuresOf, golden rule 1), so the hook board shows the hook alone.
export const TickerStage: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const hook = reel.edit.hook;
  const boards = figuresOf(reel, fps);
  return (
    <>
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <HookBoard hook={hook} />
        </Sequence>
      ) : null}
      {boards.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
        >
          <FigureBoard figure={f} />
        </Sequence>
      ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const to = Math.round((m.endMs / 1000) * fps);
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={Math.max(1, to - from)}
          >
            <LenderQuote lender={m.lender} />
          </Sequence>
        );
      })}
    </>
  );
};
