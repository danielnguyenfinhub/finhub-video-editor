// The scale in motion (Overlay): the beam's tilt follows every weight that
// lands, as a damped spring with overshoot, the pans swing on their chains,
// a dust puff at each landing; the plaque under each pan carries its title
// and value, the difference hangs as a tag from the heavier pan, and the
// scene's heading sits above the pointer. While points, a classic panel or
// the mini pan hold the stage, the scale dims into the room.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { FONT, clamp, pop, toneColor } from "../../mortgage/style";
import {
  FALL,
  type PanLoad,
  type Plan,
  type ScaleScene,
  type Side,
  type Span,
  type Tag,
} from "./Plan";
import { BRASS, CX, GOLD, ScaleRig, panAt, type PanDraw } from "./Scale";
import { hookCount } from "../../mortgage/golden";

const FADE = 8;
const DROP_FROM = 320; // px above the pan a weight starts its fall
const PLAQUE_GAP = 30; // pan rim to plaque
// A plaque never covers the pillar (viewed critique 08): this far from CX,
// clear of the pillar's 44 px collars.
const PILLAR_CLEAR = 46;
export const plaqueLeft = (side: Side, x: number, width: number): number =>
  side === 1
    ? Math.max(x - width / 2, CX + PILLAR_CLEAR)
    : Math.min(x - width / 2, CX - PILLAR_CLEAR - width);
export const HEADING_BOTTOM = 546;
const HEADING_WIDTH = 400;
const RAMP = 10;

export const PLAQUE: React.CSSProperties = {
  background: "rgba(6,19,42,0.9)",
  border: "1.5px solid rgba(255,185,56,0.45)",
  borderTop: `5px solid ${BRASS}`,
  boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
};

// ------------------------------------------------------------- physics

const beamSpring = (frame: number, fps: number) =>
  spring({ frame, fps, config: { damping: 7, stiffness: 55, mass: 1 } });

// The beam's angle: every target change rings in as a damped spring, plus a
// gentle idle sway so the empty scale is never still.
export const angleAt = (
  events: Plan["tiltEvents"],
  t: number,
  fps: number,
): number => {
  let prev = 0;
  let angle = 0;
  for (const e of events) {
    if (t >= e.at) angle += (e.angle - prev) * beamSpring(t - e.at, fps);
    prev = e.angle;
  }
  return angle + 0.9 * Math.sin(t / 34);
};

// 0..1 while any span holds (ramped).
export const heldAt = (spans: Span[], t: number): number =>
  spans.reduce(
    (w, [a, b]) =>
      Math.max(
        w,
        interpolate(t, [a - RAMP, a, b, b + RAMP], [0, 1, 1, 0], clamp),
      ),
    0,
  );

const landingsOf = (scene: ScaleScene | undefined, side: Side): number[] => {
  const p = scene?.pans[side];
  return p ? [p.dropAt + FALL] : [];
};

// A pan swings after a weight lands on it, and drifts a little always.
const swingAt = (landings: number[], t: number, side: Side): number =>
  landings.reduce(
    (s, at) => {
      const dt = t - at;
      return dt < 0 ? s : s + 4 * Math.exp(-dt / 16) * Math.sin(dt / 3.4);
    },
    0.8 * Math.sin(t / 27 + side * 2.1),
  );

// ------------------------------------------------------------- per frame

// The live scene first; a scene still fading out only when none has begun.
const sceneAt = (plan: Plan, t: number) =>
  plan.scenes.find((s) => t >= s.from && t < s.to) ??
  plan.scenes.find((s) => t >= s.to && t < s.to + FADE);

