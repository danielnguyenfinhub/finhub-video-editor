// Global RE listing video, step 1: the agent's folder -> a prepared listing.
//
//   npm run listing -- "<folder in 3 - GLOBAL RE LISTINGS>"
//   node scripts/listing-prep.mjs "<folder name or path>"
//
// Reads <folder>/listing.txt (the bilingual fill-in form, _TEMPLATE/listing.txt)
// and the photos beside it (jpg/png; HEIC is skipped with a message), then
// writes public/listings/<slug>/:
//   listing.json   the checked details (schema: src/listing/schema.ts)
//   photos/NN.jpg  the photos in tour order, EXIF-rotated, 2160 px long edge
// <slug> comes from street + suburb ("1 Example Street", "Canley Vale" ->
// 1-example-street-canley-vale). The map pin is the SUBURB's centre from
// MapTiler geocoding (REMOTION_MAPTILER_KEY), never the street; no key or no
// confident match -> no map, the video shows a locator card instead.
// Errors name the line, in Vietnamese and English. Pipeline: docs/agents/listing-video.md.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..");
export const LISTINGS_DIR = join(ROOT, "3 - GLOBAL RE LISTINGS");
const LONG_EDGE = 2160;
const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

// field -> accepted labels (either side of "Vietnamese / English", lowercase,
// without "m²" or brackets). List fields take "- item" lines under them.
const FIELDS = {
  agent: { labels: ["nhân viên", "agent"] },
  listingType: { labels: ["loại tin", "listing type"] },
  street: { labels: ["số nhà và tên đường", "street address", "địa chỉ", "address"] },
  suburb: { labels: ["khu vực", "suburb"] },
  postcode: { labels: ["mã bưu điện", "postcode"] },
  state: { labels: ["tiểu bang", "state"] },
  propertyType: { labels: ["loại nhà", "property type"] },
  bedrooms: { labels: ["phòng ngủ", "bedrooms", "bedroom", "beds"] },
  bathrooms: { labels: ["phòng tắm", "bathrooms", "bathroom", "baths"] },
  carSpaces: { labels: ["chỗ đậu xe", "car spaces", "car space", "cars", "parking"] },
  landSize: { labels: ["diện tích đất", "land size", "land"] },
  internalSize: { labels: ["diện tích trong nhà", "internal size", "internal"] },
  price: { labels: ["giá", "giá thuê", "price", "rent"] },
  auction: { labels: ["ngày giờ đấu giá", "auction date and time", "auction"] },
  availableFrom: { labels: ["ngày dọn vào", "available from"] },
  openHomes: { labels: ["giờ xem nhà", "open home times", "open homes", "open home"], list: true },
  features: { labels: ["đặc điểm nổi bật", "key features", "features"], list: true },
  nearby: { labels: ["gần đó", "nearby"], list: true },
  photoNotes: { labels: ["ghi chú ảnh", "photo order notes", "photo notes"], list: true },
  doNotSay: { labels: ["không được nói", "do not say"], list: true },
  tenanted: { labels: ["nhà đang có người thuê", "tenanted"] },
  tenantConsent: { labels: ["người thuê đồng ý cho chụp ảnh", "tenant consent for photos obtained", "tenant consent for photos"] },
  estimatedPrice: { labels: ["giá bán ước tính", "estimated selling price"] },
  materialFacts: { labels: ["thông tin phải công khai", "material facts to disclose", "material facts"], list: true },
  editedPhotos: { labels: ["ảnh đã chỉnh sửa", "edited photos"], list: true },
};
const TEMPLATE_LABEL = {
  agent: "Nhân viên / Agent", listingType: "Loại tin / Listing type", street: "Số nhà và tên đường / Street address",
  suburb: "Khu vực / Suburb", postcode: "Mã bưu điện / Postcode", state: "Tiểu bang / State",
  propertyType: "Loại nhà / Property type", bedrooms: "Phòng ngủ / Bedrooms", bathrooms: "Phòng tắm / Bathrooms",
  carSpaces: "Chỗ đậu xe / Car spaces", price: "Giá / Price", features: "Đặc điểm nổi bật / Key features",
  tenanted: "Nhà đang có người thuê? / Tenanted?", tenantConsent: "Người thuê đồng ý cho chụp ảnh? / Tenant consent for photos obtained?",
  estimatedPrice: "Giá bán ước tính / Estimated selling price",
};

