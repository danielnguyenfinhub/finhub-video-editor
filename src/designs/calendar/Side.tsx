// Beside the calendar: sticky notes for figures (golden rule 1) on its right
// edge, and the paper tab top-left: the chapter, or a named bank's logo
// (golden rule 2) while it is said.
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { lenderMentionsOf, type Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT } from "../../mortgage/style";
import { useFontReady } from "../ticker/Board";
import {
  GOLD,
  NAVY,
  NOTE,
  PAPER,
  SLATE,
  StickyNote,
  TAB,
  fitSize,
  lines,
} from "./Desk";
import { MIN_HOLD, type Plan, type Span } from "./Plan";

export const LENDER_KICKER = "ĐANG NHẮC TỚI";
export const CHAPTER_WORD = "PHẦN";

// ------------------------------------------------------------------ notes

const FigureNote: React.FC<{ figure: Figure; lane: number }> = ({
  figure,
  lane,
}) => {
  const ready = useFontReady("calendar note: Be Vietnam Pro");
  if (!ready) return null;
  const size = fitSize(figure.big, NOTE.width - 40, 84);
  return (
    <StickyNote top={NOTE.top + lane * 250} tilt={lane ? -3 : 3}>
      <div
        style={{
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}
      >
        {figure.big}
      </div>
      {figure.label ? (
        <div
          style={{
            fontWeight: 800,
            fontSize: lines(figure.label, NOTE.width - 36, 3, 26),
            lineHeight: 1.3,
          }}
        >
          {figure.label}
        </div>
      ) : null}
    </StickyNote>
  );
};

export const Notes: React.FC<{ plan: Plan }> = ({ plan }) => (
  <>
    {plan.notes.map(({ figure, lane }) => (
      <Sequence
        key={`${figure.source}${figure.fromFrame}${figure.big}`}
        from={figure.fromFrame}
        durationInFrames={Math.max(MIN_HOLD, figure.frames)}
        layout="none"
      >
        <FigureNote figure={figure} lane={lane} />
      </Sequence>
    ))}
  </>
);

// ------------------------------------------------------------------ tab

// Top-left of SAFE: a paper tab with the chapter (or the video's topic),
// swapped for a clipped bank card while a bank is named (golden rule 2).
const TabCard: React.FC<{ children: React.ReactNode; accent?: string }> = ({
  children,
  accent = GOLD,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
  return (
    <div
      style={{
        position: "absolute",
        left: TAB.left,
        top: TAB.top,
        maxWidth: TAB.width,
        boxSizing: "border-box",
        padding: "16px 26px 16px 22px",
        borderRadius: 14,
        background: PAPER,
        borderLeft: `10px solid ${accent}`,
        boxShadow: "0 12px 26px rgba(11,31,61,0.18)",
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [-30, 0])}px) rotate(-1deg)`,
        display: "flex",
        alignItems: "center",
        gap: 22,
      }}
    >
      {children}
    </div>
  );
};

const ChapterTab: React.FC<{ n: number; title: string }> = ({ n, title }) => (
  <TabCard>
    <span
      style={{ color: SLATE, fontWeight: 900, fontSize: 26, letterSpacing: 3 }}
    >
      {CHAPTER_WORD} {n}
    </span>
    <span
      style={{
        color: NAVY,
        fontWeight: 900,
        fontSize: lines(title, TAB.width - 220, 1, 38),
        whiteSpace: "nowrap",
      }}
    >
      {title}
    </span>
  </TabCard>
);

export const TabLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("calendar tab: Be Vietnam Pro");
  const at = outFrameOf(reel.timeline, fps);
  const chapters = reel.edit.chapters ?? [];
  const lenders = lenderMentionsOf(reel).map((m) => ({
    m,
    from: Math.round((m.startMs / 1000) * fps),
    to: Math.round((m.endMs / 1000) * fps),
  }));
  if (!ready) return null;
  return (
    <>
      {chapters.map((c, i) => {
        const from = at(c.atMs);
        const to = chapters[i + 1] ? at(chapters[i + 1].atMs) : Infinity;
        // gaps where a bank card takes the tab
        const cuts = lenders.filter((l) => l.to > from && l.from < to);
        const spans: Span[] = [];
        let a = from;
        for (const l of cuts.sort((x, y) => x.from - y.from)) {
          if (l.from > a) spans.push([a, l.from]);
          a = Math.max(a, l.to);
        }
        if (a < to) spans.push([a, to]);
        return spans.map(([s, e]) => (
          <Sequence
            key={`${c.atMs}${s}`}
            from={s}
            durationInFrames={
              Number.isFinite(e) ? Math.max(1, e - s) : undefined
            }
            layout="none"
          >
            <ChapterTab n={i + 1} title={c.title} />
          </Sequence>
        ));
      })}
      {lenders.map(({ m, from, to }) => (
        <Sequence
          key={`${m.lender.name}${m.startMs}`}
          from={from}
          durationInFrames={Math.max(1, to - from)}
          layout="none"
        >
          <TabCard accent={brand.primary}>
            <LenderLogo lender={m.lender} height={60} />
            <span
              style={{
                color: SLATE,
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: 3,
              }}
            >
              {LENDER_KICKER}
            </span>
          </TabCard>
        </Sequence>
      ))}
    </>
  );
};
