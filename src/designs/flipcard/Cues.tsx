// Cue kinds the flipcard draws itself: `change` and `compare` as the hero
// card turning over, BEFORE on the navy front, AFTER on the gold back (a
// difference ribbon unfurls under it only when the reel states one or both
// values parse in the same unit), and `points` as a deck: each point is dealt
// face-down off the stack and flips face-up, earlier ones fanned behind it,
// top-down in spoken order. Every other kind goes to the classic MotionTrack.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HOOK_FRAMES } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { clamp, pop, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { changeDiff } from "../flash/diff";
import {
  CARD,
  CARD_LEFT,
  DIM,
  Face,
  FlipCard,
  GOLD,
  INK,
  STAGE,
  Tag,
  deal,
  fit1,
  fitN,
  flipAngle,
  idleTilt,
  useExitOut,
  useFontReady,
} from "./Look";
import { CardBack, FlipIcon, Ribbon } from "./Parts";

export const BEFORE = "TRƯỚC";
export const AFTER = "SAU";

type OwnCue = Extract<Cue, { kind: "change" | "compare" | "points" }>;
export const isOwnCue = (c: Cue): c is OwnCue =>
  c.kind === "change" || c.kind === "compare" || c.kind === "points";

// Talk-frame span of every cue; an own cue that starts under the hook waits
// for it (its beats said before then show at once).
export const cueSpans = (reel: Reel, fps: number) => {
  const at = outFrameOf(reel.timeline, fps);
  const hookEnd = reel.edit.hook ? HOOK_FRAMES : 0;
  return (reel.edit.cues ?? []).map((c) => {
    const a = at(c.fromMs);
    const b = Math.max(a + 1, at(c.toMs));
    const from = isOwnCue(c) && a < hookEnd ? Math.min(hookEnd, b - 1) : a;
    return { cue: c, from, to: b };
  });
};

const INNER = CARD.w - 76; // text width inside a face

// Where the flip's midpoint may sit: after the card has landed, before it leaves.
const midIn = (at: number, dur: number) => Math.max(16, Math.min(at, dur - 20));

// ------------------------------------------------------------ change

const Arrow: React.FC<{ up: boolean; h: number }> = ({ up, h }) => {
  const w = h * 0.72;
  const d = `M${w / 2} 0 L${w} ${h * 0.46} L${w * 0.68} ${h * 0.46} L${w * 0.68} ${h} L${w * 0.32} ${h} L${w * 0.32} ${h * 0.46} L0 ${h * 0.46} Z`;
  return (
    <svg
      width={w}
      height={h}
      style={{ flex: `0 0 ${w}px`, transform: `rotate(${up ? 0 : 180}deg)` }}
    >
      <path d={d} fill={INK} />
    </svg>
  );
};

const HeaderRow: React.FC<{
  kicker?: string;
  corner: string;
  kind: "navy" | "gold";
}> = ({ kicker, corner, kind }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      height: 48,
    }}
  >
    {kicker ? <Tag text={kicker} kind={kind} /> : <span />}
    <span
      style={{
        fontWeight: 900,
        fontSize: 28,
        letterSpacing: 5,
        color: kind === "navy" ? GOLD : INK,
      }}
    >
      {corner}
    </span>
  </div>
);

