// ytdashboard geometry and palette. The dashboard is a fixed layout inside
// YT_SAFE: a chapter nav rail on the left, a header, the focus stage (where a
// beat's tile expands), a strip of past tiles, and the caption console.
import { brand } from "../../../brand/theme";
import { YT_SAFE } from "../../frame";

export type Rect = { x: number; y: number; w: number; h: number };

const GAP = 20;
export const RAIL: Rect = {
  x: YT_SAFE.left,
  y: YT_SAFE.top,
  w: 340,
  h: YT_SAFE.bottom - YT_SAFE.top,
};
const MAIN_X = RAIL.x + RAIL.w + 24;
const MAIN_W = YT_SAFE.right - MAIN_X;
// LogoMark16 is 116 px tall at YT_SAFE.top, so the stage starts below it.
export const HEADER: Rect = { x: MAIN_X, y: YT_SAFE.top, w: MAIN_W, h: 96 };
export const FOCUS: Rect = { x: MAIN_X, y: 196, w: MAIN_W, h: 400 };
export const STRIP = { x: MAIN_X, y: 614, w: MAIN_W, h: 150, n: 4, gap: GAP };
export const CONSOLE: Rect = {
  x: MAIN_X,
  y: 782,
  w: MAIN_W,
  h: YT_SAFE.bottom - 782,
};
export const SLOT_W = (STRIP.w - STRIP.gap * (STRIP.n - 1)) / STRIP.n;

// Slot i of the history strip (i may be fractional while tiles slide).
export const slotRect = (i: number): Rect => ({
  x: STRIP.x + i * (SLOT_W + STRIP.gap),
  y: STRIP.y,
  w: SLOT_W,
  h: STRIP.h,
});

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

// A theme colour with an alpha (0–1), as #RRGGBBAA.
export const alpha = (hex: string, a: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0")}`;

export const P = {
  gold: brand.highlight,
  text: brand.text,
  dim: brand.textDim,
  panel: alpha(brand.text, 0.04),
  line: alpha(brand.text, 0.12),
  faint: alpha(brand.text, 0.07),
};

// Calm, precise motion: no overshoot for slides, a slight one for the focus.
export const CALM = { damping: 200 } as const;
export const FOCUS_SPRING = { damping: 18, stiffness: 120, mass: 1 } as const;

// Talk frame -> "m:ss".
export const clock = (frame: number, fps: number) => {
  const s = Math.max(0, Math.floor(frame / fps));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const COPY = {
  toc: "MỤC LỤC",
  chapter: "CHƯƠNG",
  progress: "TIẾN ĐỘ",
  next: "Tiếp theo",
  figure: "SỐ LIỆU",
  list: "DANH SÁCH",
  compare: "SO SÁNH",
  change: "THAY ĐỔI",
  trend: "XU HƯỚNG",
  bars: "BIỂU ĐỒ",
  verdict: "KẾT LUẬN",
  venn: "ĐIỂM CHUNG",
  kinetic: "NHẤN MẠNH",
  mentioned: "ĐANG NHẮC TỚI",
  vs: "VS",
};
