// Who owns the phone screen when. Cue pages (points, compare, and the
// classic panels for other kinds) own it for their span. The hook, each
// figure and each named bank get the screen when it is free for their whole
// span; otherwise they float as a chip above the phone, in one of two lanes,
// so two things never share a place.
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";

export type Span = [number, number];
export type Slot = "screen" | 0 | 1;
export type Item = { from: number; to: number; slot: Slot } & (
  | { kind: "hook" }
  | { kind: "figure"; figure: Figure }
  | { kind: "lender"; lender: Lender }
);

export type OwnCue = Extract<Cue, { kind: "points" | "compare" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare";

export type Plan = {
  items: Item[];
  own: Span[]; // points / compare pages
  panels: Span[]; // classic MotionTrack panels (every other kind but emoji)
};

// Frames an item may wait for a cue page to leave rather than float as a chip.
const LATE = 15;

const overlaps = (spans: Span[], a: number, b: number) =>
  spans.some(([x, y]) => a < y && b > x);

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const span = (c: Cue): Span => [
    at(c.fromMs),
    Math.max(at(c.fromMs) + 1, at(c.toMs)),
  ];
  const own = cues.filter(isOwnCue).map(span);
  const panels = cues
    .filter((c) => !isOwnCue(c) && c.kind !== "emoji")
    .map(span);
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  type Raw = Omit<Item, "slot"> & { slot?: Slot };
  const raw: Raw[] = [
    ...(reel.edit.hook
      ? [{ kind: "hook" as const, from: 0, to: HOOK_FRAMES }]
      : []),
    ...figuresOf(reel, fps).map((figure) => ({
      kind: "figure" as const,
      figure,
      from: figure.fromFrame,
      to: figure.fromFrame + figure.frames,
    })),
    ...lenderMentionsOf(reel).map((m) => ({
      kind: "lender" as const,
      lender: m.lender,
      from: toFrame(m.startMs),
      to: Math.max(toFrame(m.startMs) + 1, toFrame(m.endMs)),
    })),
  ].sort((a, b) => a.from - b.from);
  const taken = [...own, ...panels];
  let screenFree = 0;
  const laneFree = [0, 0];
  const items = raw.map((raw0): Item => {
    // A cue page ending just after the item starts: the item waits for it.
    const late = taken.find(
      ([a, b]) => a < raw0.from && b > raw0.from && b - raw0.from <= LATE,
    );
    const r = late ? { ...raw0, from: late[1] } : raw0;
    if (r.from >= screenFree && !overlaps(taken, r.from, r.to)) {
      screenFree = r.to;
      return { ...r, slot: "screen" } as Item;
    }
    const lane =
      laneFree[0] <= r.from
        ? 0
        : laneFree[1] <= r.from
          ? 1
          : laneFree[0] <= laneFree[1]
            ? 0
            : 1;
    laneFree[lane] = r.to;
    return { ...r, slot: lane } as Item;
  });
  return { items, own, panels };
};

// 0..1: how much a set of spans holds frame t, ramped `ramp` frames each way.
export const level = (spans: Span[], t: number, ramp = 10): number =>
  spans.reduce((w, [a, b]) => {
    if (t < a - ramp || t > b + ramp) return w;
    const k = t < a ? (t - a + ramp) / ramp : t > b ? (b + ramp - t) / ramp : 1;
    return Math.max(w, k * k * (3 - 2 * k));
  }, 0);
