// "journey" map: an illustrated top-down map (pale sand land, brand-blue
// river, mint trees, contour rings, tiny houses) with ONE long S-curved road.
// The talk is a trip along it: the marker's place on the road is talk time
// (ROUTE length = LEAD_IN + SPEED * t), and the camera follows it, so the map
// slides under a marker that stays near (540, MARKER_Y) on screen, with a
// slight tilt towards the road's heading and a slow breathing zoom. Every
// hook, figure, cue, chapter and bank plants a flag on the road where the
// marker was when it started (World.tsx draws it all). Talk (backdrop) and
// Overlay (marker, cards) both read the same camera, so they always agree.
import {
  getLength,
  getPointAtLength,
  getTangentAtLength,
} from "@remotion/paths";
import { useEffect, useState } from "react";
import { useDelayRender } from "remotion";
import { brand } from "../../brand/theme";
import { reelFontReady } from "../../mortgage/style";

// ------------------------------------------------------------- palette

// Brand tints only (color-mix of theme tokens, no new colours).
const tint = (c: string, pct: number, base = "#ffffff") =>
  `color-mix(in srgb, ${c} ${pct}%, ${base})`;
export const alpha = (c: string, a: number) =>
  `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
export const SAND = tint(brand.accent, 13);
export const SAND_DEEP = tint(brand.accent, 26);
export const WATER = tint(brand.primary, 34);
export const WATER_LIGHT = tint(brand.primary, 16);
export const LEAF = tint(brand.good, 62, brand.navy);
export const LEAF_LIGHT = tint(brand.good, 70);
export const INK = brand.textOnCard; // navy text on the light map
export const GOLD = brand.highlight;

// ------------------------------------------------------------- the road

const SEG_H = 560; // world px between two bends
const SWING = [320, 760]; // the road's x at its bends
const SEGMENTS = 44; // ~26 000 px of road: > 8 minutes at SPEED
export const LEAD_IN = 900; // straight road behind the marker at t = 0

const buildRoute = (): string => {
  let d = `M 540 ${LEAD_IN} L 540 0`;
  let x = 540;
  for (let k = 0; k < SEGMENTS; k++) {
    const y = -k * SEG_H;
    const nx = SWING[k % 2];
    const ny = y - SEG_H;
    d += ` C ${x} ${y - SEG_H / 2} ${nx} ${ny + SEG_H / 2} ${nx} ${ny}`;
    x = nx;
  }
  return d;
};
export const ROUTE = buildRoute();
export const ROUTE_LENGTH = getLength(ROUTE);

// The road's x at a world y (smoothstep between bends; close to the cubic,
// only used to keep trees and houses off the road).
export const roadX = (y: number): number => {
  if (y >= 0) return 540;
  const k = Math.floor(-y / SEG_H);
  const s = (-y - k * SEG_H) / SEG_H;
  const from = k === 0 ? 540 : SWING[(k - 1) % 2];
  const to = SWING[k % 2];
  return from + (to - from) * (s * s * (3 - 2 * s));
};

// ------------------------------------------------------------- camera

export const MARKER_Y = 1100; // where the marker's tip sits on screen
const FOLLOW = 0.4; // how much of the road's swing the marker shows on screen
const SPEED = 52; // world px per second of talk

export type Camera = {
  len: number; // marker's length along ROUTE
  px: number; // marker, world
  py: number;
  mx: number; // marker, screen
  my: number;
  rot: number; // map tilt, degrees
  zoom: number;
  heading: number; // road heading, degrees from straight up
};

export const lengthAt = (t: number, fps: number) =>
  Math.min(ROUTE_LENGTH - 1, Math.max(0, LEAD_IN + (SPEED / fps) * t));

export const cameraAt = (t: number, fps: number): Camera => {
  const len = lengthAt(t, fps);
  const p = getPointAtLength(ROUTE, len) ?? { x: 540, y: 0 };
  const tan = getTangentAtLength(ROUTE, len) ?? { x: 0, y: -1 };
  const heading = (Math.atan2(tan.x, -tan.y) * 180) / Math.PI;
  return {
    len,
    px: p.x,
    py: p.y,
    mx: 540 + (p.x - 540) * FOLLOW,
    my: MARKER_Y,
    rot: -heading * 0.14,
    zoom: 1.03 + 0.025 * Math.sin(t / 95),
    heading,
  };
};

export const worldTransform = (c: Camera) =>
  `translate(${c.mx} ${c.my}) rotate(${c.rot}) scale(${c.zoom}) translate(${-c.px} ${-c.py})`;

// ------------------------------------------------------------- font

// fitText needs Be Vietnam Pro loaded: false until it is, frame held meanwhile.
export const useFontReady = (label: string): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(label));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return ready;
};
