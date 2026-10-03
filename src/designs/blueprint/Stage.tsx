// "blueprint" stage pieces: the hook as a title inside a drawn frame with
// dimension ticks, every figure (golden rule 1) as a measured dimension line
// or, for a percentage, an arc traced like a compass on a protractor, and a
// named bank (rule 2) in a drawn detail-callout circle with a leader line.
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
  READING,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
  asSaid,
  hookText,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { yieldToCompare } from "../../elements/yieldToCompare";
import { FONT, clamp } from "../../mortgage/style";
import {
  Arrow,
  INK,
  MID_X,
  STAGE,
  STAGE_H,
  Seg,
  TB_H,
  TB_W,
  Trace,
  circlePath,
  draw,
  rectPath,
  tint,
} from "./Paper";

// Full-stage layer: an svg for the lines, children (HTML text) on top, a
// short fade out at the end of its Sequence.
export const StageSheet: React.FC<{
  lines: React.ReactNode;
  children?: React.ReactNode;
}> = ({ lines, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
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
        left: 0,
        top: STAGE.top,
        width: 1080,
        height: STAGE_H,
        fontFamily: FONT,
        opacity: out,
      }}
    >
      <svg
        width={1080}
        height={STAGE_H}
        style={{ position: "absolute", overflow: "visible" }}
      >
        {lines}
      </svg>
      {children}
    </div>
  );
};

// Absolutely placed text box in stage coordinates.
export const Txt: React.FC<{
  top: number;
  left?: number;
  width?: number;
  style: React.CSSProperties;
  children: React.ReactNode;
}> = ({
  top,
  left = SAFE.left,
  width = SAFE.right - SAFE.left,
  style,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      width,
      textAlign: "center",
      lineHeight: 1.25,
      ...style,
    }}
  >
    {children}
  </div>
);

