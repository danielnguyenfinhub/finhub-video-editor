"""Find where the face is in a landscape (or square) recording so the 9:16 proxy
crops around it rather than the centre. prep-video.py calls face_crop(); it can
also be run alone to see the numbers:

    python scripts/reframe.py <video>

Frames are sampled at 2 fps (ffmpeg, 320 px wide), faces found with OpenCV's
bundled Haar cascade (pip install opencv-python-headless; without it, or with
no face found, the crop stays centred and says so). The crop is one static
window on the median face position; a face that wanders further than the
window's slack is reported so Daniel can re-record or accept it.
The idea is OpenMontage's auto_reframe (tools/video/auto_reframe.py).
"""
from __future__ import annotations

import json
import shutil
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

SAMPLE_FPS = 2
SAMPLE_WIDTH = 320
FACE_Y = 0.35  # the face sits this far down the crop (eyes above centre, room for captions)
# ponytail: one static crop per recording; a dynamic (sendcmd) crop when Daniel walks
# while talking. Static covers a seated talking head, which is every recording so far.


def _detect(frames: list[Path], scale: float) -> list[tuple[float, float]]:
    """Face centres in source pixels, one per frame with exactly one face."""
    try:
        import cv2  # type: ignore
    except ImportError:
        return []
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    centres: list[tuple[float, float]] = []
    for f in frames:
        img = cv2.imread(str(f))
        if img is None:
            continue
        grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(grey, scaleFactor=1.1, minNeighbors=5, minSize=(24, 24))
        if len(faces) == 1:
            x, y, w, h = faces[0]
            centres.append(((x + w / 2) / scale, (y + h / 2) / scale))
    return centres


def crop_window(width: int, height: int, centres: list[tuple[float, float]],
                aspect: float = 9 / 16) -> dict:
    """The crop (w, h, x, y) around the median face, clamped to the frame, plus what
    was found. Pure, so it can be checked without ffmpeg or OpenCV."""
    crop_w = min(width, int(height * aspect) // 2 * 2)
    crop_h = min(height, int(crop_w / aspect) // 2 * 2)
    if not centres:
        return {"w": crop_w, "h": crop_h, "x": (width - crop_w) // 2, "y": (height - crop_h) // 2,
                "faces": 0, "reason": "no face found: centred"}
    cx = statistics.median(c[0] for c in centres)
    cy = statistics.median(c[1] for c in centres)
    x = int(max(0, min(cx - crop_w / 2, width - crop_w)))
    y = int(max(0, min(cy - crop_h * FACE_Y, height - crop_h)))
    xs = [c[0] for c in centres]
    slack = crop_w * 0.25  # the face may drift a quarter of the crop before it nears the edge
    wander = max(cx - min(xs), max(xs) - cx)
    out = {"w": crop_w, "h": crop_h, "x": x, "y": y, "faces": len(centres),
           "reason": f"face median at ({int(cx)}, {int(cy)}) in {len(centres)} frames"}
    if wander > slack:
        out["warning"] = (f"the face moves {int(wander)} px from its median (crop slack {int(slack)} px): "
                          f"it may leave the frame; check the proxy, or re-record seated and centred")
    return out


def face_crop(video: Path, width: int, height: int) -> dict:
    """Sample, detect, and return crop_window(); never raises for a missing OpenCV."""
    if shutil.which("ffmpeg") is None:
        return crop_window(width, height, [])
    with tempfile.TemporaryDirectory(prefix="reframe-") as tmp:
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(video),
                        "-vf", f"fps={SAMPLE_FPS},scale={SAMPLE_WIDTH}:-2", "-q:v", "4",
                        str(Path(tmp) / "f%05d.jpg")], check=False)
        frames = sorted(Path(tmp).glob("f*.jpg"))
        centres = _detect(frames, SAMPLE_WIDTH / width)
    out = crop_window(width, height, centres)
    if not centres and not frames:
        out["reason"] = "no frames sampled: centred"
    elif not centres:
        try:
            import cv2  # noqa: F401
        except ImportError:
            out["reason"] = "opencv-python-headless not installed: centred (pip install opencv-python-headless)"
    return out


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__.split("\n\n")[1])
    video = Path(sys.argv[1])
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height", "-of", "json", str(video)],
                           capture_output=True, text=True, check=True)
    s = json.loads(probe.stdout)["streams"][0]
    print(json.dumps(face_crop(video, int(s["width"]), int(s["height"])), indent=2))


if __name__ == "__main__":
    main()
