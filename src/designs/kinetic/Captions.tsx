// "kinetic" captions: the words ARE the picture. While the stage is free a
// page is huge (up to 132 px, fitted on at most three lines) in the middle of
// the block; while the hook, a figure, a logo or a cue holds the stage it
// shrinks into the bottom slab. Each word slams in (scale overshoot) as it is
// said; keywords take the block's accent with a drawn bar, numbers are boxed.
import type { TikTokPage } from "@remotion/captions";
import { fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAFE } from "../../mortgage/golden";
import { PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised } from "../../mortgage/style";
import {
  CAP_BUSY_BOTTOM,
  FREE_BAND,
  H,
  SAFE_W,
  WHITE,
  blockAt,
  slabOf,
  useFontReady,
  type Blocks,
  type Surface,
} from "./blocks";

const FREE_MAX = 132;
const BUSY_MAX = 60;
const LINE = 1.18;
const GHOST = 0.35;
const SLAM = 1.12; // a said word's scale as it lands
// The slam grows a word past its layout box and into the space to its
// neighbours ("ThángHai"). Every word keeps a fixed side margin of half that
// overflow (width about 0.6 em a character); with the neighbour's half the
// space stays about as wide as said, and the line never reflows. The fit
// below measures the text that much narrower. ponytail: width estimated
// from the character count; measure with measureText if that proves off.
const saidRoom = (scale: number, text: string) =>
  +(((scale - 1) / 4) * 0.6 * text.trim().length).toFixed(3);
const FIT_W = SAFE_W / (1 + (SLAM - 1) / 2);

// The surface text sits on at talk frame g: the block, or the slab under it
// (white while a compare split is up).
export const surfaceFor = (
  blocks: Blocks,
  g: number,
  onSlab: boolean,
  split: boolean,
): Surface => {
  const s = blockAt(blocks.beats, g).text;
  if (!onSlab) return s;
  return split ? WHITE : slabOf(s);
};

const Word: React.FC<{
  text: string;
  start: number;
  kind: "plain" | "key" | "num";
  s: Surface;
}> = ({ text, start, kind, s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - start;
  const slam = spring({
    frame: t,
    fps,
    config: { damping: 13, stiffness: 260, mass: 0.5 },
  });
  const bar = interpolate(t, [3, 10], [0, 1], clamp);
  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        margin: `0 ${saidRoom(SLAM, text)}em`,
        // Ghosted on the line until said, then slammed in, scaled about its
        // baseline so it never sits higher or lower than its neighbours.
        opacity: interpolate(t, [0, 2], [GHOST, 1], clamp),
        transform:
          t < 0 ? undefined : `scale(${interpolate(slam, [0, 1], [SLAM, 1])})`,
        transformOrigin: "50% 80%",
        color:
          kind === "num" && t >= 0
            ? s.boxInk
            : kind === "key"
              ? s.accent
              : s.ink,
        // A box that doesn't change the measured line width (once said).
        background: kind === "num" && t >= 0 ? s.boxBg : undefined,
        boxShadow:
          kind === "num" && t >= 0 ? `0 0 0 0.08em ${s.boxBg}` : undefined,
        borderRadius: kind === "num" ? "0.06em" : undefined,
      }}
    >
      {text}
      {kind === "key" ? (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "0.02em",
            height: "0.09em",
            background: s.accent,
            transform: `scaleX(${bar})`,
            transformOrigin: "left",
          }}
        />
      ) : null}
    </span>
  );
};

const Page: React.FC<{
  page: TikTokPage;
  from: number;
  keywords: string[];
  blocks: Blocks;
  splitAt: (g: number) => boolean;
}> = ({ page, from, keywords, blocks, splitAt }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const g = from + frame;
  const low = blocks.level[Math.min(g, blocks.level.length - 1)] ?? 0;
  const text = page.text.trim();
  const free = useMemo(
    () =>
      fitTextOnNLines({
        text,
        maxLines: 3,
        maxBoxWidth: FIT_W,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: FREE_MAX,
      }),
    [text],
  );
  const busy = useMemo(
    () =>
      fitTextOnNLines({
        text,
        maxLines: 2,
        maxBoxWidth: FIT_W,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: BUSY_MAX,
      }),
    [text],
  );
  const size = interpolate(low, [0, 1], [free.fontSize, busy.fontSize]);
  const freeH = free.lines.length * free.fontSize * LINE;
  const freeBottom = H - ((FREE_BAND.top + FREE_BAND.bottom) / 2 + freeH / 2);
  const bottom = interpolate(low, [0, 1], [freeBottom, H - CAP_BUSY_BOTTOM]);
  const s = surfaceFor(blocks, g, low >= 0.5, splitAt(g));
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  // A slow push-in while the page is the hero, so it never sits still.
  const push = interpolate(frame, [0, durationInFrames], [1, 1.04], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE_W,
        bottom,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: LINE,
        transform: `scale(${interpolate(low, [0, 1], [push, 1])})`,
      }}
    >
      {page.tokens.map((t, i) => {
        const start = Math.round(((t.fromMs - page.startMs) / 1000) * fps);
        return (
          <span key={t.fromMs}>
            {i > 0 && t.text.startsWith(" ") ? " " : ""}
            <Word
              text={t.text.trim()}
              start={start}
              s={s}
              kind={!hit.has(i) ? "plain" : /\d/.test(t.text) ? "num" : "key"}
            />
          </span>
        );
      })}
    </div>
  );
};

export const KineticCaptions: React.FC<{
  reel: Reel;
  keywords: string[];
  blocks: Blocks;
  splitAt: (g: number) => boolean;
}> = ({ reel, keywords, blocks, splitAt }) => {
  const ready = useFontReady("captions");
  if (!ready) return null;
  return (
    <PagedCaptions
      reel={reel}
      combineWithinMs={800}
      tailMs={300}
      render={(page, from) => (
        <Page
          page={page}
          from={from}
          keywords={keywords}
          blocks={blocks}
          splitAt={splitAt}
        />
      )}
    />
  );
};

const EN_MAX = 32;

const English: React.FC<{
  text: string;
  from: number;
  blocks: Blocks;
  splitAt: (g: number) => boolean;
}> = ({ text, from, blocks, splitAt }) => {
  const frame = useCurrentFrame();
  const g = from + frame;
  const { fontSize } = useMemo(
    () =>
      fitTextOnNLines({
        text,
        maxLines: 2,
        maxBoxWidth: SAFE_W,
        fontFamily: FONT,
        fontWeight: 600,
        maxFontSize: EN_MAX,
      }),
    [text],
  );
  const s = surfaceFor(blocks, g, true, splitAt(g));
  const p = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE_W,
        bottom: H - SAFE.bottom,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 600,
        fontSize,
        lineHeight: 1.25,
        color: s.ink,
        opacity: p * 0.88,
        transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

// edit.json subtitles, small on the slab at the bottom of SAFE.
export const EnglishLine: React.FC<{
  reel: Reel;
  blocks: Blocks;
  splitAt: (g: number) => boolean;
}> = ({ reel, blocks, splitAt }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("english");
  const at = outFrameOf(reel.timeline, fps);
  if (!ready) return null;
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
            <English
              text={s.text}
              from={from}
              blocks={blocks}
              splitAt={splitAt}
            />
          </Sequence>
        );
      })}
    </>
  );
};
