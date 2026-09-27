"""Find what's trending, or research a topic, before writing a faceless video script.

    python scripts/research.py trending [--days 7]
    python scripts/research.py topic "<query>" --slug <slug> [--days 30]
    python scripts/research.py read <url> --slug <slug>
    python scripts/research.py transcript <youtube-url> --slug <slug> [--lang vi]
    python scripts/research.py selftest

Sources are free and need no login: Google News RSS in English (Australia) and
Vietnamese, Reddit's RSS for the Australian money subreddits (one request per
run: a second one within seconds gets a 429), YouTube search and subtitles
(yt-dlp), and any web page as Markdown (Jina Reader). The tools come from
Agent-Reach (MIT, github.com/Panniantong/Agent-Reach); the ranking ideas
(entity grounding, syndicated-story clustering, views per day, week-over-week
memory, saying what's missing) from last30days (MIT, github.com/mvanhorn/last30days-skill).
Facebook has no public search. Jina can't open Google News links: read the
story at the publisher, or better, the primary source.

Headlines, posts and videos are leads, not facts. A number in the script comes
from a page saved with `read` and is cited in facts.json by that file's name.
Output goes to out/ (not committed: the saved pages are other people's work):
out/research/ for trending, out/videos/<slug>/research/ for the rest.

Needs: python -m pip install yt-dlp feedparser
"""

from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Callable

try:  # Norton re-signs HTTPS on Daniel's PC; trust the Windows store it's in.
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "finhub-video-research/1.0"}
# Reddit's RSS answers a browser user agent; the same request as a bot gets 429.
BROWSER_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                            "(KHTML, like Gecko) Chrome/126 Safari/537.36"}
# What a Vietnamese-Australian home buyer or borrower is reading about. English queries say
# "Australia" (gl=AU alone returns US/UK/India stories); the Vietnamese ones are quoted.
NEWS_EN = ["RBA cash rate", "home loan interest rates Australia", "first home buyer Australia",
           "property prices Australia", "mortgage stress Australia", "APRA lending"]
NEWS_VI = ['"lãi suất" "Úc"', '"RBA"']
YOUTUBE_VI = ["lãi suất Úc", "vay mua nhà Úc", "mua nhà ở Úc"]
SUBREDDITS = ["AusFinance", "AusProperty", "FirstHomeBuyers", "AusPropertyChat"]

# Entity grounding: a story counts only if its title names Australia (or an Australian
# institution, bank or city) as a whole word, or it comes from a .au site. Google matches
# Vietnamese without diacritics, so "Úc" also finds "ký ức"; whole-word "úc" doesn't.
AU_WORDS = {"australia", "australian", "australians", "aussie", "aussies", "úc", "rba", "apra", "asic",
            "ato", "abs", "commbank", "cba", "anz", "nab", "westpac", "macquarie", "sydney", "melbourne",
            "brisbane", "perth", "adelaide", "hobart", "canberra", "darwin", "geelong", "nsw", "queensland",
            "victoria", "tasmania", "victorian", "queenslanders"}
STOP = {"the", "a", "an", "to", "of", "in", "on", "for", "and", "or", "is", "are", "as", "at", "by", "with",
        "its", "it", "this", "that", "from", "be", "will", "after", "into", "your", "you", "s"}
VI_LETTERS = re.compile(r"[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]", re.I)
SAME_STORY = 0.6  # word overlap (Jaccard) above which two headlines are one story
# What the brief can't say when a source fails (last30days: say what's missing).
MISSING = {"news-en": "no Australian news coverage",
           "news-vi": "no Vietnamese-language news angle",
           "reddit": "no borrower voice (the words people use, best for hooks)",
           "youtube": "no view of what Vietnamese creators are making"}


def fetch(url: str, timeout: int = 30, headers: dict | None = None) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or UA), timeout=timeout) as r:
        return r.read()


def words(text: str) -> set[str]:
    return {w for w in re.findall(r"\w+", text.lower()) if w not in STOP}


def grounded(item: dict) -> bool:
    return item.get("site", "").endswith(".au") or bool(words(item["title"]) & AU_WORDS)


def same_story(a: set[str], b: set[str]) -> bool:
    return bool(a | b) and len(a & b) / len(a | b) >= SAME_STORY


