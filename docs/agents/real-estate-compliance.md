# Real estate listing videos: NSW compliance rules

For Global RE Pty Ltd (Cabramatta NSW 2166) sale and rental listing videos: Vietnamese voice, English subtitles, posted to Facebook and TikTok. The code guard is `src/listing/compliance-rules.ts`, and `node scripts/check-listing-compliance.mjs` checks the guard itself.

This is an engineering summary of primary sources so that scripts and on-screen text get written safely. It is not legal advice. Global RE's licensee in charge signs off each ad.

**Sources.** Everything was fetched on **28/09/2026** from the official sites:

| Key | Source | Version read |
|---|---|---|
| PSAA | Property and Stock Agents Act 2002 (NSW), <https://legislation.nsw.gov.au/view/html/inforce/current/act-2002-066> | current version for 29 June 2026 to date |
| PSAR | Property and Stock Agents Regulation 2022 (NSW), <https://legislation.nsw.gov.au/view/html/inforce/current/sl-2022-0501> | current version for 1 July 2025 to date |
| RTA | Residential Tenancies Act 2010 (NSW), <https://legislation.nsw.gov.au/view/html/inforce/current/act-2010-042> | current version for 21 September 2026 to date |
| RTR | Residential Tenancies Regulation 2019 (NSW), <https://legislation.nsw.gov.au/view/html/inforce/current/sl-2019-0629> | current |
| ACL | Competition and Consumer Act 2010 (Cth) Sch 2, <https://www.legislation.gov.au/C2004A00109/latest/text> | compilation dated 16/09/2026, Volume 4 |
| FT-ads | NSW Fair Trading, Advertising guidelines for property agents, <https://www.nsw.gov.au/housing-and-construction/property-professionals/working-as-an-agent/advertising-guidelines> | page as at 28/09/2026 |
| FT-rent | NSW Fair Trading, Advertising and rent bidding on rental properties, <https://www.nsw.gov.au/housing-and-construction/rules/advertising-and-rent-bidding-on-rental-properties> | last updated 19 May 2025 |
| FT-uq | NSW Fair Trading, Underquoting guidance for property professionals, <https://www.nsw.gov.au/housing-and-construction/property-professionals/working-as-an-agent/underquoting-guidance> | last updated 8 July 2026 |
| FT-2026 | NSW Fair Trading, Changes to property and stock agents laws, <https://www.nsw.gov.au/departments-and-agencies/fair-trading/news/changes-to-property-and-stock-agents-laws> | published 8 July 2026 |
| Bill | Residential Tenancies Amendment (Protection of Personal Information) Bill 2025, <https://www.parliament.nsw.gov.au/parliamentary-business/bills/bill-details?billId=18774> | status "Awaiting Assent, Thu 24 September 2026" |
| OAIC | OAIC, Small business, <https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business> | page as at 28/09/2026 |

A Facebook or TikTok post counts as an ad. PSAA s 72(1) defines publishing an ad to include "(e) disseminate the advertisement by a website, email or other electronic communication". The RTA does the same for photos in s 55A(4)(b).

---

## 1. Price: sale ads (underquoting)

**The rule.** An ad must never suggest a price lower than the agent's estimated selling price (ESP) in the agency agreement. "Offers over" and "$x+" are banned outright.

