// The gold alert bar that slams in at the top of SAFE and stays, a pulsing
// dot and running hazard stripes on its left end; chapters swap into it.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import {
  ALERT,
  ALERT_LABEL,
  CHAPTER_WORD,
  GOLD,
  Glint,
  NAVY,
  STRIPES,
  useFontReady,
} from "./Frame";

const BAR_TEXT_W = ALERT.right - SAFE.left - 160;

const Dot: React.FC<{ t: number }> = ({ t }) => {
  const k = (t % 30) / 30;
  return (
    <div
      style={{ position: "relative", width: 30, height: 30, flex: "0 0 30px" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `4px solid ${NAVY}`,
          transform: `scale(${1 + k * 1.1})`,
          opacity: 1 - k,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 5,
          borderRadius: "50%",
          background: NAVY,
        }}
      />
    </div>
  );
};

// The gold bar that slams in at the top of SAFE and stays; during a chapter's
// first 2.5 s it reads "PHẦN n" and the chapter title instead.
export const AlertBar: React.FC<{
  reel?: Reel;
  t: number;
  top?: number;
  right?: number;
}> = ({ reel, t, top = ALERT.top, right = ALERT.right }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("flash alert bar: Be Vietnam Pro");
  const at = reel ? outFrameOf(reel.timeline, fps) : null;
  const chapters = reel?.edit.chapters ?? [];
  const idx = at
    ? chapters.findIndex(
        (c) => t >= at(c.atMs) && t < at(c.atMs) + Math.round(2.5 * fps),
      )
    : -1;
  const since = idx >= 0 && at ? t - at(chapters[idx].atMs) : t;
  const inP = spring({
    frame: since,
    fps,
    config: { damping: 12, stiffness: 260, mass: 0.6 },
  });
  const width = right - SAFE.left;
  const text = idx >= 0 ? chapters[idx].title : ALERT_LABEL;
  const tag = idx >= 0 ? `${CHAPTER_WORD} ${idx + 1}` : null;
  const avail = BAR_TEXT_W - (tag ? 150 : 0);
  const size = ready
    ? Math.min(
        46,
        fitText({ text, withinWidth: avail, fontFamily: FONT, fontWeight: 900 })
          .fontSize,
      )
    : 46;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top,
        width,
        height: ALERT.height,
        display: "flex",
        alignItems: "center",
        background: GOLD,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
        fontFamily: FONT,
        transformOrigin: "left center",
        transform: `scaleX(${interpolate(inP, [0, 1], [0.2, 1])})`,
        opacity: interpolate(since, [0, 2], [0, 1], clamp),
      }}
    >
      <div
        style={{
          flex: "0 0 48px",
          alignSelf: "stretch",
          background: STRIPES(NAVY, GOLD, 12),
          backgroundPosition: `${(t * 3) % 34}px 0`,
        }}
      />
      <div style={{ width: 22 }} />
      <Dot t={t} />
      <div style={{ width: 18 }} />
      {tag ? (
        <span
          style={{
            background: NAVY,
            color: GOLD,
            fontWeight: 900,
            fontSize: 34,
            padding: "6px 14px",
            borderRadius: 8,
            marginRight: 16,
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </span>
      ) : null}
      <Glint first={3} every={75}>
        <span
          style={{
            display: "block",
            color: NAVY,
            fontWeight: 900,
            fontSize: size,
            letterSpacing: tag ? 0 : 1,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            opacity: ready ? 1 : 0,
          }}
        >
          {text}
        </span>
      </Glint>
    </div>
  );
};
