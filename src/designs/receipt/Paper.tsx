// "receipt" (Hoá đơn) building blocks: the dark navy counter-top and the
// thermal paper that feeds out of a printer slot line by line, with its
// zig-zag tear. Rows, stamp, tick and stub are in Rows.tsx.
// Everything printed comes from the reel; the only fixed words are in copy.
import { fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { FONT, clamp, reelFontReady } from "../../mortgage/style";

export const GOLD = brand.highlight;
export const PAPER = brand.card;
export const INK = brand.textOnCard;
export const FADED = brand.slate;
export const HEADER = "FINANCE HUB";

// Bands (y): chapter tag / chips left of the logo tile, the stage the paper
// rises into from the slot, the caption strip, the English line.
export const TOP_BAND = { top: SAFE.top, bottom: 572 };
export const CHIP_RIGHT = 690; // clear of the LogoMark tile (x >= ~718)
export const STAGE = { top: 596, bottom: 1166 };
export const SLOT_Y = STAGE.bottom;
export const CAPTION_BOTTOM = 1382;
export const W = SAFE.right - SAFE.left;

export const TABULAR: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "0.02em",
};

// ------------------------------------------------------------- font

export const useFontReady = (label: string): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(label));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return ready;
};

// The largest size (≤ max) that sets `text` on at most `lines` lines.
export const fit = (
  text: string,
  width: number,
  lines: number,
  max: number,
  weight = 800,
  numeric = false,
) => {
  const r = fitTextOnNLines({
    text,
    maxLines: lines,
    maxBoxWidth: width,
    fontFamily: FONT,
    fontWeight: weight,
    maxFontSize: max,
    ...(numeric
      ? { fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }
      : {}),
  });
  return { size: Math.floor(r.fontSize), lines: Math.max(1, r.lines.length) };
};

// A title: one line when it still reads big there, else up to two.
export const fitTitle = (text: string, width: number, max: number) => {
  const one = fit(text, width, 1, max, 900);
  return one.size >= max * 0.78 ? one : fit(text, width, 2, max, 900);
};

// ------------------------------------------------------------- numbers

// "3.388" -> 3388, "4,35%" -> 4.35 (Vietnamese: "." groups thousands in
// threes, "," is the decimal). Anything ambiguous, a year or a date: null.
export type Parsed = {
  value: number;
  decimals: number;
  grouped: boolean;
  before: string;
  after: string;
};
export const parseValue = (s: string): Parsed | null => {
  const m = s.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return null;
  const raw = m[0].replace(/[.,]$/, "");
  if (/^(19|20)\d\d$/.test(raw) || /\d\s*\/\s*\d/.test(s)) return null;
  if (raw.includes(".") && !/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) return null;
  const value = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) return null;
  return {
    value,
    decimals: raw.includes(",") ? raw.split(",")[1].length : 0,
    grouped: raw.includes("."),
    before: s.slice(0, m.index),
    after: s.slice(m.index + raw.length),
  };
};

export const formatValue = (
  v: number,
  decimals: number,
  grouped: boolean,
): string =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });

// Counts 0 → the number as said, same decimals and grouping; a year or a
// date (parseValue null) prints as said.
export const counted = (big: string, t: number): string => {
  const p = parseValue(big);
  if (!p || t >= 1) return big;
  return p.before + formatValue(p.value * t, p.decimals, p.grouped) + p.after;
};

// ------------------------------------------------------------- counter-top

// Dark navy stone counter: a brushed grain, a slow warm lamp pool drifting
// over it and a vignette, so the frame is never still between beats.
export const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const lx = 540 + Math.sin(frame / 110) * 190;
  const ly = 880 + Math.cos(frame / 140) * 120;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 760px 620px at ${lx}px ${ly}px, rgba(255,185,56,0.13), transparent 70%),
          linear-gradient(172deg, ${brand.background} 0%, ${brand.navy} 70%, ${brand.background} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(97deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 6px), repeating-linear-gradient(7deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 11px)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- paper

const TOOTH = 14;

// A clip-path polygon: zig-zag top edge always (torn off the roll), zig-zag
// bottom once the receipt is torn off.
const zigzag = (w: number, h: number, bottom: boolean): string => {
  const n = Math.max(4, Math.round(w / 26));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++)
    pts.push(`${(i / n) * w}px ${i % 2 ? 0 : TOOTH / 2}px`);
  if (bottom)
    for (let i = n; i >= 0; i--)
      pts.push(`${(i / n) * w}px ${i % 2 ? h : h - TOOTH / 2}px`);
  else pts.push(`${w}px ${h}px`, `0px ${h}px`);
  return `polygon(${pts.join(",")})`;
};

