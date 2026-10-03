// "orbit" stage pieces drawn over the core (Overlay): the hook and every
// figure as a number INSIDE the core with an orbit arc sweeping round it (a
// radial gauge), a named bank's logo travelling in on an orbit and docking on
// the core, the chapter node, the captions and the English line.
import type { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useId } from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
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
import { FONT, clamp, emphasised, enter } from "../../mortgage/style";
import { yieldToCompare } from "../../elements/yieldToCompare";
import { BIG_R, GAUGE_R, GLASS, HOME, SKY, useFontReady } from "./Space";

// Captions: bottom edge above the English line; the English line sits on
// SAFE.bottom. Both grow upward.
export const CAPTION_BOTTOM = 1352;
const CAPTION_SIZE = 54;
// The said word's scale grows it past its layout box and into the space to
// its neighbours ("ThángHai"). Every word keeps a fixed side margin of half
// that overflow (width about 0.6 em a character); with the neighbour's half
// the space stays about as wide as said, and the line never reflows.
// ponytail: width estimated from the character count; measure it with
// measureText if a caption font ever differs much from 0.6 em a character.
const saidRoom = (scale: number, text: string) =>
  +(((scale - 1) / 4) * 0.6 * text.trim().length).toFixed(3);
const INNER = BIG_R * 2 - 40; // widest text inside the core

const ease = (x: number) => 1 - (1 - x) ** 3;
const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);

