// Review & tweak page for MortgageReel videos: watch a reel in a <Player>,
// change its design, grade, chapter transitions and item timings, save
// edit.json and start the render. Every change previews immediately; the
// reel is built with the same buildReel() as the render, so RG 234 and schema
// errors show here before anything is saved. Every edit is undoable
// (Ctrl+Z), unsaved changes survive a reload (kept in this browser, only while
// edit.json is unchanged on disk), and the keyboard drives the playhead and
// the selected timeline item (see the Shortcuts list on the page).
import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DESIGN_IDS, DEFAULT_DESIGN } from "../src/designs";
import { MortgageReel, buildReel } from "../src/mortgage/MortgageReel";
import { recordingPath } from "../src/mortgage/recording";
import { LOOKS, editSchema, outFrameOf, type EditJson } from "../src/mortgage/schema";
import { TALK_START_FRAME, TRANSITIONS } from "../src/mortgage/timeline";
import { shiftTimes } from "./shift";
import { Timeline, type TimelineApi, type TimelineItem } from "./Timeline";
import {
  ZOOM_STEP,
  commit as commitEdit,
  redo as redoHistory,
  startHistory,
  undo as undoHistory,
  type History,
} from "./timelineMath";

const FPS = 30;
const NUDGE_MS = 500;
const draftKey = (slug: string) => `finhub-review-draft:${slug}`;

type Status = { tone: "ok" | "bad" | "info"; text: string } | null;
type Item = TimelineItem;

const getJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

const SHORTCUTS: [string, string][] = [
  ["Space", "play / pause"],
  ["← →", "nudge the selected item 0.5 s; with nothing selected, step the playhead 1 frame"],
  ["Shift + ← →", "nudge the selected item 1 frame; with nothing selected, step the playhead 1 s"],
  ["Home / End", "jump to the start / end"],
  ["Delete", "remove the selected item (Ctrl+Z brings it back)"],
  ["Esc", "deselect"],
  ["Ctrl + Z", "undo"],
  ["Ctrl + Shift + Z, Ctrl + Y", "redo"],
  ["Ctrl + S", "save edit.json"],
  ["Ctrl + + / − / 0", "zoom the timeline in / out / to fit"],
  ["Ctrl + wheel", "zoom toward the pointer"],
  ["Shift + wheel", "scroll the timeline sideways"],
  ["Alt while dragging", "don't snap"],
];

