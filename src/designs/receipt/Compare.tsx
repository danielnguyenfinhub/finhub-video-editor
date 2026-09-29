// `compare` as two receipts side by side: BEFORE (the first card) prints
// first, AFTER beside it, each row as it is said, the last row of each as
// the bold total; the question prints as the AFTER receipt's footer; then a
// gold difference stamp thumps onto the AFTER receipt, only when both totals
// parse as numbers in the same unit (differenceOf; never invented).
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE } from "../../mortgage/golden";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  GOLD,
  PrintedReceipt,
  SLOT_Y,
  W,
  fit,
  fitTitle,
  formatValue,
  inOrder,
  parseValue,
  type Line,
} from "./Paper";
import {
  HEAD_H,
  HeadLine,
  Rule,
  Snd,
  Stamp,
  TextLine,
  ValueRow,
  fitRow,
  type Sfx,
} from "./Rows";

export const DIFF_KICKER = "CHÊNH LỆCH";

const GAP = 54;
const RW = (W - GAP) / 2;
const PAD = 22;
const INNER = RW - 2 * PAD;

// after − before on the last pair of rows with the same label, formatted as
// the values are ("3.388" → "3.675" gives "+287"); null when either is not a
// clean number or the units differ.
export const differenceOf = (cue: CueOf<"compare">): string | null => {
  const [a, b] = cue.cards;
  for (let j = Math.min(a.rows.length, b.rows.length) - 1; j >= 0; j--) {
    if (a.rows[j].label !== b.rows[j].label) continue;
    const x = parseValue(a.rows[j].value);
    const y = parseValue(b.rows[j].value);
    if (!x || !y) return null;
    if (x.before.trim() !== y.before.trim()) return null;
    if (x.after.trim() !== y.after.trim()) return null;
    const d = y.value - x.value;
    const decimals = Math.max(x.decimals, y.decimals);
    if (Math.abs(d) < 10 ** -decimals / 2) return null;
    const grouped = (x.grouped || y.grouped) && Math.abs(d) >= 1000;
    return `${d > 0 ? "+" : "−"}${formatValue(Math.abs(d), decimals, grouped)}${y.after.trim()}`;
  }
  return null;
};

type Card = { lines: Line[]; totalAt: number; tearAt: number; sfx: Sfx[] };

const cardBuild = (cue: CueOf<"compare">, i: 0 | 1, rel: Rel): Card => {
  const card = cue.cards[i];
  const at0 = Math.max(0, rel(card.atMs));
  const title = fitTitle(card.title, INNER, 50);
  const lines: Line[] = [
    { key: "head", at: at0, h: HEAD_H, node: <HeadLine /> },
    {
      key: "title",
      at: at0,
      h: title.lines * title.size * 1.22 + 16,
      node: <TextLine text={card.title} size={title.size} />,
    },
  ];
  const hlAt =
    card.highlightAtMs === undefined
      ? undefined
      : Math.max(0, rel(card.highlightAtMs));
  card.rows.forEach((r, j) => {
    const total = j === card.rows.length - 1;
    const f = fitRow(r.label, r.value, INNER, total ? 124 : 76, total, true);
    lines.push({
      key: `row${j}`,
      at: Math.max(0, rel(r.atMs)),
      h: f.h,
      node: (
        <ValueRow
          label={r.label}
          value={r.value}
          f={f}
          total={total}
          tone={r.tone}
          highlightAt={total ? hlAt : undefined}
        />
      ),
    });
  });
  const q = cue.question;
  if (i === 1 && q) {
    const t = fit(q.text, INNER, 2, 36, 800);
    lines.push({
      key: "q",
      at: Math.max(0, rel(q.atMs)),
      h: t.lines * t.size * 1.22 + 34,
      node: (
        <div style={{ height: "100%", paddingTop: 12 }}>
          <Rule />
          <div style={{ height: "calc(100% - 12px)" }}>
            <TextLine text={q.text} size={t.size} weight={800} />
          </div>
        </div>
      ),
    });
  }
  const ordered = inOrder(lines);
  const rows = ordered.filter((l) => l.key.startsWith("row"));
  const last = ordered[ordered.length - 1].at;
  return {
    lines: ordered,
    totalAt: rows.length ? rows[rows.length - 1].at : last,
    tearAt: last + 16,
    sfx: ordered
      .filter((l) => l.key !== "title")
      .map((l) => ({ at: l.at, file: "mouse-click", volume: 0.35 })),
  };
};

const Arrow: React.FC<{ at: number; y: number }> = ({ at, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 12 } });
  return (
    <svg
      width={GAP}
      height={60}
      style={{
        position: "absolute",
        left: SAFE.left + RW,
        top: y - 30,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-14, 0])}px)`,
      }}
    >
      <path
        d="M 8 30 L 40 30 M 28 16 L 42 30 L 28 44"
        fill="none"
        stroke={GOLD}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const CompareReceipts: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
}> = ({ cue, rel }) => {
  const a = cardBuild(cue, 0, rel);
  const b = cardBuild(cue, 1, rel);
  const diff = differenceOf(cue);
  const q = cue.question;
  const stampAt = Math.max(
    b.totalAt + 10,
    q ? Math.max(0, rel(q.atMs)) + 6 : b.totalAt + 14,
  );
  const vsAt = Math.max(0, rel(cue.vsAtMs ?? cue.cards[1].atMs));
  const sfx = [
    ...a.sfx,
    ...b.sfx,
    ...(diff ? [{ at: stampAt, file: "shutter-modern", volume: 0.4 }] : []),
  ];
  return (
    <>
      <PrintedReceipt
        x={SAFE.left}
        width={RW}
        lines={a.lines}
        tearAt={a.tearAt}
        seed="before"
        pad={PAD}
      />
      <PrintedReceipt
        x={SAFE.left + RW + GAP}
        width={RW}
        lines={b.lines}
        tearAt={b.tearAt}
        seed="after"
        pad={PAD}
        over={
          diff ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: -100,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Stamp at={stampAt} kicker={DIFF_KICKER} text={diff} />
            </div>
          ) : null
        }
      />
      <Arrow at={vsAt} y={SLOT_Y - 190} />
      {sfx.map((s) => (
        <Snd key={`${s.file}${s.at}`} s={s} />
      ))}
    </>
  );
};
