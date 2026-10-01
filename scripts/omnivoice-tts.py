"""Local Vietnamese voice for faceless videos: OmniVoice cloning of Daniel's own
voice, with caption timings from faster-whisper. Called by voice-video.mjs.

Runs in OmniVoice's own Python (C:/Users/Daniel/OmniVoice/.venv-cpu), not the
project's: that venv holds torch (CPU), omnivoice and faster-whisper.

  python omnivoice-tts.py clone <ref.wav> "<exact transcript>" <voice.pt>
  python omnivoice-tts.py speak <jobs.json> <voice.pt> [num_step]

jobs.json: [{"text": "...", "wav": "<out .wav>", "align": "<out .json>"}]
Each align file matches ElevenLabs' with-timestamps alignment
({characters, character_start_times_seconds, character_end_times_seconds}),
so voice-video.mjs turns it into words.json exactly as before.

The voice profile is a reusable copy of Daniel's voice: keep it outside this
public repository (voice-video.mjs refuses one inside it).
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

try:  # Norton re-signs HTTPS on Daniel's PC; trust the Windows store it's in.
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

SAMPLE_RATE = 24000
MIN_MATCH = 0.6  # below this share of words recognised, timings are guessed
MAX_WPS = 4.5  # script words per second above which a take was cut short


def fail(msg: str) -> None:
    print(f"omnivoice-tts: {msg}", file=sys.stderr)
    sys.exit(1)


def load_model():
    import torch
    from omnivoice import OmniVoice

    return OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)


def norm(word: str) -> str:
    """Compare words ignoring case, punctuation and Unicode form."""
    return re.sub(r"[^\w]", "", unicodedata.normalize("NFC", word).lower())


def word_times(script_words: list[str], heard: list[tuple[str, float, float]], total: float):
    """Give every script word a (start, end): matched from what Whisper heard,
    the rest spread by length between their matched neighbours. Returns the
    times, the share of script words matched, and whether the last script
    word was heard (a take cut short by the voice service fails that)."""
    times: list[tuple[float, float] | None] = [None] * len(script_words)
    matcher = SequenceMatcher(a=[norm(w) for w in script_words], b=[norm(w) for w, _, _ in heard], autojunk=False)
    for block in matcher.get_matching_blocks():
        for k in range(block.size):
            _, start, end = heard[block.b + k]
            times[block.a + k] = (start, end)
    matched = sum(t is not None for t in times) / max(1, len(script_words))
    last_heard = bool(times) and times[-1] is not None

    i = 0
    while i < len(times):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(times) and times[j] is None:
            j += 1
        lo = times[i - 1][1] if i > 0 else 0.0
        hi = times[j][0] if j < len(times) else total
        hi = max(hi, lo)
        weights = [max(1, len(w)) for w in script_words[i:j]]
        cursor = lo
        for k, weight in zip(range(i, j), weights):
            span = (hi - lo) * weight / sum(weights)
            times[k] = (cursor, cursor + span)
            cursor += span
        i = j
    return times, matched, last_heard


def char_alignment(text: str, times: list[tuple[float, float]]) -> dict:
    """ElevenLabs-shaped alignment: each word's characters share its span."""
    characters, starts, ends = [], [], []
    w = 0
    last_end = 0.0
    for token in re.split(r"(\s+)", text):
        if not token:
            continue
        if token.isspace():
            for ch in token:
                characters.append(ch)
                starts.append(last_end)
                ends.append(last_end)
            continue
        start, end = times[w]
        step = (end - start) / len(token)
        for k, ch in enumerate(token):
            characters.append(ch)
            starts.append(round(start + k * step, 3))
            ends.append(round(start + (k + 1) * step, 3))
        last_end = end
        w += 1
    return {
        "characters": characters,
        "character_start_times_seconds": starts,
        "character_end_times_seconds": ends,
    }


def clone(ref_audio: str, ref_text: str, out: str) -> None:
    if not Path(ref_audio).is_file():
        fail(f"reference audio not found: {ref_audio}")
    model = load_model()
    prompt = model.create_voice_clone_prompt(ref_audio=ref_audio, ref_text=ref_text)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    prompt.save(out)
    print(f"voice profile saved: {out}")


