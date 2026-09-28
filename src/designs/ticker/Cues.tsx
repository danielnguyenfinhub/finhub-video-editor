// Cue kinds the board draws itself, in the STAGE band: `points` as a
// departure board (every slot on the board from the start, each row flips in
// and lights as it is said) and `compare` as a bid/ask board with VS. Every
// other kind goes to the classic MotionTrack (index.tsx filters with onBoard).
import { fitTextOnNLines } from "@remotion/layout-utils";
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
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import { DIM, FONT, clamp, pop, toneColor } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import {
  AMBER,
  FlipText,
  FlipTiles,
  INK,
  Led,
  SKY,
  SKY_DIM,
  STAGE,
  tileFor,
  useFontReady,
} from "./Board";

export const VS = "VS";
type BoardCue = Extract<Cue, { kind: "points" | "compare" }>;
export const onBoard = (c: Cue): c is BoardCue =>
  c.kind === "points" || c.kind === "compare";

const W = SAFE.right - SAFE.left;
const H = STAGE.bottom - STAGE.top;

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = pop(frame, fps, 0);
  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: W,
        top: STAGE.top,
        height: H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `scaleY(${interpolate(p, [0, 1], [0.7, 1])})`,
      }}
    >
      {children}
    </div>
  );
};

const Header: React.FC<{ text: string }> = ({ text }) => {
  const size = fitTextOnNLines({
    text,
    maxLines: 1,
    maxBoxWidth: W - 110,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: 44,
  }).fontSize;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 24px",
        background: AMBER,
        borderRadius: "12px 12px 0 0",
      }}
    >
      <Led color={INK} size={16} period={24} />
      <span
        style={{
          color: INK,
          fontWeight: 900,
          fontSize: size,
          whiteSpace: "nowrap",
          lineHeight: 1.25,
        }}
      >
        <FlipText text={text} start={0} />
      </span>
    </div>
  );
};

// ------------------------------------------------------------- points

const ROW_TEXT_W = W - 48 - 76 - 40 - 2 * 18;

const PointsBoard: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const starts = cue.items.map((it) => rel(it.atMs));
  const n = cue.items.length;
  const rowH = Math.min(96, (H - 90) / n);
  return (
    <Frame>
      <Header text={cue.title} />
      <div
        style={{
          background: `linear-gradient(180deg, ${INK}, ${brand.background})`,
          borderRadius: "0 0 12px 12px",
          padding: "8px 24px 14px",
        }}
      >
        {cue.items.map((it, i) => {
          const said = frame >= starts[i];
          const current = said && (i === n - 1 || frame < starts[i + 1]);
          const lit = interpolate(frame - starts[i], [0, 6], [0, 1], clamp);
          const { fontSize } = fitTextOnNLines({
            text: it.text,
            maxLines: 2,
            maxBoxWidth: ROW_TEXT_W,
            fontFamily: FONT,
            fontWeight: 800,
            maxFontSize: 38,
          });
          return (
            <div
              key={it.atMs}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                height: rowH,
                borderBottom:
                  i < n - 1 ? "2px dashed rgba(255,255,255,0.1)" : undefined,
                background: current
                  ? `linear-gradient(90deg, rgba(255,185,56,${0.16 * lit}), transparent 80%)`
                  : undefined,
              }}
            >
              <div
                style={{
                  flex: "0 0 76px",
                  height: 58,
                  borderRadius: 8,
                  background: said
                    ? current
                      ? AMBER
                      : SKY_DIM
                    : "rgba(255,255,255,0.05)",
                  color: current ? INK : said ? SKY : "rgba(255,255,255,0.25)",
                  fontWeight: 900,
                  fontSize: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: Math.min(38, fontSize),
                  fontWeight: current ? 900 : 800,
                  lineHeight: 1.25,
                  color: current ? "#fff" : DIM,
                }}
              >
                {said ? (
                  <FlipText text={it.text} start={starts[i]} />
                ) : (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.18)",
                      letterSpacing: 8,
                    }}
                  >
                    · · · · · ·
                  </span>
                )}
              </div>
              <Led
                color={current ? AMBER : said ? SKY : "rgba(255,255,255,0.12)"}
                size={18}
                period={current ? 20 : 1000}
              />
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

// ------------------------------------------------------------- compare

const COL_W = (W - 96) / 2;

