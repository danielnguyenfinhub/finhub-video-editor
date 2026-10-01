// The slider stage, frame by frame: the current scene (Plan.ts) says where
// the divider stands and what each pane holds. Idle, the divider is a thin
// gold line with a gentle wobble. The hook slides out from behind it as it
// parks left; a figure is a big split chip on it; a named bank slides out of
// it onto the AFTER pane; compare / change sweep it (Cues.tsx).
import { fitText, fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import { LENDER_WORD, SplitChip, kickerOf } from "./Chip";
import {
  changeLayers,
  compareLayers,
  revealOf,
  sweepX,
  type Beat,
  type Layers,
} from "./Cues";
import { counted } from "./numbers";
import { pointsLayers } from "./Points";
import { busyAt, ramp, type Hook, type Plan, type Scene } from "./Plan";
import {
  Divider,
  GOLD,
  INNER,
  KNOB_Y,
  MID,
  MUTED,
  Pane,
  SKY,
  StageBox,
  W,
} from "./Slider";
import { hookCount } from "../../mortgage/golden";

const FADE = 8;
const LEFT_PARK = 40;
const ease = (x: number) => 1 - (1 - x) ** 3;

// ------------------------------------------------------------- hook

// The hook number at count progress t (0 -> 1): through hookCount, never
// from 0 (exported for check-design-figures).
export const hookText = (hook: Hook, t: number): string =>
  hook.countTo === undefined
    ? hook.big
    : `${hookCount(hook.countTo, t).toLocaleString("vi-VN", {
        minimumFractionDigits: hook.decimals ?? 0,
        maximumFractionDigits: hook.decimals ?? 0,
      })}${hook.suffix ?? ""}`;

const hookLayers = (hook: Hook, lf: number, fps: number, x: number): Layers => {
  const t = interpolate(lf, [6, 40], [0, 1], { ...clamp, easing: ease });
  const big = hookText(hook, t);
  const size = Math.min(
    200,
    fitText({
      text: hook.big,
      withinWidth: W - 190,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const p = enter(lf, fps, 2);
  const cx = (x + W) / 2;
  const sub = hook.sub
    ? fitTextOnNLines({
        text: hook.sub,
        maxLines: 2,
        maxBoxWidth: W - 190,
        fontFamily: FONT,
        fontWeight: 800,
        maxFontSize: 48,
      }).fontSize
    : 0;
  return {
    after: (
      <div
        style={{
          position: "absolute",
          left: cx - (W - 150) / 2,
          width: W - 150,
          top: INNER + 60,
          textAlign: "center",
          fontFamily: FONT,
          // Out from behind the divider: it trails in from the left.
          transform: `translateX(${interpolate(p, [0, 1], [-(W / 2), 0])}px)`,
        }}
      >
        <div
          style={{
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
            color: t >= 1 ? GOLD : "#ffffff",
            textShadow: `0 0 40px rgba(255,185,56,${0.2 + 0.35 * t})`,
          }}
        >
          {big}
        </div>
        {hook.sub ? (
          <div
            style={{
              marginTop: 24,
              fontSize: sub,
              fontWeight: 800,
              lineHeight: 1.25,
              color: "#ffffff",
              textWrap: "balance",
              opacity: interpolate(lf, [14, 24], [0, 1], clamp),
            }}
          >
            {hook.sub}
          </div>
        ) : null}
      </div>
    ),
  };
};

// ------------------------------------------------------------- figure

const figureLayers = (f: Figure, lf: number, fps: number): Layers => {
  const t = interpolate(lf, [4, 30], [0, 1], { ...clamp, easing: ease });
  const p = spring({ frame: lf, fps, config: { damping: 12, stiffness: 150 } });
  const halfW = 360;
  const size = Math.min(
    116,
    fitText({
      text: f.big,
      withinWidth: halfW - 160,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  // An auto figure's words are already in the captions; a stat's label is copy.
  const label = f.source === "stat" ? f.label : "";
  return {
    over: (
      <div
        style={{
          position: "absolute",
          left: MID - halfW,
          top: KNOB_Y - 100,
          opacity: p,
          transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
        }}
      >
        <SplitChip
          halfW={halfW}
          height={200}
          left={
            <>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 5,
                  color: SKY,
                }}
              >
                {kickerOf(f.big)}
              </span>
              {label ? (
                <span
                  style={{
                    marginTop: 8,
                    fontSize: fitTextOnNLines({
                      text: label,
                      maxLines: 3,
                      maxBoxWidth: halfW - 160,
                      fontFamily: FONT,
                      fontWeight: 800,
                      maxFontSize: 30,
                    }).fontSize,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    color: MUTED,
                    opacity: interpolate(lf, [10, 20], [0, 1], clamp),
                  }}
                >
                  {label}
                </span>
              ) : null}
            </>
          }
          right={
            <span
              style={{
                fontSize: size,
                fontWeight: 900,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
                color: t >= 1 ? GOLD : "#ffffff",
                textShadow: "0 0 30px rgba(255,185,56,0.45)",
              }}
            >
              {counted(f.big, t)}
            </span>
          }
        />
      </div>
    ),
  };
};

// ------------------------------------------------------------- lender

const lenderLayers = (
  lender: Lender,
  lf: number,
  fps: number,
  x: number,
): Layers => {
  const p = enter(lf, fps, 2);
  return {
    before: (
      <div
        style={{
          position: "absolute",
          left: x / 2 - 190,
          width: 380,
          top: KNOB_Y - 40,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: 5,
          lineHeight: 1.3,
          color: MUTED,
          opacity: interpolate(lf, [8, 18], [0, 1], clamp),
        }}
      >
        {LENDER_WORD}
      </div>
    ),
    after: (
      <div
        style={{
          position: "absolute",
          left: (x + W) / 2,
          top: KNOB_Y,
          transform: `translate(-50%, -50%) translateX(${interpolate(p, [0, 1], [-(W / 2), 0])}px)`,
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          borderRadius: 24,
        }}
      >
        <LenderLogo lender={lender} height={84} />
      </div>
    ),
  };
};

// ------------------------------------------------------------- stage

type Stand = {
  x: number;
  knob: number;
  line: number;
  nudge: number;
  flash?: number;
};

const idleX = (t: number) => MID + 6 * Math.sin(t / 19) + 3 * Math.sin(t / 7);

const standOf = (
  s: Scene,
  lf: number,
  fps: number,
  t: number,
  rel: Beat["rel"],
): Stand => {
  switch (s.kind) {
    case "hook": {
      const k = spring({
        frame: lf - 2,
        fps,
        config: { damping: 14, stiffness: 70 },
      });
      return { x: MID + (LEFT_PARK - MID) * k, knob: 0, line: 1, nudge: 0 };
    }
    case "cue": {
      // Points: the whole stage slides to AFTER and the line fades.
      if (s.cue.kind === "points") return { x: 0, knob: 0, line: 0, nudge: 0 };
      const reveal = revealOf(s.cue, rel);
      return {
        x: sweepX(lf, reveal, fps),
        knob: 1,
        line: 1,
        nudge: lf < reveal ? 3 + 4 * Math.sin(lf / 3) : 0,
        flash: lf >= reveal ? lf - reveal : undefined,
      };
    }
    default:
      return { x: idleX(t), knob: 0, line: 1, nudge: 0 };
  }
};

const layersOf = (s: Scene, b: Beat): Layers => {
  switch (s.kind) {
    case "hook":
      return hookLayers(s.hook, b.lf, b.fps, b.x);
    case "figure":
      return figureLayers(s.figure, b.lf, b.fps);
    case "lender":
      return lenderLayers(s.lender, b.lf, b.fps, b.x);
    case "cue":
      return s.cue.kind === "compare"
        ? compareLayers(s.cue, b)
        : s.cue.kind === "change"
          ? changeLayers(s.cue, b)
          : pointsLayers(s.cue, b);
  }
};

export const StageLayer: React.FC<{ plan: Plan; reel: Reel }> = ({
  plan,
  reel,
}) => {
  const t = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = plan.scenes.find((s) => s.from <= t && t < s.to);
  const dur = scene ? scene.to - scene.from : 1;
  const lf = scene ? t - scene.from : 0;
  const w = scene
    ? Math.min(
        interpolate(lf, [0, FADE], [0, 1], clamp),
        interpolate(lf, [dur - FADE, dur], [1, 0], clamp),
      )
    : 0;
  const out = outFrameOf(reel.timeline, fps);
  const base = scene?.kind === "cue" ? scene.from : 0;
  const rel: Beat["rel"] = (ms) => out(ms) - base;
  const idle: Stand = { x: idleX(t), knob: 0, line: 1, nudge: 0 };
  const st = scene ? standOf(scene, lf, fps, t, rel) : idle;
  const x = idle.x + (st.x - idle.x) * w;
  const layers = scene ? layersOf(scene, { lf, fps, rel, x }) : {};
  const dim = ramp(plan.dim, t);
  return (
    <StageBox opacity={1 - 0.85 * dim}>
      <Pane side="before" x={x} t={t}>
        <div style={{ position: "absolute", inset: 0, opacity: w }}>
          {layers.before}
        </div>
      </Pane>
      <Pane side="after" x={x} t={t}>
        <div style={{ position: "absolute", inset: 0, opacity: w }}>
          {layers.after}
        </div>
      </Pane>
      <Divider
        x={x}
        knob={st.knob * w}
        // Idle, the line sits back behind the captions on the stage.
        opacity={(1 - (1 - st.line) * w) * (0.45 + 0.55 * busyAt(plan, t))}
        nudge={st.nudge}
        flash={st.flash}
      />
      <div style={{ position: "absolute", inset: 0, opacity: w }}>
        {layers.over}
      </div>
    </StageBox>
  );
};
