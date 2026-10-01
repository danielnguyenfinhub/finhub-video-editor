"""Prepare a new talking-head video for the MortgageReel template.

    python scripts/prep-video.py "<path to the recorded video>" <slug> [--recording <id>] [--no-clean]
    python scripts/prep-video.py <slug> --recording <id>
    python scripts/prep-video.py <slug> --clips public/videos/<slug>/clips.json

The first form prepares a new recording: its files go in
public/recordings/<id>/ (id defaults to the slug; see scripts/recordings.py),
the edit in public/videos/<slug>/. If that recording already exists it stops
and names the videos using it: pick another --recording id for a new take, or
delete the folder to replace the recording for all of them.
The second form (no video file) makes a new edit of a recording already
prepared: it skips steps 1-3 and writes only the slug's edit.json.
The third form assembles several prepared takes (the paper edit in clips.json:
[{"recording", "inMs", "outMs", "role": "a-roll" | "b-roll"}]) into one
recording, public/recordings/<slug>-assembly/: the a-roll spans trimmed and
joined in order (source.mp4 re-encoded like step 1, words.json shifted onto the
joined clock, "clipStart": "<recording>" on the first word of each clip, and
foreground.webm joined the same way when every take has one). The slug's
edit.json then names that recording. b-roll entries are only listed.

1. public/recordings/<id>/source.mp4: a short-GOP proxy (a keyframe every 15
   frames) so every OffthreadVideo seek is cheap; a landscape or square
   recording is cropped to 9:16 around the face first (scripts/reframe.py); phone originals often have one
   keyframe every 8 s, which times out parallel renders. Checked frame-for-frame
   against the original, so transcript timestamps apply to both. Its audio gets
   the VOICE_CLEANUP chain below unless --no-clean (for an already clean
   studio recording). source.from.json beside it records the video file (size,
   time, duration) and the clean-up, so a retry after a failed step 2 resumes
   only for the same file.
2. public/recordings/<id>/words.json: word-level faster-whisper large-v3
   transcript (Vietnamese) of the proxy, hesitation sounds (ờ, ừm) included so
   the timeline can cut them. Slow on CPU; progress is printed.
3. A sentence table with each sentence's pace (words/s), flagging slow and fast
   delivery, to help write edit.json.
4. public/videos/<slug>/edit.json: a skeleton (title from the file name,
   "source": <id>), only if none exists yet; an existing one gets its "source"
   set to <id>.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from fractions import Fraction
from pathlib import Path

from recordings import ID_PATTERN, PUBLIC, recording_dir, set_source

SLOW_WPS = 3.4
FAST_WPS = 5.4
# A table row ends at a full stop, a pause, or this many words.
ROW_PAUSE_MS = 400
ROW_MAX_WORDS = 20
# Cut rumble below 80 Hz, take 10 dB off steady background noise (air-con,
# hiss), even out soft and loud words, then set the voice to -16 LUFS so every
# video starts from the same level. Timing is untouched.
VOICE_CLEANUP = ("highpass=f=80,afftdn=nr=10:nf=-50:tn=1,"
                 "acompressor=threshold=-20dB:ratio=3:attack=5:release=150,"
                 "loudnorm=I=-16:TP=-1.5:LRA=11")
# Whisper leaves hesitation sounds out unless its prompt has some; once they are
# in words.json, the timeline cuts them (edit.json "cut").
FILLER_PROMPT = "Ừm, ờ... hôm nay thì, à, mình nói về, ờm, khoản vay nhé."
# The proxy encode (step 1); the assembly uses the same so the quality matches.
PROXY_VIDEO = ["-c:v", "libx264", "-crf", "16", "-preset", "medium",
               "-g", "15", "-keyint_min", "15", "-sc_threshold", "0", "-pix_fmt", "yuv420p"]
PROXY_AUDIO = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart"]
ROLES = ("a-roll", "b-roll")


def run(cmd: list[str], what: str) -> str:
    """Run a command; on failure print its output and exit non-zero."""
    try:
        result = subprocess.run(cmd, check=True, text=True, encoding="utf-8",
                                capture_output=True)
    except FileNotFoundError as err:
        raise SystemExit(f"{what}: {cmd[0]} not found ({err}).") from err
    except subprocess.CalledProcessError as err:
        print(err.stderr or err.stdout or "", file=sys.stderr)
        raise SystemExit(f"{what} failed (exit {err.returncode}).") from err
    return result.stdout


def frame_count(path: Path) -> int:
    """Video frame count from the container, or by counting packets."""
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
               "-show_entries", "stream=nb_frames", "-of", "default=nw=1:nk=1",
               str(path)], f"ffprobe {path.name}").strip()
    if out.isdigit():
        return int(out)
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
               "-show_entries", "stream=nb_read_packets", "-of", "default=nw=1:nk=1",
               str(path)], f"ffprobe {path.name}").strip()
    return int(out)


def reframe_args(src: Path) -> list[str]:
    """A landscape or square recording is cropped to 9:16 around Daniel's face
    (scripts/reframe.py) so the templates' centre crop doesn't lose him; a
    portrait one passes through. Prints what it found."""
    _, width, height = video_format(src)
    print(f"Source is {width}x{height} ({'portrait' if height > width else 'landscape/square'}).")
    if height * 9 >= width * 16 - 2:  # already 9:16 or taller
        return []
    from reframe import face_crop
    c = face_crop(src, width, height)
    print(f"Cropping to {c['w']}x{c['h']} at ({c['x']}, {c['y']}): {c['reason']}.")
    if c.get("warning"):
        print(f"WARNING: {c['warning']}")
    return ["-vf", f"crop={c['w']}:{c['h']}:{c['x']}:{c['y']}"]


def proxy_record(src: Path, clean: bool) -> dict:
    """What a proxy was made from, kept beside it in source.from.json: a retry
    resumes only when the video file and the voice clean-up are the same."""
    st = src.stat()
    duration = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=nw=1:nk=1", str(src)], f"ffprobe {src.name}").strip()
    return {"size": st.st_size, "mtimeNs": st.st_mtime_ns, "duration": duration, "clean": clean}


def make_proxy(src: Path, proxy: Path, clean: bool) -> None:
    """Encode to source.part.mp4 and rename once checked: a killed or failed
    encode never leaves a source.mp4 that looks prepared."""
    part = proxy.with_name(f"{proxy.stem}.part{proxy.suffix}")
    print(f"Encoding proxy -> {proxy} "
          f"({'voice clean-up' if clean else 'audio as recorded'}) ...", flush=True)
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src),
         *reframe_args(src), *PROXY_VIDEO, *(["-af", VOICE_CLEANUP] if clean else []),
         *PROXY_AUDIO, str(part)], "proxy encode")
    original, copy = frame_count(src), frame_count(part)
    if original != copy:
        raise SystemExit(
            f"Frame-count mismatch: original {original}, proxy {copy}. The proxy "
            f"dropped or duplicated frames (variable frame rate?), so transcript "
            f"timestamps would drift. Not continuing.")
    proxy.with_name("source.from.json").write_text(json.dumps(proxy_record(src, clean)), encoding="utf-8")
    part.replace(proxy)
    print(f"Proxy OK: {copy} frames, identical to the original.", flush=True)


def resumable(src: Path, proxy: Path, clean: bool) -> bool:
    """A source.mp4 with no words.json (the transcription failed or was stopped):
    True when source.from.json shows it was made from `src` with the same clean-up
    and it is whole, so only the transcription is left. Otherwise stop (no record
    too); the file is never replaced or deleted here."""
    try:
        record = json.loads(proxy.with_name("source.from.json").read_text(encoding="utf-8"))
        whole = record == proxy_record(src, clean) and frame_count(proxy) == frame_count(src)
    except (OSError, ValueError, SystemExit):
        whole = False
    if not whole:
        raise SystemExit(
            f"{proxy} has no words.json and is not a whole proxy of {src} with "
            f"{'--no-clean' if not clean else 'the voice clean-up'} (another video, another "
            f"--no-clean, an encode that was stopped, or no source.from.json beside it). "
            f"Nothing was changed. Prepare this video as a new "
            f"take with --recording <other-id>, or ask Daniel to move {proxy.parent} away.")
    print(f"Resuming: {proxy} is already a whole proxy of this video; transcribing it.", flush=True)
    return True


def transcribe(proxy: Path) -> list[dict]:
    try:
        from faster_whisper import WhisperModel
    except ImportError as err:
        raise SystemExit("faster-whisper is not installed: pip install faster-whisper") from err
    print("Loading faster-whisper large-v3 (CPU, int8) ...", flush=True)
    # ponytail: 8 threads measured fastest on the i9-13900H (124 s vs 140 s at 16,
    # identical words.json); re-time if the machine changes.
    model = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=8)
    segments, info = model.transcribe(str(proxy), language="vi",
                                      word_timestamps=True, beam_size=5,
                                      initial_prompt=FILLER_PROMPT)
    started = time.time()
    words: list[dict] = []
    for seg in segments:
        for w in seg.words or []:
            words.append({
                "text": w.word,  # keeps Whisper's leading space (token merge relies on it)
                "startMs": round(w.start * 1000),
                "endMs": round(w.end * 1000),
                "timestampMs": None,
                "confidence": round(w.probability, 3),
            })
        pct = 100 * seg.end / max(info.duration, 1)
        print(f"  {pct:5.1f}%  [{seg.start:7.2f}-{seg.end:7.2f}] "
              f"({time.time() - started:.0f}s elapsed) {seg.text.strip()}", flush=True)
    if not words:
        raise SystemExit("Transcription produced no words.")
    return words


def sentence_table(words: list[dict]) -> None:
    """Print start/end/pace per sentence, merging split tokens like '4' '.1'."""
    merged: list[dict] = []
    for w in words:
        if merged and not w["text"].startswith(" "):
            merged[-1] = {**merged[-1], "text": merged[-1]["text"] + w["text"],
                          "endMs": w["endMs"]}
        else:
            merged.append(dict(w))
    print(f"\n{'start':>8} {'end':>8} {'wps':>5} FLAG  text")
    sentence: list[dict] = []
    for i, w in enumerate(merged):
        sentence.append(w)
        nxt = merged[i + 1] if i + 1 < len(merged) else None
        if nxt is None or re.search(r"[.?!]$", w["text"].strip()) \
                or nxt["startMs"] - w["endMs"] > ROW_PAUSE_MS \
                or len(sentence) >= ROW_MAX_WORDS:
            start, end = sentence[0]["startMs"], sentence[-1]["endMs"]
            wps = len(sentence) / max((end - start) / 1000, 0.001)
            flag = "slow" if wps < SLOW_WPS else "fast" if wps > FAST_WPS else ""
            text = "".join(s["text"] for s in sentence).strip()
            print(f"{start:8d} {end:8d} {wps:5.2f} {flag:4}  {text}")
            sentence = []


def read_clips(path: Path) -> list[dict]:
    """clips.json, checked: a list of {recording, inMs, outMs, role}, one a-roll at least."""
    try:
        clips = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        raise SystemExit(f"Cannot read {path}: {err}") from err
    if not isinstance(clips, list):
        raise SystemExit(f"{path} must be a list of clips.")
    for i, c in enumerate(clips, 1):
        ok = (isinstance(c, dict) and isinstance(c.get("recording"), str)
              and c.get("role") in ROLES
              and all(isinstance(c.get(k), int) and c[k] >= 0 for k in ("inMs", "outMs"))
              and c["inMs"] < c["outMs"])
        if not ok:
            raise SystemExit(f'{path}, clip {i}: needs "recording", whole-number "inMs" < '
                             f'"outMs" and "role" ("a-roll" or "b-roll"); got {c}.')
        if c["role"] == "a-roll" and not ID_PATTERN.fullmatch(c["recording"]):
            raise SystemExit(f'{path}, clip {i}: "{c["recording"]}" is not a recording id.')
    if not any(c["role"] == "a-roll" for c in clips):
        raise SystemExit(f"{path} has no a-roll clip to assemble.")
    return clips


def video_format(path: Path) -> tuple[Fraction, int, int]:
    """(frame rate, width, height) of the first video stream."""
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=r_frame_rate,width,height", "-of", "json", str(path)],
              f"ffprobe {path.name}")
    s = json.loads(out)["streams"][0]
    return Fraction(s["r_frame_rate"]), int(s["width"]), int(s["height"])


def shift_words(words: list[dict], start_ms: float, end_ms: float,
                offset_ms: float, recording: str) -> list[dict]:
    """The words of one clip moved onto the assembled clock, first one marked.

    A word is kept when its middle falls inside the clip, clamped to its edges.
    """
    kept = []
    for w in words:
        if not start_ms <= (w["startMs"] + w["endMs"]) / 2 < end_ms:
            continue
        s = round(max(w["startMs"], start_ms) - start_ms + offset_ms)
        e = round(min(w["endMs"], end_ms) - start_ms + offset_ms)
        kept.append({**w, "startMs": s, "endMs": max(s, e)})
    if kept:
        # A leading space keeps the token merge from gluing it to the last clip's word.
        text = kept[0]["text"]
        kept[0] = {**kept[0], "text": text if text.startswith(" ") else " " + text,
                   "clipStart": recording}
    return kept


def join_foregrounds(fgs: list[Path], spans: list[tuple[int, int]], out: Path,
                     frames: int) -> None:
    """Trim and join the takes' cut-outs like source.mp4, keeping the alpha channel."""
    inputs = [a for f in fgs for a in ("-c:v", "libvpx-vp9", "-i", str(f))]  # decoder keeps alpha
    chains = "".join(f"[{i}:v]trim=start_frame={s}:end_frame={e},setpts=PTS-STARTPTS[v{i}];"
                     for i, (s, e) in enumerate(spans))
    graph = chains + "".join(f"[v{i}]" for i in range(len(spans))) + \
        f"concat=n={len(spans)}:v=1:a=0[v]"
    # ponytail: crf 30 is a guess at matte.html's quality; match it if edges look soft.
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
         "-filter_complex", graph, "-map", "[v]", "-c:v", "libvpx-vp9",
         "-pix_fmt", "yuva420p", "-crf", "30", "-b:v", "0", "-an", str(out)],
         "foreground join")
    if frame_count(out) != frames:
        out.unlink()
        raise SystemExit("The joined foreground.webm does not match source.mp4 frame for "
                         "frame; removed it. Make the assembly's own cut-out in matte.html.")


