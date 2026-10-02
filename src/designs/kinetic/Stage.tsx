// "kinetic" stage: the hook as a stack of slammed lines, a spoken number as a
// GIANT counter over a thick bar, a named bank's logo punching in on a white
// tile, and a chapter tag. All in the STAGE band, in the colours of whatever
// block is behind them (blocks.tsx).
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
  asSaid,
  hookCount,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import {
  SAFE_W,
  STAGE,
  blockAt,
  useFontReady,
  type Blocks,
  type Surface,
} from "./blocks";

const slamOf = (frame: number, fps: number, at = 0) =>
  spring({
    frame: frame - at,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.6 },
  });

// Fade out over the last frames of the element's Sequence.
const useOut = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - 7, durationInFrames],
    [1, 0],
    clamp,
  );
};

const StageBox: React.FC<{
  top?: number;
  children: React.ReactNode;
}> = ({ top = STAGE.top, children }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      width: SAFE_W,
      top,
      height: STAGE.bottom - top,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      opacity: useOut(),
    }}
  >
    {children}
  </div>
);

// "4,35" -> counts 0 → 4,35 keeping the decimals and the text around it.
export const counted = (big: string, t: number): string => {
  if (asSaid(big)) return big; // a year or a date: as said (golden rule 1)
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  // "29/9", "1.600": a date or a grouped count isn't counted up, it slams.
  if (/\d[/:]\d/.test(big)) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // "2026" (a year) stays "2026"; "1.600" keeps its grouping.
    useGrouping: m[0].includes("."),
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// How far the bar fills: a percentage on a 10 % scale below 10 % (rates),
// else 100 %; anything else fills. A year or a date has no bar (null).
export const barFill = (big: string): number | null => {
  if (asSaid(big)) return null;
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, v / (v < 10 ? 10 : 100));
};

const NUM_MAX = 330;
const NUM_MAX_ALONE = 440;
const BAR_H = 34;

