// "ticker" (Bảng điện) building blocks: the exchange-board backdrop, split-flap
// tiles, scrambling text, the status bar and the ticker tape. Everything shown
// comes from the reel (title, hook, stats, cue titles); the board never claims
// live market data: the status bar labels the video's own topic and its clock
// is the video's running time.
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { fitTextOnNLines } from "@remotion/layout-utils";
import { brand } from "../../brand/theme";
import { NewsTicker } from "../../elements/NewsTicker";
import { SAFE, asSaid } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, reelFontReady } from "../../mortgage/style";

export const AMBER = brand.highlight;
export const SKY = "#7FC4FF"; // theme-exempt: the board's restrained second accent (same sky as faceless)
export const INK = brand.navy;
export const SKY_DIM = "rgba(127,196,255,0.18)"; // theme-exempt: SKY at 18 % (done board rows)

// Layout (y): status bar under SAFE.top, the stage, the caption strip with its
// English line right under it (one bilingual block), and the tape on SAFE.bottom.
// Each has its own band.
export const STATUS_H = 118;
export const STAGE = { top: SAFE.top + 162, bottom: 1080 };
export const TAPE = { top: SAFE.bottom - 84, height: 84 };
// The English line's band under the caption: three 28 px lines.
export const EN_BAND = 125;
export const STRIP_BOTTOM = TAPE.top - 8 - EN_BAND - 12;

// ------------------------------------------------------------------ backdrop

