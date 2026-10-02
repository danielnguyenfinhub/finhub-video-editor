// What the dial shows, frame by frame. The dial is one instrument, so its
// scenes never overlap: the hook first, then each `change` cue (its needle
// sits on the old value and swings to the new one at swapAtMs), then every
// figure and named bank that finds the dial free. A figure or bank that
// lands while the dial is taken waits up to WAIT frames, else it shows as a
// small readout chip beside the dial. While a classic MotionTrack panel is
// up (points, compare, trend…) the dial dims under it.
import type React from "react";
import { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
  type Figure,
  hookCount,
  asSaid,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import {
  outFrameOf,
  type Cue,
  type EditJson,
  type Reel,
} from "../../mortgage/schema";
import { FONT, clamp, toneColor } from "../../mortgage/style";
import { Readout, type Chip, type ReadoutData } from "./Readouts";
import {
  C,
  GOLD,
  Hub,
  LABEL_TOP,
  LitArc,
  Needle,
  READOUT,
  SKY,
  SWEEP,
  Ticks,
  DialBody,
  angleOf,
  fmt,
  niceScale,
  parseValue,
  scaleLabels,
  type Parsed,
  type Scale,
} from "./Dial";

export const LENDER_LABEL = "ĐANG NHẮC TỚI";
const WAIT = 15;
const FADE = 8;
const REST = -SWEEP - 4;
const IDLE_TICKS = 8;

type Span = [number, number];
type Hook = NonNullable<EditJson["hook"]>;
export type ChangeCue = Extract<Cue, { kind: "change" }>;
type Scene =
  | { kind: "hook"; from: number; to: number; hook: Hook }
  | { kind: "change"; from: number; to: number; cue: ChangeCue; swap: number }
  | { kind: "figure"; from: number; to: number; figure: Figure }
  | { kind: "lender"; from: number; to: number; lender: Lender };
export type Plan = { scenes: Scene[]; chips: Chip[]; dim: Span[] };

const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = reel.edit.cues ?? [];
  const dim = cues
    .filter((c) => c.kind !== "change" && c.kind !== "emoji")
    .map((c): Span => [at(c.fromMs), at(c.toMs)]);
  const taken: Span[] = [...dim];
  const scenes: Scene[] = [];
  const chips: Chip[] = [];
  // The first frame at or after `f` that no taken span holds.
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
    scenes.push({
      kind: "hook",
      from: 0,
      to: HOOK_FRAMES,
      hook: reel.edit.hook,
    });
    taken.push([0, HOOK_FRAMES]);
  }
  cues
    .filter((c): c is ChangeCue => c.kind === "change")
    .forEach((cue) => {
      const from = freeFrom(at(cue.fromMs));
      // A cue clipped by the hook still gets 2 s on the dial.
      const to = Math.max(at(cue.toMs), from + 2 * fps);
      scenes.push({ kind: "change", from, to, cue, swap: at(cue.swapAtMs) });
      taken.push([from, to]);
    });
  // Figures and banks, in time order, get the dial if it is free (or frees
  // within WAIT), else a chip.
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const items = [
    ...figuresOf(reel, fps).map((figure) => ({
      a: figure.fromFrame,
      len: figure.frames,
      figure,
      lender: undefined as Lender | undefined,
    })),
    ...lenderMentionsOf(reel).map((m) => ({
      a: toFrame(m.startMs),
      len: Math.max(1, toFrame(m.endMs) - toFrame(m.startMs)),
      figure: undefined as Figure | undefined,
      lender: m.lender,
    })),
  ].sort((x, y) => x.a - y.a);
  for (const it of items) {
    const free = freeFrom(it.a);
    const late: Span = [free, free + it.len];
    if (free - it.a <= WAIT && !taken.some((s) => overlaps(s, late))) {
      taken.push(late);
      scenes.push(
        it.figure
          ? { kind: "figure", from: free, to: late[1], figure: it.figure }
          : { kind: "lender", from: free, to: late[1], lender: it.lender! },
      );
    } else chips.push({ from: it.a, to: it.a + it.len, ...it });
  }
  return { scenes, chips, dim };
};

// ------------------------------------------------------------- views

type View = {
  n: number;
  labels?: string[];
  angle: number;
  ghost?: number;
  lit?: { a: number; b: number; color: string };
  readout?: ReadoutData;
  logo?: Lender;
  label?: string;
  flash?: number; // frames since the swap
  plain?: boolean; // a year or a date: the readout alone, the dial dimmed
};

const ease = (x: number) => 1 - (1 - x) ** 3;
const sweep = (lf: number, fps: number, delay: number) =>
  spring({
    frame: lf - delay,
    fps,
    config: { damping: 9, stiffness: 95, mass: 0.9 },
  });
const show = (p: Parsed, v: number) =>
  `${p.before}${fmt(v, p.decimals, p.grouped)}${p.after}`;
