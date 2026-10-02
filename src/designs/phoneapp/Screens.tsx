// "phoneapp" screens drawn on the phone (Overlay): the home screen (header
// with the chapter, and a feed of what has been said so far, or loading
// placeholders), the hook as a push notification that expands into a card,
// figures as widget cards (number + filling ring), a named bank as an app
// list row, and the chips that float above the phone when the screen is
// taken. Every value on screen comes from the reel.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { Reel } from "../../mortgage/schema";
import { FONT, clamp, enter } from "../../mortgage/style";
import {
  CONTENT,
  Card,
  GOLD,
  HOME_TOP,
  BODY_BOTTOM,
  INK,
  MUTED,
  Ring,
  Ripple,
  SCREEN,
  STATUS,
  alpha,
  clampLines,
  counted,
  ease,
  fadeOut,
  ringFill,
} from "./Phone";
import { level, type Plan } from "./plan";

const CARD_TOP = HOME_TOP + 16;
const CARD_PAD = 28;
const NUM_W = CONTENT.width - 2 * CARD_PAD - 170; // number beside the ring
// Under the banner (head, number line, at most two headline lines), where
// the number shows before the card opens.
const HERO_GAP = 270;

export const numberSize = (s: string, width: number, max: number) =>
  Math.min(
    max,
    fitText({ text: s, withinWidth: width, fontFamily: FONT, fontWeight: 900 })
      .fontSize,
  );

// The app icon: a navy rounded square with the gold initials.
const AppIcon: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <div
    style={{
      flex: `0 0 ${size}px`,
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: `linear-gradient(145deg, ${brand.primary}, ${brand.background})`,
      color: GOLD,
      fontSize: size * 0.42,
      fontWeight: 900,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    FH
  </div>
);

export const NotifyHead: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      fontSize: 34,
      lineHeight: 1.2,
    }}
  >
    <AppIcon />
    <span style={{ fontWeight: 800, color: INK }}>Finance Hub</span>
    <span style={{ fontWeight: 600, color: MUTED, marginLeft: "auto" }}>
      bây giờ
    </span>
  </div>
);

// Big number and its ring, side by side (a year or a date: no ring).
const NumberRow: React.FC<{ big: string; shown: string; t: number }> = ({
  big,
  shown,
  t,
}) => {
  const fill = ringFill(big);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div
        style={{
          width: NUM_W,
          fontSize: numberSize(big, NUM_W, 150),
          fontWeight: 900,
          lineHeight: 1.15,
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {shown}
      </div>
      {fill === null ? null : (
        <Ring size={150} fill={fill} t={t} width={18}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: GOLD,
              transform: `scale(${0.6 + 0.4 * t})`,
            }}
          />
        </Ring>
      )}
    </div>
  );
};

