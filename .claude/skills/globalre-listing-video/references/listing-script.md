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

## The lines

1. **Intro** — "Hôm nay Global RE giới thiệu …" + one hook fact from listing.txt (bedrooms,
   type, a standout feature) + the **suburb only**. Never the street or number.
2. **Tour** — one scene per photo, in walking order: front → entry/living → kitchen → dining →
   other living → outdoor → laundry → bedrooms → bathrooms → garage → floor plan. Each line
   says what the photo shows and, where it fits, a key feature from listing.txt. 8–14 words
   Vietnamese, one idea. Skip a photo that repeats a room or shows a room the plan doesn't have
   (say so in the report).
3. **Facts** — the counts and features that aren't pictured (air conditioning, alarm).
   Numbers written as spoken in Vietnamese ("bốn phòng ngủ"). No areas in the voice: the card
   shows the agent's figure.
4. **Price** — exactly the listing's price text, said plainly; open homes or auction if given.
5. **Location** — the suburb, plus only the agent's "Nearby" items with their measured
   distances. None given: just the suburb.
6. **Address** — the full address, numbers spoken ("một trăm Derria Street").
7. **Agent** — "hãy gọi ngay cho <first name> của Global RE, số điện thoại ở trên màn hình". Never read the phone number: Gemini refuses lines with phone digits; the agent card shows it.
8. **Disclaimer** — one short line: information is a guide; say "images may be virtually
   staged" when any photo is marked edited.

**Tone:** warm, confident advertising. Words the guard blocks or flags: superlatives
(tốt nhất, đẹp nhất, số một, best), vague distance (đi bộ, gần, sát bên, ngay cạnh, walk to,
close to, nearby), condition claims not in the key features (mới xây, renovated, views),
pressure (won't last), money other than the price. "Brand new" only when the key features say
so; it is then listed for the agent to confirm.

**English line:** natural spoken ad copy, ≤ 20 words, faithful to the Vietnamese ("call Deric
at Global RE on the number on your screen").

**Post:** title ≤ 60 characters (it names the files); caption VI and captionEn, 1–3 sentences
each, ending with one call to action; exactly 7 hashtags including `#globalre` and the suburb
(`#canleyheights`). The contact block and legal footer are added by the publish step.