def pick_clip(words: list[tuple[str, float, float, float]]) -> tuple[float, float, str] | None:
    """The clearest stretch to clone from: whole sentences, 6-10 s (3-10 s if
    nothing longer fits), no pause over 0.6 s, best average confidence, and
    no digits if possible (a number can be read several ways, so its
    transcript is ambiguous). Words keep Whisper's own spacing ("0.4%").
    words: (text, start, end, probability). Returns (start, end, transcript)."""
    ends_sentence = lambda w: w.rstrip().endswith((".", "?", "!"))
    for low, digits_ok in ((6.0, False), (3.0, False), (6.0, True), (3.0, True)):
        best = None
        for i in range(len(words)):
            if i > 0 and not ends_sentence(words[i - 1][0]):
                continue
            for j in range(i, len(words)):
                span = words[j][2] - words[i][1]
                if span > 10.0:
                    break
                if j > i and words[j][1] - words[j - 1][2] > 0.6:
                    break
                if span >= low and ends_sentence(words[j][0]):
                    text = "".join(w[0] for w in words[i : j + 1]).strip()
                    if not digits_ok and any(ch.isdigit() for ch in text):
                        continue
                    conf = sum(w[3] for w in words[i : j + 1]) / (j - i + 1)
                    if best is None or conf > best[0]:
                        best = (conf, words[i][1], words[j][2], text)
        if best:
            return best[1], best[2], best[3]
    return None


SAMPLE = {"vi": "Xin chào, đây là giọng nói của tôi, được tạo bằng OmniVoice.",
          "en": "Hi, this is my voice, made with OmniVoice."}


def clone_from(media: str, out: str) -> None:
    """Recording (video or audio) -> voice profile, its reference clip and a sample."""
    import subprocess
    import tempfile

    import soundfile as sf
    from faster_whisper import WhisperModel

    if not Path(media).is_file():
        fail(f"recording not found: {media}")
    work = Path(tempfile.mkdtemp(prefix="clone-"))
    full = work / "full.wav"
    res = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", media,
                          "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE), str(full)], capture_output=True, text=True)
    if res.returncode != 0:
        fail(f"ffmpeg couldn't read the recording: {res.stderr.strip()[-300:]}")

    print("Transcribing the recording to find a clean sentence ...", flush=True)
    whisper = WhisperModel("large-v3", device="cpu", compute_type="int8")
    segments, info = whisper.transcribe(str(full), word_timestamps=True)
    words = [(w.word, w.start, w.end, w.probability) for s in segments for w in (s.words or [])]
    clip = pick_clip(words)
    if clip is None:
        fail("no clean 3-10 s sentence found. Record at least 10 s of clear, continuous speech and try again.")
    start, end, transcript = clip

    audio, sr = sf.read(str(full))
    ref = Path(out).with_suffix(".wav")
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    pad = int(0.1 * sr)
    sf.write(str(ref), audio[max(0, int(start * sr) - pad): int(end * sr) + pad], sr)
    print(f"Clip {start:.1f}-{end:.1f} s ({info.language}): {transcript}", flush=True)

    model = load_model()
    prompt = model.create_voice_clone_prompt(ref_audio=str(ref), ref_text=transcript)
    prompt.save(out)
    lang = "vi" if info.language == "vi" else "en"
    sample = Path(out).with_name(Path(out).stem + "-sample.wav")
    sf.write(str(sample), model.generate(text=SAMPLE[lang], voice_clone_prompt=prompt, language=lang)[0], SAMPLE_RATE)
    print(f"voice profile saved: {out}\nlisten to the sample: {sample}")


def check() -> None:
    """Load everything once: downloads the models on first run, proves the setup."""
    from faster_whisper import WhisperModel

    load_model()
    WhisperModel("large-v3", device="cpu", compute_type="int8")
    print("OmniVoice and faster-whisper are ready.")


