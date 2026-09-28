// "whiteboard" (Bảng trắng): the classic whiteboard-animation explainer for
// faceless videos. A glossy white board in an aluminium frame, with faint
// ghosts of erased marker and a marker tray; everything is DRAWN in marker as
// the voice speaks: the hook headline written then underlined twice, numbers
// written large and circled or boxed beside a doodle (house, coins, calendar,
// percent, bank, trend arrow), a bank's logo taped on, points as a
// hand-numbered list ticked one by one, compare as the board split by a drawn
// line with "VS" circled. Between those, each caption page gets a small doodle
// of its own. Captions are navy marker words, keywords under a gold
// highlighter swipe. Pure motion graphics: source.mp4's picture is never
// shown, only the voice (the transparent foreground.webm) plays.
// Board.tsx (board, marker, doodles), Stage.tsx (hook, figures, lender,
// chapter, English line), Cues.tsx (points, compare).
import { Audio } from "@remotion/media";
import type { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
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
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import {
  BLUE,
  DrawnIcon,
  GOLD,
  INK,
  MarkerUnderline,
  SOFT,
  Whiteboard,
  Written,
  alpha,
  iconFor,
  swipe,
  useDraw,
  useFontReady,
  type IconName,
} from "./Board";
import { BoardCueTrack, drawnHere } from "./Cues";
import {
  ChapterNotes,
  ENGLISH_ROOM,
  EnglishLine,
  STAGE,
  STAGE_W,
  StageLayer,
  busyFrames,
} from "./Stage";

const RAMP_FRAMES = 8;
const BIG = 70;
const SMALL = 50;
// Caption block's bottom edge: the lower half of the stage when it is free
// (a doodle sits above it), just above the English line when it is busy.
const FREE_BOTTOM = STAGE.bottom;
const LOW_BOTTOM = SAFE.bottom - ENGLISH_ROOM;
const DOODLE = 250;
const FALLBACK: IconName[] = ["house", "arrow", "coins"];

// ------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const ready = useFontReady("whiteboard cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const house = useDraw(0, 22);
  const hl = useDraw(24, 14);
  const size = ready
    ? Math.min(
        104,
        fitText({
          text: title,
          withinWidth: STAGE_W - 60,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Whiteboard t={0} />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          right: 1080 - SAFE.right,
          padding: "14px 22px",
          borderRadius: 8,
          background: brand.card,
          boxShadow: `0 6px 16px ${alpha(brand.navy, 0.2)}`,
          transform: "rotate(1.5deg)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <DrawnIcon
        icon="house"
        size={200}
        progress={house}
        color={BLUE}
        style={{ position: "absolute", left: 540 - 100, top: STAGE.top }}
      />
      {ready ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: STAGE_W,
            top: STAGE.top + 250,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <Written frames={22}>
              <div
                style={{
                  fontSize: size,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  textAlign: "center",
                  color: INK,
                }}
              >
                {words.map((w, i) => (
                  <span
                    key={`${w}${i}`}
                    style={{
                      display: "inline-block",
                      marginRight: "0.25em",
                      ...(hit.has(i) ? swipe(hl, GOLD, 0.7) : {}),
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </Written>
            <MarkerUnderline
              at={20}
              color={BLUE}
              width={9}
              second
              seed="cover"
            />
          </div>
          <Written at={30} frames={16} style={{ marginTop: 70 }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.3,
                color: SOFT,
                textAlign: "center",
              }}
            >
              {subtitle}
            </div>
          </Written>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- talk

// No footage: the board, the design's Behind layer (none), and the voice.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Whiteboard t={seg.outFrom + frame} />
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
};

// ------------------------------------------------------------- captions

const Page: React.FC<{
  page: TikTokPage;
  index: number;
  keywords: string[];
  from: number;
  level: number[];
}> = ({ page, index, keywords, from, level }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const low = level[from + frame] ?? 0;
  const size = interpolate(low, [0, 1], [BIG, SMALL]);
  const words = page.tokens.map((t) => t.text);
  const hit = emphasised(words, keywords);
  const nowMs = page.startMs + (frame / fps) * 1000;
  const doodle = useDraw(2, 26);
  const icon = iconFor(words.join(""), FALLBACK[index % FALLBACK.length]);
  return (
    <>
      {low < 1 ? (
        <DrawnIcon
          icon={icon}
          size={DOODLE}
          progress={doodle}
          color={BLUE}
          style={{
            position: "absolute",
            left: 540 - DOODLE / 2,
            top: STAGE.top + 60,
            opacity: 1 - low,
          }}
        />
      ) : null}
      <CaptionZone bottom={interpolate(low, [0, 1], [FREE_BOTTOM, LOW_BOTTOM])}>
        <div
          style={{
            maxWidth: STAGE_W,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.3,
            color: INK,
          }}
        >
          {page.tokens.map((t, i) => {
            const start = Math.round(((t.fromMs - page.startMs) / 1000) * fps);
            const p = interpolate(frame - start, [0, 8], [0, 1], clamp);
            const spoken = nowMs >= t.fromMs;
            return (
              <span key={t.fromMs}>
                {i > 0 && t.text.startsWith(" ") ? " " : ""}
                <span
                  style={{
                    display: "inline-block",
                    color: spoken ? INK : alpha(INK, 0.3),
                    ...(hit.has(i) ? swipe(p, GOLD, 0.7) : {}),
                  }}
                >
                  {t.text.trim()}
                </span>
              </span>
            );
          })}
        </div>
      </CaptionZone>
    </>
  );
};

// Per talk frame: 1 while something holds the stage, ramped each way.
const useBusyLevel = (reel: Reel, talkFrames: number): number[] => {
  const { fps } = useVideoConfig();
  return useMemo(() => {
    const l = new Array<number>(talkFrames + 1).fill(0);
    for (const [a, b] of busyFrames(reel, fps))
      for (let f = Math.max(0, a); f < Math.min(l.length, b); f++) l[f] = 1;
    const step = 1 / RAMP_FRAMES;
    for (let f = 1; f < l.length; f++) l[f] = Math.min(l[f], l[f - 1] + step);
    for (let f = l.length - 2; f >= 0; f--)
      l[f] = Math.max(l[f], l[f + 1] - step);
    return l;
  }, [reel, fps, talkFrames]);
};

// ------------------------------------------------------------- overlay

// MotionTrack's sounds for stats and chapters (it is mounted only during its
// own cues, so it never plays them here).
const StatChapterSfx: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const sfx = [
    ...(reel.edit.chapters ?? []).map((c) => ({
      atMs: c.atMs - 250,
      file: "whoosh",
      volume: 0.35,
    })),
    ...(reel.edit.stats ?? []).map((s) => ({
      atMs: s.atMs,
      file: "ding",
      volume: 0.22,
    })),
  ];
  return (
    <>
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, at(s.atMs))}
          durationInFrames={fps * 3}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${s.file}.wav`)}
            volume={() => s.volume}
          />
        </Sequence>
      ))}
    </>
  );
};

// Cue kinds the board doesn't draw go to the classic MotionTrack (navy
// panels, readable on white), mounted only while one of them is up: its film
// finish darkens the board's corners.
const OtherCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const others = (reel.edit.cues ?? []).filter((c) => !drawnHere(c));
  if (!others.some((c) => frame >= at(c.fromMs) && frame < at(c.toMs)))
    return null;
  return (
    <MotionTrack
      reel={{
        ...reel,
        edit: { ...reel.edit, cues: others, stats: [], chapters: [] },
      }}
      panelOffset={STAGE.top - 110}
      leak={false}
    />
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const level = useBusyLevel(reel, talkFrames);
  return (
    <>
      <OtherCues reel={reel} />
      <StatChapterSfx reel={reel} />
      <StageLayer reel={reel} />
      <BoardCueTrack reel={reel} />
      <ChapterNotes reel={reel} />
      <PagedCaptions
        reel={reel}
        combineWithinMs={1100}
        tailMs={300}
        render={(page, from) => (
          <Page
            page={page}
            index={from}
            keywords={keywords}
            from={from}
            level={level}
          />
        )}
      />
      <EnglishLine reel={reel} />
      <LogoMark
        talkFrames={talkFrames}
        style={{
          borderRadius: 8,
          boxShadow: `0 6px 16px ${alpha(brand.navy, 0.2)}`,
        }}
      />
    </>
  );
};

export const whiteboard: Design = {
  id: "whiteboard",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "ĐANG NHẮC TỚI",
    "PHẦN",
    "VS",
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
