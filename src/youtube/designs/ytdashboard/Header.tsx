// The header: video title under a chapter breadcrumb, a chapter slate at
// each chapter start, a chip for a beat the stage had no room for, and the
// running time (which yields its place to LogoMark16 while that shows).
import type React from "react";
import { interpolate } from "remotion";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import { FONT, clamp, enter } from "../../../mortgage/style";
import type { Beat } from "./beats";
import { chapterAt, two, type ChromeProps } from "./Chrome";
import { COPY, HEADER, P, alpha, clock } from "./layout";
import { line1 } from "./Parts";

// LogoMark16's own window (first and last 10 s): the running time gives it
// the header's right end while it shows.
const logoShown = (f: number, talkFrames: number) =>
  Math.max(
    interpolate(f, [0, 10, 290, 300], [0, 1, 1, 0], clamp),
    interpolate(f, [talkFrames - 300, talkFrames - 290], [0, 1], clamp),
  );

const Chip: React.FC<{ chip: Beat; f: number; fps: number }> = ({
  chip,
  f,
  fps,
}) => {
  const k =
    enter(f, fps, chip.s) * interpolate(f, [chip.e - 6, chip.e], [1, 0], clamp);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 300,
        height: 60,
        padding: "0 20px",
        boxSizing: "border-box",
        borderRadius: 30,
        border: `2px solid ${P.gold}`,
        background: alpha(P.gold, 0.12),
        opacity: k,
        transform: `scale(${0.85 + 0.15 * k})`,
      }}
    >
      {chip.kind === "lender" ? (
        <LenderLogo lender={chip.lender} height={30} />
      ) : chip.kind === "hook" || chip.kind === "figure" ? (
        <>
          <span
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: P.gold,
              flexShrink: 0,
            }}
          >
            {chip.big}
          </span>
          {chip.label ? (
            <span
              style={{ fontSize: 19, fontWeight: 600, color: P.dim, ...line1 }}
            >
              {chip.label}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export const Header: React.FC<
  ChromeProps & { title: string; chips: Beat[] }
> = ({ chs, real, f, fps, talkFrames, title, chips }) => {
  const i = chapterAt(chs, f);
  const cs = chs[i].from;
  const slate = real
    ? interpolate(f, [cs, cs + 8, cs + 72, cs + 84], [0, 1, 1, 0], clamp)
    : 0;
  const chip = chips.find((c) => c.s <= f && f < c.e);
  const block: React.CSSProperties = {
    position: "absolute",
    left: 28,
    width: 730,
    top: 0,
    height: HEADER.h,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };
  return (
    <div
      style={{
        position: "absolute",
        left: HEADER.x,
        top: HEADER.y,
        width: HEADER.w,
        height: HEADER.h,
        fontFamily: FONT,
        color: P.text,
      }}
    >
      <div style={{ ...block, opacity: 1 - slate }}>
        {real ? (
          <div
            style={{ fontSize: 20, fontWeight: 700, color: P.dim, ...line1 }}
          >
            {COPY.chapter} {i + 1}/{chs.length} · {chs[i].title}
          </div>
        ) : null}
        <div style={{ fontSize: 36, fontWeight: 900, ...line1 }}>{title}</div>
      </div>
      <div
        style={{
          ...block,
          opacity: slate,
          transform: `translateY(${(1 - slate) * 10}px)`,
        }}
      >
        <div
          style={{
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: 5,
            color: P.gold,
          }}
        >
          {COPY.chapter} {two(i + 1)}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, ...line1 }}>
          {chs[i].title}
        </div>
      </div>
      {real ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 4,
            borderRadius: 2,
            width: `${interpolate(f, [cs, cs + 24], [0, 100], clamp)}%`,
            background: P.gold,
            opacity: slate,
          }}
        />
      ) : null}
      <div style={{ position: "absolute", left: 790, top: 18 }}>
        {chip ? <Chip chip={chip} f={f} fps={fps} /> : null}
      </div>
      <div
        style={{
          position: "absolute",
          right: 28,
          top: 0,
          height: HEADER.h,
          display: "flex",
          alignItems: "center",
          fontSize: 34,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          opacity: 1 - logoShown(f, talkFrames),
        }}
      >
        {clock(f, fps)}
        <span style={{ color: P.dim }}>&nbsp;/ {clock(talkFrames, fps)}</span>
      </div>
    </div>
  );
};