const normLabel = (s) =>
  s.normalize("NFC").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\?/g, " ").replace(/m²|\bm2\b/g, " ").replace(/\s+/g, " ").trim();

const fieldFor = (label) => {
  const parts = [normLabel(label), ...normLabel(label).split("/").map((p) => p.trim())];
  for (const [key, f] of Object.entries(FIELDS)) if (parts.some((p) => f.labels.includes(p))) return key;
  return null;
};

const at = (n, line) => `Dòng ${n} / Line ${n} — "${line.trim()}"`;

/** listing.txt text -> { raw: {field: string|null|string[]}, lines: {field: n}, errors } */
export const parseListingTxt = (text) => {
  const raw = {};
  const lines = {};
  const errors = [];
  let list = null; // the list field "- item" lines belong to
  text.replace(/^﻿/, "").split(/\r?\n/).forEach((line, i) => {
    const n = i + 1;
    const t = line.normalize("NFC").trim();
    if (!t || t.startsWith("#")) return;
    if (/^[-•*]/.test(t)) {
      const item = t.replace(/^[-•*]\s*/, "").trim();
      if (!item) return;
      if (!list) errors.push(`${at(n, line)}: dòng "- …" này không nằm dưới mục danh sách nào / this "- …" line is not under a list (e.g. "Đặc điểm nổi bật / Key features:").`);
      else raw[list].push(item);
      return;
    }
    const colon = t.indexOf(":");
    if (colon < 0) {
      errors.push(`${at(n, line)}: thiếu dấu hai chấm, viết "Nhãn: giá trị" / missing the colon, write "Label: value".`);
      list = null;
      return;
    }
    const key = fieldFor(t.slice(0, colon));
    const value = t.slice(colon + 1).trim();
    if (!key) {
      errors.push(`${at(n, line)}: không nhận ra nhãn này, hãy dùng nhãn trong _TEMPLATE/listing.txt / label not recognised, use the labels from _TEMPLATE/listing.txt.`);
      list = null;
      return;
    }
    if (key in raw) {
      errors.push(`${at(n, line)}: mục này đã có ở dòng ${lines[key]} / this field is already filled in on line ${lines[key]}.`);
      return;
    }
    lines[key] = n;
    if (FIELDS[key].list) {
      raw[key] = value ? [value] : [];
      list = key;
    } else {
      raw[key] = value || null;
      list = null;
    }
  });
  return { raw, lines, errors };
};

const number = (s) => {
  const m = /^(\d[\d,]*(?:\.\d+)?)\s*(?:m²|m2|sqm|m)?$/i.exec(String(s).replace(/\s+/g, " ").trim());
  return m ? Number(m[1].replace(/,/g, "")) : NaN;
};

// "$1,250,000" / "$1.2m" / "$850k" -> dollars, every amount in the text.
export const amounts = (text) =>
  [...String(text).matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?([km])?(?![a-z])/gi)].map((m) =>
    parseFloat(m[1].replace(/,/g, "")) * ({ k: 1e3, m: 1e6 }[m[2]?.toLowerCase()] ?? 1));

