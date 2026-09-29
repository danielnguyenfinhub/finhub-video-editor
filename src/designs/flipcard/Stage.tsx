// Who holds the stage when. The hero card: the hook (first 105 frames, the
// card turns over to the hook value), the design's own cues, a named bank
// (rule 2) on a white face, and between them the idle card floating with the
// video's title. Figures (rule 1) never take the stage: each is a mini gold
// card dealt into the chip lane under the logo tile, one at a time. A bank
// named while the stage is busy rides as a small white chip on the lane's right.
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised, pop } from "../../mortgage/style";
import { cueSpans } from "./Cues";
import {
  CARD,
  CHAPTER,
  DIM,
  Face,
  FlipCard,
  GOLD,
  INK,
  LANE,
  Tag,
  deal,
  fit1,
  fitN,
  flipAngle,
  idleSheen,
  idleTilt,
  useExitOut,
  useFontReady,
} from "./Look";
import { CardBack } from "./Parts";

export const LENDER_TAG = "ĐANG NHẮC TỚI";
export const LENDER_SUB = "Ngân hàng";
export const CHAPTER_WORD = "PHẦN";

const MIN_HOLD = 45; // READING.minNumberHoldMs at 30 fps
const WAIT = 15;
const IDLE_MIN = 45;
const INNER = CARD.w - 76;

type Span = [number, number];
type Slot = { from: number; frames: number; chip: boolean };

// Where a visual that wants [from, from + frames) goes, given the blocks: it
// waits up to WAIT frames for the stage, else rides as a chip.
const place = (from: number, frames: number, blocks: Span[]): Slot => {
  const hit = blocks.find(([a, b]) => from >= a && from < b);
  if (hit) {
    const shift = hit[1] - from;
    return shift <= WAIT && frames - shift >= MIN_HOLD / 2
      ? {
          from: hit[1],
          frames: Math.max(MIN_HOLD, frames - shift),
          chip: false,
        }
      : { from, frames, chip: true };
  }
  const next = blocks
    .filter(([a]) => a > from && a < from + frames)
    .sort((x, y) => x[0] - y[0])[0];
  if (!next) return { from, frames, chip: false };
  return next[0] - from >= MIN_HOLD
    ? { from, frames: next[0] - from, chip: false }
    : { from, frames, chip: true };
};

// Figures in the lane, one at a time: a figure that lands while the previous
// one is up shortens it (never under MIN_HOLD), else waits for it.
const laneOf = (figures: Figure[]) => {
  const out: { figure: Figure; from: number; frames: number }[] = [];
  for (const f of figures) {
    const prev = out[out.length - 1];
    let from = f.fromFrame;
    if (prev && from < prev.from + prev.frames) {
      prev.frames = Math.max(MIN_HOLD, from - prev.from);
      from = Math.max(from, prev.from + prev.frames);
    }
    out.push({ figure: f, from, frames: Math.max(MIN_HOLD, f.frames) });
  }
  return out;
};

export const stagePlan = (reel: Reel, fps: number) => {
  const blocks: Span[] = [
    ...(reel.edit.hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...cueSpans(reel, fps).map((c) => [c.from, c.to] as Span),
  ];
  const lenders = lenderMentionsOf(reel).map((m) => {
    const a = Math.round((m.startMs / 1000) * fps);
    const b = Math.max(a + 1, Math.round((m.endMs / 1000) * fps));
    const slot = place(a, b - a, blocks);
    if (!slot.chip) blocks.push([slot.from, slot.from + slot.frames]);
    return { lender: m.lender, key: `${m.lender.name}${m.startMs}`, slot };
  });
  return { lenders, blocks, lane: laneOf(figuresOf(reel, fps)) };
};

// Gaps of at least IDLE_MIN frames where nothing holds the stage.
const idleSpans = (blocks: Span[], talkFrames: number): Span[] => {
  const out: Span[] = [];
  let t = 0;
  for (const [a, b] of [...blocks].sort((x, y) => x[0] - y[0])) {
    if (a - t >= IDLE_MIN) out.push([t + 4, a]);
    t = Math.max(t, b);
  }
  if (talkFrames - t >= IDLE_MIN) out.push([t + 4, talkFrames]);
  return out;
};

// "4,35%" counts 0 → 4,35 keeping its decimals; a year or a date is shown as said.
export const counted = (big: string, k: number): string => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined || k >= 1) return big;
  if (/^(19|20)\d\d$/.test(m[0]) || /\d\/\d/.test(big)) return big;
  const grouped = /\.\d{3}(?!\d)/.test(m[0]);
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * k).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// ------------------------------------------------------------ hook

// The hook value on the gold face (the hook card's back, and the idle card's).
const HookBack: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
  big: string;
}> = ({ hook, big }) => (
  <Face kind="gold">
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: INK,
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: fit1(hook.big, INNER - 40, 200),
          lineHeight: 1.1,
        }}
      >
        {big}
      </div>
      {hook.sub ? (
        <div
          style={{
            textAlign: "center",
            fontWeight: 800,
            fontSize: fitN(hook.sub, INNER, 42),
            lineHeight: 1.25,
          }}
        >
          {hook.sub}
        </div>
      ) : null}
    </div>
  </Face>
);

