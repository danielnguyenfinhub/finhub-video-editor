// The chapter chrome: the nav rail (chapters, current one gold, completed
// ones ticked, overall progress) and the chapter panel under the focus
// stage. Positions come from layout.ts; frame 0 = first word.
import type React from "react";
import { interpolate, spring } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp, enter } from "../../../mortgage/style";
import { CALM, COPY, FOCUS, P, RAIL, alpha } from "./layout";
import { Check, clampLines, line1 } from "./Parts";

export type Chap = { from: number; title: string };
export const chapterAt = (chs: Chap[], f: number) =>
  chs.reduce((idx, c, i) => (c.from <= f ? i : idx), 0);
const progressIn = (chs: Chap[], i: number, f: number, end: number) => {
  const to = chs[i + 1]?.from ?? end;
  return interpolate(
    f,
    [chs[i].from, Math.max(chs[i].from + 1, to)],
    [0, 1],
    clamp,
  );
};
export const two = (n: number) => String(n).padStart(2, "0");

const Bar: React.FC<{ p: number; h: number; w?: number | string }> = ({
  p,
  h,
  w = "100%",
}) => (
  <div
    style={{ width: w, height: h, borderRadius: h / 2, background: P.faint }}
  >
    <div
      style={{
        width: `${p * 100}%`,
        height: "100%",
        borderRadius: h / 2,
        background: P.gold,
      }}
    />
  </div>
);

export type ChromeProps = {
  chs: Chap[];
  real: boolean; // false: no edit.json chapters, chs is the title alone
  f: number;
  fps: number;
  talkFrames: number;
};

export const NavRail: React.FC<ChromeProps> = ({ chs, f, fps, talkFrames }) => {
  const cur = chapterAt(chs, f);
  const top = 92;
  const bottomBlock = 120;
  const itemH = Math.max(
    76,
    Math.min(132, (RAIL.h - top - bottomBlock - 16) / chs.length),
  );
  // Continuous index, so the gold indicator glides between chapters.
  const pos = chs
    .slice(1)
    .reduce((s, c) => s + spring({ frame: f - c.from, fps, config: CALM }), 0);
  return (
    <div
      style={{
        position: "absolute",
        left: RAIL.x,
        top: RAIL.y,
        width: RAIL.w,
        height: RAIL.h,
        fontFamily: FONT,
        color: P.text,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 28,
          top: 30,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 4,
          color: P.gold,
        }}
      >
        {COPY.toc}
      </div>
      <div
        style={{
          position: "absolute",
          left: 28,
          right: 28,
          top: 72,
          height: 2,
          background: P.line,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: RAIL.w,
          top: top + pos * itemH,
          height: itemH,
          background: alpha(P.gold, 0.08),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 6,
            borderRadius: 3,
            background: P.gold,
          }}
        />
      </div>
      {chs.map((c, i) => {
        const done = i < cur;
        const now = i === cur;
        const tick = done
          ? spring({ frame: f - chs[i + 1].from, fps, config: { damping: 12 } })
          : 0;
        return (
          <div
            key={c.from}
            style={{
              position: "absolute",
              left: 26,
              right: 22,
              top: top + i * itemH,
              height: itemH,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 22,
                boxSizing: "border-box",
                border: `3px solid ${done || now ? P.gold : P.line}`,
                background: done ? P.gold : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
                fontWeight: 900,
                color: now ? P.gold : P.dim,
              }}
            >
              {done ? (
                <div style={{ transform: `scale(${tick})`, display: "flex" }}>
                  <Check size={28} color={brand.navy} />
                </div>
              ) : (
                i + 1
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 25,
                  lineHeight: 1.25,
                  fontWeight: now ? 800 : 600,
                  color: now ? P.text : P.dim,
                  opacity: done || now ? 1 : 0.6,
                  ...clampLines(2),
                }}
              >
                {c.title}
              </div>
              {now ? (
                <div style={{ marginTop: 8 }}>
                  <Bar p={progressIn(chs, i, f, talkFrames)} h={4} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 30 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 3,
              color: P.gold,
            }}
          >
            {COPY.progress}
          </span>
          <span
            style={{
              fontSize: 26,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(Math.min(1, f / talkFrames) * 100)}%
          </span>
        </div>
        <Bar p={Math.min(1, f / talkFrames)} h={8} />
      </div>
    </div>
  );
};

// Under the focus stage: the current chapter as a slate. It shows whenever
// no tile holds the stage, and re-animates at each chapter start.
export const ChapterPanel: React.FC<
  ChromeProps & { title: string; dim: number }
> = ({ chs, real, f, fps, talkFrames, title, dim }) => {
  const i = chapterAt(chs, f);
  const k = real ? enter(f, fps, chs[i].from) : 1;
  const next = real ? chs[i + 1] : undefined;
  const sheen = ((f % 360) / 360) * 2 - 0.5;
  return (
    <div
      style={{
        position: "absolute",
        left: FOCUS.x,
        top: FOCUS.y,
        width: FOCUS.w,
        height: FOCUS.h,
        overflow: "hidden",
        borderRadius: 20,
        fontFamily: FONT,
        color: P.text,
        opacity: 1 - 0.85 * dim,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "40%",
          left: `${sheen * 100}%`,
          background: `linear-gradient(100deg, transparent, ${alpha(brand.text, 0.035)}, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 60px",
          display: "flex",
          alignItems: "center",
          gap: 56,
        }}
      >
        {real ? (
          <div
            style={{
              fontSize: 220,
              fontWeight: 900,
              lineHeight: 1,
              color: P.gold,
              opacity: k,
              transform: `translateY(${(1 - k) * 60}px)`,
            }}
          >
            {two(i + 1)}
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            opacity: k,
            transform: `translateY(${(1 - k) * 20}px)`,
          }}
        >
          {real ? (
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 5,
                color: P.gold,
              }}
            >
              {COPY.chapter} {i + 1} / {chs.length}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.18,
              margin: "8px 0 22px",
              ...clampLines(2),
            }}
          >
            {real ? chs[i].title : title}
          </div>
          <Bar
            p={real ? progressIn(chs, i, f, talkFrames) : f / talkFrames}
            h={8}
            w={760}
          />
          {next ? (
            <div
              style={{
                marginTop: 18,
                fontSize: 26,
                fontWeight: 600,
                color: P.dim,
                ...line1,
              }}
            >
              {COPY.next}: {next.title}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
