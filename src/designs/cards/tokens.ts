// "cards" (Thẻ thông tin): colours, layout and every hard-coded word.
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";

// FinHub web brand (Daniel's pick over the reference's peach/orange); these
// two are the finhub.net.au navy and gold, not in theme.ts.
export const NAVY = "#1B3A6B"; // theme-exempt: FinHub web navy (CLAUDE.md brand), Daniel's pick for this design
export const GOLD = "#C9A84C"; // theme-exempt: FinHub web gold (CLAUDE.md brand), Daniel's pick for this design
export const CREAM = "#FBF6EC"; // theme-exempt: cream backdrop, tint of the brand gold
export const CREAM_DEEP = "#F1E6CF"; // theme-exempt: cream backdrop, deeper gold tint
export const GOLD_SOFT = "rgba(201,168,76,0.18)"; // theme-exempt: brand gold tint for fills
export const INK = brand.textOnCard;
export const MUTED = brand.slate;
export const BORDER = "rgba(11,31,61,0.10)";
export const SHADOW = "0 18px 44px rgba(11,31,61,0.13)";
export const CAPTION_BG = "rgba(11,31,61,0.82)";

// Layout (1080 x 1920). The logo tile (LogoMark) owns SAFE's top-right
// corner down to ~y 570, so stage cards start under it; the hook (before the
// logo shows) may start at SAFE.top.
export const W = 1080;
export const STAGE = {
  left: SAFE.left,
  right: SAFE.right,
  top: SAFE.top + 170,
  hookTop: SAFE.top + 6,
  // Split: the stage ends above the caption and Daniel's card.
  splitBottom: 915,
  // Full screen: Daniel's card is away; captions sit at SAFE.bottom.
  fullBottom: SAFE.bottom - 108,
} as const;
export const CAPTION_BOTTOM = { split: 1000, full: SAFE.bottom } as const;
// Daniel's rounded card. It runs past the frame bottom (rounded top only).
// The source is scaled by VIDEO.scale with source y VIDEO.srcTop at the
// card's top edge: his hair (~y 450 in the source) lands ~y 1030 and his chin
// (~y 1410) ~y 1606, inside the 4:5 feed crop (y ≤ 1635).
export const CARD = { left: 216, top: 1012, width: 648, height: 1000 } as const;
export const VIDEO = { scale: 0.6, srcTop: 420 } as const;
export const CARD_AWAY = 1000; // px his card drops by in full-screen moments

// Every hard-coded on-screen string (RG 234 scans the design's copy).
export const WORD = {
  figure: "CON SỐ",
  lender: "NGÂN HÀNG ĐANG NHẮC TỚI",
  chapter: "PHẦN",
  topic: "CHỦ ĐỀ",
  before: "TRƯỚC",
  after: "SAU",
  change: "THAY ĐỔI",
  points: "ĐIỂM CHÍNH",
  compare: "SO SÁNH",
  trend: "DIỄN BIẾN",
  bars: "SO SÁNH MỨC",
  hook: "ĐIỀU CẦN BIẾT",
  vs: "VS",
} as const;