- **PSAA s 72A(1)–(3)**: the agency agreement must include the agent's estimate of the likely selling price. That estimate "may be expressed as a price range, but only if the highest price in the price range exceeds the lowest price by not more than 10 per cent of the lowest price", and it must remain "a reasonable estimate".
- **PSAA s 73(1)**: an agent "must not publish or cause to be published an advertisement in relation to the sale of a residential property that indicates or suggests a selling price for the property that is less than the estimated selling price for the property." Maximum penalty is 200 penalty units.
- **PSAA s 73(2)**: an ad must not include "the phrase 'offers above' or 'offers over' (or similar symbols or words in any language) a specified selling price or price range." The words "in any language" cover the Vietnamese voice-over and captions.
- **PSAA s 73(3)**: if the ESP is revised, the agent must take "all reasonable steps to amend or retract" any ad showing a lower price. **A video that has already been posted is one of those ads.** Take it down or re-render it.
- **PSAA s 72(2)**: when the ESP is a range, a price is "less than" the ESP "if it is lower than the lowest price in the range".
- **PSAA s 73A(1)**: the same ban applies to any statement "in the course of marketing", so it covers what Deric says on camera, not only the on-screen text.
- **FT-uq** says agents must not use "any symbols or words which could underquote or obscure a property's estimated value such as by adding 'plus' to a particular price (for example, $500,000+)". It also says: "Agents can ask potential buyers to contact them for further information. Agents must not indicate any price … less than its estimated selling price." So "Contact agent" with no price is currently allowed.
- **Auctions**: the same rules apply. There is no separate price rule for auction ads in the in-force PSAA. A "price guide" must still be at or above the ESP.
- **ACL s 30(1)(c)**: no false or misleading representation "concerning the price payable for the land".

**What the video may say:** the advertised price, or a price guide whose lowest figure is at or above the ESP, or no price at all ("Liên hệ đại lý / Contact agent"). **It may not say** "offers over/above", "from $", "$x+", "giá khởi điểm", or any figure below the ESP. That includes spoken hints such as "khoảng 850 nghìn" when the ESP is $900k. It also may not say "bargain", "must sell" or "bán gấp", because these suggest the property will sell below its value.

**The pipeline rule:** before any sale video is rendered, Deric supplies the ESP from the signed agency agreement. The advertised price or range must be at or above it. The guard's `priceMin` is the lowest advertised figure.

**Upcoming, not yet in force on 28/09/2026.** The Property and Stock Agents Amendment (Underquoting and Other Agent Conduct) Act 2026 has a second stage that FT-2026 says will start "on a date to be announced, which is currently expected to be towards the end of 2026". When it starts:

- Agents "will need to include a selling price or price range in advertisements for the sale of residential property … including … social media platforms". Once that happens, "Contact agent" with no price will not comply.
- Online ads must include a Statement of Information, or a link to one.
- The advertised price must not be lower than the ESP, a passed-in auction's highest registered bid, or a written offer rejected only because it was too low.
- Ads must be updated or removed "within one business day for online advertisements".
- Penalties rise to "$110,000, or three times the agent's commission".

The in-force s 73 (29 June 2026 version) contains none of these rules yet. **Re-check the commencement date before every run.**

## 2. Price: rental ads, rent bidding and pets

- **RTA s 22A(1)**: a landlord or agent "must not advertise or otherwise offer residential premises for rent unless a fixed amount of rent for the premises is stated in the advertisement or offer." A sign on the property may leave out the rent (s 22A(2)), but a video may not.
- **RTA s 22A(3)**: "A person must not solicit or otherwise invite an offer of an amount of rent for residential premises, whether directly or indirectly, that is higher than the advertised amount of rent". The maximum penalty is 50 penalty units for an individual and 100 otherwise.
- **FT-rent** says properties "cannot be advertised with a price range (for example: $500 - $550), or with text like 'offers from' or 'by negotiation'". It also says a "make an offer" button "would not comply", while "make an application" complies. "$800 per week, deposit taken" and "leased" comply.
- **RTA s 73H**: an ad "must not advertise … that a tenant's animal will not be permitted to be kept at the residential premises" (20 penalty units). FT-rent says to state facts instead, such as "the yard not being fenced".

**What the video may say:** "$650 per week" / "$650 mỗi tuần", once, with the same figure everywhere. **It may not say** a range, "negotiable", "open to offers", "make an offer", "trả giá", "ai trả cao hơn", "no pets" or "không nuôi thú cưng".

## 3. False or misleading claims (both kinds of ad)

