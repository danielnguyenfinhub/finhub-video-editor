// A spoken keyword drawn huge BEHIND Daniel: render it from a design's Behind
// layer (between the backdrop and his cut-out), so his head and shoulders
// cover part of the word, the way a magazine cover puts the title behind the
// model. Idea from HyperFrames' embedded-captions "embed" mode (Apache-2.0);
// here it rides the existing cut-out instead of a separate matte.
//
// Words come from the talk captions; the emphasised ones (keywords, numbers)
// are candidates, and at most `max` are shown, at least `gapMs` apart, so it
// stays an accent on the big moments rather than a second caption track.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../brand/theme";
import {
  HOOK_FRAMES,
  SAFE,
  hookText,
  lenderMentionsOf,
} from "../mortgage/golden";
import { outFrameOf, type EditJson, type Reel } from "../mortgage/schema";
import {
  CHAPTER_TRANSITION_FRAMES,
  type OutCaption,
} from "../mortgage/timeline";
import {
  FONT,
  clamp,
  emphasised,
  enter,
  reelFontReady,
} from "../mortgage/style";

// Above-and-around the head (Daniel's measured footage: hair top y~600,
// face x 250-830), so the word reads first, then disappears behind him.
const BAND_TOP = 430;
const MAX_WIDTH = 1000;
const MAX_SIZE = 260;

export type BehindWordPick = { text: string; fromMs: number; toMs: number };

// Pure, so a design (or a test) can see what will be shown.
export const pickBehindWords = (
  captions: OutCaption[],
  keywords: string[],
  { max = 4, gapMs = 6000, holdMs = 1400 } = {},
): BehindWordPick[] => {
  const hits = emphasised(captions.map((c) => c.text), keywords);
  const picks: BehindWordPick[] = [];
  for (const i of [...hits].sort((a, b) => a - b)) {
    const c = captions[i];
    const text = c.text.trim().replace(/[,.!?;:]+$/, "");
    if (text.length < 2) continue; // too short to be a hero word
    const last = picks[picks.length - 1];
    if (last && c.startMs - last.fromMs < gapMs) continue;
    picks.push({ text: text.toUpperCase(), fromMs: c.startMs, toMs: c.startMs + holdMs });
    if (picks.length === max) break;
  }
  return picks;
};

const Word: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const size = Math.min(
    MAX_SIZE,
    fitText({ text, withinWidth: MAX_WIDTH, fontFamily: FONT, fontWeight: 900 }).fontSize,
  );
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          top: BAND_TOP,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          // Room for Vietnamese stacked marks above the caps.
          lineHeight: 1.25,
          color: brand.highlight,
          whiteSpace: "nowrap",
          opacity: pop * (1 - out),
          transform: `scale(${interpolate(pop, [0, 1], [1.25, 1])})`,
          textShadow: "0 10px 40px rgba(11,31,61,0.55)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const BehindWord: React.FC<{
  captions: OutCaption[];
  keywords: string[];
  max?: number;
  gapMs?: number;
  holdMs?: number;
}> = ({ captions, keywords, ...opts }) => {
  const { fps } = useVideoConfig();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  return (
    <>
      {pickBehindWords(captions, keywords, opts).map((p) => (
        <Sequence
          key={p.fromMs}
          from={f(p.fromMs)}
          durationInFrames={Math.max(1, f(p.toMs) - f(p.fromMs))}
        >
          <Word text={p.text} />
        </Sequence>
      ))}
    </>
  );
};

