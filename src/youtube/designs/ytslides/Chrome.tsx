// The deck's fixed frame: navy title bar with the chapter tabs, the light
// caption strip with the slide counter, the push every slide enters with, and
// the chips (a figure or bank arriving while a slide holds the stage).
import type React from "react";
import { Fragment } from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp, emphasised } from "../../../mortgage/style";
import { YT_SAFE } from "../../frame";
import { chapterAt, slideAt, type Deck } from "./Plan";

export const NAVY = brand.background;
export const INK = brand.textOnCard;
export const GOLD = brand.accent;
export const PAPER = brand.card;
export const SLATE = brand.slate;
export const LINE = `${brand.slate}33`;
export const MIST = `${brand.primary}0F`;

// 12-column grid across YT_SAFE.
export const GUT = 24;
export const COL = (YT_SAFE.right - YT_SAFE.left - 11 * GUT) / 12;
export const colX = (i: number) => YT_SAFE.left + i * (COL + GUT);
export const span = (n: number) => n * COL + (n - 1) * GUT;

export const BAR_H = 220; // navy title bar
export const STRIP_TOP = 800; // caption strip
export const STAGE = { top: BAR_H + 34, bottom: STRIP_TOP - 24 };
const TABS_W = 1500; // clear of LogoMark16 top-right
export const COUNTER_W = 200;
const OUT = 12; // push-out frames, overlapping the next slide's push-in

export const Mark: React.FC<{ text: string; hit: boolean }> = ({
  text,
  hit,
}) => (
  <span
    style={
      hit
        ? {
            background: brand.highlight,
            color: INK,
            borderRadius: 8,
            padding: "0 8px",
          }
        : undefined
    }
  >
    {text}
  </span>
);

// Words with keyword highlights and real spaces (so lines wrap).
export const Marked: React.FC<{ words: string[]; keywords: string[] }> = ({
  words,
  keywords,
}) => {
  const hit = emphasised(words, keywords);
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={`${w}${i}`}>
          <Mark text={w.trim()} hit={hit.has(i)} />{" "}
        </Fragment>
      ))}
    </>
  );
};

export const TitleBar: React.FC<{ deck: Deck; fallback: string }> = ({
  deck,
  fallback,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tabs = deck.chapters.length
    ? deck.chapters.map((c) => c.title)
    : [fallback];
  const cur = deck.chapters.length ? chapterAt(deck, frame) : 0;
  const w = TABS_W / tabs.length;
  // The gold tab glides to the new chapter (magic move).
  const start = deck.chapters[cur]?.from ?? 0;
  const prev = Math.max(0, cur - 1);
  const k = spring({ frame: frame - start, fps, config: { damping: 200 } });
  const x = (prev + (cur - prev) * k) * w;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1920,
        height: BAR_H,
        background: NAVY,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 1920,
          height: 5,
          background: GOLD,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: YT_SAFE.left,
          top: YT_SAFE.top,
          width: TABS_W,
          height: 46,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: x,
            width: w - 10,
            height: 46,
            borderRadius: 10,
            background: GOLD,
          }}
        />
        {tabs.map((t, i) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: i * w,
              width: w - 10,
              height: 46,
              padding: "0 16px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: FONT,
              fontSize: 22,
              fontWeight: 800,
              color: i === cur ? NAVY : `${brand.text}99`,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span style={{ opacity: 0.7 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {t}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Slide number and talk progress, bottom-right in the caption strip.
export const Strip: React.FC<{ deck: Deck; talkFrames: number }> = ({
  deck,
  talkFrames,
}) => {
  const frame = useCurrentFrame();
  const n = slideAt(deck, frame) + 1;
  const pad = (v: number) => String(v).padStart(2, "0");
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: STRIP_TOP,
        width: 1920,
        height: 1080 - STRIP_TOP,
        background: PAPER,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: MIST,
          borderTop: `2px solid ${LINE}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 1920 - YT_SAFE.right,
          bottom: 1080 - YT_SAFE.bottom + 8,
          width: COUNTER_W,
          fontFamily: FONT,
          textAlign: "right",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 900, color: INK }}>
          {pad(n)}
          <span style={{ color: SLATE, fontWeight: 600 }}>
            {" "}
            / {pad(deck.slides.length)}
          </span>
        </div>
        <div
          style={{
            marginTop: 10,
            height: 8,
            borderRadius: 4,
            background: LINE,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, (frame / talkFrames) * 100)}%`,
              height: 8,
              background: NAVY,
            }}
          />
        </div>
      </div>
    </div>
  );
};
// Pushes a slide in from the right and out to the left (OUT frames past `to`).
export const Push: React.FC<{
  from: number;
  to: number;
  title?: string;
  children: React.ReactNode;
}> = ({ from, to, title, children }) => (
  <Sequence from={from} durationInFrames={to - from + OUT} layout="none">
    <PushInner dur={to - from} title={title}>
      {children}
    </PushInner>
  </Sequence>
);

const PushInner: React.FC<{
  dur: number;
  title?: string;
  children: React.ReactNode;
}> = ({ dur, title, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 16,
  });
  const outP = interpolate(frame, [dur, dur + OUT], [0, 1], clamp);
  const x = (1 - inP) * 120 - outP * 120;
  return (
    <>
      {title ? (
        <div
          style={{
            position: "absolute",
            left: YT_SAFE.left,
            top: 136,
            maxWidth: 1080,
            fontFamily: FONT,
            fontSize: 50,
            fontWeight: 800,
            color: brand.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            opacity: inP * (1 - outP),
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: inP * (1 - outP),
          transform: `translateX(${x}px)`,
        }}
      >
        {children}
      </div>
    </>
  );
};
