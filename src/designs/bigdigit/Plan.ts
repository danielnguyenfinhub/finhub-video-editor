// When each thing holds the "bigdigit" stage. One thing at a time: the hook,
// then each cue (own or classic), each figure (golden rule 1) and each named
// bank (rule 2). A figure or bank that starts while the stage is taken waits
// up to WAIT frames for it to free, else rides as a chip in the stage's
// bottom-right corner. A cue said inside the hook starts when the hook ends;
// a short gap before the next block is bridged by the block before it.
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import type { Rel } from "../classic/Infographics";
import { isOwnCue } from "./Cues";

const WAIT = 15;
const BRIDGE = 36;
const MIN_HOLD = 45; // READING.minNumberHoldMs at 30 fps

export type Span = [number, number];
export type Item =
  | { kind: "figure"; figure: Figure; from: number; frames: number }
  | { kind: "lender"; lender: Lender; from: number; frames: number };
export type CueSlot = { cue: Cue; from: number; to: number; rel: Rel };
export type Plan = {
  own: CueSlot[];
  rest: CueSlot[];
  stage: Item[];
  chips: Item[];
};

const overlaps = (spans: Span[], a: number, b: number) =>
  spans.filter(([x, y]) => a < y && b > x);

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const hookEnd = reel.edit.hook ? HOOK_FRAMES : 0;
  const taken: Span[] = hookEnd ? [[0, hookEnd]] : [];
  const own: CueSlot[] = [];
  const rest: CueSlot[] = [];
  for (const cue of reel.edit.cues ?? []) {
    const start = at(cue.fromMs);
    const from = Math.max(start, isOwnCue(cue) ? hookEnd : 0);
    const to = at(cue.toMs);
    if (to - from < 1) continue;
    const slot = { cue, from, to, rel: (ms: number) => at(ms) - from };
    (isOwnCue(cue) ? own : rest).push(slot);
    taken.push([from, to]);
  }
  const items: Item[] = [
    ...figuresOf(reel, fps).map((figure) => ({
      kind: "figure" as const,
      figure,
      from: figure.fromFrame,
      frames: figure.frames,
    })),
    ...lenderMentionsOf(reel).map((m) => {
      const from = Math.round((m.startMs / 1000) * fps);
      return {
        kind: "lender" as const,
        lender: m.lender,
        from,
        frames: Math.max(1, Math.round((m.endMs / 1000) * fps) - from),
      };
    }),
  ].sort((a, b) => a.from - b.from);
  const stage: Item[] = [];
  const chips: Item[] = [];
  for (const it of items) {
    const end = it.from + it.frames;
    const hit = overlaps(taken, it.from, end);
    // Free now, taken later (a cue coming): shorten it if it still holds.
    const nextStart = Math.min(...hit.map(([x]) => x));
    const room = hit.length ? nextStart - it.from : it.frames;
    if (room >= Math.min(MIN_HOLD, it.frames)) {
      const frames = Math.min(it.frames, room);
      stage.push({ ...it, frames });
      taken.push([it.from, it.from + frames]);
      continue;
    }
    const free = Math.max(...hit.map(([, y]) => y));
    const waited = {
      ...it,
      from: free,
      frames: Math.max(MIN_HOLD, end - free),
    };
    if (
      free - it.from <= WAIT &&
      !overlaps(taken, free, free + waited.frames).length
    ) {
      stage.push(waited);
      taken.push([free, free + waited.frames]);
    } else chips.push(it);
  }
  // One chip at a time: a newer chip ends the one before it.
  const trimmed = chips.map((c, i) => {
    const next = chips[i + 1];
    return next && next.from < c.from + c.frames
      ? { ...c, frames: Math.max(1, next.from - c.from) }
      : c;
  });
  // A short gap before the next block would flash an empty stage: the
  // block before it holds on instead.
  const starts = taken.map(([x]) => x);
  const nextAfter = (from: number) =>
    Math.min(...starts.filter((x) => x > from));
  const hold = <T extends { from: number }>(b: T, end: number) => {
    const gap = nextAfter(b.from) - end;
    return gap > 0 && gap <= BRIDGE ? gap : 0;
  };
  return {
    own: own.map((c) => ({ ...c, to: c.to + hold(c, c.to) })),
    rest,
    stage: stage.map((it) => ({
      ...it,
      frames: it.frames + hold(it, it.from + it.frames),
    })),
    chips: trimmed,
  };
};

// Talk frames when the stage holds something (captions step down then).
export const busySpans = (plan: Plan, hook: boolean): Span[] => [
  ...(hook ? [[0, HOOK_FRAMES] as Span] : []),
  ...[...plan.own, ...plan.rest].map((c) => [c.from, c.to] as Span),
  ...plan.stage.map((it) => [it.from, it.from + it.frames] as Span),
];