- **ACL s 18(1)**: "A person must not, in trade or commerce, engage in conduct that is misleading or deceptive or is likely to mislead or deceive."
- **ACL s 30(1)**: for land, no false or misleading representation about "(c) … the price payable", "(d) … the location of the land", "(e) … the characteristics of the land", "(f) … the use to which the land is capable of being put or may lawfully be put" or "(g) … the existence or availability of facilities associated with the land".
- **ACL s 4(1)**: a representation about "any future matter" made without "reasonable grounds" is "taken … to be misleading". Under s 4(2), the burden is on the maker to show evidence of those grounds. That covers "chắc chắn tăng giá", growth forecasts, and "rent will cover the mortgage".
- **PSAA s 52(1)(a)**: a licensee must not induce a contract by a statement "that is false, misleading or deceptive (whether to the knowledge of the agent or not)". The maximum penalty is 1,000 penalty units. Under s 52(3), the defence requires the agent to have had "no reasonable cause to suspect".
- **RTA s 26(1)**: the rental equivalent, for statements the landlord or agent "knows to be false, misleading or deceptive".

What to substantiate, and with what:

| Claim | What makes it safe |
|---|---|
| "Walk to station", "close to shops", "gần ga" | A measured distance. FT-ads says "'2 km to beach' is preferable to 'close to beach'" and "'village shops within 3 km' is preferable to 'within walking distance of shops'". Use Google Maps metres or km. |
| "Quiet street", "yên tĩnh" | Avoid it; it is hard to prove. Say what is true instead, such as "cul-de-sac" or "no through road". |
| Land and floor sizes | The title, survey or strata plan. Say which area it is: land, internal or total. |
| "Brand new", "mới xây" | The occupation certificate date. "Renovated" needs what was done and when, confirmed by the vendor. |
| Views | Only if they can be seen from the property. FT-ads: do not "zoom in on a photograph of a view from the property to make that view appear closer". |
| "DA approved", granny flat or dual-occupancy potential | The council approval or certificate, and its date (s 30(1)(f)). |
| Rental yield or growth | The current lease rent and the advertised price, dated, as a fact. Never a forecast or a promise (s 4). |

### Photos, video and digitally altered images

**FT-ads** says agents must not:

- "modify or allow photographs of properties to be modified so that the images no longer truthfully and fairly represent that property";
- "change the appearance of a property by digitally removing or adding features (adjusting the lighting effects only to compensate for poor lighting may be acceptable)";
- "zoom in on a photograph of a view … to make that view appear closer".

A photo not taken on the property but within the immediate area "should have printed on the photograph 'location shot'".

- **Virtual staging and AI edits:** no NSW statute in force on 28/09/2026 creates a specific disclosure rule for these. The general bans (ACL s 18 and s 30(1)(e), PSAA s 52, FT-ads) still apply. **Pipeline rule:** label any virtually staged, sky-replaced or AI-altered frame on screen: "Hình ảnh dàn dựng ảo / Virtually staged". Never remove defects, wires, neighbouring buildings or stains, and never add features.
- **Rental ads, upcoming:** the Bill inserts RTA s 22B(2) (second print). An agent "must not include in an advertisement … digitally generated or altered images that would be reasonably likely to mislead or deceive a person unless … the fact the images are digitally generated or altered" is stated. The maximum penalty would be 50 penalty units for an individual and 200 otherwise. The Bill's status is "Awaiting Assent, Thu 24 September 2026", and its commencement clause is "on a day or days to be appointed by proclamation". **It is not in force on 28/09/2026.** Our labelling rule already meets it.

## 4. Material facts

