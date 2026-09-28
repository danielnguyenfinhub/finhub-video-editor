// Every 16:9 YouTube design (YouTubeReel `design` prop). Same Design contract
// as the vertical ones (src/mortgage/design.ts), laid out for 1920x1080 inside
// YT_SAFE (src/youtube/frame.ts).
import type { Design } from "../../mortgage/design";
import { base } from "./base";

const YT_DESIGNS: Record<string, Design> = {
  base,
};

export const DEFAULT_YT_DESIGN = "base";
export const YT_DESIGN_IDS = Object.keys(YT_DESIGNS);

export const getYouTubeDesign = (id: string): Design => {
  const d = YT_DESIGNS[id];
  if (!d)
    throw new Error(
      `YouTube design "${id}" is not a design. Available: ${YT_DESIGN_IDS.join(", ")}`,
    );
  return d;
};