const clock = (frame: number) => {
  const s = Math.max(0, Math.round(frame / FPS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const App = () => {
  const player = useRef<PlayerRef>(null);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [slug, setSlug] = useState("");
  const [words, setWords] = useState<unknown>(null);
  const [saved, setSaved] = useState<EditJson | null>(null);
  // The working copy, with its undo/redo history (whole-document snapshots).
  const [hist, setHist] = useState<History<EditJson | null>>(startHistory(null));
  const draft = hist.present;
  const [selected, setSelected] = useState<string | null>(null);
  const tlApi = useRef<TimelineApi | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [rendering, setRendering] = useState(false);
  const [renderLog, setRenderLog] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    getJson("/api/videos")
      .then((list: string[]) => {
        setSlugs(list);
        setSlug(list[0] ?? "");
      })
      .catch((e) =>
        setStatus({ tone: "bad", text: `Could not list videos: ${e.message}` }),
      );
  }, []);

  useEffect(() => {
    if (!slug) return;
    setHist(startHistory(null));
    setSelected(null);
    setStatus({ tone: "info", text: `Loading ${slug}…` });
    getJson(`/public/videos/${slug}/edit.json`)
      .then(async (edit) => [
        edit,
        await getJson(
          `/public/${recordingPath(slug, edit.source, "words.json")}`,
        ),
      ])
      .then(([edit, w]) => {
        // Unsaved changes from an earlier visit come back only if edit.json
        // is exactly what they were made against (otherwise a chat edit made
        // since would be overwritten by the next Save) and still valid.
        let start: EditJson = edit;
        let restored = false;
        try {
          const raw = localStorage.getItem(draftKey(slug));
          if (raw) {
            const kept = JSON.parse(raw);
            if (kept.base === JSON.stringify(edit) && editSchema.safeParse(kept.draft).success) {
              start = kept.draft;
              restored = true;
            } else localStorage.removeItem(draftKey(slug));
          }
        } catch {
          /* storage blocked or unreadable: start from the saved file */
        }
        setSaved(edit);
        setHist(startHistory(start));
        setWords(w);
        setStatus(
          restored
            ? { tone: "info", text: "Restored your unsaved changes from this browser. “Discard changes” goes back to the saved file." }
            : null,
        );
      })
      .catch((e) =>
        setStatus({
          tone: "bad",
          text: `Could not load ${slug}: ${e.message}`,
        }),
      );
  }, [slug]);

  // The preview: rebuilt on every change. A change that breaks the schema or
  // RG 234 shows its error and keeps the last good preview.
  const lastGood = useRef<ReturnType<typeof buildReel> | null>(null);
  const built = useMemo(() => {
    if (!draft || !words) return { error: null, value: null };
    try {
      const value = buildReel(draft, words, slug);
      lastGood.current = value;
      return { error: null, value };
    } catch (e) {
      return { error: (e as Error).message, value: lastGood.current };
    }
  }, [draft, words, slug]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  // Keep unsaved changes in this browser (half a second after the last one),
  // tied to the exact edit.json they were made against.
  useEffect(() => {
    if (!slug || !draft || !saved) return;
    const id = setTimeout(() => {
      try {
        if (dirty) localStorage.setItem(draftKey(slug), JSON.stringify({ base: JSON.stringify(saved), draft }));
        else localStorage.removeItem(draftKey(slug));
      } catch {
        /* storage blocked or full: the explicit Save still works */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [draft, saved, dirty, slug]);
  const reel = built.value?.reel;
  const toFrame = reel ? outFrameOf(reel.timeline, FPS) : () => 0;
  const segments = reel?.timeline.segments ?? [];
  // Last kept source moment: the end of the final chapter's block.
  const lastSrcMs = segments.length
    ? Math.floor((segments[segments.length - 1].srcTo * 1000) / FPS) - 1
    : 0;

  // Playhead for the timeline. Re-subscribes when the Player remounts
  // (a different video, or the first good build).
  const playerReady = !!built.value;
  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) =>
      setFrame(e.detail.frame);
    p.addEventListener("frameupdate", onFrame);
    return () => p.removeEventListener("frameupdate", onFrame);
  }, [playerReady, slug]);

  const items: Item[] = draft
    ? [
        ...(draft.chapters ?? []).map((c, i) => ({
          key: `ch${i}`,
          label: `Chapter ${i + 1}: ${c.title}`,
          field: "chapters" as const,
          index: i,
          atMs: c.atMs,
          endMs: draft.chapters?.[i + 1]?.atMs ?? lastSrcMs,
        })),
        ...(draft.stats ?? []).map((s, i) => ({
          key: `st${i}`,
          label: `Stat: ${s.big}`,
          field: "stats" as const,
          index: i,
          atMs: s.atMs,
          endMs: s.atMs + s.durMs,
        })),
        ...(draft.cues ?? []).map((c, i) => ({
          key: `cu${i}`,
          label: `Cue: ${c.kind}`,
          field: "cues" as const,
          index: i,
          atMs: c.fromMs,
          endMs: c.toMs,
        })),
        ...(draft.visuals ?? []).map((v, i) => ({
          key: `vi${i}`,
          label: `B-roll (${v.mode}): ${typeof v.asset === "string" ? v.asset.split("/").pop() : v.asset.find}`,
          field: "visuals" as const,
          index: i,
          atMs: v.atMs,
          endMs: v.atMs + v.durMs,
        })),
      ].sort((a, b) => a.atMs - b.atMs)
    : [];

  const update = useCallback((patch: (e: EditJson) => EditJson) => {
    setHist((h) => (h.present ? commitEdit(h, patch(h.present)) : h));
  }, []);
  const undo = () => setHist((h) => undoHistory(h));
  const redo = () => setHist((h) => redoHistory(h));

  const nudge = (it: Item, delta: number) =>
    update((e) => {
      const list = [...(e[it.field] ?? [])] as unknown[];
      list[it.index] = shiftTimes(list[it.index], delta);
      return { ...e, [it.field]: list };
    });

  const jump = (it: Item) => {
    setSelected(it.key);
    player.current?.seekTo(TALK_START_FRAME + toFrame(it.atMs));
  };
  const selectedItem = items.find((i) => i.key === selected) ?? null;

  // Delete on the selected item; Ctrl+Z brings it back.
  const removeItem = (it: Item) => {
    update((e) => ({ ...e, [it.field]: (e[it.field] ?? []).filter((_, i) => i !== it.index) }));
    setSelected(null);
    setStatus({ tone: "info", text: `Removed “${it.label}”. Ctrl+Z brings it back.` });
  };

  const save = async () => {
    setStatus({ tone: "info", text: "Saving…" });
    const res = await fetch(`/api/edit/${slug}`, {
      method: "POST",
      body: JSON.stringify(draft),
    });
    const body = await res.json();
    if (!res.ok) return setStatus({ tone: "bad", text: body.error });
    setSaved(draft);
    setStatus({
      tone: "ok",
      text: `Saved ${body.saved} (previous version kept as ${body.backup}).`,
    });
  };

  const startRender = async () => {
    const res = await fetch(`/api/render/${slug}`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) return setStatus({ tone: "bad", text: body.error });
    setRendering(true);
    setStatus({
      tone: "info",
      text: `Rendering ${slug}… this takes several minutes.`,
    });
  };

  useEffect(() => {
    if (!rendering) return;
    const id = setInterval(async () => {
      const r = await getJson(`/api/render/${slug}`);
      setRenderLog(r.lines);
      if (!r.running) {
        setRendering(false);
        setStatus(
          r.exitCode === 0
            ? {
                tone: "ok",
                text: `Rendered. Files are in out/videos/${slug}/.`,
              }
            : r.exitCode === 3
              ? {
                  tone: "bad",
                  text: `Rendered, NOT published (exit 3): the files are in out/videos/${slug}/. Fix what the log says, then run: node scripts/publish-video.mjs ${slug} --force. Do not render again.`,
                }
              : {
                  tone: "bad",
                  text: `Render failed (exit ${r.exitCode}). See the log below.`,
                },
        );
      }
    }, 2000);
    return () => clearInterval(id);
  }, [rendering, slug]);

  // One keydown listener for the page's lifetime; it always calls the latest
  // handler (rebinding on every change would drop keys mid-drag).
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e) => {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.matches("input, textarea, select") || t.isContentEditable);
    const onBlock = !!t?.closest(".block");
    const onButton = !!t?.closest("button") && !onBlock;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === "s") {
      e.preventDefault();
      if (dirty && !built.error) save();
      return;
    }
    if (typing) return;
    if (mod && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && k === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && (k === "=" || k === "+")) {
      e.preventDefault();
      tlApi.current?.zoomBy(ZOOM_STEP);
      return;
    }
    if (mod && k === "-") {
      e.preventDefault();
      tlApi.current?.zoomBy(1 / ZOOM_STEP);
      return;
    }
    if (mod && k === "0") {
      e.preventDefault();
      tlApi.current?.fit();
      return;
    }
    if (mod || e.altKey) return;
    if (k === " ") {
      if (onButton) return; // Space presses a focused button
      e.preventDefault();
      player.current?.toggle();
    } else if (k === "escape") {
      setSelected(null);
    } else if ((k === "delete" || k === "backspace") && selectedItem) {
      e.preventDefault();
      removeItem(selectedItem);
    } else if (k === "arrowleft" || k === "arrowright") {
      if (onButton) return;
      e.preventDefault();
      const dir = k === "arrowleft" ? -1 : 1;
      if (selectedItem) nudge(selectedItem, dir * (e.shiftKey ? 1000 / FPS : NUDGE_MS));
      else player.current?.seekTo(Math.max(0, (player.current?.getCurrentFrame() ?? 0) + dir * (e.shiftKey ? FPS : 1)));
    } else if (k === "home") {
      player.current?.seekTo(0);
    } else if (k === "end" && built.value) {
      player.current?.seekTo(built.value.durationInFrames - 1);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <main>
      <header>
        <h1>Finance Hub · review &amp; tweak</h1>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          aria-label="Video"
        >
          {slugs.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </header>
      {status ? <p className={`status ${status.tone}`}>{status.text}</p> : null}
      {built.error ? (
        <pre className="status bad">Preview not updated: {built.error}</pre>
      ) : null}
      {draft && built.value && reel ? (
        <>
          <Timeline
            items={items}
            segments={segments}
            talkFrames={reel.timeline.talkFrames}
            fps={FPS}
            frame={frame}
            toFrame={toFrame}
            selectedKey={selected}
            apiRef={tlApi}
            onSelect={setSelected}
            onSeek={(f) => player.current?.seekTo(f)}
            onMove={nudge}
          />
          <div className="layout">
            <div className="player">
              <Player
                ref={player}
                component={MortgageReel}
                inputProps={{ slug, reel: built.value.reel }}
                durationInFrames={built.value.durationInFrames}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={FPS}
                controls
                style={{ width: "100%" }}
                acknowledgeRemotionLicense
              />
            </div>
            <section className="panel">
              <label>
                Design
                <select
                  value={draft.design ?? DEFAULT_DESIGN}
                  onChange={(e) =>
                    update((d) => ({ ...d, design: e.target.value }))
                  }
                >
                  {DESIGN_IDS.map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>
              </label>
              <label>
                Colour grade
                <select
                  value={draft.look ?? ""}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      // Empty = no grade; undefined drops "look" when saved.
                      look: (e.target.value || undefined) as EditJson["look"],
                    }))
                  }
                >
                  <option value="">none (as recorded)</option>
                  {LOOKS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                Caption style
                <select
                  value={draft.captionStyle ?? "outline"}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      // "outline" is the default, so it is left out when saved.
                      captionStyle:
                        e.target.value === "box" ? "box" : undefined,
                    }))
                  }
                >
                  <option value="outline">outline (default)</option>
                  <option value="box">box</option>
                </select>
              </label>
              <h2>Timeline</h2>
              <p className="dim">
                Move an item earlier or later by {NUDGE_MS / 1000} s; its inner
                beats move with it.
              </p>
              <ul>
                {items.map((it) => (
                  <li key={it.key} className={selected === it.key ? "selected" : undefined}>
                    <div className="row">
                      <button onClick={() => jump(it)} title="Jump to it">
                        {clock(TALK_START_FRAME + toFrame(it.atMs))}
                      </button>
                      <span className="label">{it.label}</span>
                      <button
                        onClick={() => nudge(it, -NUDGE_MS)}
                        aria-label="Earlier"
                      >
                        ◀
                      </button>
                      <button
                        onClick={() => nudge(it, NUDGE_MS)}
                        aria-label="Later"
                      >
                        ▶
                      </button>
                    </div>
                    {it.field === "chapters" ? (
                      <select
                        value={draft.chapters?.[it.index].effect}
                        onChange={(e) =>
                          update((d) => ({
                            ...d,
                            chapters: (d.chapters ?? []).map((c, i) =>
                              i === it.index
                                ? {
                                    ...c,
                                    effect: e.target
                                      .value as (typeof TRANSITIONS)[number],
                                  }
                                : c,
                            ),
                          }))
                        }
                        aria-label="Transition"
                      >
                        {TRANSITIONS.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    ) : null}
                  </li>
                ))}
              </ul>
              <details className="keys">
                <summary>Shortcuts</summary>
                <table>
                  <tbody>
                    {SHORTCUTS.map(([keys, what]) => (
                      <tr key={keys}>
                        <td>
                          <kbd>{keys}</kbd>
                        </td>
                        <td>{what}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <div className="actions">
                <button disabled={!dirty || !!built.error} onClick={save} title="Ctrl+S">
                  Save edit.json
                </button>
                <button disabled={!hist.past.length} onClick={undo} title="Undo (Ctrl+Z)" aria-label="Undo">
                  ↶ Undo
                </button>
                <button disabled={!hist.future.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
                  ↷ Redo
                </button>
                <button disabled={!dirty} onClick={() => saved && update(() => saved)} title="Back to the saved file (undoable)">
                  Discard changes
                </button>
                <button disabled={dirty || rendering} onClick={startRender}>
                  {rendering ? "Rendering…" : "Render video"}
                </button>
              </div>
              {renderLog.length ? (
                <pre className="log">{renderLog.join("\n")}</pre>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
