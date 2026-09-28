// "phoneapp" (Ứng dụng): the video plays as a walkthrough of a sleek, generic
// budgeting / home-loan app in Finance Hub colours. A phone sits on a navy →
// logo-blue gradient with soft blurred shapes; on its screen the hook drops in
// as a push notification and opens into a card, figures are widget cards with
// a filling ring, a named bank is a list row, points are a checklist ticked
// one by one, compare is two cards with "VS". Between beats the home screen
// shows a feed of what has been said. Captions sit under the phone on a
// frosted bar. Pure motion graphics: source.mp4's picture is never shown.
// Phone.tsx (look, device, parts), plan.ts (who owns the screen), Screens.tsx
// (home, hook, figures, banks, chips), Cues.tsx (checklist, compare),
// Chrome.tsx (captions, English line, sounds, cover).
import type React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";
import type { Design, OverlayProps, TalkProps } from "../../mortgage/design";
import { LogoMark } from "../../mortgage/LogoMark";
import { PacedVideo } from "../../mortgage/PacedVideo";
import { chapterTransition } from "../../mortgage/transitions";
import { MotionTrack } from "../classic/Cues";
import { Outro } from "../classic/Outro";
import { Captions, Cover, EnglishLine, Sounds } from "./Chrome";
import { CuePages, CueSfx } from "./Cues";
import { Backdrop, PAGE_TOP, Phone, useFontReady } from "./Phone";
import { isOwnCue, level, planOf, type Plan } from "./plan";
import { HomeScreen } from "./Home";
import { ChipLayer } from "./Chips";
import { ScreenItems, screenBusy } from "./Screens";

// No footage: the backdrop and the voice (foreground.webm is transparent).
const Talk: React.FC<TalkProps> = ({ seg, src, look, foreground, behind }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop t={seg.outFrom + frame} />
      {behind}
      <PacedVideo
        seg={seg}
        src={src}
        look={look}
        foreground={foreground}
        backdrop="none"
      />
    </AbsoluteFill>
  );
};

const PhoneLayer: React.FC<OverlayProps & { plan: Plan }> = ({
  reel,
  plan,
}) => {
  const frame = useCurrentFrame();
  const ready = useFontReady();
  if (!ready) return null;
  return (
    <Phone t={frame} dim={level(plan.panels, frame)}>
      <HomeScreen
        reel={reel}
        plan={plan}
        busy={screenBusy(plan, frame)}
        pushed={level(plan.own, frame, 14)}
      />
      <ScreenItems reel={reel} plan={plan} />
      <CuePages reel={reel} />
    </Phone>
  );
};

const Overlay: React.FC<OverlayProps> = (props) => {
  const { reel, keywords, talkFrames } = props;
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const plan = useMemo(() => planOf(reel, fps), [reel, fps]);
  const others = (reel.edit.cues ?? []).filter((c) => !isOwnCue(c));
  // Classic panels for the cue kinds this design doesn't draw, mounted only
  // while one is up (their film finish darkens the frame's corners).
  const panelUp = others.length > 0 && level(plan.panels, frame, 0) > 0;
  return (
    <>
      <PhoneLayer {...props} plan={plan} />
      <ChipLayer plan={plan} />
      {panelUp ? (
        <MotionTrack
          reel={{
            ...reel,
            edit: { ...reel.edit, cues: others, stats: [], chapters: [] },
          }}
          panelOffset={PAGE_TOP - 110}
          leak={false}
        />
      ) : null}
      <CueSfx reel={reel} />
      <Sounds reel={reel} />
      <Captions reel={reel} keywords={keywords} />
      <EnglishLine reel={reel} />
      <LogoMark talkFrames={talkFrames} />
    </>
  );
};

export const phoneapp: Design = {
  id: "phoneapp",
  Cover,
  Talk,
  Overlay,
  Outro,
  chapterTransition,
  copy: [
    "Finance Hub",
    "FH",
    "bây giờ",
    "Tổng quan",
    "Gần đây",
    "ĐANG NHẮC TỚI",
    "Đang nhắc tới",
    "So sánh",
    "VS",
    // classic Outro and MotionTrack strings shown through this design.
    "Daniel Nguyen",
    "Các ngân hàng Finance Hub làm việc cùng",
    "Điện thoại",
    "Email",
    "Website",
  ],
};
