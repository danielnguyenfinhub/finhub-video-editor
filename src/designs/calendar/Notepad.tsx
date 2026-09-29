// `points` as a to-do notepad in front of the calendar: rows ticked in gold
// in spoken order, the current row under the highlighter.
import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FONT, clamp } from "../../mortgage/style";
import type { CueOf, Rel } from "../classic/Infographics";
import { GOLD, NAVY, PAPER, SLATE, fit, highlight, useOut } from "./Desk";

// ------------------------------------------------------------------ points

const PAD = { left: 104, width: 800, top: 700, height: 484 };

const Tick: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const d = interpolate(frame, [at, at + 8], [0, 1], clamp);
  return (
    <svg
      width={56}
      height={56}
      viewBox="0 0 56 56"
      style={{ position: "absolute", left: -2, top: -8 }}
    >
      <path
        d="M10 30 L24 44 L50 8"
        fill="none"
        stroke={GOLD}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={70}
        strokeDashoffset={70 * (1 - d)}
      />
    </svg>
  );
};

export const Notepad: React.FC<{ cue: CueOf<"points">; rel: Rel }> = ({
  cue,
  rel,
}) => {
  const frame = useCurrentFrame();
  const out = useOut();
  const p = interpolate(frame, [0, 10], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
  const starts = cue.items.map((it) => rel(it.atMs));
  const n = cue.items.length;
  const titleSize = fit(cue.title, PAD.width - 80, 1, 46);
  const rowH = Math.min(92, (PAD.height - 40 - titleSize * 1.6) / n);
  const textW = PAD.width - 80 - 76;
  return (
    <div
      style={{
        position: "absolute",
        left: PAD.left,
        width: PAD.width,
        top: PAD.top,
        height: PAD.height,
        boxSizing: "border-box",
        padding: "28px 40px 20px",
        background: `repeating-linear-gradient(180deg, transparent 0 ${rowH - 2}px, rgba(0,100,168,0.10) ${rowH - 2}px ${rowH}px), ${PAPER}`,
        backgroundPositionY: 28 + titleSize * 1.6,
        borderTop: `18px solid ${GOLD}`,
        borderRadius: "6px 6px 16px 16px",
        boxShadow: "0 30px 60px rgba(11,31,61,0.3)",
        fontFamily: FONT,
        color: NAVY,
        opacity: Math.min(p, out),
        transform: `translateY(${interpolate(p, [0, 1], [260, 0])}px) rotate(-1.2deg)`,
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: titleSize,
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          marginBottom: titleSize * 0.3,
        }}
      >
        {cue.title}
      </div>
      {cue.items.map((it, i) => {
        const said = frame >= starts[i];
        const current = said && (i === n - 1 || frame < starts[i + 1]);
        const inP = interpolate(frame - starts[i], [0, 6], [0, 1], clamp);
        return (
          <div
            key={it.atMs}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              height: rowH,
            }}
          >
            <div
              style={{
                position: "relative",
                flex: "0 0 48px",
                height: 48,
                borderRadius: 10,
                border: `5px solid ${said ? NAVY : "rgba(11,31,61,0.25)"}`,
                boxSizing: "border-box",
              }}
            >
              {said ? <Tick at={starts[i] + 2} /> : null}
            </div>
            {said ? (
              <div
                style={{
                  width: textW,
                  fontWeight: current ? 900 : 800,
                  fontSize: Math.min(40, fit(it.text, textW, 2, 40)),
                  lineHeight: 1.25,
                  color: current ? NAVY : SLATE,
                  opacity: inP,
                  transform: `translateX(${interpolate(inP, [0, 1], [-20, 0])}px)`,
                }}
              >
                <span style={highlight(current && frame - starts[i] > 3)}>
                  {it.text}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
