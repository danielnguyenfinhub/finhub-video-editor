// "ytcinema" (Điện ảnh): a documentary explainer in a 2.4:1 letterbox. A
// graded navy-to-black stage with drifting light, grain and vignette; titles,
// huge figures with a thin gold rule, gold-line charts; film chapter cards
// with a marker and running-time hairline in the top bar; understated
// subtitles on the lower bar. Slow fades throughout, calm enough for 10 min.
import { fitText } from "@remotion/layout-utils";
import { fade } from "@remotion/transitions/fade";
import type React from "react";
import { Fragment } from "react";
import {
  AbsoluteFill,
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
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
} from "../../../mortgage/golden";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import { PacedVideo } from "../../../mortgage/PacedVideo";
import { PagedCaptions } from "../../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../../mortgage/schema";
import { FONT, emphasised } from "../../../mortgage/style";
import { YT_HEIGHT, YT_SAFE } from "../../frame";
import { CueFallback16, LogoMark16, OUTRO16_COPY, Outro16 } from "../../Kit";
import {
  CHAPTER_WORD,
  ChapterCards,
  ChapterMarker,
  slatesOf,
  type Slate,
} from "./Chapters";
import { CinemaCues, POINTS_WORD } from "./Cues";
import { Filler } from "./Filler";
import {
  Backdrop,
  GOLD,
  IMG_BOTTOM,
  IMG_TOP,
  LEFT,
  Letterbox,
  Rule,
  WIDE,
  caps,
  slow,
  tail,
} from "./Stage";

const PRESENTS = "Finance Hub";
const FALLBACK = ["kinetic", "verdict", "venn", "emoji", "lenders"];
const MID = (IMG_TOP + IMG_BOTTOM) / 2;
const MIN_FIGURE = 60;

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const f = useCurrentFrame();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const { fontSize } = fitText({
    text: title,
    withinWidth: 1480,
    fontFamily: FONT,
    fontWeight: 800,
  });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...caps(28), opacity: slow(f, 0, 16) }}>{PRESENTS}</div>
        <div
          style={{
            width: 1480,
            marginTop: 22,
            textAlign: "center",
            fontSize: Math.min(104, fontSize),
            fontWeight: 800,
            lineHeight: 1.22,
            color: brand.text,
            transform: `scale(${1 + f * 0.0006})`,
          }}
        >
          {words.map((w, i) => (
            <Fragment key={`${w}${i}`}>
              <span
                style={{
                  color: hit.has(i) ? GOLD : brand.text,
                  opacity: slow(f, 4 + i * 3, 18),
                }}
              >
                {w}
              </span>{" "}
            </Fragment>
          ))}
        </div>
        <Rule p={slow(f, 14, 40)} width={620} style={{ marginTop: 36 }} />
        <div
          style={{
            ...caps(26, brand.textDim),
            marginTop: 30,
            opacity: slow(f, 24, 20),
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
      <Letterbox />
    </AbsoluteFill>
  );
};

const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <Backdrop />
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

