// The chatstory cover: an iMessage-style exchange over the paper backdrop —
// a tiny compliance label, the title as the grey question bubble, the
// subtitle as Daniel's blue reply, then typing dots — with his cut-out
// frozen at coverFrame, bottom right, and the FinHub logo top-right on white.
import type React from "react";
import type { CoverProps } from "../../mortgage/design";
import { SAFE } from "../../mortgage/golden";
import { CoverCutOut } from "../../mortgage/PacedVideo";
import { Backdrop } from "./Backdrop";
import { Bubble, Label, LogoBadge, TypingDots } from "./Bubbles";

export const Cover: React.FC<CoverProps> = ({
  src,
  coverFrame,
  title,
  subtitle,
}) => (
  <>
    <Backdrop />
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 300,
        top: SAFE.top,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      <Label text="CÂU HỎI MINH HOẠ" />
      <Bubble text={title} side="left" delay={8} fontSize={38} />
      <Bubble text={subtitle} side="right" delay={32} fontSize={38} />
      <TypingDots side="right" delay={52} />
    </div>
    {/* Daniel's cut-out fills ~60% of the frame height, bottom-anchored, so
        he reads large on the cover; the exchange bubbles sit above him. */}
    <div
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 730,
        height: 1152,
        overflow: "hidden",
      }}
    >
      <CoverCutOut
        src={src}
        trimBefore={coverFrame}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
    <LogoBadge />
  </>
);
