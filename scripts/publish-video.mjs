// Hand a rendered video to Daniel: a copy named after its topic and a caption
// file ready to paste, both in the finished-videos folder.
//
//   node scripts/publish-video.mjs <slug> [--force] [--out <dir>] [--public-dir <dir>] [--video <file>]
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
// invisible first character). Never replaces a file unless --force.
// render-video.py runs this after every render.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(capped) ? `${capped} video` : capped;
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
  const dir = mkdtempSync(join(tmpdir(), "publish-"));
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
  const fail = (msg) => {
    console.error(`publish-video: ${msg}`);
    process.exit(1);
  };
  const USAGE = "usage: node scripts/publish-video.mjs <slug> [--force] [--out <dir>] [--public-dir <dir>] [--video <file>]";
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
  const cmd = `node scripts/publish-video.mjs ${slug}`;

  const dir = join(resolve(value("--public-dir") ?? join(ROOT, "public")), "videos", slug);
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
  if (!argv.includes("--force"))
    for (const path of [mp4, txt])
      if (existsSync(path))
        fail(`"${path}" already exists, so nothing was copied.\n` +
          `Same video, re-rendered? Replace it: ${cmd} --force\n` +
          `A different video? Give it a different post title in ${where}.`);

  const { text, removed } = buildCaption(post, broker, compliance);
  copyFileSync(video, mp4);
  writeFileSync(txt, text, "utf8");
  if (removed.length)
    console.log(`publish-video: the caption already had ${removed.length} footer line(s); they appear once, in the footer.`);
  console.log(`publish-video: finished video and caption ready\n  ${mp4}\n  ${txt}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