def news(query: str, days: int, vi: bool) -> list[dict]:
    """Google News articles for `query` in the last `days` days, newest first."""
    import feedparser

    loc = "hl=vi&gl=VN&ceid=VN:vi" if vi else "hl=en-AU&gl=AU&ceid=AU:en"
    q = urllib.parse.quote(f"{query} when:{days}d")
    feed = feedparser.parse(fetch(f"https://news.google.com/rss/search?q={q}&{loc}"))
    items = []
    for e in feed.entries:
        outlet = e.get("source", {}).get("title", "")
        title = e.title.removesuffix(f" - {outlet}") if outlet else e.title
        p = e.get("published_parsed")
        # The Google News link can't be read (see above); the outlet's site is where to read it.
        site = urllib.parse.urlparse(e.get("source", {}).get("href", "")).netloc.removeprefix("www.")
        items.append({"title": title, "outlet": outlet or site, "site": site,
                      "date": f"{p.tm_year}-{p.tm_mon:02}-{p.tm_mday:02}" if p else ""})
    return sorted(items, key=lambda i: i["date"], reverse=True)


def stories(items: list[dict]) -> list[dict]:
    """Merge syndicated copies (one story, many outlets); biggest story first, then newest."""
    groups: list[dict] = []
    for i in items:
        w = words(i["title"])
        match = next((g for g in groups if same_story(w, g["words"])), None)
        if match is None:
            groups.append({**i, "words": w, "outlets": [i["outlet"]]})
        elif i["outlet"] not in match["outlets"]:
            match["outlets"].append(i["outlet"])
    return sorted(groups, key=lambda g: (len(g["outlets"]), g["date"]), reverse=True)


def mark(story: dict, prev: list[dict], prev_date: str) -> str:
    if not prev_date:
        return ""
    return f" (also in the {prev_date} brief)" if any(same_story(story["words"], p["words"]) for p in prev) else " · NEW"


def news_block(query: str, items: list[dict], top: int, prev: list[dict], prev_date: str) -> tuple[list[str], list[dict]]:
    on = [i for i in items if grounded(i)]
    found = f"{len(items)}{'+' if len(items) >= 100 else ''}"  # Google News returns at most 100
    st = stories(on)
    out = [f"### {query}: {len(st)} stories ({found} articles, {len(items) - len(on)} not about Australia dropped)"]
    for s in st[:top]:
        o = s["outlets"]
        who = f"{len(o)} outlets: {', '.join(o[:4])}{'…' if len(o) > 4 else ''}" if len(o) > 1 else o[0]
        out.append(f"- {s['date']} · {who} · {s['title']}{mark(s, prev, prev_date)}")
    return out, st


def reddit(query: str | None, days: int) -> list[dict]:
    """Top posts in the Australian money subreddits: one RSS request, one retry on a 429."""
    import feedparser

    multi, t = "+".join(SUBREDDITS), "week" if days <= 7 else "month"
    url = (f"https://www.reddit.com/r/{multi}/search.rss?q={urllib.parse.quote(query)}&restrict_sr=on&sort=top&t={t}"
           if query else f"https://www.reddit.com/r/{multi}/top.rss?t={t}&limit=25")
    for attempt in (1, 2):
        try:
            feed = feedparser.parse(fetch(url, headers=BROWSER_UA))
            break
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == 2:
                raise
            time.sleep(30)  # Reddit's RSS limit is per few minutes; 10 s wasn't enough
    return [{"title": e.title, "sub": (e.get("tags") or [{}])[0].get("term", ""),
             "date": e.get("updated", "")[:10], "link": e.link} for e in feed.entries]


def reddit_md(posts: list[dict], top: int) -> list[str]:
    out = [f"### Reddit ({', '.join('r/' + s for s in SUBREDDITS)}): {len(posts)} top posts"]
    out += [f"- {p['date']} · r/{p['sub']} · {p['title']} ({p['link']})" for p in posts[:top]]
    return out


def views_per_day(views: int, uploaded: str, today: date) -> float | None:
    if not uploaded:
        return None
    return views / max(1, (today - date.fromisoformat(uploaded)).days)


