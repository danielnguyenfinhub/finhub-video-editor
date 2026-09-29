// The wall screen's picture: header band (chapter tag + chips), then one
// thing at a time: the hook, a cue, a figure, a lender, or the idle chapter
// card. Every switch flickers like a studio monitor changing source.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import { HOOK_FRAMES } from "../../../mortgage/golden";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import { outFrameOf, type Reel } from "../../../mortgage/schema";
import { FONT, clamp, enter, pop } from "../../../mortgage/style";
import { ScreenCue } from "./Cues";
import { latest, type Chip, type Main, type Plan } from "./Plan";
import { ScreenFrame } from "./Set";
import {
  FLICKER_FRAMES,
  SCREEN,
  SCREEN_HEADER,
  STUDIO_COPY,
  tint,
} from "./tokens";

// Brightness of a monitor switching source, `d` frames after the switch.
const FLICKER = [0.15, 1.5, 0.45, 1.25, 0.8, 1.1, 0.95, 1.03, 1];
const flicker = (d: number, soft: boolean) => {
  if (d < 0 || d >= FLICKER_FRAMES) return 1;
  const v = FLICKER[d];
  return soft ? 1 + (v - 1) * 0.4 : v;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const Header: React.FC<{ plan: Plan; chips: Chip[] }> = ({ plan, chips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ch = latest(plan.chapters, frame);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: SCREEN_HEADER,
        padding: "0 26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: tint(brand.navy, 0.55),
        borderBottom: `1px solid ${tint(brand.textDim, 0.2)}`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 3,
          color: brand.textDim,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: brand.highlight }}>● </span>
        {ch
          ? `${pad2(ch.index + 1)} · ${ch.title.toUpperCase()}`
          : STUDIO_COPY.onAir}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {chips
          .filter((c) => frame >= c.from && frame < c.to)
          .map((c) => {
            const p = enter(frame, fps, c.from);
            return c.kind === "figure" ? (
              <div
                key={`f${c.from}`}
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: brand.highlight,
                  color: brand.navy,
                  fontSize: 24,
                  fontWeight: 900,
                  opacity: p,
                  transform: `scale(${0.8 + 0.2 * p})`,
                  whiteSpace: "nowrap",
                }}
              >
                {c.figure.big}
                {c.figure.label ? ` · ${c.figure.label}` : ""}
              </div>
            ) : (
              <div key={`l${c.from}`} style={{ opacity: p }}>
                <LenderLogo lender={c.lender} height={36} />
              </div>
            );
          })}
      </div>
    </div>
  );
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      top: SCREEN_HEADER,
      height: SCREEN.h - SCREEN_HEADER,
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontFamily: FONT,
      color: brand.text,
      padding: "0 50px",
    }}
  >
    {children}
  </AbsoluteFill>
);

const bigSize = (s: string) =>
  s.length <= 6 ? 210 : s.length <= 9 ? 160 : 120;

const HookPicture: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hook = reel.edit.hook;
  if (!hook) return null;
  const p = pop(frame, fps, 4);
  // The hook's own count-up (edit.json countTo), landing on `big` as written.
  const counting = hook.countTo !== undefined && frame < 40;
  const v = interpolate(frame, [0, 40], [0, hook.countTo ?? 0], clamp);
  const shown = counting
    ? `${v.toLocaleString("vi-VN", {
        minimumFractionDigits: hook.decimals ?? 0,
        maximumFractionDigits: hook.decimals ?? 0,
      })}${hook.suffix ?? ""}`
    : hook.big;
  return (
    <Center>
      <div
        style={{
          fontSize: bigSize(hook.big),
          fontWeight: 900,
          color: brand.highlight,
          lineHeight: 1,
          transform: `scale(${0.85 + 0.15 * p})`,
          textShadow: `0 0 50px ${tint(brand.highlight, 0.35)}`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {shown}
      </div>
      {hook.sub ? (
        <div
          style={{
            marginTop: 26,
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.2,
            opacity: enter(frame, fps, 12),
          }}
        >
          {hook.sub}
        </div>
      ) : null}
    </Center>
  );
};

const FigurePicture: React.FC<{ big: string; label: string }> = ({
  big,
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 3);
  return (
    <Center>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 6,
          color: brand.textDim,
          opacity: enter(frame, fps),
        }}
      >
        {STUDIO_COPY.figure}
      </div>
      <div
        style={{
          fontSize: bigSize(big),
          fontWeight: 900,
          color: brand.highlight,
          lineHeight: 1.05,
          transform: `scale(${0.8 + 0.2 * p})`,
          textShadow: `0 0 50px ${tint(brand.highlight, 0.35)}`,
        }}
      >
        {big}
      </div>
      {label ? (
        <div
          style={{
            marginTop: 18,
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.2,
            opacity: enter(frame, fps, 10),
          }}
        >
          {label}
        </div>
      ) : null}
    </Center>
  );
};

