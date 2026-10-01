# Recipe: Global RE listing video

Style: `ListingReel` (`src/listing/`). Global RE is a separate business from Finance Hub: its own composition, config (`config/businesses/globalre.json`), guard (`src/listing/compliance.ts`) and folders. Never touch `src/mortgage` for it; importing its helpers is fine.

**Pipeline and commands:** `docs/agents/listing-video.md` (prep → script → check → voice vi and en → stills → render). The skill that runs a listing is `globalre-listing-video`; this team adds the director's brief and the independent checks around it.

**Compliance is not RG 234 here:** NSW property and agency rules in `docs/agents/real-estate-compliance.md` (underquoting, rent, material facts, privacy, testimonials). The estimated selling price is never shown or said. A tenanted property without the tenant's photo consent blocks voicing and rendering. A `TEST` watermark means do not post.

**Independent reviewers:** `video-qc` for stills and render. Compliance review must use the listing rules above: `video-compliance-reviewer` is built for Finance Hub (RG 234); brief it with `real-estate-compliance.md` and `check-listing-compliance.mjs`, and say so in its prompt.
