// Self-test for scripts/publish-video.mjs on synthetic posts and publish-listing's
// stale-language check (file times, and listing-render's on-screen hash stamp) (no media; a temp folder only): node scripts/check-publish.mjs -> "publish ok", exit 1 on failure.
import assert from "node:assert/strict";
import {
  buildCaption, loadBroker, loadCompliance, postProblems, rg234Problems, topicFileName,
} from "./publish-video.mjs";
import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
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

console.log("publish ok");
