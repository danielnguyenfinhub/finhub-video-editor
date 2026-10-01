// The "bigdigit" stage pieces (hook, figure, bank, chip) and the track that
// mounts them, the own cues and the classic panels on Plan.ts's schedule.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  HOOK_FRAMES,
  SAFE,
  type Figure,
  saidKind,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import {
  ChangeStage,
  Kicker,
  Label,
  NUM_TOP,
  isOwnCue,
  type OwnCue,
} from "./Cues";
import { planOf, type CueSlot, type Item } from "./Plan";
import { CompareStage, PointsStage, TrendStage } from "./Tables";
import {
  Assemble,
  CHIP,
  Caps,
  HAIR,
  INK,
  PUSH,
  STAGE,
  W,
  ease,
  fadeOut,
  giantSize,
  useFontReady,
} from "./Paper";

export const HOOK_KICKER = "TIN NHANH";
export const FIGURE_KICKER = "CON SỐ";
export const YEAR_KICKER = "NĂM";
export const DATE_KICKER = "NGÀY";
// A year or a date is not "the number" of anything (recheck 09): its own
// neutral word, shown as said (golden rule 1).
export const kickerOf = (big: string): string => {
  const kind = saidKind(big);
  return kind === "year"
    ? YEAR_KICKER
    : kind === "date"
      ? DATE_KICKER
      : FIGURE_KICKER;
};
export const LENDER_KICKER = "ĐANG NHẮC TỚI";
export const LENDER_SUB = "Ngân hàng";

const H = STAGE.bottom - STAGE.top;

// ------------------------------------------------------------- stage pieces

const Frame: React.FC<{ frames: number; children: React.ReactNode }> = ({
  frames,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: STAGE.top,
        width: W,
        height: H,
        fontFamily: FONT,
        color: INK,
        opacity: Math.min(
          interpolate(frame, [0, 6], [0, 1], clamp),
          fadeOut(frame, frames),
        ),
      }}
    >
      {children}
    </div>
  );
};

// The giant number, pushed in slowly while it holds. Callers fit it to
// W / PUSH so the full push still ends inside SAFE.
const Giant: React.FC<{
  text: string;
  size: number;
  frames: number;
  at?: number;
}> = ({ text, size, frames, at = 4 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: NUM_TOP,
        transform: `scale(${interpolate(frame, [0, frames], [1, PUSH])})`,
        transformOrigin: "0% 100%",
      }}
    >
      <Assemble text={text} size={size} at={at} />
    </div>
  );
};

const HookStage: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const size = giantSize([hook.big], W / PUSH, 300);
  return (
    <Frame frames={HOOK_FRAMES}>
      <Kicker text={HOOK_KICKER} />
      <Giant text={hook.big} size={size} frames={HOOK_FRAMES} at={3} />
      {hook.sub ? <Label text={hook.sub} at={20} /> : null}
    </Frame>
  );
};

// A stat is the giant; an automatic figure the same language at half size.
const FigureStage: React.FC<{ figure: Figure; frames: number }> = ({
  figure,
  frames,
}) => {
  const max = figure.source === "stat" ? 300 : 150;
  const size = giantSize([figure.big], W / PUSH, max);
  return (
    <Frame frames={frames}>
      <Kicker text={kickerOf(figure.big)} />
      <Giant text={figure.big} size={size} frames={frames} />
      {figure.label ? <Label text={figure.label} /> : null}
    </Frame>
  );
};

const LenderStage: React.FC<{ lender: Lender; frames: number }> = ({
  lender,
  frames,
}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [2, 16], [0, 1], { ...clamp, easing: ease });
  return (
    <Frame frames={frames}>
      <Kicker text={LENDER_KICKER} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: NUM_TOP + 30,
          opacity: k,
          transform: `translateY(${(1 - k) * 30}px)`,
        }}
      >
        <LenderLogo
          lender={lender}
          height={150}
          style={{ border: `2px solid ${HAIR}`, borderRadius: 0 }}
        />
      </div>
      <Label text={LENDER_SUB} />
    </Frame>
  );
};