// A card that drops in as a push notification under the status bar, is
// tapped, and opens into a widget: big number, ring, the line under it. The
// number has already filled the screen as said, so the card shows it as said
// too (no count from 0); only the ring fills.
const NotifyCard: React.FC<{
  big: string;
  line?: string;
  dur: number;
  openAt: number;
}> = ({ big, line, dur, openAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = enter(frame, fps);
  const open = interpolate(frame, [openAt, openAt + 14], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const t = interpolate(frame, [openAt + 6, openAt + 38], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const bannerTop = SCREEN.top + STATUS + 4;
  const top = interpolate(open, [0, 1], [bannerTop, CARD_TOP]);
  const left = CONTENT.left - 10 + open * 10;
  const width = CONTENT.width + 20 - open * 20;
  return (
    <div style={{ opacity: fadeOut(frame, dur), fontFamily: FONT }}>
      {/* Until it opens, the number fills the screen under the banner; it is
          gone before the opening card reaches it (the card then carries it). */}
      <div
        style={{
          position: "absolute",
          left: CONTENT.left,
          width: CONTENT.width,
          top: bannerTop + HERO_GAP,
          height: BODY_BOTTOM - bannerTop - HERO_GAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: numberSize(big, CONTENT.width - 40, 200),
          fontWeight: 900,
          color: INK,
          whiteSpace: "nowrap",
          opacity: Math.min(drop, 1 - Math.min(1, open * 4)),
        }}
      >
        {big}
      </div>
      <Card
        style={{
          position: "absolute",
          left,
          width,
          top: interpolate(drop, [0, 1], [SCREEN.top - 180, top]),
          padding: CARD_PAD - 6 + open * 6,
          boxShadow: `0 18px 40px ${alpha(brand.navy, 0.25)}`,
        }}
      >
        <NotifyHead />
        {/* Collapsed body: the number, then the headline in at most two
            lines (normal wrap, cut cleanly with an ellipsis beyond that), so
            the banner never passes HERO_GAP. */}
        <div
          style={{
            maxHeight: (1 - open) * 140,
            overflow: "hidden",
            opacity: 1 - open,
            marginTop: 8 * (1 - open),
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.3,
            color: INK,
          }}
        >
          <div>{big}</div>
          {line ? (
            <div style={{ ...clampLines(2), textWrap: "wrap" }}>{line}</div>
          ) : null}
        </div>
        <div
          style={{
            maxHeight: open * 420,
            overflow: "hidden",
            opacity: open,
            marginTop: 18 * open,
          }}
        >
          <NumberRow big={big} shown={big} t={t} />
          {line ? (
            <div
              style={{
                marginTop: 14,
                fontSize: 38,
                fontWeight: 800,
                lineHeight: 1.25,
                color: INK,
                ...clampLines(2),
              }}
            >
              {line}
            </div>
          ) : null}
        </div>
      </Card>
      <Ripple x={540} y={bannerTop + 70} frame={frame - (openAt - 4)} />
    </div>
  );
};

// An automatic figure: a widget card sliding up, tapped, its ring filling.
// Its words are already in the captions, so the card holds the number only.
const FigureWidget: React.FC<{ figure: Figure; dur: number }> = ({
  figure,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const t = interpolate(frame, [6, 36], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{ opacity: Math.min(p, fadeOut(frame, dur)), fontFamily: FONT }}
    >
      <Card
        style={{
          position: "absolute",
          left: CONTENT.left,
          width: CONTENT.width,
          top: CARD_TOP + (1 - p) * 160,
          padding: CARD_PAD,
        }}
      >
        <NumberRow big={figure.big} shown={counted(figure.big, t)} t={t} />
      </Card>
      <Ripple
        x={CONTENT.left + CONTENT.width - 110}
        y={CARD_TOP + 105}
        frame={frame - 4}
      />
    </div>
  );
};

// A named bank: an app list row sliding in, logo on its white tile.
const LenderRow: React.FC<{ lender: Lender; dur: number }> = ({
  lender,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = enter(frame, fps);
  const row = enter(frame, fps, 6);
  return (
    <div
      style={{ opacity: Math.min(p, fadeOut(frame, dur)), fontFamily: FONT }}
    >
      <div
        style={{
          position: "absolute",
          left: CONTENT.left,
          top: CARD_TOP,
          fontSize: 34,
          fontWeight: 800,
          letterSpacing: 3,
          color: MUTED,
        }}
      >
        ĐANG NHẮC TỚI
      </div>
      <Card
        style={{
          position: "absolute",
          left: CONTENT.left,
          width: CONTENT.width,
          top: CARD_TOP + 64,
          padding: "22px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transform: `translateX(${(1 - row) * 300}px)`,
          opacity: row,
        }}
      >
        <LenderLogo
          lender={lender}
          height={84}
          style={{ border: `2px solid ${alpha(brand.slate, 0.25)}` }}
        />
        <span style={{ fontSize: 60, fontWeight: 900, color: GOLD }}>›</span>
      </Card>
      <Ripple x={CONTENT.left + 200} y={CARD_TOP + 150} frame={frame - 12} />
    </div>
  );
};

// ------------------------------------------------------------- layers

// Items on the phone screen (inside <Phone>).
export const ScreenItems: React.FC<{ reel: Reel; plan: Plan }> = ({
  reel,
  plan,
}) => (
  <>
    {plan.items
      .filter((i) => i.slot === "screen")
      .map((i) => {
        const dur = i.to - i.from;
        return (
          <Sequence
            key={`${i.kind}${i.from}`}
            from={i.from}
            durationInFrames={dur}
            layout="none"
          >
            {i.kind === "hook" && reel.edit.hook ? (
              <NotifyCard
                big={reel.edit.hook.big}
                line={reel.edit.hook.sub}
                dur={dur}
                openAt={26}
              />
            ) : i.kind === "figure" && i.figure.source === "stat" ? (
              <NotifyCard
                big={i.figure.big}
                line={i.figure.label}
                dur={dur}
                openAt={18}
              />
            ) : i.kind === "figure" ? (
              <FigureWidget figure={i.figure} dur={dur} />
            ) : i.kind === "lender" ? (
              <LenderRow lender={i.lender} dur={dur} />
            ) : null}
          </Sequence>
        );
      })}
  </>
);

export const screenBusy = (plan: Plan, frame: number) =>
  level(
    plan.items
      .filter((i) => i.slot === "screen")
      .map((i) => [i.from, i.to] as [number, number]),
    frame,
  );
