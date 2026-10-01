// The one runnable check for src/listing/compliance-rules.ts:
//   node scripts/check-listing-compliance.mjs
// Node 22.18+/24 strips the TypeScript types itself, so there is no build step.
// Synthetic copy only. Prints "listing compliance ok" and exits 0, or names what failed.
import {
  LISTING_RULES, CITATIONS, LISTING_DISCLAIMER_EN, LISTING_DISCLAIMER_VI,
  scanListingCopy, assertListingCopy,
} from "../src/listing/compliance-rules.ts";
import * as rulesModule from "../src/listing/compliance-rules.ts";
import { makeListingChecker } from "../src/listing/compliance.ts";

const failures = [];
const rulesHit = (text, ctx) => scanListingCopy({ line: text }, ctx).map((h) => h.rule);
const expectHit = (text, ctx, rule) =>
  rulesHit(text, ctx).includes(rule) || failures.push(`expected ${rule}: "${text}" got [${rulesHit(text, ctx)}]`);
const expectClean = (text, ctx) => {
  const r = rulesHit(text, ctx);
  if (r.length) failures.push(`expected clean: "${text}" got [${r}]`);
};

const sale = { mode: "sale", priceMin: 900_000 };
const lease = { mode: "lease", rentPerWeek: 650 };

// Every pattern is NFC (a decomposed "ế" would never match NFC copy) and cites a real key.
for (const r of LISTING_RULES) {
  if (r.pattern.source !== r.pattern.source.normalize("NFC")) failures.push(`${r.id}: pattern not NFC`);
  if (!CITATIONS[r.cite]) failures.push(`${r.id}: unknown cite ${r.cite}`);
}

// Bad lines.
expectHit("Guaranteed capital growth in Cabramatta!", sale, "guarantee-en");
expectHit("Căn nhà này chắc chắn tăng giá trong 5 năm tới.", sale, "guarantee-vi");
expectHit("Best street in Canley Vale", sale, "superlative-en");
expectHit("Giá rẻ nhất khu vực, vị trí tốt nhất.", sale, "superlative-vi");
expectHit("Offers over $850,000", sale, "offers-over");
expectHit("Just listed at $880k+", sale, "offers-over");
expectHit("Chủ nhà cần bán gấp, giá hời!", sale, "bargain-vi");
expectHit("Must sell — bargain buy", sale, "bargain-en");
expectHit("Priced at $850,000", sale, "price-below-advertised");
expectHit("Chỉ khoảng 850 nghìn đô", sale, "price-below-advertised");
// Unit words in the copy ("$850 thousand" once read as $850, under half the floor, so never compared).
expectHit("Yours for $850 thousand", sale, "price-below-advertised");
expectHit("Just $0.85 million", sale, "price-below-advertised");
expectHit("Chỉ $0.85 mil", sale, "price-below-advertised");
expectClean("Priced at $1.1 million", sale);
expectHit("8% rental yield, positive cash flow", sale, "investment-return-en");
expectHit("Lợi nhuận 8% mỗi năm", sale, "investment-return-vi");
expectHit("Walking distance to Cabramatta station", sale, "vague-location-en");
expectHit("Đi bộ vài phút ra ga", sale, "vague-location-vi");
expectHit("Brand new home on a quiet street", sale, "condition-claim-en");
expectHit("Award-winning top agent", sale, "agent-claim-en");
expectHit("Đất 556 m² (theo sổ đỏ)", sale, "size-claim");
expectHit("Make an offer! $650 per week", lease, "rent-bidding-en");
expectHit("Giá thuê thương lượng, ai trả cao hơn sẽ được ưu tiên", lease, "rent-bidding-vi");
expectHit("$650 per week, or $700 per week furnished", lease, "rent-mismatch");
expectHit("No pets please", lease, "no-pets-en");
expectHit("Không nuôi thú cưng", lease, "no-pets-vi");

