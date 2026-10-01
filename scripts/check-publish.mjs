// Self-test for scripts/publish-video.mjs on synthetic posts and publish-listing's
// stale-language check (file times, and listing-render's on-screen hash stamp), publish-video's
// same-title guard and stale-render stop (no media; a temp folder only): node scripts/check-publish.mjs -> "publish ok", exit 1 on failure.
import assert from "node:assert/strict";
import {
  buildCaption, legacyOwnerStop, loadBroker, LOCK_STALE_MS, loadCompliance, postProblems, rg234Problems, titleSlugs, topicFileName,
} from "./publish-video.mjs";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { repoTmp } from "./tmp-dir.mjs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
  // W5 (run 4): render-video.py marks the stamp "rendering" until the render is done; a render that
  // stopped part way leaves a new mp4 that file times alone would publish as fresh.
  writeFileSync(join(tmp, "a.inputs"), "rendering\n"); writeFileSync(a, "PARTIAL");
  r = publish("_test-a", a, "--force");
  assert.equal(r.status, 1, "a render that did not finish must not publish");
  assert.match(r.stderr, /the last render of _test-a did not finish.*Re-render it: python scripts\/render-video\.py _test-a/s);
  assert.doesNotMatch(r.stderr, /stale-ok/, "an unfinished render must not be offered --stale-ok (it would publish a partial file)");
  assert.equal(publish("_test-a", a, "--force", "--stale-ok").status, 1, "--stale-ok must not publish an unfinished render");
  const rv = readFileSync(join(import.meta.dirname, "render-video.py"), "utf8");
  assert.ok(rv.indexOf('stamp.write_text("rendering\\n"') > 0 && rv.indexOf('stamp.write_text("rendering\\n"') < rv.indexOf('REMOTION + ["render"'),
    "render-video.py must mark the stamp before the render");
  rmSync(tmp, { recursive: true });
}

// node flags for a child: a preload that breaks or slows fs calls (written in dir).
const preloadIn = (dir, name, code) => {
  const file = join(dir, name);
  writeFileSync(file, `import fs from "node:fs";\nimport { syncBuiltinESMExports } from "node:module";\n${code}\nsyncBuiltinESMExports();\n`);
  return ["--import", pathToFileURL(file).href];
};
// Two publishes certainly overlap: one that finds .publish-slugs.lock taken leaves `mark`, and a read of
// the owner record waits for it (5 s cap, then the read throws, so the publish fails: no overlap, no pass).
const SLOW_READ = (mark) => `const { openSync: o, readFileSync: r } = fs, mark = ${JSON.stringify(mark)};
fs.openSync = (p, ...a) => {
  try { return o(p, ...a); } catch (e) { if (e.code === "EEXIST" && String(p).endsWith(".publish-slugs.lock")) fs.writeFileSync(mark, ""); throw e; }
};
fs.readFileSync = (p, ...a) => {
  if (String(p).endsWith(".publish-slugs.json"))
    for (const end = Date.now() + 5000; !fs.existsSync(mark);)
      if (Date.now() > end) throw new Error("check-publish: the other publish never found the lock taken (no overlap)");
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  return r(p, ...a);
};`;
// Runs each [node args] as a child at once; resolves to [{code, err}].
const together = (runs) => Promise.all(runs.map((argv) => new Promise((done) => {
  const child = spawn(process.execPath, argv);
  let err = "";
  child.stderr.on("data", (d) => (err += d));
  child.on("close", (code) => done({ code, err }));
})));

