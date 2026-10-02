// "paper" stage: the band in the middle of the frame where one thing at a time
// lands as a sheet of paper: the hook headline card, a spoken number (navy card
// with a paper-cut ring, or a stacked-paper bar for the short automatic ones),
// a named bank's logo on a hanging tag. Plus the chapter tab and the English
// line. `busyFrames` tells the captions when to step down to the lower band.
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
  hookText,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import {
  CREAM,
  GOLD_PAPER,
  INK,
  NAVY_PAPER,
  PaperCard,
  Tape,
  alpha,
  mix,
} from "./Desk";

// The stage starts under the LogoMark tile (SAFE.top + 148) and ends above the
// lower caption band; the English line owns the bottom ENGLISH_ROOM of SAFE.
export const STAGE = { top: 590, bottom: 1150 };
export const ENGLISH_ROOM = 146;
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

const StageBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
      justifyContent: "center",
      fontFamily: FONT,
    }}
  >
    {children}
  </div>
);

// "4,1 tỷ" -> counts 0 → 4,1 with the same decimals; text around it kept.
// A date ("29/9") or a year ("2026") is shown as said: counting it up would
// flash wrong dates.
export const counted = (big: string, t: number): string => {
  if (asSaid(big)) return big;
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // "2026" stays "2026"; "1.600" keeps its dot.
    useGrouping: m[0].includes("."),
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// A percentage fills to its value (on a 10 % scale below 10 %, e.g. rates);
// a date, count or amount has no scale, so the ring closes.
const ringFill = (big: string): number => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, v / (v < 10 ? 10 : 100));
};

const useCount = (from = 6, to = 36) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
};

// ------------------------------------------------------------- figures

// Paper-cut ring: a cream track, then two cut arcs stacked on it (gold, and a
// narrower white one on top), each casting a small shadow.
const PaperRing: React.FC<{ r: number; fill: number; t: number }> = ({
  r,
  fill,
  t,
}) => {
  const size = 2 * r + 60;
  const c = r + 30;
  const arc = (rr: number, share: number) => {
    const C = 2 * Math.PI * rr;
    return {
      strokeDasharray: C,
      strokeDashoffset: C * (1 - share),
      transform: `rotate(-90 ${c} ${c})`,
    };
  };
  return (
    <svg width={size} height={size} style={{ position: "absolute" }}>
      <defs>
        <filter id="paper-arc" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor={brand.navy}
            floodOpacity="0.55"
          />
        </filter>
      </defs>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={alpha(brand.card, 0.12)}
        strokeWidth={40}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={GOLD_PAPER}
        strokeWidth={40}
        filter="url(#paper-arc)"
        {...arc(r, fill * t)}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={brand.card}
        strokeWidth={12}
        filter="url(#paper-arc)"
        {...arc(r, fill * interpolate(t, [0.35, 1], [0, 1], clamp) * 0.62)}
      />
    </svg>
  );
};

