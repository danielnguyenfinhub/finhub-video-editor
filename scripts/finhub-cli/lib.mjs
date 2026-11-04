// Shared by the finhub commands: exit codes, usage errors, output, path helpers.
import { isAbsolute, relative, sep } from "node:path";

export const OK = 0;
export const PROBLEM = 1;
export const USAGE = 2;

/** Thrown for bad arguments; the dispatcher prints the message and exits 2. */
export class UsageError extends Error {}

/** One JSON object (--json) or the text lines. Nothing else goes to stdout. */
export const emit = (json, data, lines) => console.log(json ? JSON.stringify(data) : lines.join("\n"));

export const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.ceil(n / 1e3)} KB`);

/** Path relative to root with forward slashes, for output. */
export const rel = (root, p) => relative(root, p).split(sep).join("/");

/** True when p lies strictly inside dir (both already real paths). Case-folded on Windows. */
export const inside = (dir, p) => {
  const fold = (s) => (process.platform === "win32" ? s.toLowerCase() : s);
  const r = relative(fold(dir), fold(p));
  return r !== "" && r !== ".." && !r.startsWith(`..${sep}`) && !isAbsolute(r);
};
