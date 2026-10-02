// Who holds the stage when, and what it shows: the hook as a receipt whose
// TOTAL line is the hook number; figures and banks (Figures.tsx). A figure
// or bank that starts while the stage is taken waits up to WAIT frames, or
// becomes a small chip in the top band (figuresOf starts every figure after
// the hook). The chapter tag shares the top band and yields to chips.
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
  hookText,
} from "../../mortgage/golden";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import { isOwnCue, ownSpans } from "./Cues";
import {
  CHIP_W,
  COUNT,
  FigureChip,
  LenderChip,
  LenderSlip,
  StageStub,
} from "./Figures";
import {
  GOLD,
  INK,
  PAPER,
  PrintedReceipt,
  TABULAR,
  TOP_BAND,
  fit,
  inOrder,
  type Line,
} from "./Paper";
import { HEAD_H, HeadLine, TextLine, ValueRow, fitRow } from "./Rows";
import { keepUnits } from "../../elements/keepUnits";

export const TOTAL_WORD = "TỔNG";
export const CHAPTER_WORD = "PHẦN";
// A rate is not a sum (viewed critique 08): "TỔNG" only on an amount.
export const totalWordOf = (hook: NonNullable<EditJson["hook"]>): string =>
  /%/.test(hook.big + (hook.suffix ?? "")) ? "" : TOTAL_WORD;
// The hook total at count progress t: the core formatter, never from 0.
export const hookValue = (
  hook: NonNullable<EditJson["hook"]>,
  t: number,
): string => hookText(hook, t);

const MIN_HOLD = 45; // READING.minNumberHoldMs at 30 fps
const WAIT = 15;

// ------------------------------------------------------------- plan

type Span = [number, number];
type Item =
  | { kind: "figure"; figure: Figure; from: number; frames: number }
  | { kind: "lender"; lender: Lender; from: number; frames: number };
export type Placed = Item & { where: "stage" | "chip" };
export type Plan = { placed: Placed[]; busy: Span[]; chips: Span[] };

export const planOf = (reel: Reel, fps: number): Plan => {
  const at = outFrameOf(reel.timeline, fps);
  const hook = Boolean(reel.edit.hook);
  const busy: Span[] = [
    ...(hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...ownSpans(reel, fps).map((s) => [s.from, s.to] as Span),
    ...(reel.edit.cues ?? [])
      .filter((c) => !isOwnCue(c))
      .map((c) => [at(c.fromMs), at(c.toMs)] as Span),
  ];
  const items: Item[] = [
    ...figuresOf(reel, fps).map((f) => ({
      kind: "figure" as const,
      figure: f,
      from: f.fromFrame,
      frames: f.frames,
    })),
    ...lenderMentionsOf(reel).map((m) => {
      const from = Math.round((m.startMs / 1000) * fps);
      const to = Math.round((m.endMs / 1000) * fps);
      return {
        kind: "lender" as const,
        lender: m.lender,
        from,
        frames: Math.max(MIN_HOLD, to - from),
      };
    }),
  ].sort((a, b) => a.from - b.from);
  const freeAt = (t: number): number => {
    let x = t;
    for (let moved = true; moved; ) {
      moved = false;
      for (const [a, b] of busy)
        if (x >= a && x < b) {
          x = b;
          moved = true;
        }
    }
    return x;
  };
  const placed: Placed[] = [];
  for (const it of items) {
    const end = it.from + it.frames;
    const free = freeAt(it.from);
    if (free - it.from <= WAIT) {
      const frames = Math.max(MIN_HOLD, end - free);
      placed.push({ ...it, from: free, frames, where: "stage" });
      busy.push([free, free + frames]);
    } else placed.push({ ...it, where: "chip" });
  }
  // One chip at a time: a later chip cuts the earlier one short.
  const chips = placed.filter((p) => p.where === "chip");
  chips.forEach((p, i) => {
    const next = chips[i + 1];
    if (next && next.from < p.from + p.frames)
      p.frames = Math.max(1, next.from - p.from);
  });
  return {
    placed,
    busy,
    chips: chips.map((p) => [p.from, p.from + p.frames] as Span),
  };
};

// ------------------------------------------------------------- hook

const HW = 740;

const HookReceipt: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const frame = useCurrentFrame();
  const width = HW;
  const inner = width - 60;
  const lines: Line[] = [{ key: "head", at: 0, h: HEAD_H, node: <HeadLine /> }];
  if (hook.sub) {
    const sub = keepUnits(hook.sub); // never "sau 3 / lần tăng"
    const s = fit(sub, inner, 2, 56, 900);
    lines.push({
      key: "sub",
      at: 0,
      h: s.lines * s.size * 1.22 + 24,
      node: <TextLine text={sub} size={s.size} />,
    });
  }
  const ordered = inOrder(lines, 6);
  const totalAt = ordered[ordered.length - 1].at + 8;
  const word = totalWordOf(hook);
  const f = fitRow(word, hook.big, inner, 170, true, true);
  const t = hook.countTo === undefined ? 1 : (frame - totalAt) / COUNT;
  const all: Line[] = [
    ...ordered,
    {
      key: "total",
      at: totalAt,
      h: f.h,
      node: (
        <ValueRow
          label={word}
          value={hookValue(hook, t)}
          f={f}
          total
          highlightAt={totalAt + COUNT + 4}
        />
      ),
    },
  ];
  return (
    <PrintedReceipt
      x={540 - width / 2}
      width={width}
      lines={all}
      tearAt={totalAt + COUNT + 10}
      seed="hook"
      pad={30}
    />
  );
};

