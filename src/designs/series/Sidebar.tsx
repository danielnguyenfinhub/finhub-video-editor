// The right-hand tracker (x 620-960, y 690-1290 inside SAFE): "HÀNH TRÌNH", the
// reel.edit.stats numbers as Daniel reaches them (golden rule 1's "stat"
// figures ARE this list — never rendered a second time as cards), then
// "ĐÃ NHẮC TỚI" with a rotated stack of bank logos (adapted from the rotate +
// stacked-offset feel of .claude/elements/commerce/product-collection, minus
// its Interactive.* wrapper and scroll behaviour: here every seen bank stays
// stacked, newest on top, instead of carousel-scrolling through them).
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { LenderMention } from "../../mortgage/lenders";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT } from "../../mortgage/style";

// x 620-960: right of his head and neck (x ~200-490 at y < 1300), so the
// wider column still sits clear of him.
const WIDTH = 340;
const X = SAFE.right - WIDTH;
const NUMBER_MIN = 40;
const NUMBER_MAX = 48;
const ROWS = 2;
// Sidebar headings start below the LogoMark (top SAFE.top + 70, 120px tall
// on its tile): golden rule, y >= SAFE.top + 270.
// The auto-figure card (a transient counter for a spoken number with no
// stat/cue of its own) and the Tracker's "HÀNH TRÌNH" heading used to share
// this same top, so a figure landing while stats exist would sit on top of
// the tracker (golden rule 3b). The auto card now owns a permanent slot at
// the top of the sidebar; the tracker always starts below it, whether or not
// this reel ever has an auto figure, so the two can never collide.
const AUTO_CARD_TOP = SAFE.top + 270;
const AUTO_CARD_RESERVED = 150; // card height (~105) + gap, clear of HEADING_TOP
const HEADING_TOP = AUTO_CARD_TOP + AUTO_CARD_RESERVED;
// Heading (38) + two rows (number 53 + two label lines 60, gap 16) + note.
const LENDER_TOP = HEADING_TOP + 330;

// Fades the whole sidebar to 0 while any edit.json cue is on screen, so a
// kinetic/compare/bars/verdict/venn/emoji/lenders card never fights the
// tracker or lender stack for the same space (golden rule 3b).
export const useSidebarFade = (reel: Reel): number => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cueActive = (reel.edit.cues ?? []).some((c) => {
    const from = outFrame(c.fromMs);
    const to = outFrame(c.toMs);
    return frame >= from && frame < to;
  });
  return cueActive ? 0 : 1;
};

type Row = { label: string; big: string; atFrame: number };

// Stats are a mix of amounts and words ("$4,1 TỶ", "TỔNG CHI PHÍ"), not
// values on one scale, so a row is the number itself, large, over its label
// (wrapping, never cut): no bar pretending to compare them.
const StatRow: React.FC<{ row: Row; current: boolean }> = ({
  row,
  current,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - row.atFrame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const size = Math.max(
    NUMBER_MIN,
    Math.min(
      NUMBER_MAX,
      fitText({
        text: row.big,
        withinWidth: WIDTH,
        fontFamily: FONT,
        fontWeight: 900,
      }).fontSize,
    ),
  );
  return (
    <div
      style={{
        fontFamily: FONT,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [40, 0])}px)`,
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.1,
          color: current ? brand.accent : "#fff",
        }}
      >
        {row.big}
      </div>
      <div
        style={{
          fontSize: 24,
          lineHeight: 1.25,
          color: brand.textDim,
        }}
      >
        {row.label}
      </div>
    </div>
  );
};

// The "HÀNH TRÌNH" tracker: each reel.edit.stats figure appears when Daniel
// reaches it; the latest ROWS stay listed (the newest in amber), older ones
// give way so the column never runs into the lender stack or the captions.
export const Tracker: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const outFrame = outFrameOf(reel.timeline, fps);
  const reached: Row[] = (reel.edit.stats ?? [])
    .map((s) => ({ label: s.label, big: s.big, atFrame: outFrame(s.atMs) }))
    .filter((r) => frame >= r.atFrame);
  if (reached.length === 0) return null;
  const shown = reached.slice(-ROWS);
  return (
    <div
      style={{ position: "absolute", left: X, top: HEADING_TOP, width: WIDTH }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: 3,
          color: brand.accent,
          marginBottom: 14,
        }}
      >
        HÀNH TRÌNH
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {shown.map((r, i) => (
          <StatRow
            key={r.atFrame}
            row={r}
            current={i === shown.length - 1}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: FONT,
          fontSize: 16,
          color: "rgba(201,211,230,0.6)",
        }}
      >
        ví dụ minh hoạ
      </div>
    </div>
  );
};

// A small counter card for "auto" figures (a spoken number with no stat/cue
// of its own) — top of the sidebar, transient (mounted only for its frames).
export const AutoFigureCard: React.FC<{ big: string; label: string }> = ({
  big,
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: X,
        top: AUTO_CARD_TOP,
        width: WIDTH,
        background: "#fff",
        borderRadius: 16,
        padding: "16px 18px",
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
        boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 40,
          color: brand.textOnCard,
          lineHeight: 1.1,
        }}
      >
        {big}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 16, color: "#5B6B80" }}>
        {label}
      </div>
    </div>
  );
};

// "ĐÃ NHẮC TỚI": every bank mentioned so far, stacked with a slight rotation
// per card (a "seen so far" stack, not a carousel — each new bank flips in and
// stays). The current one (mentioned right now) gets an amber outline.
export const LenderStack: React.FC<{
  mention: LenderMention;
  index: number;
  current: boolean;
}> = ({ mention, index, current }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startFrame = Math.round((mention.startMs / 1000) * fps);
  const flip = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 140 },
  });
  const rotations = [-3, 2, -2];
  const rotate = rotations[index % rotations.length];
  return (
    <div
      style={{
        position: "absolute",
        left: index * 12,
        top: index * 12,
        transform: `rotate(${rotate}deg) rotateY(${interpolate(flip, [0, 1], [90, 0])}deg)`,
        opacity: interpolate(flip, [0, 1], [0, 1]),
        zIndex: index,
      }}
    >
      <div
        style={{
          borderRadius: 14,
          outline: current ? `4px solid ${brand.accent}` : undefined,
          boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
        }}
      >
        <LenderLogo lender={mention.lender} height={48} />
      </div>
    </div>
  );
};

export const LenderTracker: React.FC<{ mentions: LenderMention[] }> = ({
  mentions,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const seenSoFar = mentions.filter((m) => nowMs >= m.startMs);
  if (seenSoFar.length === 0) return null;
  return (
    <div
      style={{ position: "absolute", left: X, top: LENDER_TOP, width: WIDTH }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: 3,
          color: brand.accent,
          marginBottom: 20,
        }}
      >
        ĐÃ NHẮC TỚI
      </div>
      <div style={{ position: "relative", height: 90 }}>
        {seenSoFar.map((m, i) => (
          <LenderStack
            key={`${m.lender.name}${m.startMs}`}
            mention={m}
            index={i}
            current={nowMs >= m.startMs && nowMs <= m.endMs}
          />
        ))}
      </div>
    </div>
  );
};
