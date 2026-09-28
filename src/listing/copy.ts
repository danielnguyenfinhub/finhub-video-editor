// Every fixed on-screen string of ListingReel, in one place so
// scripts/listing-compliance.mjs can run each through checkListingCopy.
// Vietnamese first, English second (AGENTS.md "Language").
import business from "../../config/businesses/globalre.json";
import {
  LISTING_DISCLAIMER_EN,
  LISTING_DISCLAIMER_VI,
} from "./compliance-rules";

export const BUSINESS = business;
export type Agent = (typeof business.agents)[keyof typeof business.agents];

export const COPY = {
  presents: { vi: "Global RE giới thiệu", en: "Global RE presents" },
  teaser: { vi: "Địa chỉ đầy đủ ở cuối video", en: "Full address at the end" },
  facts: { vi: "Thông tin chính", en: "Key facts" },
  bedrooms: { vi: "Phòng ngủ", en: "Beds" },
  bathrooms: { vi: "Phòng tắm", en: "Baths" },
  carSpaces: { vi: "Chỗ đậu xe", en: "Cars" },
  land: { vi: "Đất", en: "Land" },
  internal: { vi: "Trong nhà", en: "Internal" },
  priceSale: { vi: "Giá", en: "Price" },
  priceRent: { vi: "Giá thuê", en: "Rent" },
  auction: { vi: "Đấu giá", en: "Auction" },
  openHome: { vi: "Giờ xem nhà", en: "Open home" },
  available: { vi: "Dọn vào từ", en: "Available from" },
  location: { vi: "Vị trí", en: "Location" },
  distances: { vi: "Khoảng cách", en: "Distances" },
  address: { vi: "Địa chỉ", en: "Address" },
  contact: { vi: "Liên hệ", en: "Contact" },
  callNow: { vi: "Gọi ngay", en: "Call now" },
  licensee: { vi: "Người giữ giấy phép", en: "Licensee" },
  edited: { vi: "Hình ảnh dàn dựng ảo", en: "Virtually staged" }, // docs/agents/real-estate-compliance.md
  materialFacts: { vi: "Thông tin cần biết", en: "Material facts" },
} as const;

// The end-card wording from the listing compliance rules
// (docs/agents/real-estate-compliance.md). The agency name the law requires
// on every ad (PSAA s 50(1)) is BUSINESS.legalName, on DisclaimerCard.
export const DISCLAIMER = {
  vi: LISTING_DISCLAIMER_VI,
  en: LISTING_DISCLAIMER_EN,
};

// "Lic. 20161359" (agent card and disclaimer card).
export const licenceLine = (agent: Agent) => `Lic. ${agent.licence.number}`;

// Every string above, for the compliance run.
export const fixedStrings = (): string[] => [
  ...Object.values(COPY).flatMap((c) => [c.vi, c.en]),
  DISCLAIMER.vi,
  DISCLAIMER.en,
];
