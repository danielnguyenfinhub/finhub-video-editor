// What the wall calendar's top page shows, and when. The page is one place,
// so it is scheduled: the hook, then each `change` cue (old rate on the page,
// torn off at swapAtMs to reveal the new one), a date stat (a flip-through
// that lands on the date, circled in gold). Every other figure, or a date
// whose page is taken, is a sticky note on the calendar's edge; a named bank
// is a clipped card over the chapter tab. The calendar steps back while a
// full-width cue (compare, trend, classic panels) holds the desk.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HOOK_FRAMES, type Figure, hookText } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { clamp, toneColor } from "../../mortgage/style";
import type { CueOf } from "../classic/Infographics";
import { useFontReady } from "../ticker/Board";
import {
  CAL,
  CAL_W,
  CalendarShell,
  GOLD,
  HeaderBand,
  LiftShadow,
  MarkerCircle,
  NAVY,
  PAGE_TOP,
  PAPER,
  Sheet,
  fitSize,
  flipInStyle,
  highlight,
  lines,
  tearStyle,
  useFlipIn,
} from "./Desk";
import {
  FLIP_THROUGH,
  MIN_HOLD,
  TEAR,
  isDate,
  isYear,
  type Plan,
  type Span,
} from "./Plan";

export const BRAND_KICKER = "FINANCE HUB";

const INNER = CAL_W - 100;
const SIDE_SHIFT = 34;
const SIDE_SCALE = 0.14;

const Big: React.FC<{ text: string; cap?: number; color?: string }> = ({
  text,
  cap = 210,
  color = NAVY,
}) => (
  <div
    style={{
      fontWeight: 900,
      fontSize: Math.min(cap, fitSize(text, INNER, cap)),
      lineHeight: 1.1,
      color,
      whiteSpace: "nowrap",
      letterSpacing: "-0.02em",
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {text}
  </div>
);

const Note: React.FC<{ text: string; at?: number }> = ({ text, at = 10 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        marginTop: 22,
        maxWidth: INNER,
        textAlign: "center",
        textWrap: "balance",
        fontWeight: 800,
        fontSize: lines(text, INNER, 2, 44),
        lineHeight: 1.3,
        color: NAVY,
        opacity: interpolate(frame, [at, at + 8], [0, 1], clamp),
      }}
    >
      {text}
    </div>
  );
};

// ------------------------------------------------------------------ headers

const Header: React.FC<{ kicker?: string; text?: string }> = ({
  kicker,
  text,
}) => (
  <HeaderBand
    left={CAL.left}
    width={CAL_W}
    top={CAL.top}
    height={CAL.head}
    kicker={kicker}
    text={text}
    size={text ? lines(text, CAL_W - 60, 1, 44) : undefined}
  />
);

// ------------------------------------------------------------------ pages

// Count a percentage or amount up; a date or a year is never counted.
// `countAt`: the value at count progress p, through hookText (exported for
// check-design-figures).
export const countAt = (
  hook: NonNullable<Reel["edit"]["hook"]>,
  p: number,
): string => {
  if (isDate(hook.big) || isYear(hook.big)) return hook.big;
  return hookText(hook, p);
};
const useCount = (hook: NonNullable<Reel["edit"]["hook"]>): string =>
  countAt(
    hook,
    interpolate(useCurrentFrame(), [4, 30], [0, 1], {
      ...clamp,
      easing: (x) => 1 - (1 - x) ** 3,
    }),
  );

// A page's last TEAR frames: it is torn off the pad, showing the one under it.
const Leave: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(
    frame,
    [durationInFrames - TEAR, durationInFrames],
    [0, 1],
    { ...clamp, easing: (x) => x * x },
  );
  return (
    <div
      style={{ position: "absolute", inset: 0, ...(t > 0 ? tearStyle(t) : {}) }}
    >
      {children}
    </div>
  );
};

