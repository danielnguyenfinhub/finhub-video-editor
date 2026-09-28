// "blueprint" cues drawn on the stage: `points` as numbered callouts (circle
// numerals drawn one by one, a leader line out to each item) and `compare` as
// two drawn columns with a dashed centre line and "VS" in a drawn circle.
// Every other cue kind goes to the classic MotionTrack (index.tsx).
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { DIM, clamp, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  INK,
  MID_X,
  STAGE_H,
  Seg,
  Trace,
  circlePath,
  draw,
  rectPath,
  tint,
} from "./Paper";
import { StageSheet, Txt } from "./Stage";

type OwnCue = Extract<Cue, { kind: "points" | "compare" }>;
export const drawnHere = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare";

const fadeIn = (frame: number, at: number, len = 8) =>
  interpolate(frame, [at, at + len], [0, 1], clamp);

// ---------------------------------------------------------------- points

const Points: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({ cue, rel }) => {
  const frame = useCurrentFrame();
  const starts = cue.items.map((it) => rel(it.atMs));
  const titleY = 20;
  const listTop = 130;
  const rowH = Math.min(96, (STAGE_H - listTop - 10) / cue.items.length);
  const R = Math.min(32, rowH / 2 - 8);
  const cx = SAFE.left + R + 6;
  const textX = cx + R + 78;
  const itemSize = rowH < 90 ? 38 : 44;
  return (
    <StageSheet
      lines={
        <>
          {/* Heading underline: a double rule, like a drawing's title. */}
          <Seg
            x1={SAFE.left}
            y1={titleY + 78}
            x2={SAFE.right}
            y2={titleY + 78}
            p={draw(frame, 2, 18)}
            width={3}
          />
          <Seg
            x1={SAFE.left}
            y1={titleY + 88}
            x2={SAFE.right - 200}
            y2={titleY + 88}
            p={draw(frame, 8, 22)}
            width={1.5}
            color={tint(INK, 0.5)}
          />
          {/* The spine the callouts hang from. */}
          <Seg
            x1={cx}
            y1={listTop - 12}
            x2={cx}
            y2={listTop + rowH * (cue.items.length - 0.5)}
            p={draw(frame, 6, 24)}
            width={1.5}
            color={tint(INK, 0.35)}
            dash="4 8"
          />
          {cue.items.map((it, i) => {
            const s = starts[i];
            if (frame < s) return null;
            const cy = listTop + rowH * i + rowH / 2;
            const current = i === starts.length - 1 || frame < starts[i + 1];
            return (
              <g key={it.atMs}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill={current ? brand.highlight : brand.navy}
                  opacity={fadeIn(frame, s + 6)}
                />
                <Trace
                  d={circlePath(cx, cy, R)}
                  p={draw(frame, s, s + 10)}
                  width={3}
                  color={current ? brand.highlight : INK}
                />
                <Seg
                  x1={cx + R + 6}
                  y1={cy}
                  x2={textX - 14}
                  y2={cy}
                  p={draw(frame, s + 6, s + 14)}
                  width={2.5}
                />
                <circle
                  cx={textX - 14}
                  cy={cy}
                  r={4}
                  fill={INK}
                  opacity={fadeIn(frame, s + 12, 3)}
                />
              </g>
            );
          })}
        </>
      }
    >
      <Txt
        top={titleY}
        style={{
          textAlign: "left",
          fontSize: cue.title.length > 26 ? 44 : 54,
          fontWeight: 900,
          lineHeight: 1.35,
          whiteSpace: "nowrap",
          color: brand.text,
          opacity: fadeIn(frame, 0, 10),
        }}
      >
        {cue.title}
      </Txt>
      {cue.items.map((it, i) => {
        const s = starts[i];
        if (frame < s) return null;
        const top = listTop + rowH * i;
        const current = i === starts.length - 1 || frame < starts[i + 1];
        const p = fadeIn(frame, s + 10, 8);
        return (
          <div key={it.atMs}>
            <div
              style={{
                position: "absolute",
                left: cx - R,
                top: top + rowH / 2 - R,
                width: 2 * R,
                height: 2 * R,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: R * 0.95,
                fontWeight: 900,
                color: current ? brand.navy : INK,
                opacity: fadeIn(frame, s + 4, 6),
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                position: "absolute",
                left: textX,
                right: 1080 - SAFE.right,
                top,
                height: rowH,
                display: "flex",
                alignItems: "center",
                fontSize: itemSize,
                fontWeight: current ? 900 : 800,
                lineHeight: 1.2,
                textWrap: "balance",
                color: current ? brand.text : DIM,
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-24, 0])}px)`,
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </StageSheet>
  );
};

// ---------------------------------------------------------------- compare

const GAP = 84;
const COL_W = (SAFE.right - SAFE.left - GAP) / 2;
const COL_TOP = 10;

const Column: React.FC<{
  card: CueOf<"compare">["cards"][number];
  x: number;
  h: number;
  rel: Rel;
}> = ({ card, x, h, rel }) => {
  const frame = useCurrentFrame();
  const s = rel(card.atMs);
  if (frame < s) return null;
  const lit =
    card.highlightAtMs !== undefined && frame >= rel(card.highlightAtMs);
  const rows = card.rows.length;
  const valueSize = rows > 1 ? 64 : 88;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x + 18,
          width: COL_W - 36,
          top: COL_TOP + 18,
          height: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: card.title.length > 16 ? 34 : 40,
          fontWeight: 900,
          lineHeight: 1.15,
          color: lit ? brand.highlight : brand.text,
          opacity: fadeIn(frame, s + 8),
        }}
      >
        {card.title}
      </div>
      {card.rows.map((r, i) => {
        const at = rel(r.atMs);
        if (frame < at) return null;
        const top = COL_TOP + 130 + i * ((h - 150) / Math.max(1, rows));
        return (
          <div
            key={r.atMs + r.label}
            style={{
              position: "absolute",
              left: x + 12,
              width: COL_W - 24,
              top,
              textAlign: "center",
              opacity: fadeIn(frame, at),
              transform: `translateY(${interpolate(fadeIn(frame, at), [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 1,
                color: INK,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontSize: valueSize,
                fontWeight: 900,
                lineHeight: 1.1,
                color: toneColor(r.tone, brand.text),
              }}
            >
              {r.value}
            </div>
          </div>
        );
      })}
    </>
  );
};

