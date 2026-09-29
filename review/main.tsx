// Review & tweak page for MortgageReel videos: watch a reel in a <Player>,
// change its design, grade, chapter transitions and cue timings, save
// edit.json and start the render. Every change previews immediately; the
// reel is built with the same buildReel() as the render, so RG 234 and schema
// errors show here before anything is saved.
import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DESIGN_IDS, DEFAULT_DESIGN } from "../src/designs";
import { MortgageReel, buildReel } from "../src/mortgage/MortgageReel";
import { recordingPath } from "../src/mortgage/recording";
import { LOOKS, outFrameOf, type EditJson } from "../src/mortgage/schema";
import { TALK_START_FRAME, TRANSITIONS } from "../src/mortgage/timeline";
import { shiftTimes } from "./shift";
import { Timeline, type TimelineItem } from "./Timeline";

const FPS = 30;
const NUDGE_MS = 500;

type Status = { tone: "ok" | "bad" | "info"; text: string } | null;
type Item = TimelineItem;

const getJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};

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
  const [draft, setDraft] = useState<EditJson | null>(null);
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
    setDraft(null);
    setStatus({ tone: "info", text: `Loading ${slug}…` });
    getJson(`/public/videos/${slug}/edit.json`)
      .then(async (edit) => [
        edit,
        await getJson(
          `/public/${recordingPath(slug, edit.source, "words.json")}`,
        ),
      ])
      .then(([edit, w]) => {
        setSaved(edit);
        setDraft(edit);
        setWords(w);
        setStatus(null);
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
    setDraft((d) => (d ? patch(d) : d));
  }, []);

  const nudge = (it: Item, delta: number) =>
    update((e) => {
      const list = [...(e[it.field] ?? [])] as unknown[];
      list[it.index] = shiftTimes(list[it.index], delta);
      return { ...e, [it.field]: list };
    });

  const jump = (it: Item) =>
    player.current?.seekTo(TALK_START_FRAME + toFrame(it.atMs));

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
            : {
                tone: "bad",
                text: `Render failed (exit ${r.exitCode}). See the log below.`,
              },
        );
      }
    }, 2000);
    return () => clearInterval(id);
  }, [rendering, slug]);

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
            nudgeMs={NUDGE_MS}
            toFrame={toFrame}
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
                  <li key={it.key}>
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
              <div className="actions">
                <button disabled={!dirty || !!built.error} onClick={save}>
                  Save edit.json
                </button>
                <button disabled={!dirty} onClick={() => setDraft(saved)}>
                  Undo changes
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