// What NSW allows in the price line (docs/agents/real-estate-compliance.md):
// sale = a fixed price, a range no wider than 10% (PSAA s 72A), "Contact agent"
// or "Auction" (+ date), never "offers over/above" or "$x+" (s 73(2)), never
// below the estimated selling price in the agency agreement (s 73(1)). Rent =
// one fixed weekly rent (RTA s 22A). [] when fine.
export const priceProblems = (listingType, price, estimated) => {
  const p = String(price ?? "").trim();
  if (!p) return [];
  const out = [];
  if (/\boffers?\s+(?:over|above|from|in excess of|invited)\b|\$\s?[\d.,]+\s?[km]?\s?\+|\bplus\s+offers?\b|trả giá|giá (?:trên|từ)|giá khởi điểm|negotiable|by negotiation|thương lượng/i.test(p))
    out.push(listingType === "rent"
      ? `"${p}": giá thuê phải là một số cố định, không mời trả giá / the rent must be one fixed amount, no offers or negotiation (RTA s 22A).`
      : `"${p}": luật NSW cấm "Offers over", "Offers above" hay "$x+" trong quảng cáo bán / NSW bans "offers over/above" and "$x+" in sale ads (PSAA s 73(2)). Write a fixed price, a range within 10%, "Contact agent" or "Auction".`);
  const $ = amounts(p);
  if (listingType === "rent") {
    if ($.length !== 1 || !/per week|\bpw\b|p\/w|\/\s?w(?:ee)?k|a week|mỗi tuần|\/\s?tuần/i.test(p))
      out.push(`"${p}": viết một giá thuê theo tuần, ví dụ "$650 per week" / write one weekly rent, e.g. "$650 per week" (RTA s 22A).`);
    return out;
  }
  if (!$.length) {
    if (!/^(contact agent|liên hệ nhân viên|auction|đấu giá)\b/i.test(p))
      out.push(`"${p}": viết giá cố định, khoảng giá chênh không quá 10%, "Contact agent" hoặc "Auction" / write a fixed price, a range within 10%, "Contact agent" or "Auction".`);
    return out;
  }
  if ($.length > 2) out.push(`"${p}": chỉ một giá hoặc một khoảng giá / one price or one range only.`);
  const [low, high = low] = [Math.min(...$), Math.max(...$)];
  if (high > low * 1.1)
    out.push(`"${p}": khoảng giá rộng hơn 10% / the range is wider than 10% (PSAA s 72A): the top may be at most ${Math.floor(low * 1.1).toLocaleString("en-AU")}.`);
  const esp = amounts(estimated)[0];
  if (esp && low < esp)
    out.push(`"${p}": thấp hơn giá bán ước tính trong hợp đồng đại lý / is below the estimated selling price in the agency agreement (PSAA s 73(1)): underquoting.`);
  return out;
};

const yesNo = (v) => (/^(yes|y|có|co)$/i.test(v ?? "") ? true : /^(no|n|không|khong)$/i.test(v ?? "") ? false : null);
// "unknown" is allowed for the agency-agreement facts, but the video then
// carries a TEST watermark and can't be posted (listing.json "unknowns").
const UNKNOWN = /^(unknown|chưa biết|chua biet|\?)$/i;

