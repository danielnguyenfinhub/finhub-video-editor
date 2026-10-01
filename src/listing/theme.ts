// Global RE look for ListingReel: night navy + gold, cream cards, Be Vietnam
// Pro for all text, Playfair Display (has a "vietnamese" subset) for display
// headings only. Layout keeps text inside the 4:5 feed band.
import { getInfo, loadFont } from "@remotion/google-fonts/PlayfairDisplay";
import { createContext, useContext, useState } from "react";
import { BUSINESS } from "./copy";

export const C = BUSINESS.colors;
export const SANS = '"Be Vietnam Pro", "Segoe UI", sans-serif';
export const SERIF = getInfo().fontFamily;
// Fetches Playfair from fonts.gstatic.com, holding the frame (delayRender) until it
// loads. Called by ListingReel, not at import: Root.tsx imports this file, so a
// module-scope load made every composition fetch it (docs/findings.md, google-fonts).
export const useSerifFont = () =>
  useState(() => loadFont("normal", { weights: ["700"], subsets: ["vietnamese", "latin"] }))[0];

export const W = 1080;
export const H = 1920;
// Text stays in the Facebook-feed crop (4:5 middle) and clear of Reels' right-hand buttons.
export const SAFE = { top: 420, bottom: 1473, left: 54, right: 960 } as const;
// The photo window: the 4:5 middle, full width.
export const WINDOW = { top: 285, height: 1350 } as const;
// Everything above the captions ends here; captions own SAFE.bottom - 290 .. SAFE.bottom.
export const CONTENT_BOTTOM = 1150;

export const SHADOW = "0 2px 6px rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)";

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// "Bếp đảo đá / Stone island kitchen" -> ["Bếp đảo đá", "Stone island kitchen"].
export const splitBilingual = (s: string): [string, string] => {
  const [vi, ...en] = s.split(" / ");
  return [vi.trim(), en.join(" / ").trim()];
};

// The voice's language leads every bilingual label; the other sits under it.
export const LangContext = createContext<"vi" | "en">("vi");
export const usePair = () => {
  const lang = useContext(LangContext);
  return (vi: string, en: string): [string, string] =>
    lang === "en" && en ? [en, vi] : [vi, en];
};
