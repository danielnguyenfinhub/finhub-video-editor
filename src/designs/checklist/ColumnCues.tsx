// Checklist cue panels in the LEFT column (x SAFE.left..COLUMN_RIGHT), the
// same place the step column holds (it fades out while a cue is up). Daniel
// stands on the right (head x >= ~640), so a panel here never covers any part
// of his head, and he does not have to move (Daniel's rule, 27/09/2026: no
// panel on his head, hair included; panels sized to their content).
// Kinds drawn here: kinetic, points, bars. Every other kind still goes to the
// classic MotionTrack (full width) with the cue-room move (see useSideCueRoom).
import { fitText } from "@remotion/layout-utils";
import { StrikeThrough } from "@remotion/rough-notation";
import { Audio } from "@remotion/media";
import type React from "react";
import { useEffect, useState } from "react";
import {
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { SAFE, isCuePanel } from "../../mortgage/golden";
import { outFrameOf, type Cue, type Reel } from "../../mortgage/schema";
import {
  DIM,
  FONT,
  clamp,
  pop,
  reelFontReady,
  toneColor,
} from "../../mortgage/style";
import type { Segment } from "../../mortgage/timeline";
import { Panel, type CueOf, type Rel } from "../classic/Infographics";

// Right edge of the left column (cue panels AND step cards). Daniel's head,
// from the real matte of chon-ngan-hang (framing x = 526 + 0.6 * x_src), comes
// as far left as x 557 when he leans left (hair/ear, y ~880-910); 536 keeps
// >= 16 px clear (QC round 3, 27/09/2026: nothing on any part of his head).
export const COLUMN_RIGHT = 536;
// classic Panel: 36 px padding each side, right edge 1080 - SAFE.right from
// its positioned parent; a parent this wide ends the panel at COLUMN_RIGHT.
const HOST_WIDTH = COLUMN_RIGHT + (1080 - SAFE.right);
// Panel padding 36 + border 3 each side, plus 4 px so a fitted line never wraps.
const TEXT_W = COLUMN_RIGHT - SAFE.left - 72 - 6 - 4;

type ColumnCue = CueOf<"kinetic"> | CueOf<"points"> | CueOf<"bars">;
export const inColumn = (c: Cue): c is ColumnCue =>
  c.kind === "kinetic" || c.kind === "points" || c.kind === "bars";

const fit = (text: string, max: number, weight = 900) =>
  Math.min(
    max,
    fitText({ text, withinWidth: TEXT_W, fontFamily: FONT, fontWeight: weight })
      .fontSize,
  );

const Kicker: React.FC<{ text: string; opacity?: number }> = ({
  text,
  opacity,
}) => (
  <div
    style={{
      fontSize: fit(text, 34, 900),
      letterSpacing: 4,
      color: brand.accent,
      fontWeight: 900,
      opacity,
    }}
  >
    {text}
  </div>
);

// ------------------------------------------------------------- kinetic

const ColumnKinetic: React.FC<{ cue: CueOf<"kinetic">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = rel(cue.slam.atMs);
  const oldOut = interpolate(frame, [slam - 4, slam + 4], [1, 0], clamp);
  const slamP = pop(frame, fps, slam);
  return (
    <Panel>
      {frame < slam + 4 ? (
        <>
          {cue.kicker ? <Kicker text={cue.kicker} opacity={oldOut} /> : null}
          {cue.struck.map((s) => (
            <div
              key={s.text}
              style={{
                opacity: pop(frame, fps, rel(s.atMs)) * oldOut,
                fontSize: fit(s.text, 60, 800),
                fontWeight: 800,
                lineHeight: 1.2,
                margin: "8px 0",
              }}
            >
              <StrikeThrough
                progress={interpolate(
                  frame,
                  [rel(s.strikeMs), rel(s.strikeMs) + 8],
                  [0, 1],
                  clamp,
                )}
                color={brand.bad}
                strokeWidth={7}
              >
                <span style={{ color: DIM }}>{s.text}</span>
              </StrikeThrough>
            </div>
          ))}
        </>
      ) : (
        <>
          {cue.slam.kicker ? <Kicker text={cue.slam.kicker} /> : null}
          <div
            style={{
              fontSize: fit(cue.slam.text, 96),
              fontWeight: 900,
              color: brand.highlight,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              transform: `scale(${interpolate(slamP, [0, 1], [3, 1])})`,
              transformOrigin: "left center",
              opacity: slamP,
              textShadow: "0 0 40px rgba(255,185,56,0.45)",
            }}
          >
            {cue.slam.text}
          </div>
          {cue.sub ? (
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.25,
                marginTop: 12,
                opacity: pop(frame, fps, rel(cue.sub.atMs)),
              }}
            >
              {cue.sub.text}
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
};

// ------------------------------------------------------------- bars

const BAR_MAX = 200;
const BAR_W = 150;

const ColumnBars: React.FC<{ cue: CueOf<"bars">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = pop(frame, fps, 0);
  return (
    <Panel>
      {cue.kicker ? (
        <div
          style={{
            fontSize: fit(cue.kicker, 38, 800),
            fontWeight: 700,
            color: DIM,
            opacity: title,
          }}
        >
          {cue.kicker}
        </div>
      ) : null}
      <div
        style={{
          fontSize: fit(cue.title, 72),
          fontWeight: 900,
          color: brand.highlight,
          lineHeight: 1.1,
          opacity: title,
        }}
      >
        {cue.title}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-end",
          marginTop: 24,
        }}
      >
        {cue.bars.map((b) => {
          const g = spring({
            frame: frame - rel(b.atMs),
            fps,
            config: { damping: 16, stiffness: 90 },
          });
          const color = toneColor(b.tone);
          const h = Math.max(b.height * BAR_MAX, 70) * g;
          return (
            <div
              key={b.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: TEXT_W / cue.bars.length,
              }}
            >
              <div
                style={{
                  height: BAR_MAX,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{
                    width: BAR_W,
                    height: Math.max(h, 12),
                    background: `linear-gradient(180deg, ${color}, ${color}99)`,
                    borderRadius: "14px 14px 4px 4px",
                    boxShadow: `0 0 26px ${color}66`,
                    display: "flex",
                    justifyContent: "center",
                    paddingTop: 10,
                    fontSize: 36,
                    fontWeight: 900,
                    color: brand.background,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      opacity: interpolate(g, [0.4, 0.8], [0, 1], clamp),
                    }}
                  >
                    {b.value}
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 30,
                  fontWeight: 800,
                  textAlign: "center",
                  opacity: interpolate(g, [0.2, 0.5], [0, 1], clamp),
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------- points
// Title + only the items already said: the panel grows as each one lands
// (no tall empty block waiting for items; Daniel's review 27/09/2026).

const TITLE_MAX = 46;
const TITLE_MIN = 34;
const ITEM_SIZE = 36;
const DOT = 52;

// One line if it fits at TITLE_MIN or more; else two lines, broken after a
// colon if there is one, otherwise at the word nearest the middle.
const titleLines = (title: string): string[] => {
  if (fit(title, TITLE_MAX) >= TITLE_MIN) return [title];
  const colon = title.indexOf(": ");
  if (colon > 0) return [title.slice(0, colon + 1), title.slice(colon + 2)];
  const words = title.split(" ");
  let best = 1;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(0, best).join(" ").length;
    if (Math.abs(a - title.length / 2) < Math.abs(b - title.length / 2))
      best = i;
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
};

const ColumnPoints: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = titleLines(cue.title);
  const titleSize = Math.min(...lines.map((l) => fit(l, TITLE_MAX)));
  const starts = cue.items.map((it) => rel(it.atMs));
  return (
    <Panel>
      <div
        style={{
          fontSize: titleSize,
          fontWeight: 900,
          color: brand.highlight,
          lineHeight: 1.2,
        }}
      >
        {lines.map((l) => (
          <div key={l} style={{ whiteSpace: "nowrap" }}>
            {l}
          </div>
        ))}
      </div>
      {cue.items.map((it, i) => {
        if (frame < starts[i]) return null;
        const p = pop(frame, fps, starts[i]);
        const grow = spring({
          frame: frame - starts[i],
          fps,
          config: { damping: 200 },
          durationInFrames: 12,
        });
        const current = i === starts.length - 1 || frame < starts[i + 1];
        return (
          <div
            key={it.atMs}
            style={{
              // Grows the panel from 0 to the item's own height (never
              // taller: max-height only clips while it eases in).
              maxHeight: interpolate(grow, [0, 1], [0, 240]),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 0",
                marginTop: i === 0 ? 10 : 0,
                borderTop: "2px solid rgba(255,255,255,0.12)",
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
              }}
            >
              <div
                style={{
                  flex: `0 0 ${DOT}px`,
                  height: DOT,
                  borderRadius: "50%",
                  background: current
                    ? brand.highlight
                    : "rgba(255,255,255,0.14)",
                  color: current ? brand.primary : "#fff",
                  fontSize: 30,
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
                  fontSize: ITEM_SIZE,
                  fontWeight: current ? 900 : 800,
                  lineHeight: 1.25,
                  // No one-word orphan ("… duyệt hồ / sơ").
                  textWrap: "balance",
                  color: current ? "#fff" : DIM,
                }}
              >
                {it.text}
              </div>
            </div>
          </div>
        );
      })}
    </Panel>
  );
};

// ------------------------------------------------------------- track

const View: React.FC<{ cue: ColumnCue; rel: Rel }> = ({ cue, rel }) => {
  if (cue.kind === "kinetic") return <ColumnKinetic cue={cue} rel={rel} />;
  if (cue.kind === "bars") return <ColumnBars cue={cue} rel={rel} />;
  return <ColumnPoints cue={cue} rel={rel} />;
};

// The same sound the classic MotionTrack gives these kinds.
const sfxOf = (c: ColumnCue) =>
  c.kind === "kinetic"
    ? [{ atMs: c.slam.atMs, file: "whip", volume: 0.4 }]
    : c.kind === "points"
      ? c.items.map((it) => ({
          atMs: it.atMs,
          file: "mouse-click",
          volume: 0.4,
        }))
      : c.stamp
        ? [{ atMs: c.stamp.atMs, file: "shutter-modern", volume: 0.35 }]
        : [];

export const ColumnCueTrack: React.FC<{ reel: Reel; panelOffset: number }> = ({
  reel,
  panelOffset,
}) => {
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const cues = (reel.edit.cues ?? []).filter(inColumn);
  // fitText measures with Be Vietnam Pro: draw the panels only once it has
  // loaded, and hold the frame until then (landmines: measure after
  // reelFontReady()).
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() =>
    delayRender("checklist column cues: Be Vietnam Pro"),
  );
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setFontReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: HOST_WIDTH,
          height: 1920,
          transform: `translateY(${panelOffset}px)`,
        }}
      >
        {(fontReady ? cues : []).map((c) => {
          const from = outFrame(c.fromMs);
          return (
            <Sequence
              key={`${c.kind}${c.fromMs}`}
              from={from}
              durationInFrames={Math.max(1, outFrame(c.toMs) - from)}
              layout="none"
            >
              <View cue={c} rel={(ms) => outFrame(ms) - from} />
            </Sequence>
          );
        })}
      </div>
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

// ------------------------------------------------------------- cue room

const EASE_FRAMES = 15;
// Like the core useCueRoom, but only for cues still drawn full width by
// MotionTrack: column cues leave Daniel where he is.
export const useSideCueRoom = (seg: Segment): number => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const reel = (props as { reel?: Reel | null }).reel;
  if (!reel) return 0;
  const t = seg.outFrom + frame;
  const outFrame = outFrameOf(reel.timeline, fps);
  return (reel.edit.cues ?? [])
    .filter((c) => isCuePanel(c) && !inColumn(c))
    .reduce((k, c) => {
      const a = outFrame(c.fromMs);
      const b = Math.max(a + 1, outFrame(c.toMs));
      return Math.max(
        k,
        interpolate(t, [a - EASE_FRAMES, a, b, b + EASE_FRAMES], [0, 1, 1, 0], {
          ...clamp,
          easing: (x) => x * x * (3 - 2 * x),
        }),
      );
    }, 0);
};
