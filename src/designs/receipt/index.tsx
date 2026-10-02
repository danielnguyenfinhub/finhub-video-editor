// "receipt" (Hoá đơn, Two Receipts): money as a paper receipt on a dark navy
// counter-top. Pure motion graphics, no footage. Thermal paper feeds out of a
// printer slot line by line as things are said: the hook is a receipt whose
// TOTAL is the hook number; `compare` prints a BEFORE and an AFTER receipt
// side by side and a gold difference stamp thumps onto the after one (only
// when the difference is computable); `change` strikes the old total with a
// pen and prints the new one below; `points` is an itemised receipt with a
// tick per item; figures are tear-off stubs; banks a printed slip with the
// logo. Captions on a dark strip under the slot, keywords gold. Paper.tsx
// (look, paper), Rows.tsx (rows, marks), Compare.tsx, Cues.tsx (change,
// points, track), Figures.tsx (stubs, banks), Stage.tsx (plan, hook,
// chapters), Captions.tsx.
import { Audio } from "@remotion/media";
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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
import { FONT, LOGO, emphasised } from "../../mortgage/style";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { Captions, EnglishLine } from "./Captions";
import { DIFF_KICKER } from "./Compare";
import { AFTER_WORD, BEFORE_WORD, ReceiptCueTrack, isOwnCue } from "./Cues";
import {
  FIGURE_KICKER,
  LENDER_KICKER,
  LENDER_SUB,
  YEAR_KICKER,
  DATE_KICKER,
} from "./Figures";
import {
  Counter,
  FADED,
  HEADER,
  INK,
  PrintedReceipt,
  IdleTongue,
  Printer,
  STAGE,
  fit,
  inOrder,
  useFontReady,
  type Line,
} from "./Paper";
import { HEAD_H, HeadLine, Rule } from "./Rows";
import {
  CHAPTER_WORD,
  Chapters,
  StageLayer,
  TOTAL_WORD,
  planOf,
} from "./Stage";

// MotionTrack panels sit at top 110 + offset: start them at the stage top.
const PANEL_OFFSET = STAGE.top - 110;

// ------------------------------------------------------------------ cover

const CW = 820;
const CINNER = CW - 60;