// A figure fades up centre stage with a slow push-in over a thin gold rule.
const Figure: React.FC<{ big: string; label?: string; dur: number }> = ({
  big,
  label,
  dur,
}) => {
  const f = useCurrentFrame();
  const p = slow(f, 0, 22);
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        width: WIDE,
        top: MID,
        textAlign: "center",
        opacity: p * tail(f, dur, 14),
        transform: `translateY(calc(-50% + ${(1 - p) * 26}px)) scale(${1 + f * 0.0008})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 230,
          fontWeight: 800,
          lineHeight: 1.05,
          color: brand.text,
          letterSpacing: "-0.01em",
        }}
      >
        {big}
      </div>
      <Rule
        p={slow(f, 10, 34)}
        width={460}
        style={{ margin: "26px auto 22px" }}
      />
      {label ? <div style={caps(30, brand.textDim)}>{label}</div> : null}
    </div>
  );
};

// A figure said while a cue holds the stage: a quiet chip, top right.
const Chip: React.FC<{ big: string; label?: string; dur: number }> = ({
  big,
  label,
  dur,
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        right: YT_SAFE.left,
        top: IMG_TOP + 60,
        textAlign: "right",
        paddingRight: 22,
        borderRight: `2px solid ${GOLD}`,
        opacity: slow(f, 0, 16) * tail(f, dur, 12),
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 64,
          fontWeight: 800,
          color: GOLD,
          lineHeight: 1.1,
        }}
      >
        {big}
      </div>
      {label ? <div style={caps(20, brand.textDim)}>{label}</div> : null}
    </div>
  );
};

type Placed = {
  from: number;
  frames: number;
  big: string;
  label: string;
  chip: boolean;
};

// Every figure gets a visual: after the hook, never under a chapter card
// (it waits for the card to dissolve away), a chip while a cue holds the stage.
const placeFigures = (reel: Reel, fps: number, slates: Slate[]): Placed[] => {
  const at = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).map(
    (c) => [at(c.fromMs), at(c.toMs)] as const,
  );
  const hook = reel.edit.hook ? HOOK_FRAMES : 0;
  const inCue = (f: number) => cues.some(([a, b]) => f >= a && f < b);
  const nextCueAfter = (f: number) =>
    Math.min(...cues.map(([a]) => a).filter((a) => a > f), Infinity);
  const wanted = figuresOf(reel, fps)
    .map((g) => {
      let from = Math.max(g.fromFrame, hook);
      const s = slates.find((x) => from >= x.from && from < x.from + x.frames);
      if (s) from = Math.max(from, s.from + s.frames);
      return { g, from, end: g.fromFrame + g.frames };
    })
    .sort((a, b) => a.from - b.from);
  // Two lanes, the big centre figure and the top-right chip. Figures that
  // waited for the same card (or the hook) would start together and draw over
  // each other, so each lane is a queue: the next waits until the one before
  // has held MIN_FIGURE, which then gives way. A figure pushed into a cue's
  // span becomes a chip; a big figure never runs into the next cue.
  const out: Placed[] = [];
  const last: { big?: number; chip?: number } = {};
  for (const { g, from: start, end } of wanted) {
    const laneOf = (f: number): "big" | "chip" => (inCue(f) ? "chip" : "big");
    let lane = laneOf(start);
    let from = start;
    const prevIndex = last[lane];
    if (prevIndex !== undefined) {
      const prev = out[prevIndex];
      if (from < prev.from + prev.frames) {
        from = Math.max(from, prev.from + MIN_FIGURE);
        out[prevIndex] = { ...prev, frames: Math.min(prev.frames, from - prev.from) };
        lane = laneOf(from);
      }
    }
    const limit = lane === "big" ? nextCueAfter(from) : Infinity;
    const frames = Math.min(Math.max(MIN_FIGURE, end - from), limit - from);
    if (frames <= 0) continue;
    last[lane] = out.length;
    out.push({
      from,
      frames,
      big: g.big,
      label: g.label,
      chip: lane === "chip",
    });
  }
  return out;
};

const idleWindows = (busy: [number, number][], total: number) => {
  const sorted = [...busy].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cursor = 0;
  for (const [a, b] of sorted) {
    if (a - cursor >= 45) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (total - cursor >= 45) out.push([cursor, total]);
  return out;
};

const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    render={(page) => {
      const texts = page.tokens.map((t) => t.text);
      const hit = emphasised(texts, keywords);
      const { fontSize } = fitText({
        text: texts.join("").trim(),
        withinWidth: WIDE - 40,
        fontFamily: FONT,
        fontWeight: 600,
      });
      return (
        <div
          style={{
            position: "absolute",
            left: LEFT,
            width: WIDE,
            bottom: YT_HEIGHT - YT_SAFE.bottom + 40,
            textAlign: "center",
            whiteSpace: "nowrap",
            fontFamily: FONT,
            fontSize: Math.min(54, Math.floor(fontSize * 0.97)),
            fontWeight: 600,
            lineHeight: 1.25,
            color: brand.text,
            textShadow: `0 2px 10px ${brand.navy}`,
          }}
        >
          {page.tokens.map((t, i) => (
            <span
              key={t.fromMs}
              style={{ color: hit.has(i) ? GOLD : brand.text }}
            >
              {t.text}
            </span>
          ))}
        </div>
      );
    }}
  />
);

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const hook = reel.edit.hook;
  const slates = slatesOf(reel, fps, talkFrames);
  const figures = placeFigures(reel, fps, slates);
  const busy: [number, number][] = [
    ...(hook ? [[0, HOOK_FRAMES] as [number, number]] : []),
    ...slates.map((s) => [s.from, s.from + s.frames] as [number, number]),
    ...figures
      .filter((g) => !g.chip)
      .map((g) => [g.from, g.from + g.frames] as [number, number]),
    ...(reel.edit.cues ?? []).map(
      (c) => [at(c.fromMs), at(c.toMs)] as [number, number],
    ),
  ];
  const idle = idleWindows(busy, talkFrames);
  return (
    <>
      <Filler reel={reel} keywords={keywords} windows={idle} slates={slates} />
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <Figure big={hook.big} label={hook.sub} dur={HOOK_FRAMES} />
        </Sequence>
      ) : null}
      {figures.map((g) => (
        <Sequence
          key={`${g.from}${g.big}`}
          from={g.from}
          durationInFrames={g.frames}
          layout="none"
        >
          {g.chip ? (
            <Chip big={g.big} label={g.label} dur={g.frames} />
          ) : (
            <Figure big={g.big} label={g.label} dur={g.frames} />
          )}
        </Sequence>
      ))}
      <CinemaCues reel={reel} />
      <CueFallback16 reel={reel} kinds={FALLBACK} />
      <Letterbox />
      <ChapterMarker slates={slates} talkFrames={talkFrames} />
      {lenderMentionsOf(reel).map((m) => {
        const dur = Math.max(
          75,
          Math.round(((m.endMs - m.startMs) / 1000) * fps),
        );
        return (
          <Sequence
            key={m.startMs}
            from={Math.round((m.startMs / 1000) * fps)}
            durationInFrames={dur}
            layout="none"
          >
            <LenderSlot dur={dur}>
              <LenderLogo lender={m.lender} height={40} />
            </LenderSlot>
          </Sequence>
        );
      })}
      <LogoMark16 talkFrames={talkFrames} />
      <ChapterCards slates={slates} />
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
              left: LEFT,
              width: WIDE,
              bottom: YT_HEIGHT - YT_SAFE.bottom,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontFamily: FONT,
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: brand.textDim,
            }}
          >
            {s.text}
          </div>
        </Sequence>
      ))}
    </>
  );
};

// Lender logos sit centred in the top letterbox bar, clear of the picture.
const LenderSlot: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: YT_SAFE.top,
        display: "flex",
        justifyContent: "center",
        opacity: slow(f, 0, 14) * tail(f, dur, 12),
      }}
    >
      {children}
    </div>
  );
};

export const ytcinema: Design = {
  id: "ytcinema",
  Cover,
  Talk,
  Overlay,
  Outro: Outro16,
  // Every chapter change is a slow cross-dissolve; the chapter card is the cut.
  chapterTransition: () =>
    fade() as unknown as ReturnType<Design["chapterTransition"]>,
  copy: [PRESENTS, CHAPTER_WORD, POINTS_WORD, ...OUTRO16_COPY],
};
