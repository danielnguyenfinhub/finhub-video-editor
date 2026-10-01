// Headline wraps that never split a unit (recheck 09: "sau 3 / lần tăng",
// "cơ / bản"): a number keeps the word after it ("3 lần"), and a multi-word
// finance unit stays on one line. Joined with a no-break space, so the
// browser and fitText / fitTextOnNLines (which split on " ") treat the unit
// as one word. ponytail: a word list, not a Vietnamese segmenter; add a unit
// when a headline splits one.
import { KEYWORDS } from "../mortgage/style";

const NBSP = "\u00a0"; // no-break space
const UNITS = [
  ...KEYWORDS.filter((k) => k.includes(" ")),
  "cơ bản",
  "lạm phát",
  "trả góp",
].map(
  (u) => new RegExp(`(?<!\\p{L})${u.replace(/ /g, " +")}(?!\\p{L})`, "giu"),
);

export const keepUnits = (text: string): string =>
  UNITS.reduce(
    (out, re) => out.replace(re, (m) => m.replace(/ +/g, NBSP)),
    text.replace(/(\d[\d.,]*%?) +(?=\p{L})/gu, `$1${NBSP}`),
  );
