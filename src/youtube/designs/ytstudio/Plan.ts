// The running order of the studio: what the wall screen shows when, what
// drops to a chip in its header, where the camera goes tight, the chapter
// slates and the presenter column's key point. Pure data, computed once per
// render from the reel (golden rules: every figure and lender still shows;
// two things never share the screen at once).
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../../mortgage/golden";
import type { Lender } from "../../../mortgage/lenders";
import { outFrameOf, type Cue, type Reel } from "../../../mortgage/schema";
import { SLATE_FRAMES, TIGHT_MIN_FRAMES } from "./tokens";

// The cue kinds this design draws on its screen; the rest go to CueFallback16.
export const DRAWN = ["points", "compare", "change", "trend", "bars"] as const;
export type DrawnCue = Extract<Cue, { kind: (typeof DRAWN)[number] }>;
const isDrawn = (c: Cue): c is DrawnCue =>
  (DRAWN as readonly string[]).includes(c.kind);

export type Span = { from: number; to: number };
export type Main =
  | (Span & { kind: "hook" })
  | (Span & { kind: "cue"; cue: DrawnCue })
  | (Span & { kind: "figure"; figure: Figure })
  | (Span & { kind: "lender"; lender: Lender });
export type Chip =
  | (Span & { kind: "figure"; figure: Figure })
  | (Span & { kind: "lender"; lender: Lender });
export type Chapter = Span & { index: number; title: string };
export type KeyPoint = { from: number; text: string; big?: string };

export type Plan = {
  chapters: Chapter[];
  slates: Chapter[];
  mains: Main[];
  chips: Chip[];
  tight: Span[];
  keyPoints: KeyPoint[];
  fallbackKinds: string[];
};

const MIN_MAIN = 30; // a figure squeezed below 1 s on screen becomes a chip
const MIN_LENDER = 45;

const overlaps = (a: Span, b: Span) => a.from < b.to && b.from < a.to;

const cueTitle = (c: DrawnCue): string => {
  switch (c.kind) {
    case "points":
    case "trend":
    case "bars":
      return c.title;
    case "compare":
      return c.question?.text ?? `${c.cards[0].title} · ${c.cards[1].title}`;
    case "change":
      return c.label;
  }
};

export const buildPlan = (
  reel: Reel,
  talkFrames: number,
  fps: number,
): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const edit = reel.edit;
  const chapterList = edit.chapters ?? [];
  const chapters: Chapter[] = chapterList.map((c, i) => ({
    index: i,
    title: c.title,
    from: at(c.atMs),
    to: chapterList[i + 1] ? at(chapterList[i + 1].atMs) : talkFrames,
  }));
  // The cover opens the first chapter; a slate would bury the hook.
  const slates = chapters
    .filter((c) => c.from >= HOOK_FRAMES)
    .map((c) => ({ ...c, to: c.from + SLATE_FRAMES }));
  // Anything that starts under a slate waits for it.
  const afterSlate = (f: number) => {
    const s = slates.find((x) => f >= x.from && f < x.to);
    return s ? s.to : f;
  };

  const mains: Main[] = [];
  const chips: Chip[] = [];
  if (edit.hook) mains.push({ kind: "hook", from: 0, to: HOOK_FRAMES });
  const cues = edit.cues ?? [];
  for (const c of cues.filter(isDrawn))
    mains.push({ kind: "cue", cue: c, from: at(c.fromMs), to: at(c.toMs) });
  const fallbackCues = cues.filter((c) => !isDrawn(c));
  const busy = (s: Span) =>
    mains.some((m) => overlaps(m, s)) ||
    fallbackCues.some((c) =>
      overlaps({ from: at(c.fromMs), to: at(c.toMs) }, s),
    );
  const nextBusy = (f: number) =>
    Math.min(
      Infinity,
      ...mains.filter((m) => m.from > f).map((m) => m.from),
      ...fallbackCues.map((c) => at(c.fromMs)).filter((x) => x > f),
    );

  for (const figure of figuresOf(reel, fps)) {
    const end = figure.fromFrame + figure.frames;
    const from = afterSlate(figure.fromFrame);
    const to = Math.min(Math.max(end, from + MIN_MAIN), nextBusy(from));
    const span = { from, to };
    if (to - from >= MIN_MAIN && !busy({ from, to: from + 1 }))
      mains.push({ kind: "figure", figure, ...span });
    else
      chips.push({
        kind: "figure",
        figure,
        from,
        to: Math.max(end, from + MIN_MAIN),
      });
  }
  for (const m of lenderMentionsOf(reel)) {
    const from = afterSlate(Math.round((m.startMs / 1000) * fps));
    const to = Math.max(from + MIN_LENDER, Math.round((m.endMs / 1000) * fps));
    // Screen taken at the mention: a chip now, then the full logo as soon
    // as the screen frees up (if enough of the mention is left).
    const free = Math.max(
      from,
      ...mains.filter((x) => x.from <= from && x.to > from).map((x) => x.to),
    );
    const end = Math.max(to, free + MIN_LENDER);
    const fits = !busy({ from: free, to: end });
    if (fits)
      mains.push({ kind: "lender", lender: m.lender, from: free, to: end });
    if (free > from || !fits)
      chips.push({
        kind: "lender",
        lender: m.lender,
        from,
        to: fits ? free : to,
      });
  }
  mains.sort((a, b) => a.from - b.from);

  // Tight framing on the screen for the big numbers.
  const tight = mains
    .filter(
      (m) =>
        m.kind === "hook" ||
        (m.kind === "cue" && m.cue.kind === "change") ||
        (m.kind === "figure" && m.to - m.from >= TIGHT_MIN_FRAMES),
    )
    .map(({ from, to }) => ({ from, to }));

  // Key point: what the viewer should hold on to right now. The hook's
  // line, each chapter, each cue's title, each figure (number + label); a
  // figure chip under a cue leaves the cue's title up.
  const inCue = (f: number) =>
    mains.some((m) => m.kind === "cue" && f >= m.from && f < m.to);
  const keyPoints: KeyPoint[] = [
    ...(edit.hook?.sub
      ? [{ from: 0, text: edit.hook.sub, big: edit.hook.big }]
      : []),
    ...chapters
      .filter((c) => !(edit.hook && c.from < HOOK_FRAMES))
      .map((c) => ({ from: c.from, text: c.title })),
    ...mains.flatMap((m) =>
      m.kind === "cue"
        ? [{ from: m.from, text: cueTitle(m.cue) }]
        : m.kind === "figure"
          ? [{ from: m.from, text: m.figure.label, big: m.figure.big }]
          : [],
    ),
    ...chips.flatMap((c) =>
      c.kind === "figure" && !inCue(c.from) && c.from >= HOOK_FRAMES
        ? [{ from: c.from, text: c.figure.label, big: c.figure.big }]
        : [],
    ),
  ].sort((a, b) => a.from - b.from);

  return {
    chapters,
    slates,
    mains,
    chips,
    tight,
    keyPoints,
    fallbackKinds: [...new Set(fallbackCues.map((c) => c.kind))],
  };
};

// The latest item that has started by `frame`.
export const latest = <T extends { from: number }>(
  items: T[],
  frame: number,
): T | undefined => {
  let hit: T | undefined;
  for (const x of items) if (x.from <= frame) hit = x;
  return hit;
};