def speak(jobs_path: str, voice_path: str, num_step: int) -> None:
    import soundfile as sf
    from faster_whisper import WhisperModel
    from omnivoice import VoiceClonePrompt

    jobs = json.loads(Path(jobs_path).read_text(encoding="utf-8"))
    if not Path(voice_path).is_file():
        fail(f"voice profile not found: {voice_path}. Make one with the clone command.")
    model = load_model()
    prompt = VoiceClonePrompt.load(voice_path)
    whisper = WhisperModel("large-v3", device="cpu", compute_type="int8")

    for n, job in enumerate(jobs, 1):
        t0 = time.perf_counter()
        audio = model.generate(text=job["text"], voice_clone_prompt=prompt, language="vi", num_step=num_step)[0]
        total = len(audio) / SAMPLE_RATE
        sf.write(job["wav"], audio, SAMPLE_RATE)
        matched, _, _ = time_audio(whisper, job, total)
        note = "" if matched >= MIN_MATCH else f" WARNING: only {matched:.0%} of words recognised, caption timing is approximate"
        print(f"{n}/{len(jobs)}: {total:.1f}s voiced in {time.perf_counter() - t0:.0f}s, {matched:.0%} words timed{note}", flush=True)


# Heard words before the script's first matched word, beyond the script
# words before it: this many means the take says something that isn't the
# script. Seen 28/09/2026: Gemini TTS read its inline style prompt aloud
# ("Excited, warm, clear... Say the brand name in English...") before the line.
MAX_EXTRA_LEAD_WORDS = 3


def extra_lead_words(script_words: list[str], heard: list[tuple[str, float, float]]) -> int:
    matcher = SequenceMatcher(a=[norm(w) for w in script_words], b=[norm(w) for w, _, _ in heard], autojunk=False)
    first = next((b for b in matcher.get_matching_blocks() if b.size), None)
    return 0 if first is None else first.b - first.a


def time_audio(whisper, job: dict, total: float) -> tuple[float, bool, int]:
    """Write job["align"] for job["wav"]; returns (share of words matched,
    whether the script's last word was heard, extra words heard before it)."""
    segments, _ = whisper.transcribe(job["wav"], language=job.get("language", "vi"), word_timestamps=True)
    heard = [(w.word.strip(), w.start, w.end) for s in segments for w in (s.words or [])]
    times, matched, last_heard = word_times(job["text"].split(), heard, total)
    Path(job["align"]).write_text(json.dumps(char_alignment(job["text"], times)), encoding="utf-8")
    return matched, last_heard, extra_lead_words(job["text"].split(), heard)


def align(jobs_path: str) -> None:
    """Caption timings for audio voiced elsewhere (Gemini TTS): jobs also carry
    "seconds" (the take's length). Runs in any Python with faster-whisper.
    A take whose last word isn't heard was cut short by the service: its
    files are deleted and the run fails, so a re-run voices it again."""
    from faster_whisper import WhisperModel

    jobs = json.loads(Path(jobs_path).read_text(encoding="utf-8"))
    whisper = WhisperModel("large-v3", device="cpu", compute_type="int8")
    cut = []
    leaked = []
    for n, job in enumerate(jobs, 1):
        total = float(job["seconds"])
        matched, last_heard, extra = time_audio(whisper, job, total)
        if extra > MAX_EXTRA_LEAD_WORDS:
            leaked.append(n)
            for f in (job["wav"], job["align"]):
                Path(f).unlink(missing_ok=True)
            continue
        wps = len(job["text"].split()) / max(total, 0.1)
        print(f"{n}/{len(jobs)}: {total:.1f}s, {matched:.0%} words timed, {wps:.1f} words/s", flush=True)
        # Cut short = the ending isn't heard AND too many script words for the
        # audio's length (Charon speaks ~3.1-3.8 words/s). An ending Whisper
        # writes as digits ("phần trăm" -> "%") fails the first test only.
        if not last_heard and wps > MAX_WPS:
            cut.append(n)
            for f in (job["wav"], job["align"]):
                Path(f).unlink(missing_ok=True)
    if leaked:
        fail(f"take(s) {leaked} say words before the script (the voice read its style prompt aloud); "
             "they were deleted. Re-run to voice them again.")
    if cut:
        fail(f"take(s) {cut} end before the script does (the voice service cut them short). Re-run to voice them again.")


