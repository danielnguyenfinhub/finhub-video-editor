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
  saidFrame?: number; // figuresOf: when it was said, before the hook wait (a stable key)
};

// A calendar year or a date is shown as said (Daniel, 02/10/2026): never
// counted up, no thousands dot, no bar, ring or scale, no rate label. Years
// and dates only: a year is 19xx/20xx alone or after "năm" ("2026", "năm
// 1999"; not "2000 đô"); a date is day/month with day 1-31 and month 1-12
// ("29/9", "1/12/2026"; not the ratio "20/80").
const DATE =
  /(^|[^\d.,])(0?[1-9]|[12]\d|3[01])\s*\/\s*(0?[1-9]|1[0-2])(?![\d.,])/;
export const saidKind = (big: string): "year" | "date" | null =>
  /^(năm\s+)?(19|20)\d\d$/iu.test(big.trim())
    ? "year"
    : DATE.test(big)
      ? "date"
      : null;
export const asSaid = (big: string): boolean => saidKind(big) !== null;

// The hook's count-up (viewed critique 08, V2/S1): never from 0, which shows
// rates that never existed. `t` is the design's own 0 -> 1 count progress;
// only the fractional part counts, from 90 % of it, so a whole number never
// shows a wrong value ("10%" never "9%") and the value is exact from half way,
// up by the hook's peak (review c849a4c).
export const hookCount = (to: number, t: number): number => {
  const k = 0.9 + 0.1 * Math.min(1, Math.max(0, t) * 2);
  const whole = Math.trunc(to);
  return k >= 1 ? to : whole + (to - whole) * k;
};

// The hook's text at count progress t, the one formatter every design prints
// (review 40bdcff). It returns `big` unchanged unless `big` holds exactly one
// number token whose value, read with the token's own marks and sign, equals
// countTo; then, before the count ends, it replaces only that token with
// hookCount's value written the token's way (its decimals, its thousands and
// decimal marks, its sign). Everything else in `big` stays as written; suffix
// and decimals never rebuild the text. A year or a date is never counted.
export const hookText = (
  // decimals and suffix are accepted (every Hook has them) and ignored.
  hook: { big: string; countTo?: number; decimals?: number; suffix?: string },
  t: number,
): string => {
  const { big, countTo } = hook;
  if (countTo === undefined || t >= 1 || asSaid(big)) return big;
  const tokens = [...big.matchAll(NUMBER_TOKEN)];
  if (tokens.length !== 1 || tokens[0].index === undefined) return big;
  const token = tokens[0][0];
  const style = readToken(token, countTo);
  if (!style) return big;
  const at = tokens[0].index;
  return `${big.slice(0, at)}${writeToken(hookCount(countTo, t), style)}${big.slice(at + token.length)}`;
};
// A number as written: an optional sign, digits with ".", "," or (narrow)
// spaces between them. "3–4" is two tokens; "-0,25" one.
const NUMBER_TOKEN = /[-\u2212]?\d(?:[.,\u00a0\u202f ]?\d)*/g;
type TokenStyle = {
  sign: string;
  dec: string;
  group: string;
  decimals: number;
};
// The reading of `token` (decimal mark "," or ".", or none) that is a valid
// number equal to `value`, with its marks; null when none is.
const readToken = (token: string, value: number): TokenStyle | null => {
  const sign = /^[-\u2212]/.test(token) ? token[0] : "";
  const body = sign ? token.slice(1) : token;
  for (const dec of [",", ".", ""]) {
    const [int, frac, extra] = dec ? body.split(dec) : [body];
    if (extra !== undefined || (frac !== undefined && !/^\d+$/.test(frac)))
      continue;
    const groups = int.split(/[.,\u00a0\u202f ]/);
    const marks: string[] = int.match(/[.,\u00a0\u202f ]/g) ?? [];
    if (new Set(marks).size > 1 || marks.includes(dec)) continue;
    if (groups.slice(1).some((g) => g.length !== 3) || groups[0].length === 0)
      continue;
    const v =
      Number(`${groups.join("")}${frac ? `.${frac}` : ""}`) * (sign ? -1 : 1);
    if (Math.abs(v - value) < 1e-9)
      return { sign, dec, group: marks[0] ?? "", decimals: frac?.length ?? 0 };
  }
  return null;
};
const writeToken = (v: number, s: TokenStyle): string => {
  const [int, frac] = Math.abs(v).toFixed(s.decimals).split(".");
  const grouped = s.group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, s.group) : int;
  return `${v < 0 ? s.sign || "-" : ""}${grouped}${frac ? `${s.dec}${frac}` : ""}`;
};

