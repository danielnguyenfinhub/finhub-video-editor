// "paper" (Giấy cắt): the one LIGHT faceless template. A cream paper desk with
// grain and slowly drifting cut-paper houses, coins and clouds; every element
// lands on it as a sheet of paper (soft shadow, slight tilt, gold washi tape).
// Pure motion graphics: source.mp4's picture is never shown, only the voice
// (the transparent foreground.webm) plays. Captions are navy words on a torn
// white paper strip, keywords marked in gold; they own the middle of the page
// and step down to a lower band whenever the stage holds something.
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type { TikTokPage } from "@remotion/captions";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  random,
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
import { FONT, LOGO, clamp, emphasised, enter } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { PaperCueTrack, drawnHere } from "./Cues";
import {
  CREAM,
  GOLD_PAPER,
  INK,
  NAVY_PAPER,
  PaperCard,
  PaperDesk,
  Tape,
  alpha,
  paperShadow,
  tornEdge,
  useFontReady,
} from "./Desk";
import {
  ChapterTabs,
  ENGLISH_ROOM,
  EnglishSlip,
  STAGE,
  STAGE_W,
  StageLayer,
  busyFrames,
} from "./Stage";

const RAMP_FRAMES = 8;
const BIG = 76;
const SMALL = 52;
// Caption strip's bottom edge (a y coordinate): centre of the stage when it
// is free, just above the English slip when it is busy.
const FREE_BOTTOM = (STAGE.top + STAGE.bottom) / 2 + BIG;
const LOW_BOTTOM = SAFE.bottom - ENGLISH_ROOM;

// ------------------------------------------------------------- cover

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("paper cover: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? Math.min(
        104,
        fitText({
          text: title,
          withinWidth: STAGE_W - 120,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <PaperDesk />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          right: 1080 - SAFE.right,
          padding: "14px 22px",
          borderRadius: 10,
          background: brand.card,
          boxShadow: paperShadow(),
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      {ready ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: STAGE_W,
            top: STAGE.top + 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <PaperCard background={NAVY_PAPER} rotate={-2} exitFrames={0}>
            <Tape
              width={190}
              rotate={-5}
              style={{ top: -20, left: 40 }}
              delay={10}
            />
            <div
              style={{
                padding: "56px 50px 50px",
                width: STAGE_W - 20,
                textAlign: "center",
                fontSize: size,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {words.map((w, i) => (
                <span
                  key={`${w}${i}`}
                  style={{
                    display: "inline-block",
                    marginRight: "0.25em",
                    color: hit.has(i) ? GOLD_PAPER : CREAM,
                    opacity: enter(frame, fps, 6 + i * 3),
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </PaperCard>
          <div style={{ marginTop: 30, maxWidth: STAGE_W - 60 }}>
            <PaperCard rotate={1.5} delay={14} exitFrames={0} torn="cover-sub">
              <div
                style={{
                  padding: "24px 44px",
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  color: INK,
                  textAlign: "center",
                }}
              >
                {subtitle}
              </div>
            </PaperCard>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- talk

// No footage: the paper desk, the design's Behind layer (none), and the voice.
// foreground.webm is fully transparent, so no one is on screen.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <PaperDesk />
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

// ------------------------------------------------------------- captions

const Word: React.FC<{
  text: string;
  hit: boolean;
  spoken: boolean;
  hop: number;
}> = ({ text, hit, spoken, hop }) => (
  <span
    style={{
      display: "inline-block",
      padding: hit ? "0 0.12em" : undefined,
      margin: hit ? "0 -0.04em" : undefined,
      // A gold highlighter stroke behind a keyword or number.
      background: hit
        ? `linear-gradient(180deg, transparent 18%, ${alpha(brand.highlight, spoken ? 0.9 : 0.3)} 18% 86%, transparent 86%)`
        : undefined,
      color: INK,
      opacity: spoken ? 1 : 0.34,
      transform: `translateY(${hop}px)`,
    }}
  >
    {text}
  </span>
);

const Page: React.FC<{
  page: TikTokPage;
  keywords: string[];
  from: number;
  level: number[];
}> = ({ page, keywords, from, level }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const low = level[from + frame] ?? 0;
  const size = interpolate(low, [0, 1], [BIG, SMALL]);
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const nowMs = page.startMs + (frame / fps) * 1000;
  const inP = enter(frame, fps);
  const tilt = (random(page.startMs) - 0.5) * 2.4;
  return (
    <CaptionZone bottom={interpolate(low, [0, 1], [FREE_BOTTOM, LOW_BOTTOM])}>
      <div
        style={{
          maxWidth: STAGE_W,
          filter: `drop-shadow(0 8px 12px ${alpha(brand.navy, 0.18)})`,
          opacity: interpolate(inP, [0, 0.4], [0, 1], clamp),
          transform: `translateY(${(1 - inP) * 30}px) rotate(${tilt}deg)`,
        }}
      >
        <div
          style={{
            background: brand.card,
            clipPath: tornEdge(`cap${page.startMs}`, 40, 3),
            padding: `${size * 0.42}px ${size * 0.55}px`,
            textAlign: "center",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.28,
          }}
        >
          {page.tokens.map((t, i) => {
            const start = Math.round(((t.fromMs - page.startMs) / 1000) * fps);
            const hop = interpolate(
              frame - start,
              [0, 5, 12],
              [0, -10, 0],
              clamp,
            );
            return (
              <span key={t.fromMs}>
                {i > 0 && t.text.startsWith(" ") ? " " : ""}
                <Word
                  text={t.text.trim()}
                  hit={hit.has(i)}
                  spoken={nowMs >= t.fromMs}
                  hop={hop}
                />
              </span>
            );
          })}
        </div>
      </div>
    </CaptionZone>
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

// MotionTrack's sounds for stats and chapters, for videos that don't mount it.
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

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const level = useBusyLevel(reel, talkFrames);
  // Cue kinds this design doesn't draw go to the classic MotionTrack (navy
  // panels, readable on the cream), placed on the stage. It is mounted only
  // when such a cue exists: its film finish darkens the page's corners.
  const others = (reel.edit.cues ?? []).filter((c) => !drawnHere(c));
  return (
    <>
      {others.length ? (
        <MotionTrack
          reel={{ ...reel, edit: { ...reel.edit, cues: others } }}
          panelOffset={STAGE.top - 110}
          leak={false}
        />
      ) : (
        <StatChapterSfx reel={reel} />
      )}
      <StageLayer reel={reel} />
      <PaperCueTrack reel={reel} />
      <ChapterTabs reel={reel} />
      <PagedCaptions
        reel={reel}
        combineWithinMs={1100}
        tailMs={300}
        render={(page, from) => (
          <Page page={page} keywords={keywords} from={from} level={level} />
        )}
      />
      <EnglishSlip reel={reel} />
      <LogoMark
        talkFrames={talkFrames}
        style={{ borderRadius: 10, boxShadow: paperShadow() }}
      />
    </>
  );
};

export const paper: Design = {
  id: "paper",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "ĐANG NHẮC TỚI",
    "PHẦN",
    "VS",
    // classic Outro
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
