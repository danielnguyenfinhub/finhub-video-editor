// Self-check for scripts/listing-prep.mjs parsing (synthetic listing, no files).
//   node scripts/check-listing-prep.mjs
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { amounts, orderPhotos, parseListingTxt, priceProblems, slugOk, slugify, validateListing } from "./listing-prep.mjs";

const AGENTS = { deric: { name: "Test Agent" } };

const good = `﻿# comment
Nhân viên / Agent: deric
Loại tin (bán hoặc thuê) / Listing type (sale or rent): sale
Số nhà và tên đường / Street address: 1 Example Street
Khu vực / Suburb: Canley Vale
Mã bưu điện / Postcode: 2166
Tiểu bang / State:
Loại nhà / Property type: house
Phòng ngủ / Bedrooms: 4
Phòng tắm / Bathrooms: 2
Chỗ đậu xe / Car spaces: 2
Diện tích đất m² / Land size m²: 556 m²
Diện tích trong nhà m² / Internal size m²:
Giá / Price: Contact agent
Giá bán ước tính / Estimated selling price: $1,250,000
Nhà đang có người thuê? / Tenanted? (yes/no): no
Ảnh đã chỉnh sửa / Edited photos:
- b.jpg
Giờ xem nhà / Open home times: Saturday 11:00–11:30
Đặc điểm nổi bật / Key features:
- Open-plan living
- Double garage
Gần đó / Nearby:
- Canley Vale station, 10 min walk
Ghi chú ảnh / Photo order notes:
- b.jpg = front
`;
const p = parseListingTxt(good);
assert.deepEqual(p.errors, []);
const v = validateListing(p, AGENTS);
assert.deepEqual(v.errors, []);
assert.equal(v.listing.state, "NSW"); // default
assert.equal(v.listing.bedrooms, 4);
assert.equal(v.listing.landSizeM2, 556);
assert.equal(v.listing.internalSizeM2, null);
assert.deepEqual(v.listing.openHomes, ["Saturday 11:00–11:30"]); // inline value, colon kept
assert.deepEqual(v.listing.features, ["Open-plan living", "Double garage"]);
assert.equal(slugify(`${v.listing.street} ${v.listing.suburb}`), "1-example-street-canley-vale");
assert.equal(slugify("12/3 Đường Lê Lợi"), "12-3-duong-le-loi");

// Malformed: no colon, unknown label, a word for a number, bad postcode, a
// stray "- item", a duplicate field, and missing required fields.
const bad = `- stray item
Suburb Canley Vale
Favourite colour: blue
Phòng ngủ / Bedrooms: bốn
Mã bưu điện / Postcode: 216
Bedrooms: 3
Listing type: swap
`;
const pb = parseListingTxt(bad);
const vb = validateListing(pb, AGENTS);
const text = vb.errors.join("\n");
assert.match(text, /Line 1 .*not under a list/);
assert.match(text, /Line 2 .*missing the colon/);
assert.match(text, /Line 3 .*label not recognised/);
assert.match(text, /Line 4 .*needs a whole number/);
assert.match(text, /Line 5 .*4 digits/);
assert.match(text, /Line 6 .*already filled in on line 4/);
assert.match(text, /Line 7 .*"sale" or "rent"/);
assert.match(text, /"Street address" is missing/);
assert.match(text, /Key features/);

assert.equal(v.listing.tenanted, false);
assert.equal(v.listing.tenantPhotoConsent, null);
assert.deepEqual(v.editedPhotos, ["b.jpg"]);

// Tenanted needs a consent answer; a sale needs the estimated selling price.
const t = validateListing(parseListingTxt(good.replace("(yes/no): no", "(yes/no): yes").replace(/^Giá bán.*$/m, "")), AGENTS);
assert.match(t.errors.join("\n"), /Tenant consent for photos obtained/);
assert.match(t.errors.join("\n"), /Estimated selling price/);

// NSW price rules (PSAA s 72A, 73; RTA s 22A).
const esp = "$1,000,000";
assert.deepEqual(priceProblems("sale", "Contact agent", esp), []);
assert.deepEqual(priceProblems("sale", "Auction Saturday 12 October, 10am", esp), []);
assert.deepEqual(priceProblems("sale", "$1,050,000", esp), []);
assert.deepEqual(priceProblems("sale", "$1,000,000 - $1,100,000", esp), []);
assert.match(priceProblems("sale", "Offers over $1.2m", esp).join(), /s 73\(2\)/);
assert.match(priceProblems("sale", "$1.2m+", esp).join(), /s 73\(2\)/);
assert.match(priceProblems("sale", "$1,000,000 - $1,150,000", esp).join(), /wider than 10%/);
assert.match(priceProblems("sale", "$950,000", esp).join(), /below the estimated selling price/);
assert.match(priceProblems("sale", "Great value", esp).join(), /fixed price/);
assert.deepEqual(priceProblems("rent", "$650 per week"), []);
assert.match(priceProblems("rent", "$650 - $700 per week").join(), /one weekly rent/);
assert.match(priceProblems("rent", "Offers from $650 per week").join(), /one fixed amount/);
assert.deepEqual(amounts("$1.2m to $850k"), [1200000, 850000]);
// Unit words ("$1.2 million" once read as 1.2, so the estimate was $1.20).
assert.deepEqual(amounts("$1.2 million"), [1200000]);
assert.deepEqual(amounts("$1.25 mil to $900 thousand"), [1250000, 900000]);
assert.deepEqual(amounts("$1,250,000"), [1250000]);
assert.match(priceProblems("sale", "$1.1 million", "$1.2 million").join(), /below the estimated selling price/);
assert.deepEqual(priceProblems("sale", "$1.2 million", "$1,200,000"), []);

// CLI slugs (assertSlug): every real folder, the docs' examples and listing slugs pass;
// anything that could leave public/ or out/ does not.
const ROOT = join(import.meta.dirname, "..");
const real = ["public/videos", "public/listings", "public/recordings", "out/videos", "out/listings"]
  .flatMap((d) => (existsSync(join(ROOT, d)) ? readdirSync(join(ROOT, d), { withFileTypes: true }) : []))
  .filter((e) => e.isDirectory()).map((e) => e.name);
for (const s of [...real, "my-slug", "rba-sept-2026", "_test-cards", "1-example-street-canley-vale", "v2.1"])
  assert.ok(slugOk(s), `slug "${s}" should pass`);
for (const s of ["..", "../x", "a/b", "a\\b", "/etc", "a..b", "Ty-Do", "-x", ".hidden", "", "c:x", undefined])
  assert.ok(!slugOk(s), `slug "${s}" should be refused`);

// Unknown agent.
assert.match(validateListing(parseListingTxt("Agent: nobody"), AGENTS).errors.join("\n"), /agent "nobody" is not in config/);

// Photo order: noted first, rest natural-sorted; a note naming a missing file is an error.
const o = orderPhotos(["10.jpg", "2.jpg", "b.jpg", "1.png"], ["b.jpg = front", "2.jpg: kitchen", "zz.jpg = nope"]);
assert.deepEqual(o.ordered.map((x) => x.file), ["b.jpg", "2.jpg", "1.png", "10.jpg"]);
assert.equal(o.ordered[0].note, "front");
assert.equal(o.errors.length, 1);

console.log("check-listing-prep: OK");
