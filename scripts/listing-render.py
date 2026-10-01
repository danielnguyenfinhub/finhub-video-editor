"""Render a Global RE listing video, Vietnamese and English versions.

    python scripts/listing-render.py <slug> [--lang vi|en]     (npm run listing-render -- <slug>)

For each language voiced (public/listings/<slug>/words-<lang>.json), writes to
out/listings/<slug>/: <slug>-<lang>.mp4 (1080x1920, -14 LUFS),
<slug>-<lang>-mobile.mp4 (720x1280, about 27 MB), <slug>-<lang>-feed.mp4
(1080x1350: the 4:5 middle, with the agent and legal end cards scaled whole),
<slug>-<lang>-thumbnail.png, <slug>-<lang>.srt and <slug>-<lang>.inputs (a hash of
the on-screen inputs, so publish-listing.mjs can tell a stale language). Then
scripts/publish-listing.mjs puts the topic-named videos and caption.txt in
"4 - GLOBAL RE FINISHED VIDEOS" (exit 3 when that fails: rendered, not published).
Stops before rendering if the listing compliance guard or the font preflight fails. Pipeline: docs/agents/listing-video.md.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# render-video.py's helpers (run, ffprobe, loudness, the Remotion CLI path).
_spec = importlib.util.spec_from_file_location("render_video", ROOT / "scripts" / "render-video.py")
rv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rv)  # type: ignore[union-attr]

FPS = 30
LEAD_FRAMES = 6  # src/listing/data.ts
THUMBNAIL_FRAME = 45  # the hook card


def srt_time(ms: float) -> str:
    ms = max(0, int(round(ms)))
    return f"{ms // 3_600_000:02}:{ms // 60_000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def write_srt(path: Path, scenes: list[dict], timeline: list[dict], lang: str) -> None:
    """One cue per scene: the voiced line, then the other language's."""
    other = "en" if lang == "vi" else "vi"
    lead_ms = LEAD_FRAMES * 1000 / FPS
    cues = []
    for i, (scene, t) in enumerate(zip(scenes, timeline), 1):
        cues.append(f"{i}\n{srt_time(t['fromMs'] + lead_ms)} --> {srt_time(t['toMs'] + lead_ms)}\n{scene[lang]}\n{scene[other]}\n")
    path.write_text("\n".join(cues), encoding="utf-8")


