// "ytdashboard" (Bảng điều khiển): the video as a data dashboard. A chapter
// nav rail, a header with the title and running time, and a focus stage where
// each beat (hook, figure, cue, bank) lands in a widget tile that springs up
// to focus, then shrinks into the history strip, so the board builds up over
// the video. Captions sit in a console bar. Tile labels come from the reel;
// nothing here is market data.
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import type { Design, OverlayProps } from "../../../mortgage/design";
import { lenderMentionsOf } from "../../../mortgage/golden";
import type { LenderMention } from "../../../mortgage/lenders";
import { outFrameOf } from "../../../mortgage/schema";
import { clamp } from "../../../mortgage/style";
import { LogoMark16, OUTRO16_COPY, Outro16 } from "../../Kit";
import { planBeats, type Tile } from "./beats";
import { ChapterPanel, NavRail, chapterAt, type Chap } from "./Chrome";
import { Header } from "./Header";
import { Compact } from "./Compact";
import { Console } from "./Console";
import { Cover, Talk } from "./Frame";
import {
  CALM,
  COPY,
  FOCUS,
  FOCUS_SPRING,
  P,
  SLOT_W,
  STRIP,
  alpha,
  lerpRect,
  slotRect,
} from "./layout";
import { Full } from "./Tiles";

// How far a tile is expanded into the stage (0 in the strip, 1 focused).
const amountOf = (t: Tile, f: number, fps: number) =>
  f < t.s || f > t.c + 60
    ? 0
    : spring({ frame: f - t.s, fps, config: FOCUS_SPRING }) *
      (1 - spring({ frame: f - t.c, fps, config: FOCUS_SPRING }));

const Board: React.FC<{
  tiles: Tile[];
  amts: number[];
  focusNow: number;
  f: number;
  fps: number;
  at: (ms: number) => number;
  tagAt: (frame: number) => string | undefined;
  mentions: LenderMention[];
}> = ({ tiles, amts, focusNow, f, fps, at, tagAt, mentions }) => (
  <>
    {tiles.map((t, i) => {
      if (f < t.s) return null;
      // Each newer tile pushes this one a slot to the right; past the last
      // slot it fades out (the strip keeps STRIP.n tiles).
      let shift = 0;
      for (let k = i + 1; k < tiles.length && k <= i + STRIP.n + 1; k++) {
        if (tiles[k].s > f) break;
        shift += spring({ frame: f - tiles[k].s, fps, config: CALM });
      }
      if (shift >= STRIP.n) return null;
      const amt = amts[i];
      const r = lerpRect(slotRect(Math.min(shift, STRIP.n - 1)), FOCUS, amt);
      const born = interpolate(f - t.s, [0, 6], [0, 1], clamp);
      const dim = 1 - 0.6 * Math.max(0, focusNow - amt);
      // The summary only once the beat is over (a change's "to" never shows
      // before its swap).
      const summary =
        f >= t.c ? 1 - interpolate(amt, [0.05, 0.4], [0, 1], clamp) : 0;
      return (
        <div
          key={`${t.kind}${t.s}`}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: r.w,
            height: r.h,
            borderRadius: 18,
            overflow: "hidden",
            boxSizing: "border-box",
            background: brand.background,
            border: `2px solid ${amt > 0.02 ? alpha(P.gold, 0.3 + 0.5 * amt) : P.line}`,
            boxShadow: `0 ${24 * amt}px ${60 * amt}px ${alpha(brand.navy, 0.7 * amt)}`,
            opacity: born * Math.min(1, STRIP.n - shift) * dim,
            zIndex: amt > 0.01 ? 2 : 1,
          }}
        >
          {summary > 0 ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `scale(${r.w / SLOT_W})`,
                transformOrigin: "0 0",
                opacity: summary,
              }}
            >
              <Compact tile={t} />
            </div>
          ) : null}
          {amt > 0.3 ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `scale(${r.w / FOCUS.w})`,
                transformOrigin: "0 0",
                opacity: interpolate(amt, [0.45, 0.85], [0, 1], clamp),
              }}
            >
              <Full
                tile={t}
                f={f}
                fps={fps}
                at={at}
                tag={tagAt(t.s)}
                mentions={mentions}
              />
            </div>
          ) : null}
        </div>
      );
    })}
  </>
);

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = useMemo(() => outFrameOf(reel.timeline, fps), [reel, fps]);
  const plan = useMemo(() => planBeats(reel, fps), [reel, fps]);
  const mentions = useMemo(() => lenderMentionsOf(reel), [reel]);
  const real: Chap[] = useMemo(
    () =>
      (reel.edit.chapters ?? []).map((c) => ({
        from: at(c.atMs),
        title: c.title,
      })),
    [reel, at],
  );
  const chs = real.length ? real : [{ from: 0, title: reel.edit.title }];
  const amts = plan.tiles.map((t) => amountOf(t, f, fps));
  const focusNow = Math.max(0, ...amts);
  const chrome = { chs, real: real.length > 0, f, fps, talkFrames };
  return (
    <>
      <AbsoluteFill style={{ opacity: interpolate(f, [0, 10], [0, 1], clamp) }}>
        <ChapterPanel {...chrome} title={reel.edit.title} dim={focusNow} />
        <Board
          tiles={plan.tiles}
          amts={amts}
          focusNow={focusNow}
          f={f}
          fps={fps}
          at={at}
          tagAt={(fr) =>
            real.length ? real[chapterAt(real, fr)].title : undefined
          }
          mentions={mentions}
        />
        <NavRail {...chrome} />
        <Header {...chrome} title={reel.edit.title} chips={plan.chips} />
        <Console reel={reel} keywords={keywords} at={at} f={f} />
      </AbsoluteFill>
      <LogoMark16 talkFrames={talkFrames} />
    </>
  );
};

// The frame is identical across segments, so a plain fade: the chapter change
// is carried by the rail, the header slate and the chapter panel.
const chapterTransition = () =>
  fade() as unknown as TransitionPresentation<Record<string, unknown>>;

export const ytdashboard: Design = {
  id: "ytdashboard",
  Cover,
  Talk,
  Overlay,
  Outro: Outro16,
  chapterTransition,
  copy: [...OUTRO16_COPY, ...Object.values(COPY)],
};
