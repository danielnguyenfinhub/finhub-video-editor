// Hand a rendered video to Daniel: a copy named after its topic and a caption
// file ready to paste, both in the finished-videos folder.
//
//   node scripts/publish-video.mjs <slug> [--force] [--claim] [--out <dir>] [--public-dir <dir>] [--video <file>]
//
// Reads "post" {title, caption, hashtags} from public/videos/<slug>/edit.json
// (talking-head) or, failing that, script.json (faceless). Checks: a title and
// caption; exactly 7 hashtags, #finhub and #vietnamese among them, each "#word"
// once; RG 234 over all of it (src/mortgage/compliance.ts, as voice-video.mjs).
// Writes to "2 - FINISHED VIDEOS/" (or --out):
//   <Topic>.mp4             copy of out/videos/<slug>/<slug>.mp4 (or --video)
//   <Topic> - caption.txt   title, caption, broker details (config/broker.json),
//                           hashtags, then the licence and disclaimer footer
// Topic = post.title made safe as a Windows file name. The caption file is
// UTF-8 without a BOM (Windows 11 Notepad reads it; a BOM would be pasted as an
// invisible first character). Never replaces a file unless --force, and even
// with --force never replaces another slug's files of the same topic (the owner
// of each topic is kept in <out>/.publish-slugs.json, written under
// .publish-slugs.lock). Files with no owner on record (published before
// 01/10/2026) are replaced only with --claim (Daniel says they are this slug's):
// exit 4 names the videos whose post title gives that file name.
// Refuses a render older than its on-screen inputs (edit.json/script.json without
// "post", words.json; render-video.py stamps their hash in <slug>.inputs), unless
// --stale-ok; a render that did not finish (stamp "rendering") is never published. "post" is upload copy, so fixing it never needs a re-render.
// render-video.py runs this after every render.
//   node scripts/publish-video.mjs <slug> --inputs-hash [--public-dir <dir>]   (render-video.py's stamp)
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSlug } from "./listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");
export const OUTPUT_DIR = join(ROOT, "2 - FINISHED VIDEOS");
export const TAG_COUNT = 7;
export const REQUIRED_TAGS = ["#finhub", "#vietnamese"];
const MAX_NAME = 120;

