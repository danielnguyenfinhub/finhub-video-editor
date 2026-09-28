// Drag timeline for the review page: one lane each for chapters, stats,
// cues and B-roll visuals, drawn in output time (what the viewer sees, cuts removed). Drag a block
// to move it, click one to jump to it, click the track to seek; arrow keys on a
// focused block move it by nudgeMs. A drop is mapped back to source time with
// toSrcMs, and the whole item (inner beats included) shifts by that delta.
import { useRef, useState, type PointerEvent } from "react";
import {
  TALK_START_FRAME,
  toSrcMs,
  type Segment,
} from "../src/mortgage/timeline";

export type TimelineItem = {
  key: string;
  label: string;
  field: "chapters" | "stats" | "cues" | "visuals";
  index: number;
  atMs: number;
  endMs: number;
};

const PX_PER_SEC = 24;
const DRAG_THRESHOLD_PX = 3;
const LANES = [
  ["chapters", "Chapters"],
  ["stats", "Stats"],
  ["cues", "Cues"],
  ["visuals", "B-roll"],
] as const;

export const Timeline = ({
  items,
  segments,
  talkFrames,
  fps,
  frame,
  nudgeMs,
  toFrame,
  onSeek,
  onMove,
}: {
  items: TimelineItem[];
  segments: Segment[];
  talkFrames: number;
  fps: number;
  frame: number; // player frame
  nudgeMs: number;
  toFrame: (srcMs: number) => number; // source ms -> talk frame
  onSeek: (playerFrame: number) => void;
  onMove: (item: TimelineItem, deltaMs: number) => void;
}) => {
  const pxPerFrame = PX_PER_SEC / fps;
  const drag = useRef<{ key: string; startX: number } | null>(null);
  const [dragDx, setDragDx] = useState<{ key: string; dx: number } | null>(
    null,
  );

  const down = (e: PointerEvent, it: TimelineItem) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { key: it.key, startX: e.clientX };
  };
  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    setDragDx({ key: drag.current.key, dx: e.clientX - drag.current.startX });
  };
  const up = (e: PointerEvent, it: TimelineItem) => {
    const d = drag.current;
    drag.current = null;
    setDragDx(null);
    if (!d) return;
    const dx = e.clientX - d.startX;
    const startFrame = toFrame(it.atMs);
    if (Math.abs(dx) < DRAG_THRESHOLD_PX)
      return onSeek(TALK_START_FRAME + startFrame);
    const outMs = ((startFrame + dx / pxPerFrame) * 1000) / fps;
    onMove(it, toSrcMs(segments, outMs, fps) - it.atMs);
  };

  const seekTrack = (e: PointerEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    onSeek(TALK_START_FRAME + Math.max(0, Math.round(x / pxPerFrame)));
  };

  const width = talkFrames * pxPerFrame;
  const playhead = (frame - TALK_START_FRAME) * pxPerFrame;
  const seconds = Array.from(
    { length: Math.floor(talkFrames / fps / 5) + 1 },
    (_, i) => i * 5,
  );

  return (
    <div className="timeline">
      <div className="lane-names">
        <span />
        {LANES.map(([, name]) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="track-scroll">
        <div
          className="track"
          style={{ width }}
          onPointerDown={seekTrack}
          role="presentation"
        >
          <div className="ruler">
            {seconds.map((s) => (
              <span key={s} style={{ left: s * PX_PER_SEC }}>
                {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
              </span>
            ))}
          </div>
          {LANES.map(([field]) => (
            <div key={field} className={`lane ${field}`}>
              {items
                .filter((it) => it.field === field)
                .map((it) => {
                  const x = toFrame(it.atMs) * pxPerFrame;
                  const w = Math.max(
                    10,
                    (toFrame(it.endMs) - toFrame(it.atMs)) * pxPerFrame,
                  );
                  const dx = dragDx?.key === it.key ? dragDx.dx : 0;
                  return (
                    <button
                      key={it.key}
                      className={`block${dx ? " dragging" : ""}`}
                      style={{
                        left: x,
                        width: w,
                        transform: `translateX(${dx}px)`,
                      }}
                      title={`${it.label} — drag to move, arrow keys nudge`}
                      aria-label={it.label}
                      onPointerDown={(e) => down(e, it)}
                      onPointerMove={move}
                      onPointerUp={(e) => up(e, it)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowLeft") onMove(it, -nudgeMs);
                        if (e.key === "ArrowRight") onMove(it, nudgeMs);
                      }}
                    >
                      {it.label}
                    </button>
                  );
                })}
            </div>
          ))}
          <div className="playhead" style={{ left: Math.max(0, playhead) }} />
        </div>
      </div>
    </div>
  );
};
