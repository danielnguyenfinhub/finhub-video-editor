# VI → EN glossary for subtitles and on-screen English

Origin: ported from harness-100 `au/14-translation-localization` (`.claude/agents/terminology-manager.md`: glossary, do-not-translate list, 1:1 term rule; `.claude/skills/translation-quality-mqm/skill.md`: MQM accuracy / fluency / terminology categories). Licence: Apache-2.0, adapted for this repo. No client data.

Use it when typing `subtitles` (edit-json.md) or any English on-screen line. One VI term → one EN wording, every video. The VI column uses the words already in this repo's captions, keywords and copy (`src/mortgage/style.ts` KEYWORDS, `public/videos/*/edit.json`, editing-principles.md §3.1). A new term Daniel uses: add a row, don't improvise.

## Terms

| Vietnamese | English (preferred) | Notes |
|---|---|---|
| lãi suất | interest rate | "rate" alone is fine once the topic is clear |
| lãi suất cố định | fixed rate | |
| lãi suất thả nổi / lãi suất biến đổi | variable rate | not "floating rate" |
| lãi suất so sánh | comparison rate | must sit next to any advertised rate |
| lãi suất cơ bản (RBA) | cash rate | "the RBA cash rate" |
| vay mua nhà | home loan | AU usage; not "mortgage loan" |
| khoản vay | loan | |
| thế chấp | mortgage | the security over the property |
| tiền cọc / tiền đặt cọc | deposit | "10% tiền cọc" → "a 10% deposit" |
| bảo hiểm khoản vay | lenders mortgage insurance (LMI) | protects the lender, not the borrower; never "loan insurance" |
| khả năng mượn / khả năng vay | borrowing capacity / borrowing power | "khả năng mượn" is Daniel's usual word |
| khả năng trả nợ | serviceability | the lender's repayment test |
| tái cấp vốn / refinance | refinance | |
| chi phí chuyển đổi | switching costs | |
| phí phạt | break costs | fixed-rate exit; "penalty" only for other fees |
| tài khoản offset | offset account | |
| redraw | redraw (facility) | |
| trả góp / tiền trả góp | repayments | |
| gốc và lãi | principal and interest | |
| chỉ trả lãi | interest-only | |
| kỳ hạn vay | loan term | |
| người mua nhà lần đầu | first home buyer | |
| trợ cấp người mua nhà lần đầu | First Home Owner Grant (FHOG) | name the state when Daniel does |
| thuế trước bạ | stamp duty | "transfer duty" only if the state's own name is needed |
| phê duyệt trước / pre-approval | pre-approval | conditional, not a promise of a loan |
| phê duyệt | approval | never "guaranteed approval" (RG 234) |
| định giá | valuation | the lender's valuation, not the price |
| giá trị nhà | property value | |
| tỷ lệ vay trên giá trị (LVR) | loan-to-value ratio (LVR) | |
| môi giới / môi giới vay | mortgage broker / broker | |
| ngân hàng | bank | use "lender" when non-banks are included |
| bên cho vay | lender | |
| điểm tín dụng | credit score | |
| giấy lương | payslips | |
| lệ phí / phí | fees | |
| tiền lãi / tiền lời | interest | |
| nhà đầu tư | investor | |
| đấu giá | auction | |
| mua trước bán sau | buy before you sell | |

## Do not translate

Keep these exactly as written, in VI and EN lines alike: AU scheme and product names (Home Guarantee Scheme, First Home Guarantee, First Home Super Saver (FHSS), FHOG, off the plan), regulators and bodies (ASIC, RBA, APRA, ATO, AFCA), rules and licences (Best Interests Duty / BID, ACL, NCCP, RG 234), acronyms (LMI, LVR), lender names (CBA, Westpac, NAB, ANZ, Macquarie and any other) and the brand (Finance Hub, Daniel Nguyen).

## MQM-lite check for each EN line

1. **Accuracy**: same meaning as the VI span, nothing added or dropped; numbers, %, $ and dates identical (vi-VN `4,1` → EN `4.1`).
2. **Terminology**: every term as in the table above; do-not-translate names untouched.
3. **Fluency**: plain Australian English a client would say; no RG 234 phrase ("best rate", "guaranteed approval", "cheapest loan").
4. **Length**: no longer than the VI line says; under ~20 words and 140 characters (preflight warns over 140).

Any line failing 1 or 2 is fixed before render; 3 or 4 is fixed if it is quick.
