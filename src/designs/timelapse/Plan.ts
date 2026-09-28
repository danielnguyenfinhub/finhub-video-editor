// "timelapse" plan: everything the time machine does, worked out once from
// the reel on the talk timeline (frames). Scenes the design draws itself
// (compare, change, points), the hook, the spans a classic MotionTrack panel
// owns (the machine dims), where each figure and bank goes (the clock centre
// or the small timestamp slot) and every fast-forward ("scrub") that spins
// the hands, races the playhead and flashes the badge.
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
  type Reel,
  type Tone,
} from "../../mortgage/schema";

export type Span = [number, number];
type OwnCue = Extract<Cue, { kind: "points" | "compare" | "change" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare" || c.kind === "change";

export const SCRUB = 22; // frames of a before -> after fast-forward
const STEP_SCRUB = 10; // a points milestone
const WAIT = 15; // a figure may wait this long for the stage to free up

export type Row = { label: string; value: string; tone: Tone; at: number };
export type Scene =
  | {
      kind: "change";
      from: number;
      to: number;
      cue: Extract<Cue, { kind: "change" }>;
      reveal: number;
    }
  | {
      kind: "compare";
      from: number;
      to: number;
      titles: [string, string];
      titleAt: [number, number];
      before: Row[];
      after: Row[];
      reveal: number;
      question?: { text: string; at: number };
    }
  | {
      kind: "points";
      from: number;
      to: number;
      title: string;
      items: { text: string; at: number }[];
    };

export type Placed<T> = T & {
  from: number;
  to: number;
  slot: "center" | "mini";
};
export type Scrub = { at: number; dur: number; turns: number };

export type Plan = {
  hook: boolean;
  scenes: Scene[];
  dim: Span[];
  figures: Placed<{ figure: Figure }>[];
  lenders: Placed<{ lender: Lender }>[];
  scrubs: Scrub[];
};

const overlaps = (a: Span, spans: Span[]) =>
  spans.some(([s, e]) => a[0] < e && a[1] > s);

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const hook = Boolean(reel.edit.hook);
  const hookEnd = hook ? HOOK_FRAMES : 0;
  const cues = reel.edit.cues ?? [];
  const scenes: Scene[] = [];
  const scrubs: Scrub[] = hook ? [{ at: 6, dur: 34, turns: 3 }] : [];
  for (const c of cues.filter(isOwnCue)) {
    const cueFrom = at(c.fromMs);
    const to = at(c.toMs);
    // A cue that starts under the hook waits for it (never two things in
    // the clock); if that leaves it no time, it keeps its own start.
    const from = cueFrom < hookEnd && to - hookEnd > 30 ? hookEnd : cueFrom;
    if (c.kind === "change") {
      const reveal = Math.max(from + 8, at(c.swapAtMs));
      scenes.push({ kind: "change", from, to, cue: c, reveal });
      scrubs.push({ at: reveal, dur: SCRUB, turns: 4 });
    } else if (c.kind === "compare") {
      const rows = (k: 0 | 1): Row[] =>
        c.cards[k].rows.map((r) => ({ ...r, at: at(r.atMs) }));
      const before = rows(0);
      const after = rows(1);
      // The fast-forward lands when the "after" value is said, never before
      // the "before" value has had a moment on screen.
      const beforeAt = Math.max(
        at(c.cards[0].atMs),
        ...before.map((r) => r.at),
      );
      const reveal = Math.max(
        after[0]?.at ?? at(c.cards[1].atMs),
        beforeAt + 12,
        from + 8,
      );
      scenes.push({
        kind: "compare",
        from,
        to,
        titles: [c.cards[0].title, c.cards[1].title],
        titleAt: [at(c.cards[0].atMs), at(c.cards[1].atMs)],
        before,
        after,
        reveal,
        question: c.question
          ? { text: c.question.text, at: at(c.question.atMs) }
          : undefined,
      });
      scrubs.push({ at: reveal, dur: SCRUB, turns: 4 });
    } else {
      const items = c.items.map((it) => ({
        text: it.text,
        at: Math.max(from, at(it.atMs)),
      }));
      scenes.push({ kind: "points", from, to, title: c.title, items });
      for (const it of items)
        scrubs.push({ at: it.at, dur: STEP_SCRUB, turns: 1 });
    }
  }
  // Classic panels (every other kind but the emoji sticker).
  const dim: Span[] = cues
    .filter((c) => !isOwnCue(c) && c.kind !== "emoji")
    .map((c) => [at(c.fromMs), at(c.toMs)]);

  const taken: Span[] = [
    ...(hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...scenes.map((s): Span => [s.from, s.to]),
    ...dim,
  ];
  // The clock centre holds one thing: a figure starting while it is taken
  // waits up to WAIT frames for it, else becomes the small timestamp chip.
  const place = <T>(item: T, from0: number, to: number): Placed<T> => {
    const busyEnd = taken
      .filter(([s, e]) => from0 < e && to > s)
      .reduce((m, [, e]) => Math.max(m, e), -1);
    const from =
      busyEnd > from0 && busyEnd - from0 <= WAIT && to - busyEnd > 30
        ? busyEnd
        : from0;
    const center = !overlaps([from, to], taken);
    if (center) taken.push([from, to]);
    return {
      ...item,
      from: center ? from : from0,
      to,
      slot: center ? "center" : "mini",
    };
  };
  const figures = figuresOf(reel, fps).map((f) =>
    place({ figure: f }, f.fromFrame, f.fromFrame + f.frames),
  );
  const figureScrubs = figures
    .filter((f) => f.slot === "center")
    .map((f): Scrub => ({ at: f.from, dur: 14, turns: 1 }));
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const lenders = lenderMentionsOf(reel).map((m) =>
    place(
      { lender: m.lender },
      toFrame(m.startMs),
      Math.max(toFrame(m.startMs) + 1, toFrame(m.endMs)),
    ),
  );
  return {
    hook,
    scenes,
    dim,
    figures,
    lenders,
    scrubs: [...scrubs, ...figureScrubs].sort((a, b) => a.at - b.at),
  };
};

// ------------------------------------------------------------- numbers

export type Parsed = {
  value: number;
  decimals: number;
  grouped: boolean;
  prefix: string;
  unit: string;
};

// Vietnamese formats: "," is the decimal mark, "." groups thousands
// ("3.388"); a lone "." before 1–2 digits reads as a decimal ("4.35").
// null when it is not one clean number (a date "29/9", a range, words).
export const parseValue = (s: string): Parsed | null => {
  const m = s.trim().match(/^([^\d]*?)(\d[\d.,]*)\s*(.*)$/);
  if (!m) return null;
  const [, prefix, raw, unit] = m;
  if (
    /\d/.test(unit) ||
    /[/:]/.test(unit) ||
    raw.endsWith(".") ||
    raw.endsWith(",")
  )
    return null;
  let digits = raw;
  let decimals = 0;
  let grouped = false;
  if (raw.includes(",")) {
    const [int, frac, extra] = raw.split(",");
    if (extra !== undefined) return null;
    grouped = int.includes(".");
    if (
      grouped &&
      !int
        .split(".")
        .slice(1)
        .every((p) => p.length === 3)
    )
      return null;
    digits = `${int.replace(/\./g, "")}.${frac}`;
    decimals = frac.length;
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.slice(1).every((p) => p.length === 3)) {
      grouped = true;
      digits = parts.join("");
    } else if (parts.length === 2) decimals = parts[1].length;
    else return null;
  }
  const value = Number(digits);
  return Number.isFinite(value)
    ? { value, decimals, grouped, prefix: prefix.trim(), unit: unit.trim() }
    : null;
};

