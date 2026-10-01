// "timelapse" content: what sits on the dial's disc (hook, before -> after
// values, figure chips, a bank), the timeline pins and difference chip, the
// top slot (scene title, question, small timestamp chips) and the points
// milestones. Every piece reads the absolute talk frame `t`.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE, type Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { EditJson } from "../../mortgage/schema";
import { FONT, clamp, pop, toneColor } from "../../mortgage/style";
import {
  CLOCK,
  ClockIcon,
  INK,
  MINI,
  PINS,
  SKY,
  TOP,
  TOP_RIGHT,
  TRACK,
  ease,
  pinX,
} from "./Machine";
import {
  SCRUB,
  diffOf,
  hookScrub,
  scrubPair,
  type Row,
  type Scene,
} from "./Plan";

export const BEFORE_WORD = "TRƯỚC";
export const AFTER_WORD = "SAU";
export const LENDER_WORD = "ĐANG NHẮC TỚI";
const WAIT_DOTS = "• • •";

// In over 6 frames from `a`, out over 8 frames before `b`.
export const fade = (t: number, a: number, b: number) =>
  b - a < 16
    ? interpolate(
        t,
        [a, a + 1, Math.max(a + 2, b - 1), Math.max(a + 3, b)],
        [0, 1, 1, 0],
        clamp,
      )
    : interpolate(t, [a, a + 6, b - 8, b], [0, 1, 1, 0], clamp);

const fit = (text: string, width: number, max: number, min = 18) =>
  Math.max(
    min,
    Math.min(
      max,
      fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
        .fontSize,
    ),
  );

const tnum: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

// ------------------------------------------------------------- the disc