def youtube(query: str, days: int, n: int = 30, dated: int = 5) -> tuple[list[dict], int]:
    """YouTube uploads in the window (YouTube's own filter), fastest-growing first, and how many
    were dropped. With the date filter YouTube's relevance collapses (Vietnamese dramas for
    "vay mua nhà Úc"), so a title must name Australia and, for a Vietnamese query, be Vietnamese.
    Search gives no upload dates, so only the `dated` most viewed get one (~2.4 s each)."""
    import yt_dlp

    # sp = YouTube's "upload date: this week / this month" filter.
    sp = "&sp=EgIIAw%253D%253D" if days <= 7 else "&sp=EgIIBA%253D%253D" if days <= 31 else ""
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}{sp}"
    with yt_dlp.YoutubeDL({"quiet": True, "extract_flat": True, "no_warnings": True, "playlistend": n}) as y:
        entries = y.extract_info(url, download=False)["entries"]
    vi = bool(VI_LETTERS.search(query))
    found = [{"title": e.get("title", ""), "channel": e.get("channel") or "", "views": e.get("view_count") or 0,
              "link": e.get("url", ""), "date": ""} for e in entries]
    # The channel counts too: Viet TV Australia's titles often don't say "Úc".
    vids = sorted((v for v in found if grounded({"title": f"{v['title']} {v['channel']}"}) and (not vi or VI_LETTERS.search(v["title"]))),
                  key=lambda v: v["views"], reverse=True)
    today = date.today()
    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as y:
        for v in vids[:dated]:
            try:
                info = y.extract_info(v["link"], download=False, process=False)
                d = info.get("upload_date") or ""
                v["date"] = f"{d[:4]}-{d[4:6]}-{d[6:]}" if len(d) == 8 else ""
                v["views"] = info.get("view_count") or v["views"]
            except Exception:  # an undated video still shows, ranked after the dated ones
                pass
    for v in vids:
        v["per_day"] = views_per_day(v["views"], v["date"], today)
    return sorted(vids, key=lambda v: (v["per_day"] is not None, v["per_day"] or v["views"]),
                  reverse=True), len(found) - len(vids)


def youtube_md(query: str, found: tuple[list[dict], int], top: int) -> list[str]:
    vids, dropped = found
    out = [f"### YouTube: {query}: {len(vids)} videos uploaded in the window, fastest-growing first "
           f"({dropped} off-topic dropped)"]
    for v in vids[:top]:
        rate = f"{v['per_day']:,.0f} views/day · " if v["per_day"] is not None else ""
        when = f"{v['date']} · " if v["date"] else ""
        out.append(f"- {rate}{v['views']:,} views · {when}{v['channel']} · {v['title']} ({v['link']})")
    return out


Section = tuple[str, str, Callable[[], list[str]]]


def gather(sections: list[Section]) -> tuple[list[list[str]], list[tuple[str, str, str]], list[tuple[str, str]]]:
    """Run each source; a failure or an empty answer is reported in the brief, never silently dropped."""
    blocks, failed, empty = [], [], []
    for name, kind, run in sections:
        try:
            block = run()
            if len(block) == 1:  # a heading and nothing under it
                empty.append((name, kind))
            blocks.append(block)
        except Exception as err:  # one dead source shouldn't lose the rest
            failed.append((name, kind, str(err)))
            blocks.append([f"### {name}: FAILED ({err})"])
    return blocks, failed, empty


def coverage(failed: list[tuple[str, str, str]], empty: list[tuple[str, str]], total: int) -> list[str]:
    if not failed and not empty:
        return [f"Coverage: all {total} sources answered."]
    out = [f"Coverage: {total - len(failed)}/{total} sources answered. What this brief can't tell you:"]
    out += [f"- {name} failed ({err[:80]}): {MISSING[kind]}" for name, kind, err in failed]
    out += [f"- {name} found nothing: {MISSING[kind]}" for name, kind in empty]
    return out


def save(path: Path, head: list[str], blocks: list[list[str]], failed: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(head) + "\n\n" + "\n\n".join("\n".join(b) for b in blocks) + "\n", encoding="utf-8")
    print(f"{path.relative_to(ROOT)}  ({len(blocks) - len(failed)}/{len(blocks)} sources answered)")
    if len(failed) == len(blocks):
        raise SystemExit("Every source failed: check the internet connection.")


def stamp() -> str:
    return datetime.now().astimezone().strftime("%d/%m/%Y %H:%M")


def story_count(block: list[str]) -> int:
    m = re.search(r": (\d+) stories \(", block[0])
    return int(m.group(1)) if m else -1


