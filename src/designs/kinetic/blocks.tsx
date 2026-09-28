// "kinetic" colour blocks: the whole frame is one flat brand block (navy, gold
// or white) with a slanted slab across the bottom in a contrasting block. On
// every beat a new block wipes across (four directions in turn), with a thin
// logo-blue stripe running ahead of the edge. Text never sits on a
// colour it can't be read on: each block carries its own ink (Surface).
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp, reelFontReady } from "../../mortgage/style";
import { busyFrames } from "../faceless/Stage";

export const W = 1080;
export const H = 1920;
export const SAFE_W = SAFE.right - SAFE.left;

// A block and the colours that read on it.
export type Surface = {
  bg: string;
  ink: string; // body text
  accent: string; // keywords
  boxBg: string; // numbers are boxed: box fill…
  boxInk: string; // …and the text on it
};
export const NAVY: Surface = {
  bg: brand.background,
  ink: brand.text,
  accent: brand.highlight,
  boxBg: brand.highlight,
  boxInk: brand.background,
};
export const GOLD: Surface = {
  bg: brand.highlight,
  ink: brand.background,
  accent: brand.primary,
  boxBg: brand.background,
  boxInk: brand.text,
};
export const WHITE: Surface = {
  bg: brand.card,
  ink: brand.background,
  accent: brand.primary,
  boxBg: brand.highlight,
  boxInk: brand.background,
};
const CYCLE = [NAVY, GOLD, WHITE];
// The bottom slab contrasts with the block above it.
export const slabOf = (s: Surface): Surface => (s === NAVY ? GOLD : NAVY);

// Where things live (talk frames, 1080x1920).
// Stage: the hook, a figure, a bank's logo, a cue. Starts under the LogoMark
// tile (SAFE.top + 120 + padding).
export const STAGE = { top: SAFE.top + 160, bottom: 1168 };
// Slab top edge (its middle; the edge slants ±SLANT): low while captions are
// the hero, raised to hold the small captions while the stage is busy.
const SLAB_FREE = 1360;
const SLAB_BUSY = 1196;
const SLANT = 22;
// Busy captions sit in the slab, above the English line.
export const CAP_BUSY_BOTTOM = 1384;
// Free captions are centred in this band, above the low slab.
export const FREE_BAND = { top: 560, bottom: 1320 };

const WIPE_FRAMES = 9;
const MIN_BEAT_GAP = 24;
const RAMP_FRAMES = 8;
const SILENCE_MS = 350; // PagedCaptions' own breakOnSilenceAfterMs default
const SENTENCE_END = /[.!?…]["'”’)\]]*$/u;

export type Blocks = { beats: number[]; level: number[] };

// Beats: frame 0, every caption page that starts after a full stop or a pause
// (the pager always breaks a page there), each stage element's start and end,
// and each points item. Never two within MIN_BEAT_GAP (READING: the frame
// must not flash faster than it can be read).
const beatsOf = (reel: Reel, fps: number, busy: [number, number][]) => {
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const at = outFrameOf(reel.timeline, fps);
  const caps = reel.timeline.captions;
  const inBusy = (x: number) => busy.some(([a, b]) => x >= a && x < b);
  const raw = [0];
  for (let i = 1; i < caps.length; i++) {
    const prev = caps[i - 1];
    const x = f(caps[i].startMs);
    if (
      (SENTENCE_END.test(prev.text.trim()) ||
        caps[i].startMs - prev.endMs >= SILENCE_MS) &&
      !inBusy(x)
    )
      raw.push(x);
  }
  for (const [a, b] of busy) raw.push(a, b);
  for (const c of reel.edit.cues ?? [])
    if (c.kind === "points")
      for (const it of c.items.slice(1)) raw.push(at(it.atMs));
  const beats: number[] = [];
  for (const x of raw.sort((a, b) => a - b))
    if (!beats.length || x - beats[beats.length - 1] >= MIN_BEAT_GAP)
      beats.push(x);
  return beats;
};

export const useBlocks = (reel: Reel, talkFrames: number): Blocks => {
  const { fps } = useVideoConfig();
  return useMemo(() => {
    const busy = busyFrames(reel, fps);
    // 1 while an element holds the stage, ramped so the captions glide.
    const l = new Array<number>(talkFrames + 1).fill(0);
    for (const [a, b] of busy)
      for (let x = Math.max(0, a); x < Math.min(l.length, b); x++) l[x] = 1;
    const step = 1 / RAMP_FRAMES;
    for (let x = 1; x < l.length; x++) l[x] = Math.min(l[x], l[x - 1] + step);
    for (let x = l.length - 2; x >= 0; x--)
      l[x] = Math.max(l[x], l[x + 1] - step);
    return { beats: beatsOf(reel, fps, busy), level: l };
  }, [reel, fps, talkFrames]);
};

export type BlockState = {
  index: number; // beat number
  p: number; // wipe progress 0..1
  cur: Surface;
  prev: Surface;
  // What text should use now: the new block once the wipe is half across.
  text: Surface;
};

export const blockAt = (beats: number[], frame: number): BlockState => {
  let index = 0;
  for (let i = 0; i < beats.length && beats[i] <= frame; i++) index = i;
  const p = interpolate(frame - beats[index], [0, WIPE_FRAMES], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.7, 0, 0.2, 1),
  });
  const cur = CYCLE[index % 3];
  const prev = CYCLE[(index + 2) % 3];
  return { index, p, cur, prev, text: p >= 0.5 ? cur : prev };
};

