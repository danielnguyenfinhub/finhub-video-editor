import {fade} from "@remotion/transitions/fade";
import {flip} from "@remotion/transitions/flip";
import {slide} from "@remotion/transitions/slide";
import {emberBurn} from "../elements/remocn/ember-burn";
import {focusPull} from "../elements/remocn/focus-pull";
import {pushThrough} from "../elements/remocn/push-through";
import {whipPan} from "../elements/remocn/whip-pan";
import {zoomBlur as zoomBlurCss} from "../elements/remocn/zoom-blur";
import {bookFlip} from "@remotion/transitions/book-flip";
import {crosswarp} from "@remotion/transitions/crosswarp";
import {dissolve} from "@remotion/transitions/dissolve";
import {ripple} from "@remotion/transitions/ripple";
import {swap} from "@remotion/transitions/swap";
import {zoomBlur} from "@remotion/transitions/zoom-blur";
import {zoomInOut} from "@remotion/transitions/zoom-in-out";
import {blurSlide, crossZoom, dreamyZoom, filmBurn, linearBlur} from "@remotion/transitions";
import type {HtmlInCanvasShader, TransitionPresentation} from "@remotion/transitions";
import {makeHtmlInCanvasPresentation} from "@remotion/transitions";
import {HtmlInCanvas} from "remotion";

// @remotion/transitions' makeHtmlInCanvasPresentation() builds a custom
// <TransitionSeries.Transition> presentation out of a raw canvas shader
// (drawImage() + arbitrary 2D compositing per frame), rather than
// interpolating CSS like fade()/slide()/wipe() do. This needs the same
// browser-level HTML-in-canvas support as the CoreMediaScene/HtmlInCanvas
// capability check (Chrome 149+), so -- exactly like that scene -- it's
// only used when HtmlInCanvas.isSupported() confirms the browser can do it,
// falling back to a CSS look (CSS_FALLBACK below) otherwise rather than throwing mid-render.
// It's a canvas-drawn circular reveal -- the same look as the built-in,
// CSS-based iris() from @remotion/transitions/iris, which FullReel uses and
// which needs no HtmlInCanvas support. This one exists to show how a custom
// presentation is authored.
const circleRevealShader: HtmlInCanvasShader<Record<string, never>> = (canvas) => {
  const ctx = canvas.getContext("2d")!;
  return {
    clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
    cleanup: () => {},
    draw: ({prevImage, nextImage, width, height, time}) => {
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      if (prevImage) {
        ctx.drawImage(prevImage, 0, 0, width, height);
      }
      if (nextImage) {
        const maxRadius = Math.hypot(width, height) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, maxRadius * time, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(nextImage, 0, 0, width, height);
        ctx.restore();
      }
    },
  };
};

const circleReveal = makeHtmlInCanvasPresentation(circleRevealShader);

// @remotion/transitions ships a whole family of *other* built-in
// presentations beyond fade()/slide()/wipe(): bookFlip, crossZoom,
// crosswarp, dissolve, dreamyZoom, filmBurn, linearBlur, ripple, swap,
// zoomBlur, zoomInOut and blurSlide. Every one of them is ALSO built with
// makeHtmlInCanvasPresentation() internally (see each's source under
// packages/transitions/src/presentations/), so they all need the exact
// same Chrome 149+ HTML-in-canvas support as the custom circle reveal above.
// Where it's missing, each falls back to the closest CSS-only look
// (transform/opacity/filter) in this one table: remocn ports in
// src/elements/remocn/, installed CSS presentations, fade() where nothing fits.
// Durations are the caller's timing, unchanged.
const CSS_FALLBACK = {
  circleReveal: () => fade(), // iris() matches but needs width/height
  bookFlip: () => flip(),
  crossZoom: () => pushThrough(),
  crosswarp: () => fade(),
  dissolve: () => fade(),
  dreamyZoom: () => zoomBlurCss({blur: 8}),
  filmBurn: () => emberBurn(),
  linearBlur: () => focusPull(),
  ripple: () => fade(),
  swap: () => slide(),
  zoomBlur: () => zoomBlurCss(),
  zoomInOut: () => zoomBlurCss({blur: 0}),
  blurSlide: () => whipPan(),
};

const orFallback = <TPassedProps extends Record<string, unknown>>(
  presentation: (props: TPassedProps) => TransitionPresentation<TPassedProps>,
  props: TPassedProps,
  name: keyof typeof CSS_FALLBACK,
) => (): TransitionPresentation<Record<string, unknown>> =>
  (HtmlInCanvas.isSupported() ? presentation(props) : CSS_FALLBACK[name]()) as TransitionPresentation<Record<string, unknown>>;

export const canvasCircleRevealOrFallback = orFallback(circleReveal, {}, "circleReveal");
export const bookFlipOrFallback = orFallback(bookFlip, {}, "bookFlip");
export const crossZoomOrFallback = orFallback(crossZoom, {}, "crossZoom");
export const crosswarpOrFallback = orFallback(crosswarp, {}, "crosswarp");
export const dissolveOrFallback = orFallback(dissolve, {}, "dissolve");
export const dreamyZoomOrFallback = orFallback(dreamyZoom, {}, "dreamyZoom");
export const filmBurnOrFallback = orFallback(filmBurn, {}, "filmBurn");
export const linearBlurOrFallback = orFallback(linearBlur, {}, "linearBlur");
export const rippleOrFallback = orFallback(ripple, {}, "ripple");
export const swapOrFallback = orFallback(swap, {}, "swap");
export const zoomBlurOrFallback = orFallback(zoomBlur, {}, "zoomBlur");
export const zoomInOutOrFallback = orFallback(zoomInOut, {}, "zoomInOut");
export const blurSlideOrFallback = orFallback(blurSlide, {}, "blurSlide");
