// The "Mục lục" plan: every frame number the design needs, computed once from
// edit.json on the talk timeline. Chapters (the table of contents), the
// sub-bullets the sidebar lists under each chapter (only what the script says:
// points items, stats and spoken figures, change values, compare questions),
// and the stage schedule for the main page, so two visuals never share it.
import { brand } from "../../../brand/theme";
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../../mortgage/golden";
import type { Lender } from "../../../mortgage/lenders";
import { outFrameOf, type Cue, type Reel } from "../../../mortgage/schema";
import { YT_SAFE } from "../../frame";

// Layout: sidebar on the left ~32 %, the page (main area) on the right.
export const SIDE_W = 620;
export const PAGE_L = SIDE_W + 64;
export const PAGE_R = YT_SAFE.right;
export const PAGE_W = PAGE_R - PAGE_L;
export const STAGE_TOP = 196;
export const STAGE_BOTTOM = 770;
export const STRIP_TOP = 800;
export const PAPER = "#F6F4EF"; // theme-exempt: the off-white page, no warm/paper token in brand
export const INK = brand.textOnCard;

// Cue kinds this design draws itself; the rest go to CueFallback16.
export const DRAWN = [
  "points",
  "compare",
  "change",
  "trend",
  "bars",
  "verdict",
] as const;
export type DrawnCue = Extract<Cue, { kind: (typeof DRAWN)[number] }>;
const isDrawn = (c: Cue): c is DrawnCue =>
  (DRAWN as readonly string[]).includes(c.kind);

export type Chapter = { title: string; from: number; to: number };
export type Bullet = { text: string; at: number };
export type StageItem =
  | { kind: "hook"; from: number; to: number }
  | { kind: "slate"; from: number; to: number; chapter: number } // -1: no chapters, the video title
  | { kind: "cue"; from: number; to: number; cue: DrawnCue }
  | { kind: "figure"; from: number; to: number; fig: Figure }
  | { kind: "lender"; from: number; to: number; lender: Lender };
export type Chip =
  | { kind: "figure"; from: number; to: number; fig: Figure }
  | { kind: "lender"; from: number; to: number; lender: Lender };

export const SLATE_MIN = 30;
const REST_MIN = 45; // shorter gaps stay empty
const MIN_HOLD = 45; // a pushed figure or logo still shows 1.5 s

export type Plan = {
  chapters: Chapter[];
  bullets: Bullet[];
  stage: StageItem[];
  chips: Chip[];
  fallbackKinds: string[];
  at: (srcMs: number) => number;
};

const bulletsOf = (reel: Reel, fps: number, at: Plan["at"]): Bullet[] => {
  const out: Bullet[] = [];
  for (const c of reel.edit.cues ?? []) {
    if (c.kind === "points")
      c.items.forEach((it) => out.push({ text: it.text, at: at(it.atMs) }));
    if (c.kind === "change")
      out.push({ text: `${c.label} ${c.from} → ${c.to}`, at: at(c.swapAtMs) });
    if (c.kind === "compare" && c.question)
      out.push({ text: c.question.text, at: at(c.question.atMs) });
  }
  // Stats only: an automatic figure's label is a transcript fragment.
  for (const f of figuresOf(reel, fps))
    if (f.source === "stat")
      out.push({ text: `${f.big} · ${f.label}`, at: f.fromFrame });
  const seen = new Set<string>();
  return out
    .sort((a, b) => a.at - b.at)
    .filter((b) => !seen.has(b.text) && seen.add(b.text));
};

const overlaps = (t: number, items: { from: number; to: number }[]) =>
  items.some((s) => t >= s.from && t < s.to);

