// "calendar" (Lịch, Decision Calendar): a faceless rate-alert video as a
// tear-off wall calendar on an off-white desk. Pure motion graphics, no
// footage. The calendar's top page carries the story: the hook number, a
// `change` (old rate on the page, torn off at swapAtMs to reveal the new one
// with its up/down tag), a date stat (pages flip through and land on the date,
// circled in gold). Other figures are sticky notes on the calendar's edge,
// points a to-do notepad, compare two calendar pages, trend a week planner.
// Captions: navy on a white strip, keywords under a gold highlighter.
// Desk.tsx (look), Page.tsx (the page and its schedule), Cues.tsx (desk cues).
import type { TikTokPage } from "@remotion/captions";
import { fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, clamp, emphasised } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack, type NumbersLook } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { useFontReady } from "../ticker/Board";
import { DeskCueTrack, onDesk } from "./Cues";
import {
  CAL,
  CAL_W,
  CAPTION_BOTTOM,
  CalendarShell,
  DeskBackdrop,
  HeaderBand,
  NAVY,
  PAPER,
  SLATE,
  Sheet,
  flipInStyle,
  highlight,
  useFlipIn,
} from "./Desk";
import { BRAND_KICKER, Calendar, PageSfx } from "./Page";
import { planPage } from "./Plan";
import { CHAPTER_WORD, LENDER_KICKER, Notes, TabLayer } from "./Side";

const NUMBERS: NumbersLook = { change: "swap", trendZoom: 0.84 };

// ------------------------------------------------------------------ cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const ready = useFontReady("calendar cover: Be Vietnam Pro");
  const p = useFlipIn(4);
  const frame = useCurrentFrame();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const inner = CAL_W - 90;
  const size = ready
    ? fitTextOnNLines({
        text: title,
        maxLines: 4,
        maxBoxWidth: inner,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: 88,
      }).fontSize
    : 88;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <DeskBackdrop />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 20,
          background: PAPER,
          boxShadow: "0 10px 30px rgba(11,31,61,0.18)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      {ready ? (
        <CalendarShell
          header={
            <HeaderBand
              left={CAL.left}
              width={CAL_W}
              top={CAL.top}
              height={CAL.head}
              kicker={BRAND_KICKER}
            />
          }
        >
          <Sheet style={flipInStyle(p)}>
            <div
              style={{
                maxWidth: inner,
                textAlign: "center",
                fontWeight: 900,
                fontSize: size,
                lineHeight: 1.28,
              }}
            >
              {words.map((w, i) => (
                <span key={`${w}${i}`}>
                  <span style={highlight(hit.has(i))}>{w}</span>{" "}
                </span>
              ))}
            </div>
            {subtitle ? (
              <div
                style={{
                  marginTop: 24,
                  maxWidth: inner,
                  textAlign: "center",
                  fontSize: 38,
                  fontWeight: 800,
                  color: SLATE,
                  opacity: interpolate(frame, [14, 22], [0, 1], clamp),
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </Sheet>
        </CalendarShell>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the desk is the picture; the voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <DeskBackdrop />
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

// ------------------------------------------------------------------ captions

const Page: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const nowMs = page.startMs + (frame / fps) * 1000;
  const inP = interpolate(frame, [0, 5], [0, 1], clamp);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 46,
          lineHeight: 1.3,
          textAlign: "center",
          padding: "12px 26px",
          background: PAPER,
          borderLeft: `10px solid ${NAVY}`,
          borderRadius: 10,
          boxShadow: "0 12px 30px rgba(11,31,61,0.2)",
          opacity: inP,
          transform: `translateY(${interpolate(inP, [0, 1], [12, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => (
          <span key={t.fromMs}>
            {i > 0 && t.text.startsWith(" ") ? " " : ""}
            <span
              style={{
                color: NAVY,
                opacity: nowMs >= t.fromMs ? 1 : 0.35,
                ...highlight(hit.has(i) && nowMs >= t.fromMs),
              }}
            >
              {t.text.trim()}
            </span>
          </span>
        ))}
      </div>
    </CaptionZone>
  );
};

const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={1000}
    tailMs={300}
    render={(page) => <Page page={page} keywords={keywords} />}
  />
);

// The English line on SAFE.bottom, under the caption strip.
const EnglishLine: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.subtitles ?? []).map((s) => {
        const from = at(s.fromMs);
        return (
          <Sequence
            key={s.fromMs}
            from={from}
            durationInFrames={Math.max(1, at(s.toMs) - from)}
            layout="none"
          >
            <CaptionZone>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 26,
                  lineHeight: 1.25,
                  fontWeight: 600,
                  color: SLATE,
                  textAlign: "center",
                  maxHeight: SAFE.bottom - CAPTION_BOTTOM - 6,
                  overflow: "hidden",
                }}
              >
                {s.text}
              </div>
            </CaptionZone>
          </Sequence>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------------ overlay

// Classic panels for the kinds the desk doesn't draw, mounted only while
// one is up (MotionTrack's film finish would dirty the clean desk).
const RestCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(
    (c) => !onDesk(c) && c.kind !== "change",
  );
  const up = cues.some((c) => frame >= at(c.fromMs) && frame < at(c.toMs));
  const rest = useMemo(
    () => ({
      ...reel,
      edit: { ...reel.edit, cues, stats: [], chapters: [] },
    }),
    [reel, cues],
  );
  return up ? (
    <MotionTrack
      reel={rest}
      panelOffset={CAL.top - 110}
      numbers={NUMBERS}
      leak={false}
    />
  ) : null;
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const plan = useMemo(() => planPage(reel, fps), [reel, fps]);
  return (
    <>
      <Calendar reel={reel} plan={plan} />
      <DeskCueTrack reel={reel} />
      <RestCues reel={reel} />
      <Notes plan={plan} />
      <PageSfx plan={plan} />
      <TabLayer reel={reel} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const calendar: Design = {
  id: "calendar",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    BRAND_KICKER,
    LENDER_KICKER,
    CHAPTER_WORD,
    // classic Outro and MotionTrack strings shown through this design
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
