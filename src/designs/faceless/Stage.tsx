// "faceless" pieces: no one is on screen, so the middle of the frame (the
// STAGE band) carries the visual: the hook, a spoken number as a counting ring
// chart (golden rule 1), a named bank's logo (rule 3). The rest of the time
// the captions own the stage (Captions.tsx). `busyFrames` tells them when to
// step down to the lower band.
import type React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
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
import { FONT, clamp, enter } from "../../mortgage/style";

export const STAGE = { top: 640, bottom: 1200 };
const AMBER = brand.highlight;

// Theme tints, built at runtime so every colour stays a brand token (rule 7):
// a + b mixed (t = share of b) -> "#rrggbb"; alpha as an 8-digit hex suffix.
const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");
const mix = (a: string, b: string, t: number) =>
  `#${channels(a)
    .map((v, i) => hex2(v + (channels(b)[i] - v) * t))
    .join("")}`;
const alpha = (hex: string, a: number) => `${hex}${hex2(a * 255)}`;
const SKY = mix(brand.primary, brand.card, 0.57); // light logo blue
const GLOW = alpha(mix(brand.primary, brand.card, 0.38), 0.35);
// Navy gradient of the backdrop and the footage veil: background -> a touch
// of logo blue -> toward the deep navy.
export const NAVY_GRADIENT = `linear-gradient(170deg, ${brand.background} 0%, ${mix(brand.background, brand.primary, 0.27)} 60%, ${mix(brand.navy, brand.background, 0.25)} 100%)`;