// "4,35%" -> counts 0 → 4,35 with the same decimals; text around it kept.
// A year or a date ("2026", "29/9") is shown as said, not counted.
export const counted = (big: string, t: number): string => {
  if (asSaid(big)) return big; // a year or a date: as said (golden rule 1)
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  if (/^(19|20)\d\d$/.test(m[0]) || /\d\/\d/.test(big)) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[0].includes("."),
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// How far the arc closes: a percentage on a 10 % scale below 10 % (rates),
// else 100 %; a count or amount has no scale, so the orbit closes. A year or
// a date has no ring at all (null): it is shown as said (golden rule 1).
export const arcFill = (big: string): number | null => {
  if (asSaid(big)) return null;
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : 1;
};

// The orbit arc round the core: a faint track, a glowing arc that sweeps to
// `fill`, and a bright "satellite" riding its head.
export const Gauge: React.FC<{
  cx: number;
  cy: number;
  R: number;
  fill: number;
  t: number;
  width?: number;
  color?: string;
}> = ({ cx, cy, R, fill, t, width = 16, color }) => {
  const id = `orbit-gauge-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const C = 2 * Math.PI * R;
  const a = fill * t * 2 * Math.PI - Math.PI / 2;
  const pad = width * 3;
  const size = 2 * (R + pad);
  return (
    <svg
      width={size}
      height={size}
      style={{ position: "absolute", left: cx - R - pad, top: cy - R - pad }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color ?? SKY} />
          <stop offset="100%" stopColor={color ?? brand.highlight} />
        </linearGradient>
      </defs>
      <g transform={`translate(${R + pad} ${R + pad})`}>
        <circle
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={width}
        />
        <circle
          r={R}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fill * t)}
          transform="rotate(-90)"
          style={{ filter: `drop-shadow(0 0 12px ${SKY})` }}
        />
        {t > 0.02 ? (
          <circle
            cx={R * Math.cos(a)}
            cy={R * Math.sin(a)}
            r={width * 0.85}
            fill="#ffffff"
            style={{ filter: `drop-shadow(0 0 14px ${brand.highlight})` }}
          />
        ) : null}
      </g>
    </svg>
  );
};

const CoreNumber: React.FC<{ text: string; size: number; color?: string }> = ({
  text,
  size,
  color = "#ffffff",
}) => (
  <div
    style={{
      position: "absolute",
      left: HOME.x - INNER / 2,
      width: INNER,
      top: HOME.y - size * 0.65,
      textAlign: "center",
      fontSize: size,
      fontWeight: 900,
      lineHeight: 1.3,
      color,
      whiteSpace: "nowrap",
      textShadow: `0 0 30px rgba(0,100,168,0.9)`,
    }}
  >
    {text}
  </div>
);

// Line(s) under the gauge, inside the stage.
const UnderCore: React.FC<{
  children: React.ReactNode;
  size: number;
  opacity: number;
  color?: string;
}> = ({ children, size, opacity, color = "#ffffff" }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      width: SAFE.right - SAFE.left,
      top: HOME.y + GAUGE_R + 30,
      textAlign: "center",
      fontSize: size,
      fontWeight: 800,
      lineHeight: 1.25,
      color,
      textWrap: "balance",
      opacity,
    }}
  >
    {children}
  </div>
);

// Widest a number may be inside the core's dark disc; measured with Be
// Vietnam Pro (StageLayer holds the frame until it has loaded).
const numberSize = (s: string) =>
  Math.min(
    120,
    fitText({ text: s, withinWidth: 280, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

const HookHero: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [6, 40], [0, 1], { ...clamp, easing: ease });
  const big = hookText(hook, t);
  const out = fadeOut(frame, HOOK_FRAMES);
  const p = enter(frame, fps, 4);
  return (
    <div
      style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: out }}
    >
      {arcFill(hook.big) === null ? null : (
        <Gauge
          cx={HOME.x}
          cy={HOME.y}
          R={GAUGE_R}
          fill={arcFill(hook.big) ?? 1}
          t={t}
        />
      )}
      <div
        style={{
          opacity: p,
          transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
          transformOrigin: `${HOME.x}px ${HOME.y}px`,
        }}
      >
        <CoreNumber
          text={big}
          size={numberSize(hook.big)}
          color={brand.highlight}
        />
      </div>
      {hook.sub ? (
        <UnderCore size={42} opacity={enter(frame, fps, 16)}>
          {hook.sub}
        </UnderCore>
      ) : null}
    </div>
  );
};

const FigureHero: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [4, 34], [0, 1], { ...clamp, easing: ease });
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, figure.frames)),
      }}
    >
      {arcFill(figure.big) === null ? null : (
        <Gauge
          cx={HOME.x}
          cy={HOME.y}
          R={GAUGE_R}
          fill={arcFill(figure.big) ?? 1}
          t={t}
        />
      )}
      <CoreNumber
        text={counted(figure.big, t)}
        size={numberSize(figure.big)}
        color={t >= 1 ? brand.highlight : "#ffffff"}
      />
      {/* An auto figure's words are already in the captions; a stat's label
          is written copy. */}
      {figure.source === "stat" && figure.label ? (
        <UnderCore
          size={40}
          opacity={interpolate(frame, [12, 24], [0, 1], clamp)}
        >
          {figure.label}
        </UnderCore>
      ) : null}
    </div>
  );
};

// The logo tile rides in on an orbit (a spiral round the core) and docks on it.
const LenderDock: React.FC<{ lender: Lender; frames: number }> = ({
  lender,
  frames,
}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 26], [0, 1], { ...clamp, easing: ease });
  const angle = interpolate(k, [0, 1], [-150, 90]) * (Math.PI / 180);
  const rad = interpolate(k, [0, 1], [GAUGE_R + 180, 0]);
  const x = HOME.x + rad * Math.cos(angle);
  const y = HOME.y + rad * Math.sin(angle);
  const out = fadeOut(frame, frames);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: Math.min(k * 2, out),
      }}
    >
      <Gauge cx={HOME.x} cy={HOME.y} R={GAUGE_R} fill={1} t={k} width={6} />
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${interpolate(k, [0, 1], [0.45, 1])})`,
          borderRadius: 26,
          boxShadow: `0 0 50px rgba(0,100,168,0.7)`,
        }}
      >
        <LenderLogo lender={lender} height={96} style={{ borderRadius: 26 }} />
      </div>
      <UnderCore
        size={32}
        opacity={interpolate(frame, [18, 30], [0, 1], clamp)}
        color={SKY}
      >
        <span style={{ letterSpacing: 5 }}>ĐANG NHẮC TỚI</span>
      </UnderCore>
    </div>
  );
};

// A figure that lands while the core already holds a number (the hook, or
// an earlier figure) rides as a moon on the outer orbit, top-right, instead
// of stacking on the core.
export const MOON = { x: 793, y: 648, r: 74 };
// A chip (a figure moved after a compare cue while another cue or figure holds
// the stage) gets the free slot above the stage instead: between the chapter
// pill (x <= 524) and the LogoMark tile (LOGO_CLEAR 680), under SAFE.top and
// over STAGE_TOP (check-design-figures). Smaller, so its ring fits.
export const CHIP_MOON = { x: 602, y: 510, r: 60 };