const ChangeHero: React.FC<{
  cue: CueOf<"change">;
  rel: Rel;
  dur: number;
  t0: number;
}> = ({ cue, rel, dur, t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mid = midIn(rel(cue.swapAtMs), dur);
  const angle = flipAngle(frame, mid);
  const d = deal(frame, fps);
  const out = useExitOut();
  const labelSize = fitN(cue.label, INNER, 46);
  const fromSize = fit1(cue.from, INNER - 40, 170);
  const arrowH = cue.direction ? 120 : 0;
  const toSize = fit1(
    cue.to,
    INNER - 40 - (arrowH ? arrowH * 0.72 + 24 : 0),
    170,
  );
  const diff = changeDiff(cue.from, cue.to, cue.direction);
  const accent = cue.tone ? toneColor(cue.tone, GOLD) : GOLD;
  const landed = pop(frame, fps, mid + 2);
  const front = (
    <Face kind="navy">
      <HeaderRow kicker={cue.kicker} corner={BEFORE} kind="navy" />
      <div
        style={{
          marginTop: 10,
          color: "#ffffff",
          fontWeight: 800,
          fontSize: labelSize,
          lineHeight: 1.25,
        }}
      >
        {cue.label}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: fromSize,
          lineHeight: 1.1,
          color: "#ffffff",
          textShadow: "0 0 40px rgba(0,100,168,0.9)",
        }}
      >
        {cue.from}
      </div>
    </Face>
  );
  const back = (
    <Face kind="gold">
      <HeaderRow kicker={cue.kicker} corner={AFTER} kind="gold" />
      <div
        style={{
          marginTop: 10,
          color: INK,
          fontWeight: 800,
          fontSize: labelSize,
          lineHeight: 1.25,
        }}
      >
        {cue.label}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          transform: `scale(${interpolate(landed, [0, 1], [0.9, 1])})`,
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: toSize,
            lineHeight: 1.1,
            color: INK,
          }}
        >
          {cue.to}
        </span>
        {cue.direction ? (
          <Arrow up={cue.direction === "up"} h={arrowH} />
        ) : null}
      </div>
      <WasPill text={`${BEFORE} ${cue.from}`} />
    </Face>
  );
  return (
    <>
      <FlipCard
        front={front}
        back={back}
        angle={angle}
        tilt={idleTilt(t0 + frame)}
        enterY={d.y}
        enterRot={d.rot}
        opacity={Math.min(d.opacity, out)}
      />
      {diff ? (
        <Ribbon text={diff} at={mid + 14} accent={accent} opacity={out} />
      ) : null}
    </>
  );
};

// The before value, small, on the after face (from the cue's own data).
const WasPill: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      alignSelf: "center",
      padding: "4px 20px",
      borderRadius: 999,
      background: "rgba(6,19,42,0.14)",
      color: INK,
      fontWeight: 800,
      fontSize: fit1(text, INNER - 60, 30),
      lineHeight: 1.3,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

// ------------------------------------------------------------ compare

type Card = CueOf<"compare">["cards"][number];

const CompareFace: React.FC<{
  card: Card;
  kind: "navy" | "gold";
  rel: Rel;
  was?: string;
}> = ({ card, kind, rel, was }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ink = kind === "navy" ? "#ffffff" : INK;
  const one = card.rows.length === 1;
  return (
    <Face kind={kind}>
      <div
        style={{
          color: kind === "navy" ? GOLD : INK,
          fontWeight: 900,
          fontSize: fitN(card.title, INNER, 50),
          lineHeight: 1.22,
        }}
      >
        {card.title}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: one ? 0 : 10,
        }}
      >
        {card.rows.map((r) => {
          const p = pop(frame, fps, rel(r.atMs));
          const value = (
            <span
              style={{
                fontWeight: 900,
                fontSize: one ? fit1(r.value, INNER - 40, 160) : 58,
                lineHeight: 1.1,
                color: kind === "navy" ? toneColor(r.tone, ink) : ink,
                opacity: p,
                display: "inline-block",
                transform: `scale(${interpolate(p, [0, 1], [1.3, 1])})`,
              }}
            >
              {r.value}
            </span>
          );
          const label = (
            <span
              style={{
                fontWeight: 800,
                fontSize: one ? 30 : 32,
                lineHeight: 1.25,
                color: kind === "navy" ? DIM : INK,
              }}
            >
              {r.label}
            </span>
          );
          return one ? (
            <div key={r.label} style={{ textAlign: "center" }}>
              {label}
              <div>{value}</div>
            </div>
          ) : (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 20,
              }}
            >
              {label}
              {value}
            </div>
          );
        })}
      </div>
      {was ? <WasPill text={was} /> : null}
    </Face>
  );
};

