// The deck: the talk cut into consecutive slides (one owns the stage at a
// time) plus chips (a figure or bank that arrives while the stage is taken).
// Order of claims: the hook's title slide, a divider at each chapter start,
// cues, figures, lender mentions. Gaps become "statement" slides (the spoken
// sentence, big).
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
} from "../../../mortgage/golden";
import type { Lender } from "../../../mortgage/lenders";
import { outFrameOf, type Cue, type Reel } from "../../../mortgage/schema";

export const DRAWN = ["points", "compare", "change", "trend", "bars"];
export const DIVIDER_FRAMES = 60;
const FIGURE_WAIT = 15; // a figure waits this long for the stage, else it is a chip
const MIN_SLIDE = 30;
const MIN_GAP = 45; // a shorter gap extends the slide before it
const LENDER_MIN = 60;

type Big = { big: string; label: string };
export type Slide = {
  from: number;
  to: number;
  kind:
    | "title"
    | "divider"
    | "cue"
    | "fallback"
    | "figure"
    | "lender"
    | "statement";
  cue?: Cue;
  figure?: Big;
  lender?: Lender;
  chapter?: number; // divider: its chapter index
};
export type Chip = { from: number; to: number; figure?: Big; lender?: Lender };
export type Chapter = { from: number; title: string };
export type Deck = { slides: Slide[]; chips: Chip[]; chapters: Chapter[] };

const RANK: Record<Slide["kind"], number> = {
  title: 0,
  divider: 1,
  cue: 2,
  fallback: 2,
  figure: 3,
  lender: 4,
  statement: 5,
};
const small = (s: Slide) => s.kind === "figure" || s.kind === "lender";

export const buildDeck = (
  reel: Reel,
  fps: number,
  talkFrames: number,
): Deck => {
  const at = outFrameOf(reel.timeline, fps);
  const hook = reel.edit.hook;
  const chapters: Chapter[] = (reel.edit.chapters ?? []).map((c) => ({
    from: at(c.atMs),
    title: c.title,
  }));
  const claims: Slide[] = [
    ...(hook
      ? [
          {
            from: 0,
            to: HOOK_FRAMES,
            kind: "title" as const,
            figure: { big: hook.big, label: hook.sub ?? "" },
          },
        ]
      : []),
    ...chapters.map((c, i) => ({
      from: c.from,
      to: c.from + DIVIDER_FRAMES,
      kind: "divider" as const,
      chapter: i,
    })),
    ...(reel.edit.cues ?? []).map((c) => ({
      from: at(c.fromMs),
      to: at(c.toMs),
      kind: DRAWN.includes(c.kind) ? ("cue" as const) : ("fallback" as const),
      cue: c,
    })),
    ...figuresOf(reel, fps).map((f) => ({
      from: f.fromFrame,
      to: f.fromFrame + f.frames,
      kind: "figure" as const,
      figure: { big: f.big, label: f.label },
    })),
    ...lenderMentionsOf(reel).map((m) => {
      const from = Math.round((m.startMs / 1000) * fps);
      const to = Math.round((m.endMs / 1000) * fps);
      return {
        from,
        to: Math.max(to, from + LENDER_MIN),
        kind: "lender" as const,
        lender: m.lender,
      };
    }),
  ]
    .filter((s) => s.to > s.from && s.from < talkFrames)
    .sort((a, b) => a.from - b.from || RANK[a.kind] - RANK[b.kind]);

  const slides: Slide[] = [];
  const chips: Chip[] = [];
  const toChip = (s: Slide) =>
    chips.push({ from: s.from, to: s.to, figure: s.figure, lender: s.lender });
  for (const c of claims) {
    const last = slides[slides.length - 1];
    if (!last || last.to <= c.from) {
      slides.push({ ...c });
      continue;
    }
    const wait = last.to - c.from;
    if (small(c)) {
      // A divider is a short, deliberate pause: a figure waits it out.
      if (
        wait <= FIGURE_WAIT ||
        (last.kind === "divider" && wait <= DIVIDER_FRAMES)
      ) {
        slides.push({ ...c, from: last.to, to: last.to + (c.to - c.from) });
      } else toChip(c);
      continue;
    }
    if (last.kind === "title" || last.kind === "divider") {
      slides.push({
        ...c,
        from: last.to,
        to: Math.max(c.to, last.to + MIN_SLIDE),
      });
      continue;
    }
    last.to = c.from; // the newer cue or chapter takes the stage
    if (last.to - last.from < MIN_SLIDE) {
      slides.pop();
      if (small(last)) toChip({ ...last, to: last.from + MIN_SLIDE * 2 });
    }
    slides.push({ ...c });
  }

  // Fill the gaps: statements where there is room, else hold the slide before.
  const out: Slide[] = [];
  let t = 0;
  for (const s of [
    ...slides,
    { from: talkFrames, to: talkFrames, kind: "statement" as const },
  ]) {
    const gap = Math.min(s.from, talkFrames) - t;
    const prev = out[out.length - 1];
    if (gap >= MIN_GAP || (gap > 0 && !prev))
      out.push({ from: t, to: t + gap, kind: "statement" });
    else if (gap > 0 && prev) prev.to += gap;
    if (s.to > s.from && s.from < talkFrames)
      out.push({ ...s, to: Math.min(s.to, talkFrames) });
    t = Math.max(t, Math.min(s.to, talkFrames));
  }
  return { slides: out, chips, chapters };
};

export const slideAt = (deck: Deck, frame: number): number => {
  const i = deck.slides.findIndex((s) => frame >= s.from && frame < s.to);
  return i < 0 ? deck.slides.length - 1 : i;
};

export const chapterAt = (deck: Deck, frame: number): number => {
  let i = -1;
  deck.chapters.forEach((c, j) => {
    if (c.from <= frame) i = j;
  });
  return Math.max(0, i);
};
