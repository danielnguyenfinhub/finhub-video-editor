// Every element in src/elements, one after another (3 s each) at 1080×1920,
// each labelled with its name; the first two are joined by the custom star
// wipe. Open "ElementCatalog" in the Studio ("Elements" folder) to see them.
// Sample text stays clear of RG 234 terms like any on-screen copy.
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import type React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { brand } from "../brand/theme";
import { FONT, LOGO, useReelFont } from "../mortgage/style";
import { AudioRing } from "./AudioRing";
import { BeforeAfter } from "./BeforeAfter";
import { CaptionBox } from "./CaptionBox";
import { CountdownRing } from "./CountdownRing";
import { FocusCrop } from "./FocusCrop";
import { FrequencyBars } from "./FrequencyBars";
import { ImageCarousel } from "./ImageCarousel";
import { KenBurns } from "./KenBurns";
import { LineGraph } from "./LineGraph";
import { LineReveal } from "./LineReveal";
import { MirroredSpectrum } from "./MirroredSpectrum";
import { NeonTitle } from "./NeonTitle";
import { NewsTicker } from "./NewsTicker";
import { NoiseField } from "./NoiseField";
import { NotificationStack } from "./NotificationStack";
import { Oscilloscope } from "./Oscilloscope";
import { Particles } from "./Particles";
import { ProgressBar } from "./ProgressBar";
import { PulseBadge } from "./PulseBadge";
import { QuoteCard } from "./QuoteCard";
import { ReviewStamp } from "./ReviewStamp";
import { RgbSplitText } from "./RgbSplitText";
import { SlashIntro } from "./SlashIntro";
import { SocialHandle } from "./SocialHandle";
import { StaggerTitle } from "./StaggerTitle";
import { starWipe } from "./starWipe";
import { TextMatte } from "./TextMatte";
import { TiltFrame } from "./TiltFrame";
import { Typewriter } from "./Typewriter";
import { VideoGrid } from "./VideoGrid";
import { WordHighlight } from "./WordHighlight";

const W = 1080;
const H = 1920;
const SCENE = 90;
const WIPE = 20;
const CLIP = staticFile("sample-clip.mp4");

const Clip: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <OffthreadVideo
    src={CLIP}
    muted
    style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
  />
);

const Centre: React.FC<{ children: React.ReactNode; bg?: string }> = ({
  children,
  bg = brand.background,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 60,
    }}
  >
    {children}
  </AbsoluteFill>
);

// Synthetic words for the CaptionBox scene, Whisper-style (leading spaces).
const SAMPLE_WORDS = " Lãi suất cố định giữ khoản trả hàng tháng ổn định"
  .split(/(?= )/)
  .map((text, i) => ({
    text,
    startMs: 200 + i * 240,
    endMs: 420 + i * 240,
    timestampMs: null,
    confidence: null,
  }));

// Module-level so ImageCarousel doesn't reload its images every render.
const CAROUSEL_IMAGES = [
  "sample-frame.png",
  "brand/finhub-logo.png",
  "sample-frame.png",
  "brand/finhub-logo.png",
  "sample-frame.png",
].map((p) => staticFile(p));

// Illustrative figures only (labelled as such on screen), not real rates.
const SAMPLE_TREND = [
  { label: "Q1", value: 4.35 },
  { label: "Q2", value: 4.35 },
  { label: "Q3", value: 4.1 },
  { label: "Q4", value: 3.85 },
  { label: "Q5", value: 3.6 },
];