// ------------------------------------------------------------- layer

export const StageLayer: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => {
  const hook = reel.edit.hook;
  return (
    <>
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookReceipt hook={hook} />
        </Sequence>
      ) : null}
      {plan.placed.map((p) => (
        <Sequence
          key={`${p.kind}${p.from}`}
          from={p.from}
          durationInFrames={Math.max(1, p.frames)}
          layout="none"
        >
          {p.kind === "figure" ? (
            p.where === "stage" ? (
              <StageStub figure={p.figure} />
            ) : (
              <FigureChip figure={p.figure} />
            )
          ) : p.where === "stage" ? (
            <LenderSlip lender={p.lender} />
          ) : (
            <LenderChip lender={p.lender} />
          )}
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- chapters

const ChapterTag: React.FC<{
  index: number;
  title: string;
  chips: Span[];
  from: number;
}> = ({ index, title, chips, from }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (chips.some(([a, b]) => from + frame >= a && from + frame < b))
    return null;
  const p = spring({ frame, fps, config: { damping: 14 } });
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  const t = fit(title, CHIP_W - 200, 1, 34, 900);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: TOP_BAND.top + 28,
        height: 84,
        display: "flex",
        alignItems: "center",
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `translateX(${interpolate(p, [0, 1], [-50, 0])}px)`,
        filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.5))",
      }}
    >
      <div
        style={{
          height: "100%",
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          background: GOLD,
          color: INK,
          fontWeight: 900,
          fontSize: 26,
          letterSpacing: "0.18em",
          borderRadius: "10px 0 0 10px",
          ...TABULAR,
        }}
      >
        {CHAPTER_WORD} {String(index).padStart(2, "0")}
      </div>
      <div
        style={{
          height: "100%",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          background: PAPER,
          color: INK,
          fontWeight: 900,
          fontSize: t.size,
          borderLeft: `4px dashed rgba(91,107,128,0.5)`,
          borderRadius: "0 10px 10px 0",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
    </div>
  );
};

export const Chapters: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => {
        const from = at(c.atMs);
        return (
          <Sequence
            key={c.atMs}
            from={from}
            durationInFrames={Math.round(2.6 * fps)}
            layout="none"
          >
            <ChapterTag
              index={i + 1}
              title={c.title}
              chips={plan.chips}
              from={from}
            />
          </Sequence>
        );
      })}
    </>
  );
};
