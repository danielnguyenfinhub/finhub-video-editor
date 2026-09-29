import "./index.css";
import { Composition, Folder, Still } from "remotion";
import { MyComposition } from "./Composition";
import {
  ShowcaseReel,
  calculateShowcaseReelMetadata,
  showcaseReelDefaultProps,
} from "./showcase/ShowcaseReel";
import {
  ExtendedReel,
  calculateExtendedReelMetadata,
  extendedReelDefaultProps,
  extendedReelSchema,
} from "./showcase/ExtendedReel";
import { SourceClipGenerator } from "./showcase/SourceClipGenerator";
import {
  FullReel,
  calculateFullReelMetadata,
  fullReelDefaultProps,
  fullReelSchema,
} from "./showcase/FullReel";
import {
  EFFECTS_CATALOG_DURATION,
  EffectsCatalogScene,
} from "./showcase/EffectsCatalogScene";
import { AbsoluteFill } from "remotion";
import {
  MortgageReel,
  calculateMortgageReelMetadata,
  mortgageReelComposition,
  mortgageReelSchema,
} from "./mortgage/MortgageReel";
import {
  ListingReel,
  calculateListingReelMetadata,
  listingReelComposition,
  listingReelSchema,
} from "./listing/ListingReel";
import {
  YouTubeReel,
  calculateYouTubeReelMetadata,
  youTubeReelComposition,
  youTubeReelSchema,
} from "./youtube/YouTubeReel";
import { gradientBg, palette } from "./showcase/palette";
import { poppins } from "./showcase/font";
import { BrandKitDemo } from "./brand/BrandKitDemo";
import { MetallicLogo3D, calculateMetallicLogo3DMetadata } from "./showcase/logo3d/MetallicLogo3D";
import { EmojiCatalog } from "./brand/EmojiCatalog";
import { ELEMENT_CATALOG_FRAMES, ElementCatalog } from "./elements/ElementCatalog";
import { ShapeToWords, shapeToWordsDefaultProps, shapeToWordsSchema } from "./showcase/shapetowords/ShapeToWords";
import {
  KineticMarketing,
  calculateKineticMarketingMetadata,
  kineticMarketingDefaultProps,
  kineticMarketingSchema,
} from "./showcase/kineticmarketing/KineticMarketing";
import { BarLineChart } from "./showcase/barlinechart/BarLineChart";
import { RealEstateInvesting } from "./showcase/realestateinvesting/RealEstateInvesting";
import { TravelRouteMap } from "./showcase/travelroutemap/TravelRouteMap";
import { BMS_DURATION, BmsCellBalancing } from "./showcase/bmscellbalancing/BmsCellBalancing";
import { BrandOverlay, brandOverlayDefaultProps, brandOverlaySchema, calculateBrandOverlayMetadata } from "./brand/BrandOverlay";
import { NewsHeadlineHighlight, newsHeadlineDefaultProps, newsHeadlineSchema } from "./showcase/newsheadline/NewsHeadlineHighlight";
import { CtaOverlay, ctaOverlayDefaultProps, ctaOverlaySchema } from "./showcase/ctaoverlay/CtaOverlay";

