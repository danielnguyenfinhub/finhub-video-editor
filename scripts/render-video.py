"""Render a MortgageReel video end to end.

    python scripts/render-video.py <slug>

Writes to out/videos/<slug>/: <slug>.mp4 (1080x1920 H.264, its final mix of
voice, music and sound effects set to -14 LUFS, the level YouTube, Facebook
and TikTok play at), <slug>-mobile.mp4 (720x1280, two-pass x264 sized to about
27 MB), <slug>-feed.mp4 (1080x1350, the 4:5 middle for the Facebook feed),
thumbnail.png (the cover card, frame 45) and <slug>.srt. Exits non-zero
on the first failure.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from recordings import PUBLIC, read_edit, recording_dir

ROOT = Path(__file__).resolve().parent.parent
# The Remotion CLI run through node directly: same as `npx remotion`, without
# cmd.exe mangling the JSON in --props on Windows.
REMOTION = ["node", str(ROOT / "node_modules" / "@remotion" / "cli" / "remotion-cli.js")]
MOBILE_TARGET_BYTES = 27_000_000
MOBILE_AUDIO_BPS = 96_000
THUMBNAIL_FRAME = 45
LOUDNESS = "I=-14:TP=-1:LRA=11"
# CTA + compliance card at the end of every MortgageReel: OUTRO_FRAMES +
# COMPLIANCE_FRAMES - COMPLIANCE_TRANSITION (src/mortgage/MortgageReel.tsx) at 30 fps.
END_CARDS_S = (150 + 150 - 10) / 30


def run(cmd: list[str], what: str, capture: bool = False) -> str:
    """Run a command in the project root; fail loudly with its exit code.

    Output streams to the console unless `capture`, then it is returned.
    """
    print(f"\n== {what}", flush=True)
    try:
        result = subprocess.run(
            cmd, cwd=ROOT, check=True, text=True, encoding="utf-8",
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.STDOUT if capture else None,
        )
    except FileNotFoundError as err:
        raise SystemExit(f"{what} failed: {cmd[0]} not found ({err}).") from err
    except subprocess.CalledProcessError as err:
        print(err.stdout or "", file=sys.stderr)
        raise SystemExit(f"{what} failed (exit {err.returncode}).") from err
    return result.stdout or ""


def duration_s(path: Path) -> float:
    out = run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        f"ffprobe {path.name}", capture=True,
    )
    return float(out.strip())


def mean_volume_db(path: Path) -> str:
    out = run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-map", "0:a:0",
         "-af", "volumedetect", "-f", "null", os.devnull],
        f"volumedetect {path.name}", capture=True,
    )
    match = re.search(r"mean_volume: (-?[\d.]+) dB", out)
    if not match:
        raise SystemExit(f"{path.name} has no audio stream.")
    return f"{match.group(1)} dB"


def normalize_loudness(path: Path) -> None:
    """Two-pass loudnorm of the audio to LOUDNESS, in place; video is copied."""
    out = run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-map", "0:a:0",
         "-af", f"loudnorm={LOUDNESS}:print_format=json", "-f", "null", os.devnull],
        f"measure loudness {path.name}", capture=True,
    )
    m = json.loads(out[out.rindex("{"):out.rindex("}") + 1])
    tmp = path.with_name(f"{path.stem}.loudnorm{path.suffix}")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(path),
         "-c:v", "copy", "-af",
         f"loudnorm={LOUDNESS}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
         f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
         f":offset={m['target_offset']}:linear=true",
         "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart",
         str(tmp)],
        f"loudness {m['input_i']} LUFS -> -14 LUFS")
    os.replace(tmp, path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("slug", help="folder name under public/videos/")
    slug: str = parser.parse_args().slug

    # The rest of edit.json is validated by the render itself.
    edit = read_edit(PUBLIC, slug)
    source = edit.get("source")
    # Golden rule: the background is always removed, so the cut-out must exist,
    # unless edit.json opts out: quick mode ("vignette") or the real room ("room").
    cut_out = recording_dir(PUBLIC, slug, source) / "foreground.webm"
    if edit.get("background") == "vignette":
        print("Quick mode: background not removed (full frame, dark edges); no cut-out needed.")
    elif edit.get("background") == "room":
        print("Room mode: background not removed (the design lays out the room); no cut-out needed.")
    elif not cut_out.exists():
        raise SystemExit(
            f"{cut_out} is missing. Run `npm run review`, open "
            f'http://localhost:4100/matte.html?slug={slug} and wait for "Saved".')
    # Fonts without Vietnamese marks, misplaced or overlapping cues: stop now,
    # before a several-minute render (scripts/preflight.mjs).
    run(["node", str(ROOT / "scripts" / "preflight.mjs"), slug], "preflight checks")
    out_dir = ROOT / "out" / "videos" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    full = out_dir / f"{slug}.mp4"
    mobile = out_dir / f"{slug}-mobile.mp4"
    thumb = out_dir / "thumbnail.png"
    props = json.dumps({"slug": slug})

    # ponytail: concurrency 4 measured fastest on the i9-13900H / Iris Xe
    # (full reel 195 s vs 230 s at 8); re-time if the render machine changes.
    run(REMOTION + ["render", "src/index.ts", "MortgageReel", str(full),
                    f"--props={props}", "--codec=h264", "--gl=angle",
                    "--concurrency=4", "--timeout=120000"],
        f"render {full.name} (several minutes)")
    normalize_loudness(full)

    seconds = duration_s(full)
    video_bps = int(MOBILE_TARGET_BYTES * 8 / seconds) - MOBILE_AUDIO_BPS
    with tempfile.TemporaryDirectory() as tmp:
        passlog = str(Path(tmp) / "x264pass")
        common = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(full),
                  "-vf", "scale=720:1280", "-c:v", "libx264", "-preset", "slow",
                  "-b:v", str(video_bps), "-passlogfile", passlog]
        run(common + ["-pass", "1", "-an", "-f", "null", os.devnull], "mobile pass 1")
        run(common + ["-pass", "2", "-c:a", "aac", "-b:a", str(MOBILE_AUDIO_BPS),
                      "-movflags", "+faststart", str(mobile)], "mobile pass 2")

    # Facebook feed copy: the middle 4:5 of the frame (every design keeps its
    # text inside that band), so one edit serves Reels and the feed.
    # The end cards (CTA + compliance card) use the full height, so they are
    # scaled whole into the 4:5 frame over a blurred fill instead of cropped:
    # cropping cut the logo in half (QC, khong-tra-noi-khoan-vay, 27/09/2026).
    feed = out_dir / f"{slug}-feed.mp4"
    cards_from = max(0.0, duration_s(full) - END_CARDS_S)
    feed_filter = (
        f"[0:v]split=2[talk][cards];"
        f"[talk]trim=end={cards_from:.3f},setpts=PTS-STARTPTS,crop=1080:1350:0:285[t];"
        f"[cards]trim=start={cards_from:.3f},setpts=PTS-STARTPTS,split=2[c1][c2];"
        f"[c1]scale=1080:1350,boxblur=30[bg];[c2]scale=-2:1350[fg];"
        f"[bg][fg]overlay=(W-w)/2:0,setsar=1[c];[t][c]concat=n=2:v=1:a=0[v]")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(full),
         "-filter_complex", feed_filter, "-map", "[v]", "-map", "0:a",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-c:a", "copy", "-movflags", "+faststart", str(feed)], "feed 4:5 copy")

    run(REMOTION + ["still", "src/index.ts", "MortgageReel", str(thumb),
                    f"--props={props}", f"--frame={THUMBNAIL_FRAME}", "--gl=angle"],
        "thumbnail")
    run(["node", "--no-warnings", "scripts/export-srt.mjs", slug], "captions (.srt)")
    srt = out_dir / f"{slug}.srt"
    # Every visual change in the render as small frames for QC to look at
    # (scripts/sweep-render.mjs); a failure here never fails the render.
    print("\n== sweep (frames for QC)", flush=True)
    subprocess.run(["node", "--no-warnings", str(ROOT / "scripts" / "sweep-render.mjs"), slug], cwd=ROOT)

    print("\n== done")
    for path in (full, mobile, feed):
        print(f"{path}  {path.stat().st_size / 1e6:.1f} MB  {duration_s(path):.2f} s  "
              f"audio mean {mean_volume_db(path)}")
    for path in (thumb, srt):
        print(f"{path}  {path.stat().st_size / 1e3:.0f} KB")

    # Daniel's "2 - FINISHED VIDEOS" folder: the video named after its topic and
    # its caption file (scripts/publish-video.mjs). A missing or invalid post
    # only skips this step; the render itself has succeeded. --force: a
    # re-render replaces that topic's files (the originals stay in out_dir).
    print("\n== finished-videos folder", flush=True)
    published = subprocess.run(
        ["node", "--no-warnings", str(ROOT / "scripts" / "publish-video.mjs"), slug, "--force"],
        cwd=ROOT)
    if published.returncode:
        print(f"\nThe render succeeded (files above, in {out_dir}); only the copy to "
              "the finished-videos folder waits for the fix above.", flush=True)


if __name__ == "__main__":
    main()
