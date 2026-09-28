// "kinetic" cues drawn in the design's own type: `points` (each item takes the
// stage as a big numbered line, then shrinks into the list as the next one
// lands) and `compare` (the frame splits into a navy and a gold block, "VS"
// crashes into the seam). Every other kind goes to the classic MotionTrack.
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import { MotionTrack } from "../classic/Cues";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  GOLD,
  H,
  NAVY,
  SAFE_W,
  STAGE,
  W,
  WHITE,
  blockAt,
  slabTopAt,
  useFontReady,
  type Blocks,
  type Surface,
} from "./blocks";

type OwnCue = Extract<Cue, { kind: "points" | "compare" }>;
export const drawnHere = (c: Cue): c is OwnCue =>
  c.kind === "points" || c.kind === "compare";

const slam = (frame: number, fps: number, at: number) =>
  spring({
    frame: frame - at,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.6 },
  });

// ------------------------------------------------------------- points

const BIG_TEXT = 84;
const SMALL_TEXT = 40;
const NUM_BOX = { big: 116, small: 60 };
const ROW_GAP = 14;

const Points: React.FC<{
  cue: CueOf<"points">;
  rel: Rel;
  from: number;
  blocks: Blocks;
}> = ({ cue, rel, from, blocks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = blockAt(blocks.beats, from + frame).text;
  const starts = cue.items.map((it) => rel(it.atMs));
  const title = useMemo(
    () =>
      Math.min(
        50,
        fitText({
          text: cue.title,
          withinWidth: SAFE_W - 60,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize,
      ),
    [cue.title],
  );
  const textW = SAFE_W - NUM_BOX.big - 28;
  const sizes = useMemo(
    () =>
      cue.items.map((it) => ({
        big: fitTextOnNLines({
          text: it.text,
          maxLines: 2,
          maxBoxWidth: textW,
          fontFamily: FONT,
          fontWeight: 900,
          maxFontSize: BIG_TEXT,
        }).fontSize,
        small: Math.min(
          SMALL_TEXT,
          fitText({
            text: it.text,
            withinWidth: SAFE_W - NUM_BOX.small - 28,
            fontFamily: FONT,
            fontWeight: 800,
          }).fontSize,
        ),
      })),
    [cue.items, textW],
  );
  const tp = slam(frame, fps, 0);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE_W,
        top: STAGE.top,
        height: STAGE.bottom - STAGE.top,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          padding: "6px 22px",
          fontSize: title,
          fontWeight: 900,
          lineHeight: 1.2,
          background: s.boxBg,
          color: s.boxInk,
          whiteSpace: "nowrap",
          marginBottom: 26,
          transform: `translateY(${interpolate(tp, [0, 1], [-80, 0])}px) rotate(-1.5deg)`,
          opacity: tp,
        }}
      >
        {cue.title}
      </div>
      {cue.items.map((it, i) => {
        if (frame < starts[i]) return null;
        const p = slam(frame, fps, starts[i]);
        // 1 while this item is the one being said, easing to 0 when the next lands.
        const next = starts[i + 1];
        const k =
          next === undefined
            ? 1
            : 1 -
              spring({
                frame: frame - next,
                fps,
                config: { damping: 200 },
                durationInFrames: 10,
              });
        const box = interpolate(k, [0, 1], [NUM_BOX.small, NUM_BOX.big]);
        const size = interpolate(k, [0, 1], [sizes[i].small, sizes[i].big]);
        return (
          <div
            key={it.atMs}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: i ? ROW_GAP : 0,
              width: SAFE_W,
              opacity: interpolate(frame - starts[i], [0, 3], [0, 1], clamp),
              transform: `translateX(${interpolate(p, [0, 1], [320, 0])}px)`,
            }}
          >
            <div
              style={{
                flex: `0 0 ${box}px`,
                height: box,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: box * 0.55,
                fontWeight: 900,
                background: k > 0.5 ? s.boxBg : "transparent",
                color: k > 0.5 ? s.boxInk : s.accent,
                outline: k > 0.5 ? undefined : `4px solid ${s.accent}`,
                outlineOffset: -4,
                transform: `rotate(${interpolate(p, [0, 1], [-30, 0])}deg)`,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: size,
                fontWeight: k > 0.5 ? 900 : 800,
                lineHeight: 1.15,
                color: s.ink,
                opacity: interpolate(k, [0, 1], [0.72, 1]),
                whiteSpace: k > 0.5 ? "normal" : "nowrap",
              }}
            >
              {it.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------- compare
// The seam: a slanted line from (SEAM + TILT, 0) to (SEAM - TILT, H). SEAM is
// the middle of SAFE, so both halves get the same text width.

const SEAM = (SAFE.left + SAFE.right) / 2;
const TILT = 40;
const seamX = (y: number) => SEAM + TILT - (2 * TILT * y) / H;
const HALF_W = SEAM - 80 - SAFE.left; // text column each side of the seam
const VS_R = 66;
const IN_FRAMES = 12;

// The split backdrop and its white slab: over the blocks while a compare is up.
const SplitBackdrop: React.FC<{ level: number[]; from: number }> = ({
  level,
  from,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [0, IN_FRAMES], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const outP = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [0, 1],
    clamp,
  );
  const top = slabTopAt(level[Math.min(from + frame, level.length - 1)] ?? 1);
  const a = seamX(0);
  const b = seamX(H);
  return (
    <AbsoluteFill style={{ opacity: 1 - outP }}>
      <AbsoluteFill
        style={{
          background: NAVY.bg,
          clipPath: `polygon(0 0, ${a}px 0, ${b}px ${H}px, 0 ${H}px)`,
          transform: `translateY(${interpolate(inP, [0, 1], [-H, 0])}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: GOLD.bg,
          clipPath: `polygon(${a}px 0, ${W}px 0, ${W}px ${H}px, ${b}px ${H}px)`,
          transform: `translateY(${interpolate(inP, [0, 1], [H, 0])}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: WHITE.bg,
          clipPath: `polygon(0 ${top + 22}px, ${W}px ${top - 22}px, ${W}px ${H}px, 0 ${H}px)`,
          transform: `translateY(${interpolate(inP, [0, 1], [500, 0])}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

const TITLE_TOP = STAGE.top + 10;
const ROWS_TOP = STAGE.top + 170;
const QUESTION_H = 110;
const ROWS_BOTTOM = STAGE.bottom - QUESTION_H - 30;

const Side: React.FC<{
  card: CueOf<"compare">["cards"][number];
  s: Surface;
  left: number;
  rel: Rel;
  enterFrom: number;
}> = ({ card, s, left, rel, enterFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = useMemo(
    () =>
      fitTextOnNLines({
        text: card.title,
        maxLines: 2,
        maxBoxWidth: HALF_W,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: 56,
      }),
    [card.title],
  );
  const rowH = (ROWS_BOTTOM - ROWS_TOP) / Math.max(1, card.rows.length);
  const values = useMemo(
    () =>
      card.rows.map((r) =>
        Math.min(
          150,
          (rowH - 50) / 1.05,
          fitText({
            text: r.value,
            withinWidth: HALF_W,
            fontFamily: FONT,
            fontWeight: 900,
          }).fontSize,
        ),
      ),
    [card.rows, rowH],
  );
  const at = rel(card.atMs);
  if (frame < at) return null;
  const p = slam(frame, fps, at);
  const hl = card.highlightAtMs === undefined ? null : rel(card.highlightAtMs);
  const pulse =
    hl === null ? 0 : interpolate(frame - hl, [0, 6, 16], [0, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left,
        width: HALF_W,
        top: TITLE_TOP,
        fontFamily: FONT,
        color: s.ink,
      }}
    >
      <div
        style={{
          fontSize: title.fontSize,
          fontWeight: 900,
          lineHeight: 1.15,
          height: ROWS_TOP - TITLE_TOP - 20,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          opacity: p,
          transform: `translateX(${interpolate(p, [0, 1], [enterFrom, 0])}px)`,
        }}
      >
        {title.lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div
        style={{
          height: 10,
          marginTop: 10,
          background: s.accent,
          transform: `scaleX(${p})`,
          transformOrigin: enterFrom < 0 ? "left" : "right",
        }}
      />
      {card.rows.map((r, i) => {
        const ra = rel(r.atMs);
        if (frame < ra) return null;
        const rp = slam(frame, fps, ra);
        const lit = hl !== null && frame >= hl;
        const bar =
          r.tone === "bad"
            ? brand.bad
            : r.tone === "good"
              ? brand.good
              : s.accent;
        return (
          <div key={r.label} style={{ height: rowH, paddingTop: 16 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                opacity: 0.85 * interpolate(frame - ra, [0, 4], [0, 1], clamp),
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                display: "inline-block",
                position: "relative",
                fontSize: values[i],
                fontWeight: 900,
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                transform: `scale(${interpolate(rp, [0, 1], [2, 1]) + pulse * 0.12})`,
                transformOrigin: "left center",
              }}
            >
              {r.value}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -6,
                  height: 16,
                  background: bar,
                  transform: `scaleX(${lit ? interpolate(frame - (hl ?? 0), [0, 8], [0, 1], clamp) : 0})`,
                  transformOrigin: "left",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Compare: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
  vsText: string;
}> = ({ cue, rel, vsText }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const vs = slam(frame, fps, vsAt);
  const vsY = (ROWS_TOP + ROWS_BOTTOM) / 2;
  const q = cue.question;
  const qAt = q ? rel(q.atMs) : 0;
  const qp = q ? slam(frame, fps, qAt) : 0;
  const qSize = useMemo(
    () =>
      q
        ? Math.min(
            62,
            fitText({
              text: q.text,
              withinWidth: SAFE_W - 70,
              fontFamily: FONT,
              fontWeight: 900,
            }).fontSize,
          )
        : 0,
    [q],
  );
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Side
        card={cue.cards[0]}
        s={NAVY}
        left={SAFE.left}
        rel={rel}
        enterFrom={-200}
      />
      <Side
        card={cue.cards[1]}
        s={GOLD}
        left={SAFE.right - HALF_W}
        rel={rel}
        enterFrom={200}
      />
      {frame >= vsAt ? (
        <div
          style={{
            position: "absolute",
            left: seamX(vsY) - VS_R,
            top: vsY - VS_R,
            width: 2 * VS_R,
            height: 2 * VS_R,
            borderRadius: "50%",
            background: WHITE.bg,
            border: `8px solid ${NAVY.bg}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 900,
            color: NAVY.bg,
            transform: `scale(${interpolate(vs, [0, 1], [3.5, 1])}) rotate(${interpolate(vs, [0, 1], [-200, -8])}deg)`,
            opacity: interpolate(frame - vsAt, [0, 2], [0, 1], clamp),
          }}
        >
          {vsText}
        </div>
      ) : null}
      {q && frame >= qAt ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: SAFE_W,
            top: STAGE.bottom - QUESTION_H,
            height: QUESTION_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: brand.primary,
            color: brand.text,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: qSize,
            whiteSpace: "nowrap",
            transform: `scaleX(${interpolate(qp, [0, 1], [0, 1])}) rotate(-1deg)`,
          }}
        >
          <span
            style={{ opacity: interpolate(frame - qAt, [3, 7], [0, 1], clamp) }}
          >
            {q.text}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- track

// The compare spans (talk frames): the backdrop is split, the slab white.
export const splitSpans = (reel: Reel, fps: number): [number, number][] => {
  const at = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? [])
    .filter((c) => c.kind === "compare")
    .map((c) => [at(c.fromMs), at(c.toMs)]);
};

// The same sounds the classic MotionTrack gives these kinds.
const sfxOf = (c: OwnCue) =>
  c.kind === "compare"
    ? c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }))
    : c.items.map((it) => ({
        atMs: it.atMs,
        file: "mouse-click",
        volume: 0.4,
      }));

export const SplitLayer: React.FC<{ reel: Reel; blocks: Blocks }> = ({
  reel,
  blocks,
}) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {splitSpans(reel, fps).map(([a, b]) => (
        <Sequence
          key={a}
          from={a}
          durationInFrames={Math.max(1, b - a)}
          layout="none"
        >
          <SplitBackdrop level={blocks.level} from={a} />
        </Sequence>
      ))}
    </>
  );
};