def selftest() -> None:
    """Timing logic only (no model): matched words keep Whisper's times, missed
    ones share the gap by length, and alignment has one entry per character."""
    text = "Lãi suất 6,2 phần trăm, ANZ."
    heard = [("Lãi", 0.0, 0.3), ("suất", 0.3, 0.6), ("6,2%", 0.6, 1.2), ("ANZ.", 1.5, 2.0)]
    times, matched, last = word_times(text.split(), heard, 2.0)
    assert last, "ANZ. was heard, so the last word counts as heard"
    assert not word_times(["một", "hai", "ba"], [("một", 0.0, 0.4)], 1.0)[2], "a missing ending is caught"
    assert times[0] == (0.0, 0.3) and times[1] == (0.3, 0.6), times
    assert times[5] == (1.5, 2.0), times  # "ANZ." matched despite punctuation
    assert times[2] == (0.6, 1.2), times  # "6,2" matches "6,2%" once punctuation is ignored
    assert times[3][0] >= 1.2 and times[4][1] <= 1.5, times  # "phần trăm," fill the gap
    assert all(a <= b for a, b in times), times
    assert matched == 4 / 6, matched
    leak = [("Excited,", 0.0, 0.5), ("warm,", 0.5, 0.9), ("clear,", 0.9, 1.2), ("confident", 1.2, 1.6), ("and", 1.6, 1.7), ("inviting.", 1.7, 2.2)]
    assert extra_lead_words(["The", "second", "bedroom."], leak + [("The", 3.0, 3.1), ("second", 3.1, 3.4), ("bedroom.", 3.4, 3.9)]) == 6
    assert extra_lead_words(["Lãi", "suất"], [("Lãi", 0.0, 0.3), ("suất", 0.3, 0.6)]) == 0
    al = char_alignment(text, times)
    assert len(al["characters"]) == len(text) == len(al["character_start_times_seconds"])

    # pick_clip: whole sentences only, skips the long pause, prefers confidence
    w = [(" Mở", 0.0, 0.3, 0.5), (" đầu.", 0.3, 0.6, 0.5)]
    w += [(f" từ{k}", 1.0 + k * 0.5, 1.4 + k * 0.5, 0.95) for k in range(14)] + [(" hết.", 8.0, 8.4, 0.95)]
    w += [(" Sau", 12.0, 12.3, 0.99), (" ngắt.", 12.3, 12.6, 0.99)]
    start, end, text2 = pick_clip(w)
    assert (start, end) == (1.0, 8.4) and text2.startswith("từ0") and text2.endswith("hết."), (start, end, text2)
    assert pick_clip([(" Ngắn.", 0.0, 0.5, 0.9)]) is None

    # prefers a digit-free sentence, and keeps Whisper's spacing ("0.4%")
    nums = [(" Trả", 0.0, 0.5, 0.99), (" 0", 0.5, 1.0, 0.99), (".4%", 1.0, 6.5, 0.99), (" nhé.", 6.5, 7.0, 0.99)]
    plain = [(" Câu", 8.0, 8.5, 0.8)] + [(" chữ", 8.5 + k * 0.5, 9.0 + k * 0.5, 0.8) for k in range(12)] + [(" xong.", 14.5, 15.0, 0.8)]
    assert pick_clip(nums + plain)[2].startswith("Câu"), pick_clip(nums + plain)
    assert pick_clip(nums)[2] == "Trả 0.4% nhé.", pick_clip(nums)
    print("selftest ok")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["selftest"]:
        selftest()
    elif len(args) == 2 and args[0] == "align":
        align(args[1])
    elif args == ["check"]:
        check()
    elif len(args) == 3 and args[0] == "clone-from":
        clone_from(args[1], args[2])
    elif len(args) == 4 and args[0] == "clone":
        clone(args[1], args[2], args[3])
    elif len(args) in (3, 4) and args[0] == "speak":
        speak(args[1], args[2], int(args[3]) if len(args) == 4 else 32)
    else:
        fail(__doc__.split("\n\n")[1])
