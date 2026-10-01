// Faceless video: voice an approved script and lay down the files MortgageReel
// reads, so the whole talking-head pipeline (cuts, RG 234, captions, auto
// charts, bank logos, outro, render-video.py) runs unchanged.
//
//   node scripts/voice-video.mjs <slug> [--dry-run] [--engine google|omnivoice|elevenlabs] [--voice <profile>]
//   node scripts/voice-video.mjs <slug> --listing [--lang vi|en] [--dry-run]    (Global RE listing; npm run listing-voice)
//
// --listing: a Global RE listing (docs/agents/listing-video.md). Reads
// public/listings/<slug>/script.json, checks it with the listing-copy guard
// (scripts/listing-compliance.mjs) instead of RG 234 and the fact ledger, takes
// its engine, voice name and per-language style from config/businesses/globalre.json
// "voice", and writes only voice/narration-<lang>.wav, words-<lang>.json and
// timeline-<lang>.json (per scene: fromMs, toMs, the other language's line) for
// ListingReel. --lang en voices each scene's "en" line (Vietnamese subtitles).
// The brand is spoken as "voice.spokenName"[lang] ("Glô-bồ A Ri", "Global R.E.")
// but shown as "Global RE": replaced just before TTS, mapped back in the caption words.
//
// Engines ("engine" in script.json also works; the flag wins):
//   google (default)     Google Gemini TTS, male voice Charon ("informative"),
//                        GEMINI_API_KEY in .env.local; GEMINI_VOICE / _MODEL
//                        override. Caption timings from faster-whisper in the
//                        system Python (the same one prep-video.py uses).
//   omnivoice            a cloned voice (npm run clone-voice), run locally and
//                        free by scripts/omnivoice-tts.py (about 20x slower
//                        than real time on a laptop CPU, timings included).
//                        --voice / "voiceProfile" picks the profile; with only
//                        one in ~/.finhub-voice, it's used. Setup: README
//                        "Clone your voice".
//   elevenlabs           the ElevenLabs API (paid, fast), eleven_v3.
//
// Reads public/videos/<slug>/script.json:
//   { "title": "...", "voice": "<optional voice id>",
//     "scenes": [ { "vi": "Vietnamese narration", "en": "English line",
//                   "footage": "optional 2-5 word English stock search",
//                   "ai": "optional image description: paid fal.ai fallback,
//                          used only if the free stock search finds nothing" } ],
//     "post": { "title": "...", "caption": "...", "hashtags": ["#..."] } }
// How to write one: .claude/skills/vietnamese-finance-video-editor/references/faceless-script.md
// --dry-run: RG 234 check, fact-ledger check (scripts/facts.mjs) + character count (ElevenLabs bills per character),
// nothing voiced. Show this to Daniel for approval before a real run.
//
// Writes to public/videos/<slug>/:
//   voice/<hash>.mp3|.wav|.json  one cached take per scene (same text + voice
//                           + engine = nothing re-voiced on a re-run)
//   source.mp4              navy frame + the narration (the core's audio)
//   foreground.webm         fully transparent, same frames (no one on screen)
//   words.json              word timings from the engine's character alignment
//   edit.json               a starter if missing (design "faceless"); if it
//                           exists, only its `subtitles` are refreshed
//
// The API key is read here only (see AGENTS.md "Third-party API keys").
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFacts, readLedger } from "./facts.mjs";
import { assertSlug } from "./listing-prep.mjs";
import { find } from "./library.mjs";
import { omnivoicePython, resolveProfile } from "./omnivoice.mjs";
import { spendProblem } from "./spend.mjs";
import { aiClip, stockClips } from "./visuals.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL_ID = "eleven_v3"; // speaks Vietnamese; eleven_multilingual_v2 doesn't
const FPS = 30;
const GAP_MS = 400; // silence between scenes
const BACKDROP = "0x0B1F3D"; // brand navy; never seen, the design draws its own
const CLIP_MAX_S = 5; // longest a single stock clip stays on screen