export const planOf = (reel: Reel, fps: number, talkFrames: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const edit = reel.edit;
  const chapters: Chapter[] = (edit.chapters ?? []).map((c, i, all) => ({
    title: c.title,
    from: at(c.atMs),
    to: all[i + 1] ? at(all[i + 1].atMs) : talkFrames,
  }));
  const hookEnd = edit.hook ? HOOK_FRAMES : 0;
  const cues: StageItem[] = (edit.cues ?? []).filter(isDrawn).map((cue) => ({
    kind: "cue",
    from: Math.max(hookEnd, at(cue.fromMs)),
    to: at(cue.toMs),
    cue,
  }));
  const figures = figuresOf(reel, fps).map((fig) => ({
    kind: "figure" as const,
    from: Math.max(hookEnd, fig.fromFrame),
    to: Math.max(hookEnd, fig.fromFrame) + fig.frames,
    fig,
  }));
  const lenders = lenderMentionsOf(reel).map((m) => {
    const from = Math.round((m.startMs / 1000) * fps);
    const to =
      from +
      Math.max(MIN_HOLD, Math.round(((m.endMs - m.startMs) / 1000) * fps));
    return { kind: "lender" as const, from, to, lender: m.lender };
  });

  // A figure or logo said while a cue is up (or a logo during the hook)
  // becomes a chip; the stage keeps one thing at a time.
  const chips: Chip[] = [];
  const hook = edit.hook ? [{ from: 0, to: HOOK_FRAMES }] : [];
  const stageFigures = figures.filter((f) => !overlaps(f.from, cues));
  chips.push(...figures.filter((f) => overlaps(f.from, cues)));
  // A logo said during a figure takes the stage (the figure ends there).
  const busy = [...cues, ...hook];
  const stageLenders = lenders.filter((l) => !overlaps(l.from, busy));
  chips.push(...lenders.filter((l) => overlaps(l.from, busy)));

  // Chapter slates: the chapter's title page stays up until its first visual
  // arrives (an idle page is never blank), at least SLATE_MIN frames; a visual
  // that starts inside those first SLATE_MIN frames waits for them.
  const movable = [...cues, ...stageFigures, ...stageLenders];
  const slates: StageItem[] = chapters.map((c, i) => {
    const from = Math.max(c.from, hookEnd);
    const next = Math.min(
      ...movable.filter((m) => m.from >= from).map((m) => m.from),
    );
    const len = Math.max(SLATE_MIN, next - from);
    return { kind: "slate", from, to: Math.min(from + len, c.to), chapter: i };
  });
  const pushed = movable.map((m) => {
    const s = slates.find((sl) => m.from >= sl.from && m.from < sl.to);
    if (!s) return m;
    const to = m.kind === "cue" ? m.to : Math.max(m.to, s.to + MIN_HOLD);
    return { ...m, from: s.to, to };
  });

  const all: StageItem[] = [
    ...(edit.hook ? [{ kind: "hook" as const, from: 0, to: HOOK_FRAMES }] : []),
    ...slates,
    ...pushed,
  ].sort((a, b) => a.from - b.from);
  // Each item ends where the next begins.
  const stage = all
    .map((s, i) => ({
      ...s,
      to: Math.min(s.to, all[i + 1]?.from ?? talkFrames),
    }))
    .filter((s) => s.to - s.from > 5);
  // An empty page between visuals shows its chapter's title page again (the
  // video title without chapters), so the page is never blank for long.
  const rests: StageItem[] = [];
  [0, ...stage.map((s) => s.to)].forEach((from, i) => {
    const end = Math.min(stage[i]?.from ?? talkFrames, talkFrames);
    if (end - from < REST_MIN) return;
    const chapter = chapters.findIndex((c) => from >= c.from && from < c.to);
    rests.push({ kind: "slate", from, to: end, chapter });
  });

  const fallbackKinds = [
    ...new Set((edit.cues ?? []).filter((c) => !isDrawn(c)).map((c) => c.kind)),
  ];
  return {
    chapters,
    bullets: bulletsOf(reel, fps, at),
    stage: [...stage, ...rests].sort((a, b) => a.from - b.from),
    chips,
    fallbackKinds,
    at,
  };
};
