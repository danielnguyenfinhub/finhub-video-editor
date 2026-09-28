// The page (main area): one visual at a time on the stage, a chapter heading
// that stays at the top of the page, the page-turn wipe at a chapter change,
// big figures with a navy underline bar, lender logos on white cards, and
// chips for a figure or logo said while a cue holds the stage.
import type React from "react";
import {
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import type { Lender } from "../../../mortgage/lenders";
import { FONT, clamp, enter } from "../../../mortgage/style";
import { CueView } from "./Cues";
import {
  INK,
  PAGE_L,
  PAGE_R,
  PAGE_W,
  SIDE_W,
  STAGE_BOTTOM,
  STAGE_TOP,
  STRIP_TOP,
  type Chapter,
  type Chip,
  type StageItem,
} from "./Plan";

export const COPY = ["CHƯƠNG", "Ngân hàng được nhắc tới"];
const EXIT = 8;
const TURN = 22; // page-turn wipe length
const SHEET = 1500;

// Enters with a short rise, leaves with a fade, inside the stage box.
const Slot: React.FC<{ frames: number; children: React.ReactNode }> = ({
  frames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const out = interpolate(frame, [frames - EXIT, frames], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: PAGE_L,
        width: PAGE_W,
        top: STAGE_TOP,
        height: STAGE_BOTTOM - STAGE_TOP,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        fontFamily: FONT,
        color: INK,
        opacity: Math.min(p, out),
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      {children}
    </div>
  );
};

// A number as the page's headline: large navy figure, a navy bar drawn under
// it, its label below.
export const BigFigure: React.FC<{ big: string; label?: string }> = ({
  big,
  label,
}) => {
  const frame = useCurrentFrame();
  const bar = interpolate(frame, [6, 24], [0, 1], clamp);
  const size = big.length > 7 ? 170 : 220;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -4,
        }}
      >
        {big}
      </div>
      <div
        style={{
          marginTop: 22,
          height: 16,
          width: 520 * bar,
          borderRadius: 8,
          background: INK,
        }}
      />
      {label ? (
        <div
          style={{
            marginTop: 34,
            fontSize: 52,
            fontWeight: 700,
            color: brand.slate,
            maxWidth: PAGE_W,
            lineHeight: 1.25,
            opacity: interpolate(frame, [12, 22], [0, 1], clamp),
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

const LenderCard: React.FC<{ lender: Lender }> = ({ lender }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
    }}
  >
    <div
      style={{
        fontSize: 40,
        fontWeight: 800,
        color: brand.slate,
        marginBottom: 30,
      }}
    >
      {COPY[1]}
    </div>
    <div
      style={{
        borderRadius: 28,
        boxShadow: `0 18px 50px ${brand.navy}33`,
        border: `3px solid ${INK}14`,
      }}
    >
      <LenderLogo lender={lender} height={150} style={{ borderRadius: 28 }} />
    </div>
  </div>
);

// The chapter title as the page's headline: after the page turns, and again
// whenever the page would otherwise be empty. chapter -1: the video title.
const Slate: React.FC<{ chapter: number; total: number; title: string }> = ({
  chapter,
  total,
  title,
}) => {
  const frame = useCurrentFrame();
  return (
    <div>
      {chapter >= 0 ? (
        <div
          style={{
            display: "inline-block",
            padding: "8px 22px",
            borderRadius: 10,
            background: brand.highlight,
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: 4,
          }}
        >
          {COPY[0]} {chapter + 1}/{total}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 28,
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1.12,
          maxWidth: PAGE_W,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 30,
          height: 12,
          width: interpolate(frame, [4, 26], [0, 360], clamp),
          borderRadius: 6,
          background: INK,
        }}
      />
    </div>
  );
};

export const StageView: React.FC<{
  item: StageItem;
  chapters: Chapter[];
  hook?: { big: string; sub?: string };
  at: (srcMs: number) => number;
  title: string;
}> = ({ item, chapters, hook, at, title }) => {
  const frames = item.to - item.from;
  const body = (() => {
    switch (item.kind) {
      case "hook":
        return hook ? <BigFigure big={hook.big} label={hook.sub} /> : null;
      case "slate":
        return (
          <Slate
            chapter={item.chapter}
            total={chapters.length}
            title={chapters[item.chapter]?.title ?? title}
          />
        );
      case "figure":
        return <BigFigure big={item.fig.big} label={item.fig.label} />;
      case "lender":
        return <LenderCard lender={item.lender} />;
      case "cue":
        return <CueView cue={item.cue} t0={item.from} at={at} />;
    }
  })();
  return (
    <Sequence from={item.from} durationInFrames={frames} layout="none">
      <Slot frames={frames}>{body}</Slot>
    </Sequence>
  );
};

// A figure or logo said while a cue has the stage: a small card at the
// bottom-right of the page, above the caption strip.
const ChipBody: React.FC<{ chip: Chip; index: number }> = ({ chip, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const out = interpolate(
    frame,
    [chip.to - chip.from - EXIT, chip.to - chip.from],
    [1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        right: 1920 - PAGE_R,
        bottom: 1080 - STRIP_TOP + 14 + index * 110,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "12px 24px",
        borderRadius: 18,
        background: brand.card,
        boxShadow: `0 10px 30px ${brand.navy}26`,
        borderLeft: `8px solid ${INK}`,
        fontFamily: FONT,
        color: INK,
        opacity: Math.min(p, out),
        transform: `translateX(${(1 - p) * 40}px)`,
      }}
    >
      {chip.kind === "figure" ? (
        <>
          <span style={{ fontSize: 54, fontWeight: 900 }}>{chip.fig.big}</span>
          {chip.fig.label ? (
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: brand.slate,
                maxWidth: 420,
              }}
            >
              {chip.fig.label}
            </span>
          ) : null}
        </>
      ) : (
        <LenderLogo lender={chip.lender} height={56} />
      )}
    </div>
  );
};

export const ChipView: React.FC<{ chip: Chip; index: number }> = ({
  chip,
  index,
}) => (
  <Sequence
    from={chip.from}
    durationInFrames={chip.to - chip.from}
    layout="none"
  >
    <ChipBody chip={chip} index={index} />
  </Sequence>
);

// The chapter heading at the top of the page, from when its slate leaves until
// the chapter ends: "CHƯƠNG 2/4 · Vì sao tăng".
export const ChapterHeading: React.FC<{
  chapters: Chapter[];
  slates: { from: number; to: number }[];
}> = ({ chapters, slates }) => {
  const frame = useCurrentFrame();
  const i = chapters.findIndex((c) => frame >= c.from && frame < c.to);
  if (i < 0 || slates.some((s) => frame >= s.from && frame < s.to)) return null;
  const since = Math.max(
    chapters[i].from,
    ...slates.filter((s) => s.to <= frame).map((s) => s.to),
  );
  const o = interpolate(frame, [since, since + 10], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: PAGE_L,
        top: 84,
        width: 820,
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontFamily: FONT,
        color: INK,
        opacity: o,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          padding: "4px 14px",
          borderRadius: 8,
          background: brand.highlight,
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: 2,
        }}
      >
        {COPY[0]} {i + 1}/{chapters.length}
      </span>
      <span
        style={{
          fontSize: 38,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {chapters[i].title}
      </span>
    </div>
  );
};

// A navy sheet with a gold edge sweeps across the page at each chapter change.
export const PageTurn: React.FC<{ at: number[] }> = ({ at }) => {
  const frame = useCurrentFrame();
  const t = at.find((a) => frame >= a && frame < a + TURN);
  if (t === undefined) return null;
  const x = interpolate(frame - t, [0, TURN], [1920, SIDE_W - SHEET], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        height: STRIP_TOP,
        left: SIDE_W,
        right: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: x - SIDE_W,
          width: SHEET,
          background: `linear-gradient(90deg, ${brand.highlight} 0 14px, ${brand.background} 14px)`,
          transform: "skewX(-8deg)",
          boxShadow: `-30px 0 60px ${brand.navy}55`,
        }}
      />
    </div>
  );
};
