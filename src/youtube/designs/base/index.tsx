// "base": the plain 16:9 YouTube design and the reference for new ones. Navy
// stage, captions along the bottom, the hook and every spoken figure as a
// centred card, bank logos top-left, chapters as a pill, every cue through
// the classic panels (CueFallback16). New designs replace pieces, not rules.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { Fragment } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
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
import {
  HOOK_FRAMES,
  figuresOf,
  lenderMentionsOf,
} from "../../../mortgage/golden";
import { LenderLogo } from "../../../mortgage/LenderLogo";
import { PacedVideo } from "../../../mortgage/PacedVideo";
import { PagedCaptions } from "../../../mortgage/PagedCaptions";
import { outFrameOf } from "../../../mortgage/schema";
import { FONT, LOGO, emphasised, enter } from "../../../mortgage/style";
import { chapterTransition } from "../../../mortgage/transitions";
import { FacelessBackdrop } from "../../../designs/faceless/Stage";
import { YT_SAFE } from "../../frame";
import { CueFallback16, LogoMark16, OUTRO16_COPY, Outro16 } from "../../Kit";

const ALL_CUES = [
  "kinetic",
  "compare",
  "bars",
  "verdict",
  "venn",
  "emoji",
  "lenders",
  "points",
  "change",
  "trend",
];
const CAPTION_BOTTOM = 1080 - YT_SAFE.bottom + 70;
const TEXT_W = YT_SAFE.right - YT_SAFE.left;

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
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <FacelessBackdrop />
      {/* Positioned, so it paints above the absolute backdrop (in-flow
          content would sit under it and only show while fading). */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 16,
            background: "#fff",
            marginBottom: 50,
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
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {words.map((w, i) => (
            <Fragment key={`${w}${i}`}>
              <span
                style={{
                  color: hit.has(i) ? brand.highlight : "#fff",
                  opacity: enter(frame, fps, i * 3),
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
            fontSize: 42,
            fontWeight: 700,
            color: brand.textDim,
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => (
  <AbsoluteFill>
    <FacelessBackdrop />
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

const Card: React.FC<{ big: string; label?: string }> = ({ big, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  return (
    <div
      style={{
        position: "absolute",
        left: YT_SAFE.left,
        width: TEXT_W,
        top: 250,
        textAlign: "center",
        fontFamily: FONT,
        opacity: p,
        transform: `scale(${0.9 + 0.1 * p})`,
      }}
    >
      <div style={{ fontSize: 170, fontWeight: 900, color: brand.highlight }}>
        {big}
      </div>
      {label ? (
        <div style={{ fontSize: 48, fontWeight: 700, color: "#fff" }}>
          {label}
        </div>
      ) : null}
    </div>
  );
};

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const hook = reel.edit.hook;
  return (
    <>
      {hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <Card big={hook.big} label={hook.sub} />
        </Sequence>
      ) : null}
      {figuresOf(reel, fps).map((f) => (
        <Sequence
          key={`${f.fromFrame}${f.big}`}
          from={Math.max(f.fromFrame, hook ? HOOK_FRAMES : 0)}
          durationInFrames={f.frames}
          layout="none"
        >
          <Card big={f.big} label={f.label} />
        </Sequence>
      ))}
      {lenderMentionsOf(reel).map((m) => (
        <Sequence
          key={m.startMs}
          from={Math.round((m.startMs / 1000) * fps)}
          durationInFrames={Math.max(
            45,
            Math.round(((m.endMs - m.startMs) / 1000) * fps),
          )}
          layout="none"
        >
          <div
            style={{
              position: "absolute",
              left: YT_SAFE.left,
              top: YT_SAFE.top,
            }}
          >
            <LenderLogo lender={m.lender} height={90} />
          </div>
        </Sequence>
      ))}
      {(reel.edit.chapters ?? []).map((c, i, all) => {
        const from = at(c.atMs);
        const to = all[i + 1] ? at(all[i + 1].atMs) : talkFrames;
        return (
          <Sequence
            key={c.atMs}
            from={from}
            durationInFrames={Math.max(1, to - from)}
            layout="none"
          >
            <div
              style={{
                position: "absolute",
                left: YT_SAFE.left,
                top: YT_SAFE.top + 120,
                padding: "10px 26px",
                borderRadius: 999,
                background: brand.primary,
                color: "#fff",
                fontFamily: FONT,
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              {i + 1}. {c.title}
            </div>
          </Sequence>
        );
      })}
      <CueFallback16 reel={reel} kinds={ALL_CUES} />
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
                left: YT_SAFE.left,
                width: TEXT_W,
                bottom: CAPTION_BOTTOM,
                textAlign: "center",
                fontFamily: FONT,
                fontSize: 60,
                fontWeight: 900,
                color: "#fff",
              }}
            >
              {page.tokens.map((t, i) => (
                <span
                  key={t.fromMs}
                  style={{ color: hit.has(i) ? brand.highlight : "#fff" }}
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
              left: YT_SAFE.left,
              width: TEXT_W,
              bottom: 1080 - YT_SAFE.bottom,
              textAlign: "center",
              fontFamily: FONT,
              fontSize: 32,
              fontWeight: 600,
              color: brand.textDim,
            }}
          >
            {s.text}
          </div>
        </Sequence>
      ))}
      <LogoMark16 talkFrames={talkFrames} />
    </>
  );
};

export const base: Design = {
  id: "base",
  Cover,
  Talk,
  Overlay,
  Outro: Outro16,
  chapterTransition,
  copy: [...OUTRO16_COPY],
};
