// "ytstudio" (Phòng thu): layout of the virtual studio set and its strings.
// Set coordinates are 1920x1080 before the camera move (Camera in Set.tsx);
// everything is inset from YT_SAFE so the slow dolly (up to +2 %) and the
// tight framing on big numbers keep text inside it.
import { brand } from "../../../brand/theme";
import { YT_SAFE } from "../../frame";

// The wall screen: a 16:9 panel on the right ~55 % of the frame.
export const SCREEN = { x: 760, y: 200, w: 1040, h: 585 } as const;
export const SCREEN_HEADER = 64; // the screen's top band: chapter tag + chips
// The presenter column (no presenter): chapter, running clock, key point.
export const COLUMN = { x: 124, y: 200, w: 572 } as const;
// The broadcast lower third: captions, English line, chapter progress strip.
export const LOWER = {
  top: 812,
  bottom: YT_SAFE.bottom,
  left: YT_SAFE.left,
  right: YT_SAFE.right,
} as const;

export const SLATE_FRAMES = 48; // full-frame chapter slate
export const FLICKER_FRAMES = 9; // screen flicker when it switches content
export const TIGHT_RAMP = 12; // frames for the camera to reach tight framing
export const TIGHT_MIN_FRAMES = 60; // a figure shorter than this stays wide
export const DOLLY = 0.018; // scale drift across one chapter

// A brand colour with alpha, so tints never need a colour literal.
export const tint = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const INK = brand.text;

// Every hard-coded on-screen string (RG 234-scanned via Design.copy).
export const STUDIO_COPY = {
  chapter: "CHƯƠNG",
  keyPoint: "ĐIỂM CHÍNH",
  figure: "SỐ LIỆU",
  lender: "ĐANG NHẮC TỚI",
  vs: "VS",
  before: "TRƯỚC",
  after: "SAU",
  onAir: "PHÒNG THU",
} as const;
