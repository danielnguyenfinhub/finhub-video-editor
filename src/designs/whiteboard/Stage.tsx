// "whiteboard" stage: the band in the middle of the board where one thing at a
// time is drawn: the hook headline (written, then underlined twice), a spoken
// number (written large, circled or boxed, a doodle beside it, an arrow to its
// label), a named bank's logo taped to the board. Plus the chapter note and
// the English line. `busyFrames` tells the captions when to step down.
import { Box, Circle } from "@remotion/rough-notation";
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
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import {
  BLUE,
  CurvedArrow,
  DrawnIcon,
  GOLD,
  INK,
  MarkerUnderline,
  SOFT,
  Written,
  alpha,
  iconFor,
  mix,
  swipe,
  useDraw,
} from "./Board";

// The stage starts under the LogoMark tile and ends above the lower caption
// band; the English line owns the bottom ENGLISH_ROOM of SAFE.
export const STAGE = { top: 600, bottom: 1160 };
export const ENGLISH_ROOM = 130;
export const STAGE_W = SAFE.right - SAFE.left;

export const busyFrames = (reel: Reel, fps: number): [number, number][] => {
  const at = outFrameOf(reel.timeline, fps);
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  return [
    ...(reel.edit.hook ? [[0, HOOK_FRAMES] as [number, number]] : []),
    ...figuresOf(reel, fps).map(
      (x) => [x.fromFrame, x.fromFrame + x.frames] as [number, number],
    ),
    ...lenderMentionsOf(reel).map(
      (m) => [f(m.startMs), f(m.endMs)] as [number, number],
    ),
    ...(reel.edit.cues ?? [])
      .filter((c) => c.kind !== "emoji")
      .map((c) => [at(c.fromMs), at(c.toMs)] as [number, number]),
  ];
};

type Place = "center" | "top";
export const StageBox: React.FC<{
  children: React.ReactNode;
  place?: Place;
}> = ({ children, place = "center" }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      width: STAGE_W,
      top: STAGE.top,
      height: STAGE.bottom - STAGE.top,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: place === "top" ? "flex-start" : "center",
      fontFamily: FONT,
    }}
  >
    {children}
  </div>
);

// Wiped off the board over the last frames of a Sequence (an eraser pass).
const useErase = (frames = 8) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - frames, durationInFrames],
    [0, 1],
    clamp,
  );
};
// Circles and boxes reach past their block, so nothing is clipped until the
// eraser starts; then it wipes from the left.
export const erased = (e: number): React.CSSProperties =>
  e > 0 ? { clipPath: `inset(-40% -40% -40% ${e * 100}%)` } : {};

// ------------------------------------------------------------- figures

// Numbers are written as said, never counted up (a year or date would flash
// wrong values).
const StatFigure: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const e = useErase();
  const icon = useDraw(14, 26);
  const arrow = useDraw(26, 14);
  const big = figure.big.length > 6 ? 120 : 150;
  return (
    <StageBox>
      <div
        style={{
          ...erased(e),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 90 }}>
          <DrawnIcon
            icon={iconFor(`${figure.big} ${figure.label}`)}
            size={150}
            progress={icon}
            color={BLUE}
          />
          <Circle
            progress={interpolate(frame, [12, 30], [0, 1], clamp)}
            color={GOLD}
            strokeWidth={9}
            iterations={2}
            seed={11}
            padding={{ left: 18, right: 18, top: 8, bottom: 8 }}
          >
            <Written frames={12}>
              <span
                style={{
                  fontSize: big,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: INK,
                }}
              >
                {figure.big}
              </span>
            </Written>
          </Circle>
        </div>
        {figure.label ? (
          <>
            <CurvedArrow
              w={120}
              h={90}
              progress={arrow}
              style={{ marginTop: 18, marginLeft: -140 }}
            />
            <Written at={32} frames={18} style={{ maxWidth: STAGE_W - 40 }}>
              <div
                style={{
                  fontSize: 46,
                  lineHeight: 1.3,
                  fontWeight: 800,
                  color: INK,
                  textAlign: "center",
                }}
              >
                {figure.label}
              </div>
            </Written>
          </>
        ) : null}
      </div>
    </StageBox>
  );
};

// Scale for a sketched bar: a percentage below 10 on a 10 % scale (rates).
const barFill = (big: string): number | null => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return null;
  const v = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : null;
};

// Short automatic figure: the number boxed in marker, a doodle beside it, a
// hatched bar for a percentage.
const AutoFigure: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const e = useErase(6);
  const icon = useDraw(8, 20);
  const fill = barFill(figure.big);
  const size = figure.big.length > 7 ? 120 : 160;
  return (
    <StageBox>
      <div
        style={{
          ...erased(e),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <Box
            progress={interpolate(frame, [10, 26], [0, 1], clamp)}
            color={BLUE}
            strokeWidth={7}
            iterations={2}
            seed={9}
            padding={{ left: 26, right: 26, top: 8, bottom: 8 }}
          >
            <Written frames={10}>
              <span
                style={{
                  fontSize: size,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: INK,
                }}
              >
                {figure.big}
              </span>
            </Written>
          </Box>
          <DrawnIcon
            icon={iconFor(`${figure.big} ${figure.label}`)}
            size={150}
            progress={icon}
            color={BLUE}
          />
        </div>
        {fill !== null ? <SketchBar fill={fill} /> : null}
        {figure.label ? (
          <Written at={16} frames={12} style={{ marginTop: 40 }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: SOFT,
                textAlign: "center",
              }}
            >
              {figure.label}
            </div>
          </Written>
        ) : null}
      </div>
    </StageBox>
  );
};

