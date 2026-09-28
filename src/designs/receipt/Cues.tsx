// Cue kinds the receipt draws itself, rising out of the printer slot on the
// stage: `compare` (Compare.tsx), `change` as one receipt whose old total is
// struck through by a pen and the new total printed below, `points` as an
// itemised receipt with a tick per item. Every other kind goes to the
// classic MotionTrack (index.tsx). An own cue that starts under the hook
// waits for the hook to end; beats said before then print at once, in order.
import type React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { HOOK_FRAMES } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import type { CueOf, Rel } from "../classic/Infographics";
import { CompareReceipts } from "./Compare";
import {
  FADED,
  GOLD,
  INK,
  PrintedReceipt,
  STAGE,
  fit,
  fitTitle,
  inOrder,
  useFontReady,
  type Line,
} from "./Paper";
import {
  Chevron,
  HEAD_H,
  HeadLine,
  Leader,
  Snd,
  Strike,
  TextLine,
  Tick,
  ValueRow,
  fitRow,
  type Sfx,
} from "./Rows";

export const BEFORE_WORD = "TRƯỚC";
export const AFTER_WORD = "SAU";

type OwnCue = Extract<Cue, { kind: "compare" | "change" | "points" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "compare" || c.kind === "change" || c.kind === "points";

type Built = { lines: Line[]; sfx: Sfx[]; tearAt: number };

const STAGE_H = STAGE.bottom - STAGE.top - 40;

// Talk-frame span of every own cue, after the hook wait.
export const ownSpans = (reel: Reel, fps: number) => {
  const at = outFrameOf(reel.timeline, fps);
  const hookEnd = reel.edit.hook ? HOOK_FRAMES : 0;
  return (reel.edit.cues ?? []).filter(isOwnCue).map((c) => {
    const a = at(c.fromMs);
    const b = Math.max(a + 1, at(c.toMs));
    return { cue: c, from: a < hookEnd ? Math.min(hookEnd, b - 1) : a, to: b };
  });
};

// ------------------------------------------------------------- change

const CW = 700;
const CINNER = CW - 2 * 30;
const CHEVRON_W = 70;

// Pen colour from the data only: tone first, else direction, else gold.
const penOf = (cue: CueOf<"change">): string =>
  cue.tone === "bad"
    ? brand.bad
    : cue.tone === "good"
      ? brand.good
      : cue.direction === "up"
        ? brand.bad
        : cue.direction === "down"
          ? brand.accent
          : GOLD;

const changeBuild = (cue: CueOf<"change">, rel: Rel): Built => {
  const swap = Math.max(0, rel(cue.swapAtMs));
  const pen = penOf(cue);
  const lines: Line[] = [{ key: "head", at: 0, h: HEAD_H, node: <HeadLine /> }];
  if (cue.kicker) {
    const k = fit(cue.kicker, CINNER, 1, 26, 900);
    lines.push({
      key: "kicker",
      at: 0,
      h: k.size * 1.3 + 8,
      node: (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: k.size,
            fontWeight: 900,
            letterSpacing: "0.3em",
            color: FADED,
          }}
        >
          {cue.kicker}
        </div>
      ),
    });
  }
  const t = fitTitle(cue.label, CINNER, 48);
  lines.push({
    key: "label",
    at: 0,
    h: t.lines * t.size * 1.22 + 16,
    node: <TextLine text={cue.label} size={t.size} />,
  });
  const old = fitRow(BEFORE_WORD, cue.from, CINNER - CHEVRON_W, 100, false);
  lines.push({
    key: "from",
    at: 0,
    h: old.h,
    node: (
      <div style={{ height: "100%", paddingRight: CHEVRON_W }}>
        <ValueRow label={BEFORE_WORD} value={cue.from} f={old} total={false}>
          <Strike at={swap} color={pen} />
        </ValueRow>
      </div>
    ),
  });
  const neu = fitRow(AFTER_WORD, cue.to, CINNER - CHEVRON_W, 116, true);
  lines.push({
    key: "to",
    at: swap + 10,
    h: neu.h,
    node: (
      <div style={{ height: "100%", display: "flex" }}>
        <div style={{ flex: 1 }}>
          <ValueRow label={AFTER_WORD} value={cue.to} f={neu} total />
        </div>
        <div
          style={{
            width: CHEVRON_W,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            paddingBottom: 26,
          }}
        >
          {cue.direction ? (
            <Chevron
              up={cue.direction === "up"}
              color={pen}
              size={Math.min(CHEVRON_W - 10, Math.round(neu.valueSize * 0.55))}
            />
          ) : null}
        </div>
      </div>
    ),
  });
  const ordered = inOrder(lines);
  const to = ordered[ordered.length - 1];
  return {
    lines: ordered,
    tearAt: to.at + 18,
    sfx: [
      { at: ordered[ordered.length - 2].at, file: "mouse-click", volume: 0.35 },
      { at: swap, file: "whip", volume: 0.4 },
      { at: to.at, file: "mouse-click", volume: 0.45 },
    ],
  };
};

