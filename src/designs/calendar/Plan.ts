// The calendar page's schedule. The page is one place: the hook, each
// `change` cue and each date stat claim it in turn; every other figure (or a
// date whose page stays taken) becomes a sticky note on the calendar's edge.
import { HOOK_FRAMES, figuresOf, type Figure } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import type { CueOf } from "../classic/Infographics";

export const TEAR = 16; // frames a torn page takes to leave
export const FLIP_THROUGH = 16; // frames of blank pages before a date lands
const DATE_WAIT = 15; // a date waits this long for a taken page
export const MIN_HOLD = 45; // READING.minNumberHoldMs at 30 fps

// Cue kinds that take the whole desk (the calendar steps back).
export const fullDesk = (c: Cue) => c.kind !== "change" && c.kind !== "points";

export const isDate = (big: string) =>
  /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(big);
export const isYear = (big: string) => /^(19|20)\d{2}$/.test(big);

export type Span = [number, number];
export type Plan = {
  hookOnPage: boolean;
  changes: {
    cue: CueOf<"change">;
    from: number;
    to: number;
    swap: number;
    under: boolean; // starts under the tearing hook page: no flip-in
  }[];
  dates: { figure: Figure; from: number; to: number }[];
  notes: { figure: Figure; lane: number }[];
  hidden: Span[];
};

export const planPage = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const hook = reel.edit.hook;
  const raw = cues
    .filter((c): c is CueOf<"change"> => c.kind === "change")
    .map((cue) => ({
      cue,
      from: at(cue.fromMs),
      to: at(cue.toMs),
      swap: at(cue.swapAtMs),
      under: false,
    }));
  // A change whose swap falls inside the hook takes the page; the hook then
  // rides as a sticky note. Otherwise the change waits for the hook.
  const hookOnPage =
    Boolean(hook) &&
    !raw.some((c) => c.from < HOOK_FRAMES && c.swap < HOOK_FRAMES + 20);
  const changes = raw.map((c) =>
    hookOnPage && c.from < HOOK_FRAMES
      ? {
          ...c,
          from: Math.min(HOOK_FRAMES - TEAR, c.swap - 20),
          under: c.swap - 20 >= HOOK_FRAMES - TEAR,
        }
      : c,
  );
  const hidden: Span[] = cues
    .filter(fullDesk)
    .map((c) => [at(c.fromMs), at(c.toMs)]);
  const taken: Span[] = [
    ...(hookOnPage ? [[0, HOOK_FRAMES] as Span] : []),
    ...changes.map((c) => [c.from, c.to] as Span),
    ...cues
      .filter((c) => c.kind !== "change")
      .map((c) => [at(c.fromMs), at(c.toMs)] as Span),
  ];
  const free = (f: number) => !taken.some(([a, b]) => f >= a && f < b);
  const dates: Plan["dates"] = [];
  const notes: Plan["notes"] = [];
  const hookNote: Figure[] =
    hook && !hookOnPage
      ? [
          {
            fromFrame: 0,
            frames: HOOK_FRAMES,
            big: hook.big,
            label: hook.sub ?? "",
            source: "stat",
          },
        ]
      : [];
  for (const f of [...hookNote, ...figuresOf(reel, fps)]) {
    const start = isDate(f.big)
      ? [...Array(DATE_WAIT + 1).keys()].map((k) => f.fromFrame + k).find(free)
      : undefined;
    if (start !== undefined && f !== hookNote[0]) {
      const to = Math.max(start + MIN_HOLD, f.fromFrame + f.frames);
      dates.push({ figure: f, from: start, to });
      taken.push([start, to]);
      continue;
    }
    // Lane 1 when another note is still up.
    const busy = notes.some(
      (n) =>
        n.lane === 0 &&
        f.fromFrame < n.figure.fromFrame + n.figure.frames &&
        n.figure.fromFrame < f.fromFrame + f.frames,
    );
    notes.push({ figure: f, lane: busy ? 1 : 0 });
  }
  return { hookOnPage, changes, dates, notes, hidden };
};