const Line: React.FC<{
  y: number;
  width: number;
  size: number;
  color: string;
  weight?: number;
  opacity?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  y,
  width,
  size,
  color,
  weight = 800,
  opacity = 1,
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: CLOCK.x - width / 2,
      width,
      top: y,
      transform: "translateY(-50%)",
      textAlign: "center",
      fontFamily: FONT,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.18,
      color,
      textWrap: "balance",
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

// A value mid-scrub: the text with fading copies smeared above and below.
const Smear: React.FC<{
  text: string;
  y: number;
  size: number;
  color: string;
  smear: number;
  scale?: number;
  opacity?: number;
}> = ({ text, y, size, color, smear, scale = 1, opacity = 1 }) => (
  <>
    {smear > 0.05
      ? [-2, -1, 1, 2].map((k) => (
          <Line
            key={k}
            y={y + k * 16 * smear}
            width={320}
            size={size}
            color={color}
            weight={900}
            opacity={opacity * 0.22 * smear * (3 - Math.abs(k))}
            style={{ ...tnum, whiteSpace: "nowrap" }}
          >
            {text}
          </Line>
        ))
      : null}
    <Line
      y={y}
      width={320}
      size={size}
      color={color}
      weight={900}
      opacity={opacity}
      style={{
        ...tnum,
        whiteSpace: "nowrap",
        transform: `translateY(-50%) scale(${scale})`,
      }}
    >
      {text}
    </Line>
  </>
);

// One value running from `from` to `to` over [at, at + SCRUB]: a numeric
// scrub when both are clean numbers in one unit, else a blur swap.
const Scrubbed: React.FC<{
  t: number;
  at: number;
  from: string;
  to: string;
  y: number;
  size: number;
  fromColor: string;
  toColor: string;
}> = ({ t, at, from, to, y, size, fromColor, toColor }) => {
  const p = interpolate(t, [at, at + SCRUB], [0, 1], clamp);
  const land = interpolate(t, [at + SCRUB, at + SCRUB + 10], [1.16, 1], clamp);
  const pair = scrubPair(from, to);
  if (p <= 0 || p >= 1)
    return (
      <Smear
        text={p >= 1 ? to : from}
        y={y}
        size={size}
        color={p >= 1 ? toColor : fromColor}
        smear={0}
        scale={p >= 1 ? land : 1}
      />
    );
  if (pair)
    return (
      <Smear
        text={pair(ease(p))}
        y={y}
        size={size}
        color="#ffffff"
        smear={Math.sin(Math.PI * p)}
      />
    );
  const out = p < 0.5;
  const b = out ? p * 2 : (1 - p) * 2;
  return (
    <Line
      y={y}
      width={320}
      size={size}
      color={out ? fromColor : toColor}
      weight={900}
      style={{
        ...tnum,
        whiteSpace: "nowrap",
        filter: `blur(${b * 14}px)`,
        opacity: 1 - b * 0.7,
      }}
    >
      {out ? from : to}
    </Line>
  );
};

const LABEL_Y = CLOCK.y - 86;
const SUB_Y = CLOCK.y + 82;

// A label that switches at `at` (before -> after), crossfading.
const Switch: React.FC<{
  t: number;
  at: number;
  a: string;
  b: string;
  showA: number;
}> = ({ t, at, a, b, showA }) => {
  // The old label slides up and out, then the new one up and in: never both.
  const m = at + SCRUB * 0.5;
  const kOut = interpolate(t, [m - 3, m], [0, 1], clamp);
  const kIn = interpolate(t, [m, m + 3], [0, 1], clamp);
  const slide = (dy: number) => ({
    letterSpacing: 1,
    transform: `translateY(calc(-50% + ${dy}px))`,
  });
  return (
    <>
      {kOut < 1 ? (
        <Line
          y={LABEL_Y}
          width={270}
          size={fit(a, 270, 30, 20)}
          color={SKY}
          opacity={(1 - kOut) * showA}
          style={slide(-26 * kOut)}
        >
          {a}
        </Line>
      ) : null}
      {kIn > 0 ? (
        <Line
          y={LABEL_Y}
          width={270}
          size={fit(b, 270, 30, 20)}
          color={brand.highlight}
          opacity={kIn}
          style={slide(26 * (1 - kIn))}
        >
          {b}
        </Line>
      ) : null}
    </>
  );
};

export const HookDisc: React.FC<{
  t: number;
  hook: NonNullable<EditJson["hook"]>;
}> = ({ t, hook }) => {
  const { fps } = useVideoConfig();
  const count = hookScrub(hook);
  const p = interpolate(t, [6, 40], [0, 1], clamp);
  const size = fit(hook.big, 270, 118);
  const text = count ? count(ease(p)) : hook.big;
  return (
    <>
      <Smear
        text={text}
        y={hook.sub ? CLOCK.y - 18 : CLOCK.y}
        size={size}
        color={p >= 1 ? brand.highlight : "#ffffff"}
        smear={count ? Math.sin(Math.PI * p) : 0}
        scale={interpolate(t, [40, 50], [1.16, 1], clamp)}
        opacity={count ? 1 : pop(t, fps, 4)}
      />
      {hook.sub ? (
        <Line
          y={SUB_Y}
          width={280}
          size={26}
          color="#ffffff"
          weight={700}
          opacity={pop(t, fps, 16)}
        >
          {hook.sub}
        </Line>
      ) : null}
    </>
  );
};

type Pair = { before?: Row; after: Row };
const pairsOf = (s: Extract<Scene, { kind: "compare" }>): Pair[] =>
  s.after.map((a, i) => ({
    before: s.before.find((b) => b.label === a.label) ?? s.before[i],
    after: a,
  }));

export const CompareDisc: React.FC<{
  t: number;
  s: Extract<Scene, { kind: "compare" }>;
}> = ({ t, s }) => {
  const { fps } = useVideoConfig();
  const pairs = pairsOf(s).slice(0, 2);
  const two = pairs.length > 1;
  const rows = pairs.map((p, i) => {
    const y = two ? CLOCK.y - 40 + i * 110 : CLOCK.y;
    const from = p.before && t >= p.before.at ? p.before.value : "";
    const size = fit(
      p.after.value.length > (p.before?.value.length ?? 0)
        ? p.after.value
        : (p.before?.value ?? ""),
      290,
      two ? 64 : 112,
    );
    return (
      <div
        key={p.after.label}
        style={{
          opacity:
            from || t >= s.reveal ? pop(t, fps, p.before?.at ?? s.reveal) : 0,
        }}
      >
        <Scrubbed
          t={t}
          at={s.reveal}
          from={from}
          to={p.after.value}
          y={y}
          size={size}
          fromColor="#ffffff"
          toColor={toneColor(p.after.tone, brand.highlight)}
        />
        <Line
          y={y + (two ? 44 : 82)}
          width={280}
          size={two ? 20 : 26}
          color={brand.textDim}
          weight={700}
        >
          {p.after.label}
        </Line>
      </div>
    );
  });
  // Before the first value is said: a waiting pulse on the disc.
  const waiting = t < s.reveal && !s.before.some((r) => t >= r.at);
  return (
    <>
      {waiting ? (
        <Line
          y={CLOCK.y}
          width={200}
          size={56}
          color={SKY}
          weight={900}
          opacity={0.35 + 0.35 * Math.sin(t / 4)}
        >
          {WAIT_DOTS}
        </Line>
      ) : null}
      {two ? null : (
        <Switch
          t={t}
          at={s.reveal}
          a={s.titles[0]}
          b={s.titles[1]}
          showA={interpolate(
            t,
            [s.titleAt[0], s.titleAt[0] + 8],
            [0, 1],
            clamp,
          )}
        />
      )}
      {rows}
    </>
  );
};

export const ChangeDisc: React.FC<{
  t: number;
  s: Extract<Scene, { kind: "change" }>;
}> = ({ t, s }) => {
  const c = s.cue;
  const size = fit(c.to.length > c.from.length ? c.to : c.from, 290, 118);
  return (
    <>
      <Switch t={t} at={s.reveal} a={BEFORE_WORD} b={AFTER_WORD} showA={1} />
      <Scrubbed
        t={t}
        at={s.reveal}
        from={c.from}
        to={c.to}
        y={CLOCK.y + 8}
        size={size}
        fromColor="#ffffff"
        toColor={toneColor(c.tone ?? "neutral", brand.highlight)}
      />
    </>
  );
};

// A figure as a timestamp chip on the disc; a stat's label under it (an
// automatic figure's words are already in the captions).
export const FigureDisc: React.FC<{
  t: number;
  from: number;
  figure: Figure;
}> = ({ t, from, figure }) => {
  const { fps } = useVideoConfig();
  const p = pop(t, fps, from);
  const size = fit(figure.big, 220, 92);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CLOCK.x,
          top: figure.source === "stat" ? CLOCK.y - 34 : CLOCK.y,
          transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [1.4, 1])})`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 22px",
          borderRadius: 22,
          border: `3px solid ${brand.highlight}`,
          background: INK,
          boxShadow: `0 0 30px rgba(255,185,56,0.35)`,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.15,
          color: "#ffffff",
          whiteSpace: "nowrap",
          opacity: p,
          ...tnum,
        }}
      >
        <ClockIcon size={Math.round(size * 0.5)} t={t} />
        {figure.big}
      </div>
      {figure.source === "stat" && figure.label ? (
        <Line
          y={CLOCK.y + 76}
          width={290}
          size={25}
          color={brand.textDim}
          weight={700}
          opacity={interpolate(t, [from + 10, from + 20], [0, 1], clamp)}
        >
          {figure.label}
        </Line>
      ) : null}
    </>
  );
};

export const LenderDisc: React.FC<{
  t: number;
  from: number;
  lender: Lender;
}> = ({ t, from, lender }) => {
  const { fps } = useVideoConfig();
  const p = pop(t, fps, from);
  return (
    <>
      <Line
        y={LABEL_Y + 10}
        width={270}
        size={22}
        color={SKY}
        style={{ letterSpacing: 4 }}
        opacity={p}
      >
        {LENDER_WORD}
      </Line>
      <div
        style={{
          position: "absolute",
          left: CLOCK.x,
          top: CLOCK.y + 20,
          transform: `translate(-50%, -50%) scale(${interpolate(p, [0, 1], [0.5, 1])})`,
          opacity: p,
        }}
      >
        <LenderLogo lender={lender} height={70} />
      </div>
    </>
  );
};

export const Timecode: React.FC<{ t: number; opacity: number }> = ({
  t,
  opacity,
}) => {
  const { fps } = useVideoConfig();
  const s = Math.floor(t / fps);
  const text = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return opacity > 0.01 ? (
    <Line
      y={CLOCK.y + 84}
      width={200}
      size={36}
      color={SKY}
      weight={800}
      opacity={opacity * 0.85}
      style={{ ...tnum, letterSpacing: 3 }}
    >
      {text}
    </Line>
  ) : null;
};

// ------------------------------------------------------------- the track

const PIN_W = 300;

const Pin: React.FC<{
  x: number;
  title: string;
  value: string;
  color: string;
  show: number;
  valueShow: number;
  lit: boolean;
}> = ({ x, title, value, color, show, valueShow, lit }) => {
  const left = Math.min(
    Math.max(x - PIN_W / 2, TRACK.x0 - 50),
    TRACK.x1 + 30 - PIN_W,
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 11,
          top: TRACK.y - 11,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: lit ? brand.highlight : brand.navy,
          border: `3px solid ${lit ? brand.highlight : SKY}`,
          opacity: show,
          boxShadow: lit ? `0 0 18px ${brand.highlight}` : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left,
          width: PIN_W,
          bottom: 1920 - (TRACK.y - 34),
          textAlign: "center",
          fontFamily: FONT,
          opacity: show,
          transform: `translateY(${(1 - show) * 14}px)`,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1.15,
            color: lit ? "#ffffff" : SKY,
            textWrap: "balance",
          }}
        >
          {title}
        </div>
        {value ? (
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1.2,
              color,
              opacity: valueShow,
              ...tnum,
            }}
          >
            {value}
          </div>
        ) : null}
      </div>
    </>
  );
};

const DiffChip: React.FC<{ text: string; color: string; show: number }> = ({
  text,
  color,
  show,
}) => (
  <div
    style={{
      position: "absolute",
      left: (PINS[0] + PINS[1]) / 2,
      top: TRACK.y,
      transform: `translate(-50%, -50%) scale(${interpolate(show, [0, 1], [0.6, 1])})`,
      padding: "6px 18px",
      borderRadius: 999,
      background: brand.navy,
      border: `3px solid ${color}`,
      boxShadow: `0 0 20px ${color}`,
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 900,
      color,
      whiteSpace: "nowrap",
      opacity: show,
      ...tnum,
    }}
  >
    {text}
  </div>
);

// Before (left) and after (right) pins with their values, and the difference
// between them once the fast-forward lands (only when the data allows one).
export const ScenePins: React.FC<{
  t: number;
  s: Extract<Scene, { kind: "compare" | "change" }>;
  show: number;
}> = ({ t, s, show }) => {
  const { fps } = useVideoConfig();
  const landed = t >= s.reveal + SCRUB;
  const diffIn = pop(t, fps, s.reveal + SCRUB + 6);
  if (s.kind === "change") {
    const c = s.cue;
    const tone = toneColor(c.tone ?? "neutral", brand.highlight);
    const diff = diffOf(c.from, c.to, c.direction);
    return (
      <>
        <Pin
          x={PINS[0]}
          title={BEFORE_WORD}
          value={c.from}
          color="#ffffff"
          show={show}
          valueShow={1}
          lit={!landed}
        />
        <Pin
          x={PINS[1]}
          title={AFTER_WORD}
          value={c.to}
          color={tone}
          show={show}
          valueShow={landed ? 1 : 0}
          lit={landed}
        />
        {diff && landed ? (
          <DiffChip text={diff} color={tone} show={diffIn * show} />
        ) : null}
      </>
    );
  }
  const b = s.before[0];
  const a = s.after[0];
  const tone = a ? toneColor(a.tone, brand.highlight) : brand.highlight;
  const diff = a && b && a.label === b.label ? diffOf(b.value, a.value) : null;
  return (
    <>
      <Pin
        x={PINS[0]}
        title={s.titles[0]}
        value={b && t >= b.at ? b.value : ""}
        color="#ffffff"
        show={
          show * interpolate(t, [s.titleAt[0], s.titleAt[0] + 8], [0, 1], clamp)
        }
        valueShow={1}
        lit={!landed}
      />
      <Pin
        x={PINS[1]}
        title={s.titles[1]}
        value={a?.value ?? ""}
        color={tone}
        show={
          show * interpolate(t, [s.titleAt[1], s.titleAt[1] + 8], [0, 1], clamp)
        }
        valueShow={landed ? 1 : 0}
        lit={landed}
      />
      {diff && landed ? (
        <DiffChip text={diff} color={tone} show={diffIn * show} />
      ) : null}
    </>
  );
};

// ------------------------------------------------------------- top slot

const TopBox: React.FC<{
  show: number;
  left?: number;
  children: React.ReactNode;
}> = ({ show, left = SAFE.left, children }) => (
  <div
    style={{
      position: "absolute",
      left,
      maxWidth: TOP_RIGHT - left,
      top: TOP,
      fontFamily: FONT,
      opacity: show,
      transform: `translateX(${(1 - show) * -30}px)`,
    }}
  >
    {children}
  </div>
);

export const ChangeTitle: React.FC<{
  s: Extract<Scene, { kind: "change" }>;
  show: number;
}> = ({ s, show }) => (
  <TopBox show={show}>
    {s.cue.kicker ? (
      <span
        style={{
          display: "inline-block",
          padding: "4px 16px",
          marginBottom: 10,
          borderRadius: 999,
          background: brand.highlight,
          color: brand.navy,
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: 2,
        }}
      >
        {s.cue.kicker}
      </span>
    ) : null}
    <div
      style={{
        fontSize: 42,
        fontWeight: 900,
        lineHeight: 1.18,
        color: "#ffffff",
        textWrap: "balance",
      }}
    >
      {s.cue.label}
    </div>
  </TopBox>
);

export const Question: React.FC<{ text: string; show: number }> = ({
  text,
  show,
}) => (
  <TopBox show={show}>
    <div
      style={{
        padding: "12px 24px",
        borderRadius: 20,
        background: INK,
        border: `3px solid ${brand.highlight}`,
        fontSize: 40,
        fontWeight: 900,
        lineHeight: 1.2,
        color: brand.highlight,
        textWrap: "balance",
      }}
    >
      {text}
    </div>
  </TopBox>
);

// A figure or bank while the dial is taken: a small timestamp chip.
export const MiniFigure: React.FC<{
  t: number;
  figure: Figure;
  show: number;
}> = ({ t, figure, show }) => (
  <TopBox show={show}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px",
        borderRadius: 18,
        background: INK,
        border: `2px solid ${brand.highlight}`,
      }}
    >
      <ClockIcon size={34} t={t} />
      <span
        style={{ fontSize: 44, fontWeight: 900, color: "#ffffff", ...tnum }}
      >
        {figure.big}
      </span>
      {figure.source === "stat" && figure.label ? (
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
            color: brand.textDim,
            maxWidth: 360,
          }}
        >
          {figure.label}
        </span>
      ) : null}
    </div>
  </TopBox>
);

export const MiniLender: React.FC<{ lender: Lender; show: number }> = ({
  lender,
  show,
}) => (
  <TopBox show={show}>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <LenderLogo lender={lender} height={54} />
      <span
        style={{ fontSize: 22, fontWeight: 800, color: SKY, letterSpacing: 3 }}
      >
        {LENDER_WORD}
      </span>
    </div>
  </TopBox>
);

// ------------------------------------------------------------- points

const CARDS_TOP = 596;
const CARDS_BOTTOM = 1040;

export const PointsScene: React.FC<{
  t: number;
  s: Extract<Scene, { kind: "points" }>;
  show: number;
}> = ({ t, s, show }) => {
  const { fps, width } = useVideoConfig();
  const n = s.items.length;
  const step = Math.min(114, (CARDS_BOTTOM - CARDS_TOP) / n);
  const said = s.items.filter((it) => t >= it.at).length;
  const title = pop(t, fps, s.from);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: show,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: MINI.x + MINI.r + 22,
          maxWidth: TOP_RIGHT - MINI.x - MINI.r - 22,
          top: MINI.y,
          transform: `translate(${(1 - title) * -30}px, -50%)`,
          opacity: title,
          fontSize: 42,
          fontWeight: 900,
          lineHeight: 1.18,
          color: "#ffffff",
          textWrap: "balance",
        }}
      >
        {s.title}
      </div>
      {s.items.map((it, i) => {
        if (t < it.at) return null;
        const p = pop(t, fps, it.at);
        const current = i === said - 1;
        return (
          <div
            key={it.at}
            style={{
              position: "absolute",
              left: SAFE.left,
              right: width - SAFE.right,
              top: CARDS_TOP + i * step,
              height: step - 18,
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "0 24px 0 16px",
              borderRadius: 20,
              background: INK,
              border: `2px solid ${current ? brand.highlight : "rgba(255,255,255,0.18)"}`,
              boxShadow: current ? `0 0 26px rgba(255,185,56,0.35)` : "none",
              opacity: p,
              transform: `translateX(${(1 - p) * 60}px)`,
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: current ? brand.highlight : "transparent",
                border: `3px solid ${current ? brand.highlight : SKY}`,
                color: current ? brand.navy : SKY,
                fontSize: 26,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                fontSize: step < 100 ? 30 : 36,
                fontWeight: current ? 900 : 700,
                lineHeight: 1.2,
                color: current ? "#ffffff" : brand.textDim,
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

// Milestone pins on the track, lighting up in order.
export const PointsPins: React.FC<{
  t: number;
  s: Extract<Scene, { kind: "points" }>;
  show: number;
}> = ({ t, s, show }) => (
  <>
    {s.items.map((it, i) => {
      const lit = t >= it.at;
      const x = pinX(i, s.items.length);
      return (
        <div
          key={it.at}
          style={{
            position: "absolute",
            left: x - 20,
            top: TRACK.y - 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: lit ? brand.highlight : brand.navy,
            border: `3px solid ${lit ? brand.highlight : SKY}`,
            boxShadow: lit ? `0 0 20px ${brand.highlight}` : "none",
            color: lit ? brand.navy : SKY,
            fontFamily: FONT,
            fontSize: 22,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: show,
          }}
        >
          {i + 1}
        </div>
      );
    })}
  </>
);