def assemble(slug: str, clips_path: Path) -> str:
    """Build public/recordings/<slug>-assembly/ from clips.json; returns its id."""
    clips = read_clips(clips_path)
    for c in clips:
        if c["role"] == "b-roll":
            print(f"b-roll, not in the assembly: {c['recording']} {c['inMs']}-{c['outMs']} ms "
                  f"(add it to the library as own-footage: node scripts/library.mjs add "
                  f"<file> <meta.json>)")
    a_roll = [c for c in clips if c["role"] == "a-roll"]
    folders = [recording_dir(PUBLIC, slug, c["recording"]) for c in a_roll]
    for c, folder in zip(a_roll, folders):
        if not ((folder / "source.mp4").exists() and (folder / "words.json").exists()):
            raise SystemExit(
                f"Recording {c['recording']} is not prepared ({folder} needs source.mp4 and "
                f"words.json). Prepare that take first:\n  python scripts/prep-video.py "
                f"\"<video file of that take>\" {slug} --recording {c['recording']}")
    formats = {video_format(f / "source.mp4") for f in folders}
    if len(formats) != 1:
        raise SystemExit(f"The takes differ in frame rate or size ({formats}); they can only "
                         f"be joined when all match.")
    fps = formats.pop()[0]
    recording = f"{slug}-assembly"
    out = PUBLIC / "recordings" / recording
    fgs = [f / "foreground.webm" for f in folders]
    joins_fg = all(f.exists() for f in fgs)
    if (out / "foreground.webm").exists() and not joins_fg:
        raise SystemExit(f"{out / 'foreground.webm'} is from an earlier clip list and not every "
                         f"take has a cut-out to rebuild it. Delete it, then run again.")

    spans = [(round(c["inMs"] * fps / 1000), round(c["outMs"] * fps / 1000)) for c in a_roll]
    words: list[dict] = []
    chains, offset = "", Fraction(0)
    for i, ((s, e), c, folder) in enumerate(zip(spans, a_roll, folders)):
        length = frame_count(folder / "source.mp4")
        if e > length:
            raise SystemExit(f"Clip {c['recording']} {c['inMs']}-{c['outMs']} ms runs past the "
                             f"end of that take ({round(length / fps * 1000)} ms).")
        start, end = s / fps, e / fps  # seconds, snapped to whole frames
        chains += (f"[{i}:v]trim=start_frame={s}:end_frame={e},setpts=PTS-STARTPTS[v{i}];"
                   f"[{i}:a]atrim=start={float(start)}:end={float(end)},"
                   f"asetpts=PTS-STARTPTS[a{i}];")
        try:
            take = json.loads((folder / "words.json").read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as err:
            raise SystemExit(f"Cannot read {folder / 'words.json'}: {err}") from err
        words += shift_words(take, float(start * 1000), float(end * 1000),
                             float(offset * 1000), c["recording"])
        offset += end - start
    graph = chains + "".join(f"[v{i}][a{i}]" for i in range(len(spans))) + \
        f"concat=n={len(spans)}:v=1:a=1[v][a]"
    frames = sum(e - s for s, e in spans)
    out.mkdir(parents=True, exist_ok=True)
    proxy = out / "source.mp4"
    print(f"Joining {len(spans)} clips ({frames} frames) -> {proxy} ...", flush=True)
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         *[a for f in folders for a in ("-i", str(f / "source.mp4"))],
         "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
         *PROXY_VIDEO, *PROXY_AUDIO, str(proxy)], "assembly encode")
    if frame_count(proxy) != frames:
        raise SystemExit(f"{proxy} has {frame_count(proxy)} frames, expected {frames}. "
                         f"Not continuing.")
    words_path = out / "words.json"
    words_path.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {words_path} ({len(words)} tokens)")
    if joins_fg:
        join_foregrounds(fgs, spans, out / "foreground.webm", frames)
        print(f"Joined the takes' cut-outs -> {out / 'foreground.webm'}")
    else:
        print(f"No foreground.webm (not every take has one): for the brand background, make "
              f"the assembly's own at http://localhost:4100/matte.html?slug={slug}")
    return recording