const HookCard: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
  title: string;
}> = ({ hook, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = deal(frame, fps);
  const out = useExitOut();
  const mid = 24;
  const k = interpolate(frame, [mid + 4, mid + 34], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const big =
    hook.countTo === undefined
      ? hook.big
      : k >= 1
        ? hook.big
        : `${(hook.countTo * k).toLocaleString("vi-VN", {
            minimumFractionDigits: hook.decimals ?? 0,
            maximumFractionDigits: hook.decimals ?? 0,
          })}${hook.suffix ?? ""}`;
  const lead = hook.sub ?? title;
  const front = (
    <Face kind="navy">
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          color: "#ffffff",
          fontWeight: 900,
          fontSize: fitN(lead, INNER, 72, 3),
          lineHeight: 1.22,
        }}
      >
        {lead}
      </div>
    </Face>
  );
  const back = <HookBack hook={hook} big={big} />;
  return (
    <FlipCard
      front={front}
      back={back}
      angle={flipAngle(frame, mid)}
      tilt={idleTilt(frame)}
      enterY={d.y}
      enterRot={d.rot}
      opacity={Math.min(d.opacity, out)}
      sheen={idleSheen(frame - mid - 30)}
    />
  );
};

// ------------------------------------------------------------ idle

// Nothing else on the stage: the card floats with the video's title on its
// navy face, tilting slowly, a sheen crossing it every 2.5 s; with a hook,
// it turns over every 3.5 s between the title and the hook value.
const IDLE_TURN = 105;
const IDLE_FIRST = 45;

const idleAngle = (frame: number, turns: boolean): number => {
  const k = frame - IDLE_FIRST;
  if (!turns || k < 0) return 0;
  const n = Math.floor(k / IDLE_TURN);
  const from = n % 2 ? 180 : 0;
  return from + (180 - 2 * from) * (flipAngle(k - n * IDLE_TURN, 9) / 180);
};

const IdleCard: React.FC<{
  title: string;
  keywords: string[];
  t0: number;
  hook?: EditJson["hook"];
}> = ({ title, keywords, t0, hook }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = pop(frame, fps, 0);
  const out = useExitOut();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const t = t0 + frame;
  // Only turn when the card can land face-up again before the span ends.
  const turns = Boolean(hook) && durationInFrames >= IDLE_FIRST + 2 * IDLE_TURN;
  const last =
    IDLE_FIRST +
    Math.floor((durationInFrames - IDLE_FIRST) / (2 * IDLE_TURN)) *
      2 *
      IDLE_TURN;
  const angle = frame < last ? idleAngle(frame, turns) : 0;
  return (
    <FlipCard
      front={
        <Face kind="navy" padding="40px 44px">
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              fontWeight: 900,
              fontSize: fitN(title, INNER - 12, 80, 3),
              lineHeight: 1.22,
              color: "#ffffff",
            }}
          >
            <div>
              {words.map((w, i) => (
                <span
                  key={`${w}${i}`}
                  style={{ color: hit.has(i) ? GOLD : "#ffffff" }}
                >
                  {i ? " " : ""}
                  {w}
                </span>
              ))}
            </div>
          </div>
        </Face>
      }
      back={hook ? <HookBack hook={hook} big={hook.big} /> : undefined}
      angle={angle}
      tilt={idleTilt(t)}
      enterY={interpolate(p, [0, 1], [40, 0])}
      opacity={Math.min(p, out)}
      sheen={idleSheen(t)}
    />
  );
};

// ------------------------------------------------------------ lenders

const LenderCard: React.FC<{ lender: Lender; t0: number }> = ({
  lender,
  t0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = deal(frame, fps);
  const out = useExitOut();
  return (
    <FlipCard
      front={<CardBack />}
      back={
        <Face kind="white">
          <Tag text={LENDER_TAG} kind="gold" />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <LenderLogo lender={lender} height={150} />
            <div style={{ color: INK, fontWeight: 800, fontSize: 34 }}>
              {LENDER_SUB}
            </div>
          </div>
        </Face>
      }
      angle={flipAngle(frame, 12)}
      tilt={idleTilt(t0 + frame)}
      enterY={d.y}
      enterRot={d.rot}
      opacity={Math.min(d.opacity, out)}
    />
  );
};

// ------------------------------------------------------------ lane chips

// A mini card turning over into the lane (left: figures, right: banks);
// `after` (a stat's label) sits beside it and fades in, never turned.
const LaneCard: React.FC<{
  side: "left" | "right";
  children: React.ReactNode;
  after?: React.ReactNode;
}> = ({ side, children, after }) => {
  const frame = useCurrentFrame();
  const angle = 180 - flipAngle(frame, 7);
  const out = useExitOut(6);
  const s = Math.sin((angle * Math.PI) / 180);
  return (
    <div
      style={{
        position: "absolute",
        top: LANE.top,
        height: LANE.height,
        [side]: side === "left" ? SAFE.left : 1080 - SAFE.right,
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: out,
        fontFamily: FONT,
      }}
    >
      <div style={{ height: "100%", perspective: 900 }}>
        <div
          style={{
            height: "100%",
            position: "relative",
            borderRadius: 20,
            transform: `rotateY(${angle}deg) scale(${1 + 0.08 * s})`,
            boxShadow: `0 ${14 + 16 * s}px ${30 + 20 * s}px rgba(0,0,0,0.5)`,
          }}
        >
          {children}
          {angle >= 90 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "scaleX(-1)",
              }}
            >
              <CardBack />
            </div>
          ) : null}
        </div>
      </div>
      {after}
    </div>
  );
};

