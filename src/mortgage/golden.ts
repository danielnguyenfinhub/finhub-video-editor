// Golden rules every design gets for free (Daniel, 25/09/2026):
//   1. a spoken number always gets a visual (figuresOf: edit.json stats plus an
//      automatic figure for every number the captions carry that no stat or
//      cue covers);
//   2. a bank Daniel names shows its logo (lenderMentionsOf);
//   3. everything sits inside the 4:5 band, so one render works as a Reel
//      and in the Facebook feed (SAFE);
//   5. every card and number is held long enough to read (READING, WP5). A
//      text or number hold beats the 1.5–3 s change cadence: the change is
//      carried by motion inside the scene (a count-up, a highlight, a push-in),
//      never by cutting the card early.
// Designs decide how these look, never whether they appear.
import { findLenderMentions, type LenderMention } from "./lenders";
import { onScreenCopy, type Cue, type EditJson, type Reel } from "./schema";
import { toOutMs, toSrcMs } from "./timeline";

// Reading-time floor (WP5, 26/09/2026). UNTUNED starting values, one place:
// - charsPerSec 15: adult subtitle guidance sits at 15–17 characters/s; the
//   low end, because stacked Vietnamese diacritics read slower. Measured on
//   NFC text (a precomposed "ộ" is one character) with spaces collapsed.
// - minNumberHoldMs 1500: a figure needs one look to land, whatever its
//   length; it matches the 1.5 s low edge of the change cadence.
// - captionCharsPerSec 22, REPORT ONLY: caption pages follow Daniel's speech
//   (about 20 chars/s) and cannot be held longer without desync; heard and
//   read together, a page is only flagged when faster than this.
// Tune once Daniel has watched a few videos with it.
export const READING = {
  charsPerSec: 15,
  captionCharsPerSec: 22,
  minNumberHoldMs: 1500,
} as const;

// Caption pages pass numberFloor false and READING.captionCharsPerSec: their
// numbers get a card of their own.
export const readingMs = (
  texts: string[],
  numberFloor = true,
  charsPerSec: number = READING.charsPerSec,
): number => {
  const chars = [
    ...texts.join(" ").normalize("NFC").replace(/\s+/g, " ").trim(),
  ].length;
  const ms = (chars / charsPerSec) * 1000;
  return numberFloor && /\d/.test(texts.join(""))
    ? Math.max(ms, READING.minNumberHoldMs)
    : ms;
};

export type Hold = {
  what: string; // "stats[0]", "cues[2] compare"
  text: string;
  atFrame: number; // talk timeline
  shownMs: number; // as edit.json has it
  needMs: number;
  heldMs: number; // after the floor
};