// ------------------------------------------------------------- points

const PW = 800;
const PINNER = PW - 2 * 30;
const NUM_W = 56;
const TICK = 50;
// Number, three 14 px gaps, a leader of at least 40 px, the tick.
const TEXT_W = PINNER - NUM_W - TICK - 3 * 14 - 44;

const pointsBuild = (cue: CueOf<"points">, rel: Rel): Built => {
  const title = fitTitle(cue.title, PINNER, 54);
  // Shrink the items until the whole receipt fits the stage.
  let max = 50;
  const sized = () => cue.items.map((it) => fit(it.text, TEXT_W, 2, max, 800));
  let items = sized();
  const rowH = (i: number) => items[i].lines * items[i].size * 1.22 + 30;
  const height = () =>
    HEAD_H +
    title.lines * title.size * 1.22 +
    16 +
    items.reduce((s, _, i) => s + rowH(i), 0);
  while (height() > STAGE_H && max > 24) {
    max -= 3;
    items = sized();
  }
  const n = cue.items.length;
  const lines = inOrder([
    { key: "head", at: 0, h: HEAD_H, node: <HeadLine /> },
    {
      key: "title",
      at: 0,
      h: title.lines * title.size * 1.22 + 16,
      node: <TextLine text={cue.title} size={title.size} />,
    },
    ...cue.items.map((it, i) => ({
      key: `item${i}`,
      at: Math.max(0, rel(it.atMs)),
      h: rowH(i),
      node: null as React.ReactNode,
    })),
  ]).map((l) => {
    if (!l.key.startsWith("item")) return l;
    const i = Number(l.key.slice(4));
    return {
      ...l,
      node: (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: 14,
            borderBottom:
              i < n - 1 ? "2px dashed rgba(91,107,128,0.35)" : undefined,
          }}
        >
          <span
            style={{
              flex: `0 0 ${NUM_W}px`,
              fontSize: 30,
              fontWeight: 900,
              color: FADED,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span
            style={{
              maxWidth: TEXT_W,
              flexShrink: 0,
              fontSize: items[i].size,
              fontWeight: 800,
              lineHeight: 1.22,
              color: INK,
            }}
          >
            {cue.items[i].text}
          </span>
          <Leader />
          <Tick at={l.at + 6} size={TICK} />
        </div>
      ),
    };
  });
  const last = lines[lines.length - 1].at;
  return {
    lines,
    tearAt: last + 24,
    sfx: lines
      .filter((l) => l.key.startsWith("item"))
      .map((l) => ({ at: l.at, file: "mouse-click", volume: 0.4 })),
  };
};

// ------------------------------------------------------------- track

const OneReceipt: React.FC<{ b: Built; width: number; seed: string }> = ({
  b,
  width,
  seed,
}) => (
  <>
    <PrintedReceipt
      x={540 - width / 2}
      width={width}
      lines={b.lines}
      tearAt={b.tearAt}
      seed={seed}
      pad={30}
    />
    {b.sfx.map((s) => (
      <Snd key={`${s.file}${s.at}`} s={s} />
    ))}
  </>
);

export const ReceiptCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  // fit() measures with Be Vietnam Pro: draw once it has loaded.
  const ready = useFontReady("receipt cues: Be Vietnam Pro");
  if (!ready) return null;
  return (
    <>
      {ownSpans(reel, fps).map(({ cue, from, to }) => {
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${cue.kind}${cue.fromMs}`}
            from={from}
            durationInFrames={Math.max(1, to - from)}
            layout="none"
          >
            {cue.kind === "compare" ? (
              <CompareReceipts cue={cue} rel={rel} />
            ) : cue.kind === "change" ? (
              <OneReceipt b={changeBuild(cue, rel)} width={CW} seed="change" />
            ) : (
              <OneReceipt b={pointsBuild(cue, rel)} width={PW} seed="points" />
            )}
          </Sequence>
        );
      })}
    </>
  );
};
