// "ytstudio" (Phòng thu): a faceless virtual finance-news studio. Deep navy
// set with stage lights and a curved reflective floor; a big wall screen on
// the right carries every visual (hook, figures, cue charts, lender logos);
// a presenter column with no presenter holds the chapter, the running clock
// and the current key point; a broadcast lower third carries the captions,
// the English line and the chapter progress strip. Chapters open on a
// full-frame slate, then the screen flickers to its new source. The camera
// dollies slowly through each chapter and pushes in on big numbers.
import { fitText } from "@remotion/layout-utils";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type React from "react";
import { Fragment } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../../brand/theme";
import type {
  CoverProps,
  Design,
  OverlayProps,
  TalkProps,
} from "../../../mortgage/design";
import { PacedVideo } from "../../../mortgage/PacedVideo";
import { FONT, LOGO, clamp, emphasised, enter } from "../../../mortgage/style";
import { CueFallback16, LogoMark16, OUTRO16_COPY, Outro16 } from "../../Kit";
import { LowerThird, Slates } from "./Broadcast";
import { Column } from "./Column";
import { buildPlan } from "./Plan";
import { Screen } from "./Screen";
import { Camera, StudioBackdrop } from "./Set";
import { STUDIO_COPY, tint } from "./tokens";

const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const { fontSize } = fitText({
    text: title,
    withinWidth: 1500,
    fontFamily: FONT,
    fontWeight: 900,
  });
  const push = interpolate(frame, [0, 75], [1, 1.03], clamp);
  const band = interpolate(frame, [0, 30], [0, 1], {
    ...clamp,
    easing: (t) => 1 - (1 - t) ** 3,
  });
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <StudioBackdrop t={frame} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: tint(brand.navy, 0.35) }} />
      {/* Positioned, so it paints above the absolute backdrop. */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 16,
            background: brand.card,
            marginBottom: 44,
            opacity: enter(frame, fps),
          }}
        >
          <Img src={LOGO} style={{ height: 96, display: "block" }} />
        </div>
        <div
          style={{
            width: 1500,
            textAlign: "center",
            fontSize: Math.min(110, fontSize),
            fontWeight: 900,
            color: brand.text,
            lineHeight: 1.2,
          }}
        >
          {words.map((w, i) => (
            <Fragment key={`${w}${i}`}>
              <span
                style={{
                  color: hit.has(i) ? brand.highlight : brand.text,
                  opacity: enter(frame, fps, 6 + i * 3),
                }}
              >
                {w}
              </span>{" "}
            </Fragment>
          ))}
        </div>
        <div
          style={{
            marginTop: 30,
            width: 900 * band,
            height: 6,
            borderRadius: 3,
            background: brand.highlight,
          }}
        />
        <div
          style={{
            marginTop: 26,
            fontSize: 42,
            fontWeight: 700,
            color: brand.textDim,
            opacity: enter(frame, fps, 18),
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// The whole set lives in Behind (it needs the reel for the camera), so Talk
// only layers it under the voice: the cut-out is fully transparent.
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill style={{ background: brand.navy }}>
    {behind}
    <PacedVideo
      seg={seg}
      src={src}
      look={look}
      foreground={foreground}
      backdrop="none"
    />
  </AbsoluteFill>
);

const Behind: React.FC<OverlayProps> = ({ reel, talkFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const plan = buildPlan(reel, talkFrames, fps);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Camera plan={plan} talkFrames={talkFrames}>
        {(tight) => (
          <>
            <StudioBackdrop t={frame} />
            <Column
              plan={plan}
              title={reel.edit.title}
              talkFrames={talkFrames}
              tight={tight}
            />
            <Screen reel={reel} plan={plan} />
          </>
        )}
      </Camera>
    </AbsoluteFill>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const plan = buildPlan(reel, talkFrames, fps);
  return (
    <>
      {plan.fallbackKinds.length ? (
        <CueFallback16 reel={reel} kinds={plan.fallbackKinds} />
      ) : null}
      <Slates plan={plan} />
      <LowerThird
        reel={reel}
        plan={plan}
        keywords={keywords}
        talkFrames={talkFrames}
      />
      <LogoMark16 talkFrames={talkFrames} />
    </>
  );
};

export const ytstudio: Design = {
  id: "ytstudio",
  Cover,
  Talk,
  Behind,
  Overlay,
  Outro: Outro16,
  // The slate carries each chapter's weight; the cut under it stays calm.
  chapterTransition: () =>
    fade() as unknown as TransitionPresentation<Record<string, unknown>>,
  copy: [...OUTRO16_COPY, ...Object.values(STUDIO_COPY)],
};
