// Listing-copy compliance for a Global RE listing video: every spoken line,
// subtitle, highlight, post field, on-screen listing field and ListingReel's
// fixed strings (src/listing/copy.ts) through checkListingCopy
// (src/listing/compliance.ts, plus src/listing/compliance-rules.ts when that
// file exists).
//
//   node scripts/listing-compliance.mjs <slug>     exit 1 on any flag
//
// voice-video.mjs --listing runs it before voicing, listing-render.py before
// rendering. There is no exemption list on purpose: rewrite the line.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
const RULES = join(ROOT, "src", "listing", "compliance-rules.ts");

// compliance.ts (+ the rules file if present) + copy.ts bundled to plain JS:
// Node can't follow extensionless TS imports or the JSON config on its own.
export const loadChecker = async () => {
  const dir = repoTmp("listing-compliance-");
  const abs = (p) => JSON.stringify(join(ROOT, p).replace(/\\/g, "/"));
  const hasRules = existsSync(RULES);
  writeFileSync(
    join(dir, "entry.ts"),
    [
      `import { makeListingChecker } from ${abs("src/listing/compliance.ts")};`,
      `export { fixedStrings, DISCLAIMER } from ${abs("src/listing/copy.ts")};`,
      `export { roomLabels } from ${abs("src/listing/rooms.ts")};`,
      hasRules ? `import * as rules from ${abs("src/listing/compliance-rules.ts")};` : "const rules = undefined;",
      "export const check = makeListingChecker(rules);",
    ].join("\n"),
  );
  execFileSync(process.execPath, [
    join(ROOT, "node_modules/esbuild/bin/esbuild"), join(dir, "entry.ts"),
    "--bundle", "--format=esm", "--platform=node", `--outfile=${join(dir, "entry.mjs")}`,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const mod = await import(pathToFileURL(join(dir, "entry.mjs")).href);
  return { ...mod, hasRules };
};

// [{where, text}] for everything a listing video shows or says.
export const listingStrings = (listing, script) => {
  const out = [];
  const add = (where, text) => {
    if (typeof text === "string" && text.trim()) out.push({ where, text });
  };
  add("script.title", script.title);
  (script.scenes ?? []).forEach((s, i) => {
    const at = `scenes[${i}] (${s.id})`;
    add(`${at}.vi`, s.vi);
    add(`${at}.en`, s.en);
    add(`${at}.highlight`, s.highlight);
  });
  const post = script.post ?? {};
  add("post.title", post.title);
  add("post.caption", post.caption);
  add("post.captionEn", post.captionEn);
  (post.hashtags ?? []).forEach((h, i) => add(`post.hashtags[${i}]`, h));
  if (listing) {
    for (const key of ["price", "auction", "availableFrom"]) add(`listing.${key}`, listing[key]);
    // Features and material facts feed the script and the end card.
    (listing.features ?? []).forEach((t, i) => add(`listing.features[${i}]`, t));
    (listing.materialFacts ?? []).forEach((t, i) => add(`listing.materialFacts[${i}]`, t));
    (listing.openHomes ?? []).forEach((t, i) => add(`listing.openHomes[${i}]`, t));
    (listing.nearby ?? []).forEach((t, i) => add(`listing.nearby[${i}]`, t));
  }
  return out;
};

/** Flags for a slug: [{where, text, phrase, reason}]. `dir`: another listing folder (tests). */
export const checkSlug = async (slug, dir = join(ROOT, "public", "listings", slug)) => {
  const read = (name) => {
    const p = join(dir, name);
    if (!existsSync(p)) throw new Error(`public/listings/${slug}/${name} not found.`);
    return JSON.parse(readFileSync(p, "utf8"));
  };
  // The shapes first (src/listing/schema.ts, through Node's type stripping).
  const { listingSchema, scriptSchema } = await import(pathToFileURL(join(ROOT, "src", "listing", "schema.ts")).href);
  const shape = (schema, data, name) => {
    const r = schema.safeParse(data);
    if (!r.success)
      throw new Error(`public/listings/${slug}/${name} is not valid:\n${r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    return r.data;
  };
  const listing = shape(listingSchema, read("listing.json"), "listing.json");
  const script = shape(scriptSchema, read("script.json"), "script.json");
  const photos = new Set(listing.photos.map((p) => p.file));
  for (const s of script.scenes)
    if (s.photo && !photos.has(s.photo)) throw new Error(`script.json scene "${s.id}" uses photo ${s.photo}, which is not in listing.json.`);
  const { check, fixedStrings, roomLabels, hasRules } = await loadChecker();
  const ctx = { features: listing.features, doNotSay: listing.doNotSay, listingType: listing.listingType, price: listing.price, estimatedSellingPrice: listing.estimatedSellingPrice };
  const items = [
    ...listingStrings(listing, script),
    ...fixedStrings().map((text) => ({ where: "src/listing/copy.ts", text })),
    ...roomLabels().map((text) => ({ where: "src/listing/rooms.ts", text })),
  ];
  const results = items.map(({ where, text }) => ({ where, text, ...check(text, ctx) }));
  const flags = results.flatMap((r) => r.flags.map((f) => ({ where: r.where, text: r.text, ...f })));
  // Agent-stated features that a rule wants proved: allowed, listed for the agent.
  const confirm = [...new Map(results.flatMap((r) => r.confirm).map((f) => [f.phrase.toLowerCase(), f])).values()];
  // Photos of a tenanted home need the tenant's written consent (RTA ss 55AA, 55A).
  if (listing.tenanted && !listing.tenantPhotoConsent)
    flags.push({
      where: "listing.txt", text: "Tenanted? yes / Tenant consent for photos obtained? no",
      phrase: "tenant photo consent",
      reason: "nhà có người thuê nhưng chưa có đồng ý chụp ảnh / tenanted with no photo consent: get written consent, then set it to yes (RTA ss 55AA, 55A)",
    });
  const unknowns = (listing.unknowns ?? []).map((u) => ({
    tenanted: "tenanted? (unknown: RTA ss 55AA, 55A photo consent can't be checked)",
    estimatedPrice: "estimated selling price (unknown: PSAA s 73(1) underquoting can't be checked)",
  })[u]);
  return { flags, confirm, unknowns, checked: items.length, hasRules };
};

const main = async () => {
  const slug = process.argv[2];
  if (!slug) {
    console.error("usage: node scripts/listing-compliance.mjs <slug>");
    process.exit(1);
  }
  let result;
  try {
    result = await checkSlug(slug);
  } catch (err) {
    console.error(`listing-compliance: ${(err.stderr || err.message).toString().slice(-600)}`);
    process.exit(1);
  }
  const { flags, confirm, unknowns, checked, hasRules } = result;
  const rules = hasRules ? "baseline + compliance-rules.ts" : "baseline only (src/listing/compliance-rules.ts not there yet)";
  if (flags.length) {
    for (const f of flags) console.error(`  ${f.where}: "${f.phrase}" — ${f.reason}\n      in: ${f.text}`);
    console.error(`listing-compliance: ${flags.length} problem(s) in ${checked} strings (${rules}). Rewrite those lines; nothing was voiced or rendered.`);
    process.exit(1);
  }
  console.log(`listing-compliance: OK, ${checked} strings checked (${rules}).`);
  for (const c of confirm) console.log(`  to confirm with the agent before posting: "${c.phrase}" (from the listing's key features) — ${c.reason}`);
  for (const u of unknowns) console.log(`  TEST ONLY, not for posting until filled in: ${u}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
