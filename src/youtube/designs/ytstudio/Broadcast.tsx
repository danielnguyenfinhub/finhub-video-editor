// The broadcast graphics over the set (they don't move with the camera): the
// lower third (Vietnamese captions, keywords gold; the English line; the
// chapter progress strip) and the full-frame chapter slate.
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import { PagedCaptions } from "../../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../../mortgage/schema";
import { FONT, clamp, emphasised } from "../../../mortgage/style";
import { YT_HEIGHT } from "../../frame";
import type { Chapter, Plan } from "./Plan";
import { StudioBackdrop } from "./Set";
import { LOWER, SLATE_FRAMES, STUDIO_COPY, tint } from "./tokens";

const W = LOWER.right - LOWER.left;
const STRIP_Y = LOWER.bottom - 16;
const EN_BOTTOM = YT_HEIGHT - (LOWER.bottom - 22);
const VI_BOTTOM = YT_HEIGHT - (LOWER.bottom - 66);

const Strip: React.FC<{ plan: Plan; talkFrames: number }> = ({
  plan,
  talkFrames,
}) => {
  const frame = useCurrentFrame();
  const parts: { from: number; to: number }[] = plan.chapters.length
    ? plan.chapters
    : [{ from: 0, to: talkFrames }];
  const inner = W - 60;
  const gap = 8;
  const avail = inner - gap * (parts.length - 1);
  return (
    <div
      style={{
        position: "absolute",
        left: LOWER.left + 30,
        top: STRIP_Y,
        width: inner,
        height: 8,
        display: "flex",
        gap,
      }}
    >
      {parts.map((p) => {
        const fill = interpolate(frame, [p.from, p.to], [0, 1], clamp);
        const on = frame >= p.from && frame < p.to;
        return (
          <div
            key={p.from}
            style={{
              width: (avail * (p.to - p.from)) / talkFrames,
              height: on ? 8 : 5,
              marginTop: on ? 0 : 1.5,
              borderRadius: 4,
              background: tint(brand.textDim, 0.2),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${fill * 100}%`,
                height: "100%",
                background: on ? brand.highlight : tint(brand.highlight, 0.6),
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const LowerThird: React.FC<{
  reel: Reel;
  plan: Plan;
  keywords: string[];
  talkFrames: number;
}> = ({ reel, plan, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: LOWER.left,
          top: LOWER.top,
          width: W,
          height: LOWER.bottom - LOWER.top,
          borderRadius: 18,
          background: `linear-gradient(180deg, ${tint(brand.navy, 0.72)} 0%, ${tint(brand.navy, 0.92)} 100%)`,
          borderTop: `3px solid ${tint(brand.highlight, 0.85)}`,
          boxShadow: `0 -10px 40px ${tint(brand.navy, 0.5)}`,
        }}
      />
      <PagedCaptions
        reel={reel}
        render={(page) => {
          const hit = emphasised(
            page.tokens.map((t) => t.text),
            keywords,
          );
          return (
            <div
              style={{
                position: "absolute",
                left: LOWER.left + 60,
                width: W - 120,
                bottom: VI_BOTTOM,
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 54,
                fontWeight: 800,
                lineHeight: 1.2,
                color: brand.text,
              }}
            >
              {page.tokens.map((t, i) => (
                <span
                  key={t.fromMs}
                  style={{
                    color: hit.has(i) ? brand.highlight : brand.text,
                    fontWeight: hit.has(i) ? 900 : 800,
                  }}
                >
                  {t.text}
                </span>
              ))}
            </div>
          );
        }}
      />
      {(reel.edit.subtitles ?? []).map((s) => (
        <Sequence
          key={s.fromMs}
          from={at(s.fromMs)}
          durationInFrames={Math.max(1, at(s.toMs) - at(s.fromMs))}
          layout="none"
        >
          <div
            style={{
              position: "absolute",
              left: LOWER.left + 60,
              width: W - 120,
              bottom: EN_BOTTOM,
              textAlign: "center",
              fontFamily: FONT,
              fontSize: s.text.length > 100 ? 26 : 30,
              fontWeight: 600,
              color: brand.textDim,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {s.text}
          </div>
        </Sequence>
      ))}
      <Strip plan={plan} talkFrames={talkFrames} />
    </>
  );
};

// Full-frame slate: the studio goes dark, a gold band sweeps across, the
// chapter number and title slide through, then it wipes off to the right.
const Slate: React.FC<{ chapter: Chapter; total: number }> = ({
  chapter,
  total,
}) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 10], [100, 0], clamp);
  const outP = interpolate(
    frame,
    [SLATE_FRAMES - 10, SLATE_FRAMES],
    [0, 100],
    clamp,
  );
  const sweep = interpolate(frame, [0, SLATE_FRAMES], [-40, 20], clamp);
  const title = interpolate(frame, [4, 18], [80, 0], {
    ...clamp,
    easing: (t) => 1 - (1 - t) ** 3,
  });
  const n = String(chapter.index + 1).padStart(2, "0");
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        clipPath: `inset(0 ${inP}% 0 ${outP}%)`,
        fontFamily: FONT,
      }}
    >
      <StudioBackdrop t={frame} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: tint(brand.navy, 0.55),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${sweep}%`,
          top: 470,
          width: "120%",
          height: 14,
          background: `linear-gradient(90deg, transparent, ${brand.highlight} 30%, ${brand.highlight} 70%, transparent)`,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 200,
          right: 200,
          top: 230,
          transform: `translateX(${title}px)`,
          opacity: interpolate(frame, [4, 14], [0, 1], clamp),
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 10,
            color: brand.highlight,
          }}
        >
          {STUDIO_COPY.chapter} {n} / {String(total).padStart(2, "0")}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: `3px ${tint(brand.textDim, 0.6)}`,
          }}
        >
          {n}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 200,
          right: 200,
          top: 510,
          fontSize: 96,
          fontWeight: 900,
          lineHeight: 1.1,
          color: brand.text,
          transform: `translateX(${-title}px)`,
          opacity: interpolate(frame, [6, 16], [0, 1], clamp),
        }}
      >
        {chapter.title}
      </div>
    </div>
  );
};

export const Slates: React.FC<{ plan: Plan }> = ({ plan }) => (
  <>
    {plan.slates.map((s) => (
      <Sequence
        key={s.from}
        from={s.from}
        durationInFrames={SLATE_FRAMES}
        layout="none"
      >
        <Slate chapter={s} total={plan.chapters.length} />
      </Sequence>
    ))}
  </>
);
