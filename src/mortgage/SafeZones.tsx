// QC overlay for stills (`--props='{"slug":"…","safeZones":true}'`): the SAFE
// band and the FACE box from golden.ts drawn over the finished frame, so a
// reviewer sees the rule instead of computing it. Outside SAFE is shaded (only
// backdrop and Daniel may be there); FACE is outlined (no overlay inside it).
// Never part of a render: render-video.py doesn't pass the prop.
import type React from "react";
import { AbsoluteFill } from "remotion";
import { FACE, SAFE } from "./golden";

const WIDTH = 1080; // the reel frame (mortgageReelComposition)
const HEIGHT = 1920;

const label: React.CSSProperties = {
  position: "absolute",
  fontFamily: "monospace",
  fontSize: 22,
  fontWeight: 700,
  padding: "2px 8px",
  color: "#fff",
  background: "rgba(220, 38, 38, 0.85)",
};

export const SafeZones: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {/* Outside the SAFE band: platform chrome covers it. */}
    {[
      { top: 0, left: 0, width: WIDTH, height: SAFE.top },
      { top: SAFE.bottom, left: 0, width: WIDTH, height: HEIGHT - SAFE.bottom },
      { top: SAFE.top, left: 0, width: SAFE.left, height: SAFE.bottom - SAFE.top },
      { top: SAFE.top, left: SAFE.right, width: WIDTH - SAFE.right, height: SAFE.bottom - SAFE.top },
    ].map((r, i) => (
      <div key={i} style={{ position: "absolute", ...r, background: "rgba(220, 38, 38, 0.28)" }} />
    ))}
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        top: SAFE.top,
        width: SAFE.right - SAFE.left,
        height: SAFE.bottom - SAFE.top,
        border: "3px solid rgba(220, 38, 38, 0.9)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: FACE.left,
        top: FACE.top,
        width: FACE.right - FACE.left,
        height: FACE.bottom - FACE.top,
        border: "3px dashed rgba(59, 130, 246, 0.95)",
      }}
    />
    <div style={{ ...label, left: SAFE.left, top: SAFE.top - 30 }}>
      SAFE x {SAFE.left}–{SAFE.right} · y {SAFE.top}–{SAFE.bottom}
    </div>
    <div style={{ ...label, left: FACE.left, top: FACE.bottom + 6, background: "rgba(59, 130, 246, 0.9)" }}>
      FACE: no overlay inside
    </div>
  </AbsoluteFill>
);
