// Cue kinds the calendar desk draws itself: `points` as a to-do notepad in
// front of the calendar (rows ticked in spoken order), `compare` as two
// calendar pages side by side (titles only from the cue's cards), `trend` as
// a week-planner spread with a gold marker line through the values. `change`
// is the calendar's own page (Page.tsx); every other kind goes to MotionTrack.
import { Audio } from "@remotion/media";
import type React from "react";
import {
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { FONT, clamp, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { useFontReady } from "../ticker/Board";
import {
  GOLD,
  HeaderBand,
  MarkerCircle,
  NAVY,
  Rings,
  SLATE,
  Sheet,
  fit,
  flipInStyle,
  highlight,
  useFlipIn,
  useOut,
} from "./Desk";
import { Notepad } from "./Notepad";
import { WeekPlanner } from "./Planner";

type DeskCue = Extract<Cue, { kind: "points" | "compare" | "trend" }>;
export const onDesk = (c: Cue): c is DeskCue =>
  c.kind === "points" || c.kind === "compare" || c.kind === "trend";

// ------------------------------------------------------------------ compare

const PAGE_W = 424;
const CMP = {
  top: 624,
  head: 124,
  bottom: 1120,
  gap: SAFE.right - SAFE.left - 2 * PAGE_W,
};
const pageLeft = (i: number) => SAFE.left + 4 + i * (PAGE_W + CMP.gap - 8);

const ComparePage: React.FC<{
  card: CueOf<"compare">["cards"][number];
  i: number;
  rel: Rel;
}> = ({ card, i, rel }) => {
  const frame = useCurrentFrame();
  const at = rel(card.atMs);
  const p = useFlipIn(at);
  if (frame < at) return null;
  const left = pageLeft(i);
  const hl =
    card.highlightAtMs !== undefined ? rel(card.highlightAtMs) : Infinity;
  const inner = PAGE_W - 60;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `rotate(${i ? 1.2 : -1.2}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left,
          width: PAGE_W,
          top: CMP.top + CMP.head,
          height: CMP.bottom - CMP.top - CMP.head,
          perspective: 1400,
          boxShadow: "0 26px 50px rgba(11,31,61,0.22)",
          borderRadius: "0 0 14px 14px",
        }}
      >
        <Sheet
          style={{
            ...flipInStyle(p),
            padding: "16px 30px",
            justifyContent: "space-evenly",
          }}
        >
          {card.rows.map((r) => {
            const ra = rel(r.atMs);
            const size = fit(r.value, inner - 20, 1, 104);
            return (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: SLATE,
                    fontWeight: 800,
                    fontSize: fit(r.label, inner, 2, 32),
                    lineHeight: 1.3,
                    textAlign: "center",
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    position: "relative",
                    marginTop: 8,
                    height: size * 1.3,
                    width: inner,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {frame >= ra ? (
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: size,
                        lineHeight: 1.1,
                        color: toneColor(r.tone, NAVY),
                        opacity: interpolate(frame - ra, [0, 6], [0, 1], clamp),
                      }}
                    >
                      {r.value}
                    </span>
                  ) : null}
                  {frame >= hl && frame >= ra ? (
                    <MarkerCircle
                      w={Math.min(inner, size * 0.62 * r.value.length + 70)}
                      h={size * 1.3}
                      at={Math.max(hl, ra)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </Sheet>
      </div>
      <HeaderBand
        left={left}
        width={PAGE_W}
        top={CMP.top}
        height={CMP.head}
        text={card.title}
        size={fit(card.title, PAGE_W - 60, 1, 40)}
      />
      <Rings left={left} width={PAGE_W} top={CMP.top} />
    </div>
  );
};

const ComparePages: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const out = useOut();
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const arrow = interpolate(frame, [vsAt, vsAt + 10], [0, 1], clamp);
  const q = cue.question;
  const qAt = q ? rel(q.atMs) : Infinity;
  const midX = (pageLeft(0) + PAGE_W + pageLeft(1)) / 2;
  return (
    <div
      style={{ position: "absolute", inset: 0, fontFamily: FONT, opacity: out }}
    >
      <ComparePage card={cue.cards[0]} i={0} rel={rel} />
      <ComparePage card={cue.cards[1]} i={1} rel={rel} />
      <svg
        width={80}
        height={60}
        viewBox="0 0 80 60"
        style={{
          position: "absolute",
          left: midX - 40,
          top: 900,
          opacity: arrow,
          transform: `scale(${arrow})`,
        }}
      >
        <path
          d="M6 30 H66 M46 10 L68 30 L46 50"
          fill="none"
          stroke={GOLD}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {q && frame >= qAt ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width: SAFE.right - SAFE.left,
            top: CMP.bottom + 22,
            textAlign: "center",
            color: NAVY,
            fontWeight: 900,
            fontSize: fit(q.text, SAFE.right - SAFE.left - 40, 1, 46),
            whiteSpace: "nowrap",
            opacity: interpolate(frame - qAt, [0, 6], [0, 1], clamp),
          }}
        >
          <span style={highlight(true)}>{q.text}</span>
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------------ track

export const DeskCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(onDesk);
  const ready = useFontReady("calendar desk cues: Be Vietnam Pro");
  const clicks = cues.flatMap((c) =>
    c.kind === "points"
      ? c.items.map((it) => it.atMs)
      : c.kind === "compare"
        ? c.cards.map((k) => k.atMs)
        : [],
  );
  return (
    <>
      {(ready ? cues : []).map((c) => {
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
              <Notepad cue={c} rel={rel} />
            ) : c.kind === "compare" ? (
              <ComparePages cue={c} rel={rel} />
            ) : (
              <WeekPlanner cue={c} />
            )}
          </Sequence>
        );
      })}
      {clicks.map((ms) => (
        <Sequence
          key={ms}
          from={Math.max(0, outFrame(ms))}
          durationInFrames={fps * 2}
          layout="none"
        >
          <Audio src={staticFile("sfx/mouse-click.wav")} volume={() => 0.4} />
        </Sequence>
      ))}
    </>
  );
};
