# Writing a Global RE listing script (listing.json + photos → script.json)

`public/listings/<slug>/script.json`, checked by `src/listing/schema.ts` and the listing
compliance guard. One file serves both videos: `vi` is voiced in the Vietnamese version,
`en` in the English one, and each is the other's subtitle.

## Shape

```json
{
  "title": "100 Derria Street, Canley Heights",
  "scenes": [
    { "id": "intro", "photo": "01.jpg", "kind": "intro", "vi": "...", "en": "...",
      "highlight": "Duplex 4 phòng ngủ tại Canley Heights / 4-bedroom duplex in Canley Heights" },
    { "id": "kitchen", "photo": "04.jpg", "kind": "photo", "vi": "...", "en": "...",
      "focus": { "x": 0.22, "y": 0.63 }, "highlight": "Mặt bếp đá / Stone benchtops" },
    { "id": "facts", "photo": null, "kind": "facts", "vi": "...", "en": "..." }
  ],
  "post": { "title": "...", "caption": "<VI>", "captionEn": "<EN>", "hashtags": ["#globalre", "#<suburb>", "..."] }
}
```

- `kind`, in Daniel's order: `intro` → `photo` × N → `facts` → `price` → `location` →
  `address` → `agent` → `disclaimer`.
- `id` of a photo scene names the room; it sets the room chip and tour icon
  (`src/listing/rooms.ts`): `front`, `living`, `dining`, `kitchen`, `bedroom-1`, `bathroom-2`,
  `laundry`, `alfresco`, `garage`, `robe`, `floorplan` …
- `focus` (0–1 in the photo) is where the camera pushes in and the callout points: the
  feature the line talks about, not the middle of the room.
- `highlight` is a short bilingual label, "Vietnamese / English", under 30 characters a side.
  The floor plan gets none.

## Feature → benefit → feeling (Daniel, 28/09/2026)

Daniel: "add emotions to get people related. And what each of those features give them."
Every photo scene has three beats, in one or two short sentences:

- **Feature**: what the photo shows or listing.txt states. Must be true, as always.
- **Benefit**: what it gives the buyer in daily life. For example: stone island → cook while
  the kids do homework beside you; windows on two walls → wake up to natural light; walk-in
  robe → everything in its place, calmer mornings; separate laundry → chores out of sight;
  covered alfresco → weekend barbecues, rain or shine; 3 bathrooms → no morning queue; two
  levels → room to be together and apart.
- **Feeling**: a short, specific moment in the second person, for Vietnamese-Australian
  families. Use "Hãy hình dung…" or "Bạn có thể…", and moments such as grandparents and
  grandkids, hosting relatives, kids' homework, Tết at home, weekends. Never generic
  ("tuyệt vời", "đẳng cấp").

Compliance stays hard, and the guard wins over emotion. Benefits are possibilities and
moments ("có thể", "hãy hình dung"), never promises or outcomes. Never "chắc chắn", growth,
investment or returns, school catchments, distances not in listing.txt, superlatives, or
orientation ("morning sun" needs a known aspect: say "natural light").

## The lines

1. **Intro**: open on the emotion or aspiration, not a spec list: "Hôm nay Global RE giới
   thiệu một ngôi nhà mới, nơi cả gia đình bắt đầu chương mới, tại <suburb>." The specs
   go in the hook card (`highlight`). Give the **suburb only**, never the street or number.
   Blur a readable house number (`blur`, see below).
2. **Tour**: pick the strongest 10–11 photos, plus the floor plan, in walking order: front →
   living → kitchen → dining → outdoor → laundry → bedrooms → robe → bathrooms → floor plan.
   Merge or drop weaker, duplicate or restaged rooms, and say which in the report. Each line
   is feature → benefit → feeling, 12–20 Vietnamese words: the voice sets each photo's
   time, so a long line holds a photo too long.
3. **Floor plan**: the layout as a benefit ("Hai tầng: có chỗ để cả nhà ở bên nhau, và góc
   riêng cho mỗi người").
4. **Facts**: the counts, and features that aren't pictured (air conditioning, alarm).
   Numbers are written as spoken ("bốn phòng ngủ"). No areas in the voice: the card shows
   the agent's figure.
5. **Price**: exactly the listing's price text, said plainly. Add open homes or the auction
   if listing.txt gives them.
6. **Location + closing feeling**: the suburb, only the agent's "Nearby" items (measured),
   then a one-line feeling summary: "Tại <suburb>, đây có thể là ngôi nhà để cả nhà cùng
   lớn lên bên nhau."
7. **Address**: the full address, with numbers spoken ("một trăm Derria Street").
8. **Agent**: "hãy gọi ngay cho <first name> của Global RE, số điện thoại ở trên màn
   hình". Never read the phone number aloud: Gemini refuses lines with phone digits, and
   the agent card shows the number.
9. **Disclaimer**: one short line saying the information is a guide. Add "images may be
   virtually staged" when any photo is marked edited.

Aim for the whole video at 90–100 s or less.

`blur` (optional, per scene): areas of the photo, 0–1, to blur, e.g. `[{"x":0.575,"y":0.78,
"w":0.085,"h":0.2}]` over a letterbox number that would give the address away before the
reveal. Use it on every scene before the address that shows the number.

**English line:** natural spoken ad copy with the same benefit and feeling, ≤ 20 words.
Adapt it, don't translate literally ("cook the Tết feast while the kids do homework right
beside you"). It is also the subtitle in the Vietnamese version.

**Post:** title ≤ 60 characters (it names the files); caption VI and captionEn, 1–3 sentences
each, leading with the feeling and ending with one call to action; exactly 7 hashtags including `#globalre` and the suburb
(`#canleyheights`). The contact block and legal footer are added by the publish step.
