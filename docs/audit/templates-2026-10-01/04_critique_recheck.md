# 04 Critique re-check (after the template-improver)

Date 2026-10-01. Source: `git diff` (21 files) and the three `03_improver_report_*.md`. **Not viewed at phone size.** No render was possible, so every "look" below comes from reading the code. Nothing was edited.

Overall: the improver worked from the 02 concept "A" lists, which are mostly golden-rule hygiene. It did not work from the ranked viewer items in the 01 critiques. So most of the critiques' top asks are still open. That was expected for an A-only pass, and it is not a fault of the builds.

## Focus designs

### faceless: landed (partly) / low risk / identity kept
- **Landed:** critique item 2. The cover now measures the title only after the font is ready (`faceless/index.tsx` `useFontReady`). Still open: item 1 (no `preview.png`), item 3 (English line size and balance), item 4 (plain cover).
- **NAVY_GRADIENT:** the backdrop and veil colours moved by at most 4 per channel (#0B2F5E to #08325a, #07172E to #07162f). That is below what anyone can see. Identity (dimmed footage, a veil that closes on every element, big karaoke words) is untouched.
- **Ring colour:** this is the one visible change. The progress ring stroke goes from a saturated sky #7FC4FF to a greyer #91bcda (`Stage.tsx:41, 184`), and the drifting glow goes from rgb(79,163,224) to a greyer #619fc9 at 0.35. The ring still fills light blue and turns amber when complete, so the grammar is kept. Risk: on a phone the in-progress ring may read as a dull or disabled steel blue rather than "live", and the moving glow behind the words gets slightly muddier. This is not an identity change, because the ring is skin, not identity. Daniel should judge whether the less saturated blue still reads as brand.
- Minor: until the font loads the cover title is 0 px. Renders hold the frame anyway; only Studio scrubbing would show a blank flash.

### bigdigit: landed / low risk / identity kept
- Not one of the 01 critique asks (those were unsaid-word contrast, the cover floor, the English line). This fixes a SAFE overrun: at full push the right edge was 991 px and is now 960 px or less. The change cue gets the same fix.
- **Still giant?** Yes. The only effect is scale 1/1.035 (−3.4 %), and only where the width limit binds, which means long numbers. Short numbers keep hitting the 300 px or 150 px cap and do not change. At full push a long number now ends exactly as big as it used to start. White paper, one enormous assembling number and the slow push are all kept.
- Risk that only a still can show: the hollow-outline stroke (size/110, half of it outside the glyph) on the right edge at full push. Its clearance has not been measured.

### kinetic: landed / **RISK (highest in this pass)** / identity kept, but louder
- Not a 01 critique ask (the critique's top item, wipes up to every 0.8 s, is still open). A5 shows the rest of a hooked figure's reading time after the hook as a full `GiantNumber`.
- **Stacking risk (new; read from code):** `hookRest` queues only figures said inside the hook (`kinetic/Stage.tsx` ~511-523). A figure said after frame 105 still starts at its own `fromFrame`. If a hooked figure's rest runs from 105 to about 150 and another figure is said at about 120, two giant numbers are on screen together. That breaks "one thing per moment" and probably rule 1. The builder's synthetic test had all three stats inside the hook, so this case was never exercised.
- **Late and repeated:** with several hooked stats, each rest waits for the one before. In the builder's own synthetic case the third rest starts around frame 206 (about 6.9 s) for a stat said at 1.5 s, which is about 5 s late. The rest also replays the slam and the count-up from zero (`GiantNumber`, t over frames 4-34). The viewer has already seen that number as a chip in the hook, and now watches it count up again, out of sync with the voice. That adds slams to a design the critique already called close to frantic.
- Suggested follow-up (for the improver, not done here): put every figure through one queue, as blueprint now does. Show the rest without the count-up, landing on the final value. Drop a rest if it would start more than about 1.5 s after the figure was said.

### blueprint: landed / risk (sync) / identity kept
- Not a 01 critique ask (those were title-block size, caption size, the half-traced house). `figureQueue` removes every overlap, and no figure is cut short. That is a real gain over the old "clip at the next figure" logic.
- **Sync risk:** the queue has no cap on lateness. On rba-sept-2026 the worst delay is 3.1 s, the same as before (the hook causes it). On a dense synthetic opening it is 9.2 s. A CAD dimension that traces on and counts up 9 s after the number was said reads as a mistake to a viewer. Suggest a cap: past about 1.5 to 2 s of lateness, merge or skip the figure rather than queue it. Auditor to rule (rules 1 and 5b).
- Lender sheets are still scheduled on their own times, outside the queue. Their overlap with a delayed figure sheet has not been checked.

### phoneapp: landed / moderate risk (sync) / identity kept
- Not a 01 critique ask (those were ellipsis truncation, the skeleton feed, phone size). It removes overlapping lane widgets, and a late item now keeps its full length.
- Risk: a third item can wait up to 75 frames (2.5 s) for a lane, so its widget card appears after Daniel has moved on. This is milder than blueprint because widgets are side cards. rba-sept-2026 and faceless-test produce the same plan as before, so no fixture still shows the change. A dense reel is needed to see it.

### datalab: landed (golden part) / low risk / identity kept
- Critique item 3 asked to drop the voice PiP, or keep it only during the hook, because it splits the eye at the number's moment. The improver did the rule-3b part instead: the PiP now sits at x 54-250 and no longer enters FACE. The viewer complaint still stands.
- Shrinking from 200 to 190 px is invisible on a phone (about 5 px). The oscilloscope is 170 in a 190 circle, about the same margin ratio as 180 in 200, so the waveform ends should clip at the circle much as before. The edge at x 250 assumes content-box sizing (190 + 6 border). If a global border-box rule is ever added, the circle simply gets 6 px smaller, which is safe. Unviewed: clearance from a tall caption page growing up from y 1473. The PiP bottom is at 1276, so 197 px is probably enough.

## Other changed designs (brief)
- **ticker:** the cover font guard can change the title size compared with older stills (it is now measured with the real font). Logo is the same pixels. Low risk.
- **checklist:** with no chapters, loose figure and mention cards now render where the screen used to be blank. This is new visible content; the layout at the top of the column is unviewed.
- **timelapse, orbit, scenario, neon:** constants swapped for SAFE or LOGO_HEIGHT, 0 px change. Neon `template.json` text now matches the code, and `minHoldMs` is 1500. Nothing to view.
- **explainer:** `cueRoom` set to false is metadata only. check-golden now reports 43.2 s of face covered by cue panels. That is honest, but the problem is still open until B1 lands.

## Identity changes
None. The closest is faceless, whose ring and glow are greyer (skin, not identity). Kinetic keeps its identity, but its motion density goes up.

## Stills for Daniel (`--scale=0.5`)
1. faceless-test frames 120 and 400: the ring mid-fill (greyer blue) and the backdrop glow. Is it still on brand? Frame 20: cover title size.
2. bigdigit: the hook's last frame (~104) with a long `big`, and a stat figure's last frame. Check the right edge and the hollow stroke against SAFE.right 960, and that the number still feels giant.
3. kinetic: a reel with a stat said in the first 3 s **and** another figure said about 0.5 s after frame 105. Check frames 105-160 for two giant numbers at once, and the count-up replay.
4. blueprint: rba-sept-2026 frames 105, 150, 183 and 260 (the hook hand-off, the old overlap, "2026" now held in full, the next sheet's delay).
5. phoneapp: a dense opening (hook, three stats, two banks), at the frame where the third widget finally lands. Is it still tied to the speech?
6. datalab: ty-do frames 400 and 900 (the PiP beside his shoulder, and the caption clearance).
7. ticker cover, frames 0 and 20. checklist with no chapters, at a figure frame.
