/**
 * Listing-ad copy guard for Global RE Pty Ltd (NSW residential sales and leasing).
 *
 * The plain-English rules, the exact statutory text relied on and the fetch dates are in
 * docs/agents/real-estate-compliance.md. Every rule below carries a `cite` key into
 * CITATIONS so a hit can be traced to the section it protects.
 *
 * Same design as src/mortgage/compliance.ts (the RG 234 guard):
 *   - default deny: a "block" hit fails the ad; a "flag" hit fails it too until someone
 *     declares WHY it is fine, from a fixed set of reasons, with a note;
 *   - every clearance is returned as an audit trail;
 *   - it throws rather than degrading: an ad that underquotes or invites rent bids is
 *     worse than an ad that fails to render.
 *
 * A phrase list cannot tell if "walk to the station" is true. `flag` exists so a human
 * confirms the fact (and writes down the evidence) before it ships. It is a floor, not
 * legal sign-off.
 *
 * Runs under plain Node (type stripping): keep to erasable TypeScript, no enums.
 */

export type Mode = "sale" | "lease";

/** Where to read the law a rule protects. Fetched 28/09/2026 — see the doc. */
export const CITATIONS: Record<string, { title: string; url: string }> = {
  "PSAA-s73": {
    title:
      "Property and Stock Agents Act 2002 (NSW) s 73 — underquoting in advertisements",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2002-066#sec.73",
  },
  "PSAA-s73A": {
    title:
      "Property and Stock Agents Act 2002 (NSW) s 73A — underquoting in representations",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2002-066#sec.73A",
  },
  "PSAA-s52": {
    title:
      "Property and Stock Agents Act 2002 (NSW) s 52 — misrepresentation by licensee",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2002-066#sec.52",
  },
  "ACL-s4": {
    title:
      "Australian Consumer Law s 4 — representations about future matters need reasonable grounds",
    url: "https://www.legislation.gov.au/C2004A00109/latest/text",
  },
  "ACL-s18": {
    title: "Australian Consumer Law s 18 — misleading or deceptive conduct",
    url: "https://www.legislation.gov.au/C2004A00109/latest/text",
  },
  "ACL-s29": {
    title:
      "Australian Consumer Law s 29(1)(b),(e)-(h) — services, testimonials, approval, affiliation",
    url: "https://www.legislation.gov.au/C2004A00109/latest/text",
  },
  "ACL-s30": {
    title:
      "Australian Consumer Law s 30 — price, location, characteristics, facilities of land",
    url: "https://www.legislation.gov.au/C2004A00109/latest/text",
  },
  "FT-photos": {
    title:
      "NSW Fair Trading — Advertising guidelines for property agents (location shots, altered photos)",
    url: "https://www.nsw.gov.au/housing-and-construction/property-professionals/working-as-an-agent/advertising-guidelines",
  },
  "RTA-s22A": {
    title:
      "Residential Tenancies Act 2010 (NSW) s 22A — fixed rent in ads; no soliciting higher rent",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2010-042#sec.22A",
  },
  "RTA-s73H": {
    title:
      "Residential Tenancies Act 2010 (NSW) s 73H — must not advertise that pets are not permitted",
    url: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2010-042#sec.73H",
  },
};

export interface ListingRule {
  id: string;
  /** Matched against NFC-normalised, lower-cased copy. */
  pattern: RegExp;
  /** block = rewrite it. flag = prove it (or rewrite it). */
  severity: "block" | "flag";
  /** Omitted = applies to sale and lease ads. */
  mode?: Mode;
  reason: string;
  cite: keyof typeof CITATIONS;
}

// English phrases get word boundaries; Vietnamese is matched as a substring because
// \b does not understand diacritics (same reasoning as the RG 234 guard).
const en = (words: string): RegExp =>
  new RegExp(String.raw`\b(?:${words})\b`, "i");
const vi = (words: string): RegExp => new RegExp(`(?:${words})`, "i");