const DATE = /(\d{1,2})\s*\/\s*(\d{1,2})/;

// A value swept in from the rest position, counting up (hook and figures).
const valueView = (
  p: Parsed,
  exact: string,
  lf: number,
  fps: number,
  kicker?: string,
  count = (t: number) => p.value * t,
): View => {
  const s = niceScale(0, Math.max(p.value * 1.35, 1e-3));
  const a = angleOf(p.value, s);
  const angle = REST + (a - REST) * sweep(lf, fps, 4);
  const t = interpolate(lf, [6, 38], [0, 1], { ...clamp, easing: ease });
  return {
    n: s.n,
    labels: scaleLabels(s),
    angle,
    lit: { a: -SWEEP, b: Math.max(-SWEEP, angle), color: SKY },
    readout: {
      kicker,
      text: t >= 1 ? exact : show(p, count(t)),
      widest: exact,
      color: t >= 1 ? GOLD : "#ffffff",
    },
  };
};

export const hookView = (hook: Hook, lf: number, fps: number): View => {
  const p: Parsed | null =
    hook.countTo !== undefined
      ? {
          value: hook.countTo,
          decimals: hook.decimals ?? 0,
          grouped: false,
          before: "",
          after: hook.suffix ?? "",
        }
      : parseValue(hook.big);
  const base =
    p && p.value > 0
      ? valueView(
          p,
          hook.countTo !== undefined ? show(p, p.value) : hook.big,
          lf,
          fps,
          undefined,
          (t) => hookCount(p.value, t),
        )
      : idleWith(hook.big, lf);
  return { ...base, label: hook.sub };
};

const idleWith = (text: string, lf: number): View => ({
  n: IDLE_TICKS,
  angle: REST,
  readout: { text, widest: text, color: lf > 10 ? GOLD : "#ffffff" },
});