- **PSAA s 52(1)(b)** bans inducing a contract by "any failure to disclose a material fact of a kind prescribed by the regulations … that the agent knows or ought reasonably to know".
- **PSAR s 60(1)** lists these material facts:
  - flooding "from a natural weather event or bush fire" within the last 5 years;
  - "significant health or safety risks";
  - listing on the loose-fill asbestos register;
  - murder or manslaughter within the last 5 years;
  - drug manufacture, cultivation or supply within the last 2 years;
  - external combustible cladding orders or applications;
  - building work rectification, prohibition or stop work orders under the Residential Apartment Buildings (Compliance and Enforcement Powers) Act 2020.
- **Rentals**, RTA s 26(1) with RTR cl 8(1): a similar list that adds council waste services, parking permit ineligibility, shared driveways, and scheduled strata major works.

**How this affects a video.** The law does not require an ad to recite these facts. Disclosure happens before a contract or tenancy is entered into. But an ad must not contradict them. "Never flooded", "flood-free" or "an toàn tuyệt đối" on a property with a known flood history is a false statement under s 52(1)(a) or ACL s 30. **Pipeline rule:** ask Deric "any s 60 / cl 8 material facts?" at intake. If the answer is yes, the script avoids every claim that touches that fact.

## 5. What every ad must contain

| Item | Required? | Source |
|---|---|---|
| The licensee's name: the corporation name, or its registered business name | **Required.** PSAA s 50(1)(d)/(e): a corporation licensee's ad must include "the name of the corporation" or "that business name". | PSAA s 50 |
| A disclosure if the agent, a director or the agency owns the property | **Required** when it applies (s 50(2)–(3)) | PSAA s 50 |
| A fixed weekly rent (rental ads) | **Required** | RTA s 22A(1) |
| The licence number, the agent's name, phone | Not required in ads. PSAR asks for licence numbers only in agency agreements and bidders records. Good practice. | PSAR Sch 1 cl 3, s 14 |
| A price or price range (sale ads) | Not yet required. It becomes required when stage 2 of the 2026 Amendment Act starts. | FT-2026 |
| A "location shot" label on off-property footage | Fair Trading guidance, and in practice necessary to avoid s 30(1)(d) | FT-ads |
| A disclaimer | Good practice only. **A disclaimer does not cure a misleading claim.** FT-ads: "Agents cannot avoid liability simply by claiming that the buyer or consumer should have made reasonable enquiries". | FT-ads |

**Recommended end card.** It is stored in code as `AGENCY_LINE`, `LISTING_DISCLAIMER_EN` and `LISTING_DISCLAIMER_VI`. Only the agency name is legally required. The rest is good practice. Confirm the exact registered name with Deric.

> **Global RE Pty Ltd · Cabramatta NSW 2166** · Deric (Truong Sanh Ly) · [phone]
>
> EN: Information is from the vendor and other sources we believe are reliable, but we have not independently verified it. Buyers and renters should make their own enquiries. Location shots and any digitally altered or virtually staged images are labelled.
>
> VI: Thông tin do chủ nhà và các nguồn chúng tôi tin là đáng tin cậy cung cấp, nhưng chưa được kiểm chứng độc lập. Người mua và người thuê nên tự tìm hiểu trước khi quyết định. Ảnh khu vực xung quanh và mọi hình ảnh đã chỉnh sửa kỹ thuật số hoặc dàn dựng ảo đều được ghi chú.

The wording deliberately avoids "guarantee" and "đảm bảo", so the guard's own words do not trip it.

## 6. Privacy: address, interiors, tenants, people, number plates

- **Tenant-occupied property: interiors and exteriors.**
  - RTA s 55AA(1): no photos or video "if … the photos or recordings will be published" unless the tenant was given "at least 7 days notice" and "a reasonable opportunity to move possessions". The maximum penalty is 50 penalty units.
  - RTA s 55A(1A): if the tenant's possessions are still visible, the agent must give the tenant "a copy … free of charge" and get "written consent to the publication". Under s 55A(1B), consent can only be sought within 3 weeks before the first advertisement. Under s 55A(1C), silence for 7 days counts as refusal. Under s 55A(3), a tenant may refuse where there is a domestic abuse risk.
  - FT-ads confirms these rules apply "From 21 September 2026", including belongings seen "in outdoor areas or through windows".
  - **Pipeline rule:** for any tenanted property, record the notice date and the written consent before rendering. Otherwise frame out or blur every personal item.