export type Line = {
  key: string;
  at: number; // frame (in the receipt's Sequence) it prints
  h: number; // px
  node: React.ReactNode;
};

// Lines print in order, never two on the same frame.
export const inOrder = (lines: Line[], gap = 4): Line[] => {
  let last = -Infinity;
  return lines.map((l) => {
    const at = Math.max(l.at, last + gap);
    last = at;
    return { ...l, at };
  });
};

const FEED = 7; // frames a line takes to feed out

const feedOf = (lines: Line[], frame: number) => {
  let fed = 0;
  let feeding = false;
  for (const l of lines) {
    const p = interpolate(frame, [l.at, l.at + FEED], [0, 1], {
      ...clamp,
      easing: (x) => 1 - (1 - x) ** 2,
    });
    if (p > 0 && p < 1) feeding = true;
    fed += l.h * p;
  }
  return { fed, feeding };
};

// A receipt rising out of the printer slot at SLOT_Y: its top edge climbs as
// each line feeds out (with a tiny printer jitter); at `tearAt` it is torn
// off (zig-zag bottom) and lifts clear of the slot. `over` draws on the paper
// unclipped (the stamp), positioned from the paper's top-left.
export const PrintedReceipt: React.FC<{
  x: number;
  width: number;
  lines: Line[];
  tearAt?: number;
  seed: string;
  over?: React.ReactNode;
  pad?: number;
}> = ({ x, width, lines, tearAt = Infinity, seed, over, pad = 26 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { fed, feeding } = feedOf(lines, frame);
  const torn = spring({
    frame: frame - tearAt,
    fps,
    config: { damping: 12, stiffness: 160 },
  });
  const tornOn = frame >= tearAt;
  const lift = 18 * torn;
  const jitter = feeding ? (random(`${seed}-${frame}`) - 0.5) * 5 : 0;
  const h = fed + TOOTH / 2 + (tornOn ? TOOTH : 0);
  const top = SLOT_Y - fed - TOOTH / 2 - lift;
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  if (fed <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x + jitter,
        top,
        width,
        opacity: out,
        filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.55))",
      }}
    >
      <div
        style={{
          height: h,
          overflow: "hidden",
          clipPath: zigzag(width, h, tornOn),
          background: `linear-gradient(90deg, rgba(91,107,128,0.10), ${PAPER} 12%, ${PAPER} 88%, rgba(91,107,128,0.10)), ${PAPER}`,
        }}
      >
        <div
          style={{
            paddingTop: TOOTH / 2,
            paddingLeft: pad,
            paddingRight: pad,
            fontFamily: FONT,
            color: INK,
          }}
        >
          {lines.map((l) => (
            <div key={l.key} style={{ height: l.h, overflow: "hidden" }}>
              {l.node}
            </div>
          ))}
        </div>
      </div>
      {over}
    </div>
  );
};

// Idle paper tongue (0..1 while nothing prints): a short strip of paper in
// the printer mouth that nudges out a line every 1.5 s. Drawn under the
// caption slip and the printer.
const TONGUE_W = 520;

export const IdleTongue: React.FC<{ idle: number }> = ({ idle }) => {
  const frame = useCurrentFrame();
  if (idle <= 0) return null;
  const nudge = interpolate(frame % 45, [0, 5, 12], [0, 12, 0], clamp);
  const tongue = 22 + nudge;
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - TONGUE_W / 2,
        top: SLOT_Y - tongue * idle,
        width: TONGUE_W,
        height: tongue + 10,
        opacity: idle,
        clipPath: zigzag(TONGUE_W, tongue + 10, false),
        background: PAPER,
      }}
    />
  );
};

// The printer the paper comes out of, across the stage: a dark mouth with a
// lit lip, drawn over the paper. `idle` pulses its LED; `shown` fades it
// (0 while a classic panel covers the stage).
export const Printer: React.FC<{ idle?: number; shown?: number }> = ({
  idle = 0,
  shown = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ opacity: shown }}>
      <div
        style={{
          position: "absolute",
          left: SAFE.left - 24,
          top: SLOT_Y - 4,
          width: W + 48,
          height: 28,
          borderRadius: 14,
          background: `linear-gradient(180deg, ${brand.navy}, #000)`,
          borderTop: `3px solid rgba(255,185,56,0.55)`,
          boxShadow: "0 12px 26px rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SAFE.right - 30,
          top: SLOT_Y + 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          background: brand.good,
          opacity: idle > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(frame / 12)) : 1,
          boxShadow: `0 0 10px ${brand.good}`,
        }}
      />
    </div>
  );
};
