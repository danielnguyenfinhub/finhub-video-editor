// The caption layer every design shares: the pager (sentence-aware pages from
// captionPages, one Sequence per page) and the zone a page sits in. A design
// only draws a page; where and when it shows is decided here, once.
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { captionPages } from "./captionPages";
import { SAFE } from "./golden";
import type { Reel } from "./schema";

const HEIGHT = 1920;

// Each page shows from its first word for its length plus tailMs, and never
// past the next page's start. The defaults are what most designs use; a
// design with its own pacing passes its own numbers.
export const PagedCaptions: React.FC<{
  reel: Reel;
  render: (page: TikTokPage, from: number) => React.ReactNode;
  combineWithinMs?: number;
  breakOnSilenceAfterMs?: number;
  tailMs?: number;
}> = ({
  reel,
  render,
  combineWithinMs = 900,
  breakOnSilenceAfterMs = 350,
  tailMs = 400,
}) => {
  const { fps } = useVideoConfig();
  const pages = captionPages({
    captions: reel.timeline.captions,
    combineWithinMs,
    breakOnSilenceAfterMs,
  });
  return (
    <>
      {pages.map((page, i) => {
        const from = Math.round((page.startMs / 1000) * fps);
        const next = pages[i + 1]
          ? Math.round((pages[i + 1].startMs / 1000) * fps)
          : Infinity;
        const dur = Math.min(
          Math.round(((page.durationMs + tailMs) / 1000) * fps),
          next - from,
        );
        return dur > 0 ? (
          <Sequence
            key={page.startMs}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            {render(page, from)}
          </Sequence>
        ) : null;
      })}
    </>
  );
};

// A zone may end above SAFE.bottom (e.g. over a ticker), never below it.
export const captionZoneBottom = (bottom: number = SAFE.bottom) =>
  Math.min(bottom, SAFE.bottom);

// Golden rule: captions below FACE and inside SAFE. The zone's bottom edge is
// fixed and the page grows upward, so a two-line page never drops onto the
// bottom UI. A plain div: bottom/right offsets on an AbsoluteFill are ignored
// (it sets top 0 and height 100%). `right` is an x coordinate, like SAFE.right.
export const CaptionZone: React.FC<{
  left?: number;
  right?: number;
  bottom?: number;
  align?: "center" | "flex-start" | "flex-end";
  children: React.ReactNode;
}> = ({
  left = SAFE.left,
  right = SAFE.right,
  bottom,
  align = "center",
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left,
      width: right - left,
      bottom: HEIGHT - captionZoneBottom(bottom),
      display: "flex",
      flexDirection: "column",
      alignItems: align,
    }}
  >
    {children}
  </div>
);