const fail = (msg) => {
  console.error(`voice-video: ${msg}`);
  process.exit(1);
};

const run = (cmd, args, what) => {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    fail(`${what} failed: ${(err.stderr || err.message).toString().slice(-600)}`);
  }
};

const USAGE = "usage: node scripts/voice-video.mjs <slug> [--listing [--lang vi|en]] [--dry-run] [--engine google|omnivoice|elevenlabs] [--voice <profile>]";
const argv = process.argv.slice(2);
const slug = argv.find((a, k) => !a.startsWith("--") && !["--engine", "--voice", "--lang"].includes(argv[k - 1]));
if (!slug) fail(USAGE);
assertSlug(slug);
const dryRun = argv.includes("--dry-run");
const value = (flag) => {
  if (!argv.includes(flag)) return undefined;
  const v = argv[argv.indexOf(flag) + 1];
  if (!v || v.startsWith("--")) fail(`${flag} needs a value. ${USAGE}`);
  return v;
};
const engineFlag = value("--engine");
const voiceFlag = value("--voice");
const listing = argv.includes("--listing");
const dir = join(ROOT, "public", listing ? "listings" : "videos", slug);
// A listing's voice (engine, Gemini voice name, inline style) is the business's choice.
const business = listing ? JSON.parse(readFileSync(join(ROOT, "config", "businesses", "globalre.json"), "utf8")) : null;
const listingVoice = business ? business.voice ?? {} : null;
const lang = value("--lang") ?? "vi";
if (!["vi", "en"].includes(lang) || (!listing && lang !== "vi")) fail(`--lang is vi or en, for --listing only. ${USAGE}`);
// Speech-only brand form: "Global RE" is said as spokenName (per language, or one for both).
const spokenName = ((sn) => (sn && typeof sn === "object" ? sn[lang] : sn))(business?.voice?.spokenName) ?? null;
const say = (text) => (spokenName ? text.split(business.name).join(spokenName) : text);
const scriptPath = join(dir, "script.json");
if (!existsSync(scriptPath)) fail(`public/${listing ? "listings" : "videos"}/${slug}/script.json not found.`);

let script;
try {
  script = JSON.parse(readFileSync(scriptPath, "utf8"));
} catch (err) {
  fail(`script.json is not valid JSON: ${err.message}`);
}
if (typeof script.title !== "string" || !script.title.trim()) fail('script.json needs a "title".');
if (!Array.isArray(script.scenes) || script.scenes.length === 0) fail('script.json needs "scenes".');
const parsedScenes = script.scenes.map((s, i) => {
  if (typeof s?.vi !== "string" || !s.vi.trim()) fail(`scenes[${i}].vi is empty.`);
  if (typeof s?.en !== "string" || !s.en.trim()) fail(`scenes[${i}].en is empty.`);
  for (const field of ["footage", "ai"])
    if (s[field] !== undefined && (typeof s[field] !== "string" || !s[field].trim()))
      fail(`scenes[${i}].${field} must be non-empty English text.`);
  // Free before paid (Daniel's rule): "ai" is only a fallback for when the
  // free stock search finds nothing, so it needs a "footage" phrase to try
  // first. A scene still shows one or the other, never both (OpenMontage).
  if (s.ai && !s.footage)
    fail(`scenes[${i}] has "ai" without "footage": try free stock first (add a footage phrase; "ai" is the paid fallback).`);
  return {
    vi: s.vi.trim().normalize("NFC"),
    en: s.en.trim().normalize("NFC"),
    footage: s.footage?.trim() ?? "",
    ai: s.ai?.trim() ?? "",
  };
});
// An English listing voices each "en" line and subtitles it with the "vi" one.
const scenes = listing && lang === "en" ? parsedScenes.map((s) => ({ ...s, vi: s.en, en: s.vi })) : parsedScenes;
// Daniel's rule: elements (charts, comparisons, key points) explain; stock or
// AI visuals only fill the gaps. A scene with neither gets the plain navy
// frame, and its edit.json element holds the stage.
const withFootage = scenes.some((s) => s.footage || s.ai);
// Optional post copy for the upload (title, caption ending in a call to
// action, hashtags); it reaches clients too, so RG 234 scans it below.
const post = script.post ?? null;