export const LISTING_RULES: ListingRule[] = [
  // --- Guarantees and investment promises: future matters with no reasonable grounds ---
  {
    id: "guarantee-en",
    severity: "block",
    cite: "ACL-s4",
    pattern: en(
      "guaranteed?|risk[- ]free|can'?t lose|sure to (?:rise|grow|increase)|will (?:increase|rise|grow|double) in value|safe investment",
    ),
    reason:
      "Promises about future value are misleading unless there are reasonable grounds (ACL s 4); a guarantee never has them.",
  },
  {
    id: "guarantee-vi",
    severity: "block",
    cite: "ACL-s4",
    pattern: vi(
      "chắc chắn tăng giá|đảm bảo tăng giá|bảo đảm tăng giá|cam kết tăng giá|chắc chắn sinh lời|đảm bảo lợi nhuận|bảo đảm lợi nhuận|cam kết lợi nhuận|không thể lỗ|không bao giờ lỗ|đầu tư an toàn tuyệt đối|chắc chắn có lời",
    ),
    reason:
      "Hứa hẹn giá trị tương lai là gây hiểu lầm nếu không có căn cứ hợp lý (ACL s 4). Promise of future value.",
  },
  {
    id: "investment-return-en",
    severity: "flag",
    cite: "ACL-s4",
    pattern: en(
      String.raw`\d+(?:\.\d+)?\s?%\s?(?:return|returns|yield|growth|p\.?a\.?)|positive(?:ly)? geared|positive cash ?flow|pays for itself|rent covers (?:the|your) mortgage|capital growth`,
    ),
    reason:
      "Yield/growth figures are representations about future matters: keep only if sourced and dated (e.g. current lease rent ÷ advertised price), never as a promise.",
  },
  {
    id: "investment-return-vi",
    severity: "flag",
    cite: "ACL-s4",
    pattern: vi(
      String.raw`lợi nhuận\s?\d|lợi suất|sinh lời|tăng giá gấp|dòng tiền dương|tiền thuê đủ trả (?:nợ|góp)|tiền thuê trả hết|\d+(?:[.,]\d+)?\s?%\s?(?:mỗi năm|một năm|\/năm)`,
    ),
    reason:
      "Con số lợi nhuận/tăng giá là dự đoán tương lai: chỉ giữ nếu có nguồn và ngày (ACL s 4). Return figure.",
  },

  // --- Unsubstantiated superlatives ---
  {
    id: "superlative-en",
    severity: "flag",
    cite: "ACL-s30",
    pattern: en(
      "best|cheapest|lowest price|finest|biggest|largest|number one|no\\.? ?1|#1|unbeatable|best value",
    ),
    reason:
      "A superlative about the property is a claim about its characteristics or price (ACL s 30): keep only with evidence, or say the fact instead.",
  },
  {
    id: "superlative-vi",
    severity: "flag",
    cite: "ACL-s30",
    pattern: vi(
      "tốt nhất|rẻ nhất|đẹp nhất|lớn nhất|rộng nhất|số 1|số một|hàng đầu|không đâu bằng|có một không hai|giá tốt nhất",
    ),
    reason:
      "So sánh nhất về căn nhà là tuyên bố về đặc điểm/giá (ACL s 30): cần bằng chứng, hoặc nói sự thật cụ thể.",
  },

  // --- Underquoting signals (sale) ---
  {
    id: "offers-over",
    severity: "block",
    mode: "sale",
    cite: "PSAA-s73",
    pattern:
      /\boffers?\s+(?:over|above|from|in excess of)\b|\$\s?[\d.,]+\s?[km]?\s?\+|\bplus\s+offers?\b|trả giá (?:trên|từ)|giá (?:trên|từ|khởi điểm)\s?\$|giá khởi điểm|trên \$\s?[\d.,]/i,
    reason:
      "'Offers over/above' a price, or '$x+', in any language is banned outright in NSW sale ads (PSAA s 73(2)).",
  },
  {
    id: "bargain-en",
    severity: "flag",
    mode: "sale",
    cite: "PSAA-s73",
    pattern: en(
      "bargain|must (?:be )?sell|must go|desperate|fire sale|steal|priced to sell|below (?:market|valuation)|under (?:market|value)|genuine seller slashes|reduced to sell|urgent sale|mortgagee",
    ),
    reason:
      "Words that suggest it will sell below its value can 'indicate or suggest' a price under the estimated selling price (PSAA s 73(1), s 73A).",
  },
  {
    id: "bargain-vi",
    severity: "flag",
    mode: "sale",
    cite: "PSAA-s73",
    pattern: vi(
      "giá hời|bán gấp|cần bán gấp|kẹt tiền|bán lỗ|cắt lỗ|giá rẻ bất ngờ|rẻ như cho|dưới giá thị trường|thấp hơn giá thị trường|giá sốc|ngộp",
    ),
    reason:
      "Lời gợi ý bán dưới giá trị có thể là underquoting (PSAA s 73(1), s 73A).",
  },

  // --- Rent bidding and rent price (lease) ---
  {
    id: "rent-bidding-en",
    severity: "block",
    mode: "lease",
    cite: "RTA-s22A",
    pattern: en(
      "make (?:us )?an offer|offers? (?:over|above|from|invited)|open to offers|by negotiation|negotiable|highest offer|best offer|name your (?:price|rent)|outbid|price range",
    ),
    reason:
      "Rent must be one fixed amount, and nobody may invite an offer above it (RTA s 22A(1) and (3)); Fair Trading says 'make an offer', ranges, 'offers from' and 'by negotiation' do not comply.",
  },
  {
    id: "rent-bidding-vi",
    severity: "block",
    mode: "lease",
    cite: "RTA-s22A",
    pattern: vi(
      "trả giá|trả thêm|trả cao hơn|đề nghị giá|ra giá|giá thương lượng|thương lượng giá|giá thuê từ|ai trả cao|đấu giá thuê|mời trả giá",
    ),
    reason:
      "Không được mời người thuê trả cao hơn giá quảng cáo, và giá thuê phải cố định (RTA s 22A).",
  },
  {
    id: "no-pets-en",
    severity: "block",
    mode: "lease",
    cite: "RTA-s73H",
    pattern: en(
      "no pets?|pets? not (?:allowed|permitted)|no (?:dogs|cats|animals)|pet[- ]free",
    ),
    reason:
      "A rental ad must not say a tenant's animal won't be permitted (RTA s 73H). State facts instead, e.g. 'yard not fenced'.",
  },
  {
    id: "no-pets-vi",
    severity: "block",
    mode: "lease",
    cite: "RTA-s73H",
    pattern: vi(
      "không nuôi thú cưng|không cho nuôi|không được nuôi|cấm (?:nuôi )?thú cưng|không nhận thú cưng|không (?:chó|mèo)",
    ),
    reason:
      "Quảng cáo cho thuê không được nói không cho nuôi thú cưng (RTA s 73H).",
  },

  // --- Claims that need a fact behind them ---
  {
    id: "vague-location-en",
    severity: "flag",
    cite: "FT-photos",
    pattern: en(
      "walk(?:ing)? (?:distance )?to|walking distance|stroll to|close to|minutes? (?:to|from)|moments? (?:to|from)|steps? (?:to|from)|near(?:by)?|at your doorstep",
    ),
    reason:
      "Fair Trading prefers measured distances ('2 km to beach' over 'close to beach'); vague location claims can breach ACL s 30(1)(d). Give km/metres from a map.",
  },
  {
    id: "vague-location-vi",
    severity: "flag",
    cite: "FT-photos",
    pattern: vi(
      "đi bộ|vài phút|gần ga|gần chợ|gần trường|gần trung tâm|ngay cạnh|sát bên|cách vài bước",
    ),
    reason:
      "Nói khoảng cách cụ thể (km/mét), không nói 'gần', 'vài phút' (Fair Trading; ACL s 30(1)(d)).",
  },
  {
    id: "condition-claim-en",
    severity: "flag",
    cite: "ACL-s30",
    pattern: en(
      "brand new|as new|newly built|fully renovated|renovated|freshly updated|quiet (?:street|location|area)|peaceful|no neighbours|flood[- ]free|never flooded|(?:water|city|ocean|harbour|district|park) views?|north[- ]facing|approved|approval|da approved",
    ),
    reason:
      "Characteristics and lawful use of the land (ACL s 30(1)(e),(f)): confirm with the vendor/documents — year built, what was renovated and when, council approval, and that the view is seen from the property.",
  },
  {
    id: "condition-claim-vi",
    severity: "flag",
    cite: "ACL-s30",
    pattern: vi(
      "mới xây|mới toanh|mới tinh|như mới|mới sửa|sửa sang toàn bộ|đã sửa sang|yên tĩnh|không bao giờ ngập|không ngập|view (?:sông|biển|thành phố|công viên)|hướng bắc|đã được duyệt|có giấy phép",
    ),
    reason:
      "Đặc điểm và mục đích sử dụng hợp pháp của nhà (ACL s 30(1)(e),(f)): phải có giấy tờ chứng minh.",
  },
  {
    id: "size-claim",
    severity: "flag",
    cite: "ACL-s30",
    pattern:
      /\d+(?:[.,]\d+)?\s?(?:m2|m²|sqm|sq m|square met(?:re|er)s?|mét vuông|hectares?|ha)(?![a-z])|\bland size\b|diện tích/i,
    reason:
      "Areas must come from the title/survey/strata plan, and say which (land vs internal vs total) (ACL s 30(1)(e)).",
  },

  // --- Claims about the agent ---
  {
    id: "agent-claim-en",
    severity: "flag",
    cite: "ACL-s29",
    pattern: en(
      "top agent|best agent|number one agent|leading agent|award[- ]winning|record[- ]breaking|record price|5[- ]star|five[- ]star|most trusted|highest[- ]selling|#1 agent|no\\.? ?1 agent",
    ),
    reason:
      "Claims about the agent's service, awards, testimonials or ratings must be true, current and attributable (ACL s 29(1)(b),(e)-(h), s 18). Name the award, the year and who gave it.",
  },
  {
    id: "agent-claim-vi",
    severity: "flag",
    cite: "ACL-s29",
    pattern: vi(
      "môi giới số 1|đại lý số 1|môi giới hàng đầu|công ty hàng đầu|đoạt giải|giải thưởng|kỷ lục|5 sao|năm sao|uy tín nhất|được tin tưởng nhất",
    ),
    reason:
      "Tuyên bố về giải thưởng/đánh giá của đại lý phải đúng, còn hiệu lực và ghi rõ nguồn (ACL s 29, s 18).",
  },
];

