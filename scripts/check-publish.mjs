// Self-test for scripts/publish-video.mjs on synthetic posts and publish-listing's
// stale-language check (file times, and listing-render's on-screen hash stamp), publish-video's
// same-title guard and stale-render stop (no media; a temp folder only): node scripts/check-publish.mjs -> "publish ok", exit 1 on failure.
import assert from "node:assert/strict";
import {
  buildCaption, loadBroker, loadCompliance, postProblems, rg234Problems, topicFileName,
} from "./publish-video.mjs";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { join } from "node:path";
import { onScreenHash, staleLangs, stampPath, staleStop } from "./publish-listing.mjs";

// File names: Windows-forbidden characters go, dates stay readable, diacritics stay.
assert.equal(topicFileName("Lãi suất 4,35%: điều cần biết trước ngày 29/9"),
  "Lãi suất 4,35% - điều cần biết trước ngày 29-9");
assert.equal(topicFileName('Vay "nhanh"? <thử> *không* | a\\b  '), "Vay nhanh thử không - a-b");
assert.equal(topicFileName("Kết thúc bằng dấu chấm..."), "Kết thúc bằng dấu chấm");
assert.equal(topicFileName("Tiến"), "Tiến"); // NFC: one character per letter
assert.equal([...topicFileName("Ư".repeat(200))].length, 120);
assert.equal(topicFileName("CON"), "CON video");