// "4,1 tỷ" -> counts 0 → 4,1 with the same decimals; text around it kept.
export const counted = (big: string, t: number): string => {
  if (asSaid(big)) return big; // a year or a date: as said (golden rule 1)
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  // Dates and years stay as said ("29/9", "2026"), never "2.026".
  if (
    !Number.isFinite(target) ||
    /\d[/:]\d/.test(big) ||
    /^(19|20)\d\d$/.test(big)
  )
    return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// A percentage fills its arc on a 10 % scale below 10 % (interest rates), else
// on 100 %.
const arcFill = (big: string): number => {
  const m = big.match(/\d[\d.,]*/);
  const v = m ? parseFloat(m[0].replace(",", ".")) : NaN;
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : 1;
};

// ---------------------------------------------------------------- hook

const HOOK_BOX = {
  x: SAFE.left + 40,
  y: 70,
  w: SAFE.right - SAFE.left - 80,
  h: 250,
};

const HookSheet: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 32], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const big = hookText(hook, t);
  const box = draw(frame, 0, 22);
  const dim = draw(frame, 10, 30);
  const { x, y, w, h } = HOOK_BOX;
  // Ticks along the top dimension line, every 1/8 of the width.
  const ticks = Array.from({ length: 9 }, (_, i) => x + (w * i) / 8);
  return (
    <StageSheet
      lines={
        <>
          <Trace d={rectPath(x, y, w, h)} p={box} width={4} />
          <Trace
            d={rectPath(x + 12, y + 12, w - 24, h - 24)}
            p={draw(frame, 6, 26)}
            width={1.5}
            color={tint(INK, 0.5)}
          />
          {/* Extension lines up from the frame, the dimension line between. */}
          <Seg x1={x} y1={y - 8} x2={x} y2={y - 58} p={dim} width={2} />
          <Seg x1={x + w} y1={y - 8} x2={x + w} y2={y - 58} p={dim} width={2} />
          <Seg x1={x} y1={y - 36} x2={x + w} y2={y - 36} p={dim} width={2} />
          <Arrow x={x + 2} y={y - 36} deg={180} show={dim} />
          <Arrow x={x + w - 2} y={y - 36} deg={0} show={dim} />
          {ticks.map((tx, i) => (
            <Seg
              key={tx}
              x1={tx}
              y1={y - 36}
              x2={tx}
              y2={y - 36 - (i % 4 === 0 ? 16 : 9)}
              p={draw(frame, 18 + i, 24 + i)}
              width={2}
            />
          ))}
        </>
      }
    >
      <Txt
        top={y}
        style={{
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: big.length > 8 ? 120 : 168,
          fontWeight: 900,
          lineHeight: 1,
          color: brand.highlight,
          opacity: interpolate(frame, [4, 12], [0, 1], clamp),
        }}
      >
        {big}
      </Txt>
      {hook.sub ? (
        <Txt
          top={y + h + 34}
          style={{
            fontSize: 50,
            fontWeight: 800,
            color: brand.text,
            opacity: interpolate(frame, [16, 28], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [16, 28], [18, 0], clamp)}px)`,
          }}
        >
          {hook.sub}
        </Txt>
      ) : null}
    </StageSheet>
  );
};

// ---------------------------------------------------------------- figures

const StatLabel: React.FC<{ top: number; text: string }> = ({ top, text }) => {
  const frame = useCurrentFrame();
  return (
    <Txt
      top={top}
      style={{
        fontSize: 44,
        fontWeight: 800,
        color: brand.text,
        opacity: interpolate(frame, [14, 26], [0, 1], clamp),
      }}
    >
      {text}
    </Txt>
  );
};

// A number measured between two extension lines, CAD style: the value sits
// above the dimension line, the stat's label below it.
const DimensionFigure: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [6, 34], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const ext = draw(frame, 0, 12);
  const line = draw(frame, 8, 26);
  const x1 = SAFE.left + 50;
  const x2 = SAFE.right - 50;
  const ly = 290;
  const text = counted(figure.big, t);
  return (
    <StageSheet
      lines={
        <>
          <Seg x1={x1} y1={ly + 50} x2={x1} y2={ly - 190} p={ext} width={2} />
          <Seg x1={x2} y1={ly + 50} x2={x2} y2={ly - 190} p={ext} width={2} />
          {/* Grown from the middle out to both arrows. */}
          <Seg x1={MID_X} y1={ly} x2={x1 + 2} y2={ly} p={line} width={3} />
          <Seg x1={MID_X} y1={ly} x2={x2 - 2} y2={ly} p={line} width={3} />
          <Arrow x={x1 + 2} y={ly} deg={180} show={line >= 1 ? 1 : 0} />
          <Arrow x={x2 - 2} y={ly} deg={0} show={line >= 1 ? 1 : 0} />
          <Trace
            d={`M ${MID_X - 140} ${ly + 22} H ${MID_X + 140}`}
            p={draw(frame, 30, 40)}
            width={4}
            color={brand.highlight}
          />
        </>
      }
    >
      <Txt
        top={ly - 196}
        style={{
          height: 172,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          fontSize: figure.big.length > 7 ? 120 : 160,
          fontWeight: 900,
          lineHeight: 1,
          color: t >= 1 ? brand.highlight : brand.text,
          opacity: interpolate(frame, [4, 10], [0, 1], clamp),
        }}
      >
        {text}
      </Txt>
      {figure.source === "stat" ? (
        <StatLabel top={ly + 56} text={figure.label} />
      ) : null}
    </StageSheet>
  );
};

// A percentage: an arc traced round a protractor, the value in its middle.
const ArcFigure: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [6, 36], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const R = 180;
  const cx = MID_X;
  const cy = figure.source === "stat" ? 200 : 240;
  const ring = draw(frame, 0, 16);
  const fill = arcFill(figure.big) * t;
  const end = -Math.PI / 2 + fill * 2 * Math.PI;
  const C = 2 * Math.PI * R;
  return (
    <StageSheet
      lines={
        <>
          <Trace
            d={circlePath(cx, cy, R)}
            p={ring}
            width={2}
            color={tint(INK, 0.55)}
          />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * 2 * Math.PI;
            const long = i % 9 === 0;
            const r0 = R + 8;
            const r1 = R + (long ? 34 : 20);
            return (
              <Seg
                key={i}
                x1={cx + r0 * Math.sin(a)}
                y1={cy - r0 * Math.cos(a)}
                x2={cx + r1 * Math.sin(a)}
                y2={cy - r1 * Math.cos(a)}
                p={draw(frame, 4 + i * 0.4, 10 + i * 0.4)}
                width={long ? 3 : 1.5}
              />
            );
          })}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={brand.highlight}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fill)}
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={fill > 0 ? 1 : 0}
          />
          {/* The compass arm from the centre to the pencil point. */}
          <Seg
            x1={cx}
            y1={cy}
            x2={cx + R * Math.cos(end)}
            y2={cy + R * Math.sin(end)}
            p={ring}
            width={1.5}
            color={tint(INK, 0.5)}
            dash="6 8"
          />
          <circle
            cx={cx + R * Math.cos(end)}
            cy={cy + R * Math.sin(end)}
            r={9}
            fill={brand.highlight}
            opacity={ring}
          />
        </>
      }
    >
      <Txt
        top={cy - 70}
        style={{
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: figure.big.length > 6 ? 92 : 118,
          fontWeight: 900,
          lineHeight: 1,
          color: brand.text,
          textShadow: `0 0 24px ${brand.navy}`,
        }}
      >
        {counted(figure.big, t)}
      </Txt>
      {figure.source === "stat" ? (
        <StatLabel top={cy + R + 50} text={figure.label} />
      ) : null}
    </StageSheet>
  );
};

const FigureSheet: React.FC<{ figure: Figure }> = ({ figure }) =>
  figure.big.includes("%") ? (
    <ArcFigure figure={figure} />
  ) : (
    <DimensionFigure figure={figure} />
  );

// A figure shown while another cue or figure holds the stage: the number as
// said, plain, in the free strip between the title block and the stage top
// (under the stage it met a two-line caption page; check-design-figures).
export const CHIP = {
  top: SAFE.top + TB_H + 8,
  left: SAFE.left,
  width: TB_W,
  size: 48,
};
const FigureChip: React.FC<{ figure: Figure }> = ({ figure }) => (
  <StageSheet lines={null}>
    <Txt
      top={CHIP.top - STAGE.top}
      left={CHIP.left}
      width={CHIP.width}
      style={{
        fontSize: 48,
        fontWeight: 900,
        lineHeight: 1,
        textAlign: "left",
        // ponytail: one line, no fit: a big over ~16 characters runs past
        // TB_W toward the logo; fitText it if a stat ever does.
        whiteSpace: "nowrap",
        color: brand.highlight,
      }}
    >
      {figure.big}
    </Txt>
  </StageSheet>
);

// ---------------------------------------------------------------- lender

// Detail callout: a circle drawn round the logo, a leader line out to a
// neutral label (never "partner", never the bank's colours).
const LenderSheet: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const R = 190;
  const cx = MID_X + 60;
  const cy = 210;
  const ring = draw(frame, 0, 18);
  const lead = draw(frame, 14, 28);
  const a = (3 * Math.PI) / 4; // leave the circle bottom-left
  const sx = cx + R * Math.cos(a);
  const sy = cy + R * Math.sin(a);
  const kx = SAFE.left + 60;
  const ky = 450;
  const pop = spring({
    frame: frame - 6,
    fps,
    config: { damping: 13, stiffness: 170 },
  });
  return (
    <StageSheet
      lines={
        <>
          <Trace d={circlePath(cx, cy, R)} p={ring} width={4} />
          <Trace
            d={circlePath(cx, cy, R + 14)}
            p={draw(frame, 6, 22)}
            width={1.5}
            color={tint(INK, 0.45)}
          />
          <Seg x1={sx} y1={sy} x2={kx + 40} y2={ky} p={lead} width={2.5} />
          <Seg
            x1={kx + 40}
            y1={ky}
            x2={kx + 500}
            y2={ky}
            p={draw(frame, 26, 36)}
            width={2.5}
          />
          <circle cx={sx} cy={sy} r={7} fill={INK} opacity={lead} />
        </>
      }
    >
      <div
        style={{
          position: "absolute",
          left: cx - R,
          top: cy - R,
          width: 2 * R,
          height: 2 * R,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: pop,
          transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
        }}
      >
        <LenderLogo
          lender={lender}
          height={96}
          style={{ maxWidth: 2 * R - 30 }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: kx + 50,
          top: ky - 46,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 3,
          color: INK,
          opacity: interpolate(frame, [30, 40], [0, 1], clamp),
        }}
      >
        CHI TIẾT A · ĐANG NHẮC TỚI
      </div>
    </StageSheet>
  );
};

// ---------------------------------------------------------------- layer

// The core figures, each yielding to a compare cue on the same stage
// (yieldToCompare: cut, held over its drop-in, or moved after it, as a chip
// under the stage when another cue holds it then; exported for
// check-design-figures).
export const stageFigures = (
  reel: Reel,
  fps: number,
): (Figure & { chip?: boolean })[] => {
  const at = outFrameOf(reel.timeline, fps);
  const span = (c: { fromMs: number; toMs: number }): [number, number] => [
    at(c.fromMs),
    at(c.toMs),
  ];
  const cues = (reel.edit.cues ?? []).filter((c) => c.kind !== "emoji");
  return yieldToCompare(
    figuresOf(reel, fps),
    cues.filter((c) => c.kind === "compare").map(span),
    cues.map(span),
    Math.round((READING.minNumberHoldMs / 1000) * fps),
  );
};

export const StageLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const figures = stageFigures(reel, fps);
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookSheet hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {figures.map((f, i) => {
        // figuresOf starts every figure after the hook (golden rule 1); each
        // is held its minimum read and gives way to the next figure.
        const from = f.fromFrame;
        const next = figures[i + 1]?.fromFrame ?? Infinity;
        const frames = Math.max(
          Math.min(f.fromFrame + f.frames, next) - from,
          Math.round((READING.minNumberHoldMs / 1000) * fps),
        );
        return (
          <Sequence
            key={`${f.source}${f.fromFrame}`}
            from={from}
            durationInFrames={frames}
            layout="none"
          >
            {f.chip ? <FigureChip figure={f} /> : <FigureSheet figure={f} />}
          </Sequence>
        );
      })}
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
            <LenderSheet lender={m.lender} />
          </Sequence>
        );
      })}
    </>
  );
};