const panDraw = (
  scene: ScaleScene | undefined,
  side: Side,
  t: number,
): PanDraw => {
  const load = scene?.pans[side];
  const swing = swingAt(landingsOf(scene, side), t, side);
  if (!scene || !load) return { height: 0, fall: 0, opacity: 0, swing };
  const out = interpolate(t, [scene.to, scene.to + FADE], [1, 0], clamp);
  const k = (t - load.dropAt) / FALL;
  const land = load.dropAt + FALL;
  const ghost =
    load.ghostFrom !== undefined && t >= load.ghostFrom
      ? {
          height: scene.pans[0]?.height ?? load.height,
          opacity:
            0.55 *
            out *
            interpolate(t, [load.dropAt - 6, load.dropAt + 2], [1, 0], clamp),
          lift: interpolate(
            t,
            [load.dropAt - 6, load.dropAt + 2],
            [0, 60],
            clamp,
          ),
        }
      : undefined;
  return {
    height: t >= load.dropAt ? load.height : 0,
    fall: k < 1 ? DROP_FROM * (1 - k * k) : 0,
    opacity: out,
    ghost,
    dust: t >= land && t < land + 16 ? (t - land) / 16 : undefined,
    swing,
  };
};

// ------------------------------------------------------------- plaques

export const counted = (load: PanLoad, t: number): string => {
  if (!load.count || !load.value) return load.value ?? "";
  const p = interpolate(
    t,
    [load.dropAt + FALL, load.dropAt + FALL + 26],
    [0, 1],
    {
      ...clamp,
      easing: (x) => 1 - (1 - x) ** 3,
    },
  );
  return `${hookCount(load.count.to, p).toLocaleString("vi-VN", {
    minimumFractionDigits: load.count.decimals,
    maximumFractionDigits: load.count.decimals,
  })}${load.count.suffix}`;
};

const valueSize = (text: string, width: number, max: number) =>
  Math.min(
    max,
    fitText({ text, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

const TagView: React.FC<{ tag: Tag; t: number; shift: number }> = ({
  tag,
  t,
  shift,
}) => {
  const { fps } = useVideoConfig();
  const p = pop(t, fps, tag.at);
  const sway = 3 * Math.exp(-(t - tag.at) / 20) * Math.sin((t - tag.at) / 4);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: p,
        transform: `translate(${shift}px, ${interpolate(p, [0, 1], [-30, 0])}px) rotate(${sway}deg)`,
        transformOrigin: "top center",
      }}
    >
      <div style={{ width: 3, height: 14, background: GOLD }} />
      <div
        style={{
          maxWidth: 300,
          padding: "10px 22px 12px",
          borderRadius: 16,
          background: GOLD,
          color: brand.navy,
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1.2,
          textAlign: "center",
          textWrap: "balance",
          boxShadow: "0 10px 30px rgba(255,185,56,0.35)",
        }}
      >
        {tag.text}
        {tag.sub ? (
          <div style={{ fontSize: 22, fontWeight: 700 }}>{tag.sub}</div>
        ) : null}
      </div>
    </div>
  );
};