const FigureChip: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [10, 34], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const label = figure.source === "stat" ? figure.label : "";
  const size = fit1(figure.big, 300, 64);
  return (
    <LaneCard
      side="left"
      after={
        label ? (
          <div
            style={{
              width: 340,
              color: DIM,
              fontWeight: 800,
              fontSize: fitN(label, 340, 30),
              lineHeight: 1.25,
              opacity: interpolate(frame, [14, 22], [0, 1], clamp),
            }}
          >
            {label}
          </div>
        ) : null
      }
    >
      <div
        style={{
          position: "relative",
          height: "100%",
          minWidth: 230,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <Face kind="gold" padding="0 26px">
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: INK,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            {counted(figure.big, k)}
          </div>
        </Face>
        {/* Sizes the card to the number as said (the Face is absolute). */}
        <div
          style={{
            visibility: "hidden",
            padding: "0 26px",
            fontWeight: 900,
            fontSize: size,
            whiteSpace: "nowrap",
          }}
        >
          {figure.big}
        </div>
      </div>
    </LaneCard>
  );
};

const LenderChip: React.FC<{ lender: Lender }> = ({ lender }) => (
  <LaneCard side="right">
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        borderRadius: 20,
        background: "#ffffff",
        border: `3px solid ${GOLD}`,
        boxSizing: "border-box",
      }}
    >
      <LenderLogo lender={lender} height={64} />
    </div>
  </LaneCard>
);

// ------------------------------------------------------------ layer

export const FlipStage: React.FC<{
  reel: Reel;
  keywords: string[];
  talkFrames: number;
}> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const ready = useFontReady("flipcard stage: Be Vietnam Pro");
  if (!ready) return null;
  const hook = reel.edit.hook;
  const { lenders, blocks, lane } = stagePlan(reel, fps);
  return (
    <>
      {idleSpans(blocks, talkFrames).map(([a, b]) => (
        <Sequence
          key={`idle${a}`}
          from={a}
          durationInFrames={b - a}
          layout="none"
        >
          <IdleCard
            title={reel.edit.title}
            keywords={keywords}
            t0={a}
            hook={hook}
          />
        </Sequence>
      ))}
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookCard hook={hook} title={reel.edit.title} />
        </Sequence>
      ) : null}
      {lane.map(({ figure, from, frames }) => (
        <Sequence
          key={`${figure.source}${figure.fromFrame}`}
          from={from}
          durationInFrames={Math.max(1, frames)}
          layout="none"
        >
          <FigureChip figure={figure} />
        </Sequence>
      ))}
      {lenders.map(({ lender, key, slot }) => (
        <Sequence
          key={key}
          from={slot.from}
          durationInFrames={Math.max(1, slot.frames)}
          layout="none"
        >
          {slot.chip ? (
            <LenderChip lender={lender} />
          ) : (
            <LenderCard lender={lender} t0={slot.from} />
          )}
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------ chapters

// A small navy tab that turns over (on X) into the top-left corner.
const ChapterTab: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const out = useExitOut();
  const a = interpolate(frame, [0, 12], [-100, 0], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  return (
    <div
      style={{
        position: "absolute",
        top: CHAPTER.top,
        left: SAFE.left,
        maxWidth: CHAPTER.maxWidth,
        height: CHAPTER.height,
        perspective: 800,
        opacity: out,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 26px 0 12px",
          borderRadius: 18,
          background: INK,
          border: `2px solid ${GOLD}`,
          boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
          transform: `rotateX(${a}deg)`,
          transformOrigin: "top center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            padding: "6px 14px",
            borderRadius: 12,
            background: GOLD,
            color: INK,
            fontWeight: 900,
            fontSize: 26,
            letterSpacing: 2,
            whiteSpace: "nowrap",
          }}
        >
          {CHAPTER_WORD} {index}
        </div>
        <div
          style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: fit1(title, CHAPTER.maxWidth - 200, 34),
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};

export const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const ready = useFontReady("flipcard chapters: Be Vietnam Pro");
  if (!ready) return null;
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <ChapterTab index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};
