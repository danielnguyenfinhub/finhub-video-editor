// What the "cards" stage shows, frame by frame (talk timeline). One stage, so
// scenes never overlap: the hook, then each own cue, then every figure and
// named bank that finds the stage free (or free within WAIT frames). One that
// lands while the stage is taken rides as a small chip in the header row.
// While a classic MotionTrack panel is up (kinetic, verdict, venn, lenders)
// the stage steps aside for it. Big cues take the full frame: Daniel's card
// slides away (Talk reads `fullAt` from the same plan) and comes back.
import { useMemo } from "react";
import { interpolate, useVideoConfig } from "remotion";
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import {
  outFrameOf,
  type Cue,
  type EditJson,
  type Reel,
} from "../../mortgage/schema";

export type Span = [number, number];
export type Hook = NonNullable<EditJson["hook"]>;
export type OwnCue = Extract<
  Cue,
  { kind: "points" | "compare" | "change" | "trend" | "bars" }
>;
const OWN = new Set(["points", "compare", "change", "trend", "bars"]);
export const isOwn = (c: Cue): c is OwnCue => OWN.has(c.kind);
// Cues that need the whole frame.
export const isFull = (c: OwnCue): boolean =>
  c.kind === "compare" ||
  c.kind === "trend" ||
  c.kind === "bars" ||
  (c.kind === "points" && c.items.length >= 4);

export type Scene =
  | { kind: "hook"; from: number; to: number; hook: Hook }
  // `at` is the cue's own start (its beats are relative to it); `from` may
  // be later when the hook still held the stage.
  | { kind: "cue"; from: number; to: number; at: number; cue: OwnCue }
  | { kind: "figure"; from: number; to: number; figure: Figure }
  | { kind: "lender"; from: number; to: number; lender: Lender };
export type Chip = {
  from: number;
  to: number;
  lane: number;
  figure?: Figure;
  lender?: Lender;
};
export type Plan = {
  scenes: Scene[];
  chips: Chip[];
  dim: Span[]; // MotionTrack panels
  full: Span[]; // full-screen scenes
};

const WAIT = 15;
const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const dim = cues
    .filter((c) => !isOwn(c) && c.kind !== "emoji")
    .map((c): Span => [at(c.fromMs), at(c.toMs)]);
  const taken: Span[] = [...dim];
  const scenes: Scene[] = [];
  const freeFrom = (f: number) => {
    let s = f;
    for (let hit = true; hit; ) {
      hit = false;
      for (const [a, b] of taken)
        if (a <= s && s < b) {
          s = b;
          hit = true;
        }
    }
    return s;
  };
  if (reel.edit.hook) {
    scenes.push({
      kind: "hook",
      from: 0,
      to: HOOK_FRAMES,
      hook: reel.edit.hook,
    });
    taken.push([0, HOOK_FRAMES]);
  }
  for (const cue of cues.filter(isOwn)) {
    const start = at(cue.fromMs);
    const from = freeFrom(start);
    const to = Math.max(at(cue.toMs), from + 2 * fps);
    scenes.push({ kind: "cue", from, to, at: start, cue });
    taken.push([from, to]);
  }
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const items = [
    ...figuresOf(reel, fps).map((figure) => ({
      a: figure.fromFrame,
      len: figure.frames,
      figure,
      lender: undefined as Lender | undefined,
    })),
    ...lenderMentionsOf(reel).map((m) => ({
      a: toFrame(m.startMs),
      len: Math.max(2 * fps, toFrame(m.endMs) - toFrame(m.startMs)),
      figure: undefined as Figure | undefined,
      lender: m.lender,
    })),
  ].sort((x, y) => x.a - y.a);
  const chips: Chip[] = [];
  for (const it of items) {
    const free = freeFrom(it.a);
    const late: Span = [free, free + it.len];
    if (free - it.a <= WAIT && !taken.some((s) => overlaps(s, late))) {
      taken.push(late);
      scenes.push(
        it.figure
          ? { kind: "figure", from: free, to: late[1], figure: it.figure }
          : { kind: "lender", from: free, to: late[1], lender: it.lender! },
      );
      continue;
    }
    const span: Span = [it.a, it.a + it.len];
    let lane = 0;
    while (chips.some((c) => c.lane === lane && overlaps([c.from, c.to], span)))
      lane++;
    chips.push({
      from: span[0],
      to: span[1],
      lane,
      figure: it.figure,
      lender: it.lender,
    });
  }
  const full = scenes.flatMap((s): Span[] =>
    s.kind === "cue" && isFull(s.cue) ? [[s.from, s.to]] : [],
  );
  return { scenes, chips, dim, full };
};

export const usePlan = (reel: Reel): Plan => {
  const { fps } = useVideoConfig();
  return useMemo(() => planOf(reel, fps), [reel, fps]);
};

// Up to 1 around each span, eased over r frames.
export const ramp = (spans: Span[], t: number, r = 12): number =>
  spans.reduce(
    (w, [a, b]) =>
      Math.max(
        w,
        interpolate(
          t,
          [a - r, a, Math.max(b, a + 1), Math.max(b, a + 1) + r],
          [0, 1, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: (x) => x * x * (3 - 2 * x),
          },
        ),
      ),
    0,
  );

// 0 split, 1 full screen (Daniel's card away).
export const fullAt = (plan: Plan, t: number): number => ramp(plan.full, t);