const Compare: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const [a, b] = cue.cards;
  const q = cue.question ? rel(cue.question.atMs) : Infinity;
  // Columns end above the question box when there is one.
  const h = STAGE_H - COL_TOP - (cue.question ? 130 : 20);
  const xa = SAFE.left;
  const xb = SAFE.left + COL_W + GAP;
  const vs = rel(cue.vsAtMs ?? b.atMs);
  const vsY = COL_TOP + h / 2;
  const colLines = (card: typeof a, x: number) => {
    const s = rel(card.atMs);
    const lit =
      card.highlightAtMs !== undefined && frame >= rel(card.highlightAtMs);
    return (
      <>
        <Trace
          d={rectPath(x, COL_TOP, COL_W, h)}
          p={draw(frame, s, s + 16)}
          width={lit ? 5 : 3}
          color={lit ? brand.highlight : INK}
        />
        <Seg
          x1={x}
          y1={COL_TOP + 116}
          x2={x + COL_W}
          y2={COL_TOP + 116}
          p={draw(frame, s + 8, s + 18)}
          width={1.5}
          color={tint(INK, 0.6)}
        />
      </>
    );
  };
  return (
    <StageSheet
      lines={
        <>
          <Seg
            x1={MID_X}
            y1={COL_TOP - 6}
            x2={MID_X}
            y2={COL_TOP + h + 6}
            p={draw(frame, 0, 22)}
            width={2}
            color={tint(INK, 0.6)}
            dash="18 10 4 10"
          />
          {colLines(a, xa)}
          {colLines(b, xb)}
          {frame >= vs ? (
            <>
              <circle
                cx={MID_X}
                cy={vsY}
                r={40}
                fill={brand.navy}
                opacity={fadeIn(frame, vs)}
              />
              <Trace
                d={circlePath(MID_X, vsY, 40)}
                p={draw(frame, vs, vs + 12)}
                width={3}
                color={brand.highlight}
              />
            </>
          ) : null}
          {frame >= q ? (
            <Trace
              d={rectPath(
                SAFE.left + 30,
                STAGE_H - 104,
                SAFE.right - SAFE.left - 60,
                88,
              )}
              p={draw(frame, q, q + 14)}
              width={3}
              color={brand.highlight}
            />
          ) : null}
        </>
      }
    >
      <Column card={a} x={xa} h={h} rel={rel} />
      <Column card={b} x={xb} h={h} rel={rel} />
      {frame >= vs ? (
        <div
          style={{
            position: "absolute",
            left: MID_X - 40,
            top: vsY - 40,
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 900,
            color: brand.highlight,
            opacity: fadeIn(frame, vs + 4),
          }}
        >
          VS
        </div>
      ) : null}
      {cue.question && frame >= q ? (
        <Txt
          top={STAGE_H - 104}
          left={SAFE.left + 40}
          width={SAFE.right - SAFE.left - 80}
          style={{
            height: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: cue.question.text.length > 30 ? 36 : 44,
            fontWeight: 900,
            color: brand.highlight,
            opacity: fadeIn(frame, q + 6),
          }}
        >
          {cue.question.text}
        </Txt>
      ) : null}
    </StageSheet>
  );
};

// ---------------------------------------------------------------- track

// The sound the classic MotionTrack gives these kinds (it no longer sees them).
const sfxOf = (c: OwnCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const DrawnCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(drawnHere);
  return (
    <>
      {cues.map((c) => {
        const from = outFrame(c.fromMs);
        const rel: Rel = (ms) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
            layout="none"
          >
            {c.kind === "points" ? (
              <Points cue={c} rel={rel} />
            ) : (
              <Compare cue={c} rel={rel} />
            )}
          </Sequence>
        );
      })}
      {cues.flatMap(sfxOf).map((s) => (
        <Sequence
          key={`${s.file}${s.atMs}`}
          from={Math.max(0, outFrame(s.atMs))}
          durationInFrames={fps * 3}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${s.file}.wav`)}
            volume={() => s.volume}
          />
        </Sequence>
      ))}
    </>
  );
};