/** raw fields -> { listing (without slug/photos/location), photoNotes, errors } */
export const validateListing = (parsed, agents) => {
  const { raw, lines } = parsed;
  const errors = [...parsed.errors];
  const where = (key) => (lines[key] ? `Dòng ${lines[key]} / Line ${lines[key]} — ` : "");
  const missing = (key) =>
    errors.push(`Thiếu "${TEMPLATE_LABEL[key] ?? key}" / "${(TEMPLATE_LABEL[key] ?? key).split(" / ").pop()}" is missing or empty.`);
  const need = (key) => {
    const v = raw[key];
    if (v == null || v === "") missing(key);
    return v ?? null;
  };

  const agent = (raw.agent ?? "deric").toLowerCase();
  if (!agents[agent])
    errors.push(`${where("agent")}nhân viên "${agent}" không có trong config/businesses/globalre.json / agent "${agent}" is not in config/businesses/globalre.json (known: ${Object.keys(agents).join(", ")}).`);
  const typeWord = (need("listingType") ?? "").toLowerCase();
  const listingType = { sale: "sale", "bán": "sale", ban: "sale", rent: "rent", "thuê": "rent", thue: "rent", lease: "rent" }[typeWord];
  if (typeWord && !listingType)
    errors.push(`${where("listingType")}"${typeWord}": viết "sale" (bán) hoặc "rent" (thuê) / write "sale" or "rent".`);
  const street = need("street");
  const suburb = need("suburb");
  const postcode = need("postcode");
  if (postcode && !/^\d{4}$/.test(postcode))
    errors.push(`${where("postcode")}mã bưu điện phải có 4 chữ số / the postcode must be 4 digits (e.g. 2166).`);
  const state = (raw.state ?? "NSW").toUpperCase();
  if (!STATES.includes(state))
    errors.push(`${where("state")}"${state}" không phải tiểu bang / is not a state (${STATES.join(", ")}).`);
  const ptWord = (need("propertyType") ?? "").toLowerCase();
  const propertyType = {
    house: "house", "nhà": "house", unit: "unit", apartment: "unit", "căn hộ": "unit",
    townhouse: "townhouse", "nhà phố": "townhouse", land: "land", "đất": "land", duplex: "duplex",
  }[ptWord];
  if (ptWord && !propertyType)
    errors.push(`${where("propertyType")}"${ptWord}": dùng house, unit, townhouse, land hoặc duplex / use house, unit, townhouse, land or duplex.`);
  const count = (key) => {
    const v = raw[key];
    if (v == null) {
      if (propertyType === "land") return 0;
      missing(key);
      return 0;
    }
    if (!/^\d{1,2}$/.test(v)) {
      errors.push(`${where(key)}"${v}": cần một số, ví dụ 4 / needs a whole number, e.g. 4.`);
      return 0;
    }
    return Number(v);
  };
  const size = (key) => {
    const v = raw[key];
    if (v == null) return null;
    const n = number(v);
    if (!(n > 0)) {
      errors.push(`${where(key)}"${v}": cần diện tích bằng số, ví dụ 556 / needs an area as a number of m², e.g. 556.`);
      return null;
    }
    return n;
  };
  const unknowns = [];
  const tenanted = yesNo(raw.tenanted);
  if (UNKNOWN.test(raw.tenanted ?? "")) unknowns.push("tenanted");
  else if (tenanted === null) {
    if (raw.tenanted == null) missing("tenanted");
    else errors.push(`${where("tenanted")}viết "yes" (có) hoặc "no" (không) / write "yes" or "no".`);
  }
  const consent = yesNo(raw.tenantConsent);
  if (tenanted && consent === null)
    errors.push(`${raw.tenantConsent == null ? "" : where("tenantConsent")}nhà đang có người thuê: ghi "yes" hoặc "no" cho "Người thuê đồng ý cho chụp ảnh?" / tenanted: answer "Tenant consent for photos obtained?" with yes or no (RTA ss 55AA, 55A).`);
  if (listingType === "sale" && UNKNOWN.test(raw.estimatedPrice ?? "")) unknowns.push("estimatedPrice");
  else if (listingType === "sale" && !amounts(raw.estimatedPrice ?? "").length)
    errors.push(`${where("estimatedPrice")}cần "Giá bán ước tính" từ hợp đồng đại lý, ví dụ $1,250,000 (không hiện trong video) / the "Estimated selling price" from the agency agreement is needed, e.g. $1,250,000 (never shown; the advertised price is checked against it, PSAA s 73(1)).`);
  for (const problem of priceProblems(listingType, raw.price, raw.estimatedPrice)) errors.push(`${where("price")}${problem}`);

  const features = raw.features ?? [];
  if (!features.length)
    errors.push('Cần ít nhất một dòng dưới "Đặc điểm nổi bật / Key features" / at least one "- feature" line is needed under "Key features".');

  return {
    listing: {
      agent,
      listingType: listingType ?? "sale",
      street,
      suburb,
      postcode,
      state,
      propertyType: propertyType ?? "house",
      bedrooms: count("bedrooms"),
      bathrooms: count("bathrooms"),
      carSpaces: raw.carSpaces == null ? null : count("carSpaces"), // optional: some listings give none
      landSizeM2: size("landSize"),
      internalSizeM2: size("internalSize"),
      price: need("price"),
      auction: raw.auction ?? null,
      openHomes: raw.openHomes ?? [],
      availableFrom: raw.availableFrom ?? null,
      features,
      nearby: raw.nearby ?? [],
      doNotSay: raw.doNotSay ?? [],
      tenanted: unknowns.includes("tenanted") ? null : Boolean(tenanted),
      tenantPhotoConsent: tenanted ? Boolean(consent) : null,
      unknowns,
      // Private (agency agreement): never shown or said; the guard checks every figure against it.
      estimatedSellingPrice: listingType === "sale" ? (amounts(raw.estimatedPrice ?? "")[0] ?? null) : null,
      materialFacts: raw.materialFacts ?? [],
    },
    photoNotes: raw.photoNotes ?? [],
    editedPhotos: raw.editedPhotos ?? [],
    errors,
  };
};

export const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const PHOTO = /\.(jpe?g|png)$/i;
const HEIC = /\.(heic|heif)$/i;

