// The generic "artefact" Daniel reacts to: a tilted paper card at the top of
// SAFE with a kicker, the title as a headline under an amber highlighter
// stroke, grey placeholder paper lines (never real sentences, per compliance)
// and, when the reel has one, the hook figure inside a hand-drawn circle.
// Used as-is (with a spring slam-in) on the Cover, and with a slow Ken Burns
// push plus chapter "tears" on the Talk overlay.
import { fitText } from "@remotion/layout-utils";
import { Circle, Highlight } from "@remotion/rough-notation";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import { DEFAULT_SUBTITLE, outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";

// x SAFE.left-704, y SAFE.top-(SAFE.top+height): the top of SAFE, stopping
// well short of SAFE.right so the top-right LogoMark (golden rule 3c, ~240px
// wide on its tile) never sits on the card — checked against a still, not
// just the logo's own SAFE.right anchor. This is Behind-layer content
// (rendered behind Daniel's cut-out), so it may extend below his real face
// box — that overlap is the intended "he's in
// front of the card" look.
export const ARTEFACT = {
  left: SAFE.left,
  top: SAFE.top,
  width: 650,
  height: 600,
};

const LINE_WIDTHS = [0.94, 0.8, 0.88, 0.62];

const PaperLines: React.FC = () => (
  <div
    style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}
  >
    {LINE_WIDTHS.map((w, i) => (
      <div
        key={i}
        style={{
          height: 20,
          width: `${w * 100}%`,
          borderRadius: 10,
          background: "#D8DEE8",
        }}
      />
    ))}
  </div>
);

// The card's fixed content: kicker slot (default subtitle, or a chapter
// title while its tear window is open), the headline and paper lines, plus
// the hook figure circled in the corner while the hook plays.
const ArtefactContent: React.FC<{
  kicker: string;
  title: string;
  hookBig?: string;
  hookVisible: boolean;
}> = ({ kicker, title, hookBig, hookVisible }) => {
  const frame = useCurrentFrame();
  const headlineSize = Math.min(
    64,
    fitText({
      text: title,
      // 50px padding each side (ArtefactContent below).
      withinWidth: ARTEFACT.width - 100,
      fontFamily: FONT,
      fontWeight: 900,
    }).fontSize,
  );
  const markProgress = interpolate(frame, [6, 30], [0, 1], clamp);
  return (
    <div
      style={{ padding: "36px 50px", height: "100%", boxSizing: "border-box" }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 5,
          color: "#7B8AA0",
          textTransform: "uppercase",
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: FONT,
          fontSize: headlineSize,
          fontWeight: 900,
          lineHeight: 1.15,
          color: brand.textOnCard,
        }}
      >
        <Highlight
          progress={markProgress}
          color="rgba(245,165,36,0.5)"
          padding={{ left: 6, right: 6, top: 2, bottom: 2 }}
        >
          {title}
        </Highlight>
      </div>
      <PaperLines />
      {hookBig && hookVisible ? (
        <div style={{ position: "absolute", right: 60, bottom: 40 }}>
          <Circle
            progress={interpolate(frame, [4, 26], [0, 1], clamp)}
            color={brand.accent}
            strokeWidth={7}
            roughness={1.8}
            padding={{ left: 12, right: 12, top: 10, bottom: 10 }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: 44,
                fontWeight: 900,
                color: brand.textOnCard,
              }}
            >
              {hookBig}
            </span>
          </Circle>
        </div>
      ) : null}
    </div>
  );
};

const Card: React.FC<{
  children: React.ReactNode;
  transform?: string;
  opacity?: number;
}> = ({ children, transform, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: ARTEFACT.left,
      top: ARTEFACT.top,
      width: ARTEFACT.width,
      height: ARTEFACT.height,
      overflow: "hidden",
      borderRadius: 28,
      background: "#fff",
      boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
      opacity,
      transform: `perspective(900px) rotateX(3deg) ${transform ?? ""}`,
    }}
  >
    {children}
  </div>
);

// Cover: the card slams in from above, hook figure always visible (the whole
// Cover plays inside the hook window).
export const ArtefactCover: React.FC<{
  title: string;
  subtitle: string;
  hookBig?: string;
}> = ({ title, subtitle, hookBig }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <Card transform={`translateY(${interpolate(slam, [0, 1], [-300, 0])}px)`}>
      <ArtefactContent
        kicker={subtitle}
        title={title}
        hookBig={hookBig}
        hookVisible={Boolean(hookBig)}
      />
    </Card>
  );
};

const HOOK_FRAMES = 105;
const CHAPTER_TEAR_FRAMES = 10;
const SWAP_FRAMES = 8;

// How far a cue panel (MotionTrack, drawn at the top of SAFE in the Overlay)
// is in, 0..1: the artefact fades out under it and back after, so the two
// never stack. Emoji cues are small and don't take the card's place.
export const cueUp = (reel: Reel, frame: number, fps: number): number => {
  const outFrame = outFrameOf(reel.timeline, fps);
  return Math.max(
    0,
    ...(reel.edit.cues ?? [])
      .filter((c) => c.kind !== "emoji")
      .map((c) => {
        const a = outFrame(c.fromMs);
        const b = outFrame(c.toMs);
        return Math.min(
          interpolate(frame, [a, a + SWAP_FRAMES], [0, 1], clamp),
          interpolate(frame, [b - SWAP_FRAMES, b], [1, 0], clamp),
        );
      }),
  );
};

// Overlay: the card stays up through the whole talk, pushing in (Ken Burns)
// over the first HOOK_FRAMES, and its kicker briefly "tears" to the chapter
// title at each chapter cut.
export const Artefact: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const outFrame = outFrameOf(reel.timeline, fps);
  const chapterFrames = Math.round(2.5 * fps);
  const chapters = reel.edit.chapters ?? [];
  const active = chapters
    .map((c, i) => ({ ...c, index: i, from: outFrame(c.atMs) }))
    .find((c) => frame >= c.from && frame < c.from + chapterFrames);
  const kicker = active
    ? `PHẦN ${active.index + 1} · ${active.title}`
    : (reel.edit.subtitle ?? DEFAULT_SUBTITLE);
  const tearFrame = active ? frame - active.from : -1;
  const tear = interpolate(tearFrame, [0, CHAPTER_TEAR_FRAMES], [0, 1], clamp);
  const push = interpolate(frame, [0, HOOK_FRAMES], [1, 1.06], clamp);
  const away = cueUp(reel, frame, fps);
  if (away >= 1) return null;
  return (
    <Card transform={`scale(${push})`} opacity={1 - away}>
      <div style={{ transformOrigin: "50% 22%" }}>
        <ArtefactContent
          kicker={kicker}
          title={reel.edit.title}
          hookBig={reel.edit.hook?.big}
          hookVisible={frame < HOOK_FRAMES}
        />
      </div>
      {tearFrame >= 0 && tearFrame < CHAPTER_TEAR_FRAMES ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: brand.accent,
            clipPath: `inset(0 ${(1 - tear) * 100}% 0 0)`,
            opacity: 0.85,
          }}
        />
      ) : null}
    </Card>
  );
};
