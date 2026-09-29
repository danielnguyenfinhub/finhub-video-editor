// "ytsidebar" (Mục lục, table of contents): for long explainers where viewers
// want to know where they are. A navy sidebar on the left holds the whole
// table of contents (Sidebar.tsx); the off-white page on the right shows one
// visual at a time (Stage.tsx, Cues.tsx) with the chapter heading on top and
// captions on a white strip at the bottom. A chapter change turns the page.
import { fitText } from "@remotion/layout-utils";
import { fade } from "@remotion/transitions/fade";
import type React from "react";
import { Fragment, useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../../mortgage/design";
import { PacedVideo } from "../../../mortgage/PacedVideo";
import { PagedCaptions } from "../../../mortgage/PagedCaptions";
import { FONT, LOGO, emphasised, enter } from "../../../mortgage/style";
import { YT_SAFE } from "../../frame";
import { CueFallback16, LogoMark16, OUTRO16_COPY, Outro16 } from "../../Kit";
import { CUE_COPY } from "./Cues";
import { INK, PAGE_L, PAGE_W, PAPER, SIDE_W, STRIP_TOP, planOf } from "./Plan";
import { SIDEBAR_COPY, Sidebar } from "./Sidebar";
import { COPY, ChapterHeading, ChipView, PageTurn, StageView } from "./Stage";

const ENGLISH_H = 66; // two lines of the English subtitle
const CAPTION_BOTTOM = 1080 - YT_SAFE.bottom + ENGLISH_H + 6;

// Keywords sit on a gold marker: gold text on white would not read.
const Marked: React.FC<{ words: string[]; keywords: string[] }> = ({
  words,
  keywords,
}) => {
  const hit = emphasised(words, keywords);
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={`${w}${i}`}>
          {w.startsWith(" ") && i ? " " : null}
          <span
            style={
              hit.has(i)
                ? {
                    background: brand.highlight,
                    borderRadius: 8,
                    padding: "0 8px",
                  }
                : undefined
            }
          >
            {w.trim()}
          </span>
        </Fragment>
      ))}
    </>
  );
};

// Pieces of the static set, shared by the cover and the talk.
const Backdrop: React.FC<{ strip?: boolean }> = ({ strip }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDE_W,
        background: brand.background,
        boxShadow: `8px 0 40px ${brand.navy}40`,
      }}
    />
    {strip ? (
      <div
        style={{
          position: "absolute",
          left: SIDE_W,
          right: 0,
          top: STRIP_TOP,
          bottom: 0,
          background: brand.card,
          borderTop: `3px solid ${INK}14`,
        }}
      />
    ) : null}
  </AbsoluteFill>
);

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(/\s+/).filter(Boolean);
  const { fontSize } = fitText({
    text: title,
    withinWidth: PAGE_W * 1.6, // ~two lines
    fontFamily: FONT,
    fontWeight: 900,
  });
  const p = enter(frame, fps, 4);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: YT_SAFE.left,
            top: YT_SAFE.top,
            padding: "10px 18px",
            borderRadius: 16,
            background: brand.card,
          }}
        >
          <Img src={LOGO} style={{ height: 96, display: "block" }} />
        </div>
        <div
          style={{
            position: "absolute",
            left: YT_SAFE.left,
            bottom: 1080 - YT_SAFE.bottom,
            width: SIDE_W - YT_SAFE.left - 44,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 6,
            color: brand.highlight,
          }}
        >
          {SIDEBAR_COPY[0]}
          <div
            style={{
              marginTop: 12,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 0,
              color: brand.textDim,
            }}
          >
            {subtitle}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: PAGE_L,
            width: PAGE_W,
            top: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: INK,
            opacity: p,
            transform: `translateY(${(1 - p) * 30}px)`,
          }}
        >
          <div
            style={{
              fontSize: Math.min(100, fontSize),
              fontWeight: 900,
              lineHeight: 1.18,
            }}
          >
            <Marked
              words={words.map((w, i) => (i ? ` ${w}` : w))}
              keywords={keywords}
            />
          </div>
          <div
            style={{
              marginTop: 40,
              height: 16,
              width: 520 * enter(frame, fps, 14),
              borderRadius: 8,
              background: INK,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <Backdrop strip />
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

const Captions: React.FC<{
  reel: OverlayProps["reel"];
  keywords: string[];
}> = ({ reel, keywords }) => (
  <PagedCaptions
    reel={reel}
    render={(page) => {
      const chars = page.tokens.reduce((n, t) => n + t.text.length, 0);
      const size = chars <= 36 ? 56 : chars <= 76 ? 50 : 42;
      return (
        <div
          style={{
            position: "absolute",
            left: PAGE_L,
            width: PAGE_W,
            bottom: CAPTION_BOTTOM,
            fontFamily: FONT,
            fontSize: size,
            fontWeight: 800,
            lineHeight: 1.22,
            color: INK,
          }}
        >
          <Marked words={page.tokens.map((t) => t.text)} keywords={keywords} />
        </div>
      );
    }}
  />
);

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const plan = useMemo(
    () => planOf(reel, fps, talkFrames),
    [reel, fps, talkFrames],
  );
  const { chapters, at } = plan;
  const slates = plan.stage.filter((s) => s.kind === "slate");
  return (
    <>
      <Sidebar
        title={reel.edit.title}
        chapters={chapters}
        bullets={plan.bullets}
        talkFrames={talkFrames}
      />
      <ChapterHeading chapters={chapters} slates={slates} />
      {plan.stage.map((item) => (
        <StageView
          key={`${item.kind}${item.from}`}
          item={item}
          chapters={chapters}
          hook={reel.edit.hook}
          at={at}
          title={reel.edit.title}
        />
      ))}
      {plan.chips.map((chip, i, all) => (
        <ChipView
          key={`${chip.kind}${chip.from}`}
          chip={chip}
          index={all.slice(0, i).filter((c) => c.to > chip.from).length}
        />
      ))}
      {plan.fallbackKinds.length ? (
        <CueFallback16 reel={reel} kinds={plan.fallbackKinds} />
      ) : null}
      <PageTurn at={chapters.map((c) => c.from).filter((f) => f > 0)} />
      <Captions reel={reel} keywords={keywords} />
      {(reel.edit.subtitles ?? []).map((s) => (
        <Sequence
          key={s.fromMs}
          from={at(s.fromMs)}
          durationInFrames={Math.max(1, at(s.toMs) - at(s.fromMs))}
          layout="none"
        >
          <div
            style={{
              position: "absolute",
              left: PAGE_L,
              width: PAGE_W,
              bottom: 1080 - YT_SAFE.bottom,
              fontFamily: FONT,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.25,
              color: brand.slate,
            }}
          >
            {s.text}
          </div>
        </Sequence>
      ))}
      <LogoMark16 talkFrames={talkFrames} />
    </>
  );
};

export const ytsidebar: Design = {
  id: "ytsidebar",
  Cover,
  Talk,
  Overlay,
  Outro: Outro16,
  // Talk is the same set in every segment, so a plain fade; the visible chapter
  // change is the page turn and the sidebar row opening (Overlay).
  chapterTransition: () =>
    fade() as unknown as ReturnType<Design["chapterTransition"]>,
  copy: [...OUTRO16_COPY, ...SIDEBAR_COPY, ...COPY, ...CUE_COPY],
};
