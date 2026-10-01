// Listing-copy guard for Global RE videos: every spoken line, subtitle,
// on-screen label and post goes through checkListingCopy before anything is
// voiced or rendered (scripts/listing-compliance.mjs runs it).
//
// The real-estate rule set is src/listing/compliance-rules.ts (sources in
// docs/agents/real-estate-compliance.md), written separately.
// scripts/listing-compliance.mjs bundles it when present and passes the module
// to makeListingChecker; without it a small baseline runs instead. Every hit,
// "block" or "flag", stops the run here: this pipeline has no clearances, so
// never add an exemption to get a line through; rewrite the line.

export type ListingFlag = { phrase: string; reason: string };
// confirm: "flag" hits (prove-it, not banned) on words the agent's own key
// features state; allowed, and listed for the agent to confirm before posting.
export type ListingCheck = { ok: boolean; flags: ListingFlag[]; confirm: ListingFlag[] };
// What the listing itself says (listing.json).
export type ListingContext = {
  features?: string[];
  doNotSay?: string[];
  listingType?: "sale" | "rent";
  price?: string;
  // Agency-agreement estimate: no figure may go below it (PSAA s 73(1)).
  estimatedSellingPrice?: number | null;
};

type Rule = { pattern: RegExp; reason: string };
const rule = (source: string, reason: string): Rule => ({
  pattern: new RegExp(source, "iu"),
  reason,
});

// Only when compliance-rules.ts is missing (it covers all of these, better).
const BASELINE: Rule[] = [
  rule(
    "capital growth|tăng trưởng vốn|tăng giá trị",
    "speculative capital-growth claim",
  ),
  rule(
    "rental (?:return|yield)|\\byield\\b|lợi nhuận|sinh lời",
    "investment-return claim",
  ),
  rule("guarantee|bảo đảm|đảm bảo|cam kết", "guarantee"),
  rule(
    "bargain|under market|below market|dưới giá thị trường|giá rẻ|giá hời|offers? (?:over|above|from)",
    "price hint beyond the advertised price (NSW underquoting)",
  ),
  rule(
    "\\bbest\\b|tốt nhất|number one|hàng đầu",
    "superlative that can't be verified",
  ),
];

// Condition words, allowed only when listing.txt's key features say so.
const CONDITION: { pattern: RegExp; word: string }[] = [
  { pattern: /renovat|mới sửa|cải tạo|tân trang/iu, word: "renovated" },
  { pattern: /brand new|mới xây|mới tinh|hoàn toàn mới/iu, word: "brand new" },
  {
    pattern:
      /\b(?:city|water|district|ocean|harbour|mountain|panoramic) views?\b|view đẹp|tầm nhìn/iu,
    word: "view",
  },
];

const fold = (s: string) => s.normalize("NFC").toLowerCase();

const listingAware = (text: string, ctx: ListingContext): ListingFlag[] => {
  const flags: ListingFlag[] = [];
  const features = fold((ctx.features ?? []).join(" | "));
  for (const c of CONDITION) {
    const m = c.pattern.exec(text);
    if (m && !c.pattern.test(features))
      flags.push({
        phrase: m[0],
        reason: `"${c.word}" is not in the listing's key features`,
      });
  }
  for (const banned of ctx.doNotSay ?? []) {
    const b = fold(banned).trim();
    if (b && fold(text).includes(b))
      flags.push({
        phrase: banned,
        reason: 'listing.txt says the video must not say this ("Do not say")',
      });
  }
  return flags;
};

// "$1,250,000" / "$1.2m" / "$1.2 million" / "$850 thousand" / "$650 per week"
// -> dollars; "Contact agent" -> undefined.
const dollars = (price = ""): number | undefined => {
  const m = /\$\s?(\d[\d,]*(?:\.\d+)?)(?!\d)(?:\s?(million|mil|mn|thousand|k|m)(?![a-z]))?/i.exec(price);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(/,/g, ""));
  const unit = (m[2] ?? "").toLowerCase();
  return n * (unit.startsWith("m") ? 1e6 : unit === "k" || unit === "thousand" ? 1e3 : 1);
};
// A sale price under this was misread ("$1.2 - 1.3 million" -> 1.2), not a price.
const MIN_SALE_DOLLARS = 1000;

// The shape of compliance-rules.ts that is used here.
type Hit = { rule: string; severity: string; match: string; reason: string };
type Scan = (
  fields: Record<string, string>,
  ctx: { mode: "sale" | "lease"; priceMin?: number; rentPerWeek?: number },
) => Hit[];

export const makeListingChecker = (rulesModule?: unknown) => {
  const mod = (rulesModule ?? {}) as { scanListingCopy?: unknown };
  const scan =
    typeof mod.scanListingCopy === "function"
      ? (mod.scanListingCopy as Scan)
      : null;
  return (text: string, ctx: ListingContext = {}): ListingCheck => {
    const t = text.normalize("NFC");
    const flags = listingAware(t, ctx);
    const confirm: ListingFlag[] = [];
    if (scan) {
      const lease = ctx.listingType === "rent";
      const amount = dollars(ctx.price);
      const estimate = ctx.estimatedSellingPrice ?? undefined;
      // A dollar price that does not read as a figure would set the s 73 floor
      // to nothing; say so instead of checking against it.
      const unreadable =
        !lease &&
        estimate !== undefined &&
        /\$|\baud\b/i.test(ctx.price ?? "") &&
        !(amount !== undefined && amount >= MIN_SALE_DOLLARS);
      if (unreadable)
        flags.push({
          phrase: ctx.price ?? "",
          reason: `listing price "${ctx.price}" does not read as a dollar figure, so the PSAA s 73 underquoting floor cannot use it; write it as "$1,250,000" or "$1.25m"`,
        });
      const features = fold((ctx.features ?? []).join(" | "));
      for (const h of scan(
        { text: t },
        {
          mode: lease ? "lease" : "sale",
          priceMin: lease ? undefined : unreadable ? estimate : (amount ?? estimate),
          rentPerWeek: lease ? amount : undefined,
        },
      ))
        (h.severity === "flag" && features.includes(fold(h.match)) ? confirm : flags).push({
          phrase: h.match,
          reason: `${h.reason} [${h.severity} ${h.rule}]`,
        });
    } else {
      for (const r of BASELINE) {
        const m = r.pattern.exec(t);
        if (m) flags.push({ phrase: m[0], reason: r.reason });
      }
    }
    return { ok: flags.length === 0, flags, confirm };
  };
};

export const checkListingCopy = makeListingChecker();
