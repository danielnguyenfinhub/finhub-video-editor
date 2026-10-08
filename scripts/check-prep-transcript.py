"""Self-check for prep-video.py's invented_text_signs() (synthetic data only).

    python scripts/check-prep-transcript.py

Fails (non-zero exit) if the warning stops firing on a Whisper-style made-up transcript
or starts firing on a normal talk. Needs no model, audio or recording.
"""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("prep", Path(__file__).with_name("prep-video.py"))
prep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep)


def words_from(texts: list[str], start_ms: int, step_ms: int, length_ms: int) -> list[dict]:
    return [{"text": " " + t, "startMs": start_ms + i * step_ms,
             "endMs": start_ms + i * step_ms + length_ms, "timestampMs": None, "confidence": 0.9}
            for i, t in enumerate(texts)]


# 1. The real failure: the stock outro repeated across a 136 s file (75 words, ~0.55/s).
outro = "Hãy subscribe cho kênh Ghiền Mì Gõ Để không bỏ lỡ những video hấp dẫn".split()
made_up = words_from((outro * 6)[:75], 6980, 1660, 600)
signs = prep.invented_text_signs(made_up, 136.0)
assert any("repeat 3+ times" in s for s in signs), signs
assert any("only 75 words" in s for s in signs), signs

# 2. A normal talk: 500 different words at about 3.7 words a second.
normal = words_from([f"từ{i}" for i in range(500)], 2000, 270, 220)
assert prep.invented_text_signs(normal, 136.0) == [], prep.invented_text_signs(normal, 136.0)

# 3. The trailing failure: a good talk, then 14 outro words packed into 320 ms.
packed = normal[:300] + words_from(outro[:10] + outro[:4], 90000, 23, 0)
signs = prep.invented_text_signs(packed, 91.0)
assert any("burst of zero-length words" in s for s in signs), signs

# 4. A short clip is not judged on words per second (too little audio to say).
assert prep.invented_text_signs(words_from(["một", "hai"], 0, 500, 400), 5.0) == []

# 5. Real retakes: one 5-word phrase said four times, and eight fast words in a second
#    (both seen in real talks) must NOT warn.
phrase = "tụi mình chỉ giải quyết".split()
retakes = words_from([f"a{i}" for i in range(50)] + phrase * 4 + [f"b{i}" for i in range(200)],
                     2000, 270, 220)
assert prep.invented_text_signs(retakes, 90.0) == [], prep.invented_text_signs(retakes, 90.0)
fast = words_from([f"c{i}" for i in range(8)], 60000, 110, 90)  # 8 words inside one second
assert prep.invented_text_signs(normal[:200] + fast, 91.0) == []

print("check-prep-transcript: ok")