// ---------------------------------------------------------------- hook band
// The hook (reel.edit.hook) drawn in a design's Behind layer, in the band
// above his head: SAFE.top (or a design's `top`) down to HAIR_GAP above his
// hair line. Daniel's ruling (07/10/2026): a hook drawn in Behind above the
// head satisfies golden rule 6, provided no digit is ever behind his hair.
// The sub is one fitted line on top, the number fitted under it. Only with
// his cut-out: in quick mode ("vignette") and "room" the Behind layer draws
// on top of him or under an opaque frame, so the design keeps its Overlay
// hook there, and also when the band cannot hold the hook at the floor sizes
// or when something drawn above Behind is up during the hook (hookBandClear).
type Hook = NonNullable<EditJson["hook"]>;
// Our margin, not part of the ruling: every glyph ends this far above his hair line.
export const HAIR_GAP = 20;
export const SUB = { min: 40, max: 46 };
// ponytail: BIG_MIN 60 (1.5x the sub floor) is a look call; raise it if a
// band hook reads small on Daniel's stills, the hook then stays in the Overlay.
export const BIG = { min: 60, max: 150 };
export const LINE_GAP = 4;
// Be Vietnam Pro 800/900, measured with opentype.js (em): how far glyphs reach
// above and below the baseline. Digits, "%", "$" and the decimal comma vs any
// text (stacked Vietnamese marks: "Ẳ" reaches 1.24 above, "Ạ" 0.26 below).
const DIGITS = /^[\d\s.,%$+~–-]*$/;
const REACH = { digits: [0.84, 0.16], text: [1.24, 0.26] } as const;
// Baseline from the top of a lineHeight: 1 box (ascent 1, descent 0.265);
// check-design-figures (k) compares it with the TTFs.
export const BASELINE = 1 - (1.265 - 1) / 2;

export type BandLine = {
  size: number;
  baseline: number;
  top: number;
  bottom: number;
};
export type HookBandLayout = { sub: BandLine | null; big: BandLine };

const line = (y: number, size: number, text: string): BandLine => {
  const [up, down] = REACH[DIGITS.test(text) ? "digits" : "text"];
  return {
    size,
    baseline: y + up * size,
    top: y,
    bottom: y + (up + down) * size,
  };
};

// Pure (check-design-figures (k) runs it): where the sub and number sit given
// the size each fits across the band's width; null when they don't fit.
export const hookBandLayout = ({
  hairY,
  top = SAFE.top,
  big,
  sub,
  bigFit,
  subFit = 0,
}: {
  hairY: number;
  top?: number;
  big: string;
  sub?: string;
  bigFit: number;
  subFit?: number;
}): HookBandLayout | null => {
  const bottom = hairY - HAIR_GAP;
  const subSize = Math.floor(Math.min(SUB.max, subFit));
  if (sub && subSize < SUB.min) return null;
  // The fitted sub first; if the number then falls under its floor, the sub
  // at its own floor gives the number the room.
  for (const s of sub ? [subSize, SUB.min] : [0]) {
    const subLine = sub ? line(top, s, sub) : null;
    const y = subLine ? subLine.bottom + LINE_GAP : top;
    const [up, down] = REACH[DIGITS.test(big) ? "digits" : "text"];
    const size = Math.floor(
      Math.min(BIG.max, bigFit, (bottom - y) / (up + down)),
    );
    if (size >= BIG.min) return { sub: subLine, big: line(y, size, big) };
  }
  return null;
};

// Behind sits behind his cut-out only when there is one.
export const hookInBand = (edit: EditJson): boolean =>
  edit.background !== "vignette" && edit.background !== "room";

// MotionTrack's light leak flashes 12 frames before a chapter cut
// (classic/Cues.tsx); its cue panels start on their cue's frame.
const CHAPTER_LEAD = 12;
// Pure: true when nothing drawn above Behind can be up during the hook (talk
// frames 0-HOOK_FRAMES), so the band hook is never covered: a cue panel, a
// chapter card, a bank mention (the designs draw its logo), a cutaway or pip
// visual (the core draws Visuals above Talk), or a chapter transition (both
// segments render Behind there, so the band would show twice). The same
// built-reel timing the designs and the core use, in output frames.
export const hookBandClear = (reel: Reel, fps: number): boolean => {
  const { edit, timeline } = reel;
  const out = outFrameOf(timeline, fps);
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const inHook = (from: number, to: number) => from < HOOK_FRAMES && to > 0;
  return !(
    (edit.cues ?? []).some((c) =>
      inHook(out(c.fromMs), out(c.toMs)),
    ) ||
    (edit.chapters ?? []).some(
      (c) => out(c.atMs) - CHAPTER_LEAD < HOOK_FRAMES,
    ) ||
    lenderMentionsOf(reel).some((m) => inHook(f(m.startMs), f(m.endMs))) ||
    (edit.visuals ?? []).some((v) =>
      inHook(out(v.atMs), out(v.atMs) + f(v.durMs)),
    ) ||
    timeline.segments.some((s) => {
      const end = s.outFrom + s.outDuration;
      return (
        s.transitionAfter !== null &&
        inHook(end - CHAPTER_TRANSITION_FRAMES, end + CHAPTER_TRANSITION_FRAMES)
      );
    })
  );
};

