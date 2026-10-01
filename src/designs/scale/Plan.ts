// What the balance scale does, frame by frame. The scale is one instrument,
// so its scenes never overlap: the hook first (its value lands on the right
// pan), then each `change` cue (both pans hold `from`, at swapAtMs the right
// pan's weight is replaced by `to` and the beam re-tips) and each `compare`
// cue (card 1 on the left pan, card 2 on the right, each dropping as its
// value is said). Every figure and named bank that finds the stage free gets
// the mini pan in the middle (the scale dims behind it); one that lands while
// the stage is taken waits up to WAIT frames, else rides as a small chip.
// While points or a classic MotionTrack panel is up the scale dims.
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
  type Tone,
} from "../../mortgage/schema";

export const BEFORE = "TRƯỚC";
export const AFTER = "SAU";
// A change between two rates is in percentage points, not percent.
export const POINTS = "điểm %";

const WAIT = 15;
export const FALL = 9; // frames a weight falls before it lands
export const MAX_TILT = 14; // degrees, a lone weight or a big difference
const MIN_TILT = 2.5; // any real difference is visible
const TILT_GAIN = 80; // degrees per relative difference (0.1 -> 8°)
export const STACK_MAX = 130; // px, the heavier weight
const STACK_MIN = 30;
const STACK_EQUAL = 80; // when a value does not parse

export type Span = [number, number];
export type Side = 0 | 1; // left pan, right pan

// ------------------------------------------------------------- numbers

export type Parsed = {
  value: number;
  unit: string; // "%", "đô", "" … prefix and suffix, lower case
  decimals: number;
  grouped: boolean; // "3.388": thousands separators as said
};

// A value that is only a number and a money/percent unit, Vietnamese style
// ("3.388", "4,35%", "$1.200", "600 đô"). A date, a range or a phrase is not
// clean, so no difference is ever computed from it.
const CLEAN =
  /^\s*(\$)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?|\d+\.\d+)\s*(%|đô|tỷ|triệu|nghìn|ngàn|k)?\s*$/iu;

export const parseValue = (s: string): Parsed | null => {
  const m = s.match(CLEAN);
  if (!m) return null;
  const n = m[2];
  const grouped = /^\d{1,3}(?:\.\d{3})+/.test(n) && !/^\d+\.\d{1,2}$/.test(n);
  const num = grouped
    ? n.replace(/\./g, "").replace(",", ".")
    : n.replace(",", ".");
  const value = parseFloat(num);
  if (!Number.isFinite(value)) return null;
  const dec = num.includes(".") ? num.split(".")[1].length : 0;
  return {
    value,
    unit: `${m[1] ?? ""}${(m[3] ?? "").toLowerCase()}`,
    decimals: dec,
    grouped,
  };
};

const fmt = (v: number, decimals: number, grouped: boolean) =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });

// "+0,75" + POINTS, "−287": b − a when both are clean and in the same unit, else null.
export const differenceOf = (a: string, b: string): string | null => {
  const pa = parseValue(a);
  const pb = parseValue(b);
  if (!pa || !pb || pa.unit !== pb.unit) return null;
  const d = pb.value - pa.value;
  if (d === 0) return null;
  const decimals = Math.max(pa.decimals, pb.decimals);
  const body = fmt(Math.abs(d), decimals, pa.grouped || pb.grouped);
  const unit = pa.unit.replace("$", "");
  const money = pa.unit.startsWith("$") ? "$" : "";
  const tail = unit === "%" ? ` ${POINTS}` : unit ? ` ${unit}` : "";
  return `${d > 0 ? "+" : "−"}${money}${body}${tail}`;
};

// Stack heights (px) and the beam's tilt (degrees, + = right pan down) for
// two values. Proportional only when both parse in the same unit.
export const weigh = (
  a: string,
  b: string,
): { heights: [number, number]; tilt: number } => {
  const pa = parseValue(a);
  const pb = parseValue(b);
  if (!pa || !pb || pa.unit !== pb.unit)
    return { heights: [STACK_EQUAL, STACK_EQUAL], tilt: 0 };
  const va = Math.abs(pa.value);
  const vb = Math.abs(pb.value);
  const top = Math.max(va, vb, 1e-9);
  const h = (v: number) => Math.max(STACK_MIN, (STACK_MAX * v) / top);
  const rel = (vb - va) / top;
  const tilt =
    rel === 0
      ? 0
      : Math.sign(rel) *
        Math.min(MAX_TILT, Math.max(MIN_TILT, Math.abs(rel) * TILT_GAIN));
  return { heights: [h(va), h(vb)], tilt };
};