const AUTO_MS = 2600;
const AUTO_GAP_MS = 4000;
// Money and percent units only: "1 năm", "1 phần lời" are counts, not figures.
const UNIT = /^(%|tỷ|ti|triệu|nghìn|ngàn|đô|k)(?!\p{L})/iu;
// A bare "2000" is an amount only when money or a percent follows it (UNIT,
// MONEY_NEXT, "phần trăm"); a day/month-shaped "1/3" is a share also before
// SHARE_NEXT ("1/3 thu nhập"). A year is followed by any noun ("2026 của
// RBA", "2026 thu nhập"), so when unsure it stays a year. "năm" / "ngày" /
// "in" / "since" before the token keeps it a year or date, but not "mỗi /
// một / hàng năm" ("mỗi năm 2000 đô" is per year). ponytail: word lists; add
// a word when one slips through.
const MONEY_NEXT = /^(đồng|usd|aud|\$)(?!\p{L})/iu;
const SHARE_NEXT = /^(người|hộ|căn|lần|khách|thu|của|phần)(?!\p{L})/iu;
const SAID_BEFORE = /^(năm|ngày|in|since)$/iu;
const PER = /^(mỗi|một|hàng)$/iu;
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
        .slice(
          j + 1 + (percent ? 2 : 0),
          j + 1 + (percent ? 2 : 0) + LABEL_WORDS,
        )
        .map((c) => c.text)
        .join("")
        .trim()
        .split(/\s+/);
      const said = clean(big) + (percent ? "%" : "");
      // The token alone is "2000" or "1/3": a year or a date only when the
      // words around it allow it ("năm 2000", "2026 lãi suất"; not "2000
      // đô", "1/3 thu nhập").
      const word = (k: number) =>
        clean(caps[k]?.text ?? "").normalize("NFC");
      const nx = next.normalize("NFC");
      const saidBefore =
        SAID_BEFORE.test(word(i - 1)) &&
        !(/^năm$/iu.test(word(i - 1)) && PER.test(word(i - 2)));
      const amount =
        !saidBefore &&
        (percent ||
          UNIT.test(nx) ||
          MONEY_NEXT.test(nx) ||
          (saidKind(said) === "date" && SHARE_NEXT.test(nx)));
      out.push({
        big: said,
        // A year or a date gets no label: the words after it describe
        // something else ("2026 lãi suất cơ bản" read as "the rate is 2026").
        label: asSaid(said) && !amount ? "" : autoLabel(after),
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
    // A stat that shows the same number while this card would still be up
    // covers it too (ty-do-explainer: "400" said 67 ms before "~$400"'s
    // window, then the same amount twice in a row).
    const digits = n.big.replace(/\D/g, "");
    if (
      stats.some(
        (s) =>
          s.big.replace(/\D/g, "") === digits &&
          s.fromFrame >= toFrame(at) &&
          s.fromFrame < toFrame(at + AUTO_MS),
      )
    )
      continue;
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
  // The hook owns the screen for HOOK_FRAMES (Daniel, 02/10/2026): a figure
  // said under it waits until the hook ends, and one said while that wait
  // is still held waits for it in turn, so they never overlap. A stat keeps
  // its whole reading time; an automatic figure what is left of its span,
  // never less than READING.minNumberHoldMs. Figures said after the hook
  // are untouched unless one would overlap the previous: the previous, shown
  // when said, ends when the next is said (in the same frame too), never
  // under its reading time and never past its own length; if that is still
  // too short, the next waits for it like a hook-time figure.
  const hold = toFrame(READING.minNumberHoldMs);
  let free = reel.edit.hook ? HOOK_FRAMES : 0;
  const shown: Figure[] = [];
  for (const f of [...stats, ...autos].sort(
    (a, b) => a.fromFrame - b.fromFrame,
  )) {
    const prev = shown[shown.length - 1];
    if (prev && prev.fromFrame === prev.saidFrame && f.fromFrame < free) {
      const need = Math.max(hold, toFrame(readingMs([prev.big, prev.label])));
      prev.frames = Math.max(
        Math.min(prev.frames, need),
        f.fromFrame - prev.fromFrame,
      );
      free = prev.fromFrame + prev.frames;
    }
    if (f.fromFrame >= free) {
      shown.push({ ...f, saidFrame: f.fromFrame });
      free = f.fromFrame + f.frames;
      continue;
    }
    const frames =
      f.source === "stat"
        ? Math.max(f.frames, hold)
        : Math.max(f.fromFrame + f.frames - free, hold);
    shown.push({ ...f, saidFrame: f.fromFrame, fromFrame: free, frames });
    free += frames;
  }
  return shown;
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