// The owner record .publish-slugs.json (R3 of run 3, round 2).
{
  const tmp = repoTmp("publish-owner-"), pub = join(tmp, "pub"), out = join(tmp, "out"), v = join(tmp, "v.mp4");
  const sidecar = join(out, ".publish-slugs.json");
  const args = (slug, title, flags) => {
    mkdirSync(join(pub, "videos", slug), { recursive: true });
    writeFileSync(join(pub, "videos", slug, "edit.json"), JSON.stringify({ title: "T", post: { ...good, title } }));
    return [join(import.meta.dirname, "publish-video.mjs"), slug, "--public-dir", pub, "--out", out, "--video", v, "--stale-ok", "--force", ...flags];
  };
  // node flags first (--import: a preload that breaks or slows fs calls), then publish-video's.
  const publish = (slug, title, flags = [], node = []) =>
    spawnSync(process.execPath, [...node, ...args(slug, title, flags)], { encoding: "utf8", timeout: 30_000 });
  const preload = (name, code) => preloadIn(tmp, name, code);
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
  // (b) Titles that are Object.prototype names: a legacy file (no owner) is claimed, not owned by "function Object()".
  for (const title of ["constructor", "toString", "__proto__"]) {
    writeFileSync(join(out, `${title}.mp4`), "legacy");
    const r = publish("_test-p", title, ["--claim"]);
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
  // (d) Through a temp file, before the copy: a failed write (injected on *.tmp) leaves the old record and copies nothing.
  const tmpFails = preload("tmp-fails.mjs", `const w = fs.writeFileSync;
fs.writeFileSync = (p, ...a) => { if (String(p).endsWith(".tmp")) throw Object.assign(new Error("injected"), { code: "EIO" }); return w(p, ...a); };`);
  writeFileSync(v, "A2");
  assert.notEqual(publish("_test-a", "Cùng một chủ đề", [], tmpFails).status, 0, "the owner write must go through .tmp");
  assert.equal(readFileSync(sidecar, "utf8"), kept);
  assert.equal(readFileSync(join(out, "Cùng một chủ đề.mp4"), "utf8"), "A", "nothing copied when the owner write fails");
  assert.equal(publish("_test-a", "Cùng một chủ đề").status, 0);
  const leftovers = () => readdirSync(out).filter((f) => f.endsWith(".tmp") || f.endsWith(".lock"));
  assert.deepEqual(leftovers(), [], "no temp file or lock left behind (also after a failed run)");
  // (f) CR2 of run 4: two publishes at once (the lock holder reads the record only once the other
  // waits for the lock, so their read-modify-writes overlap) keep both owners and both finish.
  const slowRead = preload("slow-read.mjs", SLOW_READ(join(tmp, "cr2.mark")));
  const both = await together([["_test-x", "Chủ đề X"], ["_test-y", "Chủ đề Y"]].map(([slug, title]) => [...slowRead, ...args(slug, title, [])]));
  for (const { code, err } of both) assert.equal(code, 0, `concurrent publish failed: ${err}`);
  const owners = JSON.parse(readFileSync(sidecar, "utf8"));
  assert.equal(owners["chủ đề x"], "_test-x", "a concurrent publish must not lose the other's owner entry");
  assert.equal(owners["chủ đề y"], "_test-y", "a concurrent publish must not lose the other's owner entry");
  // F1 of round 3: two videos, one new title, at once: which files exist is read inside the lock, so
  // exactly one publishes and the other stops; the file is the recorded owner's. Raced once: a
  // folder read before the lock (the pre-F1 code) fails the first race.
  for (const n of [1]) {
    const title = `Chủ đề chung ${n}`, slugs = [`_test-r${n}a`, `_test-r${n}b`];
    for (const slug of slugs) writeFileSync(join(tmp, `${slug}.mp4`), slug);
    const raceRead = preload(`slow-read-${n}.mjs`, SLOW_READ(join(tmp, `race-${n}.mark`)));
    const runs = await together(slugs.map((slug) => [...raceRead,...args(slug, title, []).map((a) => (a === v ? join(tmp, `${slug}.mp4`) : a))]));
    const codes = runs.map(({ code }) => code);
    assert.ok(codes.filter((c) => c === 0).length === 1 && codes.filter((c) => c === 1).length === 1,
      `race ${n}: two videos with one title must not both publish: exits ${codes}; ${runs.map(({ err }) => err).join(" | ")}`);
    const winner = slugs[codes.indexOf(0)];
    assert.equal(JSON.parse(readFileSync(sidecar, "utf8"))[`chủ đề chung ${n}`], winner);
    assert.equal(readFileSync(join(out, `${title}.mp4`), "utf8"), winner, `race ${n}: the file must be the recorded owner's`);
  }
  // A lock left by a crashed publish (older than LOCK_STALE_MS) is taken over, not waited on forever.
  const lock = join(out, ".publish-slugs.lock");
  writeFileSync(lock, ""); utimesSync(lock, (Date.now() - LOCK_STALE_MS - 5000) / 1000, (Date.now() - LOCK_STALE_MS - 5000) / 1000);
  const r = publish("_test-a", "Cùng một chủ đề");
  assert.equal(r.status, 0, `a stale lock must be taken over: ${r.stderr}${r.error ?? ""}`);
  assert.deepEqual(leftovers(), []);
  // Each publish has its own temp name: one a crashed run left behind does not block the next.
  mkdirSync(`${sidecar}.tmp`);
  assert.equal(publish("_test-a", "Cùng một chủ đề").status, 0, "a leftover .publish-slugs.json.tmp must not block publish");
  rmSync(tmp, { recursive: true });
}
// W1/W2 of run 4, CR1 of round 2: same-title files with no owner on record (published before the
// record existed) are never replaced without --claim; the repo's post titles only make the stop helpful.
{
  const tmp = repoTmp("publish-legacy-"), pub = join(tmp, "pub"), out = join(tmp, "out"), v = join(tmp, "v.mp4");
  const mp4 = join(out, "Chủ đề cũ.mp4"), sidecar = join(out, ".publish-slugs.json");
  const publish = (slug, title, ...flags) => {
    mkdirSync(join(pub, "videos", slug), { recursive: true });
    writeFileSync(join(pub, "videos", slug, "edit.json"), JSON.stringify({ title: "T", post: { ...good, title } }));
    return spawnSync(process.execPath, [join(import.meta.dirname, "publish-video.mjs"), slug, "--public-dir", pub,
      "--out", out, "--video", v, "--stale-ok", "--force", ...flags], { encoding: "utf8" });
  };
  mkdirSync(out, { recursive: true }); writeFileSync(v, "NEW");
  writeFileSync(mp4, "OLD"); writeFileSync(join(out, "Chủ đề cũ - caption.txt"), "old");
  // The code reviewer's case: _test-a was published as "Chủ đề cũ" with no owner, then its post.title
  // was edited (upload copy: no re-render); _test-b now has that title. _test-b is the only match, yet
  // the files are _test-a's: stop (exit 4) with the --claim command, keep the file, record nothing.
  publish("_test-a", "Tiêu đề mới đã sửa");
  let r = publish("_test-b", "Chủ đề cũ");
  assert.equal(r.status, 4, "an ownerless file must not be replaced without --claim, even when one post title matches");
  assert.match(r.stderr, /no recorded owner.*Nothing copied.*: "_test-b" \(looks like this video's\).*If the files are really "_test-b"'s: node scripts\/publish-video\.mjs _test-b --force --claim/s);
  assert.equal(readFileSync(mp4, "utf8"), "OLD");
  const owners = () => JSON.parse(readFileSync(sidecar, "utf8"));
  assert.equal(owners()["chủ đề cũ"], undefined, "nothing recorded on a stop");
  // Two slugs with that title (NFD and case folded): both named, none "looks like" it.
  r = publish("_test-c", "CHỦ ĐỀ CŨ".normalize("NFD"));
  assert.equal(r.status, 4);
  assert.match(r.stderr, /file name: "_test-b", "_test-c"\./);
  assert.equal(readFileSync(mp4, "utf8"), "OLD");
  // --claim: Daniel says the files are this slug's. It proceeds and records the owner.
  r = publish("_test-b", "Chủ đề cũ", "--claim");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(mp4, "utf8"), "NEW");
  assert.equal(owners()["chủ đề cũ"], "_test-b", "--claim records the owner");
  // RV2: a RECORDED owner is never overridden by --claim.
  writeFileSync(v, "OTHER");
  r = publish("_test-c", "Chủ đề cũ", "--claim");
  assert.equal(r.status, 1, "--claim must not override a recorded owner");
  assert.match(r.stderr, /is video "_test-b", not "_test-c"/);
  assert.equal(readFileSync(mp4, "utf8"), "NEW");
  assert.equal(owners()["chủ đề cũ"], "_test-b");
  // The pure message: none, one (this video's), others.
  const ctx = { topic: "X", outDir: "out", where: "w", cmd: "c" };
  assert.match(legacyOwnerStop("s", ["s"], ctx), /file name: "s" \(looks like this video's\)\.\nIf the files are really "s"'s: c --force --claim\n/);
  assert.match(legacyOwnerStop("s", ["o"], ctx), /file name: "o"\.\n/);
  assert.match(legacyOwnerStop("s", [], ctx), /file name: none\..*c --force --claim/s);
  assert.deepEqual(titleSlugs(join(pub, "videos"), ["edit.json"], "chủ đề CŨ").sort(), ["_test-b", "_test-c"]);
  rmSync(tmp, { recursive: true });
}
// RV1/RV2 of run 4, round 2: publish-listing end to end on a temp tree (--public-dir, --renders, --out).
{
  const tmp = repoTmp("publish-listing-e2e-"), pub = join(tmp, "pub"), renders = join(tmp, "renders"), out = join(tmp, "out");
  const listing = {
    slug: "x", agent: "deric", listingType: "sale", street: "1 Test St", suburb: "Sunnybank", postcode: "4109", state: "QLD",
    propertyType: "house", bedrooms: 3, bathrooms: 2, carSpaces: 1, landSizeM2: 600, internalSizeM2: null, price: "$900,000",
    auction: null, openHomes: [], availableFrom: null, features: [], nearby: [], doNotSay: [], tenanted: false, tenantPhotoConsent: null,
    unknowns: [], estimatedSellingPrice: null, test: false, materialFacts: [],
    photos: [{ file: "01.jpg", original: "a.jpg", width: 1080, height: 1920, note: null, edited: false }], location: null,
  };
  const scenes = ["intro", "facts", "agent"].map((kind) => ({ id: kind, photo: null, vi: "Nhà ba phòng ngủ.", en: "Three bedrooms.", kind }));
  const post = { title: "Nhà mẫu", caption: "Nhà ba phòng ngủ ở Sunnybank.", captionEn: "A three-bedroom house in Sunnybank.",
    hashtags: ["#globalre", "#sunnybank", "#nha", "#house", "#brisbane", "#qld", "#forsale"] };
  const args = (slug, title, flags) => {
    mkdirSync(join(pub, "listings", slug), { recursive: true }); mkdirSync(join(renders, slug), { recursive: true });
    writeFileSync(join(pub, "listings", slug, "listing.json"), JSON.stringify({ ...listing, slug }));
    writeFileSync(join(pub, "listings", slug, "script.json"), JSON.stringify({ title: "T", scenes, post: { ...post, title } }));
    writeFileSync(join(renders, slug, `${slug}-vi.mp4`), slug);
    return [join(import.meta.dirname, "publish-listing.mjs"), slug, "--public-dir", pub,
      "--renders", join(renders, slug), "--out", out, "--force", "--stale-ok", ...flags];
  };
  const publish = (slug, ...flags) => spawnSync(process.execPath, args(slug, post.title, flags), { encoding: "utf8" });
  mkdirSync(out, { recursive: true });
  const mp4 = join(out, "Nhà mẫu (VI).mp4"), sidecar = join(out, ".publish-slugs.json");
  writeFileSync(mp4, "OLD");
  let r = publish("_test-l");
  assert.equal(r.status, 4, `a listing's ownerless file must not be replaced without --claim: ${r.stderr}`);
  assert.match(r.stderr, /no recorded owner.*"_test-l" \(looks like this video's\).*node scripts\/publish-listing\.mjs _test-l --force --claim/s);
  assert.equal(readFileSync(mp4, "utf8"), "OLD");
  assert.ok(!existsSync(sidecar));
  r = publish("_test-l", "--claim");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(mp4, "utf8"), "_test-l");
  assert.equal(JSON.parse(readFileSync(sidecar, "utf8"))["nhà mẫu"], "_test-l", "--claim records the listing's owner");
  // F2 of round 3: the owner's re-render (listing-render passes --force, never --claim) replaces its own files.
  writeFileSync(mp4, "PREVIOUS RENDER");
  r = publish("_test-l");
  assert.equal(r.status, 0, `an owned listing must re-publish with --force alone: ${r.stderr}`);
  assert.equal(readFileSync(mp4, "utf8"), "_test-l");
  r = publish("_test-m", "--claim");
  assert.equal(r.status, 1, "--claim must not override a listing's recorded owner");
  assert.match(r.stderr, /is listing "_test-l", not "_test-m"/);
  assert.equal(readFileSync(mp4, "utf8"), "_test-l");
  assert.deepEqual(readdirSync(out).filter((f) => /\.(tmp|lock)$/.test(f)), []);
  // CR2: two listings published at once keep both owners.
  const slowRead = preloadIn(tmp, "slow-read.mjs", SLOW_READ(join(tmp, "listing.mark")));
  const both = await together(["_test-n", "_test-o"].map((slug) => [...slowRead, ...args(slug, `Nhà ${slug}`, [])]));
  for (const { code, err } of both) assert.equal(code, 0, `concurrent listing publish failed: ${err}`);
  const owners = JSON.parse(readFileSync(sidecar, "utf8"));
  assert.ok(owners["nhà _test-n"] === "_test-n" && owners["nhà _test-o"] === "_test-o", `both listing owners kept: ${JSON.stringify(owners)}`);
  rmSync(tmp, { recursive: true });
}
// (e) Windows reserved names, alone or before a dot.
assert.equal(topicFileName("nul.mp4 hướng dẫn"), "nul video.mp4 hướng dẫn");
assert.equal(topicFileName("com1.x"), "com1 video.x");
assert.equal(topicFileName("Con cái"), "Con cái");

console.log("publish ok");
