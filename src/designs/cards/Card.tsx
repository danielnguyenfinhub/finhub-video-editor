// "cards": the airy cream backdrop, Daniel's rounded video card (Talk) and
// the Cover. The card holds the cut-out over a soft navy gradient, or his
// room when edit.json has "background": "room"; PacedVideo (his voice) stays
// mounted when the card slides away for a full-screen moment.
import { fitTextOnNLines } from "@remotion/layout-utils";
import type React from "react";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { CoverProps, TalkProps } from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import {
  CoverCutOut,
  PacedVideo,
  useQuickMode,
} from "../../mortgage/PacedVideo";
import type { Reel } from "../../mortgage/schema";
import { FONT, LOGO, emphasised } from "../../mortgage/style";
import { useFontReady } from "../splitscreen/Slider";
import { Label, Panel, grow, rise } from "./Kit";
import { fullAt, planOf } from "./Plan";
import {
  BORDER,
  CARD,
  CARD_AWAY,
  CREAM,
  CREAM_DEEP,
  GOLD,
  GOLD_SOFT,
  NAVY,
  STAGE,
  VIDEO,
  W,
} from "./tokens";

// Cream with a soft gold light top-left and a faint dot texture.
export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 70% 40% at 15% 10%, ${GOLD_SOFT}, transparent 70%), linear-gradient(170deg, ${CREAM} 0%, #ffffff 45%, ${CREAM_DEEP} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${BORDER} 1.6px, transparent 1.6px)`,
        backgroundSize: "34px 34px",
        opacity: 0.6,
      }}
    />
  </AbsoluteFill>
);

// Inside the card, behind the cut-out.
const CardBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 80% 55% at 50% 28%, rgba(0,100,168,0.55), transparent 72%), linear-gradient(180deg, ${NAVY} 0%, ${brand.background} 100%)`,
    }}
  />
);

// The rounded card frame, at y `drop` below its place.
const CardFrame: React.FC<{ drop: number; children: React.ReactNode }> = ({
  drop,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: CARD.left,
      top: CARD.top,
      width: CARD.width,
      height: CARD.height,
      borderRadius: 46,
      overflow: "hidden",
      transform: `translateY(${drop}px)`,
      boxShadow: "0 30px 70px rgba(11,31,61,0.28)",
      border: "4px solid #ffffff",
      background: brand.background,
    }}
  >
    {children}
  </div>
);

// The source frame (1080 x 1920) placed in the card: VIDEO.scale, source y
// VIDEO.srcTop at the card top, centred; `zoom` pushes in around his face.
const InCard: React.FC<{ zoom: number; children: React.ReactNode }> = ({
  zoom,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: (CARD.width - W * VIDEO.scale) / 2,
      top: -VIDEO.srcTop * VIDEO.scale,
      width: W,
      height: 1920,
      transform: `scale(${VIDEO.scale})`,
      transformOrigin: "0 0",
    }}
  >
    <AbsoluteFill
      style={{ transform: `scale(${zoom})`, transformOrigin: "50% 42%" }}
    >
      {children}
    </AbsoluteFill>
  </div>
);

// ------------------------------------------------------------------ talk

export const Talk: React.FC<TalkProps> = ({
  seg,
  index,
  src,
  look,
  foreground,
  behind,
}) => {
  const frame = useCurrentFrame();
  const { fps, props } = useVideoConfig();
  const quick = useQuickMode();
  const reel = (props as { reel?: Reel | null }).reel;
  const plan = useMemo(() => (reel ? planOf(reel, fps) : null), [reel, fps]);
  const full = plan ? fullAt(plan, seg.outFrom + frame) : 0;
  // A small spring punch on every cut, and a slow push-in.
  const punch =
    index === 0
      ? 0
      : (1 - spring({ frame, fps, config: { damping: 18, stiffness: 240 } })) *
        0.05;
  const drift = (frame / Math.max(1, seg.outDuration)) * 0.025;
  return (
    <AbsoluteFill>
      <Backdrop />
      <CardFrame drop={full * CARD_AWAY}>
        {foreground && !quick ? <CardBackdrop /> : null}
        {behind}
        <InCard zoom={1 + punch + drift}>
          <PacedVideo
            seg={seg}
            src={src}
            look={look}
            foreground={foreground}
            backdrop="none"
          />
        </InCard>
      </CardFrame>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ cover

// The title on a white info card, the logo tile top-right, Daniel's card
// below (his frozen cover frame: the cut-out, or the room when there is none).
export const Cover: React.FC<CoverProps> = ({
  src,
  foreground,
  coverFrame,
  title,
  subtitle,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const ready = useFontReady();
  const quick = useQuickMode();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const width = STAGE.right - STAGE.left;
  const size = ready
    ? fitTextOnNLines({
        text: title,
        maxLines: 3,
        maxBoxWidth: width - 70,
        fontFamily: FONT,
        fontWeight: 900,
        maxFontSize: 70,
      }).fontSize
    : 72;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          right: W - SAFE.right,
          padding: "14px 22px",
          borderRadius: 22,
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(11,31,61,0.15)",
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      <Panel
        style={{
          left: STAGE.left,
          top: STAGE.top,
          width,
          height: CARD.top - 26 - STAGE.top,
          padding: 34,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: ready ? 1 : 0,
          ...rise(grow(frame, 2), 30),
        }}
      >
        <div style={{ flex: "none" }}>
          <Label icon="spark" text={subtitle} />
        </div>
        <div
          style={{
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.15,
            color: NAVY,
            textWrap: "balance",
          }}
        >
          {words.map((w, i) => (
            <span key={`${w}${i}`} style={{ color: hit.has(i) ? GOLD : NAVY }}>
              {w}{" "}
            </span>
          ))}
        </div>
        <div
          style={{
            height: 8,
            width: 140 * grow(frame, 8, 20),
            borderRadius: 4,
            background: GOLD,
          }}
        />
      </Panel>
      <CardFrame drop={(1 - grow(frame, 0, 18)) * 80}>
        {foreground && !quick ? <CardBackdrop /> : null}
        <InCard zoom={1}>
          <CoverCutOut src={src} trimBefore={coverFrame} room={!foreground} />
        </InCard>
      </CardFrame>
    </AbsoluteFill>
  );
};
