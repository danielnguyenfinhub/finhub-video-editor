// A design is everything a MortgageReel video looks like; the core (this
// folder) keeps what it must do: cuts, pacing, audio, RG 234, compliance card.
// Designs live in src/designs/<id>/ and are picked by edit.json `design`.
import type { TransitionPresentation } from "@remotion/transitions";
import type React from "react";
import type { Look, Reel } from "./schema";
import type { Segment, TransitionKind } from "./timeline";

export type CoverProps = {
  src: string;
  foreground?: string; // undefined when edit.json "background" is "room"
  coverFrame: number;
  title: string;
  subtitle: string;
  keywords: string[];
};
// Must render <PacedVideo seg src look foreground />, which owns pacing and
// audio (and, with foreground, the brand backdrop behind the cut-out).
export type TalkProps = {
  seg: Segment;
  index: number;
  src: string;
  look?: Look;
  foreground?: string; // the cut-out; undefined when edit.json "background" is "room"
  // The design's Behind layer, already on the talk timeline: render it
  // between the backdrop and PacedVideo so charts sit behind Daniel.
  behind?: React.ReactNode;
};
// Frame 0 is the first word of the talk.
// src: the source.mp4 URL, for designs that draw Daniel's voice (waveforms).
export type OverlayProps = {
  reel: Reel;
  keywords: string[];
  talkFrames: number;
  src: string;
};

export type Design = {
  id: string;
  Cover: React.FC<CoverProps>; // COVER_FRAMES long, crossfades into the talk
  Talk: React.FC<TalkProps>; // frames one paced segment
  Overlay: React.FC<OverlayProps>; // captions, hook, chapters, cues, sfx
  // Charts and figures, drawn BEHIND Daniel's cut-out (golden rule: a chart
  // never covers his face). Same props and frame 0 as Overlay.
  Behind?: React.FC<OverlayProps>;
  Outro: React.FC<{ question: string }>; // CTA + contact
  chapterTransition: (
    kind: TransitionKind,
  ) => TransitionPresentation<Record<string, unknown>>;
  copy: string[]; // every hard-coded on-screen string, RG 234-scanned
  // edit.json visuals (drawn by the core, Visuals.tsx): border, radius, mask
  // for the pip and overlay frames. Left out: a plain white-edged card.
  visualFrame?: React.CSSProperties;
};
