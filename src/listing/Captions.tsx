// Word-synced captions in the voice's language (the FinHub sentence-aware
// pager, src/mortgage/captionPages.ts) with the other language's line under
// them for the whole scene. Both sit at the bottom of the 4:5 text band.
import type { Caption } from "@remotion/captions";
import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { captionPages } from "../mortgage/captionPages";
import type { Beat } from "./data";
import { LEAD_FRAMES } from "./data";
import { C, SAFE, SANS, SHADOW } from "./theme";

const HOLD_MS = 350; // a page stays this long after its last word

export const Captions: React.FC<{ words: Caption[]; beats: Beat[] }> = ({
  words,
  beats,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(
    () =>
      captionPages({
        captions: words,
        combineWithinMs: 1300,
        breakOnSilenceAfterMs: 350,
      }),
    [words],
  );
  const ms = ((frame - LEAD_FRAMES) * 1000) / fps;
  const page = pages.find(
    (p, i) =>
      ms >= p.startMs &&
      ms <
        Math.min(
          p.startMs + p.durationMs + HOLD_MS,
          pages[i + 1]?.startMs ?? Infinity,
        ),
  );
  // The scene's other-language line, from its voice start until the next scene's.
  const beat = [...beats].reverse().find((b) => ms >= b.fromMs - 150);
  const next = beat ? beats[beats.indexOf(beat) + 1] : undefined;
  const subtitle =
    beat && ms < (next ? next.fromMs - 150 : beat.toMs + 1500)
      ? beat.subtitle
      : null;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        width: SAFE.right - SAFE.left,
        bottom: 1920 - SAFE.bottom,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        textAlign: "center",
        fontFamily: SANS,
      }}
    >
      {page ? (
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            lineHeight: 1.32,
            textShadow: SHADOW,
          }}
        >
          {page.tokens.map((t, i) => {
            const said = ms >= t.fromMs;
            const now = said && ms < t.toMs;
            return (
              <span
                key={`${t.fromMs}-${i}`}
                style={{
                  color: now ? C.goldLight : C.cream,
                  opacity: said ? 1 : 0.55,
                }}
              >
                {t.text}
              </span>
            );
          })}
        </div>
      ) : null}
      {subtitle ? (
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            lineHeight: 1.35,
            color: C.cream,
            background: "rgba(8,12,22,0.62)",
            padding: "8px 18px",
            borderRadius: 12,
            borderLeft: `4px solid ${C.gold}`,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};
