"""Check for prep-video.py --clips on two synthetic takes in a temp media root:
the joined proxy's length, the merged words.json, the joined cut-out keeping its
alpha, a missing take stopping with the prep command, the single-recording
prep unchanged, and a prep whose transcription failed resuming on a retry
without touching its proxy or the video file. faster-whisper is replaced by a stub, so nothing is downloaded.

    python scripts/check-clips.py      (prints "clips ok"; exit 1 on failure)
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

PREP = Path(__file__).resolve().parent / "prep-video.py"
FPS = 30
STUB = '''from pathlib import Path
from types import SimpleNamespace as NS


class WhisperModel:
    def __init__(self, *args, **kwargs):
        pass

    def transcribe(self, path, **kwargs):
        rec = Path(path).parent.name
        words = [NS(word=f" {rec}-{i}", start=i * 0.5, end=i * 0.5 + 0.4, probability=1.0)
                 for i in range(10)]
        return [NS(start=0.0, end=5.0, text="stub", words=words)], NS(duration=5.0)
'''
# (recording, inMs, outMs): whole frames at 30 fps, 75 + 45 + 18 = 138 frames.
A_ROLL = [("take-a", 1000, 3500), ("take-b", 500, 2000), ("take-a", 4000, 4600)]


def sh(cmd: list[str], env: dict | None = None, ok: bool = True) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env)
    if ok and result.returncode != 0:
        raise SystemExit(f"{' '.join(cmd[:3])} failed:\n{result.stdout}{result.stderr}")
    return result


def probe(path: Path, entry: str) -> str:
    return sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", entry,
               "-of", "default=nw=1:nk=1", str(path)]).stdout.strip()


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        public = root / "public"
        (root / "stub" / "faster_whisper").mkdir(parents=True)
        (root / "stub" / "faster_whisper" / "__init__.py").write_text(STUB, encoding="utf-8")
        env = {**os.environ, "FINHUB_PUBLIC": str(public), "PYTHONPATH": str(root / "stub")}

        # Two 5 s takes, each prepared by the unchanged single-recording path.
        for take, hz in (("take-a", 440), ("take-b", 660)):
            src = root / f"{take}.mp4"
            sh(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                f"testsrc=d=5:s=320x240:r={FPS}", "-f", "lavfi", "-i", f"sine=f={hz}:d=5",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(src)])
            sh([sys.executable, str(PREP), str(src), take], env)
            rec = public / "recordings" / take
            edit = json.loads((public / "videos" / take / "edit.json").read_text(encoding="utf-8"))
            assert edit == {"source": take, "title": take, "pacing": {"mode": "auto"},
                            "chapters": [], "stats": [], "cues": [],
                            "compliance": {"illustrativeNumbers": True}}, edit
            assert probe(rec / "source.mp4", "stream=nb_frames") == "150"
            # A cut-out with alpha: left half transparent, right half opaque.
            sh(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                f"testsrc=d=5:s=320x240:r={FPS},format=yuva420p,"
                "geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='if(lt(X,W/2),0,255)'",
                "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", str(rec / "foreground.webm")])
        # A transcription that fails (faster-whisper missing) leaves source.mp4 and no
        # words.json; the retry with the same file resumes (B3, maintenance run 3).
        (root / "broken" / "faster_whisper").mkdir(parents=True)
        (root / "broken" / "faster_whisper" / "__init__.py").write_text(
            'raise ImportError("simulated")\n', encoding="utf-8")
        src = root / "take-c.mp4"
        sh(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc=d=2:s=320x240:r={FPS}",
            "-f", "lavfi", "-i", "sine=d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-shortest", str(src)])
        rec = public / "recordings" / "take-c"
        failed = sh([sys.executable, str(PREP), str(src), "take-c"],
                    {**env, "PYTHONPATH": str(root / "broken")}, ok=False)
        assert failed.returncode != 0 and "faster-whisper is not installed" in failed.stderr, failed
        assert (rec / "source.mp4").exists() and not (rec / "words.json").exists()
        assert not list(rec.glob("*.part*")), "the checked proxy is renamed, no .part left"
        kept = {p: digest(p) for p in (src, rec / "source.mp4")}
        hint = sh([sys.executable, str(PREP), "take-c", "--recording", "take-c"], env, ok=False)
        assert hint.returncode != 0 and "Give the same video file again to finish it" in hint.stderr, hint.stderr
        other = sh([sys.executable, str(PREP), str(root / "take-a.mp4"), "take-c"], env, ok=False)
        assert other.returncode != 0 and "Nothing was changed" in other.stderr, other.stderr
        # Same frame count, another video; the same video with another --no-clean; a proxy
        # with no source.from.json: all refused, nothing changed (R5, run 3 round 2).
        same_len = root / "take-d.mp4"
        sh(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=d=2:s=320x240:r={FPS}",
            "-f", "lavfi", "-i", "sine=f=880:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-shortest", str(same_len)])
        assert probe(same_len, "stream=nb_frames") == probe(src, "stream=nb_frames")
        record, aside = rec / "source.from.json", root / "source.from.json"
        for cmd, hide in (([str(same_len), "take-c"], False), ([str(src), "take-c", "--no-clean"], False),
                          ([str(src), "take-c"], True)):
            if hide:
                record.replace(aside)
                # S1 (run 4): with no record the same file is refused, so the hint must not offer it.
                hint = sh([sys.executable, str(PREP), "take-c", "--recording", "take-c"], env, ok=False)
                assert hint.returncode != 0 and "cannot be finished" in hint.stderr \
                    and "same video file again" not in hint.stderr, hint.stderr
            r = sh([sys.executable, str(PREP), *cmd], env, ok=False)
            assert r.returncode != 0 and "Nothing was changed" in r.stderr, (cmd, hide, r.stdout, r.stderr)
            assert not (rec / "words.json").exists() and kept == {p: digest(p) for p in kept}
            if hide:
                aside.replace(record)
        out = sh([sys.executable, str(PREP), str(src), "take-c"], env).stdout
        assert "Resuming" in out and (rec / "words.json").exists(), out
        assert kept == {p: digest(p) for p in kept}, "the video file and the proxy are untouched"
        before = {p: digest(p) for p in (public / "recordings").rglob("*") if p.is_file()}

        # (c) a new edit of a prepared recording writes only the skeleton, as before.
        sh([sys.executable, str(PREP), "take-a-2", "--recording", "take-a"], env)
        assert json.loads((public / "videos" / "take-a-2" / "edit.json")
                          .read_text(encoding="utf-8"))["source"] == "take-a"

        # A take that was never prepared stops with the command that prepares it.
        clips = public / "videos" / "demo" / "clips.json"
        clips.parent.mkdir(parents=True)
        clips.write_text(json.dumps([{"recording": "take-z", "inMs": 0, "outMs": 900,
                                      "role": "a-roll"}]), encoding="utf-8")
        missing = sh([sys.executable, str(PREP), "demo", "--clips", str(clips)], env, ok=False)
        assert missing.returncode != 0 and "prep-video.py" in missing.stderr \
            and "--recording take-z" in missing.stderr, missing.stderr
        assert not (public / "recordings" / "demo-assembly").exists()

        clips.write_text(json.dumps(
            [{"recording": r, "inMs": i, "outMs": o, "role": "a-roll"} for r, i, o in A_ROLL]
            + [{"recording": "my-street.mp4", "inMs": 0, "outMs": 2000, "role": "b-roll"}]),
            encoding="utf-8")
        out = sh([sys.executable, str(PREP), "demo", "--clips", str(clips)], env).stdout
        assert "b-roll, not in the assembly: my-street.mp4" in out, out
        asm = public / "recordings" / "demo-assembly"
        edit = json.loads((public / "videos" / "demo" / "edit.json").read_text(encoding="utf-8"))
        assert edit["source"] == "demo-assembly", edit

        # (a) length = the kept spans, within one frame.
        kept_s = sum(o - i for _, i, o in A_ROLL) / 1000
        dur = float(probe(asm / "source.mp4", "stream=duration"))
        assert abs(dur - kept_s) <= 1 / FPS, (dur, kept_s)
        assert probe(asm / "source.mp4", "stream=nb_frames") == str(round(kept_s * FPS))

        # (b) words in order, each on its own clip's side of every boundary.
        words = json.loads((asm / "words.json").read_text(encoding="utf-8"))
        starts = [w["startMs"] for w in words]
        assert starts == sorted(starts) and all(w["endMs"] >= w["startMs"] for w in words)
        edges, t = [], 0
        for rec, i, o in A_ROLL:
            edges.append((t, t + o - i, rec))
            t += o - i
        for w in words:
            rec = next(r for a, b, r in edges if a <= w["startMs"] < b)
            assert w["text"].startswith(f" {rec}-"), (w, rec)
        marks = [(w["startMs"], w["clipStart"]) for w in words if "clipStart" in w]
        assert [m[1] for m in marks] == [r for r, _, _ in A_ROLL], marks
        assert [m[0] for m in marks] == [0, 2500, 4000], marks  # each clip starts on a word
        assert words[0]["text"] == " take-a-2", words[0]

        # The joined cut-out: same frame count, alpha kept (left clear, right opaque).
        fg = asm / "foreground.webm"
        assert probe(fg, "stream=codec_name") == "vp9"
        assert probe(fg, "stream_tags=alpha_mode") == "1", "alpha_mode tag missing"
        frames = sh(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
                     "-show_entries", "stream=nb_read_frames", "-of", "default=nw=1:nk=1",
                     str(fg)]).stdout.strip()
        assert frames == str(round(kept_s * FPS)), frames
        alpha = subprocess.run(
            ["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", str(fg), "-frames:v", "1",
             "-vf", "alphaextract,scale=2:1:flags=area", "-f", "rawvideo", "-pix_fmt", "gray",
             "-"], capture_output=True, check=True).stdout
        assert alpha[0] < 16 and alpha[1] > 239, list(alpha)

        # The takes themselves are untouched.
        assert before == {p: digest(p) for p in before}
    print("clips ok")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as err:
        print(f"FAIL: {err!r}", file=sys.stderr)
        sys.exit(1)