export const KineticCueTrack: React.FC<{
  reel: Reel;
  blocks: Blocks;
  vsText: string;
}> = ({ reel, blocks, vsText }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("cues");
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(drawnHere);
  const others = (reel.edit.cues ?? []).filter((c) => !drawnHere(c));
  return (
    <>
      {/* Every other kind: the classic panels, dropped under the LogoMark,
          mounted only while such a cue is up (MotionTrack always draws its
          film vignette, which would dirty the flat blocks the rest of the
          time). The inner Sequence puts it back on the talk timeline. */}
      {others.map((c) => {
        const a = outFrame(c.fromMs);
        const b = Math.max(a + 1, outFrame(c.toMs) + 2 * fps);
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={a}
            durationInFrames={b - a}
            layout="none"
          >
            <Sequence from={-a} layout="none">
              <MotionTrack
                reel={{ ...reel, edit: { ...reel.edit, cues: [c] } }}
                panelOffset={STAGE.top - 110}
                leak={false}
              />
            </Sequence>
          </Sequence>
        );
      })}
      {(ready ? cues : []).map((c) => {
        const from = outFrame(c.fromMs);
        const rel = (ms: number) => outFrame(ms) - from;
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
            layout="none"
          >
            {c.kind === "points" ? (
              <Points cue={c} rel={rel} from={from} blocks={blocks} />
            ) : (
              <Compare cue={c} rel={rel} vsText={vsText} />
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