/** Why a hit is legitimately present. */
export type ClearReason =
  /** Flags only. The note names the evidence (document, date, measurement). */
  | "substantiated"
  /** Saying something is NOT so ("not guaranteed", "no offers above the advertised rent"). */
  | "negation"
  /** Flags only. Neutral usage, e.g. "close to" inside a measured statement. */
  | "context";

const REASONS_FOR_BLOCK: ClearReason[] = ["negation"];

export interface Clearance {
  field: string;
  /** ListingRule.id, or "price-below-advertised" / "rent-mismatch". */
  rule: string;
  reason: ClearReason;
  /** Required. Becomes the audit record. */
  note: string;
}

export interface ListingContext {
  mode: Mode;
  /** Sale: the advertised price or the bottom of the advertised range, in dollars. */
  priceMin?: number;
  /** Lease: the one fixed weekly rent in the ad, in dollars. Required for lease. */
  rentPerWeek?: number;
}

export interface Hit {
  field: string;
  rule: string;
  severity: "block" | "flag";
  match: string;
  reason: string;
  cite: string;
}

// $850k, $1.2m, $1.2 million, $850 thousand, $850,000, 850.000 đô, 1,2 triệu đô, 850 nghìn/ngàn đô
const MONEY =
  /\$\s?(\d{1,3}(?:[,.]\d{3})+|\d+(?:\.\d+)?)\s?((?:million|mil|mn|thousand|[km])(?![a-z²]))?|(\d+(?:[.,]\d+)?)\s?(triệu|nghìn|ngàn)\s?(?:đô|dollar|\$)/gi;

