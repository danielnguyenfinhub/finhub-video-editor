// Hand a rendered Global RE listing video to Daniel: the videos named after
// the post title and one caption file, in "4 - GLOBAL RE FINISHED VIDEOS"
// (Global RE's own folder; "2 - FINISHED VIDEOS" is Finance Hub's).
//
//   node scripts/publish-listing.mjs <slug> [--force] [--stale-ok]
//   node scripts/publish-listing.mjs <slug> --inputs-hash <lang>   (listing-render.py's stamp)
//
// Reads public/listings/<slug>/script.json "post" {title, caption (VI),
// captionEn, hashtags} and copies out/listings/<slug>/<slug>-<lang>.mp4 and
// -<lang>-feed.mp4 for each language rendered:
//   <Topic> (VI).mp4, <Topic> (VI) - feed 4x5.mp4, the same for (EN)
//   <Topic> - caption.txt   title, VI + EN text, agent contact block, 7 hashtags,
//                           then the agency, licensee and disclaimer footer
// Checks: exactly 7 hashtags incl. #globalre and the suburb's, and the listing
// compliance guard over everything (scripts/listing-compliance.mjs). A listing
// with "unknown" agency-agreement facts is a TEST: files start "TEST - " and the
// caption says not to post. Never replaces a file unless --force. Refuses a
// language whose on-screen inputs (script.json without "post", listing.json, its
// words) changed since it was rendered, unless --stale-ok. "post" is upload copy,
// not on screen, so fixing it never needs a re-render.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { checkSlug, loadChecker } from "./listing-compliance.mjs";
import { assertSlug } from "./listing-prep.mjs";
import { topicFileName } from "./publish-video.mjs";

const ROOT = join(import.meta.dirname, "..");
export const OUTPUT_DIR = join(ROOT, "4 - GLOBAL RE FINISHED VIDEOS");
const LANGS = { vi: "VI", en: "EN" };

export const suburbTag = (suburb) => `#${suburb.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase()}`;