// A single-frame <Still> for a poster image (`npx remotion still Poster`).
// Deliberately static rather than reusing TitleScene's animated entrance —
// a <Still> always renders frame 0, where a spring()/interpolate() entrance
// hasn't started yet, so it would render blank.
const PosterStill: React.FC = () => (
  <AbsoluteFill
    style={{
      background: gradientBg,
      justifyContent: "center",
      alignItems: "center",
      fontFamily: poppins,
    }}
  >
    <div
      style={{
        fontSize: 110,
        fontWeight: 700,
        color: palette.text,
        letterSpacing: -2,
      }}
    >
      {fullReelDefaultProps.title}
    </div>
    <div style={{ fontSize: 36, color: palette.textDim, marginTop: 24 }}>
      {fullReelDefaultProps.subtitle}
    </div>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Folder name="FinanceHub">
        {/* The reusable talking-head template: one public/videos/<slug>/ per video. */}
        <Composition
          {...mortgageReelComposition}
          component={MortgageReel}
          schema={mortgageReelSchema}
          defaultProps={{ slug: "ty-do", reel: null }}
          calculateMetadata={calculateMortgageReelMetadata}
        />
      </Folder>
      <Folder name="YouTube">
        {/* 16:9 long-form explainers from a faceless video's edit.json + voice (src/youtube/). */}
        <Composition
          {...youTubeReelComposition}
          component={YouTubeReel}
          schema={youTubeReelSchema}
          defaultProps={{ slug: "rba-sept-2026", reel: null }}
          calculateMetadata={calculateYouTubeReelMetadata}
        />
      </Folder>
      <Folder name="GlobalRE">
        {/* Global RE listing videos: one public/listings/<slug>/ per listing (docs/agents/listing-video.md). */}
        <Composition
          {...listingReelComposition}
          component={ListingReel}
          schema={listingReelSchema}
          defaultProps={{ slug: "", lang: "vi" as const, data: null }}
          calculateMetadata={calculateListingReelMetadata}
        />
      </Folder>
      <Folder name="Brand">
        {/* The FinHub brand kit in src/brand/, with sample text. */}
        <Composition id="BrandKitDemo" component={BrandKitDemo} durationInFrames={300} fps={30} width={1920} height={1080} />
        <Composition id="EmojiCatalog" component={EmojiCatalog} durationInFrames={90} fps={30} width={1920} height={1080} />
        {/* Transparent logo + lower third for video editors; renders ProRes 4444 by default. */}
        <Composition id="BrandOverlay" component={BrandOverlay} schema={brandOverlaySchema} defaultProps={brandOverlayDefaultProps} calculateMetadata={calculateBrandOverlayMetadata} durationInFrames={240} fps={30} width={1920} height={1080} />
        <Composition id="BrandOverlayVertical" component={BrandOverlay} schema={brandOverlaySchema} defaultProps={brandOverlayDefaultProps} calculateMetadata={calculateBrandOverlayMetadata} durationInFrames={240} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Elements">
        <Composition id="ElementCatalog" component={ElementCatalog} durationInFrames={ELEMENT_CATALOG_FRAMES} fps={30} width={1080} height={1920} />
      </Folder>
      <Folder name="Reels">
        <Composition
          id="ShowcaseReel"
          component={ShowcaseReel}
          width={1280}
          height={720}
          fps={30}
          durationInFrames={300}
          defaultProps={showcaseReelDefaultProps}
          calculateMetadata={calculateShowcaseReelMetadata}
        />
        <Composition
          id="ExtendedReel"
          component={ExtendedReel}
          width={1280}
          height={720}
          fps={30}
          durationInFrames={1275}
          schema={extendedReelSchema}
          defaultProps={extendedReelDefaultProps}
          calculateMetadata={calculateExtendedReelMetadata}
        />
        <Composition
          id="FullReel"
          component={FullReel}
          width={1280}
          height={720}
          fps={30}
          durationInFrames={1860}
          schema={fullReelSchema}
          defaultProps={fullReelDefaultProps}
          calculateMetadata={calculateFullReelMetadata}
        />
      </Folder>
      <Folder name="Catalogs">
        {/* Every @remotion/effects effect on its own; FullReel plays it too. */}
        <Composition
          id="EffectsCatalog"
          component={EffectsCatalogScene}
          width={1280}
          height={720}
          fps={30}
          durationInFrames={EFFECTS_CATALOG_DURATION}
        />
      </Folder>
      <Folder name="Experiments">
        {/* Remotion prompt-gallery builds, used as swappable video hooks. */}
        <Composition id="ShapeToWords" component={ShapeToWords} schema={shapeToWordsSchema} defaultProps={shapeToWordsDefaultProps} durationInFrames={300} fps={30} width={1920} height={1080} />
        <Composition id="KineticMarketing" component={KineticMarketing} schema={kineticMarketingSchema} defaultProps={kineticMarketingDefaultProps} calculateMetadata={calculateKineticMarketingMetadata} durationInFrames={300} fps={30} width={1920} height={1080} />
        <Composition id="MetallicLogo3D" component={MetallicLogo3D} calculateMetadata={calculateMetallicLogo3DMetadata} durationInFrames={120} fps={30} width={1920} height={1080} />
        {/* From the Remotion prompt gallery; the prompt URL is at the top of each file. */}
        <Composition id="NewsHeadlineHighlight" component={NewsHeadlineHighlight} schema={newsHeadlineSchema} defaultProps={newsHeadlineDefaultProps} durationInFrames={150} fps={30} width={1920} height={1080} />
        {/* Transparent: render as ProRes 4444 with alpha (command in CtaOverlay.tsx). */}
        <Composition id="CtaOverlay" component={CtaOverlay} schema={ctaOverlaySchema} defaultProps={ctaOverlayDefaultProps} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="BarLineChart" component={BarLineChart} durationInFrames={120} fps={30} width={1920} height={1080} />
        <Composition id="RealEstateInvesting" component={RealEstateInvesting} durationInFrames={600} fps={30} width={1080} height={1920} />
        <Composition id="TravelRouteMap" component={TravelRouteMap} durationInFrames={450} fps={30} width={1920} height={1080} />
        <Composition id="BmsCellBalancing" component={BmsCellBalancing} durationInFrames={BMS_DURATION} fps={30} width={1280} height={720} />
      </Folder>
      <Folder name="Utilities">
        {/* Not part of any reel — a one-off source generator for
            public/sample-clip.mp4 (see scripts/generate-sample-media.mjs). */}
        <Composition
          id="SourceClipGenerator"
          component={SourceClipGenerator}
          width={960}
          height={540}
          fps={30}
          durationInFrames={90}
        />
        <Still id="Poster" component={PosterStill} width={1280} height={720} />
      </Folder>
    </>
  );
};