// Listing: the real-estate listing-copy guard over every string, before any credit.
if (listing) {
  const { checkSlug } = await import("./listing-compliance.mjs");
  const { flags, confirm, unknowns, checked, hasRules } = await checkSlug(slug);
  if (flags.length)
    fail(`listing compliance blocked the script, nothing was voiced.\n${flags.map((f) => `  ${f.where}: "${f.phrase}" — ${f.reason}`).join("\n")}`);
  console.log(`Listing compliance: passed (${checked} strings${hasRules ? "" : ", baseline rules only"}).`);
  confirm.forEach((c) => console.log(`  to confirm with the agent before posting: "${c.phrase}" (a key feature)`));
  unknowns.forEach((u) => console.log(`  TEST ONLY until filled in: ${u}`));
}

// RG 234 before any credits are spent: the narration and the English lines
// reach clients just like on-screen copy. compliance.ts is bundled because Node
// can't follow its extensionless TS imports.
const bundleDir = mkdtempSync(join(tmpdir(), "voice-"));
run(process.execPath, [
  join(ROOT, "node_modules/esbuild/bin/esbuild"), join(ROOT, "src/mortgage/compliance.ts"),
  "--bundle", "--format=esm", "--platform=node", "--out-extension:.js=.mjs", `--outdir=${bundleDir}`,
], "bundling compliance.ts");
const { assertCompliantCopy } = await import(
  new URL(`file:///${join(bundleDir, "compliance.mjs").replace(/\\/g, "/")}`)
);
if (!listing) try {
  assertCompliantCopy(
    {
      narration: scenes.map((s) => s.vi),
      subtitles: scenes.map((s) => s.en),
      title: script.title,
      post: post ? [post.title, post.caption, ...(post.hashtags ?? [])].filter(Boolean) : [],
    },
    script.exemptions ?? [],
  );
} catch (err) {
  fail(`RG 234 blocked the script, nothing was voiced.\n${err.message}`);
}

// Every factual claim traces to facts.json (faceless-script.md "Fact ledger").
// (A listing's facts are listing.json itself, checked by the listing guard.)
if (!listing) {
  let ledger;
  try {
    ledger = readLedger(dir);
  } catch (err) {
    fail(err.message);
  }
  const facts = checkFacts(script, ledger);
  facts.warnings.forEach((w) => console.log(`facts: ${w}`));
  if (facts.errors.length) fail(`facts blocked the script, nothing was voiced.\n${facts.errors.join("\n")}`);
}

const chars = scenes.reduce((n, s) => n + s.vi.length, 0);
const engine = engineFlag ?? script.engine ?? listingVoice?.engine ?? "google";
if (!["google", "omnivoice", "elevenlabs"].includes(engine)) fail(`unknown engine "${engine}". ${USAGE}`);
console.log(`${scenes.length} scenes, ${chars} characters to voice. ${listing ? "" : "RG 234: passed. "}Engine: ${engine}${listing && engine === "google" ? ` (${listingVoice.name ?? "Charon"})` : ""}.`);
if (listing)
  scenes.forEach((s, i) =>
    console.log(`  ${i + 1}. [${script.scenes[i].kind} ${script.scenes[i].id}] (${lang}, spoken) ${say(s.vi)}\n      subtitle: ${s.en}`));