// Brand navy that never sits still: two soft lights drift and a fine grid
// slides, so there is movement between beats (rule 5b).
export const FacelessBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const a = Math.sin(frame / 90) * 120;
  const b = Math.cos(frame / 110) * 140;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle 520px at ${300 + a}px ${700 + b}px, ${GLOW}, transparent 70%),
          radial-gradient(circle 460px at ${800 - b}px ${1300 + a}px, rgba(245,165,36,0.18), transparent 70%),
          ${NAVY_GRADIENT}`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `0 ${(frame * 0.6) % 90}px`,
        }}
      />
    </AbsoluteFill>
  );
};

// Talk-timeline frames when the stage shows something other than captions.
export const busyFrames = (reel: Reel, fps: number): [number, number][] => [
  ...(reel.edit.hook ? [[0, HOOK_FRAMES] as [number, number]] : []),
  ...figuresOf(reel, fps).map(
    (f) => [f.fromFrame, f.fromFrame + f.frames] as [number, number],
  ),
  ...lenderMentionsOf(reel).map(
    (m) =>
      [
        Math.round((m.startMs / 1000) * fps),
        Math.round((m.endMs / 1000) * fps),
      ] as [number, number],
  ),
  // edit.json cues (compare, bars, points…): the panels are the visual.
  ...(reel.edit.cues ?? []).map((c) => {
    const at = outFrameOf(reel.timeline, fps);
    return [at(c.fromMs), at(c.toMs)] as [number, number];
  }),
];

const StageBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const p = enter(frame, fps);
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
        width: 1080 - 2 * SAFE.left,
        top: STAGE.top,
        height: STAGE.bottom - STAGE.top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        opacity: Math.min(p, out),
        transform: `scale(${interpolate(p, [0, 1], [0.85, 1])})`,
      }}
    >
      {children}
    </div>
  );
};

// "4,1 tỷ" -> counts 0 → 4,1 with the same decimals; text around it kept.
const counted = (big: string, t: number): string => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// How far the ring closes: a percentage fills to its value (on a 10 % scale
// below 10 %, e.g. interest rates, else 100 %); a date, count or amount has
// no scale, so the ring closes.
const ringFill = (big: string): number => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, v / (v < 10 ? 10 : 100));
};

const FigureHero: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 34], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  // Ring (2R + 60) plus a two-line label fits inside STAGE, so the label
  // never reaches the dropped caption below it (index.tsx LOW_BOTTOM).
  const R = 170;
  const fill = ringFill(figure.big);
  const C = 2 * Math.PI * R;
  return (
    <StageBox>
      <div
        style={{ position: "relative", width: 2 * R + 60, height: 2 * R + 60 }}
      >
        <svg
          width={2 * R + 60}
          height={2 * R + 60}
          style={{ position: "absolute" }}
        >
          <circle
            cx={R + 30}
            cy={R + 30}
            r={R}
            fill="rgba(6,19,42,0.7)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={26}
          />
          <circle
            cx={R + 30}
            cy={R + 30}
            r={R}
            fill="none"
            stroke={t >= 1 ? AMBER : SKY}
            strokeWidth={26}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fill * t)}
            transform={`rotate(-90 ${R + 30} ${R + 30})`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: ((figure.big.length > 7 ? 92 : 128) * R) / 200,
            fontWeight: 900,
            color: "#fff",
            textShadow: "0 6px 30px rgba(0,0,0,0.5)",
          }}
        >
          {counted(figure.big, t)}
        </div>
      </div>
      {/* An auto figure's label is only the words around the number, which
          the captions already show; a stat's label is written copy. */}
      {figure.source === "stat" ? (
        <div
          style={{
            marginTop: 20,
            maxWidth: 900,
            textAlign: "center",
            fontSize: 44,
            lineHeight: 1.3,
            fontWeight: 700,
            color: "#fff",
            opacity: interpolate(frame, [12, 24], [0, 1], clamp),
          }}
        >
          {figure.label}
        </div>
      ) : null}
    </StageBox>
  );
};

const LenderHero: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <StageBox>
      <div
        style={{
          padding: "36px 56px",
          borderRadius: 32,
          background: "#fff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          transform: `rotate(${interpolate(pop, [0, 1], [-6, 0])}deg)`,
        }}
      >
        <LenderLogo lender={lender} height={170} />
      </div>
      <div
        style={{
          marginTop: 30,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 4,
          color: AMBER,
        }}
      >
        ĐANG NHẮC TỚI · MENTIONED
      </div>
    </StageBox>
  );
};

const HookHero: React.FC<{ hook: NonNullable<EditJson["hook"]> }> = ({
  hook,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 30], [0, 1], clamp);
  const big =
    hook.countTo === undefined
      ? hook.big
      : `${(hook.countTo * t).toLocaleString("vi-VN", {
          minimumFractionDigits: hook.decimals ?? 0,
          maximumFractionDigits: hook.decimals ?? 0,
        })}${hook.suffix ? ` ${hook.suffix}` : ""}`;
  return (
    <StageBox>
      <div
        style={{
          fontSize: big.length > 10 ? 110 : 150,
          fontWeight: 900,
          lineHeight: 1.1,
          textAlign: "center",
          color: AMBER,
          textShadow: "0 8px 40px rgba(0,0,0,0.55)",
        }}
      >
        {big}
      </div>
      {hook.sub ? (
        <div
          style={{
            marginTop: 26,
            fontSize: 50,
            fontWeight: 800,
            lineHeight: 1.3,
            textAlign: "center",
            color: "#fff",
          }}
        >
          {hook.sub}
        </div>
      ) : null}
    </StageBox>
  );
};

export const StageLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES}>
          <HookHero hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {figuresOf(reel, fps).map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
        >
          <FigureHero figure={f} />
        </Sequence>
      ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const to = Math.round((m.endMs / 1000) * fps);
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={Math.max(1, to - from)}
          >
            <LenderHero lender={m.lender} />
          </Sequence>
        );
      })}
    </>
  );
};

// A chapter's title as a pill at the top of SAFE for 2.5 s.
export const ChapterPills: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
        >
          <Pill index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

const Pill: React.FC<{ index: number; title: string }> = ({ index, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 20,
        left: SAFE.left,
        maxWidth: 760,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 28px",
        borderRadius: 999,
        background: "rgba(6,19,42,0.85)",
        border: `2px solid ${AMBER}`,
        fontFamily: FONT,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-60, 0])}px)`,
      }}
    >
      <span style={{ color: AMBER, fontWeight: 900, fontSize: 34 }}>
        PHẦN {index}
      </span>
      <span
        style={{
          color: "#fff",
          fontWeight: 800,
          fontSize: 38,
          lineHeight: 1.3,
        }}
      >
        {title}
      </span>
    </div>
  );
};

// The English line under everything, one per scene (edit.json subtitles).
export const EnglishLine: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.subtitles ?? []).map((s) => {
        const from = at(s.fromMs);
        return (
          <Sequence
            key={s.fromMs}
            from={from}
            durationInFrames={Math.max(1, at(s.toMs) - from)}
          >
            <div
              style={{
                position: "absolute",
                left: SAFE.left,
                right: 1080 - SAFE.right,
                bottom: 1920 - SAFE.bottom,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 36,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.92)",
                  textAlign: "center",
                  background: "rgba(6,19,42,0.7)",
                  padding: "8px 22px",
                  borderRadius: 14,
                }}
              >
                {s.text}
              </div>
            </div>
          </Sequence>
        );
      })}
    </>
  );
};