- **The full address:** no NSW rule found that bans showing it. It is normal for sale ads, and the vendor authorises it in the agency agreement. For rentals where the tenant has raised a domestic abuse concern, leave out the street number and show no exterior. That is good practice, in line with the protective intent of RTA s 55A(3).
- **People and number plates:** no NSW statute found that bans filming them in public. As good practice, blur faces of non-consenting people, house numbers of neighbouring properties, and number plates. Never show mail, documents, family photos or screens. Real client names and figures must never appear in the repo (AGENTS.md; this repo is public).
- **Privacy Act 1988 (Cth):** OAIC says "A small business is one with an annual turnover of $3 million or less" and is generally exempt. The exceptions include "trading in personal information" and entities with AML/CTF obligations. Real estate agents became AML/CTF reporting entities from 1 July 2026 (AUSTRAC). **UNVERIFIED:** how far that brings Global RE's marketing under the Privacy Act. Treat identifiable personal information in footage as if the Privacy Act applies.

## 7. Testimonials, awards, "top agent"

- **ACL s 29(1)**, about the agent's *services*: no false or misleading representation that "(b) services are of a particular standard, quality, value or grade", "(e) … purports to be a testimonial", "(f) … concerning … a testimonial", "(g) … sponsorship, approval, performance characteristics…" or "(h) … that the person making the representation has a sponsorship, approval or affiliation". **ACL s 30(1)(a)** has the same rule for land ("sponsorship, approval or affiliation").
- No NSW-specific rule on agent awards was found in the PSAA, the PSAR or the Fair Trading pages read.
- **Pipeline rule:**
  - An award must be real and current, and must name the awarding body and year ("REINSW Awards 2025 – Finalist").
  - A testimonial must be a real client's own words, unedited in meaning, with written consent, and never invented or composited.
  - "Top agent", "#1", "5 sao" or "record price" need a named, dated source ("Highest sale price in Cabramatta for 3-bed houses, 2025, per [data source]"). Without one, cut the claim.

---

## Do / Don't: scripts and on-screen text