const Plaque: React.FC<{
  load: PanLoad;
  scene: ScaleScene;
  side: Side;
  t: number;
  x: number;
  y: number;
}> = ({ load, scene, side, t, x, y }) => {
  const { fps } = useVideoConfig();
  const width = load.big ? 400 : 300;
  const shown = pop(t, fps, load.kickerAt);
  const landed = t >= load.dropAt + FALL;
  const v = pop(t, fps, load.dropAt + FALL);
  const hi =
    load.highlightAt === undefined
      ? 0
      : interpolate(
          t,
          [load.highlightAt, load.highlightAt + 10],
          [0, 1],
          clamp,
        );
  const out = interpolate(t, [scene.to, scene.to + FADE], [1, 0], clamp);
  const waiting = load.ghostFrom !== undefined && !landed;
  const value = landed ? counted(load, t) : waiting ? "?" : "";
  const size = value
    ? valueSize(load.value ?? value, width - 40, load.big ? 104 : 72)
    : 0;
  const arrow = load.arrow === "up" ? "▲" : load.arrow === "down" ? "▼" : "";
  const tone = load.tone ? toneColor(load.tone, "#ffffff") : "#ffffff";
  return (
    <div
      style={{
        position: "absolute",
        left: plaqueLeft(side, x, width),
        top: y + PLAQUE_GAP,
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: FONT,
        opacity: Math.min(shown, out),
      }}
    >
      <div
        style={{
          ...PLAQUE,
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 18px 14px",
          borderRadius: 18,
          textAlign: "center",
          borderColor: hi > 0 ? GOLD : undefined,
          boxShadow: `0 18px 40px rgba(0,0,0,0.45), 0 0 ${hi * 36}px rgba(255,185,56,0.6)`,
        }}
      >
        {load.kicker ? (
          <div
            style={{
              color: GOLD,
              fontSize: 27,
              fontWeight: 900,
              letterSpacing: 1,
              lineHeight: 1.2,
              textWrap: "balance",
            }}
          >
            {load.kicker}
          </div>
        ) : null}
        {value ? (
          <div
            style={{
              fontSize: size,
              fontWeight: 900,
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              color: waiting ? brand.slate : landed ? tone : "#ffffff",
              transform: `scale(${landed ? interpolate(v, [0, 1], [1.35, 1]) : 1})`,
            }}
          >
            {value}
            {landed && arrow ? (
              <span style={{ fontSize: size * 0.5, marginLeft: 10 }}>
                {arrow}
              </span>
            ) : null}
          </div>
        ) : null}
        {landed && load.label ? (
          <div
            style={{
              color: brand.textDim,
              fontSize: load.big ? 30 : 24,
              fontWeight: 700,
              lineHeight: 1.25,
              textWrap: "balance",
              opacity: v,
            }}
          >
            {load.label}
          </div>
        ) : null}
        {landed
          ? (load.extra ?? []).map((e) => (
              <div
                key={e}
                style={{ color: "#ffffff", fontSize: 24, fontWeight: 800 }}
              >
                {e}
              </div>
            ))
          : null}
      </div>
      {scene.tag && scene.tag.side === side && t >= scene.tag.at ? (
        <TagView tag={scene.tag} t={t} shift={side === 0 ? -18 : 18} />
      ) : null}
    </div>
  );
};

const Heading: React.FC<{ scene: ScaleScene; t: number }> = ({ scene, t }) => {
  const { fps } = useVideoConfig();
  if (!scene.heading) return null;
  const p = pop(t, fps, scene.from);
  const out = interpolate(t, [scene.to, scene.to + FADE], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: CX - HEADING_WIDTH / 2,
        width: HEADING_WIDTH,
        bottom: 1920 - HEADING_BOTTOM,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 34,
        fontWeight: 900,
        lineHeight: 1.2,
        color: "#ffffff",
        textWrap: "balance",
        textShadow: "0 4px 18px rgba(6,19,42,0.9)",
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)`,
      }}
    >
      {scene.heading}
    </div>
  );
};

// ------------------------------------------------------------- stage

export const ScaleStage: React.FC<{ plan: Plan; dim: Span[] }> = ({
  plan,
  dim,
}) => {
  const t = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = sceneAt(plan, t);
  const angle = angleAt(plan.tiltEvents, t, fps);
  const pans = [panDraw(scene, 0, t), panDraw(scene, 1, t)] as [
    PanDraw,
    PanDraw,
  ];
  const dimmed = heldAt(dim, t);
  return (
    <>
      <div
        style={{ position: "absolute", inset: 0, opacity: 1 - 0.9 * dimmed }}
      >
        <ScaleRig angle={angle} pans={pans} />
      </div>
      {scene ? (
        <>
          <Heading scene={scene} t={t} />
          {([0, 1] as const).map((side) => {
            const load = scene.pans[side];
            if (!load || t < load.kickerAt) return null;
            const at = panAt(angle, side, pans[side].swing);
            return (
              <Plaque
                key={side}
                load={load}
                scene={scene}
                side={side}
                t={t}
                x={at.x}
                y={at.y}
              />
            );
          })}
        </>
      ) : null}
    </>
  );
};