// The band for this reel, or null (no hook, no cut-out, something above Behind
// during the hook, or it does not fit):
// Behind draws <HookBand> when it is set, the Overlay its own hook when not.
// Measured once Be Vietnam Pro is in (the frame is held until then).
export const useHookBand = (
  reel: Reel,
  hairY: number,
  { top, padX = 0 }: { top?: number; padX?: number } = {},
): HookBandLayout | null => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("hook band: Be Vietnam Pro"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => setReady(true))
      .catch(cancelRender);
  }, [cancelRender]);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle, continueRender]);
  const { fps } = useVideoConfig();
  const hook = reel.edit.hook;
  if (!hook || !hookInBand(reel.edit) || !hookBandClear(reel, fps)) return null;
  const withinWidth = SAFE.right - SAFE.left - 2 * padX;
  const fit = (text: string, fontWeight: number) =>
    fitText({ text, withinWidth, fontFamily: FONT, fontWeight }).fontSize;
  const big = hookText(hook, 1);
  return hookBandLayout({
    hairY,
    top,
    big,
    sub: hook.sub,
    // Fitted to the narrower of the count's first text and the landed one,
    // so neither runs past the band's width.
    bigFit: Math.min(fit(big, 900), fit(hookText(hook, 0), 900)),
    subFit: hook.sub ? fit(hook.sub, 800) : 0,
  });
};

// Pure pieces of HookBand, checked by check-design-figures (k): a line's CSS top
// for its baseline, the entrance (opacity and a scale that grows into the box,
// never past it, though `enter` overshoots to ~1.056), and the number as shown.
export const ENTRY_FROM = 0.8;
export const bandLineTop = (l: BandLine): number =>
  l.baseline - BASELINE * l.size;
export const bandEntry = (frame: number, fps: number, delay: number) => {
  const p = Math.min(1, enter(frame, fps, delay));
  return { opacity: p, scale: interpolate(p, [0, 1], [ENTRY_FROM, 1]) };
};
export const bandText = (
  hook: Hook,
  frame: number,
  countFrames: [number, number],
): string => hookText(hook, interpolate(frame, countFrames, [0, 1], clamp));

// The two lines at the band's places, counting with hookText (never from 0),
// fading in and out with the hook. `children` (a skin's plate) draws under them.
export const HookBand: React.FC<{
  hook: Hook;
  band: HookBandLayout;
  bigStyle?: React.CSSProperties;
  subStyle?: React.CSSProperties;
  countFrames?: [number, number];
  children?: React.ReactNode;
}> = ({ hook, band, bigStyle, subStyle, countFrames = [4, 40], children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const out = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    clamp,
  );
  // A skin styles the ink only: place, size and entrance come last.
  const text = (l: BandLine, delay: number, style?: React.CSSProperties) => {
    const e = bandEntry(frame, fps, delay);
    return {
      ...style,
      position: "absolute",
      left: SAFE.left,
      width: SAFE.right - SAFE.left,
      top: bandLineTop(l),
      fontFamily: FONT,
      fontSize: l.size,
      lineHeight: 1,
      textAlign: "center",
      whiteSpace: "nowrap",
      opacity: e.opacity,
      // Grows into its box (never past it), so no glyph passes the hair line.
      transform: `scale(${e.scale})`,
    } satisfies React.CSSProperties;
  };
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {children}
      {band.sub ? (
        <div style={text(band.sub, 0, { fontWeight: 800, ...subStyle })}>
          {hook.sub}
        </div>
      ) : null}
      <div style={text(band.big, 6, { fontWeight: 900, ...bigStyle })}>
        {bandText(hook, frame, countFrames)}
      </div>
    </AbsoluteFill>
  );
};
