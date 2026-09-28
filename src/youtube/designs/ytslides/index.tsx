// "ytslides" (Trình chiếu): a crisp keynote deck. White slides under a navy
// title bar with the chapter tabs, a 12-column grid, one slide per beat
// (title, section divider, big number, bullets, comparison, change, chart,
// bank, spoken statement) pushed in and out, captions in a light strip with
// the slide counter. The deck is planned once per frame in Plan.ts.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../../mortgage/design";
import { PacedVideo } from "../../../mortgage/PacedVideo";
import { PagedCaptions } from "../../../mortgage/PagedCaptions";
import { outFrameOf, type Cue } from "../../../mortgage/schema";
import { FONT, LOGO, enter } from "../../../mortgage/style";
import { chapterTransition } from "../../../mortgage/transitions";
import { YT_SAFE } from "../../frame";
import { CueFallback16, LogoMark16, OUTRO16_COPY, Outro16 } from "../../Kit";
import { CaptionPage, Chips, EnglishLine } from "./Captions";
import { BarsSlide, CHARTS_COPY, ChangeSlide } from "./Charts";
import { CompareSlide } from "./Compare";
import { TrendSlide } from "./Trend";
import {
  BAR_H,
  GOLD,
  INK,
  MIST,
  Marked,
  NAVY,
  PAPER,
  Push,
  SLATE,
  STRIP_TOP,
  Strip,
  TitleBar,
  colX,
  span,
} from "./Chrome";
import { DRAWN, buildDeck, chapterAt, type Deck, type Slide } from "./Plan";
import {
  DIVIDER_COPY,
  DividerSlide,
  LenderSlide,
  NumberSlide,
  PointsSlide,
  SLIDES_COPY,
  StatementSlide,
} from "./Slides";

const FALLBACK_KINDS = [
  "kinetic",
  "verdict",
  "venn",
  "emoji",
  "lenders",
].filter((k) => !DRAWN.includes(k));

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps, 4);
  const { fontSize } = fitText({
    text: title,
    withinWidth: span(10),
    fontFamily: FONT,
    fontWeight: 900,
  });
  return (
    <AbsoluteFill style={{ background: PAPER, fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: BAR_H,
          background: NAVY,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 1920,
            height: 5,
            background: GOLD,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: YT_SAFE.left,
            top: YT_SAFE.top,
            padding: "10px 18px",
            borderRadius: 14,
            background: PAPER,
          }}
        >
          <Img src={LOGO} style={{ height: 96, display: "block" }} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: STRIP_TOP,
          width: 1920,
          height: 1080 - STRIP_TOP,
          background: MIST,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: colX(0),
          width: span(10),
          top: BAR_H,
          height: STRIP_TOP - BAR_H,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: p,
          transform: `translateX(${(1 - p) * 60}px)`,
        }}
      >
        <div
          style={{
            width: 160,
            height: 10,
            borderRadius: 5,
            background: GOLD,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            fontSize: Math.min(104, fontSize * 1.9),
            fontWeight: 900,
            color: INK,
            lineHeight: 1.2,
          }}
        >
          <Marked
            words={title.split(/\s+/).filter(Boolean)}
            keywords={keywords}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: colX(0),
          bottom: 1080 - YT_SAFE.bottom + 40,
          fontSize: 40,
          fontWeight: 700,
          color: SLATE,
          opacity: enter(frame, fps, 14),
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    {behind}
    <PacedVideo
      seg={seg}
      src={src}
      look={look}
      foreground={foreground}
      backdrop="none"
    />
  </AbsoluteFill>
);

const cueTitle = (c: Cue): string | undefined => {
  switch (c.kind) {
    case "points":
    case "trend":
    case "bars":
      return c.title;
    case "compare":
      return SLIDES_COPY[0];
    case "change":
      return c.label;
    default:
      return undefined;
  }
};

const titleOf = (
  s: Slide,
  deck: Deck,
  fallback: string,
): string | undefined => {
  const chapter = deck.chapters.length
    ? deck.chapters[chapterAt(deck, s.from)].title
    : fallback;
  if (s.kind === "title") return fallback;
  if (s.kind === "divider") return undefined;
  if (s.kind === "lender") return s.lender?.name;
  if (s.kind === "cue" && s.cue) return cueTitle(s.cue) ?? chapter;
  return chapter;
};

const Body: React.FC<{ s: Slide; deck: Deck; at: (ms: number) => number }> = ({
  s,
  deck,
  at,
}) => {
  if ((s.kind === "title" || s.kind === "figure") && s.figure)
    return <NumberSlide big={s.figure.big} label={s.figure.label} />;
  if (s.kind === "divider")
    return (
      <DividerSlide
        index={s.chapter ?? 0}
        titles={deck.chapters.map((c) => c.title)}
      />
    );
  if (s.kind === "lender" && s.lender) return <LenderSlide lender={s.lender} />;
  if (s.kind === "statement") return <StatementSlide />;
  const c = s.cue;
  if (s.kind !== "cue" || !c) return null;
  if (c.kind === "points") return <PointsSlide cue={c} at={at} from={s.from} />;
  if (c.kind === "compare")
    return <CompareSlide cue={c} at={at} from={s.from} />;
  if (c.kind === "change") return <ChangeSlide cue={c} at={at} from={s.from} />;
  if (c.kind === "trend") return <TrendSlide cue={c} />;
  if (c.kind === "bars") return <BarsSlide cue={c} at={at} from={s.from} />;
  return null;
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const deck = buildDeck(reel, fps, talkFrames);
  const fallback = reel.edit.title;
  return (
    <>
      <TitleBar deck={deck} fallback={fallback} />
      {deck.slides.map((s) => (
        <Push
          key={`${s.kind}${s.from}`}
          from={s.from}
          to={s.to}
          title={titleOf(s, deck, fallback)}
        >
          <Body s={s} deck={deck} at={at} />
        </Push>
      ))}
      <Chips chips={deck.chips} />
      <Strip deck={deck} talkFrames={talkFrames} />
      <CueFallback16 reel={reel} kinds={FALLBACK_KINDS} />
      <PagedCaptions
        reel={reel}
        combineWithinMs={2000} // longer pages: a 16:9 strip holds two full lines
        render={(page, from) => (
          <CaptionPage
            page={page}
            from={from}
            deck={deck}
            keywords={keywords}
          />
        )}
      />
      {(reel.edit.subtitles ?? []).map((s) => (
        <Sequence
          key={s.fromMs}
          from={at(s.fromMs)}
          durationInFrames={Math.max(1, at(s.toMs) - at(s.fromMs))}
          layout="none"
        >
          <EnglishLine text={s.text} />
        </Sequence>
      ))}
      <LogoMark16 talkFrames={talkFrames} />
    </>
  );
};

export const ytslides: Design = {
  id: "ytslides",
  Cover,
  Talk,
  Overlay,
  Outro: Outro16,
  chapterTransition,
  copy: [...OUTRO16_COPY, ...DIVIDER_COPY, ...SLIDES_COPY, ...CHARTS_COPY],
};
