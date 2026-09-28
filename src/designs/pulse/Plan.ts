// Who owns the monitor when. One stage, one line: the hook, then each own
// cue (change, trend), then figures and bank logos in time order. A figure
// or bank that starts while the stage is taken waits (up to WAIT frames) if
// it frees up, else it rides as a small chip at the right of the header. A
// classic MotionTrack panel (every other cue kind) hides the stage while up.
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import { interpolate } from "remotion";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { clamp } from "../../mortgage/style";

const WAIT = 15;
const RAMP = 8;
// An own cue that starts under the hook waits for it, but keeps this long.
const MIN_CUE = 60;

export type OwnCue = Extract<Cue, { kind: "change" | "trend" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "change" || c.kind === "trend";

export type Beat =
  | { kind: "figure"; figure: Figure }
  | { kind: "lender"; lender: Lender };

export type Placed = {
  beat: Beat;
  from: number;
  frames: number;
  chip: boolean;
  lane: number; // chips up at once stack downward
  foot: boolean; // a panel is up: the chip sits under it
};

export type PlacedCue = {
  cue: Cue;
  from: number; // shown from (after the hook if it started under it)
  at: number; // the cue's own start (its beats are keyed to this)
  frames: number;
  own: boolean;
};

export type Plan = {
  cues: PlacedCue[];
  beats: Placed[];
  // Per talk frame, 0..1: how much a data beat owns the stage (the idle
  // trace shows 1 - this).
  busy: number[];
};

type Span = [number, number];
const hits = (s: Span[], [a, b]: Span) => s.filter(([x, y]) => a < y && x < b);

export const planOf = (reel: Reel, fps: number, talkFrames: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const hookEnd = reel.edit.hook ? HOOK_FRAMES : 0;
  const cues: PlacedCue[] = (reel.edit.cues ?? []).map((c) => {
    const a = at(c.fromMs);
    const b = Math.max(a + 1, at(c.toMs));
    const own = isOwnCue(c);
    const from =
      own && a < hookEnd ? Math.max(a, Math.min(hookEnd, b - MIN_CUE)) : a;
    return { cue: c, from, at: a, frames: b - from, own };
  });
  const taken: Span[] = [
    ...(hookEnd ? [[0, hookEnd] as Span] : []),
    // The emoji sticker is not a panel: it leaves the stage alone.
    ...cues
      .filter((c) => c.cue.kind !== "emoji")
      .map((c): Span => [c.from, c.from + c.frames]),
  ];
  const panels: Span[] = cues
    .filter((c) => !c.own && c.cue.kind !== "emoji")
    .map((c) => [c.from, c.from + c.frames]);

  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const wanted: { beat: Beat; from: number; frames: number }[] = [
    ...figuresOf(reel, fps).map((f) => ({
      beat: { kind: "figure" as const, figure: f },
      from: f.fromFrame,
      frames: f.frames,
    })),
    ...lenderMentionsOf(reel).map((m) => ({
      beat: { kind: "lender" as const, lender: m.lender },
      from: toFrame(m.startMs),
      frames: Math.max(1, toFrame(m.endMs) - toFrame(m.startMs)),
    })),
  ].sort((a, b) => a.from - b.from);

  const beats: Placed[] = [];
  const chips: Span[] = [];
  for (const w of wanted) {
    const span: Span = [w.from, w.from + w.frames];
    const clash = hits(taken, span);
    let from = w.from;
    let chip = clash.length > 0;
    if (chip) {
      const free = Math.max(...clash.map(([, b]) => b));
      const moved: Span = [free, free + w.frames];
      if (free - w.from <= WAIT && hits(taken, moved).length === 0) {
        from = free;
        chip = false;
      }
    }
    const own: Span = [from, from + w.frames];
    if (!chip) taken.push(own);
    const lane = chip ? hits(chips, own).length : 0;
    if (chip) chips.push(own);
    beats.push({
      beat: w.beat,
      from,
      frames: w.frames,
      chip,
      lane,
      foot: chip && hits(panels, own).length > 0,
    });
  }

  const busy = new Array<number>(talkFrames + 1).fill(0);
  for (const [a, b] of taken)
    for (let f = Math.max(0, a); f < Math.min(busy.length, b); f++) busy[f] = 1;
  const step = 1 / RAMP;
  for (let f = 1; f < busy.length; f++)
    busy[f] = Math.min(busy[f], busy[f - 1] + step);
  for (let f = busy.length - 2; f >= 0; f--)
    busy[f] = Math.max(busy[f], busy[f + 1] - step);
  return { cues, beats, busy };
};

// 0..1 while a classic MotionTrack panel is up (Talk dims the grid under it).
export const panelLevel = (reel: Reel, fps: number, t: number): number => {
  const at = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? [])
    .filter((c) => !isOwnCue(c) && c.kind !== "emoji")
    .reduce((m, c) => {
      const a = at(c.fromMs);
      const b = Math.max(a + 1, at(c.toMs));
      return Math.max(
        m,
        interpolate(t, [a - RAMP, a, b, b + RAMP], [0, 1, 1, 0], clamp),
      );
    }, 0);
};