const GiantNumber: React.FC<{
  figure: Figure;
  from: number;
  blocks: Blocks;
}> = ({ figure, from, blocks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = blockAt(blocks.beats, from + frame).text;
  const size = useMemo(
    () =>
      Math.min(
        figure.source === "stat" && figure.label ? NUM_MAX : NUM_MAX_ALONE,
        fitText({
          text: figure.big,
          withinWidth: SAFE_W,
          fontFamily: FONT,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
        }).fontSize,
      ),
    [figure.big, figure.label, figure.source],
  );
  const label = useMemo(
    () =>
      figure.source === "stat" && figure.label
        ? fitTextOnNLines({
            text: figure.label,
            maxLines: 2,
            maxBoxWidth: SAFE_W,
            fontFamily: FONT,
            fontWeight: 800,
            maxFontSize: 60,
          })
        : null,
    [figure.label, figure.source],
  );
  const t = interpolate(frame, [4, 34], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const slam = slamOf(frame, fps);
  const fillTo = barFill(figure.big);
  const fill = (fillTo ?? 0) * interpolate(frame, [6, 36], [0, 1], clamp);
  return (
    <StageBox>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: s.accent,
          whiteSpace: "nowrap",
          transform: `scale(${interpolate(slam, [0, 1], [2.2, 1])})`,
          opacity: interpolate(frame, [0, 3], [0, 1], clamp),
        }}
      >
        {counted(figure.big, t)}
      </div>
      {fillTo === null ? null : (
        <div
          style={{
            width: SAFE_W,
            height: BAR_H,
            marginTop: 30,
            background: s.ink,
            opacity: 0.9,
            position: "relative",
            transform: `scaleX(${interpolate(frame, [0, 8], [0, 1], clamp)})`,
            transformOrigin: "left",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 6,
              right: 6 + (SAFE_W - 12) * (1 - fill),
              background: s.accent,
            }}
          />
        </div>
      )}
      {label ? (
        <div
          style={{
            marginTop: 28,
            fontSize: label.fontSize,
            lineHeight: 1.2,
            fontWeight: 800,
            color: s.ink,
            textAlign: "center",
            opacity: interpolate(frame, [12, 20], [0, 1], clamp),
            transform: `translateY(${interpolate(frame, [12, 20], [30, 0], clamp)}px)`,
          }}
        >
          {label.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      ) : null}
    </StageBox>
  );
};

// Upper-case lines of at most `max` characters, split between words.
const stackLines = (text: string, max: number): string[] => {
  const out: string[] = [];
  for (const w of text
    .toLocaleUpperCase("vi-VN")
    .split(/\s+/)
    .filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && (last + " " + w).length <= max)
      out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
};

export const Stack: React.FC<{
  lines: string[];
  s: Surface;
  max: number;
  gap?: number;
  every?: number;
  start?: number;
  boxed?: (i: number) => boolean;
}> = ({ lines, s, max, gap = 6, every = 7, start = 0, boxed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sizes = useMemo(
    () =>
      lines.map((l) =>
        Math.min(
          max,
          fitText({
            text: l,
            withinWidth: SAFE_W - 30,
            fontFamily: FONT,
            fontWeight: 900,
          }).fontSize,
        ),
      ),
    [lines, max],
  );
  return (
    <>
      {lines.map((l, i) => {
        const at = start + i * every;
        const p = slamOf(frame, fps, at);
        const box = boxed?.(i) ?? false;
        return (
          <div
            key={`${l}${i}`}
            style={{
              fontSize: sizes[i],
              fontWeight: 900,
              lineHeight: 1.12,
              marginTop: i ? gap : 0,
              padding: box ? "0 0.14em" : undefined,
              color: box ? s.boxInk : s.ink,
              background: box ? s.boxBg : undefined,
              whiteSpace: "nowrap",
              opacity: frame >= at ? 1 : 0,
              transform: `translateX(${interpolate(p, [0, 1], [i % 2 ? 260 : -260, 0])}px) scale(${interpolate(p, [0, 1], [1.4, 1])})`,
            }}
          >
            {l}
          </div>
        );
      })}
    </>
  );
};

const HookStack: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
  blocks: Blocks;
}> = ({ hook, blocks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = blockAt(blocks.beats, frame).text;
  const t = interpolate(frame, [0, 30], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const big =
    hook.countTo === undefined
      ? hook.big
      : `${hookCount(hook.countTo, t).toLocaleString("vi-VN", {
          minimumFractionDigits: hook.decimals ?? 0,
          maximumFractionDigits: hook.decimals ?? 0,
        })}${hook.suffix ?? ""}`;
  const final = hook.countTo === undefined ? hook.big : counted(hook.big, 1);
  const size = useMemo(
    () =>
      Math.min(
        300,
        fitText({
          text: final,
          withinWidth: SAFE_W - 60,
          fontFamily: FONT,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
        }).fontSize,
      ),
    [final],
  );
  const lines = useMemo(() => stackLines(hook.sub ?? "", 16), [hook.sub]);
  const slam = slamOf(frame, fps);
  return (
    // The LogoMark waits for the hook to end, so the hook may use SAFE.top.
    <StageBox top={SAFE.top + 20}>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1,
          padding: "0.04em 0.12em",
          background: s.boxBg,
          color: s.boxInk,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          transform: `scale(${interpolate(slam, [0, 1], [2, 1])}) rotate(${interpolate(slam, [0, 1], [-6, -2])}deg)`,
        }}
      >
        {big}
      </div>
      <div
        style={{
          marginTop: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Stack lines={lines} s={s} max={120} start={10} every={8} />
      </div>
    </StageBox>
  );
};

const LenderPunch: React.FC<{
  lender: Lender;
  from: number;
  blocks: Blocks;
  label: string;
}> = ({ lender, from, blocks, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = blockAt(blocks.beats, from + frame).text;
  const p = slamOf(frame, fps);
  const tag = slamOf(frame, fps, 8);
  return (
    <StageBox>
      <div
        style={{
          padding: "40px 60px",
          background: "#fff",
          outline: `8px solid ${s.ink}`,
          transform: `scale(${interpolate(p, [0, 1], [0, 1])}) rotate(${interpolate(p, [0, 1], [-10, -2])}deg)`,
        }}
      >
        <LenderLogo lender={lender} height={160} />
      </div>
      <div
        style={{
          marginTop: 44,
          padding: "10px 26px",
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: 3,
          background: s.boxBg,
          color: s.boxInk,
          opacity: tag,
          transform: `translateY(${interpolate(tag, [0, 1], [40, 0])}px) rotate(2deg)`,
        }}
      >
        {label}
      </div>
    </StageBox>
  );
};

const ChapterTag: React.FC<{
  index: number;
  title: string;
  from: number;
  blocks: Blocks;
  word: string;
}> = ({ index, title, from, blocks, word }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = blockAt(blocks.beats, from + frame).text;
  const p = slamOf(frame, fps);
  const fitted = useMemo(
    () =>
      fitTextOnNLines({
        text: title,
        maxLines: 2,
        maxBoxWidth: 440,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: 40,
      }),
    [title],
  );
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        width: 480,
        fontFamily: FONT,
        opacity: useOut(),
        transform: `translateX(${interpolate(p, [0, 1], [-400, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "6px 18px",
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 3,
          background: s.boxBg,
          color: s.boxInk,
        }}
      >
        {word} {String(index).padStart(2, "0")}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: fitted.fontSize,
          fontWeight: 900,
          lineHeight: 1.15,
          color: s.ink,
        }}
      >
        {fitted.lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export const StageLayer: React.FC<{
  reel: Reel;
  blocks: Blocks;
  lenderLabel: string;
  chapterWord: string;
}> = ({ reel, blocks, lenderLabel, chapterWord }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("stage");
  const at = outFrameOf(reel.timeline, fps);
  const figures = figuresOf(reel, fps);
  const hook = reel.edit.hook;
  if (!ready) return null;
  return (
    <>
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookStack hook={hook} blocks={blocks} />
        </Sequence>
      ) : null}
      {/* figuresOf starts every figure after the hook (golden rule 1). */}
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          <GiantNumber figure={f} from={f.fromFrame} blocks={blocks} />
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
            <LenderPunch
              lender={m.lender}
              from={from}
              blocks={blocks}
              label={lenderLabel}
            />
          </Sequence>
        );
      })}
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <ChapterTag
            index={i + 1}
            title={c.title}
            from={at(c.atMs)}
            blocks={blocks}
            word={chapterWord}
          />
        </Sequence>
      ))}
    </>
  );
};