const toDollars = (m: RegExpExecArray): number => {
  if (m[1] !== undefined) {
    const suffix = (m[2] || "").toLowerCase();
    const n = suffix
      ? parseFloat(m[1].replace(",", "."))
      : parseFloat(m[1].replace(/[,.](?=\d{3}\b)/g, ""));
    return n * (suffix.startsWith("m") ? 1e6 : suffix === "k" || suffix === "thousand" ? 1e3 : 1);
  }
  const n = parseFloat(m[3].replace(",", "."));
  return n * (m[4].toLowerCase() === "triệu" ? 1e6 : 1e3);
};

/**
 * Money in the copy that contradicts the given price.
 * Sale: any amount below priceMin that is at least half of it (smaller sums are
 * usually "$20k of upgrades", not a price hint).
 * ponytail: the 50% cut-off is a heuristic; a "$450k deposit" on a $900k home would slip
 * through as a non-price. Tighten when a real miss happens.
 * Lease: any weekly-looking amount (/week, pw, p/w, mỗi tuần, /tuần) that is not the rent.
 */
const priceHits = (field: string, text: string, ctx: ListingContext): Hit[] => {
  const out: Hit[] = [];
  const re = new RegExp(MONEY.source, MONEY.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const amount = toDollars(m);
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 14);
    if (
      ctx.mode === "sale" &&
      ctx.priceMin &&
      amount < ctx.priceMin &&
      amount >= ctx.priceMin / 2
    ) {
      out.push({
        field,
        rule: "price-below-advertised",
        severity: "block",
        match: m[0],
        cite: "PSAA-s73",
        reason: `${m[0].trim()} is below the advertised price $${ctx.priceMin.toLocaleString("en-AU")}; an ad may not suggest a lower price (PSAA s 73(1)).`,
      });
    }
    const weekly =
      /^\s?(?:\/\s?(?:week|wk|tuần)|p\.?\s?w|per week|a week|mỗi tuần|một tuần)/i.test(
        after,
      );
    if (
      ctx.mode === "lease" &&
      weekly &&
      ctx.rentPerWeek &&
      amount !== ctx.rentPerWeek
    ) {
      out.push({
        field,
        rule: "rent-mismatch",
        severity: "block",
        match: m[0],
        cite: "RTA-s22A",
        reason: `${m[0].trim()} per week differs from the fixed rent $${ctx.rentPerWeek}; the ad must state one fixed rent (RTA s 22A(1)).`,
      });
    }
  }
  return out;
};

