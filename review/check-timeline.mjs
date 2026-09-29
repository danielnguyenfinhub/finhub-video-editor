// Check for review/timelineMath.ts. Run: node review/check-timeline.mjs (exit 1 on failure).
import assert from "node:assert/strict";

const m = await import(new URL("./timelineMath.ts", import.meta.url));

// Zoom toward the cursor keeps the moment under the cursor in place.
for (const [zoom, scroll, cx, next] of [[1, 0, 300, 2], [1, 500, 120, 3], [2, 800, 640, 0.5], [4, 100, 0, 8]]) {
  const r = m.zoomAtCursor(zoom, scroll, cx, next);
  const before = (scroll + cx) / zoom;
  const after = (r.scrollLeft + cx) / r.zoom;
  assert.ok(Math.abs(before - after) < 1e-9 || r.scrollLeft === 0, `anchor held for ${[zoom, scroll, cx, next]}`);
}
assert.equal(m.zoomAtCursor(1, 0, 100, 99).zoom, m.MAX_ZOOM, "zoom clamps high");
assert.equal(m.zoomAtCursor(1, 0, 100, 0.001).zoom, m.MIN_ZOOM, "zoom clamps low");
assert.equal(m.zoomAtCursor(2, 0, 0, 1).scrollLeft, 0, "scroll never negative");

// Wheel: up (negative delta) zooms in, down zooms out; per unit a pinch zooms faster than a wheel notch (its deltas are small).
assert.ok(m.wheelFactor(-100) > 1 && m.wheelFactor(100) < 1);
assert.ok(m.wheelFactor(-10) > 1 && m.wheelFactor(-10) < 1.2, "a pinch step is small");
assert.ok(Math.abs(Math.log(m.wheelFactor(-10)) / 10) > Math.abs(Math.log(m.wheelFactor(-100)) / 100), "per unit, a pinch zooms faster than a wheel notch");

// Fit: the talk exactly fills the viewport, clamped.
const fit = m.fitZoom(3000, 30, 1200); // 100 s
assert.ok(Math.abs(fit * 100 * m.BASE_PX_PER_SEC - 1200) < 1e-6, `fit fills the viewport (${fit})`);
assert.equal(m.fitZoom(0, 30, 1200), 1);
assert.equal(m.fitZoom(30, 30, 100000), m.MAX_ZOOM);

// Ruler: labels never closer than 64 px.
for (const zoom of [0.25, 0.5, 1, 2, 4, 8]) {
  const pps = m.BASE_PX_PER_SEC * zoom;
  const step = m.rulerStep(pps);
  assert.ok(step * pps >= 64 || step === 600, `ruler spacing at ${zoom}x`);
}
assert.equal(m.rulerStep(192), 1);
assert.equal(m.rulerStep(24), 5);
assert.equal(m.rulerLabel(75), "1:15");

// Snap: start or end lands on the nearest edge within the threshold, else untouched.
assert.deepEqual(m.snapStart(97, 30, [0, 100, 300], 5), { frame: 100, guide: 100 }, "start snaps");
assert.deepEqual(m.snapStart(68, 30, [0, 100, 300], 5), { frame: 70, guide: 100 }, "end snaps");
assert.deepEqual(m.snapStart(150, 30, [0, 100, 300], 5), { frame: 150, guide: null }, "far from every edge");
assert.deepEqual(m.snapStart(98, 2, [100], 5), { frame: 98, guide: 100 }, "closer of start/end wins (end exact)");

// Edge auto-scroll: 0 in the middle, signed and growing toward the edges, capped at the maximum.
assert.equal(m.edgeSpeed(500, 0, 1000), 0);
assert.ok(m.edgeSpeed(20, 0, 1000) < 0 && m.edgeSpeed(980, 0, 1000) > 0);
assert.ok(Math.abs(m.edgeSpeed(5, 0, 1000)) > Math.abs(m.edgeSpeed(40, 0, 1000)));
assert.equal(m.edgeSpeed(-500, 0, 1000), -m.EDGE_MAX_SPEED);
assert.equal(m.edgeSpeed(5000, 0, 1000), m.EDGE_MAX_SPEED);
assert.ok(Object.is(m.edgeSpeed(47.9, 0, 1000), 0), "a rounded-away speed is +0, never -0");

// History: undo/redo, a no-op commit adds nothing, a new commit clears redo, the limit trims the oldest.
let h = m.startHistory({ n: 0 });
h = m.commit(h, { n: 1 });
h = m.commit(h, { n: 1 });
assert.equal(h.past.length, 1, "identical commit ignored");
h = m.commit(h, { n: 2 });
h = m.undo(h);
assert.deepEqual(h.present, { n: 1 });
h = m.undo(h);
assert.deepEqual(h.present, { n: 0 });
assert.equal(m.undo(h), h, "nothing left to undo");
h = m.redo(h);
assert.deepEqual(h.present, { n: 1 });
h = m.commit(h, { n: 9 });
assert.equal(h.future.length, 0, "a new commit drops the redo branch");
assert.equal(m.redo(h), h);
let long = m.startHistory(0);
for (let i = 1; i <= 150; i++) long = m.commit(long, i);
assert.equal(long.past.length, m.HISTORY_LIMIT);
assert.equal(long.past[0], 50, "the oldest entries went");

console.log("timelineMath ok");
