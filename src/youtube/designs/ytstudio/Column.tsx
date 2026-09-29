// The presenter column, with no presenter: the chapter, the video's running
// clock (elapsed / total, not a "live" claim) and the current key point as a
// large card that changes per sentence or per cue.
import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../../brand/theme";
import { FONT, enter } from "../../../mortgage/style";
import { latest, type Plan } from "./Plan";
import { COLUMN, SCREEN, STUDIO_COPY, tint } from "./tokens";

const mmss = (frames: number, fps: number) => {
  const s = Math.max(0, Math.floor(frames / fps));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const keySize = (t: string) =>
  t.length <= 18 ? 64 : t.length <= 34 ? 54 : t.length <= 60 ? 44 : 36;

export const Column: React.FC<{
  plan: Plan;
  title: string;
  talkFrames: number;
  tight: number;
}> = ({ plan, title, talkFrames, tight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ch = latest(plan.chapters, frame);
  const kp = latest(plan.keyPoints, frame);
  const cp = enter(frame, fps, ch?.from ?? 0);
  const kpIn = enter(frame, fps, kp?.from ?? 0);
  const dot = 0.55 + 0.45 * Math.abs(Math.sin(frame / 18));
  return (
    <div
      style={{
        position: "absolute",
        left: COLUMN.x,
        top: COLUMN.y,
        width: COLUMN.w,
        height: SCREEN.y + SCREEN.h - COLUMN.y,
        fontFamily: FONT,
        color: brand.text,
        opacity: 1 - 0.85 * tight,
        filter: tight > 0.01 ? `blur(${5 * tight}px)` : undefined,
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 6,
          color: brand.highlight,
          opacity: cp,
        }}
      >
        {ch
          ? `${STUDIO_COPY.chapter} ${String(ch.index + 1).padStart(2, "0")} / ${String(plan.chapters.length).padStart(2, "0")}`
          : STUDIO_COPY.onAir}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 50,
          fontWeight: 900,
          lineHeight: 1.15,
          opacity: cp,
          transform: `translateX(${(1 - cp) * -30}px)`,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {ch?.title ?? title}
      </div>
      <div
        style={{
          marginTop: 22,
          width: 90 * cp,
          height: 4,
          background: brand.highlight,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          marginTop: 22,
          fontSize: 32,
          fontWeight: 800,
          color: brand.textDim,
          fontVariantNumeric: "tabular-nums",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: brand.highlight,
            opacity: dot,
          }}
        />
        <span>
          <span style={{ color: brand.text }}>{mmss(frame, fps)}</span>
          {` / ${mmss(talkFrames, fps)}`}
        </span>
      </div>
      {kp ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: COLUMN.w,
            top: 290,
            bottom: 0,
            padding: "26px 30px",
            borderRadius: 20,
            background: `linear-gradient(160deg, ${tint(brand.primary, 0.3)} 0%, ${tint(brand.navy, 0.75)} 100%)`,
            border: `1px solid ${tint(brand.textDim, 0.22)}`,
            borderLeft: `8px solid ${brand.highlight}`,
            boxShadow: `0 24px 60px ${tint(brand.navy, 0.7)}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 5,
              color: brand.highlight,
            }}
          >
            {STUDIO_COPY.keyPoint}
          </div>
          <div
            key={kp.from}
            style={{
              marginTop: 14,
              opacity: kpIn,
              transform: `translateY(${(1 - kpIn) * 24}px)`,
            }}
          >
            {kp.big ? (
              <div
                style={{
                  fontSize: kp.big.length > 8 ? 64 : 84,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: brand.highlight,
                }}
              >
                {kp.big}
              </div>
            ) : null}
            {kp.text ? (
              <div
                style={{
                  marginTop: kp.big ? 8 : 0,
                  fontSize: kp.big
                    ? Math.min(44, keySize(kp.text))
                    : keySize(kp.text),
                  fontWeight: 900,
                  lineHeight: 1.18,
                }}
              >
                {kp.text}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
