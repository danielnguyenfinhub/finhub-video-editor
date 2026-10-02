// Figures on the stage (golden rule 1): a number slams in with a striped
// one-bar meter; a date said as a stat is a tear-off calendar page under the
// reel's own label. No count-ups: a flash slams.
import { fitText } from "@remotion/layout-utils";
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { asSaid, type Figure, saidKind } from "../../mortgage/golden";
import { FONT, clamp } from "../../mortgage/style";
import {
  FlashCard,
  GOLD,
  Glint,
  NAVY,
  STRIPES,
  Tag,
  W,
  slam,
  useFontReady,
} from "./Frame";

export const FIGURE_TAG = "CON SỐ";
export const YEAR_KICKER = "NĂM";
export const DATE_KICKER = "NGÀY";
// A year or a date is not "the number" of anything (recheck 09): its own
// neutral word, shown as said (golden rule 1).
export const kickerOf = (big: string): string => {
  const kind = saidKind(big);
  return kind === "year"
    ? YEAR_KICKER
    : kind === "date"
      ? DATE_KICKER
      : FIGURE_TAG;
};
const CW = W - 60;

const DATE = /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/;

// How far the meter fills: a rate below 10 % on a 10 % scale, another
// percentage on 100 %; anything else has no scale, so it fills.
// A year or a date has no meter (null): shown as said.
export const meterFill = (big: string): number | null => {
  if (asSaid(big)) return null;
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, v / (v < 10 ? 10 : 100));
};

// A date said as a stat: a tear-off calendar page that flips down, the
// reel's own label above it.
const DateCard: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("flash date: Be Vietnam Pro");
  const size = ready
    ? Math.min(
        190,
        fitText({
          text: figure.big,
          withinWidth: CW - 160,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize,
      )
    : 190;
  const flip = spring({
    frame: frame - 4,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  });
  const ring = (frame % 36) / 36;
  return (
    <FlashCard shakeAt={[10]}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
        }}
      >
        {figure.label ? (
          <div
            style={{
              maxWidth: CW,
              textAlign: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: 44,
              lineHeight: 1.28,
              textWrap: "balance",
            }}
          >
            {figure.label}
          </div>
        ) : null}
        <div style={{ position: "relative", perspective: 900 }}>
          <div
            style={{
              position: "absolute",
              inset: -18,
              borderRadius: 30,
              border: `4px solid ${GOLD}`,
              opacity: 1 - ring,
              transform: `scale(${1 + ring * 0.12})`,
            }}
          />
          <div
            style={{
              minWidth: 380,
              opacity: ready ? 1 : 0,
              borderRadius: 22,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
              transformOrigin: "top center",
              transform: `rotateX(${interpolate(flip, [0, 1], [-95, 0])}deg)`,
            }}
          >
            <div
              style={{
                height: 58,
                background: STRIPES(GOLD, NAVY, 16),
                backgroundPosition: `${(frame * 3) % 45}px 0`,
              }}
            />
            <Glint first={16} every={50}>
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1.2,
                  color: NAVY,
                  padding: "4px 40px 10px",
                }}
              >
                {figure.big}
              </div>
            </Glint>
          </div>
        </div>
      </div>
    </FlashCard>
  );
};

const NumberCard: React.FC<{ figure: Figure }> = ({ figure }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useFontReady("flash figure: Be Vietnam Pro");
  const s = slam(frame, fps, 3);
  const size = ready
    ? Math.min(
        190,
        fitText({
          text: figure.big,
          withinWidth: CW - 60,
          fontFamily: FONT,
          fontWeight: 900,
        }).fontSize,
      )
    : 190;
  const fillTo = meterFill(figure.big);
  const fill =
    (fillTo ?? 0) *
    interpolate(frame, [8, 26], [0, 1], {
      ...clamp,
      easing: (x) => 1 - (1 - x) ** 3,
    });
  const label = figure.source === "stat" ? figure.label : "";
  return (
    <FlashCard shakeAt={[3]}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: ready ? 1 : 0,
        }}
      >
        <Tag text={kickerOf(figure.big)} />
        <Glint first={12} every={48}>
          <div
            style={{
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.12,
              color: GOLD,
              padding: "0 14px",
              opacity: s.opacity,
              transform: `scale(${s.scale})`,
              textShadow: "0 0 40px rgba(255,185,56,0.5)",
            }}
          >
            {figure.big}
          </div>
        </Glint>
        {fillTo === null ? null : (
          <div
            style={{
              width: Math.min(CW - 80, 700),
              height: 18,
              borderRadius: 9,
              background: "rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${fill * 100}%`,
                height: "100%",
                background: STRIPES(GOLD, brand.accent, 12),
                backgroundPosition: `${(frame * 3) % 34}px 0`,
              }}
            />
          </div>
        )}
        {label ? (
          <div
            style={{
              maxWidth: CW,
              textAlign: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 42,
              lineHeight: 1.28,
              textWrap: "balance",
            }}
          >
            {label}
          </div>
        ) : null}
      </div>
    </FlashCard>
  );
};

export const FigureCard: React.FC<{ figure: Figure }> = ({ figure }) =>
  figure.source === "stat" && DATE.test(figure.big.trim()) ? (
    <DateCard figure={figure} />
  ) : (
    <NumberCard figure={figure} />
  );