// ------------------------------------------------------------- scenes

export type PanLoad = {
  kicker: string;
  kickerAt: number; // plaque shows from here
  value?: string; // undefined: a weight with no number (no rows)
  label?: string;
  extra?: string[]; // more rows, "value · label"
  tone?: Tone;
  arrow?: "up" | "down";
  dropAt: number; // the weight starts falling
  height: number;
  ghostFrom?: number; // change: a see-through copy of `from` before the swap
  highlightAt?: number;
  count?: { to: number; decimals: number; suffix: string }; // hook count-up
  big?: boolean; // the hook: a wider plaque, bigger number
};

export type Tag = { text: string; sub?: string; at: number; side: Side };

export type ScaleScene = {
  kind: "hook" | "change" | "compare";
  from: number;
  to: number;
  heading?: string;
  pans: [PanLoad | null, PanLoad | null];
  tag?: Tag;
  tilts: { at: number; angle: number }[]; // targets inside the scene
  swapAt?: number;
};

export type Hero =
  | { kind: "figure"; from: number; to: number; figure: Figure }
  | { kind: "lender"; from: number; to: number; lender: Lender };

export type Plan = {
  scenes: ScaleScene[];
  heroes: Hero[];
  chips: Hero[];
  dim: Span[]; // points and classic panels
  tiltEvents: { at: number; angle: number }[]; // the whole video, in order
};

type Hook = NonNullable<EditJson["hook"]>;
type ChangeCue = Extract<Cue, { kind: "change" }>;
type CompareCue = Extract<Cue, { kind: "compare" }>;
export type OwnScaleCue = ChangeCue | CompareCue;

export const onScale = (c: Cue): c is OwnScaleCue =>
  c.kind === "change" || c.kind === "compare";

const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

export const hookScene = (hook: Hook): ScaleScene => ({
  kind: "hook",
  from: 0,
  to: HOOK_FRAMES,
  pans: [
    null,
    {
      kicker: "",
      kickerAt: 0,
      value: hook.big,
      label: hook.sub,
      dropAt: 4,
      height: STACK_MAX * 0.85,
      big: true,
      count:
        hook.countTo === undefined
          ? undefined
          : {
              to: hook.countTo,
              decimals: hook.decimals ?? 0,
              suffix: hook.suffix ?? "",
            },
    },
  ],
  // One value, nothing to weigh it against: the beam stays level (viewed
  // critique 08: a full tilt read "4,35% versus nothing").
  tilts: [{ at: 4 + FALL, angle: 0 }],
});

const changeScene = (
  cue: ChangeCue,
  from: number,
  to: number,
  swap: number,
): ScaleScene => {
  const { heights, tilt } = weigh(cue.from, cue.to);
  const diff = differenceOf(cue.from, cue.to);
  const drop = from + 4;
  const swapAt = Math.max(swap, drop + FALL + 10);
  return {
    kind: "change",
    from,
    to,
    heading: [cue.kicker, cue.label].filter(Boolean).join(" · "),
    swapAt,
    pans: [
      {
        kicker: BEFORE,
        kickerAt: from,
        value: cue.from,
        dropAt: drop,
        height: heights[0],
      },
      {
        kicker: AFTER,
        kickerAt: from,
        value: cue.to,
        dropAt: swapAt,
        height: heights[1],
        ghostFrom: drop,
        arrow: cue.direction,
        tone: cue.tone,
      },
    ],
    tag: diff
      ? { text: diff, at: swapAt + FALL + 14, side: tilt >= 0 ? 1 : 0 }
      : undefined,
    // Both pans hold `from` (level) until the swap.
    tilts: [
      { at: drop + FALL, angle: 0 },
      { at: swapAt + FALL, angle: tilt },
    ],
  };
};