const FigureMoon: React.FC<{ figure: Figure; at?: typeof MOON }> = ({
  figure,
  at = MOON,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [4, 30], [0, 1], { ...clamp, easing: ease });
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, figure.frames)),
      }}
    >
      <div
        style={{
          ...GLASS,
          position: "absolute",
          left: at.x - at.r,
          top: at.y - at.r,
          width: 2 * at.r,
          height: 2 * at.r,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: ((figure.big.length > 5 ? 32 : 42) * at.r) / MOON.r,
          fontWeight: 900,
          color: "#ffffff",
          transform: `scale(${interpolate(p, [0, 1], [0.5, 1])})`,
        }}
      >
        {counted(figure.big, t)}
      </div>
      {arcFill(figure.big) === null ? null : (
        <Gauge
          cx={at.x}
          cy={at.y}
          R={at.r + 12}
          fill={arcFill(figure.big) ?? 1}
          t={t}
          width={6}
        />
      )}
    </div>
  );
};

// The core figures, each yielding to a compare cue on the same stage
// (yieldToCompare: cut, held over its drop-in, or moved after it, as a moon
// when another cue holds the core then; exported for check-design-figures).
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

// Figures that start while the core is taken (hook or an earlier figure). A
// chip is never on the core: it neither takes it nor becomes a moon.
export const moonsOf = (
  figures: (Figure & { chip?: boolean })[],
  hook: boolean,
): Set<Figure> => {
  const moons = new Set<Figure>();
  let coreFree = hook ? HOOK_FRAMES : 0;
  for (const f of figures) {
    if (f.chip) continue;
    if (f.fromFrame < coreFree) moons.add(f);
    else coreFree = f.fromFrame + f.frames;
  }
  return moons;
};

export const StageLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const figures = stageFigures(reel, fps);
  const moons = moonsOf(figures, Boolean(reel.edit.hook));
  if (!ready) return null;
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookHero hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          {f.chip ? (
            <FigureMoon figure={f} at={CHIP_MOON} />
          ) : moons.has(f) ? (
            <FigureMoon figure={f} />
          ) : (
            <FigureHero figure={f} />
          )}
        </Sequence>
      ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const dur = Math.max(1, Math.round((m.endMs / 1000) * fps) - from);
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            <LenderDock lender={m.lender} frames={dur} />
          </Sequence>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------- chapters

const ChapterNode: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  return (
    <div
      style={{
        ...GLASS,
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        maxWidth: 470,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 26px 12px 16px",
        borderRadius: 999,
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, Math.round(2.5 * fps))),
        transform: `translateX(${interpolate(p, [0, 1], [-50, 0])}px)`,
      }}
    >
      <div
        style={{
          flex: "0 0 46px",
          height: 46,
          borderRadius: "50%",
          border: `3px solid ${brand.highlight}`,
          boxShadow: `0 0 18px ${brand.highlight}`,
          color: brand.highlight,
          fontSize: 26,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index}
      </div>
      <div
        style={{
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 32,
          lineHeight: 1.25,
        }}
      >
        <span
          style={{
            color: SKY,
            fontSize: 24,
            letterSpacing: 4,
            display: "block",
          }}
        >
          PHẦN {index}
        </span>
        {title}
      </div>
    </div>
  );
};

export const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
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
          <ChapterNode index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- captions

const Page: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const p = enter(frame, fps);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: CAPTION_SIZE,
          lineHeight: 1.25,
          textWrap: "balance",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const now = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          const color = hit.has(i) ? brand.highlight : "#ffffff";
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  color,
                  opacity: spoken ? 1 : 0.42,
                  textShadow: now
                    ? `0 0 18px ${hit.has(i) ? brand.highlight : SKY}, 0 0 40px rgba(0,100,168,0.9)`
                    : "0 4px 18px rgba(6,19,42,0.8)",
                  margin: `0 ${saidRoom(1.06, t.text)}em`,
                  transform: `scale(${now ? 1.06 : 1})`,
                }}
              >
                {t.text.trim()}
              </span>
            </span>
          );
        })}
      </div>
    </CaptionZone>
  );
};

export const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1100}
    tailMs={300}
    render={(page) => <Page page={page} keywords={keywords} />}
  />
);

// The English line, one per scene (edit.json subtitles), on SAFE.bottom.
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
            <CaptionZone>
              <div
                style={{
                  ...GLASS,
                  fontFamily: FONT,
                  fontSize: 30,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "8px 22px",
                  borderRadius: 16,
                  boxShadow: "none",
                }}
              >
                {s.text}
              </div>
            </CaptionZone>
          </Sequence>
        );
      })}
    </>
  );
};