const changeView = (
  cue: ChangeCue,
  swapAt: number,
  lf: number,
  fps: number,
): View => {
  const pf = parseValue(cue.from);
  const pt = parseValue(cue.to);
  const swapped = lf >= swapAt;
  const color = toneColor(cue.tone ?? "neutral", GOLD);
  const arrow = swapped ? cue.direction : undefined;
  const count = interpolate(lf, [swapAt, swapAt + 18], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const readout = (text: string) => ({
    kicker: cue.kicker,
    text,
    widest: cue.to.length > cue.from.length ? cue.to : cue.from,
    color: swapped ? color : "#ffffff",
    arrow,
    arrowColor: color,
  });
  if (!pf || !pt) {
    // Not two numbers: two readouts, no needle move.
    return {
      n: IDLE_TICKS,
      angle: REST,
      readout: readout(swapped ? cue.to : cue.from),
      label: cue.label,
      flash: swapped ? lf - swapAt : undefined,
    };
  }
  const lo = Math.min(pf.value, pt.value);
  const hi = Math.max(pf.value, pt.value);
  const pad = `${cue.from}${cue.to}`.includes("%")
    ? 1
    : Math.max(hi - lo, 0.15 * hi);
  const s: Scale = niceScale(
    lo >= 0 ? Math.max(0, lo - pad) : lo - pad,
    hi + pad,
  );
  const a0 = angleOf(pf.value, s);
  const a1 = angleOf(pt.value, s);
  const swing = spring({
    frame: lf - swapAt,
    fps,
    config: { damping: 7, stiffness: 120, mass: 0.9 },
  });
  const angle = swapped
    ? a0 + (a1 - a0) * swing
    : REST + (a0 - REST) * sweep(lf, fps, 2);
  const dec = Math.max(pf.decimals, pt.decimals);
  const text = !swapped
    ? cue.from
    : count >= 1
      ? cue.to
      : show(
          { ...pt, decimals: dec },
          pf.value + (pt.value - pf.value) * count,
        );
  return {
    n: s.n,
    labels: scaleLabels(s),
    angle,
    ghost: swapped ? a0 : undefined,
    lit: swapped ? { a: a0, b: angle, color } : undefined,
    readout: readout(text),
    label: cue.label,
    flash: swapped ? lf - swapAt : undefined,
  };
};

// "29/9": the face turns into a month dial, the needle on the month.
const dateView = (big: string, lf: number, fps: number): View | null => {
  const m = big.match(DATE);
  const month = m ? Number(m[2]) : NaN;
  if (!(month >= 1 && month <= 12)) return null;
  const s: Scale = { lo: 1, hi: 12, step: 1, n: 11 };
  const angle = REST + (angleOf(month, s) - REST) * sweep(lf, fps, 4);
  return {
    n: 11,
    labels: scaleLabels(s),
    angle,
    lit: { a: -SWEEP, b: Math.max(-SWEEP, angle), color: SKY },
    readout: { text: big, widest: big, color: lf > 12 ? GOLD : "#ffffff" },
  };
};

export const figureView = (f: Figure, lf: number, fps: number): View => {
  // A year is shown as said (golden rule 1): no needle on a scale. A date
  // keeps its month dial (dateView), unchanged.
  if (asSaid(f.big) && !dateView(f.big, lf, fps))
    return {
      ...idleWith(f.big, lf),
      plain: true,
      label: f.source === "stat" ? f.label : undefined,
    };
  const p = parseValue(f.big);
  const base =
    (p && p.value > 0 ? valueView(p, f.big, lf, fps) : null) ??
    dateView(f.big, lf, fps) ??
    idleWith(f.big, lf);
  // An auto figure's words are already in the captions; a stat's label is copy.
  return { ...base, label: f.source === "stat" ? f.label : undefined };
};

const viewOf = (s: Scene, lf: number, fps: number): View => {
  switch (s.kind) {
    case "hook":
      return hookView(s.hook, lf, fps);
    case "change":
      return changeView(s.cue, Math.max(14, s.swap - s.from), lf, fps);
    case "figure":
      return figureView(s.figure, lf, fps);
    case "lender":
      return {
        n: IDLE_TICKS,
        angle: REST,
        logo: s.lender,
        label: LENDER_LABEL,
      };
  }
};

// ------------------------------------------------------------- the dial

const ramp = (spans: Span[], t: number, r = 10) =>
  spans.reduce(
    (w, [a, b]) =>
      Math.max(
        w,
        interpolate(
          t,
          [a - r, a, Math.max(b, a + 1), Math.max(b, a + 1) + r],
          [0, 1, 1, 0],
          clamp,
        ),
      ),
    0,
  );

export const DialLayer: React.FC<{ plan: Plan }> = ({ plan }) => {
  const t = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = plan.scenes.find((s) => s.from <= t && t < s.to);
  const dur = scene ? scene.to - scene.from : 1;
  const lf = scene ? t - scene.from : 0;
  const w = scene
    ? Math.min(
        interpolate(lf, [0, FADE], [0, 1], clamp),
        interpolate(lf, [dur - FADE, dur], [1, 0], clamp),
      )
    : 0;
  const v = scene ? viewOf(scene, lf, fps) : null;
  const idle = REST + 4 + 3 * Math.sin(t / 17);
  const out = interpolate(lf, [dur - FADE, dur], [1, 0], clamp);
  const angle = v ? REST + (v.angle - REST) * out : idle;
  const dim = ramp(plan.dim, t);
  const lamp = w * (0.5 + 0.5 * Math.cos((lf * Math.PI) / 7));
  const flash = v?.flash;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.85 * dim }}>
      <svg
        width={1080}
        height={1920}
        style={{
          position: "absolute",
          inset: 0,
          opacity: v?.plain ? 1 - 0.85 * w : 1,
        }}
      >
        <DialBody t={t} lamp={lamp} />
        <Ticks n={IDLE_TICKS} opacity={1 - w} />
        {v ? <Ticks n={v.n} labels={v.labels} opacity={w} /> : null}
        {v?.lit ? (
          <g opacity={w}>
            <LitArc {...v.lit} />
          </g>
        ) : null}
        {flash !== undefined && flash < 16 ? (
          <circle
            cx={C.x}
            cy={C.y}
            r={40 + flash * 14}
            fill="none"
            stroke={GOLD}
            strokeWidth={6}
            opacity={1 - flash / 16}
          />
        ) : null}
        {v?.ghost !== undefined ? <Needle angle={v.ghost} ghost /> : null}
        <Needle angle={angle} />
        <Hub />
      </svg>
      {v?.readout ? <Readout r={v.readout} o={w} /> : null}
      {v?.logo ? (
        <div
          style={{
            position: "absolute",
            left: C.x,
            top: READOUT.top + READOUT.height / 2,
            transform: `translate(-50%, -50%) scale(${interpolate(w, [0, 1], [0.6, 1])})`,
            opacity: w,
          }}
        >
          <LenderLogo lender={v.logo} height={58} />
        </div>
      ) : null}
      {v?.label ? (
        <div
          style={{
            position: "absolute",
            left: 170,
            width: 740,
            top: LABEL_TOP,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: v.logo ? 28 : 38,
            letterSpacing: v.logo ? 5 : 0,
            fontWeight: 800,
            lineHeight: 1.22,
            color: v.logo ? SKY : "#ffffff",
            textWrap: "balance",
            opacity: interpolate(lf, [6, 16], [0, 1], clamp) * w,
          }}
        >
          {v.label}
        </div>
      ) : null}
    </div>
  );
};

export const usePlan = (reel: Reel): Plan => {
  const { fps } = useVideoConfig();
  return useMemo(() => planOf(reel, fps), [reel, fps]);
};
