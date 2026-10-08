// After COMPLETED and Daniel's yes: stage the finished video, caption and thumbnail for Drive, and keep the
// ledger (out/videos/<slug>/team/07_published.json) so a retry never repeats a step (a YouTube upload is not idempotent).
// The Drive, YouTube and Facebook calls are MCP tools the orchestrator makes; this script names the files, checks the
// gates and says what is next.
//   node scripts/publish-post.mjs <slug> plan
//   node scripts/publish-post.mjs <slug> stage                      copy the three files into config/publish.json drive.syncDir
//   node scripts/publish-post.mjs <slug> mark <step> [key=value..]  record a step (approved text="Daniel: yes")
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { OUTPUT_DIR, topicFileName } from "./publish-video.mjs";
import { assertSlug } from "./listing-prep.mjs";

const ROOT = join(import.meta.dirname, "..");
export const STEPS = ["approved", "staged", "drive", "youtube", "thumbnail", "public", "facebook", "moved"];
const NEEDS = { youtube: ["drive"], thumbnail: ["youtube"], public: ["drive"], facebook: ["public"], moved: ["youtube", "thumbnail", "facebook"] };

/** "Dừng tin tất cả" -> "Dung-tin-tat-ca": the ASCII name the Drive folder already uses. */
export const asciiSlug = (t) => {
  const s = t.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};
export const driveNames = (topic, date) => {
  const base = `${date}_${asciiSlug(topic)}`;
  return { video: `${base}_Video.mp4`, caption: `${base}_Caption.txt`, thumbnail: `${base}_Thumbnail.png` };
};
/** First step not done whose prerequisites are done; "done" when all are. */
export const nextStep = (steps) => STEPS.find((s) => !steps[s]) ?? "done";

const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

export function plan(slug) {
  assertSlug(slug);
  const dir = join(ROOT, "out", "videos", slug), team = join(dir, "team"), ledgerPath = join(team, "07_published.json");
  const ledger = existsSync(ledgerPath) ? json(ledgerPath) : { slug, date: today(), steps: {} };
  const cfg = json(join(ROOT, "config", "publish.json"));
  const edit = ["edit.json", "script.json"].map((f) => join(ROOT, "public", "videos", slug, f)).find(existsSync);
  const title = edit && json(edit).post?.title;
  const stop = [];
  if (!title) stop.push("no post.title in edit.json/script.json");
  const topic = title ? topicFileName(title) : slug;
  const files = { video: join(OUTPUT_DIR, `${topic}.mp4`), caption: join(OUTPUT_DIR, `${topic} - caption.txt`), thumbnail: join(dir, "thumbnail.png") };
  for (const [k, p] of Object.entries(files)) if (!existsSync(p)) stop.push(`missing ${k}: ${p}`);
  for (const f of ["04_compliance_final.json", "02_compliance_script.json"]) {
    const p = join(team, f);
    if (existsSync(p) && json(p).verdict !== "PASS") stop.push(`${f} verdict is ${json(p).verdict}, not PASS`);
  }
  if (!existsSync(join(team, "04_compliance_final.json"))) stop.push("04_compliance_final.json missing: run the compliance reviewer's final stage first");
  if (!cfg.drive.syncDir) stop.push("config/publish.json drive.syncDir is null: set the Google Drive for Desktop folder that syncs to the upload folder");
  for (const k of ["containsSyntheticMedia", "paidProductPlacement"]) if (cfg.youtube[k] === null) stop.push(`config/publish.json youtube.${k} is null: Daniel decides`);
  const next = nextStep(ledger.steps);
  if (next !== "approved" && !ledger.steps.approved) stop.push("no approval recorded");
  const blocked = (NEEDS[next] ?? []).filter((n) => !ledger.steps[n]);
  return { slug, topic, date: ledger.date, names: driveNames(topic, ledger.date), files, cfg, ledgerPath, ledger, next, stop, blocked };
}

function main([slug, cmd, ...rest]) {
  const p = plan(slug);
  if (cmd === "plan") {
    const { cfg, ledger, ...show } = p;
    console.log(JSON.stringify({ ...show, done: Object.keys(ledger.steps) }, null, 2));
    return p.stop.length ? 2 : 0;
  }
  if (cmd === "stage") {
    if (p.stop.length) { console.error(p.stop.join("\n")); return 2; }
    if (!ledger_ok(p, "approved")) return 2;
    for (const k of ["video", "caption", "thumbnail"]) copyFileSync(p.files[k], join(p.cfg.drive.syncDir, p.names[k]));
    return mark(p, "staged", [`names=${Object.values(p.names).join(",")}`]);
  }
  if (cmd === "mark") {
    const [step, ...kv] = rest;
    if (!STEPS.includes(step)) { console.error(`step must be one of ${STEPS.join(", ")}`); return 2; }
    const missing = (NEEDS[step] ?? []).filter((n) => !p.ledger.steps[n]);
    if (missing.length) { console.error(`${step} needs ${missing.join(", ")} first`); return 2; }
    return mark(p, step, kv);
  }
  console.error("usage: publish-post.mjs <slug> plan|stage|mark <step> [key=value..]");
  return 2;
}
const ledger_ok = (p, s) => p.ledger.steps[s] || (console.error(`${s} not recorded: Daniel's yes for this video comes first`), false);
function mark(p, step, kv) {
  const rec = { at: new Date().toISOString(), ...Object.fromEntries(kv.map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)])) };
  mkdirSync(join(p.ledgerPath, ".."), { recursive: true });
  writeFileSync(p.ledgerPath, JSON.stringify({ ...p.ledger, steps: { ...p.ledger.steps, [step]: rec } }, null, 2) + "\n");
  console.log(`${step} recorded; next: ${nextStep({ ...p.ledger.steps, [step]: rec })}`);
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
