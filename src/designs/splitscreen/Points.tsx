// `points` as a stack of mini sliders: each row starts steel (BEFORE) and is
// swept open to navy by its own gold handle as it is said, top-down in
// spoken order; the current row keeps its handle and a gold rim.
import { fitTextOnNLines } from "@remotion/layout-utils";
import { spring } from "remotion";
import { brand } from "../../brand/theme";
import { DIM, FONT, pop } from "../../mortgage/style";
import type { CueOf } from "../classic/Infographics";
import type { Beat, Layers } from "./Cues";
import { GOLD, H, INNER, W } from "./Slider";

const ROW_GAP = 12;

export const pointsLayers = (cue: CueOf<"points">, b: Beat): Layers => {
  const { lf, fps, rel } = b;
  const n = cue.items.length;
  const top = INNER + 78;
  const room = H - top - 22;
  const rowH = Math.min(96, (room - ROW_GAP * (n - 1)) / n);
  // A short list sits in the middle of the room under the title.
  const first = top + (room - n * rowH - (n - 1) * ROW_GAP) / 2;
  const starts = cue.items.map((it) => rel(it.atMs));
  const head = pop(lf, fps, 2);
  const rowW = W - 60;
  return {
    over: (
      <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: INNER,
            textAlign: "center",
            fontSize: fitTextOnNLines({
              text: cue.title,
              maxLines: 1,
              maxBoxWidth: W - 80,
              fontFamily: FONT,
              fontWeight: 900,
              maxFontSize: 44,
            }).fontSize,
            fontWeight: 900,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            color: "#ffffff",
            opacity: head,
          }}
        >
          {cue.title}
        </div>
        {cue.items.map((it, i) => {
          const at = starts[i];
          const said = lf >= at;
          const current = said && (i === n - 1 || lf < starts[i + 1]);
          const p = said
            ? spring({
                frame: lf - at,
                fps,
                config: { damping: 16, stiffness: 120, mass: 0.8 },
              })
            : 0;
          const text = fitTextOnNLines({
            text: it.text,
            maxLines: 2,
            maxBoxWidth: rowW - rowH - 70,
            fontFamily: FONT,
            fontWeight: 800,
            maxFontSize: 36,
          }).fontSize;
          const edge = rowW * Math.min(1, p);
          return (
            <div
              key={it.atMs}
              style={{
                position: "absolute",
                left: 30,
                top: first + i * (rowH + ROW_GAP),
                width: rowW,
                height: rowH,
                borderRadius: rowH / 2,
                overflow: "hidden",
                background: "rgba(91,107,128,0.32)",
                border: `2px solid ${current ? GOLD : "rgba(255,255,255,0.14)"}`,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(90deg, ${brand.background}, rgba(0,100,168,0.55))`,
                  clipPath: `inset(0 ${rowW - edge}px 0 0)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: 10,
                  width: rowH - 24,
                  height: rowH - 24,
                  borderRadius: "50%",
                  background: said ? GOLD : "rgba(255,255,255,0.08)",
                  color: said ? brand.navy : "rgba(255,255,255,0.45)",
                  fontSize: 30,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: rowH + 8,
                  right: 40,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  fontSize: text,
                  fontWeight: current ? 900 : 800,
                  lineHeight: 1.22,
                  color: current ? "#ffffff" : DIM,
                  clipPath: `inset(0 ${Math.max(0, rowW - edge - (rowH + 8))}px 0 0)`,
                }}
              >
                {it.text}
              </div>
              {said && (p < 0.98 || current) ? (
                <div
                  style={{
                    position: "absolute",
                    left: Math.min(edge, rowW - 30) - 13,
                    top: (rowH - 4) / 2 - 13,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: brand.navy,
                    border: `4px solid ${GOLD}`,
                    boxShadow: `0 0 14px ${GOLD}`,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    ),
  };
};
