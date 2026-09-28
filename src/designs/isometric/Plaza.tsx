// "isometric" plaza: who gets the island's centre when. The hook and every
// cue own it; figures and banks take it in order when it is free, else they
// ride as chips top-left. A named bank's logo goes up on a white sign-board
// on two posts (or a small sign in the chip lane). `homeAt` tells the island
// when the plaza is free, so its gold-roofed home can stand there.
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import {
  CHIP_TOP,
  FigureBuild,
  FigureChip,
  HookCity,
  LABEL_W,
  SLAB,
  STAGE_TOP,
  fadeOut,
} from "./Stage";
import { IsoSvg, PAL, PALE, SKY, box, camAt, slabEdge } from "./World";

// ------------------------------------------------------------- lenders

const LenderBoard: React.FC<{
  lender: Lender;
  frames: number;
  from: number;
}> = ({ lender, frames, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame, fps, config: { damping: 13, stiffness: 120 } });
  const out = fadeOut(frame, frames);
  const c = camAt(from + frame);
  const post = [
    ...box(c, -1.1, -0.1, 0, 0.2, 0.2, 2.2 * k, PAL.navy),
    ...box(c, 0.9, -0.1, 0, 0.2, 0.2, 2.2 * k, PAL.navy),
  ];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: Math.min(k * 2, out),
      }}
    >
      <IsoSvg shapes={[{ depth: 0, marks: post }]} />
      <div
        style={{
          position: "absolute",
          top: STAGE_TOP + 20,
          left: SAFE.left,
          width: LABEL_W,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${interpolate(k, [0, 1], [220, 0])}px)`,
        }}
      >
        <div
          style={{ ...SLAB, padding: "16px 30px 22px", textAlign: "center" }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 5,
              color: brand.slate,
              marginBottom: 10,
            }}
          >
            ĐANG NHẮC TỚI
          </div>
          <LenderLogo
            lender={lender}
            height={92}
            style={{ border: `2px solid ${PALE}` }}
          />
        </div>
      </div>
    </div>
  );
};

// A bank named while the plaza is taken: a small sign in the chip lane.
const LenderChip: React.FC<{ lender: Lender; frames: number }> = ({
  lender,
  frames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(enter(frame, fps), fadeOut(frame, frames));
  return (
    <div
      style={{
        ...SLAB,
        boxShadow: slabEdge(8, SKY),
        position: "absolute",
        top: CHIP_TOP,
        left: 400,
        maxWidth: 300,
        padding: "6px 12px",
        fontFamily: FONT,
        textAlign: "center",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [-30, 0])}px)`,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 3,
          color: brand.slate,
        }}
      >
        ĐANG NHẮC TỚI
      </div>
      <LenderLogo lender={lender} height={34} />
    </div>
  );
};

// ------------------------------------------------------------- the plan

type Span = [number, number];
const OVERLAP_OK = 12;
type Item =
  | { kind: "figure"; from: number; to: number; figure: Figure; chip: boolean }
  | { kind: "lender"; from: number; to: number; lender: Lender; chip: boolean };

// One thing on the plaza at a time: the hook and every cue own it; figures
// and banks take it in order when it is free for their whole span, else
// they go to the chip lane.
export const planOf = (reel: Reel, fps: number): Item[] => {
  const at = outFrameOf(reel.timeline, fps);
  const busy: Span[] = [
    ...(reel.edit.hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...(reel.edit.cues ?? [])
      .filter((c) => c.kind !== "emoji")
      .map((c): Span => [at(c.fromMs), at(c.toMs)]),
  ];
  const toF = (ms: number) => Math.round((ms / 1000) * fps);
  const items: Omit<Item, "chip">[] = [
    ...figuresOf(reel, fps).map((figure) => ({
      kind: "figure" as const,
      from: figure.fromFrame,
      to: figure.fromFrame + figure.frames,
      figure,
    })),
    ...lenderMentionsOf(reel).map((m) => ({
      kind: "lender" as const,
      from: toF(m.startMs),
      to: Math.max(toF(m.startMs) + 1, toF(m.endMs)),
      lender: m.lender,
    })),
  ].sort((a, b) => a.from - b.from);
  return items.map((it) => {
    // A few frames of overlap are the outgoing card's fade: not a clash.
    const chip = busy.some(
      ([a, b]) => Math.min(b, it.to) - Math.max(a, it.from) > OVERLAP_OK,
    );
    if (!chip) busy.push([it.from, it.to]);
    return { ...it, chip } as Item;
  });
};

// Talk frames the plaza is taken (hook, cues, plaza figures and banks).
export const plazaSpans = (reel: Reel, fps: number): Span[] => {
  const at = outFrameOf(reel.timeline, fps);
  return [
    ...(reel.edit.hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...(reel.edit.cues ?? [])
      .filter((c) => c.kind !== "emoji")
      .map((c): Span => [at(c.fromMs), at(c.toMs)]),
    ...planOf(reel, fps)
      .filter((it) => !it.chip)
      .map((it): Span => [it.from, it.to]),
  ];
};

// 1 while the plaza is free (the home stands there), 0 while it is taken:
// it sinks just before a span and rises again after it.
export const homeAt = (spans: Span[], t: number): number =>
  1 -
  spans.reduce(
    (w, [a, b]) =>
      Math.max(
        w,
        interpolate(
          t,
          [a - 10, a, Math.max(a + 1, b), Math.max(a + 1, b) + 14],
          [0, 1, 1, 0],
          clamp,
        ),
      ),
    0,
  );

export const StageLayer: React.FC<{ reel: Reel; ready: boolean }> = ({
  reel,
  ready,
}) => {
  const { fps } = useVideoConfig();
  if (!ready) return null;
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookCity hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {planOf(reel, fps).map((it) => (
        <Sequence
          key={`${it.kind}${it.from}`}
          from={it.from}
          durationInFrames={it.to - it.from}
          layout="none"
        >
          {it.kind === "figure" ? (
            it.chip ? (
              <FigureChip figure={it.figure} />
            ) : (
              <FigureBuild figure={it.figure} from={it.from} />
            )
          ) : it.chip ? (
            <LenderChip lender={it.lender} frames={it.to - it.from} />
          ) : (
            <LenderBoard
              lender={it.lender}
              frames={it.to - it.from}
              from={it.from}
            />
          )}
        </Sequence>
      ))}
    </>
  );
};
