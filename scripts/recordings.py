"""Where a video's recording files live: the Python copy of the rule in
src/mortgage/recording.ts, shared by prep-video.py, render-video.py and
migrate-assets.py.

edit.json "source" names a recording in public/recordings/<id>/ (source.mp4,
foreground.webm, words.json, original.*), shared by every slug that edits it.
Without it (unmigrated and faceless videos) they sit in public/videos/<slug>/.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

# FINHUB_PUBLIC points every script at another media root (scripts/check-clips.py
# uses a temp one); unset, it is the repo's public/.
PUBLIC = Path(os.environ.get("FINHUB_PUBLIC")
              or Path(__file__).resolve().parent.parent / "public")
ID_PATTERN = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
SLUG_PATTERN = re.compile(r"[a-z0-9_][a-z0-9._-]*")  # same rule as assertSlug in listing-prep.mjs


def check_slug(slug: str) -> str:
    """argparse type for a command-line slug: it must stay a folder under public/ and out/."""
    if not SLUG_PATTERN.fullmatch(slug) or ".." in slug:
        raise SystemExit(f'slug "{slug}" must be lowercase letters, digits, ".", "_" or "-", '
                         'with no "/", "\\" or "..".')
    return slug


def recording_dir(public: Path, slug: str, source: str | None) -> Path:
    """The folder holding the slug's source.mp4, foreground.webm and words.json."""
    return public / "recordings" / source if source else public / "videos" / slug


def read_edit(public: Path, slug: str) -> dict:
    """public/videos/<slug>/edit.json, parsed; exits with a readable message."""
    path = public / "videos" / slug / "edit.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as err:
        raise SystemExit(f"{path} not found; run prep-video.py first.") from err
    except (OSError, json.JSONDecodeError) as err:
        raise SystemExit(f"Cannot read {path}: {err}") from err


def set_source(edit_path: Path, recording_id: str) -> None:
    """Add or replace "source" in an edit.json, leaving every other byte as it is.

    Adding inserts one line after the opening brace, so Vietnamese text, key
    order and number formatting stay exactly as written.
    """
    try:
        with edit_path.open(encoding="utf-8", newline="") as f:  # keep \r\n as is
            text = f.read()
        edit = json.loads(text)
    except (OSError, json.JSONDecodeError) as err:
        raise SystemExit(f"Cannot read {edit_path}: {err}") from err
    if edit.get("source") == recording_id:
        return
    if "source" in edit:
        new = {**edit, "source": recording_id}
        text = json.dumps(new, ensure_ascii=False, indent=2) + "\n"
    else:
        brace = text.index("{")
        newline = "\r\n" if "\r\n" in text else "\n"
        rest = text[brace + 1:].lstrip(" \t\r\n")
        comma = "" if rest.startswith("}") else ","
        text = (f'{text[:brace + 1]}{newline}  "source": "{recording_id}"{comma}'
                f"{newline}  {rest}")
    if json.loads(text) != {**edit, "source": recording_id}:
        raise SystemExit(f"Adding source to {edit_path} would change it; left as it was.")
    try:
        edit_path.write_text(text, encoding="utf-8", newline="")
    except OSError as err:
        raise SystemExit(f"Cannot write {edit_path}: {err}") from err
