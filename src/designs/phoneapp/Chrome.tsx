// "phoneapp" pieces around the phone: the captions on a frosted bar under the
// phone (it overlaps the phone's lower edge; nothing on the screen goes that
// low), the English line under them, the sounds (a notification ding for the
// hook, the classic stat and chapter sounds), and the cover.
import type { TikTokPage } from "@remotion/captions";
import { fitText } from "@remotion/layout-utils";
import { Audio } from "@remotion/media";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import type { CoverProps } from "../../mortgage/design";
import { LOGO_HEIGHT, SAFE } from "../../mortgage/golden";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { FONT, LOGO, clamp, emphasised, enter } from "../../mortgage/style";
import {
  Backdrop,
  CARD_SHADOW,
  CONTENT,
  Card,
  GOLD,
  HOME_TOP,
  INK,
  Phone,
  SCREEN,
  STATUS,
  WHITE,
  alpha,
  useFontReady,
} from "./Phone";
import { FeedRow } from "./Home";
import { NotifyHead } from "./Screens";

// The English line sits on SAFE.bottom; the captions' bar ends above it.
export const CAPTION_BOTTOM = SAFE.bottom - 100;
const FROST: React.CSSProperties = {
  background: alpha(brand.background, 0.88),
  border: `1.5px solid ${alpha(WHITE, 0.18)}`,
  backdropFilter: "blur(22px)",
  boxShadow: `0 16px 40px ${alpha(brand.navy, 0.45)}`,
};

// ------------------------------------------------------------- captions

const CapPage: React.FC<{ page: TikTokPage; keywords: string[] }> = ({
  page,
  keywords,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const hit = emphasised(
    page.tokens.map((t) => t.text),
    keywords,
  );
  const chars = page.tokens.map((t) => t.text).join("").length;
  const size = chars > 56 ? 46 : 54;
  const p = enter(frame, fps);
  return (
    <CaptionZone bottom={CAPTION_BOTTOM}>
      <div
        style={{
          ...FROST,
          maxWidth: SAFE.right - SAFE.left,
          padding: "12px 30px",
          borderRadius: 30,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.25,
          textWrap: "balance",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
        }}
      >
        {page.tokens.map((t, i) => {
          const now = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          return (
            <span key={t.fromMs}>
              {i > 0 && t.text.startsWith(" ") ? " " : ""}
              <span
                style={{
                  display: "inline-block",
                  color: hit.has(i) ? GOLD : WHITE,
                  opacity: spoken ? 1 : 0.45,
                  transform: `translateY(${now ? -3 : 0}px)`,
                  borderBottom: `4px solid ${now ? GOLD : "transparent"}`,
                }}
              >
                {t.text.trim()}
              </span>
            </span>
          );
        })}
      </div>
    </CaptionZone>
  );
};

export const Captions: React.FC<{ reel: Reel; keywords: string[] }> = ({
  reel,
  keywords,
}) => (
  <PagedCaptions
    reel={reel}
    combineWithinMs={800}
    tailMs={300}
    render={(page) => <CapPage page={page} keywords={keywords} />}
  />
);

// One English line per scene (edit.json subtitles), on SAFE.bottom.
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
            layout="none"
          >
            <CaptionZone>
              <div
                style={{
                  ...FROST,
                  background: alpha(brand.navy, 0.7),
                  fontFamily: FONT,
                  fontSize: 30,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: brand.textDim,
                  textAlign: "center",
                  textWrap: "balance",
                  padding: "6px 22px",
                  borderRadius: 16,
                  boxShadow: "none",
                }}
              >
                {s.text}
              </div>
            </CaptionZone>
          </Sequence>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------- sounds

// A notification ding when the hook drops in, and MotionTrack's stat and
// chapter sounds (it is mounted only while a classic panel is up).
export const Sounds: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const sfx = [
    ...(reel.edit.hook ? [{ frame: 2, file: "ding", volume: 0.2 }] : []),
    ...(reel.edit.chapters ?? []).map((c) => ({
      frame: at(c.atMs - 250),
      file: "whoosh",
      volume: 0.35,
    })),
    ...(reel.edit.stats ?? []).map((s) => ({
      frame: at(s.atMs),
      file: "ding",
      volume: 0.22,
    })),
  ];
  return (
    <>
      {sfx.map((s) => (
        <Sequence
          key={`${s.file}${s.frame}`}
          from={Math.max(0, s.frame)}
          durationInFrames={fps * 3}
          layout="none"
        >
          <Audio
            src={staticFile(`sfx/${s.file}.wav`)}
            volume={() => s.volume}
          />
        </Sequence>
      ))}
    </>
  );
};

// ------------------------------------------------------------- cover

// The title large above the phone; on the phone's screen the subtitle drops
// in as a notification.
export const Cover: React.FC<CoverProps> = ({ title, subtitle, keywords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady();
  const words = title.split(/\s+/).filter(Boolean);
  const hit = emphasised(words, keywords);
  const width = SAFE.right - SAFE.left;
  const size = ready
    ? Math.min(
        100,
        fitText({
          text: title,
          withinWidth: width,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize * 1.7,
      )
    : 0;
  const rise = enter(frame, fps, 4);
  const drop = enter(frame, fps, 16);
  const top = SAFE.top + LOGO_HEIGHT + 60;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop t={frame} />
      {/* The phone rises from below, lower than in the talk. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${400 + (1 - rise) * 300}px)`,
        }}
      >
        <Phone t={frame}>
          {/* The app loading under the notification. */}
          <div
            style={{
              position: "absolute",
              left: CONTENT.left,
              width: CONTENT.width,
              top: HOME_TOP + 40,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {[0, 1, 2].map((i) => (
              <FeedRow key={i} frame={frame + i * 12} />
            ))}
          </div>
          <Card
            style={{
              position: "absolute",
              left: CONTENT.left - 10,
              width: CONTENT.width + 20,
              top: interpolate(
                drop,
                [0, 1],
                [SCREEN.top - 200, SCREEN.top + STATUS + 4],
              ),
              padding: 22,
              boxShadow: `0 18px 40px ${alpha(brand.navy, 0.25)}`,
            }}
          >
            <NotifyHead />
            <div
              style={{
                marginTop: 10,
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1.3,
                color: INK,
              }}
            >
              {subtitle}
            </div>
          </Card>
        </Phone>
      </div>
      <div
        style={{
          position: "absolute",
          top: SAFE.top,
          left: SAFE.left,
          padding: "14px 22px",
          borderRadius: 22,
          background: WHITE,
          boxShadow: CARD_SHADOW,
        }}
      >
        <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
      </div>
      {ready ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left,
            width,
            top,
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.18,
            color: WHITE,
            textWrap: "balance",
            textShadow: `0 6px 30px ${alpha(brand.navy, 0.6)}`,
          }}
        >
          {words.map((w, i) => (
            <span
              key={`${w}${i}`}
              style={{
                display: "inline-block",
                marginRight: "0.25em",
                color: hit.has(i) ? GOLD : WHITE,
                opacity: enter(frame, fps, 4 + i * 3),
                transform: `translateY(${interpolate(enter(frame, fps, 4 + i * 3), [0, 1], [30, 0], clamp)}px)`,
              }}
            >
              {w}
            </span>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