// Near-black navy, an LED dot matrix, scanlines and a scan beam that sweeps
// down every 6 s, so the board is never still (rule 5b).
export const BoardBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const beam = ((frame % 180) / 180) * 2300 - 300;
  const glow = 0.18 + 0.06 * Math.sin(frame / 40);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 900px 520px at 50% 1500px, rgba(255,185,56,${glow}), transparent 70%),
          linear-gradient(175deg, ${brand.navy} 0%, ${brand.background} 55%, ${brand.navy} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.09) 1.3px, transparent 1.9px)",
          backgroundSize: "14px 14px",
        }}
      />
      <AbsoluteFill
        style={{
          top: beam,
          height: 260,
          background:
            "linear-gradient(180deg, transparent, rgba(127,196,255,0.10), transparent)", // theme-exempt: SKY at 10 % for the scan beam
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 5px)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ flips

const DIGITS = "0123456789";
// The glyph a flap shows while it spins. Only a digit spins through other
// digits; a letter flaps on its own letter (viewed critique 08: random
// capitals made the Vietnamese unreadable, "CVSB R"), and a year or a date
// never spins (golden rule 1: shown as said, "5 2 4" was never said).
export const spinGlyph = (ch: string, seed: string, text: string): string =>
  /\d/.test(ch) && !asSaid(text)
    ? DIGITS[Math.floor(random(seed) * DIGITS.length)]
    : ch;

// Split-flap text: each character spins from `start + i * stagger` for
// `spin` frames, then lands. Before its start a character is blank.
export const useFlaps = (
  text: string,
  start: number,
  stagger = 2,
  spin = 10,
): { ch: string; landed: boolean; age: number }[] => {
  const frame = useCurrentFrame();
  return Array.from(text.normalize("NFC")).map((ch, i) => {
    const s = start + i * stagger;
    const land = s + spin;
    if (frame < s) return { ch: " ", landed: false, age: -1 };
    if (frame < land)
      return {
        ch:
          ch === " "
            ? " "
            : spinGlyph(ch, `${text}${i}${Math.floor(frame / 2)}`, text),
        landed: false,
        age: frame - s,
      };
    return { ch, landed: true, age: frame - land };
  });
};

// Characters on their own dark flap tiles, with the hinge line across.
export const FlipTiles: React.FC<{
  text: string;
  start: number;
  tileW: number;
  color?: string;
  stagger?: number;
}> = ({ text, start, tileW, color = "#fff", stagger = 3 }) => {
  const { fps } = useVideoConfig();
  const flaps = useFlaps(text, start, stagger, 12);
  const tileH = tileW * 1.38;
  return (
    <div style={{ display: "flex", gap: tileW * 0.08 }}>
      {flaps.map((f, i) => {
        const settle = f.landed
          ? spring({
              frame: f.age,
              fps,
              config: { damping: 11, stiffness: 220 },
            })
          : 1;
        const squash = f.landed ? settle : f.age % 2 === 0 ? 0.55 : 1;
        return (
          <div
            key={i}
            style={{
              position: "relative",
              width: tileW,
              height: tileH,
              borderRadius: tileW * 0.1,
              background: `linear-gradient(180deg, ${brand.background} 0%, ${INK} 49%, rgba(0,0,0,0.9) 50%, ${INK} 51%, ${brand.background} 100%)`,
              boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.5)${
                f.landed && f.age < 10 ? `, 0 0 26px ${color}55` : ""
              }`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: tileW * 1.02,
                lineHeight: 1,
                color: f.landed ? color : "rgba(255,255,255,0.7)",
                transform: `scaleY(${squash})`,
                textShadow: f.landed ? `0 0 18px ${color}66` : undefined,
              }}
            >
              {f.ch}
            </span>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: tileH / 2 - 1,
                height: 2,
                background: "rgba(0,0,0,0.65)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

// Tile width for `text` so the row stays within `maxW`.
export const tileFor = (text: string, maxW: number, cap: number) => {
  const n = Array.from(text).length;
  return Math.min(cap, maxW / (n * 1.08));
};

// Plain text that flips in character by character (board rows, labels).
export const FlipText: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, start, stagger = 1, style }) => {
  const flaps = useFlaps(text, start, stagger, 6);
  return (
    <span style={style}>
      {flaps.map((f, i) => (
        <span key={i} style={{ opacity: f.landed ? 1 : 0.55 }}>
          {f.ch}
        </span>
      ))}
    </span>
  );
};

// A blinking/pulsing LED.
export const Led: React.FC<{
  color?: string;
  size?: number;
  period?: number;
}> = ({ color = AMBER, size = 18, period = 30 }) => {
  const frame = useCurrentFrame();
  const on = interpolate(frame % period, [0, period / 2, period], [1, 0.25, 1]);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity: on,
        boxShadow: `0 0 ${size}px ${color}`,
        flex: `0 0 ${size}px`,
      }}
    />
  );
};

// Holds the frame until Be Vietnam Pro is in, so fitText measures true.
export const useFontReady = (label: string): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(label));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return ready;
};

// ------------------------------------------------------------------ status bar

export const STATUS_LABEL = "FINANCE HUB · CẬP NHẬT";
export const CHAPTER_WORD = "PHẦN";
const STATUS_W = 640; // clear of the LogoMark tile (x >= ~718)

const clock = (frame: number, fps: number) => {
  const s = Math.floor(frame / fps);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// Top-left of SAFE: a pulsing dot, the label and the video's clock; under
// it the video's topic, or the current chapter once chapters start.
export const StatusBar: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("ticker status bar: Be Vietnam Pro");
  const at = outFrameOf(reel.timeline, fps);
  const chapters = reel.edit.chapters ?? [];
  const idx = chapters.reduce((k, c, i) => (at(c.atMs) <= frame ? i : k), -1);
  const line =
    idx >= 0
      ? `${CHAPTER_WORD} ${idx + 1} · ${chapters[idx].title}`
      : (reel.edit.title ?? "");
  const since = idx >= 0 ? at(chapters[idx].atMs) : 0;
  const size = useMemo(
    () =>
      ready && line
        ? fitTextOnNLines({
            text: line,
            maxLines: 1,
            maxBoxWidth: STATUS_W - 40,
            fontFamily: FONT,
            fontWeight: 800,
            maxFontSize: 34,
          }).fontSize
        : 34,
    [ready, line],
  );
  const inP = interpolate(frame, [0, 10], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top,
        left: SAFE.left,
        width: STATUS_W,
        height: STATUS_H,
        fontFamily: FONT,
        opacity: inP,
        borderLeft: `6px solid ${AMBER}`,
        background: `linear-gradient(90deg, rgba(6,19,42,0.92), rgba(6,19,42,0.4))`,
        padding: "12px 20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Led />
        <span
          style={{
            color: AMBER,
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: 3,
          }}
        >
          {STATUS_LABEL}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: SKY,
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {clock(frame, fps)}
        </span>
      </div>
      {line ? (
        <div
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: size,
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          <FlipText key={line} text={line} start={since} />
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------------ tape

export const TAPE_LABEL = "CHỦ ĐỀ";

// The reel's own headlines, never invented data: title, hook, stats, chapter
// and cue titles, compare questions.
export const tapeItems = (reel: Reel): string[] => {
  const e = reel.edit;
  const items = [
    e.title,
    e.hook ? [e.hook.big, e.hook.sub].filter(Boolean).join(" ") : undefined,
    ...(e.stats ?? []).map((s) => `${s.big} ${s.label}`),
    ...(e.chapters ?? []).map((c) => c.title),
    ...(e.cues ?? []).flatMap((c) =>
      c.kind === "points" || c.kind === "bars" || c.kind === "trend"
        ? [c.title]
        : c.kind === "compare"
          ? [c.question?.text]
          : c.kind === "change"
            ? [`${c.label} ${c.from} → ${c.to}`]
            : [],
    ),
  ];
  return [...new Set(items.filter((x): x is string => Boolean(x)))];
};

export const Tape: React.FC<{ items: string[] }> = ({ items }) =>
  items.length ? (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE.right - SAFE.left,
        top: TAPE.top,
        height: TAPE.height,
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      <NewsTicker items={items} label={TAPE_LABEL} pxPerFrame={3} />
    </div>
  ) : null;