const CoverTitle: React.FC<{ title: string; keywords: string[] }> = ({
  title,
  keywords,
}) => {
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const cap = Math.min(
    96,
    fitText({
      text: title,
      withinWidth: CINNER,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize * 1.8,
  );
  const { size } = fit(title, CINNER, 3, cap, 900);
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.18,
        color: INK,
      }}
    >
      <div>
        {words.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{
              display: "inline-block",
              marginRight: "0.24em",
              padding: "0 4px",
              background: hit.has(i)
                ? "linear-gradient(180deg, transparent 52%, rgba(255,185,56,0.75) 52%)"
                : undefined,
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const ready = useFontReady("receipt cover: Be Vietnam Pro");
  const lines: Line[] = ready
    ? inOrder(
        [
          { key: "head", at: 0, h: HEAD_H, node: <HeadLine /> },
          {
            key: "title",
            at: 0,
            h:
              fit(title, CINNER, 3, 96, 900).lines *
                fit(title, CINNER, 3, 96, 900).size *
                1.18 +
              36,
            node: <CoverTitle title={title} keywords={keywords} />,
          },
          ...(subtitle
            ? [
                {
                  key: "sub",
                  at: 0,
                  h: fit(subtitle, CINNER, 2, 40, 800).lines * 52 + 34,
                  node: (
                    <div style={{ height: "100%", paddingTop: 10 }}>
                      <Rule />
                      <div
                        style={{
                          height: "calc(100% - 10px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          fontSize: fit(subtitle, CINNER, 2, 40, 800).size,
                          fontWeight: 800,
                          color: FADED,
                        }}
                      >
                        {subtitle}
                      </div>
                    </div>
                  ),
                },
              ]
            : []),
        ],
        3,
      )
    : [];
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Counter />
      {ready ? (
        <PrintedReceipt
          x={540 - CW / 2}
          width={CW}
          lines={lines}
          tearAt={16}
          seed="cover"
          pad={30}
        />
      ) : null}
      <Printer />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 24px",
          borderRadius: 20,
          background: "#fff",
          boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ talk

// No footage: the counter-top is the picture. The voice is the transparent
// foreground.webm through PacedVideo, which owns audio and pacing.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <Counter />
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

// ------------------------------------------------------------------ classic cues

type Sfx = { atMs: number; file: string; volume: number };

// Every cue kind but compare/change/points as a classic panel, mounted only
// while it is up (its film vignette would otherwise darken the whole video);
// plus the chapter and stat sounds MotionTrack gives when mounted whole.
const ClassicCues: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const sfx: Sfx[] = [
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
      {(reel.edit.cues ?? [])
        .filter((c) => !isOwnCue(c))
        .map((c) => {
          const from = outFrame(c.fromMs);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
              layout="none"
            >
              <Sequence from={-from} layout="none">
                <MotionTrack
                  reel={{
                    ...reel,
                    edit: { ...reel.edit, cues: [c], chapters: [], stats: [] },
                  }}
                  panelOffset={PANEL_OFFSET}
                  numbers={{ change: "strike", trendZoom: 0.84 }}
                  leak={false}
                />
              </Sequence>
            </Sequence>
          );
        })}
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, outFrame(s.atMs))}
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

// ------------------------------------------------------------------ overlay

const RAMP = 8;

// 1 inside any span, ramped over RAMP frames at each edge.
const levelOf = (spans: [number, number][], n: number): number[] => {
  const l = new Array<number>(n + 1).fill(0);
  for (const [a, b] of spans)
    for (let f = Math.max(0, a); f < Math.min(l.length, b); f++) l[f] = 1;
  for (let f = 1; f < l.length; f++) l[f] = Math.min(l[f], l[f - 1] + 1 / RAMP);
  for (let f = l.length - 2; f >= 0; f--)
    l[f] = Math.max(l[f], l[f + 1] - 1 / RAMP);
  return l;
};

// The printer's LED pulses while the stage is free; the printer steps
// aside while a classic panel covers the stage.
const StagePrinter: React.FC<{ idle: number[]; classic: number[] }> = ({
  idle,
  classic,
}) => {
  const frame = useCurrentFrame();
  return <Printer idle={idle[frame] ?? 0} shown={1 - (classic[frame] ?? 0)} />;
};

const Tongue: React.FC<{ idle: number[] }> = ({ idle }) => {
  const frame = useCurrentFrame();
  return <IdleTongue idle={idle[frame] ?? 0} />;
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const plan = useMemo(() => planOf(reel, fps), [reel, fps]);
  const levels = useMemo(() => {
    const at = outFrameOf(reel.timeline, fps);
    const classic = (reel.edit.cues ?? [])
      .filter((c) => !isOwnCue(c))
      .map((c) => [at(c.fromMs), at(c.toMs)] as [number, number]);
    const busy = levelOf(plan.busy, talkFrames);
    const cls = levelOf(classic, talkFrames);
    // Free stage: nothing prints and no classic panel is up.
    const idle = busy.map((b, f) => Math.min(1 - b, 1 - cls[f]));
    return { busy, classic: cls, idle };
  }, [reel, fps, plan, talkFrames]);
  // The stage measures Be Vietnam Pro (fitTextOnNLines): wait for it.
  const ready = useFontReady("receipt stage: Be Vietnam Pro");
  return (
    <>
      {ready ? <StageLayer reel={reel} plan={plan} /> : null}
      <ReceiptCueTrack reel={reel} />
      <Tongue idle={levels.idle} />
      <Captions
        reel={reel}
        keywords={keywords}
        variant="slip"
        idle={levels.idle}
      />
      <StagePrinter idle={levels.idle} classic={levels.classic} />
      <ClassicCues reel={reel} />
      {ready ? <Chapters reel={reel} plan={plan} /> : null}
      <Captions
        reel={reel}
        keywords={keywords}
        variant="strip"
        idle={levels.idle}
      />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const receipt: Design = {
  id: "receipt",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    HEADER,
    TOTAL_WORD,
    DIFF_KICKER,
    BEFORE_WORD,
    AFTER_WORD,
    FIGURE_KICKER,
    YEAR_KICKER,
    DATE_KICKER,
    LENDER_KICKER,
    LENDER_SUB,
    CHAPTER_WORD,
    // classic Outro and MotionTrack panels (other cue kinds)
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