// Stretches each stat card and cue to its reading time, on the talk timeline,
// without touching speech: a hold only grows into the free time before the
// next card of the same kind (they share a place on screen) and the talk end.
// A hold still under its need is short; check-golden reports it.
export const readingFloor = (
  reel: Reel,
  fps: number,
): { edit: EditJson; holds: Hold[] } => {
  const segs = reel.timeline.segments;
  const talkMs = (reel.timeline.talkFrames / fps) * 1000;
  const out = (ms: number) => toOutMs(segs, ms, fps);
  const frameOf = (ms: number) => Math.round((ms / 1000) * fps);
  const holds: Hold[] = [];
  // Output-ms spans in edit order; each may grow up to the next start.
  // ponytail: only same-kind neighbours bound a hold (stat vs stat, cue vs
  // cue); bound across kinds too if a design puts both in one place.
  const grow = (
    items: { what: string; text: string[]; a: number | null; b: number }[],
  ) => {
    const starts = items.flatMap((x) => (x.a === null ? [] : [x.a]));
    return items.map((x) => {
      if (x.a === null) return null;
      const a = x.a;
      const next = Math.min(talkMs, ...starts.filter((s) => s > a));
      const needMs = readingMs(x.text);
      const heldMs = Math.max(x.b - a, Math.min(needMs, next - a));
      holds.push({
        what: x.what,
        text: x.text.filter(Boolean).join(" · "),
        atFrame: frameOf(a),
        shownMs: x.b - a,
        needMs,
        heldMs,
      });
      return heldMs;
    });
  };
  const stats = reel.edit.stats ?? [];
  const statHeld = grow(
    stats.map((s, i) => {
      const a = out(s.atMs);
      return {
        what: `stats[${i}]`,
        text: [s.big, s.label],
        a,
        b: (a ?? 0) + s.durMs,
      };
    }),
  );
  const copy = onScreenCopy(reel.edit);
  const cues = reel.edit.cues ?? [];
  const cueHeld = grow(
    cues.map((c, i) => {
      const a = out(c.fromMs);
      return {
        what: `cues[${i}] ${c.kind}`,
        text: copy[`cues[${i}]`] ?? [],
        a,
        b: out(c.toMs) ?? talkMs,
      };
    }),
  );
  return {
    edit: {
      ...reel.edit,
      ...(reel.edit.stats && {
        stats: stats.map((s, i) => {
          const held = statHeld[i];
          return held !== null && held > s.durMs + 1
            ? { ...s, durMs: held }
            : s;
        }),
      }),
      ...(reel.edit.cues && {
        cues: cues.map((c, i) => {
          const a = out(c.fromMs);
          const held = cueHeld[i];
          if (
            a === null ||
            held === null ||
            held <= (out(c.toMs) ?? talkMs) - a + 1
          )
            return c;
          const toMs = toSrcMs(segs, a + held, fps); // back to source ms
          return toMs > c.toMs ? { ...c, toMs } : c;
        }),
      }),
    },
    holds,
  };
};

// 1080x1920 frame; Facebook crops the feed post to the middle 1080x1350
// (y 285-1635) and keeps its own header/CTA over the top 10% and bottom 12%
// of that crop; Reels cover the top 14%, bottom 20% and the right-hand
// buttons. SAFE is the strictest of both (Daniel's spec, 25/09/2026).
export const SAFE = {
  top: 420,
  bottom: 1473,
  left: 54,
  right: 960,
} as const;

// Where Daniel's face is in a full-frame talk (head centred, eyes near the
// upper third). Golden rule: no overlay element inside it; charts go BEHIND
// him (design.Behind) and captions below it.
export const FACE = { left: 250, right: 830, top: 480, bottom: 1250 } as const;

// The Finance Hub logo shows for the first and last 10 s of the talk only
// (and on the cover / outro), at this height on its white tile.
export const LOGO_SECONDS = 10;
export const LOGO_HEIGHT = 120;
// The hook owns the top of the frame for its first 3.5 s, so the opening logo
// window starts after it (3.5–10 s): the two never sit on each other.
export const HOOK_FRAMES = 105;
export const logoVisible = (
  frame: number,
  talkFrames: number,
  fps: number,
): boolean =>
  (frame >= HOOK_FRAMES && frame < LOGO_SECONDS * fps) ||
  frame >= talkFrames - LOGO_SECONDS * fps;

export type Figure = {
  fromFrame: number; // talk timeline
  frames: number;
  big: string; // the number as said, e.g. "4,1", "0,4%", "1.600"
  label: string; // stat label, or the short phrase after an automatic figure ("" if none)
  source: "stat" | "auto";
};

const AUTO_MS = 2600;
const AUTO_GAP_MS = 4000;
// Money and percent units only: "1 năm", "1 phần lời" are counts, not figures.
const UNIT = /^(%|tỷ|ti|triệu|nghìn|ngàn|đô|k)(?!\p{L})/iu;
const NUMERIC = /^[.,]?\d/;
const clean = (s: string) => s.trim().replace(/[.,!?;:]+$/g, "");
// Words that start a new clause: an automatic figure's label stops before them.
// ponytail: a word list, not a parser; add a word when a label runs on.
const CLAUSE =
  /^(nhưng|mà|và|thì|là|còn|hoặc|hay|nên|vì|nếu|khi|rồi|để|but|and|so|if)$/iu;
