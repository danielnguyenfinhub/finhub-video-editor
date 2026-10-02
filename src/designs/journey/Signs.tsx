// "journey" signs on the map: the hook as an old map's title cartouche with
// a compass rose, a named bank on a roadside sign right of the pin (logo on
// white, neutral label), and the chapter as a navy arrow sign.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import { HOOK_FRAMES, SAFE, hookCount } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type EditJson, type Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import { Compass } from "./Compass";
import { GOLD, INK, MARKER_Y, alpha } from "./Map";

export const ease = (x: number) => 1 - (1 - x) ** 3;
export const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);
export const SHADOW = `0 14px 30px ${alpha(brand.navy, 0.25)}`;
export const Footing: React.FC<{ x: number; k: number }> = ({ x, k }) => (
  <div
    style={{
      position: "absolute",
      left: x - 24,
      top: MARKER_Y - 8,
      width: 48,
      height: 14,
      borderRadius: "50%",
      background: alpha(brand.navy, 0.25),
      transform: `scale(${k})`,
    }}
  />
);

// ------------------------------------------------------------- hook

export const HookCartouche: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [8, 42], [0, 1], { ...clamp, easing: ease });
  const big =
    hook.countTo === undefined
      ? hook.big
      : `${hookCount(hook.countTo, t).toLocaleString("vi-VN", {
          minimumFractionDigits: hook.decimals ?? 0,
          maximumFractionDigits: hook.decimals ?? 0,
        })}${hook.suffix ?? ""}`;
  const size = Math.min(
    150,
    fitText({
      text: hook.big,
      withinWidth: 660,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const p = enter(frame, fps);
  const W = SAFE.right - SAFE.left - 60;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, HOOK_FRAMES),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 540 - W / 2,
          width: W,
          top: SAFE.top + 40,
          background: "#ffffff",
          border: `5px solid ${INK}`,
          borderRadius: 10,
          padding: 12,
          boxShadow: SHADOW,
          opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
          transform: `translateY(${(1 - p) * 40}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
        }}
      >
        <div
          style={{
            border: `2px solid ${INK}`,
            borderRadius: 4,
            padding: "34px 40px 38px",
            textAlign: "center",
            background: `repeating-linear-gradient(0deg, transparent 0 38px, ${alpha(brand.primary, 0.05)} 38px 40px)`,
          }}
        >
          <div
            style={{
              fontSize: size,
              fontWeight: 900,
              lineHeight: 1.1,
              color: INK,
              textShadow: `0 6px 0 ${alpha(GOLD, 0.55)}`,
            }}
          >
            {big}
          </div>
          <div
            style={{
              margin: "18px auto 20px",
              width: interpolate(t, [0, 1], [0, 420]),
              borderTop: `5px dashed ${GOLD}`,
            }}
          />
          {hook.sub ? (
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.25,
                color: INK,
                textWrap: "balance",
                opacity: enter(frame, fps, 14),
              }}
            >
              {hook.sub}
            </div>
          ) : null}
        </div>
        {/* Gold corner studs, like a printed map's title box. */}
        {[
          { left: -11, top: -11 },
          { right: -11, top: -11 },
          { left: -11, bottom: -11 },
          { right: -11, bottom: -11 },
        ].map((pos) => (
          <div
            key={JSON.stringify(pos)}
            style={{
              position: "absolute",
              ...pos,
              width: 18,
              height: 18,
              background: GOLD,
              border: `3px solid ${INK}`,
              transform: "rotate(45deg)",
            }}
          />
        ))}
      </div>
      <div style={{ opacity: p }}>
        <Compass x={SAFE.left + 60} y={SAFE.top + 40} r={54} t={frame} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------- bank

// A roadside sign right of the marker: the logo on white, a neutral label.
export const RoadsideSign: React.FC<{ lender: Lender; frames: number }> = ({
  lender,
  frames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const SIGN_BOTTOM = MARKER_Y - 104;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        fontFamily: FONT,
        opacity: fadeOut(frame, frames),
      }}
    >
      <Footing x={SAFE.right - 63} k={up} />
      <div
        style={{
          position: "absolute",
          left: SAFE.right - 70,
          top: SIGN_BOTTOM - 10,
          width: 14,
          height: MARKER_Y - SIGN_BOTTOM + 10,
          borderRadius: 7,
          background: INK,
          transformOrigin: "50% 100%",
          transform: `scaleY(${up})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 1080 - SAFE.right,
          bottom: 1920 - SIGN_BOTTOM,
          maxWidth: 500,
          padding: "16px 18px 12px",
          borderRadius: 20,
          border: `5px solid ${INK}`,
          background: "#ffffff",
          boxShadow: SHADOW,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transformOrigin: "80% 100%",
          transform: `translateY(${(1 - up) * 80}px) scale(${interpolate(up, [0, 1], [0.4, 1])})`,
          opacity: interpolate(up, [0, 0.3], [0, 1], clamp),
        }}
      >
        <LenderLogo lender={lender} height={72} />
        <div
          style={{
            marginTop: 6,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 3,
            color: brand.slate,
          }}
        >
          ĐANG NHẮC TỚI
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------- chapters

const ChapterSign: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 10,
        left: SAFE.left,
        maxWidth: 520,
        padding: "12px 58px 14px 26px",
        background: INK,
        clipPath:
          "polygon(0 0, calc(100% - 36px) 0, 100% 50%, calc(100% - 36px) 100%, 0 100%)",
        fontFamily: FONT,
        opacity: Math.min(p, fadeOut(frame, Math.round(2.5 * fps))),
        transform: `translateX(${interpolate(p, [0, 1], [-60, 0])}px)`,
      }}
    >
      <div
        style={{ color: GOLD, fontSize: 24, fontWeight: 900, letterSpacing: 4 }}
      >
        CHẶNG {index}
      </div>
      <div
        style={{
          color: "#ffffff",
          fontSize: 34,
          fontWeight: 800,
          lineHeight: 1.25,
        }}
      >
        {title}
      </div>
    </div>
  );
};

export const Chapters: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      {(reel.edit.chapters ?? []).map((c, i) => (
        <Sequence
          key={c.atMs}
          from={at(c.atMs)}
          durationInFrames={Math.round(2.5 * fps)}
          layout="none"
        >
          <ChapterSign index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};
