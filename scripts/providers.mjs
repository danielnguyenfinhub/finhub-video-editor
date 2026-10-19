// The paid and free APIs behind the MCP's audio, visuals and research tools, one op per call.
// The keys are read here only (AGENTS.md "Third-party API keys"), never in the MCP or a component.
//
//   node scripts/providers.mjs <op> --json '<args>' [--quote]
//
//   ask        {question, slug?, deep?}         Perplexity sonar (sonar-pro if deep): a cited web answer
//   translate  {text, to: "vi"|"en"}            DeepSeek, Gemini if DeepSeek fails
//   music      {prompt, seconds, slug}          ElevenLabs music, instrumental bed (mp3)
//   sfx        {prompt, seconds, slug}          ElevenLabs sound effect (mp3)
//   transcribe {file, slug, lang?}              OpenAI whisper-1 word timings, file inside the video's folder
//   image      {prompt, slug, provider?, n?}    fal FLUX (default), xAI Grok Imagine or OpenAI; Gemini picks the best of n
//   stock      {term, slug?, need?, download?}  Pixabay then Pexels; download=false only lists (remote mode)
//
// --quote prints the estimate and calls nothing. A real run appends what it spent to
// out/spend-ledger.jsonl. The MCP refuses a paid op without a quote Daniel has seen
// (mcp/finhub-video-server.mjs, `paid`). Written files are printed one per line,
// out/ text files first so the MCP can attach them.
// FINHUB_FAKE_PROVIDERS=1 answers every call with a canned response (scripts/check-mcp.mjs).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { add } from "./library.mjs";
import { slugOk } from "./listing-prep.mjs";
import { AI_STYLE, generateStill, judgeStills, searchStock, stockClips } from "./visuals.mjs";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
for (const f of [".env.local", ".env"]) if (existsSync(join(ROOT, f))) process.loadEnvFile(join(ROOT, f));

