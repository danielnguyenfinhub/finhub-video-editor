// "splitscreen" numbers: parse a value as said ("4,35%", "3.388", "$600.000"),
// count it up, and the difference between a before and an after value. The
// difference is only ever arithmetic on two values in the same unit; anything
// else returns null and the design shows no difference (never invented).

export type Parsed = {
  value: number;
  decimals: number;
  grouped: boolean;
  before: string; // text before the number ("$")
  after: string; // text after it ("%", " đô")
};

// Vietnamese formats: "," is the decimal mark, "." groups thousands
// ("3.388"); a lone "." before 1–2 digits is a decimal ("4.35"). A year or a
// date is not a value: null (never counted, never differenced).
export const parseValue = (s: string): Parsed | null => {
  const m = s.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return null;
  const raw = m[0].replace(/[.,]$/, "");
  if (/^(19|20)\d\d$/.test(raw) || /\d\s*\/\s*\d/.test(s)) return null;
  if (/\d/.test(s.slice(m.index + raw.length))) return null; // "3,6-4,35%"
  let value: number;
  let decimals = 0;
  let grouped = false;
  const groups = (p: string[]) => p.slice(1).every((g) => g.length === 3);
  if (raw.includes(",")) {
    const [int, frac, extra] = raw.split(",");
    if (extra !== undefined) return null;
    grouped = int.includes(".");
    if (grouped && !groups(int.split("."))) return null;
    value = Number(`${int.replace(/\./g, "")}.${frac}`);
    decimals = frac.length;
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    if (groups(parts)) {
      grouped = true;
      value = Number(parts.join(""));
    } else if (parts.length === 2) {
      value = Number(raw);
      decimals = parts[1].length;
    } else return null;
  } else value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    decimals,
    grouped,
    before: s.slice(0, m.index),
    after: s.slice(m.index + raw.length),
  };
};

export const fmt = (v: number, decimals: number, grouped: boolean): string =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });

// `big` counted from `start` (default 0) at t ∈ [0, 1]; exactly `big` at 1.
// Not a value (a year, a date, a word): `big` as said.
export const counted = (big: string, t: number, start = 0): string => {
  const p = parseValue(big);
  if (!p || t >= 1) return big;
  return `${p.before}${fmt(start + (p.value - start) * t, p.decimals, p.grouped)}${p.after}`;
};

// Two values in the same unit (same text around the number), else null.
export const sameUnit = (a: string, b: string): [Parsed, Parsed] | null => {
  const pa = parseValue(a);
  const pb = parseValue(b);
  if (!pa || !pb) return null;
  if (pa.before.trim() !== pb.before.trim()) return null;
  if (pa.after.trim() !== pb.after.trim()) return null;
  return [pa, pb];
};

export const POINTS_UNIT = "điểm %";

// "3,6%" -> "4,35%": "+0,75 điểm %"; "3.388" -> "3.675": "+287". Null when
// the units differ, a value does not parse, nothing changed, or the sign
// disagrees with the cue's own direction.
export const differenceOf = (
  from: string,
  to: string,
  direction?: "up" | "down",
): string | null => {
  const pair = sameUnit(from, to);
  if (!pair) return null;
  const [a, b] = pair;
  const d = b.value - a.value;
  const decimals = Math.max(a.decimals, b.decimals);
  if (Math.abs(d) < 10 ** -decimals / 2) return null;
  if ((direction === "up" && d < 0) || (direction === "down" && d > 0))
    return null;
  const sign = d > 0 ? "+" : "−";
  const n = fmt(Math.abs(d), decimals, a.grouped || b.grouped);
  return a.after.includes("%")
    ? `${sign}${n} ${POINTS_UNIT}`
    : `${sign}${a.before}${n}${a.after}`;
};
