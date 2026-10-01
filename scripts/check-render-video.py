"""Checks render-video.py's stamp and publish hand-off, and listing-render.py's, with
every command stubbed (no node, ffmpeg or Remotion run).
    python scripts/check-render-video.py  (exit 1 on failure)"""
import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
failed = 0


def check(ok: bool, what: str) -> None:
    global failed
    failed += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {what}")


def load(name: str):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), HERE / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def render(tmp: Path, *, hash_fails=False, publish_code=0, probe_exits=False) -> tuple[str, int | None]:
    """render-video.py main() on a temp root; returns (stdout, exit code or None)."""
    rv = load("render-video")
    rv.ROOT = rv.PUBLIC = tmp

    def run(cmd, what, capture=False):
        if what == "on-screen inputs hash" and hash_fails:
            raise SystemExit("on-screen inputs hash failed (exit 1).")
        return "HASH\n"

    rv.run = run
    rv.normalize_loudness = lambda path: None
    rv.duration_s = lambda path: 10.0
    def probe_fails(path):  # as run() does when ffmpeg's volumedetect fails
        raise SystemExit("mean volume failed (exit 1).")

    if probe_exits:
        rv.mean_volume_db = probe_fails
    rv.read_edit = lambda public, slug: {"background": "vignette"}
    rv.subprocess = types.SimpleNamespace(run=lambda cmd, **kw: types.SimpleNamespace(
        returncode=publish_code if "publish-video.mjs" in " ".join(cmd) else 0))
    sys.argv = ["render-video.py", "_test-r"]
    out, code = io.StringIO(), None
    with contextlib.redirect_stdout(out):
        try:
            rv.main()
        except SystemExit as err:
            code = err.code
    return out.getvalue(), code


with tempfile.TemporaryDirectory() as t:
    tmp = Path(t)
    stamp = tmp / "out" / "videos" / "_test-r" / "_test-r.inputs"
    # The output files are not there, so listing them fails: the stamp is still written.
    out, code = render(tmp)
    check(code is None and stamp.read_text() == "HASH\n",
          f"a failure listing the outputs still writes the stamp (exit {code}, stamp {stamp.read_text()!r})")
    check("could not list the output files" in out, "and reports the failure")
    # F3 of round 3: the files are there but a probe fails through run(), i.e. SystemExit.
    for name in ("_test-r.mp4", "_test-r-mobile.mp4", "_test-r-feed.mp4"):
        (stamp.parent / name).write_bytes(b"x")
    stamp.write_text("OLD\n")
    out, code = render(tmp, probe_exits=True)
    check(code is None and stamp.read_text() == "HASH\n" and "mean volume failed" in out,
          f"a probe failing with SystemExit in the listing still writes the stamp (exit {code}, stamp {stamp.read_text()!r})")
    for name in ("_test-r.mp4", "_test-r-mobile.mp4", "_test-r-feed.mp4"):
        (stamp.parent / name).unlink()
    # A failed inputs hash leaves the last good render's stamp, not "rendering".
    stamp.write_text("GOOD\n")
    out, code = render(tmp, hash_fails=True)
    check(code is not None and stamp.read_text() == "GOOD\n",
          f"a failed inputs hash keeps the last render's stamp (got {stamp.read_text()!r})")
    # Exit 4 from publish-video (no recorded owner): exit 3 with the --claim command.
    out, code = render(tmp, publish_code=4)
    check(code == 3 and "node scripts/publish-video.mjs _test-r --force --claim" in out,
          f"publish exit 4: exit 3 and the --claim command (exit {code})")
    out, code = render(tmp, publish_code=1)
    check(code == 3 and "node scripts/publish-video.mjs _test-r --force" in out and "--claim" not in out,
          f"publish exit 1: exit 3 and --force, no --claim (exit {code})")

    # listing-render.py: the same hand-off for publish-listing.
    for publish_code, want in ((4, "--force --claim"), (1, "--force")):
        lr = load("listing-render")
        lr.ROOT = tmp
        base = tmp / "public" / "listings" / "_test-l"
        base.mkdir(parents=True, exist_ok=True)
        (base / "script.json").write_text(json.dumps({"scenes": []}))
        (base / "words-vi.json").write_text("[]")
        lr.rv.run = lambda cmd, what, capture=False: ""
        lr.render = lambda slug, lang, scenes, out_dir: None
        lr.subprocess = types.SimpleNamespace(run=lambda cmd, **kw: types.SimpleNamespace(returncode=publish_code))
        sys.argv = ["listing-render.py", "_test-l"]
        out, code = io.StringIO(), None
        with contextlib.redirect_stdout(out):
            try:
                lr.main()
            except SystemExit as err:
                code = err.code
        text = out.getvalue()
        check(code == 3 and f"node scripts/publish-listing.mjs _test-l {want}" in text
              and ("--claim" in text) == (publish_code == 4),
              f"listing publish exit {publish_code}: exit 3 and `{want}`")

if failed:
    sys.exit(f"render-video check: {failed} failed")
print("render-video ok")
