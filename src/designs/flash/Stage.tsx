// Who holds the stage when: the hook (first 105 frames), the design's own
// cues, then figures (golden rule 1) and named banks (rule 2). Nothing
// stacks: a figure or bank that starts while the stage is taken waits for it
// if it frees within 15 frames, else it rides as a small chip in the CHIP
// lane above the stage for its own span.
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { EditJson, Reel } from "../../mortgage/schema";
import { FONT, emphasised } from "../../mortgage/style";
import {
  BG,
  CHIP,
  DIM,
  FlashCard,
  GOLD,
  Glint,
  NAVY,
  STRIPES,
  Tag,
  W,
  punch,
  useExitOut,
  useFontReady,
} from "./Frame";
import { cueSpans } from "./Cues";
import { FIGURE_TAG, FigureCard } from "./Figures";

export const HOOK_TAG = "TIN NHANH";
export const LENDER_TAG = "ĐANG NHẮC TỚI";
export const LENDER_SUB = "Ngân hàng";

const MIN_HOLD = 45; // READING.minNumberHoldMs at 30 fps
const WAIT = 15;
const CW = W - 60;

type Span = [number, number];
export type Slot = { from: number; frames: number; chip: boolean };

// Where a visual that wants [from, from + frames) goes, given the blocks.
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

export const stagePlan = (reel: Reel, fps: number) => {
  const blocks: Span[] = [
    ...(reel.edit.hook ? [[0, HOOK_FRAMES] as Span] : []),
    ...cueSpans(reel, fps).map((c) => [c.from, c.to] as Span),
  ];
  const figures = figuresOf(reel, fps).map((f) => {
    const slot = place(f.fromFrame, f.frames, blocks);
    if (!slot.chip) blocks.push([slot.from, slot.from + slot.frames]);
    return { figure: f, slot };
  });
  const lenders = lenderMentionsOf(reel).map((m) => {
    const a = Math.round((m.startMs / 1000) * fps);
    const b = Math.max(a + 1, Math.round((m.endMs / 1000) * fps));
    const slot = place(a, b - a, blocks);
    if (!slot.chip) blocks.push([slot.from, slot.from + slot.frames]);
    return { lender: m.lender, key: `${m.lender.name}${m.startMs}`, slot };
  });
  return { figures, lenders, blocks };
};

// Gaps of at least IDLE_MIN frames where nothing holds the stage.
const IDLE_MIN = 45;
export const idleSpans = (blocks: Span[], talkFrames: number): Span[] => {
  const out: Span[] = [];
  let t = 0;
  for (const [a, b] of [...blocks].sort((x, y) => x[0] - y[0])) {
    if (a - t >= IDLE_MIN) out.push([t + 4, a]);
    t = Math.max(t, b);
  }
  if (talkFrames - t >= IDLE_MIN) out.push([t + 4, talkFrames]);
  return out;
};

// ------------------------------------------------------------ hook

const HookCard: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const ready = useFontReady("flash hook: Be Vietnam Pro");
  const big = ready
    ? Math.min(
        200,
        fitText({
          text: hook.big,
          withinWidth: CW - 40,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize,
      )
    : 200;
  return (
    <FlashCard>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          opacity: ready ? 1 : 0,
        }}
      >
        <Tag text={HOOK_TAG} size={34} />
        <Glint first={8} every={45}>
          <div
            style={{
              fontWeight: 900,
              fontSize: big,
              lineHeight: 1.12,
              color: GOLD,
              padding: "0 16px",
              textShadow: "0 0 50px rgba(255,185,56,0.55)",
            }}
          >
            {hook.big}
          </div>
        </Glint>
        {hook.sub ? (
          <div
            style={{
              maxWidth: CW,
              textAlign: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: 50,
              lineHeight: 1.28,
              textWrap: "balance",
            }}
          >
            {hook.sub}
          </div>
        ) : null}
      </div>
    </FlashCard>
  );
};

// ------------------------------------------------------------ idle