// The difference: stated by the reel (the question), else computed from the
// first rows when they share a label and both parse in the same unit.
const compareDiff = (cue: CueOf<"compare">): string | null => {
  const [a, b] = cue.cards.map((c) => c.rows[0]);
  if (!a || !b || a.label !== b.label) return null;
  const d = changeDiff(a.value, b.value);
  return d ? `${d} · ${a.label}` : null;
};

const CompareHero: React.FC<{
  cue: CueOf<"compare">;
  rel: Rel;
  dur: number;
  t0: number;
}> = ({ cue, rel, dur, t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [before, after] = cue.cards;
  const frontDone = Math.max(
    rel(before.atMs),
    ...before.rows.map((r) => rel(r.atMs)),
  );
  const nextAt = rel(after.atMs);
  // Turn over once the before is read and just before the after value is
  // said, so the gold face never waits empty.
  const afterAt = after.rows.length
    ? Math.min(...after.rows.map((r) => rel(r.atMs)))
    : 0;
  const mid = midIn(Math.max(nextAt, frontDone + 24, afterAt - 6), dur);
  const angle = flipAngle(frame, mid);
  const d = deal(frame, fps);
  const out = useExitOut();
  const tone = after.rows[after.rows.length - 1]?.tone ?? "neutral";
  const accent = toneColor(tone, GOLD);
  const was =
    before.rows.length === 1
      ? `${before.title} ${before.rows[0].value}`
      : undefined;
  const stated = cue.question;
  const ribbonText = stated ? stated.text : compareDiff(cue);
  const ribbonAt = stated
    ? Math.max(rel(stated.atMs), mid + 10)
    : Math.max(mid + 14, ...after.rows.map((r) => rel(r.atMs) + 8));
  const teaser = frame >= nextAt && frame < mid - 6;
  return (
    <>
      <FlipCard
        front={<CompareFace card={before} kind="navy" rel={rel} />}
        back={<CompareFace card={after} kind="gold" rel={rel} was={was} />}
        angle={angle}
        tilt={idleTilt(t0 + frame)}
        enterY={d.y}
        enterRot={d.rot}
        opacity={Math.min(d.opacity, out)}
      />
      {teaser ? (
        <Ribbon
          text={after.title}
          at={nextAt}
          accent={GOLD}
          icon={<FlipIcon />}
          opacity={interpolate(frame, [mid - 12, mid - 6], [1, 0], clamp)}
        />
      ) : null}
      {ribbonText ? (
        <Ribbon text={ribbonText} at={ribbonAt} accent={accent} opacity={out} />
      ) : null}
    </>
  );
};

// ------------------------------------------------------------ points

// Five points get shorter cards so each earlier card's strip still shows
// its first line.
const rowH = (n: number) => (n >= 5 ? 170 : 196);
const FIRST_TOP = STAGE.top + 68;

const PointFace: React.FC<{
  n: number;
  text: string;
  current: boolean;
}> = ({ n, text, current }) => {
  const kind = current ? "gold" : "navy";
  const width = INNER - 90;
  return (
    <Face kind={kind} padding="14px 30px">
      <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
        <div
          style={{
            flex: "0 0 58px",
            height: 58,
            borderRadius: "50%",
            background: current ? INK : GOLD,
            color: current ? GOLD : INK,
            fontWeight: 900,
            fontSize: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {n}
        </div>
        <div
          style={{
            width,
            color: current ? INK : "#ffffff",
            fontWeight: 900,
            fontSize: fitN(text, width, 40),
            lineHeight: 1.25,
            paddingTop: 4,
          }}
        >
          {text}
        </div>
      </div>
    </Face>
  );
};

const PointsDeck: React.FC<{
  cue: CueOf<"points">;
  rel: Rel;
  t0: number;
}> = ({ cue, rel, t0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = useExitOut();
  const n = cue.items.length;
  const step = Math.min(
    118,
    (STAGE.bottom - rowH(n) - FIRST_TOP) / Math.max(1, n - 1),
  );
  const starts = cue.items.map((it) => rel(it.atMs));
  const said = starts.filter((s) => frame >= s - 6).length;
  const slot = (i: number) => FIRST_TOP + i * step;
  const title = pop(frame, fps, 0);
  const stackTop = slot(Math.min(said, n - 1));
  const tilt = idleTilt(t0 + frame);
  const small = { rx: tilt.rx * 0.3, ry: tilt.ry * 0.3, y: 0 };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <div
        style={{
          position: "absolute",
          left: CARD_LEFT,
          width: CARD.w,
          top: STAGE.top,
          height: 62,
          display: "flex",
          alignItems: "center",
          fontWeight: 900,
          fontSize: fit1(cue.title, CARD.w, 46),
          lineHeight: 1.25,
          color: GOLD,
          whiteSpace: "nowrap",
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [-20, 0])}px)`,
        }}
      >
        {cue.title}
      </div>
      {/* The face-down stack of points still to come, at the next slot. */}
      {Array.from({ length: n - said }, (_, k) => (
        <FlipCard
          key={`stack${k}`}
          front={<CardBack />}
          top={stackTop - (n - said - 1 - k) * 5}
          left={CARD_LEFT + (n - said - 1 - k) * 4}
          h={rowH(n)}
          radius={26}
          tilt={small}
          opacity={title}
        />
      ))}
      {cue.items.slice(0, said).map((it, i) => {
        const current = i === said - 1;
        // Lifted off the stack face-down, turned face-up as it is said.
        const angle = 180 - flipAngle(frame, starts[i] + 3);
        const fan = current ? 0 : i % 2 ? 1.1 : -1.1;
        return (
          <FlipCard
            key={it.atMs}
            front={<PointFace n={i + 1} text={it.text} current={current} />}
            back={<CardBack />}
            angle={angle}
            top={slot(i)}
            left={CARD_LEFT + (current ? 0 : fan * 5)}
            h={rowH(n)}
            radius={26}
            tilt={current ? small : { rx: 0, ry: 0, y: 0 }}
            enterRot={fan}
          />
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------ track

type Sfx = { atMs: number; file: string; volume: number };
const sfxOf = (c: OwnCue): Sfx[] => {
  switch (c.kind) {
    case "change":
      return [{ atMs: c.swapAtMs, file: "whoosh", volume: 0.3 }];
    case "points":
      return c.items.map((it) => ({
        atMs: it.atMs,
        file: "mouse-click",
        volume: 0.4,
      }));
    case "compare":
      return c.cards.map((k) => ({
        atMs: k.atMs,
        file: "mouse-click",
        volume: 0.5,
      }));
  }
};

export const FlipCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const ready = useFontReady("flipcard cues: Be Vietnam Pro");
  const spans = cueSpans(reel, fps).filter(
    (s): s is { cue: OwnCue; from: number; to: number } => isOwnCue(s.cue),
  );
  return (
    <>
      {(ready ? spans : []).map(({ cue: c, from, to }) => {
        const rel: Rel = (ms) => at(ms) - from;
        const dur = Math.max(1, to - from);
        return (
          <Sequence
            key={`${c.kind}${c.fromMs}`}
            from={from}
            durationInFrames={dur}
            layout="none"
          >
            {c.kind === "change" ? (
              <ChangeHero cue={c} rel={rel} dur={dur} t0={from} />
            ) : c.kind === "compare" ? (
              <CompareHero cue={c} rel={rel} dur={dur} t0={from} />
            ) : (
              <PointsDeck cue={c} rel={rel} t0={from} />
            )}
          </Sequence>
        );
      })}
      {spans
        .flatMap(({ cue }) => sfxOf(cue))
        .map((s) => (
          <Sequence
            key={`${s.file}${s.atMs}`}
            from={Math.max(0, at(s.atMs))}
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