/** What is wrong with a listing post, in plain words; [] when fine. */
export const listingPostProblems = (post, suburb) => {
  if (!post || typeof post !== "object") return ['script.json has no "post" (title, caption, captionEn, hashtags).'];
  const problems = [];
  for (const key of ["title", "caption", "captionEn"])
    if (typeof post[key] !== "string" || !post[key].trim()) problems.push(`The post has no "${key}".`);
  if (post.title && !topicFileName(post.title)) problems.push(`The title "${post.title}" can't be a file name.`);
  const tags = Array.isArray(post.hashtags) ? post.hashtags : [];
  if (tags.length !== 7) problems.push(`There are ${tags.length} hashtags; there must be exactly 7, including #globalre and ${suburbTag(suburb)}.`);
  const seen = new Set(tags.map((t) => String(t).toLowerCase()));
  if (seen.size !== tags.length) problems.push("A hashtag is there twice.");
  for (const t of tags) if (!/^#\S+$/.test(t)) problems.push(`Hashtag "${t}" must start with # and have no spaces.`);
  for (const req of ["#globalre", suburbTag(suburb)]) if (!seen.has(req)) problems.push(`${req} is missing.`);
  return problems;
};

/** Hash of what a language's render shows: script.json without "post", listing.json, words-<lang>.json. */
export const onScreenHash = (base, lang) => {
  const text = (f) => (existsSync(join(base, f)) ? readFileSync(join(base, f), "utf8") : "");
  let script = text("script.json");
  try {
    const { post: _upload, ...shown } = JSON.parse(script);
    script = JSON.stringify(shown);
  } catch {
    // not JSON: hash the raw text
  }
  return createHash("sha256").update(JSON.stringify([script, text("listing.json"), text(`words-${lang}.json`)])).digest("hex");
};

/** listing-render.py writes onScreenHash here once <slug>-<lang>.mp4 is finished. */
export const stampPath = (outDir, slug, lang) => join(outDir, `${slug}-${lang}.inputs`);

/** Languages whose render in outDir shows older on-screen inputs than base has now. */
export const staleLangs = (outDir, base, slug) => {
  const t = (f) => (existsSync(f) ? statSync(f).mtimeMs : 0);
  return Object.keys(LANGS).filter((lang) => {
    const mp4 = join(outDir, `${slug}-${lang}.mp4`), stamp = stampPath(outDir, slug, lang);
    if (!existsSync(mp4)) return false;
    if (t(stamp) >= t(mp4)) return readFileSync(stamp, "utf8").trim() !== onScreenHash(base, lang);
    // No stamp (rendered before 01/10/2026, or not by listing-render.py): file times.
    return t(mp4) < Math.max(...["script.json", "listing.json", `words-${lang}.json`].map((f) => t(join(base, f))));
  });
};

/** publish-listing's stop for stale languages, or null (none stale, or --stale-ok). */
export const staleStop = (outDir, base, slug, staleOk) => {
  const stale = staleOk ? [] : staleLangs(outDir, base, slug);
  const cmd = `node scripts/publish-listing.mjs ${slug}`;
  return stale.length ? `the ${stale.join(" and ")} video in out/listings/${slug}/ was rendered before the last on-screen change (script.json scenes, listing.json or its words; not "post"), so it shows old copy. Nothing copied. Re-render it: npm run listing-render -- ${slug} --lang ${stale[0]}. To publish it as it is: ${cmd} --force --stale-ok` : null;
};

/** The caption file's text. */
export const buildListingCaption = ({ post, listing, business, agent, licensee, disclaimer, test }) =>
  [
    ...(test ? [`TEST — KHÔNG ĐĂNG / NOT FOR POSTING (${test}).`] : []),
    post.title.normalize("NFC"),
    post.caption.normalize("NFC"),
    post.captionEn.normalize("NFC"),
    ...(listing.photos.some((p) => p.edited) ? ["Hình ảnh nội thất đã được dàn dựng ảo. / Interior images are virtually staged."] : []),
    [
      `Liên hệ / Contact: ${agent.displayName}, ${agent.title}`,
      `Mobile: ${agent.mobile}`,
      `Email: ${agent.email}`,
      `${business.name}: ${business.phone} · ${business.website}`,
    ].join("\n"),
    post.hashtags.join(" "),
    [
      `${business.legalName} · ${business.office}`,
      `Licensee: ${licensee.displayName} · Lic. ${licensee.licence.number}`,
      ...(listing.materialFacts.length ? [`Material facts: ${listing.materialFacts.join("; ")}`] : []),
      disclaimer.vi,
      disclaimer.en,
    ].join("\n"),
  ].join("\n\n") + "\n";

const main = async () => {
  const fail = (msg) => {
    console.error(`publish-listing: ${msg}`);
    process.exit(1);
  };
  const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!slug) fail("usage: node scripts/publish-listing.mjs <slug> [--force]");
  assertSlug(slug);
  const dir = join(ROOT, "public", "listings", slug);
  const hashLang = process.argv[process.argv.indexOf("--inputs-hash") + 1];
  if (process.argv.includes("--inputs-hash")) {
    if (!(hashLang in LANGS)) fail("usage: node scripts/publish-listing.mjs <slug> --inputs-hash vi|en");
    console.log(onScreenHash(dir, hashLang));
    return;
  }
  const cmd = `node scripts/publish-listing.mjs ${slug}`;
  const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (!existsSync(join(dir, "script.json"))) fail(`There is no listing "${slug}" (public/listings/${slug}/script.json).`);
  const listing = read("listing.json");
  const { post } = read("script.json");
  const problems = listingPostProblems(post, listing.suburb);
  if (problems.length) fail(`fix the post in public/listings/${slug}/script.json first:\n${problems.map((p) => `  - ${p}`).join("\n")}\nThen run: ${cmd}`);
  const { flags, confirm } = await checkSlug(slug);
  if (flags.length) fail(`listing compliance:\n${flags.map((f) => `  ${f.where}: "${f.phrase}" — ${f.reason}`).join("\n")}\nRewrite, re-render, then run: ${cmd}`);

  const business = JSON.parse(readFileSync(join(ROOT, "config", "businesses", "globalre.json"), "utf8"));
  const agent = business.agents[listing.agent];
  const licensee = business.agents[business.licensee];
  const { DISCLAIMER } = await loadChecker();
  const test = listing.unknowns?.length ? `thiếu / missing: ${listing.unknowns.join(", ")}` : listing.test ? "thử quy trình / pipeline test" : null;
  const topic = `${test ? "TEST - " : ""}${topicFileName(post.title)}`;

  const outDir = join(ROOT, "out", "listings", slug);
  const copies = Object.entries(LANGS).flatMap(([lang, tag]) => [
    [join(outDir, `${slug}-${lang}.mp4`), `${topic} (${tag}).mp4`],
    [join(outDir, `${slug}-${lang}-feed.mp4`), `${topic} (${tag}) - feed 4x5.mp4`],
  ]).filter(([src]) => existsSync(src));
  if (!copies.length) fail(`Nothing rendered yet in out/listings/${slug}/. Render first: npm run listing-render -- ${slug}`);
  const stop = staleStop(outDir, dir, slug, process.argv.includes("--stale-ok"));
  if (stop) fail(stop);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const txt = join(OUTPUT_DIR, `${topic} - caption.txt`);
  if (!process.argv.includes("--force"))
    for (const path of [...copies.map(([, name]) => join(OUTPUT_DIR, name)), txt])
      if (existsSync(path)) fail(`"${path}" already exists, nothing copied. Same listing re-rendered? ${cmd} --force`);
  for (const [src, name] of copies) copyFileSync(src, join(OUTPUT_DIR, name));
  writeFileSync(txt, buildListingCaption({ post, listing, business, agent, licensee, disclaimer: DISCLAIMER, test }), "utf8");
  console.log(`publish-listing: ready in "4 - GLOBAL RE FINISHED VIDEOS":\n${[...copies.map(([, n]) => n), `${topic} - caption.txt`].map((n) => `  ${n}`).join("\n")}`);
  for (const c of confirm) console.log(`  confirm with ${agent.displayName} before posting: "${c.phrase}"`);
  if (test) console.log(`  TEST, not for posting (${test}).`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
