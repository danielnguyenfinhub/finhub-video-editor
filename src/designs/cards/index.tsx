// "cards" (Thẻ thông tin): talking-head info cards. An airy cream stage of
// white rounded cards (small all-caps labels with tiny navy icons, values that
// build in: count-ups over a dot grid, before/after tiles, numbered rows)
// sits above Daniel, who talks from a large rounded video card in the lower
// part of the frame. Big cues (compare, trend, bars, long lists) take the
// whole frame: his card slides down and away, then comes back; his voice
// never stops (PacedVideo stays mounted). Small lowercase captions on a dark
// box sit between the stage and his card. FinHub navy and gold on cream.
// Plan.ts (what the stage shows), Stage.tsx, Scenes.tsx (split scenes),
// Big.tsx (full-screen scenes), Card.tsx (backdrop, his card, cover),
// Text.tsx (captions, chips), Kit.tsx, tokens.ts.
import type React from "react";
import type { Design, OverlayProps } from "../../mortgage/design";
import { LogoMark } from "../../mortgage/LogoMark";
import { chapterTransition } from "../../mortgage/transitions";
import { Outro } from "../classic/Outro";
import { useFontReady } from "../splitscreen/Slider";
import { POINTS_UNIT } from "../splitscreen/numbers";
import { Cover, Talk } from "./Card";
import { usePlan } from "./Plan";
import { StageLayer } from "./Stage";
import { Captions, Chips } from "./Text";
import { WORD } from "./tokens";

const Overlay: React.FC<OverlayProps> = ({ reel, keywords, talkFrames }) => {
  const plan = usePlan(reel);
  // The stage measures Be Vietnam Pro (fitText): wait for it.
  const ready = useFontReady();
  return (
    <>
      {ready ? <StageLayer reel={reel} plan={plan} /> : null}
      <Chips plan={plan} />
      <Captions reel={reel} keywords={keywords} plan={plan} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const cards: Design = {
  id: "cards",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    ...Object.values(WORD),
    POINTS_UNIT,
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