def render(slug: str, lang: str, scenes: list[dict], out_dir: Path) -> None:
    base = ROOT / "public" / "listings" / slug
    try:
        timeline = json.loads((base / f"timeline-{lang}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        raise SystemExit(f"{lang}: timeline-{lang}.json unreadable ({err}). Voice it: "
                         f"node scripts/voice-video.mjs {slug} --listing --lang {lang}") from err
    full = out_dir / f"{slug}-{lang}.mp4"
    # Hash the on-screen inputs now (what this render reads); write it only once the render is done.
    stamp = out_dir / f"{slug}-{lang}.inputs"
    stamp.unlink(missing_ok=True)
    inputs = subprocess.run(["node", "--no-warnings", str(ROOT / "scripts" / "publish-listing.mjs"), slug, "--inputs-hash", lang],
                            cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    props = json.dumps({"slug": slug, "lang": lang})
    rv.run(rv.REMOTION + ["render", "src/index.ts", "ListingReel", str(full), f"--props={props}",
                          "--codec=h264", "--gl=angle", "--concurrency=4", "--timeout=120000"],
           f"render {full.name} (several minutes)")
    rv.normalize_loudness(full)

    seconds = rv.duration_s(full)
    mobile = out_dir / f"{slug}-{lang}-mobile.mp4"
    video_bps = int(rv.MOBILE_TARGET_BYTES * 8 / seconds) - rv.MOBILE_AUDIO_BPS
    passlog = str(out_dir / f"x264pass-{lang}")
    common = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(full),
              "-vf", "scale=720:1280", "-c:v", "libx264", "-preset", "slow",
              "-b:v", str(video_bps), "-passlogfile", passlog]
    rv.run(common + ["-pass", "1", "-an", "-f", "null", os.devnull], "mobile pass 1")
    rv.run(common + ["-pass", "2", "-c:a", "aac", "-b:a", str(rv.MOBILE_AUDIO_BPS),
                     "-movflags", "+faststart", str(mobile)], "mobile pass 2")
    for f in out_dir.glob(f"x264pass-{lang}*"):
        f.unlink(missing_ok=True)

    # Feed 4:5: the middle band until the agent card; the end cards are taller
    # than the band, so they are scaled whole over a blurred fill (as render-video.py).
    agent = next((i for i, s in enumerate(scenes) if s["kind"] == "agent"), len(scenes) - 1)
    cards_from = (LEAD_FRAMES + round(timeline[agent]["fromMs"] * FPS / 1000)) / FPS
    feed = out_dir / f"{slug}-{lang}-feed.mp4"
    feed_filter = (
        f"[0:v]split=2[tour][cards];"
        f"[tour]trim=end={cards_from:.3f},setpts=PTS-STARTPTS,crop=1080:1350:0:285[t];"
        f"[cards]trim=start={cards_from:.3f},setpts=PTS-STARTPTS,split=2[c1][c2];"
        f"[c1]scale=1080:1350,boxblur=30[bg];[c2]scale=-2:1350[fg];"
        f"[bg][fg]overlay=(W-w)/2:0,setsar=1[c];[t][c]concat=n=2:v=1:a=0[v]")
    rv.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(full),
            "-filter_complex", feed_filter, "-map", "[v]", "-map", "0:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-c:a", "copy", "-movflags", "+faststart", str(feed)], "feed 4:5 copy")

    thumb = out_dir / f"{slug}-{lang}-thumbnail.png"
    rv.run(rv.REMOTION + ["still", "src/index.ts", "ListingReel", str(thumb), f"--props={props}",
                          f"--frame={THUMBNAIL_FRAME}", "--gl=angle"], "thumbnail")
    write_srt(out_dir / f"{slug}-{lang}.srt", scenes, timeline, lang)
    for path in (full, mobile, feed):
        print(f"{path}  {path.stat().st_size / 1e6:.1f} MB  {rv.duration_s(path):.2f} s  audio mean {rv.mean_volume_db(path)}")
    stamp.write_text(inputs + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("slug", type=rv.check_slug, help="folder name under public/listings/")
    parser.add_argument("--lang", choices=["vi", "en"], help="only this language (default: every one voiced)")
    args = parser.parse_args()
    slug: str = args.slug
    base = ROOT / "public" / "listings" / slug
    if not (base / "script.json").exists():
        raise SystemExit(f"public/listings/{slug}/script.json not found. Prepare the listing first (docs/agents/listing-video.md).")
    langs = [args.lang] if args.lang else [lang for lang in ("vi", "en") if (base / f"words-{lang}.json").exists()]
    if not langs:
        raise SystemExit(f"No voice yet. Run: node scripts/voice-video.mjs {slug} --listing --lang vi (and --lang en)")
    rv.run(["node", "--no-warnings", str(ROOT / "scripts" / "listing-compliance.mjs"), slug], "listing compliance")
    rv.run(["node", str(ROOT / "scripts" / "preflight.mjs")], "preflight (fonts)")
    scenes = json.loads((base / "script.json").read_text(encoding="utf-8"))["scenes"]
    out_dir = ROOT / "out" / "listings" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    for lang in langs:
        render(slug, lang, scenes, out_dir)

    print("\n== 4 - GLOBAL RE FINISHED VIDEOS", flush=True)
    published = subprocess.run(["node", "--no-warnings", str(ROOT / "scripts" / "publish-listing.mjs"), slug, "--force"], cwd=ROOT)
    if published.returncode:
        print(f"\nNOT PUBLISHED: the render succeeded (files in {out_dir}), but nothing went in the finished "
              f"folder. Fix the problem above, then run: node scripts/publish-listing.mjs {slug} --force", flush=True)
        sys.exit(3)


if __name__ == "__main__":
    main()
