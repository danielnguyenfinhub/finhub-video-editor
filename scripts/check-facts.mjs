// The one runnable check for scripts/facts.mjs: node scripts/check-facts.mjs
// Builds synthetic fixtures in a temp directory (never under public/), prints
// "facts ok" and exits 0, or names what failed and exits 1.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkFacts, oldestAsAt, readLedger } from "./facts.mjs";

const root = mkdtempSync(join(tmpdir(), "facts-"));
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const fact = (id, verbatim, asAt = daysAgo(10)) => ({
  id, claim_vi: "Lãi suất tiền mặt là 3,6 phần trăm.", claim_en: "The cash rate is 3.6 percent.",
  verbatim, doc: "synthetic-statement.pdf", locator: "p. 1", asAt, kind: "number",
});
// Writes a fixture slug folder, then reads it back the way voice-video.mjs does.
const run = (name, scenes, ledger) => {
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, "script.json"), JSON.stringify({ title: name, scenes }));
  if (ledger) writeFileSync(join(dir, "facts.json"), JSON.stringify(ledger));
  return checkFacts({ scenes }, readLedger(dir));
};

const failures = [];
const expect = (what, ok, result) => ok || failures.push(`${what}: ${JSON.stringify(result)}`);
try {
  const cta = { vi: "Nhắn tin cho Finance Hub để được hỗ trợ.", en: "Message Finance Hub for help.", facts: [] };
  const ledger = [fact("F1", "The cash rate target is 3.60 per cent.")];

  let r = run("untraced", [{ vi: "Lãi suất tiền mặt là 4,1 phần trăm.", en: "The cash rate is 4.1 percent.", facts: ["F1"] }, cta], ledger);
  expect("an untraced number must fail", r.errors.some((e) => e.includes("4.1") && e.includes("scene 1")), r);

  r = run("traced", [{ vi: "Lãi suất tiền mặt là 3,6 phần trăm.", en: "The cash rate is 3.6 percent.", facts: ["F1"] }, cta], ledger);
  expect("the traced version must pass", r.errors.length === 0 && r.warnings.length === 0, r);

  r = run("uncited", [{ vi: "Bạn phải có tiền đặt cọc.", en: "You need a deposit." }, cta], ledger);
  expect("a policy word with no facts field must fail", r.errors.some((e) => e.includes("policy word")), r);

  r = run("unknown-id", [{ vi: "Lãi suất tiền mặt là 3,6 phần trăm.", en: "The cash rate is 3.6 percent.", facts: ["F9"] }], ledger);
  expect("an unknown fact id must fail", r.errors.some((e) => e.includes("F9")), r);

  r = run("legacy", [{ vi: "Môi giới phải hành động vì lợi ích của bạn, 5 phút.", en: "Brokers must act in your interests." }]);
  expect("a legacy script with no ledger must pass with one warning",
    r.errors.length === 0 && r.warnings.length === 1 && r.warnings[0] === "ledger missing (legacy slug): facts not checked", r);

  r = run("stale", [{ vi: "Lãi suất tiền mặt là 3,6 phần trăm.", en: "The cash rate is 3.6 percent.", facts: ["F1"] }],
    [fact("F1", "The cash rate target is 3.60 per cent.", daysAgo(200))]);
  expect("a stale asAt must warn, not fail", r.errors.length === 0 && r.warnings.some((w) => w.startsWith("F1 is 200 days old")), r);
  expect("oldestAsAt picks the oldest source date (the end card's policy date)",
    oldestAsAt([fact("F1", "x", daysAgo(10)), fact("F2", "y", daysAgo(200)), { id: "F3" }]) === fact("F2", "y", daysAgo(200)).asAt,
    oldestAsAt([fact("F1", "x", daysAgo(10)), fact("F2", "y", daysAgo(200))]));
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`facts check failed:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("facts ok");