def previous_brief(folder: Path, today: str) -> tuple[str, list[dict]]:
    """The latest earlier trending brief's stories, for NEW / seen-before / gone quiet."""
    older = sorted(p for p in folder.glob("*-trending.json") if p.name[:10] < today)
    if not older:
        return "", []
    prev = json.loads(older[-1].read_text(encoding="utf-8"))
    return older[-1].name[:10], [{**s, "words": words(s["title"])} for s in prev]


def gone_quiet(prev: list[dict], now: list[dict], top: int = 5) -> list[dict]:
    """Stories the last brief carried in 3+ outlets that nobody is running now."""
    return [p for p in sorted(prev, key=lambda p: len(p["outlets"]), reverse=True)
            if len(p["outlets"]) >= 3 and not any(same_story(p["words"], s["words"]) for s in now)][:top]


def cmd_trending(days: int) -> None:
    folder, today = ROOT / "out" / "research", f"{date.today():%Y-%m-%d}"
    prev_date, prev = previous_brief(folder, today)
    found: list[dict] = []

    def news_run(q: str, vi: bool) -> Callable[[], list[str]]:
        def run() -> list[str]:
            lines, st = news_block(q, news(q, days, vi), 5, prev, prev_date)
            found.extend(st)
            return lines
        return run

    sections: list[Section] = [(q, "news-en", news_run(q, False)) for q in NEWS_EN]
    sections += [(q, "news-vi", news_run(q, True)) for q in NEWS_VI]
    sections += [("Reddit", "reddit", lambda: reddit_md(reddit(None, days), 10))]
    sections += [(f"YouTube: {q}", "youtube", lambda q=q: youtube_md(q, youtube(q, days), 5)) for q in YOUTUBE_VI]
    blocks, failed, empty = gather(sections)
    blocks.sort(key=story_count, reverse=True)  # busiest news first; Reddit and YouTube after (stable)
    if prev_date:
        quiet = gone_quiet(prev, found)
        blocks.append([f"### Gone quiet since the {prev_date} brief"] +
                      ([f"- {p['date']} · {len(p['outlets'])} outlets · {p['title']}" for p in quiet] or ["- nothing"]))
    head = [f"# Trending for Finance Hub, last {days} days (fetched {stamp()})", "",
            "More stories (syndicated copies merged) = more attention this week; each story is ranked by how many "
            "outlets ran it. Leads only: facts come from `read` on the primary source.",
            "", *coverage(failed, empty, len(sections)),
            "", f"Compared with the {prev_date} brief: NEW = not in it." if prev_date else "First brief: nothing to compare yet."]
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{today}-trending.json").write_text(json.dumps(
        [{k: s[k] for k in ("title", "date", "outlets")} for s in found], ensure_ascii=False, indent=1), encoding="utf-8")
    save(folder / f"{today}-trending.md", head, blocks, failed)


def preflight(query: str) -> list[str]:
    """Keyword traps (last30days Step 0.45), for the query as typed."""
    warn = []
    if re.search(r"\d", query):
        warn.append("the query has a number: numbers pull in unrelated stories (dates, prices). Leave it out "
                    "unless it's the subject (e.g. '4.35%').")
    if re.search(r"\b(how to|what is|guide to|explain)\b|\bcách\b|là gì", query, re.I):
        warn.append("tutorial wording: news and posts don't say 'how to'; search the subject itself "
                    "('refinance fees', not 'how to refinance').")
    return warn


def cmd_topic(query: str, slug: str, days: int) -> None:
    warn = preflight(query)
    for w in warn:
        print(f"preflight: {w}")
    blocks, failed, empty = gather([
        ("News (English, Australia)", "news-en", lambda: news_block("News (English, Australia)",
                                                                    news(query, days, False), 15, [], "")[0]),
        ("News (Vietnamese)", "news-vi", lambda: news_block("News (Vietnamese)", news(query, days, True), 15, [], "")[0]),
        ("Reddit", "reddit", lambda: reddit_md(reddit(query, days), 15)),
        (f"YouTube: {query}", "youtube", lambda: youtube_md(query, youtube(query, days), 10))])
    head = [f"# Research: {query} (last {days} days, fetched {stamp()})", "", *coverage(failed, empty, 4),
            *[f"Preflight: {w}" for w in warn]]
    save(ROOT / "out" / "videos" / slug / "research" / "sources.md", head, blocks, failed)