const LABEL_WORDS = 4; // the unit plus up to 3 words

// A short label for an automatic figure: what follows the number up to the
// first clause break, e.g. "tỷ đô mỗi năm". "" when nothing follows, so the
// design shows the number alone rather than a transcript fragment.
const autoLabel = (after: string[]) => {
  const out: string[] = [];
  for (const w of after) {
    const word = clean(w);
    if (!word || CLAUSE.test(word) || /\d/.test(word)) break;
    out.push(word);
    if (out.length >= LABEL_WORDS || word !== w.trim()) break; // punctuation ends the clause
  }
  return out.join(" ");
};

// Every number in the captions, glued across Whisper's split tokens ("4" ".1"
// -> "4,1" (timeline.ts decimalComma), "100" ".000" "%" -> "100.000%").
const spokenNumbers = (reel: Reel) => {
  const caps = reel.timeline.captions;
  const out: { big: string; label: string; startMs: number }[] = [];
  for (let i = 0; i < caps.length; i++) {
    if (!/\d/.test(caps[i].text)) continue;
    let j = i;
    let big = caps[i].text.trim();
    while (
      j + 1 < caps.length &&
      !caps[j + 1].text.startsWith(" ") &&
      (NUMERIC.test(caps[j + 1].text) || caps[j + 1].text.startsWith("%"))
    ) {
      big += caps[++j].text.trim();
    }
    const next = caps[j + 1]?.text.trim() ?? "";
    // "6,2 phần trăm" is said, "6,2%" is shown.
    const percent =
      next.toLowerCase() === "phần" &&
      /^trăm(?!\p{L})/iu.test(caps[j + 2]?.text.trim() ?? "");
    // ponytail: a bare small count ("1 năm", "2 người") is not a figure
    // unless a money/percent unit follows; add units above when one slips through.
    const bare = /^\d{1,2}$/.test(clean(big)) && !UNIT.test(next) && !percent;
    if (!bare) {
      // "phần trăm" is already the "%" on the number.
      const after = caps
        .slice(j + 1 + (percent ? 2 : 0), j + 1 + (percent ? 2 : 0) + LABEL_WORDS)
        .map((c) => c.text)
        .join("")
        .trim()
        .split(/\s+/);
      out.push({
        big: clean(big) + (percent ? "%" : ""),
        label: autoLabel(after),
        startMs: caps[i].startMs,
      });
    }
    i = j;
  }
  return out;
};

// Talk-timeline spans (ms) that already carry a visual for their numbers.
const coveredSpans = (reel: Reel, fps: number) => {
  const segs = reel.timeline.segments;
  const out = (ms: number) => toOutMs(segs, ms, fps);
  const spans: [number, number][] = [];
  for (const s of reel.edit.stats ?? []) {
    const a = out(s.atMs);
    if (a !== null) spans.push([a, a + s.durMs]);
  }
  for (const c of reel.edit.cues ?? []) {
    const a = out(c.fromMs);
    const b = out(c.toMs);
    if (a !== null) spans.push([a, b ?? a + AUTO_MS]);
  }
  return spans;
};

