// "cards" captions and header chips. Captions: small, bold, lowercase as
// spoken, white on a dark translucent box, a few words a page, between the
// stage and Daniel's card (at SAFE.bottom while his card is away).
// Chips: a figure or bank that lands while the stage is taken, as a small
// white pill in the header row (left of the logo tile).
import type React from "react";
import {
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Figure } from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import { CaptionZone, PagedCaptions } from "../../mortgage/PagedCaptions";
import type { Reel } from "../../mortgage/schema";
import { FONT, clamp, emphasised } from "../../mortgage/style";
import { Icon, grow } from "./Kit";
import { type Chip, type Plan, fullAt } from "./Plan";
import {
  BORDER,
  CAPTION_BG,
  CAPTION_BOTTOM,
  GOLD,
  MUTED,
  NAVY,
  SHADOW,
  STAGE,
} from "./tokens";

// Lowercase as spoken, but keep acronyms and brand spellings (ANZ, CommBank).
const spoken = (w: string) =>
  /\p{Lu}/u.test(w.slice(1)) ? w : w.toLowerCase();

const Page: React.FC<{
  tokens: string[];
  keywords: string[];
  bottom: number;
}> = ({ tokens, keywords, bottom }) => {
  const frame = useCurrentFrame();
  const hit = emphasised(tokens, keywords);
  const p = interpolate(frame, [0, 4], [0, 1], clamp);
  return (
    <CaptionZone bottom={bottom}>
      <div
        style={{
          maxWidth: STAGE.right - STAGE.left,
          padding: "8px 22px 10px",
          borderRadius: 16,
          background: CAPTION_BG,
          color: "#ffffff",
          fontFamily: FONT,
          fontSize: 44,
          fontWeight: 800,
          lineHeight: 1.2,
          textAlign: "center",
          opacity: p,
          transform: `scale(${0.92 + 0.08 * p})`,
        }}
      >
        {tokens.map((t, i) => (
          <span
            key={`${t}${i}`}
            style={{ color: hit.has(i) ? GOLD : "#ffffff" }}
          >
            {i ? " " : ""}
            {spoken(t)}
          </span>
        ))}
      </div>
    </CaptionZone>
  );
};

export const Captions: React.FC<{
  reel: Reel;
  keywords: string[];
  plan: Plan;
}> = ({ reel, keywords, plan }) => {
  const frame = useCurrentFrame();
  const f = fullAt(plan, frame);
  const bottom =
    CAPTION_BOTTOM.split + (CAPTION_BOTTOM.full - CAPTION_BOTTOM.split) * f;
  return (
    <PagedCaptions
      reel={reel}
      combineWithinMs={650}
      tailMs={250}
      render={(page) => (
        <Page
          tokens={page.tokens.map((t) => t.text.trim()).filter(Boolean)}
          keywords={keywords}
          bottom={bottom}
        />
      )}
    />
  );
};

// ------------------------------------------------------------------ chips

const CHIP_W = 320;

const ChipView: React.FC<{ chip: Chip; len: number }> = ({ chip, len }) => {
  const frame = useCurrentFrame();
  const p =
    grow(frame, 0, 10) * interpolate(frame, [len - 8, len], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: STAGE.left + chip.lane * (CHIP_W + 14),
        top: STAGE.top - 150,
        width: CHIP_W,
        height: 118,
        boxSizing: "border-box",
        padding: "12px 18px",
        borderRadius: 22,
        background: "#ffffff",
        border: `2px solid ${BORDER}`,
        boxShadow: SHADOW,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * -20}px)`,
      }}
    >
      {chip.lender ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LenderLogo lender={chip.lender} height={64} />
        </div>
      ) : (
        <ChipFigure figure={chip.figure!} />
      )}
    </div>
  );
};

const ChipFigure: React.FC<{ figure: Figure }> = ({ figure }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Icon name="spark" size={24} />
      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          color: NAVY,
          whiteSpace: "nowrap",
        }}
      >
        {figure.big}
      </div>
    </div>
    {figure.label ? (
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: MUTED,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {figure.label}
      </div>
    ) : null}
  </>
);

export const Chips: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {plan.chips.map((c) => {
        const len = Math.max(fps, c.to - c.from);
        return (
          <Sequence
            key={`${c.from}${c.lane}`}
            from={c.from}
            durationInFrames={len}
            layout="none"
          >
            <ChipView chip={c} len={len} />
          </Sequence>
        );
      })}
    </>
  );
};