def refuse_existing(folder: Path, recording: str, slug: str) -> None:
    """Stop rather than reuse or overwrite a recording that is already prepared."""
    users = []
    for edit_path in sorted((PUBLIC / "videos").glob("*/edit.json")):
        try:
            source = json.loads(edit_path.read_text(encoding="utf-8")).get("source")
        except (OSError, json.JSONDecodeError):
            continue
        if source == recording:
            users.append(edit_path.parent.name)
    raise SystemExit(
        f"Recording {recording} already exists in {folder}, used by: "
        f"{', '.join(users) or 'no video yet'}. Nothing was changed.\n"
        f"- A new take: run again with --recording <other-id>, e.g. --recording {slug}-2.\n"
        f"- A new edit of this recording: leave out the video file: "
        f"python scripts/prep-video.py {slug} --recording {recording}\n"
        f"- To replace this recording for all of those videos: delete {folder} first.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("video", type=Path, nargs="?",
                        help="the recorded video file; leave out to make a new edit of "
                             "the existing recording named by --recording")
    parser.add_argument("slug", help="short folder name, e.g. lmi-explained")
    parser.add_argument("--recording", metavar="ID",
                        help="recording id under public/recordings/ (default: the slug)")
    parser.add_argument("--no-clean", action="store_true",
                        help="keep the audio as recorded (skip the voice clean-up)")
    parser.add_argument("--clips", type=Path, metavar="CLIPS_JSON",
                        help="assemble the takes listed in this clips.json into the "
                             "recording <slug>-assembly")
    args = parser.parse_args()
    slug: str = args.slug
    recording: str = args.recording or slug
    for name, value in (("Slug", slug), ("Recording id", recording)):
        if not ID_PATTERN.fullmatch(value):
            raise SystemExit(f'{name} "{value}" must be lowercase letters, digits and hyphens.')

    folder = recording_dir(PUBLIC, slug, recording)
    proxy = folder / "source.mp4"
    words_path = folder / "words.json"
    if args.clips is not None:
        if args.video is not None or args.recording:
            parser.error("--clips takes no video file and no --recording: the takes are in "
                         "clips.json and the result is <slug>-assembly")
        recording = assemble(slug, args.clips)
        title = slug
    elif args.video is None:
        if not args.recording:
            parser.error("give the video file, or --recording <id> for a new edit of an "
                         "existing recording")
        if not (proxy.exists() and words_path.exists()):
            # Only a proxy with its source.from.json can be resumed (resumable()).
            how = ("Give the same video file again to finish it."
                   if proxy.with_name("source.from.json").exists() else
                   f"Its source.mp4 has no source.from.json, so it cannot be finished: ask "
                   f"Daniel to move {folder} aside, then give the video file to prepare it again."
                   if proxy.exists() else "Give the video file to prepare it.")
            raise SystemExit(f"No prepared recording in {folder} (it needs source.mp4 and "
                             f"words.json). {how}")
        title = slug
    else:
        src: Path = args.video.resolve()
        if not src.is_file():
            raise SystemExit(f"Video not found: {src}")
        if proxy.exists() and words_path.exists():
            refuse_existing(folder, recording, slug)
        title = src.stem
        folder.mkdir(parents=True, exist_ok=True)
        if not (proxy.exists() and resumable(src, proxy, not args.no_clean)):
            make_proxy(src, proxy, clean=not args.no_clean)
        words = transcribe(proxy)
        words_path.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"Wrote {words_path} ({len(words)} tokens)")
        sentence_table(words)

    edit_dir = PUBLIC / "videos" / slug
    edit_dir.mkdir(parents=True, exist_ok=True)
    edit_path = edit_dir / "edit.json"
    if edit_path.exists():
        set_source(edit_path, recording)
        print(f'\n{edit_path} already exists; only its "source" is set, to {recording}.')
    else:
        skeleton = {
            "source": recording,
            "title": title,
            "pacing": {"mode": "auto"},
            "chapters": [],
            "stats": [],
            "cues": [],
            "compliance": {"illustrativeNumbers": True},
        }
        edit_path.write_text(json.dumps(skeleton, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8")
        print(f"\nWrote skeleton {edit_path}; fill in the edit, then run "
              f"python scripts/render-video.py {slug}")


if __name__ == "__main__":
    main()