| Topic | Don't (VI / EN) | Do (VI / EN) | Why |
|---|---|---|---|
| Sale price | "Giá trên $850k" / "Offers over $850k", "$850k+" | "Giá dự kiến $900.000 – $950.000" / "Price guide $900,000 – $950,000" (lowest at or above the ESP) | PSAA s 73(1)–(2) |
| Sale price | "Chủ cần bán gấp, giá hời" / "Must sell, bargain" | "Chủ nhà đã sẵn sàng bán" / "Vendor is ready to sell" (only if true) | s 73(1) and s 73A: suggests a lower price |
| Sale price | A spoken figure below the ESP ("khoảng 850") | The same figures as on screen, or "Liên hệ Deric để biết giá" / "Contact Deric for the price guide" | s 73A covers speech |
| Rent | "$620–$680/tuần, thương lượng" / "Offers invited" | "$650 mỗi tuần" / "$650 per week" | RTA s 22A |
| Rent | "Ai trả cao hơn được ưu tiên" / "Make an offer" | "Nộp đơn thuê ngay" / "Apply now" | RTA s 22A(3); FT-rent |
| Pets | "Không nuôi thú cưng" / "No pets" | "Sân chưa có hàng rào" / "Yard is not fenced" | RTA s 73H |
| Growth | "Chắc chắn tăng giá" / "Guaranteed growth" | Nothing, or a dated past fact with its source | ACL s 4 |
| Returns | "Lợi nhuận 8%/năm" / "8% yield" | "Đang cho thuê $650/tuần đến 03/2027" / "Leased at $650 pw until 03/2027" | ACL s 4, s 30 |
| Superlatives | "Nhà đẹp nhất, rẻ nhất khu" / "Best, cheapest in the area" | The specific fact: "Đất 556 m² (theo sổ đỏ)" / "556 m² block (per title)" | ACL s 30(1)(c),(e) |
| Location | "Đi bộ vài phút ra ga" / "Walk to station" | "Cách ga Cabramatta 650 m" / "650 m to Cabramatta station" | FT-ads; ACL s 30(1)(d) |
| Condition | "Mới toanh, yên tĩnh" / "Brand new, quiet street" | "Xây năm 2024 (OC tháng 3/2024)" / "Built 2024 (OC March 2024)", "Đường cụt" / "Cul-de-sac" | ACL s 30(1)(e) |
| Views | A zoomed or off-site view shown as the property's own | A view only if it is seen from the property; off-site shots labelled "Ảnh khu vực / Location shot" | FT-ads |
| Edited images | Removing cracks or wires, adding furniture without saying so | Lighting correction only, or a "Hình ảnh dàn dựng ảo / Virtually staged" label | FT-ads; ACL s 18; Bill s 22B |
| Material facts | "Không bao giờ ngập" / "Never flooded" (unchecked) | No claim touching flood, fire, crime or cladding unless Deric has confirmed the s 60 answers | PSAA s 52; PSAR s 60 |
| Agent | "Môi giới số 1 Cabramatta" / "Top agent" | "Chung kết Giải REINSW 2025" / "REINSW Awards 2025 Finalist" (if real) | ACL s 29(1)(b),(e)–(h) |
| Tenanted homes | Filming belongings without notice or consent | 7 days' notice, then consent in writing, or belongings removed or blurred | RTA ss 55AA, 55A |
| Identity | No agency name | "Global RE Pty Ltd" on the end card | PSAA s 50(1) |

## Using the guard

```ts
import { assertListingCopy } from "../listing/compliance-rules";
assertListingCopy(
  { title_vi, title_en, captions_vi, captions_en },
  { mode: "sale", priceMin: 900_000 },        // lease: { mode: "lease", rentPerWeek: 650 }
  [{ field: "captions_en", rule: "vague-location-en", reason: "substantiated",
     note: "650 m to Cabramatta station, Google Maps 28/09/2026" }],
);
```

- **`block` hits** (offers over, price below advertised, guarantees, rent bidding, rent mismatch, no pets) are cleared only by `negation`. For example, "không có gì là chắc chắn tăng giá" says the thing is *not* so.
- **`flag` hits** clear with `substantiated`, `context` or `negation`, and a note naming the evidence.
- The guard can see words and dollar figures. It cannot see photos, the ESP document, tenant consent or material facts. Those are checklist items at intake: the ESP, s 60 / cl 8 facts, tenancy status and consent, edited images, and the award source.

## UNVERIFIED / open

- **Stage 2 of the PSA Amendment (Underquoting and Other Agent Conduct) Act 2026:** the start date for the mandatory price in ads and the Statement of Information is not announced. FT-2026 says "expected … towards the end of 2026". Re-check before each run.
- **The Residential Tenancies Amendment (Protection of Personal Information) Bill 2025:** its final text after the agreed amendments, and its assent and commencement dates, were not verified. The s 22B wording quoted above is from the second print.
- **Penalty unit value:** not fetched. FT-uq's "$22,000" for the 200-unit s 73 offence implies $110 per unit.
- **Global RE's licence:** whether Global RE Pty Ltd holds the corporation licence and trades under a registered business name, which fixes the exact s 50 wording, is not checked. Confirm on the NSW licence register.
- **Privacy Act coverage** through AML/CTF reporting-entity status: its scope is not verified.
- **Awards and testimonials:** no NSW-specific rule was found. The ACL s 29 reading is an interpretation, not a quoted rule on agent awards.
