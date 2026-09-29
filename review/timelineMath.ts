// Pure maths for the review page's timeline and history, import-free so
// review/check-timeline.mjs can run it with Node's type stripping.
// The zoom-toward-the-cursor formula, the ruler interval picker, the edge
// auto-scroll and the fit-to-window zoom are ideas from openvideodev's
// react-video-editor (timeline.tsx, ruler.tsx, use-edge-auto-scroll.ts),
// rewritten here; its snapping and undo live in closed packages, so those two
// are written from scratch.

export const BASE_PX_PER_SEC = 24; // at zoom 1
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 8;
export const ZOOM_STEP = 1.25; // one press of the zoom buttons or Ctrl +/-
export const SNAP_PX = 8; // an edge this close (in screen pixels) pulls a dragged block onto it
export const EDGE_PX = 48; // dragging within this of the track's edge scrolls it
export const EDGE_MAX_SPEED = 18; // px per animation frame, at the very edge

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// The moment under the cursor stays under the cursor while the zoom changes:
// (scroll + cursor) / zoom is the same before and after.
export const zoomAtCursor = (zoom: number, scrollLeft: number, cursorX: number, nextZoom: number) => {
  const z = clampZoom(nextZoom);
  return { zoom: z, scrollLeft: Math.max(0, ((scrollLeft + cursorX) * z) / zoom - cursorX) };
};

// Ctrl+wheel: a trackpad pinch sends small deltas, a mouse wheel large ones.
export const wheelFactor = (deltaY: number) => (Math.abs(deltaY) < 50 ? 0.99 : 0.998) ** deltaY;

// The zoom at which the whole talk just fits the visible track.
export const fitZoom = (talkFrames: number, fps: number, viewportPx: number) =>
  talkFrames <= 0 || viewportPx <= 0
    ? 1
    : clampZoom(viewportPx / ((talkFrames / fps) * BASE_PX_PER_SEC));

// Seconds between ruler labels: the first step that leaves at least 64 px.
const RULER_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
export const rulerStep = (pxPerSecond: number) =>
  RULER_STEPS.find((s) => s * pxPerSecond >= 64) ?? RULER_STEPS[RULER_STEPS.length - 1];

export const rulerLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// A dragged block's start (frames) snapped so its start or its end lands on
// the nearest edge within `threshold` frames. `guide` is the edge it landed on.
export const snapStart = (start: number, length: number, edges: number[], threshold: number) => {
  let best: { frame: number; guide: number; d: number } | null = null;
  for (const e of edges)
    for (const [pos, offset] of [[start, 0], [start + length, length]] as const) {
      const d = Math.abs(pos - e);
      if (d <= threshold && (!best || d < best.d)) best = { frame: e - offset, guide: e, d };
    }
  return best ? { frame: best.frame, guide: best.guide } : { frame: start, guide: null };
};

// px per animation frame to scroll while dragging near the track's edges:
// faster the closer to (or past) the edge, 0 in the middle.
export const edgeSpeed = (x: number, left: number, right: number) => {
  const nearLeft = (left + EDGE_PX - x) / EDGE_PX;
  if (nearLeft > 0) return -Math.round(EDGE_MAX_SPEED * Math.min(1, nearLeft)) || 0;
  const nearRight = (x - (right - EDGE_PX)) / EDGE_PX;
  if (nearRight > 0) return Math.round(EDGE_MAX_SPEED * Math.min(1, nearRight));
  return 0;
};

// Undo/redo over whole-document snapshots: one entry per commit, so a drag
// (one commit on drop) or a select change is one Ctrl+Z.
export type History<T> = { past: T[]; present: T; future: T[] };
export const HISTORY_LIMIT = 100;

export const startHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

export const commit = <T>(h: History<T>, next: T, limit = HISTORY_LIMIT): History<T> =>
  JSON.stringify(next) === JSON.stringify(h.present)
    ? h
    : { past: [...h.past, h.present].slice(-limit), present: next, future: [] };

export const undo = <T>(h: History<T>): History<T> =>
  h.past.length === 0
    ? h
    : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };

export const redo = <T>(h: History<T>): History<T> =>
  h.future.length === 0
    ? h
    : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