const good = {
  title: "Phí ngân hàng: 3 điều nên biết",
  caption: "Ba điều nên kiểm tra với khoản vay của bạn. Nhắn tin cho Finance Hub để được hỗ trợ.",
  hashtags: ["#finhub", "#Vietnamese", "#vayvon", "#muanha", "#taichinh", "#laisuat", "#nganhang"],
};
assert.deepEqual(postProblems(good), []);
const tags = (hashtags) => postProblems({ ...good, hashtags });
assert.match(tags(good.hashtags.slice(1)).join(), /6 hashtags.*exactly 7/);
assert.match(tags(good.hashtags.slice(1)).join(), /#finhub is missing/);
assert.match(tags(["#finhub", "#vietnamese", "vayvon", "#a", "#b", "#c", "#d"]).join(), /"vayvon" must start with #/);
assert.match(tags(["#finhub", "#vietnamese", "#vay von", "#a", "#b", "#c", "#d"]).join(), /space.*"#vayvon"/);
assert.match(tags(["#finhub", "#vietnamese", "#a", "#A", "#b", "#c", "#d"]).join(), /"#A" is there twice/);
assert.match(postProblems({ ...good, title: " " }).join(), /no title/);
assert.match(postProblems(undefined).join(), /no "post"/);

// RG 234: a banned phrase fails in plain words, naming where it is.
const compliance = await loadCompliance();
const guard = (post, ex) => rg234Problems(compliance.assertCompliantCopy, post, ex);
assert.deepEqual(guard(good), []);
const banned = guard({ ...good, caption: "Chúng tôi có lãi suất tốt nhất cho bạn." });
assert.ok(banned.length >= 1);
assert.match(banned[0], /^The caption uses "lãi suất tốt nhất".*bans this promotional phrase/);
assert.match(guard({ ...good, hashtags: [...good.hashtags.slice(0, 6), "#free"] })[0], /^The hashtags uses "free"/);
// A "post" exemption (voice-video.mjs's key) clears it for every post field.
assert.deepEqual(guard({ ...good, title: "Is LMI free?" },
  [{ field: "post", term: "free", reason: "negation", note: "the video says LMI is not free" }]), []);

// Caption file: broker block, hashtags, then the footer exactly once.
const broker = loadBroker();
const footer = [compliance.LICENSING_STATEMENT, compliance.CREDIT_REP_STATEMENT,
  compliance.DISCLAIMER_EN, compliance.DISCLAIMER_VI];
const count = (hay, needle) => hay.split(needle).length - 1;
const check = ({ text }) => {
  assert.ok(text.startsWith(`${good.title}\n\n`));
  for (const line of [`Name: ${broker.name}`, `Mobile: ${broker.mobile}`, `Website: ${broker.website}`, `Company: ${broker.company}`])
    assert.equal(count(text, line), 1, line);
  assert.equal(count(text, good.hashtags.join(" ")), 1);
  for (const line of footer) assert.equal(count(text, line), 1, line);
  assert.ok(text.endsWith(`${footer.join("\n")}\n`), "footer is last");
  assert.ok(text.indexOf("Name: ") < text.indexOf("#finhub"), "broker block before hashtags");
};
const plain = buildCaption(good, broker, compliance);
check(plain);
assert.deepEqual(plain.removed, []);
// An older caption that already carries the disclaimer: not duplicated.
const old = buildCaption({ ...good, caption: `${good.caption}\n\nThông tin chung. ${compliance.DISCLAIMER_VI} Ví dụ minh hoạ.\n\n${compliance.DISCLAIMER_EN}` }, broker, compliance);
check(old);
assert.equal(old.removed.length, 2);
assert.match(old.text, /Thông tin chung\. Ví dụ minh hoạ\./);

// publish-listing: after a --lang vi re-render, the older en video is stale and is not published.
{
  const tmp = repoTmp("publish-listing-"), base = join(tmp, "in"), out = join(tmp, "out");
  mkdirSync(base); mkdirSync(out);
  const at = (f, sec) => (writeFileSync(f, "x"), utimesSync(f, sec, sec));
  at(join(out, "s-en.mp4"), 1000);
  at(join(base, "script.json"), 2000); at(join(base, "listing.json"), 1500);
  at(join(base, "words-vi.json"), 2100); at(join(base, "words-en.json"), 900);
  at(join(out, "s-vi.mp4"), 3000);
  assert.deepEqual(staleLangs(out, base, "s"), ["en"]);
  at(join(out, "s-en.mp4"), 3000);
  assert.deepEqual(staleLangs(out, base, "s"), []);
  at(join(base, "words-vi.json"), 4000); // vi re-voiced, not re-rendered
  assert.deepEqual(staleLangs(out, base, "s"), ["vi"]);
  rmSync(tmp, { recursive: true });
}

// publish-listing with listing-render's stamp: "post" is upload copy, not on screen, so fixing
// it after the render (exit 3's runbook) publishes; a scene edit still stops; --stale-ok overrides.
{
  const tmp = repoTmp("publish-stamp-"), base = join(tmp, "in"), out = join(tmp, "out");
  mkdirSync(base); mkdirSync(out);
  const script = { title: "T", scenes: [{ vi: "Nhà ba phòng ngủ.", en: "Three bedrooms." }], post: { title: "Old", hashtags: [] } };
  const save = (s) => writeFileSync(join(base, "script.json"), JSON.stringify(s, null, 2));
  save(script);
  writeFileSync(join(base, "listing.json"), "{}"); writeFileSync(join(base, "words-vi.json"), "[]");
  writeFileSync(join(out, "s-vi.mp4"), "x"); utimesSync(join(out, "s-vi.mp4"), 1000, 1000);
  writeFileSync(stampPath(out, "s", "vi"), `${onScreenHash(base, "vi")}\n`); // rendered
  save({ ...script, post: { title: "Fixed title", hashtags: ["#globalre"] } }); // newer than the mp4
  assert.deepEqual(staleLangs(out, base, "s"), [], "a post-only edit must not mark the render stale");
  assert.equal(staleStop(out, base, "s", false), null);
  save({ ...script, scenes: [{ vi: "Nhà bốn phòng ngủ.", en: "Four bedrooms." }] });
  assert.deepEqual(staleLangs(out, base, "s"), ["vi"], "an on-screen edit must still stop publish");
  assert.match(staleStop(out, base, "s", false), /vi video .*--stale-ok/);
  assert.equal(staleStop(out, base, "s", true), null, "--stale-ok overrides");
  save(script);
  writeFileSync(join(base, "words-vi.json"), "[{}]"); // re-voiced, not re-rendered
  assert.deepEqual(staleLangs(out, base, "s"), ["vi"]);
  writeFileSync(join(base, "words-vi.json"), "[]");
  writeFileSync(join(out, "s-vi.mp4"), "y"); // re-rendered without a stamp: file times decide
  assert.deepEqual(staleLangs(out, base, "s"), []);
  rmSync(tmp, { recursive: true });
}

// publish-video end to end on a temp public/ and out/ (B1, G2 of maintenance run 3).
{
  const tmp = repoTmp("publish-video-"), pub = join(tmp, "pub"), out = join(tmp, "out");
  const publish = (slug, video, ...flags) => spawnSync(process.execPath,
    [join(import.meta.dirname, "publish-video.mjs"), slug, "--public-dir", pub, "--out", out, "--video", video, ...flags],
    { encoding: "utf8" });
  const edit = (slug, extra = {}) => {
    mkdirSync(join(pub, "videos", slug), { recursive: true });
    writeFileSync(join(pub, "videos", slug, "edit.json"), JSON.stringify({ title: "T", ...extra, post: { ...good, title: "Cùng một chủ đề", ...extra.post } }, null, 2));
  };
  // What render-video.py writes next to <video> once the render is done.
  const stamp = (slug, video) => writeFileSync(video.replace(/\.mp4$/, ".inputs"), spawnSync(process.execPath,
    [join(import.meta.dirname, "publish-video.mjs"), slug, "--inputs-hash", "--public-dir", pub], { encoding: "utf8" }).stdout);
  edit("_test-a"); edit("_test-b");
  writeFileSync(join(pub, "videos", "_test-a", "words.json"), "[]");
  const a = join(tmp, "a.mp4"), b = join(tmp, "b.mp4");
  writeFileSync(a, "AAA"); writeFileSync(b, "BBB"); stamp("_test-b", b);
  const mp4 = join(out, "Cùng một chủ đề.mp4");
  let r = publish("_test-a", a, "--force");
  assert.equal(r.status, 0, r.stderr);
  // B1: a second slug with the same post title must not replace the first one's files, even with --force.
  r = publish("_test-b", b, "--force");
  assert.equal(r.status, 1, "another slug's same-title files must not be replaced");
  assert.match(r.stderr, /is video "_test-a", not "_test-b".*Nothing copied/s);
  assert.equal(readFileSync(mp4, "utf8"), "AAA");
  writeFileSync(a, "AAA2"); // the same slug re-rendered: --force replaces
  assert.equal(publish("_test-a", a, "--force").status, 0);
  assert.equal(readFileSync(mp4, "utf8"), "AAA2");
  edit("_test-b", { post: { title: "Chủ đề khác" } }); // the advice: its own title
  r = publish("_test-b", b, "--force"); assert.equal(r.status, 0, r.stderr + r.stdout);

  // G2: render-video.py's stamp. A post-only fix publishes; an on-screen edit stops unless --stale-ok.
  stamp("_test-a", a); // rendered
  assert.match(readFileSync(join(tmp, "a.inputs"), "utf8"), /^[0-9a-f]{64}\n$/);
  edit("_test-a", { post: { caption: `${good.caption} Gọi ngay.` } }); // newer than the mp4 and the stamp
  r = publish("_test-a", a, "--force"); assert.equal(r.status, 0, r.stderr);
  edit("_test-a", { title: "Changed on screen" });
  r = publish("_test-a", a, "--force");
  assert.equal(r.status, 1, "an on-screen edit after the render must stop publish");
  assert.match(r.stderr, /shows old copy.*--stale-ok/s);
  assert.equal(publish("_test-a", a, "--force", "--stale-ok").status, 0, "--stale-ok overrides");
  edit("_test-a"); writeFileSync(join(pub, "videos", "_test-a", "words.json"), "[{}]"); // re-voiced, not re-rendered
  assert.equal(publish("_test-a", a, "--force").status, 1, "a words.json change stops publish");
  // No stamp: file times decide.
  rmSync(join(tmp, "a.inputs"));
  utimesSync(a, 1000, 1000);
  assert.match(publish("_test-a", a, "--force").stderr, /edit\.json, words\.json changed after the render \(no stamp/);
  writeFileSync(a, "AAA3"); // rendered after the edit
  assert.equal(publish("_test-a", a, "--force").status, 0);
  rmSync(tmp, { recursive: true });
}

// The owner record .publish-slugs.json (R3 of run 3, round 2).
{
  const tmp = repoTmp("publish-owner-"), pub = join(tmp, "pub"), out = join(tmp, "out"), v = join(tmp, "v.mp4");
  const sidecar = join(out, ".publish-slugs.json");
  const publish = (slug, title) => {
    mkdirSync(join(pub, "videos", slug), { recursive: true });
    writeFileSync(join(pub, "videos", slug, "edit.json"), JSON.stringify({ title: "T", post: { ...good, title } }));
    return spawnSync(process.execPath, [join(import.meta.dirname, "publish-video.mjs"), slug, "--public-dir", pub,
      "--out", out, "--video", v, "--stale-ok", "--force"], { encoding: "utf8" });
  };
  writeFileSync(v, "A"); mkdirSync(out, { recursive: true });
  assert.equal(publish("_test-a", "Cùng một chủ đề").status, 0);
  // (a) Windows file names ignore case, and NFD is the same name: both are the same files as _test-a's.
  writeFileSync(v, "C");
  for (const title of ["CÙNG MỘT CHỦ ĐỀ", "Cùng một chủ đề".normalize("NFD")]) {
    const r = publish("_test-c", title);
    assert.equal(r.status, 1, `a case-only or NFD title clash must not replace another slug's files: ${title}`);
    assert.match(r.stderr, /is video "_test-a", not "_test-c"/);
  }
  assert.deepEqual(readdirSync(out).sort(), [".publish-slugs.json", "Cùng một chủ đề - caption.txt", "Cùng một chủ đề.mp4"]);
  assert.equal(readFileSync(join(out, "Cùng một chủ đề.mp4"), "utf8"), "A");
  // (b) Titles that are Object.prototype names: a legacy file (no owner) is replaced, not owned by "function Object()".
  for (const title of ["constructor", "toString", "__proto__"]) {
    writeFileSync(join(out, `${title}.mp4`), "legacy");
    const r = publish("_test-p", title);
    assert.equal(r.status, 0, `${title}: ${r.stderr}`);
    assert.equal(JSON.parse(readFileSync(sidecar, "utf8"))[title.toLowerCase()], "_test-p");
  }
  // (c) A broken record stops publish, names the file and is kept as it is.
  const kept = readFileSync(sidecar, "utf8");
  for (const bad of ["{broken", "[]", "null", '{"x": 1}']) {
    writeFileSync(sidecar, bad);
    const r = publish("_test-a", "Cùng một chủ đề");
    assert.equal(r.status, 1, `a broken owner record must stop publish: ${bad}`);
    assert.match(r.stderr, /\.publish-slugs\.json is broken.*Nothing copied/s);
    assert.equal(readFileSync(sidecar, "utf8"), bad, "the broken record is not replaced");
  }
  writeFileSync(sidecar, kept);
  // (d) Through a temp file, before the copy: a failed write leaves the old record and copies nothing.
  mkdirSync(`${sidecar}.tmp`);
  writeFileSync(v, "A2");
  assert.notEqual(publish("_test-a", "Cùng một chủ đề").status, 0, "the owner write must go through .tmp");
  assert.equal(readFileSync(sidecar, "utf8"), kept);
  assert.equal(readFileSync(join(out, "Cùng một chủ đề.mp4"), "utf8"), "A", "nothing copied when the owner write fails");
  rmSync(`${sidecar}.tmp`, { recursive: true });
  assert.equal(publish("_test-a", "Cùng một chủ đề").status, 0);
  assert.ok(!existsSync(`${sidecar}.tmp`));
  rmSync(tmp, { recursive: true });
}
// (e) Windows reserved names, alone or before a dot.
assert.equal(topicFileName("nul.mp4 hướng dẫn"), "nul video.mp4 hướng dẫn");
assert.equal(topicFileName("com1.x"), "com1 video.x");
assert.equal(topicFileName("Con cái"), "Con cái");

console.log("publish ok");