// The wipe's leading edge as a clip polygon; `e` runs 0..1 across the frame.
const wipeClip = (dir: number, e: number): string => {
  if (dir % 2 === 0) {
    // Diagonal, from the left (0) or the right (2).
    const x = interpolate(e, [0, 1], [-420, W + 420]);
    const pts = [
      [0, 0],
      [x + 420, 0],
      [x - 420, H],
      [0, H],
    ];
    return `polygon(${pts
      .map(([a, b]) => `${dir === 0 ? a : W - a}px ${b}px`)
      .join(", ")})`;
  }
  // Slanted vertical, from the top (1) or the bottom (3).
  const y = interpolate(e, [0, 1], [-200, H + 200]);
  const pts = [
    [0, 0],
    [W, 0],
    [W, y - 200],
    [0, y + 200],
  ];
  return `polygon(${pts
    .map(([a, b]) => `${a}px ${dir === 1 ? b : H - b}px`)
    .join(", ")})`;
};

export const slabTopAt = (level: number) =>
  interpolate(level, [0, 1], [SLAB_FREE, SLAB_BUSY]);

const slabClip = (top: number) =>
  `polygon(0 ${top + SLANT}px, ${W}px ${top - SLANT}px, ${W}px ${H}px, 0 ${H}px)`;

const Layer: React.FC<{
  s: Surface;
  slab: Surface;
  slabTop: number;
  clip?: string;
}> = ({ s, slab, slabTop, clip }) => (
  <AbsoluteFill style={{ background: s.bg, clipPath: clip }}>
    <AbsoluteFill
      style={{ background: slab.bg, clipPath: slabClip(slabTop) }}
    />
  </AbsoluteFill>
);

// The Behind layer: blocks on the talk timeline (frame 0 = first word).
export const BlockBackdrop: React.FC<{ reel: Reel; talkFrames: number }> = ({
  reel,
  talkFrames,
}) => {
  const frame = useCurrentFrame();
  const { beats, level } = useBlocks(reel, talkFrames);
  const b = blockAt(beats, frame);
  const top = slabTopAt(level[Math.min(frame, level.length - 1)] ?? 0);
  const dir = b.index % 4;

  return (
    <AbsoluteFill>
      <Layer s={b.prev} slab={slabOf(b.prev)} slabTop={top} />
      {b.p < 1 ? (
        <AbsoluteFill
          style={{
            // A blue stripe runs just ahead of the edge.
            background: brand.primary,
            clipPath: wipeClip(dir, Math.min(1, b.p + 0.06)),
          }}
        />
      ) : null}
      <Layer
        s={b.cur}
        slab={slabOf(b.cur)}
        slabTop={top}
        clip={b.p < 1 ? wipeClip(dir, b.p) : undefined}
      />
    </AbsoluteFill>
  );
};

// Hold the frame until Be Vietnam Pro is in, then measure (fitText etc.).
export const useFontReady = (label: string): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`kinetic ${label}: font`));
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
