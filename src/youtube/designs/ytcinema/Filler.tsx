// Empty stretches of stage (no hook, card, figure or cue) are cut into
// slots of at most 4 s; each slot shows a documentary title card: the key
// phrase said in it (a run of emphasised words), else the current chapter's
// title, else the video's title. Only words already in the video, never invented.
import type React from "react";
import { Fragment } from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { captionPages } from "../../../mortgage/captionPages";
import type { Slate } from "./Chapters";
import type { Reel } from "../../../mortgage/schema";
import { FONT, emphasised } from "../../../mortgage/style";
import {
  GOLD,
  IMG_BOTTOM,
  IMG_TOP,
  LEFT,
  Rule,
  WIDE,
  slow,
  tail,
} from "./Stage";

const SLOT = 120; // 4 s
const MIN_SLOT = 45;

type Words = { words: string[]; gold: Set<number> };

// The longest run of emphasised tokens that has a letter in it ("lãi suất",
// "ngân hàng Trung ương"); numbers alone are figures, drawn elsewhere.
const keyRun = (texts: string[], hit: Set<number>): string[] | null => {
  let best: string[] = [];
  let run: string[] = [];
  texts.forEach((t, i) => {
    if (hit.has(i)) run.push(t.trim());
    else run = [];
    if (run.length > best.length && run.some((w) => /\p{L}/u.test(w)))
      best = [...run];
  });
  const letters = best.join(" ").replace(/[^\p{L}]/gu, "");
  return letters.length >= 4 ? best : null;
};

const clean = (w: string) => w.replace(/[.,!?;:…]+$/u, "");

const Card: React.FC<{ w: Words; dur: number }> = ({ w, dur }) => {
  const f = useCurrentFrame();
  const p = slow(f, 0, 22);
  const long = w.words.join(" ").length > 28;
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT + 60,
        width: WIDE - 120,
        top: (IMG_TOP + IMG_BOTTOM) / 2 - 20,
        textAlign: "center",
        opacity: p * tail(f, dur, 14),
        transform: `translateY(calc(-50% + ${(1 - p) * 22}px)) scale(${1 + f * 0.0007})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: long ? 78 : 112,
          fontWeight: 800,
          lineHeight: 1.22,
          color: brand.text,
        }}
      >
        {w.words.map((word, i) => (
          <Fragment key={`${word}${i}`}>
            <span style={{ color: w.gold.has(i) ? GOLD : brand.text }}>
              {word}
            </span>{" "}
          </Fragment>
        ))}
      </div>
      <Rule p={slow(f, 10, 34)} width={420} style={{ margin: "30px auto 0" }} />
    </div>
  );
};

export const Filler: React.FC<{
  reel: Reel;
  keywords: string[];
  windows: [number, number][];
  slates: Slate[];
}> = ({ reel, keywords, windows, slates }) => {
  const { fps } = useVideoConfig();
  const pages = captionPages({
    captions: reel.timeline.captions,
    combineWithinMs: 900,
    breakOnSilenceAfterMs: 350,
  }).map((pg) => ({
    from: Math.round((pg.startMs / 1000) * fps),
    texts: pg.tokens.map((t) => t.text),
  }));
  const title = reel.edit.title.split(/\s+/).filter(Boolean);
  const pick = (a: number, b: number): Words => {
    const inSlot = pages.filter((pg) => pg.from >= a - 15 && pg.from < b - 30);
    for (const pg of inSlot) {
      const hit = emphasised(pg.texts, keywords);
      const run = keyRun(pg.texts, hit);
      if (run)
        return { words: run.map(clean), gold: new Set(run.map((_, i) => i)) };
    }
    const chapter = [...slates].reverse().find((x) => a >= x.from);
    if (chapter) {
      const words = chapter.title.split(/\s+/).filter(Boolean);
      return { words, gold: emphasised(words, keywords) };
    }
    return { words: title, gold: emphasised(title, keywords) };
  };
  const slots: [number, number][] = windows.flatMap(([a, b]) => {
    const n = Math.max(1, Math.ceil((b - a) / SLOT));
    const len = (b - a) / n;
    return Array.from(
      { length: n },
      (_, i) =>
        [Math.round(a + i * len), Math.round(a + (i + 1) * len)] as [
          number,
          number,
        ],
    ).filter(([x, y]) => y - x >= MIN_SLOT);
  });
  return (
    <>
      {slots.map(([a, b]) => (
        <Sequence key={a} from={a} durationInFrames={b - a} layout="none">
          <Card w={pick(a, b)} dur={b - a} />
        </Sequence>
      ))}
    </>
  );
};