// An outlined bar, then diagonal hatching filling it to the value.
const SketchBar: React.FC<{ fill: number }> = ({ fill }) => {
  const outline = useDraw(12, 10);
  const hatch = useDraw(20, 16);
  const W = 560;
  const H = 56;
  return (
    <div
      style={{
        position: "relative",
        marginTop: 36,
        width: W,
        height: H,
        border: `5px solid ${INK}`,
        borderRadius: 6,
        clipPath: `inset(-10% ${(1 - outline) * 100}% -10% -2%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 4,
          width: (W - 18) * fill * hatch,
          background: `repeating-linear-gradient(-45deg, ${GOLD} 0 8px, transparent 8px 16px)`,
        }}
      />
    </div>
  );
};

// ------------------------------------------------------------- hook

// The headline written across the board, underlined twice; the sub line
// written under it.
const HookBoard: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const e = useErase(10);
  const sub = useDraw(30, 14);
  return (
    <StageBox>
      <div
        style={{
          ...erased(e),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative" }}>
          <Written frames={16}>
            <div
              style={{
                fontSize: hook.big.length > 10 ? 110 : 200,
                fontWeight: 900,
                lineHeight: 1.02,
                color: INK,
                textAlign: "center",
                maxWidth: STAGE_W - 20,
              }}
            >
              {hook.big}
            </div>
          </Written>
          <MarkerUnderline at={16} color={GOLD} width={11} second seed="hook" />
        </div>
        {hook.sub ? (
          <Written
            at={30}
            frames={16}
            style={{ marginTop: 70, maxWidth: STAGE_W - 40 }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.3,
                textAlign: "center",
                color: INK,
              }}
            >
              <span style={swipe(sub, brand.highlight, 0.45)}>{hook.sub}</span>
            </div>
          </Written>
        ) : null}
      </div>
    </StageBox>
  );
};

// ------------------------------------------------------------- lender

// The logo on a white card taped to the board; a neutral note written above
// with an arrow down to it.
const LenderCard: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = useErase(8);
  const stick = spring({
    frame: frame - 10,
    fps,
    config: { damping: 13, stiffness: 170 },
  });
  const arrow = useDraw(4, 14);
  const tape = (left: number | string, rot: number): React.CSSProperties => ({
    position: "absolute",
    top: -18,
    left,
    width: 120,
    height: 38,
    background: alpha(mix(brand.slate, brand.card, 0.55), 0.7),
    transform: `rotate(${rot}deg)`,
    opacity: interpolate(frame, [16, 22], [0, 1], clamp),
  });
  return (
    <StageBox>
      <div
        style={{
          ...erased(e),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Written frames={12}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: 4,
              color: SOFT,
            }}
          >
            ĐANG NHẮC TỚI
          </div>
        </Written>
        <CurvedArrow
          w={110}
          h={90}
          progress={arrow}
          style={{ margin: "12px 0 6px 120px" }}
        />
        <div
          style={{
            position: "relative",
            padding: "44px 60px",
            background: brand.card,
            borderRadius: 8,
            boxShadow: `0 ${4 + 14 * (1 - stick)}px ${14 + 20 * (1 - stick)}px ${alpha(brand.navy, 0.22)}`,
            transform: `rotate(-2deg) scale(${interpolate(stick, [0, 1], [1.15, 1])})`,
            opacity: interpolate(stick, [0, 0.3], [0, 1], clamp),
          }}
        >
          <div style={tape(-30, -14)} />
          <div style={tape("calc(100% - 90px)", 12)} />
          <LenderLogo lender={lender} height={140} />
        </div>
      </div>
    </StageBox>
  );
};

export const StageLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  // figuresOf starts every figure after the hook (golden rule 1).
  const figures = figuresOf(reel, fps);
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookBoard hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          {f.source === "stat" ? (
            <StatFigure figure={f} />
          ) : (
            <AutoFigure figure={f} />
          )}
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
            layout="none"
          >
            <LenderCard lender={m.lender} />
          </Sequence>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------- chapter note

const ChapterNote: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const e = useErase(8);
  const box = useDraw(0, 10);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        maxWidth: 540,
        fontFamily: FONT,
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        ...erased(e),
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          padding: "6px 14px",
          border: `5px solid ${BLUE}`,
          borderRadius: 10,
          color: BLUE,
          fontSize: 30,
          fontWeight: 900,
          clipPath: `inset(-10% ${(1 - box) * 100}% -10% -5%)`,
        }}
      >
        PHẦN {index}
      </div>
      <div style={{ position: "relative" }}>
        <Written at={8} frames={14}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              lineHeight: 1.25,
              color: INK,
            }}
          >
            {title}
          </div>
        </Written>
        <MarkerUnderline at={20} color={GOLD} width={7} seed={`ch${index}`} />
      </div>
    </div>
  );
};

export const ChapterNotes: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <ChapterNote index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- English line

// Slate italic under a thin blue marker rule, at the foot of the board.
export const EnglishLine: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.subtitles ?? []).map((s) => {
        const from = at(s.fromMs);
        return (
          <Sequence
            key={s.fromMs}
            from={from}
            durationInFrames={Math.max(1, at(s.toMs) - from)}
            layout="none"
          >
            <div
              style={{
                position: "absolute",
                left: SAFE.left,
                width: STAGE_W,
                bottom: 1920 - SAFE.bottom,
                height: ENGLISH_ROOM - 20,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 30,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: SOFT,
                  textAlign: "center",
                  borderTop: `4px solid ${alpha(BLUE, 0.5)}`,
                  paddingTop: 10,
                }}
              >
                {s.text}
              </div>
            </div>
          </Sequence>
        );
      })}
    </>
  );
};