if (withFootage) {
  console.log("Visuals:");
  scenes.forEach((s, i) =>
    console.log(
      `  ${i + 1}. ${s.footage ? `free stock "${s.footage}"${s.ai ? " (paid AI fallback ready)" : ""}` : "element (edit.json, free)"}`,
    ),
  );
  const images = scenes.filter((s) => s.ai).length;
  if (images)
    console.log(`fal.ai: at most ${images} image(s), about US$${(images * 0.03).toFixed(2)}, only where stock finds nothing.`);
  // Library first (scripts/library.mjs), no network: every scene showing a
  // hit proves the run needs no stock or AI call. A stem match is only a
  // candidate: the real run treats it as a miss until its keyword is added.
  console.log("Library:");
  const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
  const show = (hits, miss) => {
    const hit = hits.find((h) => h.match !== "stem");
    if (hit) return `library hit: ${rel(hit.path)}`;
    const c = hits[0];
    if (!c) return miss;
    const k = c.meta.keywords ?? {};
    return `${miss}; library candidate (stem): ${rel(c.path)}, keyword "${k.en?.[0] ?? k.vi?.[0] ?? k.synonyms?.[0] ?? ""}"; add the keyword to reuse it`;
  };
  scenes.forEach((s, i) => {
    if (s.footage) console.log(`  ${i + 1}. stock "${s.footage}": ${show(find(s.footage, { kind: "stock-video" }), "would download")}`);
    if (s.ai)
      console.log(`  ${i + 1}. ai: ${show([...find(s.ai, { kind: "ai-image" }), ...find(s.footage, { kind: "ai-image" })], "would generate")}`);
  });
}
// Spend guard (scripts/spend.mjs): a paid run needs the --dry-run estimate Daniel saw.
const aiImages = withFootage ? scenes.filter((s) => s.ai).length : 0;
const estimateFile = join(dir, "spend-estimate.json");
if (dryRun) {
  if (engine === "elevenlabs" || aiImages > 0) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(estimateFile, JSON.stringify({ at: new Date().toISOString().slice(0, 10), engine, chars, aiImages }));
    console.log(`Estimate recorded (${estimateFile.slice(ROOT.length + 1).replace(/\\/g, "/")}): a real run may use up to 50% more characters or images before it asks again.`);
  }
  process.exit(0);
}
{
  const problem = spendProblem({ engine, chars, aiImages }, existsSync(estimateFile) ? JSON.parse(readFileSync(estimateFile, "utf8")) : null);
  if (problem) fail(`spend guard: ${problem}`);
}

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(join(ROOT, envFile))) {
    process.loadEnvFile(join(ROOT, envFile));
    break;
  }
}
const voiceDir = join(dir, "voice");
mkdirSync(voiceDir, { recursive: true });
const sha = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
let files; // per scene: { audio, align }, voiced or cached

