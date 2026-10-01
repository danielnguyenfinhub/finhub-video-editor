// The core "Scenario Split" mechanic: two columns (A/B) driven by the reel's
// `compare` cues. Cards pop in the same way classic/Infographics.tsx's
// Compare does; rows type in character by character (a per-row Typewriter
// feel) since each row is a number Daniel is comparing live, not a static
// list.
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE } from "../../mortgage/golden";
import type { Cue } from "../../mortgage/schema";
import { DIM, FONT, clamp, pop, toneColor } from "../../mortgage/style";

type CompareCue = Extract<Cue, { kind: "compare" }>;
type Rel = (srcMs: number) => number;

// Column B starts lower than column A: its top-right corner shares screen
// space with LogoMark (top: SAFE.top, right: 1080 - SAFE.right) for the
// first/last 10 s of the talk, so it sits under the logo instead of behind it
// (golden rule: y >= SAFE.top + 170).
const COL = {
  a: { left: SAFE.left + 6, width: 440, top: SAFE.top },
  b: { left: SAFE.right - 380, width: 380, top: SAFE.top + 170 },
} as const;
const COL_HEIGHT = 340;

const graphemes = (text: string) =>
  text.normalize("NFC").match(/\P{M}\p{M}*/gu) ?? [];

// A row's label, then its value, typed in one grapheme at a time so a
// Vietnamese letter with its marks never appears half-typed.
const TypedRow: React.FC<{
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
  at: number; // frame, relative to the cue's start, the row begins typing
}> = ({ label, value, tone, at }) => {
  const frame = useCurrentFrame();
  const elapsed = frame - at;
  if (elapsed < 0) return null;
  const FPC = 1.3;
  const labelChars = graphemes(label);
  const valueChars = graphemes(value);
  const labelShown = Math.max(
    0,
    Math.min(labelChars.length, Math.floor(elapsed / FPC)),
  );
  const valueElapsed = elapsed - labelChars.length * FPC;
  const valueShown = Math.max(
    0,
    Math.min(valueChars.length, Math.floor(valueElapsed / FPC)),
  );
  const rowIn = interpolate(elapsed, [0, 8], [0, 1], clamp);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 32,
        fontWeight: 700,
        padding: "9px 0",
        borderTop: "2px solid rgba(255,255,255,0.15)",
        opacity: rowIn,
        transform: `translateX(${interpolate(rowIn, [0, 1], [-24, 0])}px)`,
      }}
    >
      <span style={{ color: DIM }}>
        {labelChars.slice(0, labelShown).join("")}
      </span>
      <span
        style={{
          fontWeight: 900,
          color: toneColor(tone, "#fff"),
          whiteSpace: "nowrap",
        }}
      >
        {valueChars.slice(0, valueShown).join("")}
        {valueShown < valueChars.length && valueElapsed > 0 ? (
          <span style={{ color: brand.accent }}>▌</span>
        ) : null}
      </span>
    </div>
  );
};

const Card: React.FC<{
  card: CompareCue["cards"][number];
  slot: "a" | "b";
  rel: Rel;
}> = ({ card, slot, rel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, rel(card.atMs));
  const col = COL[slot];
  return (
    <div
      style={{
        position: "absolute",
        left: col.left,
        top: col.top,
        width: col.width,
        minHeight: COL_HEIGHT,
        padding: "20px 22px",
        borderRadius: 22,
        background: "rgba(11,31,61,0.85)",
        border: `3px solid ${brand.accent}`,
        fontFamily: FONT,
        color: "#fff",
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
      }}
    >
      <div
        style={{
          fontSize: 38,
          fontWeight: 900,
          color: brand.accent,
          marginBottom: 10,
          lineHeight: 1.15,
        }}
      >
        {card.title}
      </div>
      {card.rows.map((r) => (
        <TypedRow
          key={r.label}
          label={r.label}
          value={r.value}
          tone={r.tone}
          at={rel(r.atMs)}
        />
      ))}
    </div>
  );
};

export const ScenarioCompare: React.FC<{ cue: CompareCue; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const qP = cue.question ? pop(frame, fps, rel(cue.question.atMs)) : 0;
  return (
    <>
      <Card card={cue.cards[0]} slot="a" rel={rel} />
      <Card card={cue.cards[1]} slot="b" rel={rel} />
      {cue.question ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.left + 6,
            right: 1080 - SAFE.right,
            top: COL.b.top + COL_HEIGHT + 30,
            textAlign: "center",
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 900,
            color: brand.highlight,
            opacity: qP,
            transform: `translateY(${interpolate(qP, [0, 1], [30, 0])}px)`,
          }}
        >
          {cue.question.text}
        </div>
      ) : null}
    </>
  );
};

// Idle "A" / "B" placeholders: shown only while a compare cue exists
// somewhere in the reel but none is currently active (golden rule: never
// invented UI when the reel has nothing to compare).
export const IdlePlaceholders: React.FC = () => (
  <>
    {(["a", "b"] as const).map((slot) => (
      <div
        key={slot}
        style={{
          position: "absolute",
          left: COL[slot].left,
          top: COL[slot].top,
          width: COL[slot].width,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 6,
          color: brand.accent,
          opacity: 0.7,
        }}
      >
        {slot === "a" ? "A" : "B"}
      </div>
    ))}
  </>
);
