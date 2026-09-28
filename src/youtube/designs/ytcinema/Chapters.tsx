// Chapters as film chapter cards: black screen, "CHƯƠNG n" in small caps, the
// title large, a thin gold rule drawing out, then a slow dissolve into the
// chapter. Between cards a quiet marker sits in the top letterbox bar and a
// hairline along the top edge of the picture fills with the running time.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import { HOOK_FRAMES } from "../../../mortgage/golden";
import { outFrameOf, type Reel } from "../../../mortgage/schema";
import { FONT, clamp } from "../../../mortgage/style";
import { BAR, BLACK, GOLD, LEFT, Rule, WIDE, caps, slow } from "./Stage";
import { YT_SAFE } from "../../frame";

export const CHAPTER_WORD = "Chương";
const SLATE_FRAMES = 72; // 2.4 s
const DISSOLVE = 22; // the card's last frames cross-dissolve into the chapter

export type Slate = { i: number; title: string; from: number; frames: number };

// Where each card sits on the talk timeline. A card that would land on the
// hook (chapter 1 at 0 s) follows it instead: cold open, then the title.
export const slatesOf = (
  reel: Reel,
  fps: number,
  talkFrames: number,
): Slate[] => {
  const at = outFrameOf(reel.timeline, fps);
  const hook = reel.edit.hook ? HOOK_FRAMES : 0;
  const chapters = reel.edit.chapters ?? [];
  return chapters.map((c, i) => {
    const from = Math.max(at(c.atMs), hook);
    const next = chapters[i + 1] ? at(chapters[i + 1].atMs) : talkFrames;
    return {
      i,
      title: c.title,
      from,
      frames: Math.max(1, Math.min(SLATE_FRAMES, next - from)),
    };
  });
};

// The frame a card has dissolved far enough for the chapter to show through.
export const slateClearAt = (s: Slate) => s.from + s.frames - DISSOLVE;

const Card: React.FC<{ s: Slate }> = ({ s }) => {
  const f = useCurrentFrame();
  const o = Math.min(
    interpolate(f, [0, 8], [0, 1], clamp),
    interpolate(f, [s.frames - DISSOLVE, s.frames], [1, 0], clamp),
  );
  const t = slow(f, 8, 24);
  return (
    <AbsoluteFill
      style={{
        background: BLACK,
        opacity: o,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ ...caps(30), opacity: slow(f, 4, 18) }}>
        {CHAPTER_WORD} {s.i + 1}
      </div>
      <div
        style={{
          width: WIDE - 200,
          marginTop: 18,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: "0.01em",
          lineHeight: 1.25,
          color: brand.text,
          opacity: t,
          transform: `translateY(${(1 - t) * 18}px) scale(${1 + f * 0.0006})`,
        }}
      >
        {s.title}
      </div>
      <Rule p={slow(f, 14, 36)} width={560} style={{ marginTop: 34 }} />
    </AbsoluteFill>
  );
};

export const ChapterCards: React.FC<{ slates: Slate[] }> = ({ slates }) => (
  <>
    {slates.map((s) => (
      <Sequence
        key={s.i}
        from={s.from}
        durationInFrames={s.frames}
        layout="none"
      >
        <Card s={s} />
      </Sequence>
    ))}
  </>
);

// Top bar: "CHƯƠNG 2 · Vì sao tăng" on the left; along the picture's top
// edge, the running time with a tick at each chapter.
export const ChapterMarker: React.FC<{
  slates: Slate[];
  talkFrames: number;
}> = ({ slates, talkFrames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const live = [...slates].reverse().find((s) => f >= slateClearAt(s));
  const since = live ? f - slateClearAt(live) : 0;
  const x = (frame: number) => LEFT + (WIDE * frame) / Math.max(1, talkFrames);
  return (
    <>
      {live ? (
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: YT_SAFE.top,
            display: "flex",
            alignItems: "baseline",
            gap: 22,
            opacity: slow(since, 0, fps),
            whiteSpace: "nowrap",
          }}
        >
          <span style={caps(22)}>
            {CHAPTER_WORD} {live.i + 1}
          </span>
          <span style={{ ...caps(22, brand.textDim), letterSpacing: "0.16em" }}>
            {live.title}
          </span>
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: BAR - 1,
          width: WIDE,
          height: 2,
          background: `${brand.slate}66`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: BAR - 1,
          width: x(f) - LEFT,
          height: 2,
          background: GOLD,
          opacity: 0.85,
        }}
      />
      {slates.map((s) => (
        <div
          key={s.i}
          style={{
            position: "absolute",
            left: x(s.from) - 1,
            top: BAR - 7,
            width: 2,
            height: 8,
            background: f >= s.from ? GOLD : brand.slate,
          }}
        />
      ))}
    </>
  );
};