const StatFigure: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const t = useCount();
  const R = 130;
  return (
    <StageBox>
      <PaperCard background={NAVY_PAPER} rotate={-2}>
        <Tape
          width={170}
          rotate={-6}
          style={{ top: -18, left: -30 }}
          delay={8}
        />
        <div style={{ padding: 34 }}>
          <div
            style={{
              position: "relative",
              width: 2 * R + 60,
              height: 2 * R + 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PaperRing r={R} fill={ringFill(figure.big)} t={t} />
            <div
              style={{
                position: "relative",
                // Inside the ring's hole (~2R - 40 wide, ~0.6 em a glyph).
                fontSize: Math.min(
                  100,
                  (2 * R - 60) / (0.6 * figure.big.length),
                ),
                fontWeight: 900,
                color: CREAM,
              }}
            >
              {counted(figure.big, t)}
            </div>
          </div>
        </div>
      </PaperCard>
      {figure.label ? (
        <div style={{ marginTop: 26, maxWidth: 860 }}>
          <PaperCard rotate={1.2} delay={10} torn={`lbl${figure.big}`}>
            <div
              style={{
                padding: "22px 36px",
                fontSize: 42,
                lineHeight: 1.3,
                fontWeight: 800,
                color: INK,
                textAlign: "center",
                opacity: interpolate(frame, [12, 22], [0, 1], clamp),
              }}
            >
              {figure.label}
            </div>
          </PaperCard>
        </div>
      ) : null}
    </StageBox>
  );
};

// Short automatic figure: the number on a navy tag and a bar built from three
// paper strips laid one after another. A year or date has no scale: no bar.
const STRIPS = [GOLD_PAPER, brand.card, mix(brand.primary, brand.card, 0.35)];
const AutoFigure: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useCount(4, 30);
  const fill = ringFill(figure.big);
  const W = 560;
  const bar = 54;
  return (
    <StageBox>
      <PaperCard background={NAVY_PAPER} rotate={-1.5}>
        <Tape
          width={140}
          rotate={5}
          style={{ top: -18, right: -24 }}
          delay={6}
        />
        <div
          style={{
            padding: "30px 48px 40px",
            width: W + 96,
          }}
        >
          <div
            style={{
              fontSize: figure.big.length > 7 ? 110 : 150,
              fontWeight: 900,
              color: CREAM,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {counted(figure.big, t)}
          </div>
          <div
            style={{
              display: asSaid(figure.big) ? "none" : undefined,
              position: "relative",
              marginTop: 22,
              height: bar,
              borderRadius: 6,
              background: alpha(brand.card, 0.1),
            }}
          >
            {STRIPS.map((color, i) => {
              const g = spring({
                frame: frame - 6 - i * 5,
                fps,
                config: { damping: 18, stiffness: 120 },
              });
              return (
                <div
                  key={color}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: i * (bar / 10),
                    height: bar - i * (bar / 5),
                    width: W * fill * g * (1 - i * 0.18),
                    background: color,
                    borderRadius: 4,
                    boxShadow: `0 3px 5px ${alpha(brand.navy, 0.45)}`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </PaperCard>
    </StageBox>
  );
};

// ------------------------------------------------------------- hook

const HookCard: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const t = useCount(4, 34);
  const big = hookText(hook, t);
  return (
    <StageBox>
      <PaperCard rotate={-2.5} exitFrames={10}>
        <Tape
          width={200}
          rotate={-3}
          style={{ top: -22, left: "50%", marginLeft: -100 }}
          delay={12}
        />
        <div
          style={{
            padding: "54px 70px 40px",
            minWidth: 620,
            maxWidth: STAGE_W - 40,
            textAlign: "center",
            fontSize: big.length > 10 ? 110 : 168,
            fontWeight: 900,
            lineHeight: 1.05,
            color: INK,
          }}
        >
          {big}
        </div>
      </PaperCard>
      {hook.sub ? (
        <div style={{ marginTop: -14, maxWidth: STAGE_W - 60 }}>
          <PaperCard
            background={NAVY_PAPER}
            rotate={1.8}
            delay={9}
            exitFrames={10}
          >
            <div
              style={{
                padding: "20px 38px",
                fontSize: 48,
                fontWeight: 800,
                lineHeight: 1.3,
                textAlign: "center",
                color: CREAM,
              }}
            >
              {hook.sub}
            </div>
          </PaperCard>
        </div>
      ) : null}
    </StageBox>
  );
};

// ------------------------------------------------------------- lender

// A white label hanging on a string from a pin; it swings and settles.
const LenderTag: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const swing = Math.sin(frame / 5) * 7 * Math.exp(-frame / 22);
  return (
    <StageBox>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transformOrigin: "50% 0",
          transform: `translateY(${interpolate(drop, [0, 1], [-200, 0])}px) rotate(${swing}deg)`,
          opacity: interpolate(drop, [0, 0.3], [0, 1], clamp),
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: GOLD_PAPER,
            boxShadow: `0 3px 5px ${alpha(brand.navy, 0.35)}`,
          }}
        />
        <div style={{ width: 3, height: 90, background: alpha(INK, 0.55) }} />
        <PaperCard exitFrames={8} rotate={0}>
          <div
            style={{
              padding: "40px 54px 30px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <LenderLogo lender={lender} height={150} />
            <div
              style={{
                marginTop: 22,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: 4,
                color: brand.slate,
              }}
            >
              ĐANG NHẮC TỚI
            </div>
          </div>
        </PaperCard>
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
          <HookCard hook={reel.edit.hook} />
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
            <LenderTag lender={m.lender} />
          </Sequence>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------- chapter tab

const ChapterTab: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => (
  <div
    style={{
      position: "absolute",
      top: SAFE.top + 16,
      left: SAFE.left,
      maxWidth: 560,
      fontFamily: FONT,
    }}
  >
    <PaperCard background={NAVY_PAPER} rotate={-1.5} from="left">
      <Tape width={90} rotate={-12} style={{ top: -14, left: -20 }} delay={6} />
      <div
        style={{
          padding: "16px 28px",
          display: "flex",
          gap: 16,
          alignItems: "baseline",
        }}
      >
        <span style={{ color: GOLD_PAPER, fontWeight: 900, fontSize: 32 }}>
          PHẦN {index}
        </span>
        <span
          style={{
            color: CREAM,
            fontWeight: 800,
            fontSize: 36,
            lineHeight: 1.3,
          }}
        >
          {title}
        </span>
      </div>
    </PaperCard>
  </div>
);

export const ChapterTabs: React.FC<{ reel: Reel }> = ({ reel }) => {
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
          <ChapterTab index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- English line

// Dark text on a pale paper slip (the faceless line is white on navy, which
// would be a hole in the cream page).
export const EnglishSlip: React.FC<{ reel: Reel }> = ({ reel }) => {
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
                display: "flex",
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
                  color: alpha(INK, 0.85),
                  textAlign: "center",
                  background: alpha(brand.card, 0.72),
                  borderLeft: `6px solid ${GOLD_PAPER}`,
                  padding: "6px 20px",
                  borderRadius: 4,
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
