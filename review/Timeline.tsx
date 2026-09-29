// Drag timeline for the review page: one lane each for chapters, stats, cues
// and B-roll visuals, drawn in output time (what the viewer sees, cuts
// removed). Click a block to select it and jump to it; drag it to move it (it
// snaps to the playhead and to other items' edges unless Alt is held, and the
// track scrolls when the drag nears its edge); drag on the ruler or an empty
// lane to scrub the playhead; Ctrl+wheel zooms toward the cursor and
// Shift+wheel scrolls sideways. A drop is mapped back to source time with
// toSrcMs, and the whole item (inner beats included) shifts by that delta.
// Keyboard nudging, deleting and undo are handled by the page (main.tsx),
// which owns the selection and the history.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent,
} from "react";
import {
  TALK_START_FRAME,
  toSrcMs,
  type Segment,
} from "../src/mortgage/timeline";
import {
  BASE_PX_PER_SEC,
  SNAP_PX,
  ZOOM_STEP,
  edgeSpeed,
  fitZoom,
  rulerLabel,
  rulerStep,
  snapStart,
  wheelFactor,
  zoomAtCursor,
} from "./timelineMath";

export type TimelineItem = {
  key: string;
  label: string;
  field: "chapters" | "stats" | "cues" | "visuals";
  index: number;
  atMs: number;
  endMs: number;
};

// What the page's keyboard shortcuts (Ctrl +, Ctrl -, Ctrl 0) call.
export type TimelineApi = {
  zoomBy: (factor: number) => void;
  fit: () => void;
};

const DRAG_THRESHOLD_PX = 3;
const LANES = [
  ["chapters", "Chapters"],
  ["stats", "Stats"],
  ["cues", "Cues"],
  ["visuals", "B-roll"],
] as const;

type Drag = {
  item: TimelineItem;
  startX: number;
  startScroll: number;
  clientX: number;
  alt: boolean;
};