const LenderPicture: React.FC<{ main: Extract<Main, { kind: "lender" }> }> = ({
  main,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 3);
  return (
    <Center>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 6,
          color: brand.textDim,
          marginBottom: 34,
        }}
      >
        {STUDIO_COPY.lender}
      </div>
      <div style={{ transform: `scale(${0.8 + 0.2 * p})`, opacity: p }}>
        <LenderLogo lender={main.lender} height={130} />
      </div>
    </Center>
  );
};

// Nothing else on screen: the chapter card, with a slow chart line drifting.
const IdlePicture: React.FC<{ plan: Plan; title: string }> = ({
  plan,
  title,
}) => {
  const frame = useCurrentFrame();
  const ch = latest(plan.chapters, frame);
  const drift = (frame * 0.6) % 260;
  const line = Array.from({ length: 12 }, (_, i) => {
    const x = i * 130 - drift;
    const y = 360 + Math.sin(i * 1.3 + 0.7) * 60 + Math.sin(i * 0.5) * 40;
    return `${x},${y}`;
  }).join(" ");
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <svg
        width={SCREEN.w}
        height={SCREEN.h}
        style={{ position: "absolute", opacity: 0.35 }}
      >
        <polyline
          points={line}
          fill="none"
          stroke={brand.highlight}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          right: 40,
          top: SCREEN_HEADER - 10,
          fontSize: 300,
          fontWeight: 900,
          color: "transparent",
          WebkitTextStroke: `3px ${tint(brand.textDim, 0.25)}`,
          lineHeight: 1,
        }}
      >
        {ch ? pad2(ch.index + 1) : ""}
      </div>
      <div
        style={{
          position: "absolute",
          left: 50,
          right: 50,
          bottom: 60,
          fontSize: 60,
          fontWeight: 900,
          color: brand.text,
          lineHeight: 1.15,
        }}
      >
        {ch?.title ?? title}
      </div>
    </AbsoluteFill>
  );
};

const MainPicture: React.FC<{ main: Main; reel: Reel }> = ({ main, reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  switch (main.kind) {
    case "hook":
      return <HookPicture reel={reel} />;
    case "cue":
      return <ScreenCue cue={main.cue} beat={(ms) => at(ms) - main.from} />;
    case "figure":
      return <FigurePicture big={main.figure.big} label={main.figure.label} />;
    case "lender":
      return <LenderPicture main={main} />;
  }
};

const Fade: React.FC<{ len: number; children: React.ReactNode }> = ({
  len,
  children,
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6, len - 8, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Screen: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => {
  const frame = useCurrentFrame();
  const active = plan.mains.some((m) => frame >= m.from && frame < m.to);
  // Chapter switches flicker hard (after the slate), content switches softly.
  const hard = plan.slates.map((s) => s.to);
  const soft = plan.mains.map((m) => m.from).filter((f) => f >= HOOK_FRAMES);
  const cur = [
    ...hard.map((at) => ({ at, soft: false })),
    ...soft.map((at) => ({ at, soft: true })),
  ].find((x) => frame >= x.at && frame < x.at + FLICKER_FRAMES);
  const brightness = cur ? flicker(frame - cur.at, cur.soft) : 1;
  return (
    <ScreenFrame>
      <AbsoluteFill style={{ filter: `brightness(${brightness})` }}>
        {active ? null : <IdlePicture plan={plan} title={reel.edit.title} />}
        {plan.mains.map((m) => (
          <Sequence
            key={`${m.kind}${m.from}`}
            from={m.from}
            durationInFrames={Math.max(1, m.to - m.from)}
            layout="none"
          >
            <Fade len={m.to - m.from}>
              <MainPicture main={m} reel={reel} />
            </Fade>
          </Sequence>
        ))}
        <Header plan={plan} chips={plan.chips} />
      </AbsoluteFill>
    </ScreenFrame>
  );
};
