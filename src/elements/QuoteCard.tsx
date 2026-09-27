// A client review, quoted word for word: amber quote mark, the quote, then who
// said it and where. Until `consentConfirmed` is true (the client agreed to
// public use) it carries a DRAFT watermark and a "do not publish" line, so an
// unconsented review can't pass for a finished frame. No default copy: the
// quote must be a genuine review. In a reel its strings go through the RG 234
// check (onScreenCopy in src/mortgage/schema.ts).
// Design concept from reactvideoeditor/remotion-templates' quote card (MIT).
import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand/theme";
import { SAFE } from "../mortgage/golden";
import { clamp, FONT } from "../mortgage/style";
import { ReviewStamp } from "./ReviewStamp";

export const QUOTE_DRAFT_NOTE = "DRAFT — client consent not confirmed. Do not publish.";

export const QuoteCard: React.FC<{
  quote: string;
  attribution: string; // e.g. first name + suburb, as the client agreed
  context?: string; // e.g. "Google review, Aug 2026"
  consentConfirmed: boolean;
}> = ({ quote, attribution, context, consentConfirmed }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const mark = interpolate(frame, [0, 15], [0, 1], clamp);
  const body = interpolate(frame, [10, 30], [0, 1], clamp);
  const attr = interpolate(frame, [30, 45], [0, 1], clamp);
  return (
    <>
      <div style={{ maxWidth: SAFE.right - SAFE.left, textAlign: "center", fontFamily: FONT }}>
        <div style={{ color: brand.accent, fontSize: 260, fontWeight: 900, lineHeight: 0.8, opacity: mark }}>{"“"}</div>
        <p style={{ margin: 0, color: brand.text, fontSize: 58, fontWeight: 600, fontStyle: "italic", lineHeight: 1.45, opacity: body }}>
          {quote.normalize("NFC")}
        </p>
        <div style={{ marginTop: 50, opacity: attr, transform: `translateX(${(1 - attr) * 60}px)` }}>
          <div style={{ color: brand.highlight, fontSize: 40, fontWeight: 800 }}>— {attribution.normalize("NFC")}</div>
          {context ? <div style={{ color: brand.textDim, fontSize: 30, fontWeight: 600, marginTop: 8 }}>{context.normalize("NFC")}</div> : null}
        </div>
      </div>
      {consentConfirmed ? null : (
        <>
          <ReviewStamp text="NHÁP · DRAFT" />
          <div
            style={{
              position: "absolute",
              left: SAFE.left,
              right: width - SAFE.right,
              top: SAFE.bottom - 60,
              textAlign: "center",
              color: brand.bad,
              fontFamily: FONT,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {QUOTE_DRAFT_NOTE}
          </div>
        </>
      )}
    </>
  );
};