const HookPage: React.FC<{ hook: NonNullable<Reel["edit"]["hook"]> }> = ({
  hook,
}) => {
  const p = useFlipIn(0);
  const shown = useCount(hook);
  return (
    <Sheet style={flipInStyle(p)}>
      <Big text={shown} cap={fitSize(hook.big, INNER, 220)} />
      {hook.sub ? <Note text={hook.sub} at={14} /> : null}
    </Sheet>
  );
};

const Arrow: React.FC<{ up: boolean; color: string }> = ({ up, color }) => (
  <svg width={46} height={46} viewBox="0 0 46 46">
    <path
      d={up ? "M23 4 L42 40 L4 40 Z" : "M23 42 L42 6 L4 6 Z"}
      fill={color}
    />
  </svg>
);

const ChangePage: React.FC<{
  cue: CueOf<"change">;
  swap: number;
  under: boolean;
}> = ({ cue, swap, under }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = useFlipIn(0);
  const p = under ? 1 : flip;
  const tear = interpolate(frame, [swap, swap + TEAR], [0, 1], {
    ...clamp,
    easing: (x) => x * x,
  });
  const tag = spring({
    frame: frame - swap - 6,
    fps,
    config: { damping: 11, stiffness: 180 },
  });
  const tone = cue.tone ? toneColor(cue.tone, NAVY) : NAVY;
  const size = Math.min(
    fitSize(cue.from, INNER, 220),
    fitSize(cue.to, INNER, 220),
  );
  return (
    <>
      {/* the next page, under the one that tears off */}
      <Sheet>
        <Big text={cue.to} cap={size} color={cue.tone ? tone : NAVY} />
        {frame >= swap ? (
          <div
            style={{
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "10px 24px",
              borderRadius: 40,
              background: cue.tone ? tone : NAVY,
              color: PAPER,
              fontWeight: 900,
              fontSize: 40,
              transform: `scale(${tag})`,
            }}
          >
            {cue.direction ? (
              <Arrow up={cue.direction === "up"} color={GOLD} />
            ) : null}
            <span style={{ textDecoration: "line-through", opacity: 0.85 }}>
              {cue.from}
            </span>
          </div>
        ) : null}
        <LiftShadow p={tear} />
      </Sheet>
      {tear < 1 ? (
        <Sheet
          style={{ ...flipInStyle(p), ...(tear > 0 ? tearStyle(tear) : {}) }}
        >
          <Big text={cue.from} cap={size} />
        </Sheet>
      ) : null}
    </>
  );
};

// Blank pages flip past, then the date lands and gets its gold ring.
const DatePage: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const size = fitSize(figure.big, INNER - 60, 200);
  const w = Math.min(INNER, size * 0.62 * figure.big.length + 90);
  const h = size * 1.35;
  if (frame < FLIP_THROUGH) {
    const k = (frame % 4) / 4;
    return (
      <>
        <Sheet />
        <Sheet style={tearStyle(k)} />
      </>
    );
  }
  return (
    <Sheet>
      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Big text={figure.big} cap={size} />
        <MarkerCircle w={w} h={h} at={FLIP_THROUGH + 2} />
      </div>
      {figure.label ? <Note text={figure.label} at={FLIP_THROUGH + 8} /> : null}
    </Sheet>
  );
};

// Between claims: the video's topic, written on the page.
const IdlePage: React.FC<{ title: string; style?: React.CSSProperties }> = ({
  title,
  style,
}) => (
  <Sheet style={style}>
    <div
      style={{
        maxWidth: INNER,
        textAlign: "center",
        fontWeight: 900,
        fontSize: lines(title, INNER, 3, 76),
        lineHeight: 1.3,
        color: NAVY,
      }}
    >
      <span style={highlight(true)}>{title}</span>
    </div>
  </Sheet>
);

// ------------------------------------------------------------------ calendar

// A points notepad lies over the page: the title page is torn off before the
// notepad comes in (viewed critique 08: its text showed through the pad's),
// and a fresh one settles back once the notepad has left.
export const titleStyle = (
  frame: number,
  spans: Span[],
): React.CSSProperties | undefined => {
  for (const [a, b] of spans) {
    if (frame >= a - TEAR && frame < b)
      return tearStyle(
        interpolate(frame, [a - TEAR, a], [0, 1], {
          ...clamp,
          easing: (x) => x * x,
        }),
      );
    if (frame >= b && frame < b + 10)
      return { opacity: interpolate(frame, [b, b + 10], [0, 1], clamp) };
  }
  return undefined;
};