const Chip: React.FC<{ item: Item }> = ({ item }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [0, 12], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        left: CHIP.right - CHIP.w,
        width: CHIP.w,
        bottom: 1920 - CHIP.bottom,
        fontFamily: FONT,
        color: INK,
        background: "#ffffff",
        padding: "12px 0 0 18px",
        boxSizing: "border-box",
        borderTop: `6px solid ${INK}`,
        borderLeft: `2px solid ${HAIR}`,
        opacity: Math.min(k, fadeOut(frame, item.frames)),
      }}
    >
      <Caps size={22}>
        {item.kind === "figure" ? kickerOf(item.figure.big) : LENDER_KICKER}
      </Caps>
      <div style={{ marginTop: 8 }}>
        {item.kind === "figure" ? (
          <Assemble
            text={item.figure.big}
            size={giantSize([item.figure.big], CHIP.w - 30, 76)}
            at={3}
            stagger={3}
          />
        ) : (
          <LenderLogo
            lender={item.lender}
            height={52}
            style={{ paddingLeft: 0 }}
          />
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------- track

const OwnCueView: React.FC<{ slot: CueSlot }> = ({ slot }) => {
  const c = slot.cue as OwnCue;
  const dur = slot.to - slot.from;
  switch (c.kind) {
    case "change":
      return <ChangeStage cue={c} rel={slot.rel} dur={dur} />;
    case "trend":
      return <TrendStage cue={c} dur={dur} />;
    case "points":
      return <PointsStage cue={c} rel={slot.rel} dur={dur} />;
    case "compare":
      return <CompareStage cue={c} rel={slot.rel} dur={dur} />;
  }
};

// Sounds: a click as a list row, a compare column or a changed value lands;
// a ding on a stat; a whoosh on a chapter (the classic sound design, minus
// what MotionTrack plays for the kinds it still draws).
const sfxOf = (reel: Reel) => [
  ...(reel.edit.cues ?? []).filter(isOwnCue).flatMap((c) =>
    c.kind === "points"
      ? c.items.map((it) => ({
          atMs: it.atMs,
          file: "mouse-click",
          volume: 0.4,
        }))
      : c.kind === "compare"
        ? c.cards.map((k) => ({
            atMs: k.atMs,
            file: "mouse-click",
            volume: 0.5,
          }))
        : c.kind === "change"
          ? [{ atMs: c.swapAtMs, file: "mouse-click", volume: 0.45 }]
          : [],
  ),
  ...(reel.edit.stats ?? []).map((s) => ({
    atMs: s.atMs,
    file: "ding",
    volume: 0.22,
  })),
  ...(reel.edit.chapters ?? []).map((c) => ({
    atMs: c.atMs - 250,
    file: "whoosh",
    volume: 0.35,
  })),
];

export const StageTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("bigdigit stage: Be Vietnam Pro");
  const plan = planOf(reel, fps);
  const at = outFrameOf(reel.timeline, fps);
  const hook = reel.edit.hook;
  return (
    <>
      {ready && hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookStage hook={hook} />
        </Sequence>
      ) : null}
      {(ready ? plan.stage : []).map((it) => (
        <Sequence
          key={`${it.kind}${it.from}`}
          from={it.from}
          durationInFrames={it.frames}
          layout="none"
        >
          {it.kind === "figure" ? (
            <FigureStage figure={it.figure} frames={it.frames} />
          ) : (
            <LenderStage lender={it.lender} frames={it.frames} />
          )}
        </Sequence>
      ))}
      {(ready ? plan.own : []).map((s) => (
        <Sequence
          key={`${s.cue.kind}${s.from}`}
          from={s.from}
          durationInFrames={s.to - s.from}
          layout="none"
        >
          <OwnCueView slot={s} />
        </Sequence>
      ))}
      {/* The classic panels, mounted only while their cue is up (their
          vignette would grey the paper otherwise); the inner Sequence puts
          MotionTrack back on the talk clock. */}
      {plan.rest.map((s) => (
        <Sequence
          key={`${s.cue.kind}${s.from}`}
          from={s.from}
          durationInFrames={s.to - s.from}
          layout="none"
        >
          <Sequence from={-s.from} layout="none">
            <MotionTrack
              reel={{
                ...reel,
                edit: { ...reel.edit, cues: [s.cue], chapters: [], stats: [] },
              }}
              panelOffset={STAGE.top - 110}
              leak={false}
            />
          </Sequence>
        </Sequence>
      ))}
      {(ready ? plan.chips : []).map((it) => (
        <Sequence
          key={`chip${it.kind}${it.from}`}
          from={it.from}
          durationInFrames={it.frames}
          layout="none"
        >
          <Chip item={it} />
        </Sequence>
      ))}
      {sfxOf(reel).map((s) => (
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