// While nothing else holds the stage: the reel's own title as the flash
// headline, so the stage never sits empty through a talky stretch.
const IdleHeadline: React.FC<{ title: string; keywords: string[] }> = ({
  title,
  keywords,
}) => {
  const ready = useFontReady("flash headline: Be Vietnam Pro");
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const size = ready
    ? fitTextOnNLines({
        text: title,
        maxLines: 3,
        maxBoxWidth: CW - 20,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: 92,
      }).fontSize
    : 92;
  return (
    <FlashCard>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 22,
          opacity: ready ? 1 : 0,
        }}
      >
        <Tag text={HOOK_TAG} />
        <Glint first={10} every={60}>
          <div
            style={{
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.2,
              color: "#fff",
            }}
          >
            {words.map((w, i) => (
              <span
                key={`${w}${i}`}
                style={{ color: hit.has(i) ? GOLD : "#fff" }}
              >
                {i ? " " : ""}
                {w}
              </span>
            ))}
          </div>
        </Glint>
      </div>
    </FlashCard>
  );
};

// ------------------------------------------------------------ lenders

const LenderCard: React.FC<{ lender: Lender }> = ({ lender }) => (
  <FlashCard>
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
      }}
    >
      <Tag text={LENDER_TAG} size={34} />
      <Glint first={8} every={50} style={{ borderRadius: 24 }}>
        <LenderLogo lender={lender} height={140} />
      </Glint>
      <div style={{ color: DIM, fontWeight: 800, fontSize: 38 }}>
        {LENDER_SUB}
      </div>
    </div>
  </FlashCard>
);

// ------------------------------------------------------------ chips

// A small flash chip in the CHIP lane: figures on the left, banks on the right.
const Chip: React.FC<{ side: "left" | "right"; children: React.ReactNode }> = ({
  side,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = punch(frame, fps);
  const out = useExitOut(6);
  return (
    <div
      style={{
        position: "absolute",
        top: CHIP.top,
        height: CHIP.height,
        [side]: side === "left" ? SAFE.left : 1080 - SAFE.right,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px 0 0",
        borderRadius: 14,
        overflow: "hidden",
        background: BG,
        border: `3px solid ${GOLD}`,
        boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
        fontFamily: FONT,
        opacity: Math.min(p.opacity, out),
        transform: `scale(${p.scale})`,
        transformOrigin: `${side} center`,
      }}
    >
      <div
        style={{
          alignSelf: "stretch",
          width: 26,
          background: STRIPES(GOLD, NAVY, 10),
          backgroundPosition: `0 ${(frame * 3) % 28}px`,
        }}
      />
      {children}
    </div>
  );
};

// ------------------------------------------------------------ layer

export const FlashStage: React.FC<{
  reel: Reel;
  keywords: string[];
  talkFrames: number;
}> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const hook = reel.edit.hook;
  const { figures, lenders, blocks } = stagePlan(reel, fps);
  return (
    <>
      {idleSpans(blocks, talkFrames).map(([a, b]) => (
        <Sequence
          key={`idle${a}`}
          from={a}
          durationInFrames={b - a}
          layout="none"
        >
          <IdleHeadline title={reel.edit.title} keywords={keywords} />
        </Sequence>
      ))}
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookCard hook={hook} />
        </Sequence>
      ) : null}
      {figures.map(({ figure, slot }) => (
        <Sequence
          key={`${figure.source}${figure.fromFrame}`}
          from={slot.from}
          durationInFrames={Math.max(1, slot.frames)}
          layout="none"
        >
          {slot.chip ? (
            <Chip side="left">
              <span style={{ color: DIM, fontWeight: 900, fontSize: 26 }}>
                {FIGURE_TAG}
              </span>
              <span style={{ color: GOLD, fontWeight: 900, fontSize: 46 }}>
                {figure.big}
              </span>
            </Chip>
          ) : (
            <FigureCard figure={figure} />
          )}
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
            <Chip side="right">
              <LenderLogo lender={lender} height={44} />
            </Chip>
          ) : (
            <LenderCard lender={lender} />
          )}
        </Sequence>
      ))}
    </>
  );
};

// Stage-start frames, for the hazard sweeps.
export const stageBeats = (reel: Reel, fps: number): number[] => {
  const { figures, lenders } = stagePlan(reel, fps);
  return [
    ...(reel.edit.hook ? [0] : []),
    ...figures.filter((f) => !f.slot.chip).map((f) => f.slot.from),
    ...lenders.filter((l) => !l.slot.chip).map((l) => l.slot.from),
  ];
};