// Good lines.
expectClean("Price guide $900,000 – $950,000", sale);
expectClean("Ba phòng ngủ, hai phòng tắm, gara đôi.", sale);
expectClean("1.2 km to Cabramatta station (Google Maps)", { mode: "sale", priceMin: 1_200_000 });
expectClean("$650 per week · 3 bedrooms · available now", lease);
expectClean("Giá thuê $650 mỗi tuần", lease);
expectClean("Auction Saturday 11am", sale);
expectClean(LISTING_DISCLAIMER_EN, sale);
expectClean(LISTING_DISCLAIMER_VI, sale);
expectClean(LISTING_DISCLAIMER_EN, lease);
expectClean(LISTING_DISCLAIMER_VI, lease);
// "offers" wording in a sale ad is not a rent bid, and vice versa.
expectClean("Auction · price guide $900,000", sale);

// Gate behaviour: flags clear with evidence, banned phrases do not, lease needs a rent.
const threw = (fn) => { try { fn(); return false; } catch { return true; } };
if (!threw(() => assertListingCopy({ title: "Offers over $900k" }, sale, [
  { field: "title", rule: "offers-over", reason: "substantiated", note: "vendor wants it" },
]))) failures.push("offers-over cleared by 'substantiated'");
const audit = assertListingCopy({ title: "1.2 km to Cabramatta station" }, sale, [
  { field: "title", rule: "vague-location-en", reason: "substantiated", note: "never matches" },
]);
if (audit.unused.length !== 1) failures.push("unused clearance not reported");
if (threw(() => assertListingCopy({ title: "Walking distance to station" }, sale, [
  { field: "title", rule: "vague-location-en", reason: "substantiated", note: "650 m by Google Maps, 28/09/2026" },
]))) failures.push("substantiated flag did not clear");
if (!threw(() => assertListingCopy({ title: "3 bedrooms" }, { mode: "lease" })))
  failures.push("lease ad without rentPerWeek passed");

// The listing's price line sets the s 73 floor (src/listing/compliance.ts dollars()).
// "$1.2 million" once read as $1.20, so any lower figure in the copy passed.
const checkListing = makeListingChecker(rulesModule);
const floorOf = (price, est = null) => {
  const r = checkListing("Priced at $850,000", { listingType: "sale", price, estimatedSellingPrice: est });
  return r.flags.map((f) => f.reason).join(" | ");
};
for (const [price, floor] of [["$1.2 million", "$1,200,000"], ["$1.25 mil", "$1,250,000"], ["$1.2m", "$1,200,000"], ["$900 thousand", "$900,000"], ["$900K", "$900,000"]])
  if (!floorOf(price).includes(`advertised price ${floor}`)) failures.push(`price "${price}" not read as ${floor}: ${floorOf(price) || "no flag"}`);
// A letter right after the number must not make the reader stop mid-number ("$650pw" was $65).
if (!floorOf("$1,250,000AUD").includes("advertised price $1,250,000")) failures.push(`price "$1,250,000AUD" not read as $1,250,000: ${floorOf("$1,250,000AUD") || "no flag"}`);
{
  const r = checkListing("Rent $600 per week", { listingType: "lease", price: "$650pw" });
  if (!r.flags.some((f) => f.reason.includes("$650"))) failures.push(`lease "$650pw" not read as $650: ${r.flags.map((f) => f.reason).join(" | ") || "no flag"}`);
  if (r.flags.some((f) => f.reason.includes("$65 "))) failures.push(`lease "$650pw" misread as $65`);
}
for (const price of ["AUD 1,250,000", "$1.2 - 1.3 million"]) {
  const r = checkListing("3 bedrooms", { listingType: "sale", price, estimatedSellingPrice: 1_200_000 });
  if (!r.flags.some((f) => f.reason.includes("does not read as a dollar figure"))) failures.push(`unreadable price "${price}" with an estimate not flagged`);
}
for (const price of ["$1,250,000", "Contact agent", "Auction 14 June"]) {
  const r = checkListing("3 bedrooms", { listingType: "sale", price, estimatedSellingPrice: 1_200_000 });
  if (!r.ok) failures.push(`price "${price}" flagged: ${r.flags.map((f) => f.reason).join(" | ")}`);
}

if (failures.length) {
  console.error(`listing compliance FAILED\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("listing compliance ok");
