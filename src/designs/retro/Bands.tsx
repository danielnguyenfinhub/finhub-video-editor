// "retro" bands around the stage: the chapter ribbon (top left, under nothing
// else) and the English line on a small cream strip at the bottom of SAFE.
import type React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { SAFE } from "../../mortgage/golden";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT } from "../../mortgage/style";
import {
  CREAM,
  GOLD,
  INK,
  NAVY,
  Ribbon,
  alpha,
  hardBox,
  useStamp,
} from "./Print";
import { STAGE_W } from "./Stage";

// ------------------------------------------------------------- chapter

const ChapterRibbon: React.FC<{ index: number; title: string }> = ({
  index,
  title,
}) => {
  const s = useStamp(0);
  return (
    <div
      style={{
        position: "absolute",
        top: SAFE.top + 20,
        left: SAFE.left + 40,
        maxWidth: 560,
        fontFamily: FONT,
        transformOrigin: "0 50%",
        transform: `scaleX(${s}) rotate(-2deg)`,
      }}
    >
      <Ribbon color={NAVY} tails={40}>
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            gap: 14,
            alignItems: "baseline",
          }}
        >
          <span style={{ color: GOLD, fontWeight: 900, fontSize: 30 }}>
            PHẦN {index}
          </span>
          <span
            style={{
              color: CREAM,
              fontWeight: 800,
              fontSize: 34,
              lineHeight: 1.25,
            }}
          >
            {title}
          </span>
        </div>
      </Ribbon>
    </div>
  );
};

export const ChapterRibbons: React.FC<{ reel: Reel }> = ({ reel }) => {
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
          <ChapterRibbon index={i + 1} title={c.title} />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- English line

export const EnglishStrip: React.FC<{ reel: Reel }> = ({ reel }) => {
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
            layout="none"
          >
            <div
              style={{
                position: "absolute",
                left: SAFE.left,
                width: STAGE_W,
                bottom: 1920 - SAFE.bottom,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 29,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  fontStyle: "italic",
                  color: INK,
                  textAlign: "center",
                  background: alpha(CREAM, 0.94),
                  border: `3px solid ${INK}`,
                  borderRadius: 8,
                  boxShadow: hardBox(4, GOLD),
                  padding: "6px 18px",
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