/** Photo files in tour order: noted ones first, in note order, then the rest by name. */
export const orderPhotos = (files, notes) => {
  const errors = [];
  const noted = [];
  for (const note of notes) {
    const m = /^(.+?\.(?:jpe?g|png|heic|heif))\s*(?:=|:|–|—|-)\s*(.*)$/i.exec(note);
    if (!m) {
      errors.push(`Ghi chú ảnh "${note}": viết "1.jpg = front" / photo note "${note}": write it as "1.jpg = front".`);
      continue;
    }
    const file = files.find((f) => f.toLowerCase() === m[1].trim().toLowerCase());
    if (!file) {
      if (!HEIC.test(m[1])) errors.push(`Ghi chú ảnh nói "${m[1]}" nhưng không có tệp đó / the photo note names "${m[1]}" but there is no such photo.`);
      continue;
    }
    noted.push({ file, note: m[2].trim() || null });
  }
  const rest = files
    .filter((f) => !noted.some((n) => n.file === f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => ({ file, note: null }));
  return { ordered: [...noted, ...rest], errors };
};

const loadEnv = () => {
  for (const f of [".env.local", ".env"]) if (existsSync(join(ROOT, f))) process.loadEnvFile(join(ROOT, f));
};

// The suburb's centre, or null. Only the suburb, state and postcode are sent.
const geocode = async ({ suburb, state, postcode }) => {
  const key = process.env.REMOTION_MAPTILER_KEY;
  if (!key) return { location: null, why: "no REMOTION_MAPTILER_KEY" };
  const q = encodeURIComponent(`${suburb} ${state} ${postcode}`);
  try {
    const res = await fetch(`https://api.maptiler.com/geocoding/${q}.json?key=${key}&country=au&limit=5`);
    if (!res.ok) return { location: null, why: `MapTiler HTTP ${res.status}` };
    const body = await res.json();
    const want = suburb.toLowerCase();
    const hit = (body.features ?? []).find(
      (f) => String(f.text ?? "").toLowerCase() === want && (String(f.place_name ?? "").includes(postcode) || String(f.place_name ?? "").toLowerCase().includes("new south wales") || String(f.place_name ?? "").includes(state)),
    );
    if (!hit?.center) return { location: null, why: `no confident match for "${suburb}"` };
    return { location: { longitude: hit.center[0], latitude: hit.center[1], label: hit.place_name }, why: null };
  } catch (err) {
    return { location: null, why: err.message };
  }
};

// sharp when it's installed (it is, through @huggingface/transformers); ffmpeg otherwise.
const resize = async (src, dest) => {
  try {
    const { default: sharp } = await import("sharp");
    const info = await sharp(src).rotate().resize({ width: LONG_EDGE, height: LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true }).toFile(dest);
    return { width: info.width, height: info.height };
  } catch (err) {
    if (err.code !== "ERR_MODULE_NOT_FOUND") throw err;
    // ponytail: ffmpeg fallback doesn't read EXIF rotation; install sharp if phone photos come out sideways.
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf",
      `scale='if(gt(iw,ih),min(${LONG_EDGE},iw),-2)':'if(gt(iw,ih),-2,min(${LONG_EDGE},ih))'`, "-q:v", "3", dest]);
    const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", dest], { encoding: "utf8" });
    const [width, height] = out.trim().split(",").map(Number);
    return { width, height };
  }
};

const fail = (msg) => {
  console.error(`\nlisting-prep: ${msg}`);
  process.exit(1);
};

