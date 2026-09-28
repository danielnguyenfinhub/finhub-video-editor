// The caption console: the Vietnamese page (keywords gold) and the English
// line from edit.json subtitles under it.
import type React from "react";
import { PagedCaptions } from "../../../mortgage/PagedCaptions";
import type { Reel } from "../../../mortgage/schema";
import { FONT, emphasised } from "../../../mortgage/style";
import { YT_HEIGHT } from "../../frame";
import { CONSOLE, P } from "./layout";
import { clampLines } from "./Parts";

export const Console: React.FC<{
  reel: Reel;
  keywords: string[];
  at: (ms: number) => number;
  f: number;
}> = ({ reel, keywords, at, f }) => {
  const en = (reel.edit.subtitles ?? []).find(
    (s) => at(s.fromMs) <= f && f < at(s.toMs),
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CONSOLE.x + 22,
          top: CONSOLE.y + 26,
          width: 5,
          height: 46,
          borderRadius: 3,
          background: P.gold,
        }}
      />
      <PagedCaptions
        reel={reel}
        render={(page) => {
          const hit = emphasised(
            page.tokens.map((t) => t.text),
            keywords,
          );
          const chars = page.tokens.map((t) => t.text).join("").length;
          return (
            <div
              style={{
                position: "absolute",
                left: CONSOLE.x + 48,
                width: CONSOLE.w - 88,
                top: CONSOLE.y + 16,
                fontFamily: FONT,
                fontSize: chars > 84 ? Math.round((52 * 84) / chars) : 52,
                fontWeight: 900,
                lineHeight: 1.16,
                color: P.text,
              }}
            >
              {page.tokens.map((t, i) => (
                <span
                  key={t.fromMs}
                  style={{ color: hit.has(i) ? P.gold : P.text }}
                >
                  {t.text}
                </span>
              ))}
            </div>
          );
        }}
      />
      {en ? (
        <div
          style={{
            position: "absolute",
            left: CONSOLE.x + 48,
            width: CONSOLE.w - 88,
            bottom: YT_HEIGHT - CONSOLE.y - CONSOLE.h + 14,
            fontFamily: FONT,
            fontSize: 27,
            fontWeight: 600,
            lineHeight: 1.25,
            color: P.dim,
            ...clampLines(2),
          }}
        >
          {en.text}
        </div>
      ) : null}
    </>
  );
};