const compareScene = (
  cue: CompareCue,
  from: number,
  to: number,
  at: (ms: number) => number,
): ScaleScene => {
  const firstRow = (i: Side) => cue.cards[i].rows[0];
  const values = [firstRow(0)?.value ?? "", firstRow(1)?.value ?? ""];
  const { heights, tilt } = weigh(values[0], values[1]);
  const pans = cue.cards.map((card, i): PanLoad => {
    const row = card.rows[0];
    return {
      kicker: card.title,
      kickerAt: Math.max(from, at(card.atMs)),
      value: row?.value,
      label: row?.label,
      extra: card.rows.slice(1).map((r) => `${r.value} · ${r.label}`),
      tone: row?.tone,
      dropAt: Math.max(from, at(row?.atMs ?? card.atMs)),
      height: heights[i],
      highlightAt:
        card.highlightAtMs === undefined ? undefined : at(card.highlightAtMs),
    };
  }) as [PanLoad, PanLoad];
  // The first weight alone tips the beam fully; the second sets the real tilt.
  const [first, second]: Side[] =
    pans[0].dropAt <= pans[1].dropAt ? [0, 1] : [1, 0];
  const lone = first === 1 ? MAX_TILT : -MAX_TILT;
  const both = pans[second].dropAt + FALL;
  const heavier: Side = tilt < 0 ? 0 : 1;
  const sameLabel =
    firstRow(0) && firstRow(1) && firstRow(0).label === firstRow(1).label;
  const diff = sameLabel ? differenceOf(values[0], values[1]) : null;
  // The reel's own words for the difference first; else computed, else none.
  const tag: Tag | undefined = cue.question
    ? { text: cue.question.text, at: at(cue.question.atMs), side: heavier }
    : diff
      ? { text: diff, sub: firstRow(0)?.label, at: both + 14, side: heavier }
      : undefined;
  return {
    kind: "compare",
    from,
    to,
    pans,
    tag,
    tilts: [
      { at: pans[first].dropAt + FALL, angle: lone },
      { at: both, angle: tilt },
    ],
  };
};

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const dim = cues
    .filter((c) => !onScale(c) && c.kind !== "emoji")
    .map((c): Span => [at(c.fromMs), at(c.toMs)]);
  const taken: Span[] = [...dim];
  const scenes: ScaleScene[] = [];
  const heroes: Hero[] = [];
  const chips: Hero[] = [];
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
    scenes.push(hookScene(reel.edit.hook));
    taken.push([0, HOOK_FRAMES]);
  }
  [...cues]
    .filter(onScale)
    .sort((a, b) => a.fromMs - b.fromMs)
    .forEach((cue) => {
      const from = freeFrom(at(cue.fromMs));
      // A cue clipped by the hook still gets 2 s on the scale.
      const to = Math.max(at(cue.toMs), from + 2 * fps);
      scenes.push(
        cue.kind === "change"
          ? changeScene(cue, from, to, at(cue.swapAtMs))
          : compareScene(cue, from, to, at),
      );
      taken.push([from, to]);
    });
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const items: Hero[] = [
    ...figuresOf(reel, fps).map(
      (figure): Hero => ({
        kind: "figure",
        from: figure.fromFrame,
        to: figure.fromFrame + figure.frames,
        figure,
      }),
    ),
    ...lenderMentionsOf(reel).map(
      (m): Hero => ({
        kind: "lender",
        from: toFrame(m.startMs),
        to: Math.max(toFrame(m.startMs) + 1, toFrame(m.endMs)),
        lender: m.lender,
      }),
    ),
  ].sort((x, y) => x.from - y.from);
  for (const it of items) {
    const free = freeFrom(it.from);
    const late: Span = [free, free + (it.to - it.from)];
    if (free - it.from <= WAIT && !taken.some((s) => overlaps(s, late))) {
      taken.push(late);
      heroes.push({ ...it, from: late[0], to: late[1] });
    } else chips.push(it);
  }
  // Tilt targets over the whole video: each scene's own, level after it.
  const tiltEvents = scenes
    .sort((a, b) => a.from - b.from)
    .flatMap((s) => [...s.tilts, { at: s.to, angle: 0 }]);
  return { scenes, heroes, chips, dim, tiltEvents };
};

// ------------------------------------------------------------- self-check

// Bundle and call it (esbuild, see the design's report); throws on a mismatch.
export const selfCheck = () => {
  const eq = (a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw new Error(
        `scale Plan: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`,
      );
  };
  eq(parseValue("3.388")?.value, 3388);
  eq(parseValue("4,35%")?.value, 4.35);
  eq(parseValue("29/9"), null);
  eq(differenceOf("3.388", "3.675"), "+287");
  eq(differenceOf("3,6%", "4,35%"), `+0,75 ${POINTS}`);
  eq(differenceOf("5,89%", "5,64%"), `−0,25 ${POINTS}`);
  eq(differenceOf("3,6%", "600"), null);
  eq(weigh("a", "b").tilt, 0);
  eq(weigh("5,89%", "5,64%").tilt < 0, true);
  eq(weigh("3,6%", "4,35%").tilt > 10, true);
};