def page_name(url: str) -> str:
    u = urllib.parse.urlparse(url)
    return re.sub(r"[^a-z0-9]+", "-", f"{u.netloc}{u.path}".lower()).strip("-")[:80] + ".md"


def cmd_read(url: str, slug: str) -> None:
    if "news.google.com" in url:
        raise SystemExit("Google News links can't be read: open the story at the publisher (or the RBA/ABS/lender page).")
    try:
        text = fetch(f"https://r.jina.ai/{url}", timeout=60).decode("utf-8")
    except Exception as err:
        raise SystemExit(f"Couldn't read {url}: {err}. Try again later, or save the page from the browser.") from err
    path = ROOT / "out" / "videos" / slug / "research" / page_name(url)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"Source: {url}\nFetched: {stamp()}\n\n{text}", encoding="utf-8")
    print(f"{path.relative_to(ROOT)}  ({len(text.split()):,} words). Cite it in facts.json as doc \"{path.name}\".")


def vtt_text(vtt: str) -> str:
    """Subtitle file → plain text: no header, timings or tags, auto-sub repeats removed."""
    lines: list[str] = []
    for line in vtt.splitlines():
        line = re.sub(r"<[^>]+>", "", line).strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        if not lines or lines[-1] != line:
            lines.append(line)
    return "\n".join(lines)


def trust_windows_store_for_curl(out: Path) -> None:
    """yt-dlp fetches subtitles with curl_cffi, which ignores truststore and only trusts
    certifi, so Norton's re-signed HTTPS fails. curl_cffi reads CURL_CA_BUNDLE: point it at
    certifi plus the Windows root store."""
    if not hasattr(ssl, "enum_certificates") or os.environ.get("CURL_CA_BUNDLE"):
        return
    import certifi

    pems = [Path(certifi.where()).read_text(encoding="ascii")]
    pems += [ssl.DER_cert_to_PEM_cert(der) for store in ("ROOT", "CA")
             for der, enc, _ in ssl.enum_certificates(store) if enc == "x509_asn"]
    bundle = out / "ca-bundle.pem"
    bundle.write_text("\n".join(pems), encoding="ascii")
    os.environ["CURL_CA_BUNDLE"] = str(bundle)


def cmd_transcript(url: str, slug: str, lang: str) -> None:
    import yt_dlp

    out = ROOT / "out" / "videos" / slug / "research"
    out.mkdir(parents=True, exist_ok=True)
    trust_windows_store_for_curl(ROOT / "out")
    # One language: asking for a second track (YouTube's machine translation) got a 429.
    opts = {"quiet": True, "no_warnings": True, "noprogress": True, "skip_download": True, "writesubtitles": True,
            "writeautomaticsub": True, "subtitleslangs": [lang], "subtitlesformat": "vtt",
            "outtmpl": str(out / "yt-%(id)s.%(ext)s")}
    try:
        with yt_dlp.YoutubeDL(opts) as y:
            info = y.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as err:
        raise SystemExit(f"Couldn't get subtitles for {url}: {err}") from err
    subs = sorted(out.glob(f"yt-{info['id']}*.vtt"))
    if not subs:
        raise SystemExit(f"{url} has no '{lang}' subtitles (try --lang en).")
    for vtt in subs:
        txt = vtt.with_suffix(".txt")
        txt.write_text(f"Source: {url}\nTitle: {info.get('title', '')}\nFetched: {stamp()}\n\n"
                       + vtt_text(vtt.read_text(encoding="utf-8")), encoding="utf-8")
        vtt.unlink()
        print(txt.relative_to(ROOT))