export interface ListingAudit {
  cleared: (Hit & { clearedBy: ClearReason; note: string })[];
  /** Declared but never matched — stale, remove it. */
  unused: Clearance[];
}

/** Every hit, uncleared. Use for a report; use assertListingCopy to gate a render. */
export const scanListingCopy = (
  fields: Record<string, string | string[] | undefined>,
  ctx: ListingContext,
): Hit[] => {
  const hits: Hit[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    for (const raw of Array.isArray(value) ? value : [value]) {
      const text = raw.normalize("NFC").toLowerCase();
      for (const r of LISTING_RULES) {
        if (r.mode && r.mode !== ctx.mode) continue;
        const m = r.pattern.exec(text);
        if (m)
          hits.push({
            field,
            rule: r.id,
            severity: r.severity,
            match: m[0],
            reason: r.reason,
            cite: r.cite,
          });
      }
      hits.push(...priceHits(field, text, ctx));
    }
  }
  return hits;
};

/**
 * Throws if any hit lacks a valid clearance. A lease ad must supply rentPerWeek: an ad
 * without one fixed rent is itself the offence (RTA s 22A(1)).
 */
export const assertListingCopy = (
  fields: Record<string, string | string[] | undefined>,
  ctx: ListingContext,
  clearances: Clearance[] = [],
): ListingAudit => {
  const problems: string[] = [];
  if (ctx.mode === "lease" && !ctx.rentPerWeek) {
    problems.push(
      "lease ad: rentPerWeek missing — a rental ad must state one fixed rent (RTA s 22A(1))",
    );
  }
  const cleared: ListingAudit["cleared"] = [];
  const used = new Set<number>();

  for (const h of scanListingCopy(fields, ctx)) {
    const i = clearances.findIndex(
      (c) => c.field === h.field && c.rule === h.rule,
    );
    const c = i >= 0 ? clearances[i] : undefined;
    const where = `${h.field}: "${h.match}" [${h.rule}, ${h.cite}]`;
    if (!c) {
      problems.push(`${where} — ${h.reason}`);
      continue;
    }
    if (!c.note?.trim()) {
      problems.push(`${where} — clearance has an empty note`);
      continue;
    }
    if (h.severity === "block" && REASONS_FOR_BLOCK.indexOf(c.reason) < 0) {
      problems.push(
        `${where} — "${c.reason}" cannot clear a banned phrase; rewrite it (only a negation clears it)`,
      );
      continue;
    }
    used.add(i);
    cleared.push({ ...h, clearedBy: c.reason, note: c.note });
  }

  if (problems.length) {
    throw new Error(
      `Listing ad compliance: ${problems.length} problem(s).\n  ${[...new Set(problems)].join("\n  ")}\n\n` +
        `Flags clear with { field, rule, reason: "substantiated" | "context" | "negation", note } —\n` +
        `the note names the evidence. Banned phrases must be rewritten.\n` +
        `Rules and sources: docs/agents/real-estate-compliance.md`,
    );
  }
  return { cleared, unused: clearances.filter((_, i) => !used.has(i)) };
};

/**
 * End-card wording. The agency name is REQUIRED on every ad (PSAA s 50(1)); the rest is
 * good practice, not a statutory form of words. See the doc before changing it.
 */
export const AGENCY_LINE = "Global RE Pty Ltd · Cabramatta NSW 2166";

export const LISTING_DISCLAIMER_EN =
  "Information is from the vendor and other sources we believe are reliable, but we have not " +
  "independently verified it. Buyers and renters should make their own enquiries. Location shots " +
  "and any digitally altered or virtually staged images are labelled.";

export const LISTING_DISCLAIMER_VI =
  "Thông tin do chủ nhà và các nguồn chúng tôi tin là đáng tin cậy cung cấp, nhưng chưa được kiểm " +
  "chứng độc lập. Người mua và người thuê nên tự tìm hiểu trước khi quyết định. Ảnh khu vực xung " +
  "quanh và mọi hình ảnh đã chỉnh sửa kỹ thuật số hoặc dàn dựng ảo đều được ghi chú.";
