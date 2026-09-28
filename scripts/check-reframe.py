"""Checks scripts/reframe.py's crop maths without ffmpeg or OpenCV.
    python scripts/check-reframe.py  (exit 1 on failure)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from reframe import crop_window  # noqa: E402

failed = 0


def check(ok: bool, what: str) -> None:
    global failed
    failed += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {what}")


c = crop_window(1920, 1080, [])
check((c["w"], c["h"], c["x"], c["y"]) == (606, 1076, 657, 2), f"no face: centred 9:16 window {c}")
check(c["faces"] == 0 and "centred" in c["reason"], "no face: says so")

c = crop_window(1920, 1080, [(300, 400)] * 5)
check(c["x"] == 0, f"face at the left edge: crop clamps to x=0 (got {c['x']})")
check(0 <= c["y"] <= 1080 - c["h"], f"landscape: the crop spans the height, y clamped (got {c['y']})")

c = crop_window(1920, 1080, [(1800, 500)] * 5)
check(c["x"] == 1920 - 606, "face at the right edge: crop clamps to the frame")

c = crop_window(1920, 1080, [(900, 500), (1000, 500), (950, 500), (960, 520), (940, 480)])
check(c["x"] == 950 - 303 and "warning" not in c, f"still face: median crop, no warning {c}")

c = crop_window(1920, 1080, [(400, 500)] * 3 + [(1500, 500)] * 3)
check("warning" in c, "face wandering 550 px: warned")

c = crop_window(1080, 1080, [(540, 400)])
check((c["w"], c["h"]) == (606, 1076), f"square source: 9:16 window inside it {c}")

c = crop_window(1080, 1920, [(540, 700)])
check((c["w"], c["h"], c["x"], c["y"]) == (1080, 1920, 0, 0), f"portrait source: no crop {c}")

if failed:
    sys.exit(f"reframe: {failed} check(s) failed")
print("reframe ok")