export const Timeline = ({
  items,
  segments,
  talkFrames,
  fps,
  frame,
  toFrame,
  selectedKey,
  apiRef,
  onSelect,
  onSeek,
  onMove,
}: {
  items: TimelineItem[];
  segments: Segment[];
  talkFrames: number;
  fps: number;
  frame: number; // player frame
  toFrame: (srcMs: number) => number; // source ms -> talk frame
  selectedKey: string | null;
  apiRef: MutableRefObject<TimelineApi | null>;
  onSelect: (key: string | null) => void;
  onSeek: (playerFrame: number) => void;
  onMove: (item: TimelineItem, deltaMs: number) => void;
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const pendingScroll = useRef<number | null>(null);
  const [snapOn, setSnapOn] = useState(true);
  const [guide, setGuide] = useState<number | null>(null); // frame of the edge a drag snapped to
  const drag = useRef<Drag | null>(null);
  const scrubbing = useRef(false);
  const [dragView, setDragView] = useState<{ key: string; dx: number } | null>(null);

  const pxPerSec = BASE_PX_PER_SEC * zoom;
  const pxPerFrame = pxPerSec / fps;
  const playheadFrame = frame - TALK_START_FRAME;

  // Zoom, keeping the moment under `cursorX` (default: the middle of the
  // visible track) where it is. The scroll is applied after the wider track
  // has rendered.
  const applyZoom = useCallback((next: number, cursorX?: number) => {
    const el = scroller.current;
    if (!el) return;
    const r = zoomAtCursor(zoomRef.current, el.scrollLeft, cursorX ?? el.clientWidth / 2, next);
    if (r.zoom === zoomRef.current) return;
    zoomRef.current = r.zoom;
    pendingScroll.current = r.scrollLeft;
    setZoom(r.zoom);
  }, []);

  useLayoutEffect(() => {
    if (pendingScroll.current === null || !scroller.current) return;
    scroller.current.scrollLeft = pendingScroll.current;
    pendingScroll.current = null;
  }, [zoom]);

  const fit = useCallback(() => {
    const el = scroller.current;
    if (el) applyZoom(fitZoom(talkFrames, fps, el.clientWidth));
  }, [applyZoom, talkFrames, fps]);

  useEffect(() => {
    apiRef.current = { zoomBy: (f) => applyZoom(zoomRef.current * f), fit };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, applyZoom, fit]);

  // Ctrl/Cmd+wheel (and a trackpad pinch) zooms; Shift+wheel scrolls sideways.
  // Added by hand because React's onWheel is passive and can't stop the
  // browser zooming the page.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        applyZoom(zoomRef.current * wheelFactor(e.deltaY), e.clientX - el.getBoundingClientRect().left);
      } else if (e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // While the video plays, page the track along with the playhead.
  useEffect(() => {
    const el = scroller.current;
    if (!el || drag.current || scrubbing.current || playheadFrame < 0) return;
    const x = playheadFrame * pxPerFrame;
    if (x > el.scrollLeft + el.clientWidth - 24 || x < el.scrollLeft) el.scrollLeft = Math.max(0, x - 48);
  }, [playheadFrame, pxPerFrame]);

  // The dragged block's position: where the pointer is (plus how far the track
  // has scrolled since the drag began), snapped to an edge when snapping is on
  // and Alt isn't held.
  const resolve = (d: Drag) => {
    const startFrame = toFrame(d.item.atMs);
    const length = Math.max(0, toFrame(d.item.endMs) - startFrame);
    const dx = d.clientX - d.startX + ((scroller.current?.scrollLeft ?? 0) - d.startScroll);
    const raw = startFrame + dx / pxPerFrame;
    if (!snapOn || d.alt) return { frame: raw, guide: null, dx };
    const edges = [
      0,
      talkFrames,
      playheadFrame,
      ...items.filter((o) => o.key !== d.item.key).flatMap((o) => [toFrame(o.atMs), toFrame(o.endMs)]),
    ];
    const s = snapStart(raw, length, edges, SNAP_PX / pxPerFrame);
    return { frame: s.frame, guide: s.guide, dx };
  };

  const refreshDrag = (d: Drag) => {
    const r = resolve(d);
    setDragView({ key: d.item.key, dx: (r.frame - toFrame(d.item.atMs)) * pxPerFrame });
    setGuide(r.guide);
  };
  const refresh = useRef(refreshDrag);
  refresh.current = refreshDrag;

  // Scroll the track while a drag is held near its left or right edge.
  const dragging = dragView !== null;
  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    const tick = () => {
      const d = drag.current;
      const el = scroller.current;
      if (d && el) {
        const rect = el.getBoundingClientRect();
        const v = edgeSpeed(d.clientX, rect.left, rect.right);
        if (v !== 0) {
          const before = el.scrollLeft;
          el.scrollLeft += v;
          if (el.scrollLeft !== before) refresh.current(d);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

  const down = (e: PointerEvent, it: TimelineItem) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      item: it,
      startX: e.clientX,
      startScroll: scroller.current?.scrollLeft ?? 0,
      clientX: e.clientX,
      alt: e.altKey,
    };
    onSelect(it.key);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.clientX = e.clientX;
    d.alt = e.altKey;
    refreshDrag(d);
  };
  const up = (e: PointerEvent, it: TimelineItem) => {
    const d = drag.current;
    drag.current = null;
    setDragView(null);
    setGuide(null);
    if (!d) return;
    d.clientX = e.clientX;
    d.alt = e.altKey;
    const r = resolve(d);
    if (Math.abs(r.dx) < DRAG_THRESHOLD_PX) return onSeek(TALK_START_FRAME + toFrame(it.atMs));
    onMove(it, toSrcMs(segments, (r.frame * 1000) / fps, fps) - it.atMs);
  };

  // Press and drag on the ruler or an empty lane to scrub the playhead. Seeks
  // are coalesced to one per animation frame: a pointer sends many more moves
  // than the video decoder can follow.
  const latestSeek = useRef(onSeek);
  latestSeek.current = onSeek;
  const wantedFrame = useRef<number | null>(null);
  const seekRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(seekRaf.current), []);
  const seekAt = (clientX: number) => {
    const left = track.current?.getBoundingClientRect().left ?? 0;
    const f = Math.round((clientX - left) / pxPerFrame);
    wantedFrame.current = TALK_START_FRAME + Math.min(talkFrames, Math.max(0, f));
    if (seekRaf.current) return;
    seekRaf.current = requestAnimationFrame(() => {
      seekRaf.current = 0;
      if (wantedFrame.current !== null) latestSeek.current(wantedFrame.current);
      wantedFrame.current = null;
    });
  };

  const width = talkFrames * pxPerFrame;
  const playheadX = Math.max(0, playheadFrame * pxPerFrame);
  const step = rulerStep(pxPerSec);
  const ticks = Array.from({ length: Math.floor(talkFrames / fps / step) + 1 }, (_, i) => i * step);

  return (
    <div className="timeline-wrap">
      <div className="tl-tools">
        <button onClick={() => applyZoom(zoomRef.current / ZOOM_STEP)} aria-label="Zoom out" title="Zoom out (Ctrl −)">
          −
        </button>
        <span className="zoom" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => applyZoom(zoomRef.current * ZOOM_STEP)} aria-label="Zoom in" title="Zoom in (Ctrl +)">
          +
        </button>
        <button onClick={() => applyZoom(1)} title="Back to 100%">
          100%
        </button>
        <button onClick={fit} title="Fit the whole talk in view (Ctrl 0)">
          Fit
        </button>
        <label className="snap">
          <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} /> Snap
          <span className="dim"> (hold Alt to skip)</span>
        </label>
      </div>
      <div className="timeline">
        <div className="lane-names">
          <span />
          {LANES.map(([, name]) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="track-scroll" ref={scroller}>
          <div
            className="track"
            ref={track}
            style={{ width }}
            role="presentation"
            onPointerDown={(e) => {
              scrubbing.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              seekAt(e.clientX);
              onSelect(null);
            }}
            onPointerMove={(e) => scrubbing.current && seekAt(e.clientX)}
            onPointerUp={() => {
              scrubbing.current = false;
            }}
            onPointerCancel={() => {
              scrubbing.current = false;
            }}
          >
            <div className="ruler">
              {ticks.map((s) => (
                <span key={s} style={{ left: s * pxPerSec }}>
                  {rulerLabel(s)}
                </span>
              ))}
            </div>
            {LANES.map(([field]) => (
              <div key={field} className={`lane ${field}`}>
                {items
                  .filter((it) => it.field === field)
                  .map((it) => {
                    const x = toFrame(it.atMs) * pxPerFrame;
                    const w = Math.max(10, (toFrame(it.endMs) - toFrame(it.atMs)) * pxPerFrame);
                    const dx = dragView?.key === it.key ? dragView.dx : 0;
                    return (
                      <button
                        key={it.key}
                        className={`block${dx ? " dragging" : ""}${selectedKey === it.key ? " selected" : ""}`}
                        style={{ left: x, width: w, transform: `translateX(${dx}px)` }}
                        title={`${it.label} — drag to move (Alt skips snapping); ← → nudge, Delete removes`}
                        aria-label={it.label}
                        aria-pressed={selectedKey === it.key}
                        onPointerDown={(e) => down(e, it)}
                        onPointerMove={move}
                        onPointerUp={(e) => up(e, it)}
                        onClick={(e) => {
                          // Enter on a focused block (a pointer click has detail >= 1 and was handled above).
                          if (e.detail === 0) {
                            onSelect(it.key);
                            onSeek(TALK_START_FRAME + toFrame(it.atMs));
                          }
                        }}
                      >
                        {it.label}
                      </button>
                    );
                  })}
              </div>
            ))}
            {guide !== null ? <div className="snap-guide" style={{ left: guide * pxPerFrame }} /> : null}
            <div className="playhead" style={{ left: playheadX }} />
          </div>
        </div>
      </div>
    </div>
  );
};