const main = async () => {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!arg) fail('dùng / usage: npm run listing -- "<tên thư mục / folder name>"');
  const folder = isAbsolute(arg) ? arg : join(LISTINGS_DIR, arg);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    const have = existsSync(LISTINGS_DIR) ? readdirSync(LISTINGS_DIR).filter((f) => statSync(join(LISTINGS_DIR, f)).isDirectory()) : [];
    const close = have.filter((f) => f.toLowerCase().includes(arg.toLowerCase().slice(0, 6)));
    fail(`không tìm thấy thư mục / folder not found: "${arg}".\nCó / Available: ${(close.length ? close : have).join(" | ") || "(none)"}`);
  }
  const txt = join(folder, "listing.txt");
  if (!existsSync(txt)) fail(`thiếu listing.txt trong "${basename(folder)}" / listing.txt is missing. Copy it from "3 - GLOBAL RE LISTINGS/_TEMPLATE".`);

  const business = JSON.parse(readFileSync(join(ROOT, "config", "businesses", "globalre.json"), "utf8"));
  const { listing, photoNotes, editedPhotos, errors } = validateListing(parseListingTxt(readFileSync(txt, "utf8")), business.agents);

  const all = readdirSync(folder).filter((f) => statSync(join(folder, f)).isFile());
  for (const f of all.filter((f) => HEIC.test(f)))
    console.log(`Bỏ qua ảnh HEIC / skipped HEIC photo: ${f} — xuất ra JPG rồi thêm lại / export it as JPG and add it again (iPhone: Settings > Camera > Formats > Most Compatible).`);
  for (const f of all.filter((f) => !PHOTO.test(f) && !HEIC.test(f) && !/^(listing|readme)\.txt$/i.test(f) && !f.startsWith(".")))
    console.log(`Bỏ qua / skipped (not a jpg/png photo): ${f}`);
  const { ordered, errors: photoErrors } = orderPhotos(all.filter((f) => PHOTO.test(f)), photoNotes);
  errors.push(...photoErrors);
  // "all" / "tất cả": every photo (e.g. staging not yet confirmed by the agent).
  const allEdited = editedPhotos.some((e) => /^(all|tất cả|tat ca)$/i.test(e));
  const isEdited = (f) => allEdited || editedPhotos.some((e) => e.toLowerCase() === f.toLowerCase());
  for (const e of allEdited ? [] : editedPhotos)
    if (!ordered.some((o) => o.file.toLowerCase() === e.toLowerCase()))
      errors.push(`"Ảnh đã chỉnh sửa" nói "${e}" nhưng không có ảnh đó / "Edited photos" names "${e}" but there is no such photo.`);
  if (!ordered.length) errors.push("Không có ảnh jpg/png trong thư mục / there are no jpg or png photos in the folder.");
  if (errors.length) fail(`listing.txt cần sửa / needs fixing (${basename(folder)}):\n${errors.map((e) => `  - ${e}`).join("\n")}`);

  const slug = slugify(`${listing.street} ${listing.suburb}`);
  const out = join(ROOT, "public", "listings", slug);
  const photoDir = join(out, "photos");
  rmSync(photoDir, { recursive: true, force: true });
  mkdirSync(photoDir, { recursive: true });
  const photos = [];
  for (const [i, p] of ordered.entries()) {
    const file = `${String(i + 1).padStart(2, "0")}.jpg`;
    const { width, height } = await resize(join(folder, p.file), join(photoDir, file));
    photos.push({ file, original: p.file, width, height, note: p.note, edited: isEdited(p.file) });
    console.log(`  ${file}  <- ${p.file}${p.note ? `  (${p.note})` : ""}  ${width}x${height}`);
  }

  loadEnv();
  const { location, why } = await geocode(listing);
  if (listing.unknowns.length)
    console.log(`\nCHƯA BIẾT / UNKNOWN: ${listing.unknowns.join(", ")} — video chỉ để thử (có chữ TEST), chưa được đăng / test video only (TEST watermark), not for posting until these are filled in.\n`);
  if (listing.tenanted && !listing.tenantPhotoConsent)
    console.log("\nCHÚ Ý / NOTE: nhà có người thuê nhưng chưa có đồng ý chụp ảnh: video sẽ không được làm cho tới khi có / tenanted without photo consent: the video won't be voiced or rendered until consent is recorded (RTA ss 55AA, 55A).\n");
  console.log(location ? `Bản đồ / map: ${location.label}` : `Không có bản đồ, dùng thẻ vị trí / no map, locator card instead (${why}).`);

  const { listingSchema } = await import(pathToFileURL(join(ROOT, "src", "listing", "schema.ts")).href);
  // A folder named "_TEST ..." is a pipeline test: watermarked, never posted.
  const test = basename(folder).toUpperCase().startsWith("_TEST");
  const data = listingSchema.parse({ slug, ...listing, photos, location, test });
  writeFileSync(join(out, "listing.json"), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\nXong / done: public/listings/${slug}/listing.json + ${photos.length} ảnh / photos.`);
  console.log(`Tiếp theo / next: Claude viết script.json (xem từng ảnh), rồi / then: node scripts/voice-video.mjs ${slug} --listing --dry-run`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