export const figuresOf = (reel: Reel, fps: number): Figure[] => {
  const segs = reel.timeline.segments;
  const toFrame = (ms: number) => Math.round((ms / 1000) * fps);
  const stats: Figure[] = (reel.edit.stats ?? []).flatMap((s) => {
    const a = toOutMs(segs, s.atMs, fps);
    return a === null
      ? []
      : [
          {
            fromFrame: toFrame(a),
            frames: toFrame(s.durMs),
            big: s.big,
            label: s.label,
            source: "stat" as const,
          },
        ];
  });
  const spans = coveredSpans(reel, fps);
  const autos: Figure[] = [];
  let lastMs = -Infinity;
  for (const n of spokenNumbers(reel)) {
    // Words before the figure are said before it; give the card a head start.
    const at = n.startMs - 200;
    if (spans.some(([a, b]) => at >= a - 500 && at <= b)) continue;
    if (at - lastMs < AUTO_GAP_MS) continue;
    lastMs = at;
    autos.push({
      fromFrame: Math.max(0, toFrame(at)),
      // Held to its reading time, never into the next automatic figure.
      frames: toFrame(
        Math.max(AUTO_MS, Math.min(readingMs([n.big, n.label]), AUTO_GAP_MS)),
      ),
      big: n.big,
      label: n.label,
      source: "auto",
    });
  }
  return [...stats, ...autos].sort((a, b) => a.fromFrame - b.fromFrame);
};

export const lenderMentionsOf = (reel: Reel): LenderMention[] =>
  findLenderMentions(reel.timeline.captions);

// Golden rule 4 (WP3, 26/09/2026): a cutaway hides Daniel's face (pip and
// overlay keep him on screen). A single cutaway may not run longer than this,
// and must not cover a spoken number: its figure would be hidden with him.
// UNTUNED: a first guess at 4 s; tune it once Daniel has watched a few.
export const CUTAWAY_MAX_MS = 4000;

// A MotionTrack cue that draws a panel over the top of the frame (every kind
// but emoji, a small corner sticker). In a full-frame design the panel covers
// Daniel's face unless the design makes room (src/mortgage/cueRoom.ts).
export const isCuePanel = (c: Cue): boolean => c.kind !== "emoji";

export type FaceHidden = {
  totalMs: number; // face-hidden time on the talk timeline
  longestMs: number; // longest single face-hidden stretch
  cueMs: number; // of which: cue panels (0 when the design makes room)
  tooLong: { atMs: number; durMs: number }[]; // cutaways over CUTAWAY_MAX_MS
  overNumbers: { atMs: number; big: string }[]; // cutaways covering a number
};

// atMs as in edit.json (source ms) so a report points at the visual to fix.
// cueRoom: the design shrinks Daniel under cue panels (template.json
// "cueRoom"); otherwise every cue panel counts as face-hidden time. Panels
// are reported, never failed: tooLong / overNumbers are about cutaways only.
export const faceHiddenOf = (
  reel: Reel,
  fps: number,
  { cueRoom = false }: { cueRoom?: boolean } = {},
): FaceHidden => {
  const out = (ms: number) => toOutMs(reel.timeline.segments, ms, fps);
  const cut = (reel.edit.visuals ?? []).flatMap((v) => {
    const a = v.mode === "cutaway" ? out(v.atMs) : null;
    return a === null ? [] : [{ v, a, b: a + v.durMs }];
  });
  const cues = cueRoom
    ? []
    : (reel.edit.cues ?? []).filter(isCuePanel).flatMap((c) => {
        const a = out(c.fromMs);
        const b = out(c.toMs);
        return a === null || b === null ? [] : [{ a, b }];
      });
  // Overlapping cutaways and panels are one stretch of hidden face.
  const merged: [number, number][] = [];
  for (const { a, b } of [...cut, ...cues].sort((x, y) => x.a - y.a)) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const numbers = spokenNumbers(reel);
  return {
    totalMs: merged.reduce((t, [a, b]) => t + b - a, 0),
    longestMs: Math.max(0, ...merged.map(([a, b]) => b - a)),
    cueMs: cues.reduce((t, { a, b }) => t + b - a, 0),
    tooLong: cut
      .filter(({ v }) => v.durMs > CUTAWAY_MAX_MS)
      .map(({ v }) => ({ atMs: v.atMs, durMs: v.durMs })),
    overNumbers: cut.flatMap(({ v, a, b }) =>
      numbers
        .filter((n) => n.startMs >= a && n.startMs < b)
        .map((n) => ({ atMs: v.atMs, big: n.big })),
    ),
  };
};