/** post.title as a Windows file name: "29/9" -> "29-9", "a: b" -> "a - b". */
export const topicFileName = (title) => {
  const name = title
    .normalize("NFC")
    .replace(/[\\/|]/g, "-")
    .replace(/:/g, " -")
    .replace(/[*?"<>\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const capped = [...name].slice(0, MAX_NAME).join("").replace(/[. ]+$/, "");
  // Reserved on Windows, alone or before a dot ("nul.x"): "CON" -> "CON video", "nul.x" -> "nul video.x".
  return capped.replace(/^(con|prn|aux|nul|com\d|lpt\d)(?=\.|$)/i, "$1 video");
};

/** Hash of the files a render shows, in order; "post" is taken out of edit.json and script.json. */
export const hashInputs = (paths) =>
  createHash("sha256").update(JSON.stringify(paths.map((path) => {
    let text = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (/(^|[\\/])(edit|script)\.json$/.test(path))
      try {
        const { post: _upload, ...shown } = JSON.parse(text);
        text = JSON.stringify(shown);
      } catch {
        // not JSON: hash the raw text
      }
    return text;
  }))).digest("hex");

/** What MortgageReel reads for <dir> = public/videos/<slug>: edit.json, script.json, the recording's words.json. */
export const videoInputs = (dir, publicDir) => {
  let source;
  try {
    source = JSON.parse(readFileSync(join(dir, "edit.json"), "utf8")).source;
  } catch {
    // no or broken edit.json: words.json sits in the slug's folder
  }
  const words = source ? join(publicDir, "recordings", source, "words.json") : join(dir, "words.json");
  return [join(dir, "edit.json"), join(dir, "script.json"), words];
};

/** True when render-video.py's stamp <video>.inputs still says "rendering": the render stopped part way. */
export const unfinishedRender = (video) => {
  const stamp = video.replace(/\.mp4$/i, "") + ".inputs";
  return existsSync(stamp) && readFileSync(stamp, "utf8").trim() === "rendering";
};

/** Why `video` is older than its on-screen inputs, or null. Stamp <video>.inputs (render-video.py); none: file times. */
export const staleVideo = (video, inputs) => {
  const t = (f) => (existsSync(f) ? statSync(f).mtimeMs : 0);
  const stamp = video.replace(/\.mp4$/i, "") + ".inputs";
  if (t(stamp) >= t(video)) return readFileSync(stamp, "utf8").trim() === hashInputs(inputs) ? null : "its on-screen inputs changed since the render";
  const newer = inputs.filter((f) => t(f) > t(video));
  return newer.length ? `${newer.map((f) => f.split(/[\\/]/).pop()).join(", ")} changed after the render (no stamp, file times)` : null;
};

// Windows file names ignore case: compare names folded (NFC, lower case), on every OS.
export const fold = (s) => s.normalize("NFC").toLowerCase();

/** <outDir>/.publish-slugs.json, which slug each topic's files came from (keys folded). Missing: empty. Throws when broken. */
export const readOwners = (outDir) => {
  try {
    const data = JSON.parse(readFileSync(join(outDir, ".publish-slugs.json"), "utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.values(data).some((v) => typeof v !== "string"))
      throw new Error("not a {title: slug} object");
    return new Map(Object.entries(data).map(([k, v]) => [fold(k), v]));
  } catch (err) {
    if (err.code === "ENOENT") return new Map(); // none yet: files published before 01/10/2026 have no owner
    throw err;
  }
};

/** Writes the owner record through this process's own temp file: a failed write leaves the old record. */
export const writeOwners = (outDir, owner) => {
  const owners = join(outDir, ".publish-slugs.json");
  const tmp = `${owners}.${process.pid}-${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(Object.fromEntries(owner), null, 1)}\n`);
  renameSync(tmp, owners);
};

// ponytail: a lock older than this is a crashed publish's and is taken over; a copy that
// holds it longer (a very slow network folder) could be overtaken: raise it then.
export const LOCK_STALE_MS = 60_000;

/**
 * Holds <outDir>/.publish-slugs.lock (exclusive create) until this process exits, so two publishes
 * at once read, check and write the owner record one after the other. Throws after 2 x LOCK_STALE_MS.
 */
export const lockOwners = (outDir) => {
  const lock = join(outDir, ".publish-slugs.lock");
  const start = Date.now();
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      process.once("exit", () => rmSync(lock, { force: true }));
      return;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    let age;
    try {
      age = Date.now() - statSync(lock).mtimeMs;
    } catch {
      continue; // released meanwhile
    }
    if (age > LOCK_STALE_MS) rmSync(lock, { force: true });
    else if (Date.now() - start > 2 * LOCK_STALE_MS) throw new Error(`${lock} is held by another publish (delete it if none is running)`);
    else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
};

/** Slugs under root whose post (the first of `files` that has one) gives the same file name as `title`. */
export const titleSlugs = (root, files, title) => {
  const key = fold(topicFileName(title));
  return (existsSync(root) ? readdirSync(root) : []).filter((slug) => {
    for (const file of files) {
      let post;
      try {
        post = JSON.parse(readFileSync(join(root, slug, file), "utf8")).post;
      } catch {
        continue; // no such file, or broken: publish of that slug reports it
      }
      if (post) return typeof post.title === "string" && fold(topicFileName(post.title)) === key;
    }
    return false;
  });
};

/**
 * The stop for same-topic files with no owner on record (published before 01/10/2026): they are
 * never replaced without --claim, since a post title can change after a publish. `matches`
 * (titleSlugs) only names the videos whose post title gives that file name today.
 */
export const legacyOwnerStop = (slug, matches, { topic, outDir, where, cmd }) => {
  const seen = !matches.length ? "none"
    : `${matches.map((s) => `"${s}"`).join(", ")}${matches.length === 1 && matches[0] === slug ? " (looks like this video's)" : ""}`;
  return `"${topic}" files in ${outDir} have no recorded owner (published before owners were recorded), so they are not replaced on a guess. Nothing copied.\n` +
    `Videos in the repo whose post title gives this file name: ${seen}.\n` +
    `If the files are really "${slug}"'s: ${cmd} --force --claim\n` +
    `Otherwise give "${slug}" its own post title in ${where}, then run: ${cmd} --force`;
};

/** What is wrong with a post, in plain words; [] when it is fine. */
export const postProblems = (post) => {
  if (!post || typeof post !== "object") return ['There is no "post" (title, caption, hashtags).'];
  const problems = [];
  if (typeof post.title !== "string" || !post.title.trim())
    problems.push("The post has no title. The title becomes the video's file name.");
  else if (!topicFileName(post.title))
    problems.push(`The title "${post.title}" has nothing left once the characters Windows forbids in file names are taken out.`);
  if (typeof post.caption !== "string" || !post.caption.trim())
    problems.push("The post has no caption text.");
  const tags = post.hashtags;
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) {
    problems.push(`"hashtags" must be a list of ${TAG_COUNT}: #finhub, #vietnamese and 5 about the topic.`);
    return problems;
  }
  if (tags.length !== TAG_COUNT)
    problems.push(`There are ${tags.length} hashtags; there must be exactly ${TAG_COUNT}: #finhub, #vietnamese and 5 about the topic.`);
  const seen = new Set();
  for (const tag of tags) {
    if (!tag.startsWith("#")) problems.push(`Hashtag "${tag}" must start with #.`);
    else if (tag.length < 2) problems.push('A hashtag is just "#" with no word after it.');
    if (/\s/.test(tag)) problems.push(`Hashtag "${tag}" has a space in it; write it as one word, e.g. "${tag.replace(/\s+/g, "")}".`);
    const key = tag.toLowerCase();
    if (seen.has(key)) problems.push(`Hashtag "${tag}" is there twice.`);
    seen.add(key);
  }
  for (const req of REQUIRED_TAGS)
    if (!seen.has(req)) problems.push(`${req} is missing; every post carries #finhub and #vietnamese.`);
  return problems;
};

const WHERE = { "post.title": "title", "post.caption": "caption", "post.hashtags": "hashtags" };

/**
 * RG 234 over the post, in plain words. An exemption declared for field "post"
 * (the key voice-video.mjs uses) covers the title, caption and hashtags.
 */
export const rg234Problems = (assertCompliantCopy, post, exemptions = []) => {
  const fields = { "post.title": post.title, "post.caption": post.caption, "post.hashtags": post.hashtags };
  const expanded = exemptions.flatMap((e) =>
    e.field === "post" ? Object.keys(fields).map((field) => ({ ...e, field })) : [e]);
  try {
    assertCompliantCopy(fields, expanded);
    return [];
  } catch (err) {
    const lines = [...err.message.matchAll(/^\s+(post\.\w+): "(.+?)" — (.+)$/gm)];
    if (!lines.length) return [err.message];
    return lines.map(([, key, term, why]) => {
      const text = [fields[key]].flat().join(" ");
      const at = text.toLowerCase().indexOf(term);
      const around = at < 0 ? "" : ` ("…${text.slice(Math.max(0, at - 30), at + term.length + 30)}…")`;
      const rule = why.startsWith("promotional") ? "ASIC RG 234 bans this promotional phrase in ads"
        : why.startsWith("restricted") ? "ASIC RG 234 restricts this word in ads" : why;
      return `The ${WHERE[key]} uses "${term}"${around}: ${rule}. ` +
        `Rewrite it (e.g. "lựa chọn cạnh tranh", "subject to eligibility"). Only if it is a definition, ` +
        `a negation, a named source's own words or another company's name, add an exemption ` +
        `{"field": "post", "term": "${term}", "reason": "...", "note": "why"}.`;
    });
  }
};

/** The caption file's text. Footer lines already in the caption are taken out
 * so the footer appears exactly once; `removed` lists them. */
export const buildCaption = (post, broker, c) => {
  const footer = [c.LICENSING_STATEMENT, c.CREDIT_REP_STATEMENT, c.DISCLAIMER_EN, c.DISCLAIMER_VI]
    .map((s) => s.normalize("NFC"));
  let body = post.caption.normalize("NFC");
  const removed = footer.filter((line) => body.includes(line));
  for (const line of removed) body = body.split(line).join("");
  body = body.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  const text = [
    post.title.normalize("NFC").trim(),
    body,
    [`Name: ${broker.name}`, `Mobile: ${broker.mobile}`, `Website: ${broker.website}`, `Company: ${broker.company}`].join("\n"),
    post.hashtags.join(" "),
    footer.join("\n"),
  ].join("\n\n");
  return { text: `${text}\n`, removed };
};

/** compliance.ts bundled to plain JS (Node can't load its TS directly). */
export const loadCompliance = async () => {
  const dir = repoTmp("publish-");
  execFileSync(process.execPath, [
    join(ROOT, "node_modules/esbuild/bin/esbuild"), join(ROOT, "src/mortgage/compliance.ts"),
    "--bundle", "--format=esm", "--platform=node", "--out-extension:.js=.mjs", `--outdir=${dir}`,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  return import(pathToFileURL(join(dir, "compliance.mjs")).href);
};

export const loadBroker = (path = join(ROOT, "config", "broker.json")) => {
  const broker = JSON.parse(readFileSync(path, "utf8"));
  for (const key of ["name", "mobile", "website", "company"])
    if (typeof broker[key] !== "string" || !broker[key].trim())
      throw new Error(`config/broker.json needs "${key}" (the broker details printed in every caption).`);
  return broker;
};

const main = async () => {
  const fail = (msg, code = 1) => {
    console.error(`publish-video: ${msg}`);
    process.exit(code);
  };
  const USAGE = "usage: node scripts/publish-video.mjs <slug> [--force] [--stale-ok] [--claim] [--out <dir>] [--public-dir <dir>] [--video <file>]";
  const argv = process.argv.slice(2);
  const valued = ["--out", "--public-dir", "--video"];
  const value = (flag) => {
    if (!argv.includes(flag)) return undefined;
    const v = argv[argv.indexOf(flag) + 1];
    if (!v || v.startsWith("--")) fail(`${flag} needs a value. ${USAGE}`);
    return v;
  };
  const slug = argv.find((a, k) => !a.startsWith("--") && !valued.includes(argv[k - 1]));
  if (!slug) fail(USAGE);
  assertSlug(slug);
  const cmd = `node scripts/publish-video.mjs ${slug}`;

  const publicDir = resolve(value("--public-dir") ?? join(ROOT, "public"));
  const dir = join(publicDir, "videos", slug);
  if (argv.includes("--inputs-hash")) return console.log(hashInputs(videoInputs(dir, publicDir)));
  const read = (name) => {
    const path = join(dir, name);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      fail(`${path} is not valid JSON (${err.message}). Fix it, then run: ${cmd}`);
    }
  };
  const edit = read("edit.json");
  const script = read("script.json");
  if (!edit && !script) fail(`There is no video "${slug}" (no edit.json or script.json in ${dir}).`);
  const [file, source] = edit?.post ? ["edit.json", edit] : script?.post ? ["script.json", script] : [edit ? "edit.json" : "script.json", null];
  const where = `public/videos/${slug}/${file}`;
  if (!source)
    fail(`"${slug}" has no post copy, so it was not put in the finished-videos folder.\n` +
      `Add to ${where}:\n  "post": {"title": "<the topic, becomes the file name>", ` +
      `"caption": "<a few sentences ending in one call to action>", ` +
      `"hashtags": ["#finhub", "#vietnamese", <5 more about the topic>]}\nThen run: ${cmd}`);

  const post = source.post;
  let compliance;
  try {
    compliance = await loadCompliance();
  } catch (err) {
    fail(`could not load the RG 234 guard (src/mortgage/compliance.ts): ${(err.stderr || err.message).toString().slice(-400)}`);
  }
  const { assertCompliantCopy } = compliance;
  const problems = postProblems(post);
  if (!problems.length) problems.push(...rg234Problems(assertCompliantCopy, post, source.exemptions));
  if (problems.length)
    fail(`the post in ${where} needs fixing before "${slug}" goes in the finished-videos folder:\n` +
      `${problems.map((p) => `  - ${p}`).join("\n")}\nThen run: ${cmd}`);

  const video = resolve(value("--video") ?? join(ROOT, "out", "videos", slug, `${slug}.mp4`));
  if (!existsSync(video)) fail(`The rendered video ${video} is not there yet. Render it first: python scripts/render-video.py ${slug}`);
  if (unfinishedRender(video))
    fail(`the last render of ${slug} did not finish (render-video.py stopped part way), so ${video} may be partial or not loudness-normalised. Nothing copied.\n` +
      `Re-render it: python scripts/render-video.py ${slug}`);
  const stale = argv.includes("--stale-ok") ? null : staleVideo(video, videoInputs(dir, publicDir));
  if (stale)
    fail(`${video} shows old copy: ${stale} (edit.json/script.json other than "post", or words.json). Nothing copied.\n` +
      `Re-render it: python scripts/render-video.py ${slug}\nTo publish it as it is: ${cmd} --force --stale-ok`);
  let broker;
  try {
    broker = loadBroker();
  } catch (err) {
    fail(err.message);
  }

  const outDir = resolve(value("--out") ?? OUTPUT_DIR);
  mkdirSync(outDir, { recursive: true });
  const topic = topicFileName(post.title);
  const mp4 = join(outDir, `${topic}.mp4`);
  const txt = join(outDir, `${topic} - caption.txt`);
  // Read live on each call, so the owner checks after lockOwners see a file a concurrent publish just copied.
  const exists = (path) => readdirSync(outDir).some((name) => fold(name) === fold(basename(path)));
  if (!argv.includes("--force"))
    for (const path of [mp4, txt])
      if (exists(path))
        fail(`"${path}" already exists, so nothing was copied.\n` +
          `Same video, re-rendered? Replace it: ${cmd} --force\n` +
          `A different video? Give it a different post title in ${where}.`);
  // Which slug each topic's files came from: --force replaces only the same slug's.
  const owners = join(outDir, ".publish-slugs.json");
  try {
    lockOwners(outDir);
  } catch (err) {
    fail(`${err.message}. Nothing copied.`);
  }
  let owner;
  try {
    owner = readOwners(outDir);
  } catch (err) {
    fail(`${owners} is broken (${err.message}), so which video owns each title is unknown. Nothing copied.\n` +
      `Fix it by hand. Deleting it leaves every title in ${outDir} with no owner (each then needs --claim).`);
  }
  const other = owner.get(fold(topic));
  if (other && other !== slug && [mp4, txt].some(exists))
    fail(`"${topic}" in ${outDir} is video "${other}", not "${slug}": both have the post title "${post.title}". Nothing copied.\n` +
      `Give "${slug}" its own post title in ${where}, then run: ${cmd} --force\n` +
      `(Only if "${other}" is gone for good: delete its "${topic}" files first.)`);
  if (!other && !argv.includes("--claim") && [mp4, txt].some(exists))
    fail(legacyOwnerStop(slug, titleSlugs(join(publicDir, "videos"), ["edit.json", "script.json"], post.title), { topic, outDir, where, cmd }), 4);

  const { text, removed } = buildCaption(post, broker, compliance);
  // The owner first, through a temp file: a failed write leaves the old record and copies nothing.
  owner.set(fold(topic), slug);
  writeOwners(outDir, owner);
  copyFileSync(video, mp4);
  writeFileSync(txt, text, "utf8");
  if (removed.length)
    console.log(`publish-video: the caption already had ${removed.length} footer line(s); they appear once, in the footer.`);
  console.log(`publish-video: finished video and caption ready\n  ${mp4}\n  ${txt}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
