// Pieces every 16:9 YouTube design shares: the logo mark, the CTA/contact
// outro, the compliance card (same lines as the vertical card) and a fallback
// for cue kinds a design doesn't draw itself.
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BadgeRow } from "../brand/BadgeRow";
import { brand } from "../brand/theme";
import { MotionTrack } from "../designs/classic/Cues";
import { complianceLines } from "../mortgage/EndCards";
import {
  CTA_BUTTON,
  outFrameOf,
  type EditJson,
  type Reel,
} from "../mortgage/schema";
import { FONT, LOGO, clamp, enter } from "../mortgage/style";
import { YT_HEIGHT, YT_SAFE, YT_WIDTH } from "./frame";

const LOGO_HEIGHT = 96;
const LOGO_SHOW_FRAMES = 300; // first and last 10 s, as on the vertical reels

// The logo on white, top-right inside YT_SAFE, for the first and last 10 s.
export const LogoMark16: React.FC<{ talkFrames: number }> = ({
  talkFrames,
}) => {
  const frame = useCurrentFrame();
  const inFirst = interpolate(
    frame,
    [0, 10, LOGO_SHOW_FRAMES - 10, LOGO_SHOW_FRAMES],
    [0, 1, 1, 0],
    clamp,
  );
  const inLast = interpolate(
    frame,
    [talkFrames - LOGO_SHOW_FRAMES, talkFrames - LOGO_SHOW_FRAMES + 10],
    [0, 1],
    clamp,
  );
  const o = Math.max(inFirst, inLast);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: YT_SAFE.top,
        right: YT_WIDTH - YT_SAFE.right,
        padding: "10px 18px",
        borderRadius: 16,
        background: "#fff",
        opacity: o,
      }}
    >
      <Img src={LOGO} style={{ height: LOGO_HEIGHT, display: "block" }} />
    </div>
  );
};

// CTA + contact, laid out side by side for 16:9. Same wording as the classic
// vertical outro.
export const Outro16: React.FC<{ question: string }> = ({ question }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b, c, d] = [4, 14, 26, 38].map((delay) => enter(frame, fps, delay));
  const contact = (label: string, value: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 30,
        padding: "12px 0",
        borderTop: `2px solid ${brand.primary}22`,
      }}
    >
      <span style={{ color: brand.textOnCard, opacity: 0.7, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ color: brand.textOnCard, fontWeight: 800 }}>{value}</span>
    </div>
  );
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FB 100%)", // theme-exempt: the classic outro's white card
        fontFamily: FONT,
        flexDirection: "row",
        alignItems: "center",
        padding: `0 ${YT_SAFE.left + 40}px`,
        gap: 100,
      }}
    >
      <div style={{ flex: 1, textAlign: "center" }}>
        <Img
          src={LOGO}
          style={{ width: 620, opacity: a, transform: `scale(${a})` }}
        />
        <div
          style={{
            marginTop: 40,
            fontSize: 58,
            fontWeight: 900,
            color: brand.textOnCard,
            lineHeight: 1.25,
            opacity: b,
          }}
        >
          {question}
        </div>
      </div>
      <div style={{ flex: 1, fontSize: 40, opacity: d }}>
        <div
          style={{
            display: "inline-block",
            padding: "22px 54px",
            borderRadius: 999,
            background: brand.primary,
            color: "#fff",
            fontSize: 48,
            fontWeight: 900,
            transform: `scale(${c * (1 + Math.sin(frame / 6) * 0.03)})`,
            marginBottom: 36,
          }}
        >
          {CTA_BUTTON}
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 900,
            color: brand.primary,
            marginBottom: 8,
          }}
        >
          Daniel Nguyen
        </div>
        {contact("Điện thoại", "0430 11 11 88")}
        {contact("Email", "daniel@finhub.net.au")}
        {contact("Website", "finhub.net.au")}
        <div style={{ marginTop: 30 }}>
          <BadgeRow height={80} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
export const OUTRO16_COPY = ["Daniel Nguyen", "Điện thoại", "Email", "Website"];

// The compliance card for 16:9: logo on the left, the same lines as the
// vertical card (complianceLines) in a column on the right, held 5 s.
export const ComplianceCard16: React.FC<{
  compliance: EditJson["compliance"];
}> = ({ compliance }) => {
  const frame = useCurrentFrame();
  const lines = complianceLines(compliance);
  // ponytail: same area-estimate fit as the vertical card, for a 1100 px
  // column and ~880 px of height; swap for fitText if a card overflows.
  const chars = lines.reduce((n, l) => n + l.text.length, 0);
  const fit = Math.sqrt(((880 - 24 * lines.length) * 1100) / (chars * 0.7425));
  const k = Math.min(1, fit / 44);
  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF", // theme-exempt: disclosures on white, as the vertical card
        fontFamily: FONT,
        flexDirection: "row",
        alignItems: "center",
        padding: `0 ${YT_SAFE.left}px`,
        gap: 70,
        opacity: interpolate(frame, [0, 8], [0, 1], clamp),
      }}
    >
      <Img src={LOGO} style={{ width: 460 }} />
      <div style={{ width: 1100 }}>
        {lines.map((l) => (
          <div
            key={l.text}
            style={{
              fontSize: Math.round(l.base * k),
              fontWeight: 800,
              color: l.color ?? brand.textOnCard,
              lineHeight: 1.3,
              marginTop: 24 * k,
            }}
          >
            {l.text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Cue kinds a YouTube design doesn't draw itself: the classic vertical panels
// in a 1080x1920 box scaled to the frame height, on the right third (their
// text is sized for a phone, so at 0.5625 it still reads on a desktop).
// `kinds` = the cue kinds to hand over; the rest are the design's.
export const CueFallback16: React.FC<{ reel: Reel; kinds: string[] }> = ({
  reel,
  kinds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cues = (reel.edit.cues ?? []).filter((c) => kinds.includes(c.kind));
  const at = outFrameOf(reel.timeline, fps);
  // MotionTrack's film finish fills its box whenever it is mounted, so show
  // the box only while one of these cues is up (plus a short fade tail).
  const up = cues.some(
    (c) => frame >= at(c.fromMs) - 5 && frame <= at(c.toMs) + 15,
  );
  if (!cues.length || !up) return null;
  const scale = YT_HEIGHT / 1920;
  const only: Reel = {
    ...reel,
    edit: { ...reel.edit, cues, stats: [], chapters: [] },
  };
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: YT_SAFE.right - 1080 * scale,
        width: 1080,
        height: 1920,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <MotionTrack reel={only} leak={false} />
    </div>
  );
};
