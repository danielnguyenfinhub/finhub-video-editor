// The persistent table of contents on the left. Every chapter is a row: done
// ones get a check, the current one opens (gold bar, bold, a progress line
// for how far through the chapter we are, and the points said so far in it as
// sub-bullets), upcoming ones are dimmed. Without chapters it shows the title
// and one running outline of what has been said.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, clamp } from "../../../mortgage/style";
import { YT_SAFE } from "../../frame";
import { SIDE_W, type Bullet, type Chapter } from "./Plan";

export const SIDEBAR_COPY = ["MỤC LỤC", "NỘI DUNG", "✓"];
const OPEN = 14; // frames to open or close a row
const TEXT_W = SIDE_W - YT_SAFE.left - 44;

const Dot: React.FC<{ b: Bullet; now: number; size: number }> = ({
  b,
  now,
  size,
}) => {
  const p = interpolate(now - b.at, [0, 10], [0, 1], clamp);
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginTop: 10,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1.3,
        color: brand.textDim,
        opacity: p,
        transform: `translateX(${(1 - p) * 16}px)`,
      }}
    >
      <span
        style={{
          flex: "none",
          width: 9,
          height: 9,
          marginTop: size * 0.5,
          borderRadius: 5,
          background: brand.highlight,
        }}
      />
      <span>{b.text}</span>
    </div>
  );
};

const Row: React.FC<{
  c: Chapter;
  i: number;
  now: number;
  bullets: Bullet[];
  size: number;
  maxBullets: number;
}> = ({ c, i, now, bullets, size, maxBullets }) => {
  const done = now >= c.to;
  const current = now >= c.from && !done;
  const open = Math.min(
    interpolate(now, [c.from, c.from + OPEN], [0, 1], clamp),
    interpolate(now, [c.to, c.to + OPEN], [1, 0], clamp),
  );
  const progress = interpolate(now, [c.from, c.to], [0, 1], clamp);
  const said = bullets
    .filter((b) => b.at >= c.from && b.at < c.to && b.at <= now)
    .slice(-maxBullets);
  const badge = size * 1.55;
  return (
    <div
      style={{
        position: "relative",
        padding: `${10 + 8 * open}px 0 ${10 + 8 * open}px 0`,
        opacity: current ? 1 : done ? 0.78 : 0.42,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -28,
          top: 8,
          bottom: 8,
          width: 8,
          borderRadius: 4,
          background: brand.highlight,
          opacity: open,
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        <div
          style={{
            flex: "none",
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.8,
            fontWeight: 900,
            color: done || current ? brand.textOnCard : brand.text,
            background: done || current ? brand.highlight : "transparent",
            border: done || current ? "none" : `3px solid ${brand.textDim}`,
            boxSizing: "border-box",
          }}
        >
          {done ? SIDEBAR_COPY[2] : i + 1}
        </div>
        <div style={{ flex: 1, paddingTop: (badge - size * 1.25) / 2 }}>
          <div
            style={{
              fontSize: size,
              fontWeight: current ? 800 : 600,
              lineHeight: 1.25,
              color: brand.text,
            }}
          >
            {c.title}
          </div>
          <div
            style={{ maxHeight: open * 420, opacity: open, overflow: "hidden" }}
          >
            <div
              style={{
                marginTop: 12,
                height: 6,
                borderRadius: 3,
                background: `${brand.card}26`,
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: brand.highlight,
                }}
              />
            </div>
            {said.map((b) => (
              <Dot
                key={`${b.at}${b.text}`}
                b={b}
                now={now}
                size={size * 0.78}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<{
  title: string;
  chapters: Chapter[];
  bullets: Bullet[];
  talkFrames: number;
}> = ({ title, chapters, bullets, talkFrames }) => {
  const now = useCurrentFrame();
  const n = chapters.length;
  // ponytail: sizes stepped by chapter count, not measured; a very long TOC
  // (10+ chapters with two-line titles) could still run past the bottom.
  const size = n <= 5 ? 30 : n <= 8 ? 26 : 22;
  const maxBullets = n <= 4 ? 4 : n <= 7 ? 3 : 2;
  const said = bullets.filter((b) => b.at <= now).slice(-7);
  return (
    <div
      style={{
        position: "absolute",
        left: YT_SAFE.left,
        top: YT_SAFE.top,
        width: TEXT_W,
        height: YT_SAFE.bottom - YT_SAFE.top,
        fontFamily: FONT,
        color: brand.text,
        opacity: interpolate(now, [0, 10], [0, 1], clamp),
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: 6,
          color: brand.highlight,
        }}
      >
        {n ? SIDEBAR_COPY[0] : SIDEBAR_COPY[1]}
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 34,
          fontWeight: 800,
          lineHeight: 1.25,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </div>
      <div
        style={{
          margin: "26px 0 12px",
          height: 2,
          background: `${brand.card}33`,
        }}
      />
      {n ? (
        chapters.map((c, i) => (
          <Row
            key={c.from}
            c={c}
            i={i}
            now={now}
            bullets={bullets}
            size={size}
            maxBullets={maxBullets}
          />
        ))
      ) : (
        <>
          {said.map((b) => (
            <Dot key={`${b.at}${b.text}`} b={b} now={now} size={28} />
          ))}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 8,
              borderRadius: 4,
              background: `${brand.card}26`,
            }}
          >
            <div
              style={{
                width: `${interpolate(now, [0, talkFrames], [0, 100], clamp)}%`,
                height: "100%",
                borderRadius: 4,
                background: brand.highlight,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};