export const Calendar: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => {
  const frame = useCurrentFrame();
  const ready = useFontReady("calendar page: Be Vietnam Pro");
  const at = outFrameOf(reel.timeline, useVideoConfig().fps);
  const pads: Span[] = (reel.edit.cues ?? []).flatMap((c) =>
    c.kind === "points" ? [[at(c.fromMs), at(c.toMs)] as Span] : [],
  );
  const hide = plan.hidden.reduce(
    (m, [a, b]) =>
      Math.max(
        m,
        Math.min(
          interpolate(frame, [a - 2, a + 8], [0, 1], clamp),
          interpolate(frame, [b - 8, b + 2], [1, 0], clamp),
        ),
      ),
    0,
  );
  // A sticky note is up: the calendar shrinks left to give it the edge.
  const side = plan.notes.reduce((m, { figure: f }) => {
    const end = f.fromFrame + Math.max(MIN_HOLD, f.frames);
    return Math.max(
      m,
      Math.min(
        interpolate(frame, [f.fromFrame - 6, f.fromFrame + 4], [0, 1], clamp),
        interpolate(frame, [end - 6, end + 4], [1, 0], clamp),
      ),
    );
  }, 0);
  if (!ready || hide >= 1) return null;
  const hook = reel.edit.hook;
  const base = <Header kicker={BRAND_KICKER} />;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${CAL.left}px ${PAGE_TOP}px`,
        transform: `translate(${-SIDE_SHIFT * side}px, ${hide * 40}px) scale(${1 - hide * 0.06 - SIDE_SCALE * side})`,
      }}
    >
      <CalendarShell opacity={1 - hide} header={base}>
        <Sheet />
        {reel.edit.title ? (
          <IdlePage title={reel.edit.title} style={titleStyle(frame, pads)} />
        ) : null}
        {plan.changes.map((c) => (
          <Sequence
            key={c.cue.fromMs}
            from={c.from}
            durationInFrames={Math.max(1, c.to - c.from)}
            layout="none"
          >
            <Leave>
              <ChangePage cue={c.cue} swap={c.swap - c.from} under={c.under} />
            </Leave>
          </Sequence>
        ))}
        {plan.dates.map((d) => (
          <Sequence
            key={d.from}
            from={d.from}
            durationInFrames={d.to - d.from}
            layout="none"
          >
            <Leave>
              <DatePage figure={d.figure} />
            </Leave>
          </Sequence>
        ))}
        {hook && plan.hookOnPage ? (
          <Sequence durationInFrames={HOOK_FRAMES} layout="none">
            <Leave>
              <HookPage hook={hook} />
            </Leave>
          </Sequence>
        ) : null}
      </CalendarShell>
      {/* the header band follows the page that holds it */}
      {plan.changes.map((c) => (
        <Sequence
          key={c.cue.fromMs}
          from={c.from}
          durationInFrames={Math.max(1, c.to - c.from)}
          layout="none"
        >
          <div style={{ opacity: 1 - hide }}>
            <Header kicker={c.cue.kicker ?? BRAND_KICKER} text={c.cue.label} />
          </div>
        </Sequence>
      ))}
    </div>
  );
};

// ------------------------------------------------------------------ sfx

export const PageSfx: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const hits = [
    ...plan.changes.map((c) => ({ at: c.swap, file: "whoosh", volume: 0.35 })),
    ...plan.dates.map((d) => ({ at: d.from, file: "whoosh", volume: 0.3 })),
    ...plan.dates.map((d) => ({
      at: d.from + FLIP_THROUGH,
      file: "ding",
      volume: 0.22,
    })),
  ];
  return (
    <>
      {hits.map((s) => (
        <Sequence
          key={`${s.file}${s.at}`}
          from={Math.max(0, s.at)}
          durationInFrames={fps * 2}
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