const Column: React.FC<{
  card: CueOf<"compare">["cards"][number];
  rel: Rel;
  accent: string;
}> = ({ card, rel, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = rel(card.atMs);
  if (frame < at) return <div style={{ width: COL_W }} />;
  const p = pop(frame, fps, at);
  const hl =
    card.highlightAtMs !== undefined && frame >= rel(card.highlightAtMs);
  const glow = hl
    ? interpolate(frame - rel(card.highlightAtMs ?? 0), [0, 8], [0, 1], clamp)
    : 0;
  const head = fitTextOnNLines({
    text: card.title,
    maxLines: 2,
    maxBoxWidth: COL_W - 40,
    fontFamily: FONT,
    fontWeight: 900,
    maxFontSize: 40,
  }).fontSize;
  return (
    <div
      style={{
        width: COL_W,
        borderRadius: 14,
        overflow: "hidden",
        background: `linear-gradient(180deg, ${INK}, ${brand.background})`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 0 ${3 * glow}px ${AMBER}, 0 0 ${40 * glow}px rgba(255,185,56,0.5)`,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderTop: `6px solid ${accent}`,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            color: accent,
            fontWeight: 900,
            fontSize: head,
            lineHeight: 1.25,
          }}
        >
          <FlipText text={card.title} start={at} />
        </div>
      </div>
      {card.rows.map((r) => {
        const ra = rel(r.atMs);
        const color = toneColor(r.tone, "#fff");
        return (
          <div
            key={r.label}
            style={{
              padding: "16px 20px 22px",
              borderTop: "2px dashed rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                color: DIM,
                fontWeight: 700,
                fontSize: 30,
                lineHeight: 1.3,
                marginBottom: 12,
              }}
            >
              {r.label}
            </div>
            {frame >= ra ? (
              <FlipTiles
                text={r.value}
                start={ra}
                tileW={tileFor(r.value, COL_W - 40, 66)}
                color={color}
                stagger={2}
              />
            ) : (
              <div
                style={{
                  height: tileFor(r.value, COL_W - 40, 66) * 1.38,
                  color: "rgba(255,255,255,0.2)",
                  fontSize: 40,
                  letterSpacing: 10,
                }}
              >
                · · ·
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CompareBoard: React.FC<{ cue: CueOf<"compare">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vsAt = rel(cue.vsAtMs ?? cue.cards[1].atMs);
  const vs = spring({
    frame: frame - vsAt,
    fps,
    config: { damping: 10, stiffness: 200 },
  });
  const q = cue.question;
  const qAt = q ? rel(q.atMs) : Infinity;
  return (
    <Frame>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Column card={cue.cards[0]} rel={rel} accent={SKY} />
        <div
          style={{
            alignSelf: "center",
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: AMBER,
            color: INK,
            fontWeight: 900,
            fontSize: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 30px rgba(255,185,56,0.6)",
            opacity: frame >= vsAt ? 1 : 0,
            transform: `scale(${vs}) rotate(${interpolate(vs, [0, 1], [-90, 0])}deg)`,
          }}
        >
          {VS}
        </div>
        <Column card={cue.cards[1]} rel={rel} accent={AMBER} />
      </div>
      {q && frame >= qAt ? (
        <div
          style={{
            marginTop: 26,
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 26px",
            borderRadius: 10,
            border: `2px solid ${AMBER}`,
            background: "rgba(6,19,42,0.9)",
            color: AMBER,
            fontWeight: 900,
            fontSize: fitTextOnNLines({
              text: q.text,
              maxLines: 1,
              maxBoxWidth: W - 120,
              fontFamily: FONT,
              fontWeight: 900,
              maxFontSize: 44,
            }).fontSize,
            whiteSpace: "nowrap",
          }}
        >
          <Led size={16} period={16} />
          <FlipText text={q.text} start={qAt} />
        </div>
      ) : null}
    </Frame>
  );
};

// ------------------------------------------------------------- track

const sfxOf = (c: BoardCue) =>
  c.kind === "points"
    ? c.items.map((it) => ({ atMs: it.atMs, file: "mouse-click", volume: 0.4 }))
    : c.cards.map((k) => ({ atMs: k.atMs, file: "mouse-click", volume: 0.5 }));

export const BoardCueTrack: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(onBoard);
  // fitTextOnNLines measures with Be Vietnam Pro: draw once it has loaded.
  const ready = useFontReady("ticker board cues: Be Vietnam Pro");
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
              <PointsBoard cue={c} rel={rel} />
            ) : (
              <CompareBoard cue={c} rel={rel} />
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
