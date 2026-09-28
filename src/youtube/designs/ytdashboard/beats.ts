// Which beats get a tile on the focus stage, and when. One tile holds the
// stage at a time: a beat that starts while it is taken waits up to WAIT
// frames, a cue (the scene itself) takes the stage over, and any other beat
// becomes a chip in the header (never two things in one place).
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
} from "../../../mortgage/golden";
import type { Lender } from "../../../mortgage/lenders";
import { outFrameOf, type Cue, type Reel } from "../../../mortgage/schema";

export type Beat = { s: number; e: number } & (
  | {
      kind: "hook";
      big: string;
      label?: string;
      countTo?: number;
      decimals?: number;
      suffix?: string;
    }
  | { kind: "figure"; big: string; label: string }
  | { kind: "lender"; lender: Lender }
  | { kind: "cue"; cue: Cue }
);
// c: the frame the tile collapses back into the strip.
export type Tile = Beat & { c: number };
export type Plan = { tiles: Tile[]; chips: Beat[] };

const MIN_FOCUS = 45;
const WAIT = 15;
const LINGER = 30;
const PRI: Record<Beat["kind"], number> = {
  hook: 0,
  cue: 1,
  figure: 2,
  lender: 3,
};

const candidates = (reel: Reel, fps: number): Beat[] => {
  const at = outFrameOf(reel.timeline, fps);
  const toF = (ms: number) => Math.round((ms / 1000) * fps);
  const hook = reel.edit.hook;
  const out: Beat[] = [
    ...(hook
      ? [
          {
            kind: "hook" as const,
            s: 0,
            e: HOOK_FRAMES,
            big: hook.big,
            label: hook.sub,
            countTo: hook.countTo,
            decimals: hook.decimals,
            suffix: hook.suffix,
          },
        ]
      : []),
    // emoji is a corner sticker, not a data beat.
    ...(reel.edit.cues ?? [])
      .filter((c) => c.kind !== "emoji")
      .map((cue) => ({
        kind: "cue" as const,
        cue,
        s: at(cue.fromMs),
        e: at(cue.toMs),
      })),
    ...figuresOf(reel, fps).map((f) => ({
      kind: "figure" as const,
      big: f.big,
      label: f.label,
      s: f.fromFrame,
      e: f.fromFrame + f.frames,
    })),
    ...lenderMentionsOf(reel).map((m) => ({
      kind: "lender" as const,
      lender: m.lender,
      s: toF(m.startMs),
      e: toF(m.startMs) + Math.max(MIN_FOCUS, toF(m.endMs - m.startMs)),
    })),
  ];
  return out
    .filter((b) => b.e > b.s)
    .sort((a, b) => a.s - b.s || PRI[a.kind] - PRI[b.kind]);
};

export const planBeats = (reel: Reel, fps: number): Plan => {
  const tiles: Beat[] = [];
  const chips: Beat[] = [];
  for (const b of candidates(reel, fps)) {
    const prev = tiles[tiles.length - 1];
    if (!prev || b.s >= prev.e) {
      tiles.push(b);
    } else if (
      b.kind === "cue" &&
      prev.kind !== "cue" &&
      prev.kind !== "hook"
    ) {
      // The cue takes the stage; a figure it cuts too short becomes a chip.
      tiles.pop();
      if (b.s - prev.s < MIN_FOCUS) chips.push(prev);
      else tiles.push({ ...prev, e: b.s });
      tiles.push(b);
    } else if (b.kind === "cue") {
      // After the hook or another cue; its rows still reveal on their own ms.
      if (b.e - prev.e >= MIN_FOCUS) tiles.push({ ...b, s: prev.e });
    } else if (prev.e - b.s <= WAIT) {
      const d = prev.e - b.s;
      tiles.push({ ...b, s: b.s + d, e: b.e + d });
    } else {
      chips.push(b);
    }
  }
  const sortedChips = [...chips].sort((a, b) => a.s - b.s);
  return {
    tiles: tiles.map((t, i) => {
      const next = tiles[i + 1]?.s ?? Infinity;
      return {
        ...t,
        c: Math.min(Math.max(t.e + LINGER, t.s + MIN_FOCUS), next),
      };
    }),
    // One chip at a time: each ends where the next begins.
    chips: sortedChips.map((ch, i) => ({
      ...ch,
      e: Math.min(ch.e, sortedChips[i + 1]?.s ?? Infinity),
    })),
  };
};