// US$ per unit, as the providers bill. Checked 19/10/2026; ESTIMATES, the ledger keeps actuals where the API reports them.
//   Perplexity: sonar $1/M tokens + $5 per 1,000 requests (low context); a live call reported US$0.0035.
//   ElevenLabs: sound effects $0.12/min, music $0.15/min (API pricing page, July 2026 snapshot; unverified live).
//   OpenAI: whisper-1 $0.006/min; gpt-image medium 1024x1536 $0.063 (gpt-image-1 rate; the newer model's rate is unverified).
//   xAI: grok-imagine-image $0.02 (its /v1/image-generation-models price). fal FLUX dev about $0.03 (visuals.mjs).
const PRICE = { ask: 0.006, askDeep: 0.03, translate: 0.002, sfxPerS: 0.002, musicPerS: 0.0025, whisperPerMin: 0.006, fal: 0.03, xai: 0.02, openai: 0.063 };
const OPENAI_IMAGE = () => process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
const XAI_IMAGE = () => process.env.XAI_IMAGE_MODEL ?? "grok-imagine-image";

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
const key = (name) => process.env[name] || (process.env.FINHUB_FAKE_PROVIDERS === "1" ? "fake" : fail(`${name} is not set in .env.local.`));
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
const videoDir = (slug) => (slugOk(slug ?? "") ? join(ROOT, "public", "videos", slug) : fail(`slug "${slug}" is not a valid video slug.`));
const assets = (slug) => {
  const d = join(videoDir(slug), "assets");
  mkdirSync(d, { recursive: true });
  return d;
};
const outFile = (slug, name, text) => {
  if (slug && !slugOk(slug)) fail(`slug "${slug}" is not a valid video slug.`);
  const d = slug ? join(ROOT, "out", "videos", slug, "research") : join(ROOT, "out", "research");
  mkdirSync(d, { recursive: true });
  const f = join(d, name);
  writeFileSync(f, text);
  return f;
};
// Daily cap on what real runs may spend, summed from the ledger (24 h). A runaway loop of cheap
// ungated calls (ask, translate) stops here. ponytail: Railway's disk resets on deploy, so there it
// counts since the last deploy.
const DAILY_CAP = Number(process.env.FINHUB_DAILY_CAP_USD ?? 10);
const spentToday = () => {
  const f = join(ROOT, "out", "spend-ledger.jsonl");
  if (!existsSync(f)) return 0;
  const since = Date.now() - 86_400_000;
  return readFileSync(f, "utf8").split("\n").reduce((sum, l) => {
    try {
      const r = JSON.parse(l);
      return Date.parse(r.at) > since ? sum + (r.usd ?? 0) : sum;
    } catch {
      return sum;
    }
  }, 0);
};
const ledger = (op, usd, slug, note) => {
  mkdirSync(join(ROOT, "out"), { recursive: true });
  appendFileSync(join(ROOT, "out", "spend-ledger.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), op, usd: Math.round(usd * 10000) / 10000, slug: slug ?? null, note })}\n`);
};
const post = async (url, headers, body, what) => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) fail(`${what}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
};
const seconds = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || lo));
const usd = (n) => `US$${n.toFixed(n < 0.1 ? 4 : 2)}`;

const chat = async (url, apiKey, model, system, user) => {
  const body = await (await post(url, { Authorization: `Bearer ${apiKey}` }, { model, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.2 }, model)).json();
  return body.choices?.[0]?.message?.content?.trim() || fail(`${model}: empty answer.`);
};

const ops = {
  ask: {
    quote: (a) => (a.deep ? PRICE.askDeep : PRICE.ask),
    run: async ({ question, slug, deep }) => {
      const model = deep ? "sonar-pro" : "sonar";
      const system =
        "Answer for an Australian mortgage broker researching a short finance video. Prefer primary sources (RBA, ASIC, ATO, APRA, ABS, lender pages). " +
        "Give dates for every rate or figure. Be concise.";
      const body = await (await post("https://api.perplexity.ai/chat/completions", { Authorization: `Bearer ${key("PERPLEXITY_API_KEY")}` }, { model, messages: [{ role: "system", content: system }, { role: "user", content: question }] }, "Perplexity")).json();
      const answer = body.choices?.[0]?.message?.content ?? fail("Perplexity: empty answer.");
      const sources = (body.search_results ?? (body.citations ?? []).map((url) => ({ url }))).map((s, i) => `${i + 1}. ${s.title ? `${s.title} — ` : ""}${s.url}${s.date ? ` (${s.date})` : ""}`);
      ledger("ask", body.usage?.cost?.total_cost ?? PRICE.ask, slug, model);
      return [outFile(slug, `ask-${hash(question)}.md`, `# ${question}\n\n_${model}, ${new Date().toISOString().slice(0, 10)}_\n\n${answer}\n\n## Sources\n\n${sources.join("\n")}\n`)];
    },
  },
  translate: {
    quote: () => PRICE.translate,
    run: async ({ text, to }) => {
      if (!["vi", "en"].includes(to)) fail('translate: "to" is "vi" or "en".');
      const system =
        `Translate this finance video narration into ${to === "vi" ? "natural spoken Vietnamese for Vietnamese-Australians (keep English loan terms people use, e.g. LVR, offset)" : "plain Australian English"}. ` +
        "Keep every number, percentage, date and name exactly. Return only the translation.";
      let out;
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
            body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash", messages: [{ role: "system", content: system }, { role: "user", content: text }], temperature: 0.2 }),
          });
          if (res.ok) out = (await res.json()).choices?.[0]?.message?.content?.trim();
        } catch {} // network trouble: Gemini below
      }
      if (!out) {
        const res = await post(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_TEXT_MODEL ?? "gemini-flash-latest"}:generateContent`, { "x-goog-api-key": key("GEMINI_API_KEY") }, { systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text }] }], generationConfig: { temperature: 0.2 } }, "Gemini translate");
        out = (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() || fail("Gemini: empty translation.");
      }
      ledger("translate", PRICE.translate, null, to);
      console.log(out);
      return [];
    },
  },
  sfx: {
    quote: (a) => Math.max(0.01, seconds(a.seconds, 0.5, 30) * PRICE.sfxPerS),
    run: async ({ prompt, seconds: s, slug }) => {
      const dur = seconds(s, 0.5, 30);
      const res = await post("https://api.elevenlabs.io/v1/sound-generation", { "xi-api-key": key("ELEVENLABS_API_KEY") }, { text: prompt, duration_seconds: dur, prompt_influence: 0.4 }, "ElevenLabs sound effect");
      const f = join(assets(slug), `sfx-${hash(`${prompt}|${dur}`)}.mp3`);
      writeFileSync(f, Buffer.from(await res.arrayBuffer()));
      ledger("sfx", dur * PRICE.sfxPerS, slug, prompt.slice(0, 60));
      return [f];
    },
  },
  music: {
    quote: (a) => seconds(a.seconds, 10, 300) * PRICE.musicPerS,
    run: async ({ prompt, seconds: s, slug }) => {
      const dur = seconds(s, 10, 300);
      const res = await post("https://api.elevenlabs.io/v1/music", { "xi-api-key": key("ELEVENLABS_API_KEY") }, { prompt: `${prompt}. Instrumental only, no vocals, calm enough to sit under a voice.`, music_length_ms: Math.round(dur * 1000) }, "ElevenLabs music");
      const f = join(assets(slug), `music-${hash(`${prompt}|${dur}`)}.mp3`);
      writeFileSync(f, Buffer.from(await res.arrayBuffer()));
      ledger("music", dur * PRICE.musicPerS, slug, prompt.slice(0, 60));
      return [f];
    },
  },
  transcribe: {
    // A file inside public/videos/<slug>/ only: the MCP caller names it, so it must not reach anything else.
    file: ({ file, slug }) => {
      const dir = videoDir(slug) + sep;
      const p = resolve(dir, String(file ?? ""));
      // realpath too: a symlink inside the folder must not reach outside it.
      if (!p.startsWith(dir) || !existsSync(p) || !statSync(p).isFile() || !realpathSync(p).startsWith(realpathSync(dir) + sep))
        fail(`transcribe: "${file}" is not a file inside public/videos/${slug}/.`);
      if (statSync(p).size > 25 * 1024 * 1024) fail("transcribe: the file is over OpenAI's 25 MB limit; send the audio (voice/narration.wav or an mp3) instead.");
      return p;
    },
    quote: (a) => {
      const p = ops.transcribe.file(a);
      let s = 60;
      try {
        s = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", p], { encoding: "utf8" }).trim()) || 60;
      } catch {} // not media ffprobe can read: quote a minute, OpenAI will refuse it anyway
      return Math.max(0.006, (s / 60) * PRICE.whisperPerMin);
    },
    run: async (a) => {
      const p = ops.transcribe.file(a);
      const form = new FormData();
      form.append("file", new Blob([readFileSync(p)]), basename(p));
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      if (a.lang) form.append("language", a.lang);
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key("OPENAI_API_KEY")}` }, body: form });
      if (!res.ok) fail(`OpenAI transcription: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      const body = await res.json();
      ledger("transcribe", ((body.duration ?? 60) / 60) * PRICE.whisperPerMin, a.slug, basename(p));
      return [outFile(a.slug, `transcribe-${basename(p).replace(/\.[^.]+$/, "")}.json`, JSON.stringify({ text: body.text, language: body.language, duration: body.duration, words: body.words ?? [] }, null, 1))];
    },
  },
  image: {
    quote: (a) => (PRICE[a.provider ?? "fal"] ?? fail("image: provider is fal, xai or openai.")) * Math.min(4, Math.max(1, a.n ?? 1)),
    run: async ({ prompt, slug, provider = "fal", n = 1 }) => {
      n = Math.min(4, Math.max(1, n));
      const dir = assets(slug);
      let file;
      let meta;
      if (provider === "fal") {
        ({ file, meta } = await generateStill(prompt, Number.parseInt(hash(prompt).slice(0, 6), 16), dir, { candidates: n }));
      } else {
        const full = `${prompt}. ${AI_STYLE}`;
        const [url, apiKey, body] =
          provider === "xai"
            ? ["https://api.x.ai/v1/images/generations", key("XAI_API_KEY"), { model: XAI_IMAGE(), prompt: full, n, response_format: "b64_json", aspect_ratio: "9:16" }]
            : ["https://api.openai.com/v1/images/generations", key("OPENAI_API_KEY"), { model: OPENAI_IMAGE(), prompt: full, n, size: "1024x1536", quality: "medium" }];
        const data = (await (await post(url, { Authorization: `Bearer ${apiKey}` }, body, `${provider} image`)).json()).data ?? [];
        const files = data.map((d, k) => {
          const f = join(dir, `${provider}-${hash(prompt)}-${k}.part.${/jpe?g/.test(d.mime_type ?? "") ? "jpg" : "png"}`);
          writeFileSync(f, Buffer.from(d.b64_json ?? fail(`${provider} image: no image data.`), "base64"));
          return f;
        });
        if (files.length === 0) fail(`${provider} image: no image returned.`);
        let pick = 0;
        let why = "";
        if (files.length > 1)
          try {
            const j = await judgeStills(files, prompt);
            if (j) [pick, why] = [j.best, j.why];
          } catch {} // keep the first, as visuals.mjs does
        for (const [k, f] of files.entries()) if (k !== pick) rmSync(f, { force: true });
        file = files[pick];
        const model = provider === "xai" ? XAI_IMAGE() : OPENAI_IMAGE();
        meta = { provider, model, prompt, licence: `AI-generated image (${provider}, model ${model}); provider terms apply`, ...(files.length > 1 ? { candidates: files.length, pick: pick + 1, judge: why } : {}) };
      }
      const entry = add(file, { ...meta, kind: "ai-image", keywords: { en: [prompt] }, usedIn: [slug] });
      rmSync(file, { force: true });
      ledger("image", ops.image.quote({ provider, n }), slug, `${provider}: ${prompt.slice(0, 50)}`);
      return [entry.path];
    },
  },
  stock: {
    quote: () => 0,
    run: async ({ term, slug, need = 2, download = true }) => {
      const cache = join(tmpdir(), "finhub-stock");
      mkdirSync(cache, { recursive: true });
      if (!download) {
        const hits = (await searchStock(term, cache)).slice(0, 10).map((c) => ({ id: c.id, url: c.url, thumb: c.thumb, ...c.meta }));
        return [outFile(slug, `stock-${hash(term)}.json`, JSON.stringify(hits, null, 1))];
      }
      const dir = join(videoDir(slug), "voice", "footage");
      mkdirSync(dir, { recursive: true });
      return await stockClips(term, Math.min(5, Math.max(1, need)), dir, { slug });
    },
  },
};

// Canned answers for the checks: the real code paths run, nothing leaves the machine.
if (process.env.FINHUB_FAKE_PROVIDERS === "1" && process.env.RAILWAY_ENVIRONMENT) fail("FINHUB_FAKE_PROVIDERS is set on Railway; remove it.");
if (process.env.FINHUB_FAKE_PROVIDERS === "1") {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  globalThis.fetch = async (url) => {
    const u = String(url);
    const json = (b) => new Response(JSON.stringify(b), { headers: { "content-type": "application/json" } });
    if (u.includes("perplexity")) return json({ choices: [{ message: { content: "fake answer [1]" } }], search_results: [{ title: "RBA", url: "https://www.rba.gov.au/", date: "2026-10-01" }], usage: { cost: { total_cost: 0.0035 } } });
    if (u.includes("deepseek")) return json({ choices: [{ message: { content: "bản dịch giả" } }] });
    if (u.includes("generativelanguage")) return json({ candidates: [{ content: { parts: [{ text: "bản dịch giả" }] } }] });
    if (u.includes("transcriptions")) return json({ text: "xin chào", language: "vi", duration: 1.2, words: [{ word: "xin", start: 0, end: 0.4 }] });
    if (u.includes("images/generations")) return json({ data: [{ b64_json: png.toString("base64") }] });
    if (u.includes("fal.run")) return json({ images: [{ url: "https://fake.invalid/a.png" }] });
    if (u.includes("fake.invalid")) return new Response(png);
    if (u.includes("elevenlabs")) return new Response(Buffer.from("ID3fake-mp3"));
    return new Response("not faked", { status: 500 });
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [op] = process.argv.slice(2);
  const i = process.argv.indexOf("--json");
  if (!Object.hasOwn(ops, op) || i < 0) fail(`usage: node scripts/providers.mjs <${Object.keys(ops).join("|")}> --json '<args>' [--quote]`);
  let args;
  try {
    args = JSON.parse(process.argv[i + 1]);
  } catch {
    fail("--json must be a JSON object.");
  }
  if (process.argv.includes("--quote")) {
    const q = ops[op].quote(args);
    console.log(`quote: ${usd(q)}${op === "transcribe" ? ` (uploads public/videos/${args.slug}/${args.file} to OpenAI; a client recording needs Daniel's OK for that)` : ""}`);
  } else {
    if (op !== "stock" && spentToday() >= DAILY_CAP) fail(`daily spend cap reached (US$${DAILY_CAP} in 24 h, out/spend-ledger.jsonl); raise FINHUB_DAILY_CAP_USD or wait.`);
    // out/ text files first (the MCP attaches those), then media paths.
    const files = (await ops[op].run(args)).map((f) => rel(resolve(ROOT, f)));
    for (const f of files.sort((a, b) => Number(!a.startsWith("out/")) - Number(!b.startsWith("out/")))) console.log(f);
  }
}
