// The difference a `change` cue shows in its chip ("+0,75 điểm %"), computed
// only when both values parse as numbers with the same prefix and unit, and
// only when its sign agrees with the cue's own direction. Otherwise null: the
// chip is left out rather than guessed.

export const POINTS_UNIT = "điểm %";

type Parsed = {
  value: number;
  decimals: number;
  grouped: boolean;
  prefix: string;
  unit: string;
};

// Vietnamese number formats: "," is the decimal mark, "." groups thousands
// ("3.388"); a lone "." before 1–2 digits is read as a decimal ("4.35").
export const parseValue = (s: string): Parsed | null => {
  const m = s.trim().match(/^([^\d]*?)(\d[\d.,]*)\s*(.*)$/);
  if (!m) return null;
  const [, prefix, raw, unit] = m;
  if (/\d/.test(unit) || /[\d]/.test(prefix)) return null;
  let digits = raw;
  let decimals = 0;
  let grouped = false;
  if (raw.includes(",")) {
    const [int, frac, extra] = raw.split(",");
    if (extra !== undefined) return null;
    grouped = int.includes(".");
    digits = `${int.replace(/\./g, "")}.${frac}`;
    decimals = frac.length;
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.slice(1).every((p) => p.length === 3)) {
      grouped = true;
      digits = parts.join("");
    } else if (parts.length === 2) {
      decimals = parts[1].length;
    } else return null;
  }
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    decimals,
    grouped,
    prefix: prefix.trim(),
    unit: unit.trim(),
  };
};

export const changeDiff = (
  from: string,
  to: string,
  direction?: "up" | "down",
): string | null => {
  const a = parseValue(from);
  const b = parseValue(to);
  if (
    !a ||
    !b ||
    a.prefix !== b.prefix ||
    a.unit.toLowerCase() !== b.unit.toLowerCase()
  )
    return null;
  const decimals = Math.max(a.decimals, b.decimals);
  const d = Number((b.value - a.value).toFixed(decimals));
  if (d === 0) return null;
  if (direction && d > 0 !== (direction === "up")) return null;
  const num = Math.abs(d).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: a.grouped || b.grouped,
  });
  const unit = a.unit === "%" ? POINTS_UNIT : a.unit;
  return `${d > 0 ? "+" : "−"}${a.prefix}${num}${unit ? ` ${unit}` : ""}`;
};