if (engine === "elevenlabs") {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voice = script.voice ?? process.env.ELEVENLABS_VOICE_LIBRARY;
  if (!apiKey) fail("ELEVENLABS_API_KEY is not set in .env.local.");
  if (!voice) fail('No voice: set ELEVENLABS_VOICE_LIBRARY in .env.local or "voice" in script.json.');
  files = [];
  for (const [i, s] of scenes.entries()) {
    const hash = sha(`${voice}|${MODEL_ID}|${say(s.vi)}`);
    const audio = join(voiceDir, `${hash}.mp3`);
    const align = join(voiceDir, `${hash}.json`);
    if (!existsSync(audio) || !existsSync(align)) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: say(s.vi), model_id: MODEL_ID }),
      });
      if (!res.ok) fail(`ElevenLabs scene ${i + 1}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      const body = await res.json();
      if (!body.audio_base64 || !body.alignment?.characters)
        fail(`ElevenLabs scene ${i + 1}: response had no audio or alignment.`);
      writeFileSync(audio, Buffer.from(body.audio_base64, "base64"));
      writeFileSync(align, JSON.stringify(body.alignment));
      console.log(`scene ${i + 1}/${scenes.length}: voiced`);
    } else {
      console.log(`scene ${i + 1}/${scenes.length}: cached`);
    }
    files.push({ audio, align });
  }
} else if (engine === "google") {
  // Gemini TTS (the call finhub-policy-video already uses): raw 24 kHz 16-bit
  // mono PCM back, so a WAV header is added here. It can cut a long take short
  // at HTTP 200; scenes are 1-2 sentences, and the align step checks every
  // take's last word and deletes a short one so a re-run voices it again.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) fail("GEMINI_API_KEY is not set in .env.local.");
  const voice = listingVoice?.name ?? process.env.GEMINI_VOICE ?? "Charon";
  const models = process.env.GEMINI_TTS_MODEL
    ? [process.env.GEMINI_TTS_MODEL]
    : ["gemini-2.5-pro-preview-tts", "gemini-2.5-flash-preview-tts"]; // flash when pro's daily cap is spent
  // Style goes inline, in Vietnamese; no speed words (they stretch the take).
  const style = listingVoice?.style;
  const STYLE = (typeof style === "object" ? style?.[lang] : style) ?? "Nói với giọng ấm áp, tự tin, tự nhiên: ";
  const wav = (pcm, rate) => {
    const h = Buffer.alloc(44);
    h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
    h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
    h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
  };
  // The preview TTS now and then answers 200 with no audio part
  // (finishReason OTHER; 28/09/2026 the listing agent line with a phone
  // number hit it repeatedly on pro): retry, then the next model.
  const NO_AUDIO_TRIES = 3;
  // Some takes open (or end) with seconds of silence (a 9.7 s lead-in on a
  // listing take, 28/09/2026), which stalls the video: trim both ends to
  // 0.15 s before the take is timed, so its alignment matches the trimmed audio.
  const trimSilence = (file) => {
    const tmp = `${file}.trim.wav`;
    const edge = "silenceremove=start_periods=1:start_duration=0:start_threshold=-45dB:start_silence=0.15";
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-af", `${edge},areverse,${edge},areverse`, tmp], "trimming silence");
    writeFileSync(file, readFileSync(tmp));
    rmSync(tmp);
  };
  const speak = async (text, i) => {
    let why = "";
    for (const model of models) {
      for (let attempt = 1; attempt <= NO_AUDIO_TRIES; attempt++) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: STYLE + text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
            },
          }),
        });
        if (res.status === 429 && model !== models.at(-1)) break; // daily cap: try the next model
        if (!res.ok) fail(`Gemini TTS scene ${i + 1} (${model}): HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
        const body = await res.json();
        const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (part) {
          const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? "")?.[1] ?? 24000);
          return wav(Buffer.from(part.inlineData.data, "base64"), rate);
        }
        why = `${model}: finishReason ${body.candidates?.[0]?.finishReason ?? "none"}${body.promptFeedback ? ` ${JSON.stringify(body.promptFeedback)}` : ""}`;
      }
    }
    fail(`Gemini TTS scene ${i + 1}: no audio after ${NO_AUDIO_TRIES} tries on each model (${why}).`);
  };
  files = scenes.map((s) => {
    const hash = sha(`gemini|${voice}|${STYLE}|${say(s.vi)}`);
    return { audio: join(voiceDir, `${hash}.wav`), align: join(voiceDir, `${hash}.json`), text: say(s.vi) };
  });
  const todo = [];
  for (const [i, f] of files.entries()) {
    if (existsSync(f.audio) && existsSync(f.align)) {
      console.log(`scene ${i + 1}/${files.length}: cached`);
      continue;
    }
    // Voiced by a run that stopped before the timing step: keep the take, time it now.
    if (existsSync(f.audio)) {
      console.log(`scene ${i + 1}/${files.length}: voiced earlier, timing it now`);
      trimSilence(f.audio);
      todo.push(f);
      continue;
    }
    writeFileSync(f.audio, await speak(f.text, i));
    trimSilence(f.audio);
    console.log(`scene ${i + 1}/${files.length}: voiced (${voice})`);
    todo.push(f);
  }
  if (todo.length) {
    const jobs = join(bundleDir, "align-jobs.json");
    const seconds = (file) =>
      Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], "ffprobe").trim());
    writeFileSync(jobs, JSON.stringify(todo.map(({ text, audio, align }) => ({ text, wav: audio, align, seconds: seconds(audio), language: lang }))));
    const python = process.env.WHISPER_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
    console.log("Timing the captions (faster-whisper) ...");
    const res = spawnSync(python, [join(ROOT, "scripts", "omnivoice-tts.py"), "align", jobs], {
      stdio: "inherit",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    if (res.status !== 0) fail(`caption timing stopped (exit ${res.status ?? res.error?.message}); see the message above.`);
  }
} else {
  // OmniVoice runs in its own Python (torch, the model, faster-whisper for the
  // caption timings), loaded once for every scene that isn't cached yet.
  const python = omnivoicePython();
  const picked = resolveProfile(voiceFlag ?? script.voiceProfile);
  const steps = Number(process.env.OMNIVOICE_STEPS ?? 32);
  if (!python) fail('OmniVoice isn\'t set up: run npm run setup-voice (README "Clone your voice").');
  if (picked.error) fail(picked.error);
  const profile = picked.path;
  const inRepo = relative(ROOT, profile);
  if (inRepo && !inRepo.startsWith("..") && !isAbsolute(inRepo))
    fail("A voice profile is a copy of someone's voice and this repository is public: move it outside the repo.");
  if (!Number.isInteger(steps) || steps < 8) fail(`OMNIVOICE_STEPS must be a whole number of at least 8, got "${process.env.OMNIVOICE_STEPS}".`);

  // Same text + same profile + same quality = the cached take is reused.
  const voiceKey = sha(readFileSync(profile));
  files = scenes.map((s) => {
    const hash = sha(`omnivoice|${voiceKey}|${steps}|${say(s.vi)}`);
    return { audio: join(voiceDir, `${hash}.wav`), align: join(voiceDir, `${hash}.json`), text: say(s.vi) };
  });
  const todo = files.filter((f) => !existsSync(f.audio) || !existsSync(f.align));
  console.log(`${files.length - todo.length} cached, ${todo.length} to voice (about ${Math.ceil(todo.reduce((n, f) => n + f.text.length, 0) / 15 * 20 / 60)} min).`);
  if (todo.length) {
    const jobs = join(bundleDir, "omnivoice-jobs.json");
    writeFileSync(jobs, JSON.stringify(todo.map(({ text, audio, align }) => ({ text, wav: audio, align }))));
    const res = spawnSync(python, [join(ROOT, "scripts", "omnivoice-tts.py"), "speak", jobs, profile, String(steps)], {
      stdio: "inherit",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    if (res.status !== 0) fail(`OmniVoice stopped (exit ${res.status ?? res.error?.message}); see its message above. Nothing was changed in the video.`);
    for (const f of todo) if (!existsSync(f.audio) || !existsSync(f.align)) fail(`OmniVoice didn't write ${f.audio}.`);
  }
}

const takes = files.map(({ audio, align }) => ({
  audio,
  alignment: JSON.parse(readFileSync(align, "utf8")),
  durMs: 1000 * Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", audio], "ffprobe").trim()),
}));

// Characters -> words. A word runs from its first character's start to its last
// character's end; punctuation stays on the word (the timeline reads "." as a
// sentence end). Leading space = a new word, as in Whisper's words.json.
const words = [];
const subtitles = [];
let offsetMs = 0;
for (const [i, t] of takes.entries()) {
  const { characters, character_start_times_seconds: st, character_end_times_seconds: en } = t.alignment;
  let cur = null;
  characters.forEach((ch, k) => {
    if (/\s/.test(ch)) {
      cur = null;
      return;
    }
    if (!cur) {
      cur = { text: " ", startMs: Math.round(offsetMs + st[k] * 1000), endMs: 0, timestampMs: null, confidence: 1 };
      words.push(cur);
    }
    cur.text += ch;
    cur.endMs = Math.round(offsetMs + en[k] * 1000);
  });
  subtitles.push({ fromMs: Math.round(offsetMs), toMs: Math.round(offsetMs + t.durMs), text: scenes[i].en });
  offsetMs += t.durMs + GAP_MS;
}
if (words.length === 0) fail(`${engine} returned no words.`);
// Captions show the brand as written: the spoken form's words -> "Global RE".
if (listing && spokenName) {
  const spoken = spokenName.split(/\s+/);
  const shown = business.name.split(/\s+/);
  for (let i = 0; i + spoken.length <= words.length; i++) {
    const seg = words.slice(i, i + spoken.length).map((w) => w.text.trim());
    if (!seg.slice(0, -1).every((t, k) => t === spoken[k]) || !seg.at(-1).startsWith(spoken.at(-1))) continue;
    const tail = seg.at(-1).slice(spoken.at(-1).length); // punctuation after the name
    const span = words.slice(i, i + spoken.length);
    const merged = shown.length === spoken.length
      ? span.map((w, k) => ({ ...w, text: ` ${shown[k]}${k === shown.length - 1 ? tail : ""}` }))
      : [{ ...span[0], endMs: span.at(-1).endMs, text: ` ${business.name}${tail}` }];
    words.splice(i, spoken.length, ...merged);
  }
}

// Narration: every take padded with GAP_MS of silence, joined in order.
const narration = join(voiceDir, listing ? `narration-${lang}.wav` : "narration.wav");
const inputs = takes.flatMap((t) => ["-i", t.audio]);
const pads = takes.map((_, i) => `[${i}:a]aresample=48000,apad=pad_dur=${GAP_MS / 1000}[a${i}]`).join(";");
const joined = `${takes.map((_, i) => `[a${i}]`).join("")}concat=n=${takes.length}:v=0:a=1[out]`;
run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", `${pads};${joined}`, "-map", "[out]", narration], "joining the narration");

// A listing stops here: ListingReel reads narration.wav, words.json and the
// per-scene timeline; no footage, source.mp4, cut-out or edit.json.
if (listing) {
  writeFileSync(join(dir, `words-${lang}.json`), JSON.stringify(words, null, 1));
  writeFileSync(join(dir, `timeline-${lang}.json`), JSON.stringify(subtitles, null, 1));
  console.log(`${words.length} words, ${(offsetMs / 1000).toFixed(1)} s -> public/listings/${slug}/ (voice/narration-${lang}.wav, words-${lang}.json, timeline-${lang}.json)`);
  process.exit(0);
}

// Gap-scene visuals (scripts/visuals.mjs): "footage" = a stock search
// (Pixabay, then Pexels), "ai" = a fal.ai still with a slow zoom. A stock
// scene longer than CLIP_MAX_S gets several clips so the picture changes at
// least that often (rule 5b). Assets come from and go into public/library/
// (scripts/library.mjs); voice/footage/ keeps search caches and zoom clips.
let broll = null;
if (withFootage) {
  const footDir = join(voiceDir, "footage");
  mkdirSync(footDir, { recursive: true });
  // One seed per video, so its AI stills share a look (OpenMontage).
  const seed = parseInt(createHash("sha1").update(script.title).digest("hex").slice(0, 8), 16);
  const pieces = []; // { file, seconds }
  try {
    for (const [i, s] of scenes.entries()) {
      const seconds = (takes[i].durMs + GAP_MS) / 1000;
      if (s.footage) {
        // Free first (Daniel's rule): stock, and the paid AI image only when
        // stock has nothing and the scene gave an "ai" fallback prompt.
        const n = Math.max(1, Math.ceil(seconds / CLIP_MAX_S));
        let clips = null;
        try {
          clips = await stockClips(s.footage, n, footDir, { slug });
        } catch (err) {
          if (!s.ai) throw err;
          console.log(`visual ${i + 1}/${scenes.length}: stock failed (${err.message}); using the paid AI fallback`);
        }
        if (clips) {
          for (let k = 0; k < n; k++) pieces.push({ file: clips[k % clips.length], seconds: seconds / n });
          console.log(`visual ${i + 1}/${scenes.length}: "${s.footage}", ${n} free clip(s)`);
        } else {
          pieces.push({ file: await aiClip(s.ai, seconds, footDir, seed, { slug, keyword: s.footage }), seconds });
          console.log(`visual ${i + 1}/${scenes.length}: AI image (fal.ai, paid)`);
        }
      } else {
        pieces.push({ file: null, seconds }); // navy: an element fills this scene
      }
    }
  } catch (err) {
    fail(err.message);
  }
  const key = createHash("sha1").update(JSON.stringify(pieces)).digest("hex").slice(0, 12);
  broll = join(voiceDir, `footage-${key}.mp4`);
  if (!existsSync(broll)) {
    // Each piece: looped if the clip is short, cut to its share of the scene,
    // cropped to fill 1080x1920; then all joined in scene order.
    const inputs = pieces.flatMap((p) =>
      p.file
        ? ["-stream_loop", "-1", "-i", p.file]
        : ["-f", "lavfi", "-i", `color=c=${BACKDROP}:s=1080x1920:r=${FPS}`],
    );
    const fitted = pieces
      .map((p, k) => `[${k}:v]trim=duration=${p.seconds.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${FPS},setsar=1[v${k}]`)
      .join(";");
    const joinedV = `${pieces.map((_, k) => `[v${k}]`).join("")}concat=n=${pieces.length}:v=1:a=0[out]`;
    run("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", `${fitted};${joinedV}`,
      "-map", "[out]", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", broll,
    ], "joining the footage");
  }
}

// The two videos the core needs, frame for frame the same length. With
// footage, source.mp4's picture is the footage (the faceless design shows it
// behind the stage); without, a plain navy frame.
const frames = Math.ceil((offsetMs / 1000) * FPS);
const seconds = (frames / FPS).toFixed(3);
const picture = broll
  ? ["-i", broll]
  : ["-f", "lavfi", "-i", `color=c=${BACKDROP}:s=1080x1920:r=${FPS}`];
const fit = broll
  ? ["-vf", `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=${FPS},tpad=stop_mode=clone:stop_duration=10`]
  : ["-tune", "stillimage"];
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  ...picture, "-i", narration, "-map", "0:v", "-map", "1:a",
  "-t", seconds, "-c:v", "libx264", ...fit, "-g", "15", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-af", "apad", join(dir, "source.mp4"),
], "writing source.mp4");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "lavfi", "-i", `color=c=black@0.0:s=1080x1920:r=${FPS},format=yuva420p`,
  "-t", seconds, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "63",
  "-g", "15", "-auto-alt-ref", "0", join(dir, "foreground.webm"),
], "writing foreground.webm");

writeFileSync(join(dir, "words.json"), JSON.stringify(words, null, 1));
const editPath = join(dir, "edit.json");
if (existsSync(editPath)) {
  const edit = JSON.parse(readFileSync(editPath, "utf8"));
  writeFileSync(editPath, JSON.stringify({ ...edit, subtitles }, null, 2));
  console.log("edit.json exists: refreshed its subtitles only. Re-check any atMs you set by hand.");
} else {
  const edit = {
    notes: ["Faceless: voiced by scripts/voice-video.mjs from script.json."],
    design: "faceless",
    title: script.title,
    // A voiced script has no hesitations or stutters; don't cut real words.
    cut: { fillers: false, stutters: false, badWords: false },
    pacing: { mode: "off" },
    subtitles,
  };
  writeFileSync(editPath, JSON.stringify(edit, null, 2));
  console.log("edit.json written (design faceless).");
}
console.log(`${words.length} words, ${(offsetMs / 1000).toFixed(1)} s, ${frames} frames -> public/videos/${slug}/`);