const sameUnit = (a: Parsed, b: Parsed) =>
  a.prefix === b.prefix && a.unit.toLowerCase() === b.unit.toLowerCase();

const format = (v: number, decimals: number, grouped: boolean) =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });

// The pair a scrub can run between (both clean numbers, same unit), else null.
export const scrubPair = (from: string, to: string) => {
  const a = parseValue(from);
  const b = parseValue(to);
  if (!a || !b || !sameUnit(a, b)) return null;
  const decimals = Math.max(a.decimals, b.decimals);
  const grouped = a.grouped || b.grouped;
  return (p: number) =>
    p >= 1
      ? to
      : p <= 0
        ? from
        : `${b.prefix}${format(a.value + (b.value - a.value) * p, decimals, grouped)}${b.unit ? (to.includes(" ") ? " " : "") + b.unit : ""}`;
};

export const POINTS_UNIT = "điểm %";

// The difference between two values: only when both parse as numbers in the
// same unit, and the sign agrees with the data's own direction. Else null.
export const diffOf = (
  from: string,
  to: string,
  direction?: "up" | "down",
): string | null => {
  const a = parseValue(from);
  const b = parseValue(to);
  if (!a || !b || !sameUnit(a, b)) return null;
  const decimals = Math.max(a.decimals, b.decimals);
  const d = Number((b.value - a.value).toFixed(decimals));
  if (d === 0 || (direction && d > 0 !== (direction === "up"))) return null;
  const unit = a.unit === "%" ? POINTS_UNIT : a.unit;
  return `${d > 0 ? "+" : "−"}${a.prefix}${format(Math.abs(d), decimals, a.grouped || b.grouped)}${unit ? ` ${unit}` : ""}`;
};

// A hook with countTo counts up; anything else is shown as said.
export const hookScrub = (hook: NonNullable<Reel["edit"]["hook"]>) => {
  const target = hook.countTo;
  return target === undefined
    ? null
    : (p: number) =>
        `${format(target * Math.min(1, p), hook.decimals ?? 0, false)}${hook.suffix ?? ""}`;
};