const SCENES: [string, React.ReactNode][] = [
  ["Typewriter", <Centre key="t" bg="#F6F1E4"><Typewriter text="Lãi suất cố định hay thả nổi? Fixed or variable?" /></Centre>],
  ["LineReveal", <Centre key="l" bg="#F6F1E4"><LineReveal lines={["Chi phí thật sự", "của khoản vay", "The real cost"]} /></Centre>],
  ["StaggerTitle", <Centre key="s"><StaggerTitle text="Nguyễn Thị Hằng" /></Centre>],
  ["NeonTitle", <Centre key="n" bg="#070B14"><NeonTitle text="Lãi suất 2026" /></Centre>],
  ["RgbSplitText", <Centre key="r" bg="#070B14"><RgbSplitText text="Cảnh báo" frequency={0.5} /></Centre>],
  ["CountdownRing", <Centre key="c"><CountdownRing seconds={3} /></Centre>],
  ["LineGraph", <Centre key="lg"><LineGraph data={SAMPLE_TREND} title="Lãi suất · ví dụ minh hoạ" unit="%" /></Centre>],
  ["SlashIntro", <SlashIntro key="si" top="PHẦN 2" bottom="Vay mua nhà lần đầu" />],
  ["KenBurns", <KenBurns key="k" src={staticFile("sample-frame.png")} />],
  ["TiltFrame", <TiltFrame key="tf"><Clip /></TiltFrame>],
  ["ImageCarousel", <AbsoluteFill key="ic" style={{ backgroundColor: brand.background }}><ImageCarousel images={CAROUSEL_IMAGES} holdFrames={30} /></AbsoluteFill>],
  ["FocusCrop", <FocusCrop key="f" src={CLIP} sourceWidth={960} sourceHeight={540} focus={[{ frame: 0, x: 0.25, y: 0.5 }, { frame: 80, x: 0.75, y: 0.5 }]} />],
  ["BeforeAfter", <BeforeAfter key="b" before={<Clip style={{ filter: "grayscale(1)" }} />} after={<Clip />} />],
  ["TextMatte", <TextMatte key="tm" text="VAY NHÀ"><KenBurns src={staticFile("sample-frame.png")} /></TextMatte>],
  ["VideoGrid", <VideoGrid key="vg" clips={[{ src: CLIP, title: "Daniel" }, { src: CLIP }, { src: CLIP }, { src: CLIP, title: "Khách" }]} />],
  ["NewsTicker", <AbsoluteFill key="nt"><Clip /><NewsTicker items={["RBA giữ nguyên lãi suất", "Ví dụ minh hoạ, không phải đề nghị"]} /></AbsoluteFill>],
  ["CaptionBox", <AbsoluteFill key="cb"><Clip /><CaptionBox captions={SAMPLE_WORDS} /></AbsoluteFill>],
  ["SocialHandle", <Centre key="sh"><SocialHandle platform="facebook" handle="@your-page" /></Centre>],
  ["ProgressBar + ReviewStamp", <AbsoluteFill key="pr"><Clip /><ProgressBar /><ReviewStamp /></AbsoluteFill>],
  ["Particles", <AbsoluteFill key="p" style={{ backgroundColor: brand.background }}><Particles /></AbsoluteFill>],
  ["PulseBadge", <Centre key="pb"><PulseBadge text="MỚI · NEW" every={30} /></Centre>],
  ["AudioRing", <Centre key="a"><AudioRing audioSrc={staticFile("sample-tone.wav")} imageSrc={LOGO} /></Centre>],
  ["FrequencyBars", <Centre key="fq"><FrequencyBars audioSrc={staticFile("sample-tone.wav")} playAudio /></Centre>],
  ["Oscilloscope", <Centre key="os" bg="#F6F1E4"><Oscilloscope src={staticFile("sample-tone.wav")} playAudio /></Centre>],
  ["MirroredSpectrum", <Centre key="ms"><MirroredSpectrum src={staticFile("sample-tone.wav")} color="#fff" /></Centre>],
  ["NoiseField", <NoiseField key="nf" />],
  ["WordHighlight", <Centre key="wh"><WordHighlight text="Lãi suất *cố định* của bạn sắp hết hạn?" /></Centre>],
  ["NotificationStack", <Centre key="ns"><NotificationStack appName="Nhắc nhở · Reminder" items={[{ title: "Sắp hết kỳ cố định", body: "Ví dụ minh hoạ · sample alert" }, { title: "Rate review", body: "Time to check your loan still suits you" }, { title: "Đặt lịch trò chuyện", body: "So sánh lựa chọn trước khi chuyển" }]} /></Centre>],
  ["QuoteCard (draft)", <Centre key="qc"><QuoteCard quote="Sample review — replace with a genuine client review, word for word." attribution="Client name" context="Source and date of review" consentConfirmed={false} /></Centre>],
];

const Label: React.FC<{ name: string }> = ({ name }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 150,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 40,
      fontWeight: 800,
      color: "#fff",
      textShadow: "0 2px 8px #000",
    }}
  >
    {name}
  </div>
);

export const ELEMENT_CATALOG_FRAMES = SCENES.length * SCENE - WIPE;

export const ElementCatalog: React.FC = () => {
  useReelFont();
  return (
    <TransitionSeries>
      {SCENES.map(([name, node], i) => [
        <TransitionSeries.Sequence key={name} durationInFrames={SCENE}>
          {node}
          <Label name={name} />
        </TransitionSeries.Sequence>,
        i === 0 ? (
          <TransitionSeries.Transition
            key="wipe"
            presentation={starWipe({ width: W, height: H })}
            timing={linearTiming({ durationInFrames: WIPE })}
          />
        ) : null,
      ])}
    </TransitionSeries>
  );
};