def selftest() -> None:
    vtt = ("WEBVTT\nKind: captions\n\n00:00:01.000 --> 00:00:02.000\n<c>lãi suất</c> tăng\n\n"
           "00:00:02.000 --> 00:00:03.000\nlãi suất tăng\nthêm 0,25%\n")
    assert vtt_text(vtt) == "lãi suất tăng\nthêm 0,25%", vtt_text(vtt)
    assert page_name("https://www.rba.gov.au/media-releases/2026/mr-26-19.html") == \
        "www-rba-gov-au-media-releases-2026-mr-26-19-html.md"
    # Grounding: whole words, so "ký ức" isn't "Úc"; a .au site counts; US/UK stories don't.
    assert grounded({"title": "Đô la Úc: Kỳ vọng RBA tăng lãi suất", "site": ""})
    assert not grounded({"title": "Ký ức một thời hoa lửa", "site": "baodaklak.vn"})
    assert grounded({"title": "Rates set to rise", "site": "smh.com.au"})
    assert not grounded({"title": "Mortgage rates break past 7% as bond yields surge", "site": "npr.org"})
    # Clustering: syndicated copies merge (biggest first); a different story stays separate.
    items = [{"title": "'Pick up the phone': Simple step to beat looming RBA interest rate hike", "outlet": "Herald Sun",
              "date": "2026-09-26"},
             {"title": "Pick up the phone: simple step to beat looming RBA interest rate hike", "outlet": "Adelaide Now",
              "date": "2026-09-26"},
             {"title": "Rates nightmare: Experts tip double RBA hike before Christmas", "outlet": "realestate.com.au",
              "date": "2026-09-25"}]
    st = stories(items)
    assert [len(s["outlets"]) for s in st] == [2, 1], st
    # Week over week: seen before vs NEW, and a big story that stopped running is "gone quiet".
    prev = [{"title": "Rates nightmare: experts tip double RBA hike before Christmas", "outlets": ["a", "b", "c"],
             "date": "2026-09-19", "words": words("Rates nightmare: experts tip double RBA hike before Christmas")},
            {"title": "Bank profits hit record", "outlets": ["a", "b", "c"], "date": "2026-09-18",
             "words": words("Bank profits hit record")}]
    assert mark(st[1], prev, "2026-09-20") == " (also in the 2026-09-20 brief)"
    assert mark(st[0], prev, "2026-09-20") == " · NEW"
    assert mark(st[0], [], "") == ""
    assert [p["title"] for p in gone_quiet(prev, st)] == ["Bank profits hit record"]
    assert views_per_day(52926, "2026-09-24", date(2026, 9, 27)) == 52926 / 3
    assert views_per_day(10, "2026-09-27", date(2026, 9, 27)) == 10  # uploaded today: not divided by 0
    assert views_per_day(10, "", date(2026, 9, 27)) is None
    assert coverage([], [], 4) == ["Coverage: all 4 sources answered."]
    assert "no borrower voice" in coverage([("Reddit", "reddit", "HTTP Error 429")], [], 4)[1]
    assert coverage([], [("News (Vietnamese)", "news-vi")], 4)[1] ==         "- News (Vietnamese) found nothing: no Vietnamese-language news angle"
    assert grounded({"title": "TIN 1PM 25-09-2026: Thất nghiệp tăng", "site": ""}) is False
    assert grounded({"title": "TIN 1PM 25-09-2026: Thất nghiệp tăng Viet TV Australia"})
    assert VI_LETTERS.search("lãi suất Úc") and not VI_LETTERS.search("Aussies Are PRISONERS To Their Mortgage")
    assert len(preflight("how to refinance in 2026")) == 2 and preflight("refinance fees") == []
    blocks = [["### YouTube: x"], ["### a: 3 stories (9 articles, 0 not about Australia dropped)"],
              ["### b: FAILED (x)"], ["### c: 40 stories (100+ articles, 2 not about Australia dropped)"]]
    assert [b[0][:6] for b in sorted(blocks, key=story_count, reverse=True)][:2] == ["### c:", "### a:"]
    print("research.py selftest: OK")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("trending")
    t.add_argument("--days", type=int, default=7)
    t = sub.add_parser("topic")
    t.add_argument("query")
    t.add_argument("--slug", required=True)
    t.add_argument("--days", type=int, default=30)
    for name in ("read", "transcript"):
        t = sub.add_parser(name)
        t.add_argument("url")
        t.add_argument("--slug", required=True)
    t.add_argument("--lang", default="vi")
    sub.add_parser("selftest")
    a = p.parse_args()
    if getattr(a, "slug", None) and not re.fullmatch(r"[a-z0-9-]+", a.slug):
        raise SystemExit(f"slug '{a.slug}' must be kebab-case ASCII (a-z, 0-9, -).")
    {"trending": lambda: cmd_trending(a.days), "topic": lambda: cmd_topic(a.query, a.slug, a.days),
     "read": lambda: cmd_read(a.url, a.slug), "transcript": lambda: cmd_transcript(a.url, a.slug, a.lang),
     "selftest": selftest}[a.cmd]()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
