# Review & tweak page

A local web page for checking a MortgageReel video and making the small calls
yourself, without editing `edit.json` by hand:

- watch the reel exactly as it will render (a `@remotion/player` of the real
  composition, built with the same `buildReel()` as the render);
- pick the **design** and the **colour grade**;
- pick each **chapter transition**;
- **drag** a chapter, stat, cue or B-roll visual along the timeline at the top (one lane
  each, drawn in finished-video time with the cuts removed); its inner beats
  move with it. A dragged block **snaps** to the playhead and to other items'
  edges (hold Alt to skip), and the track scrolls when you hold a drag near its
  edge. Click a block to select it and jump to it; drag the ruler or an empty
  lane to scrub;
- **zoom** the timeline (`−` `+` `100%` `Fit`, Ctrl + wheel toward the pointer,
  Shift + wheel to scroll sideways);
- **undo / redo** every change (Ctrl+Z, Ctrl+Shift+Z), and **Discard changes**
  goes back to the saved file. Unsaved changes are kept in this browser and come
  back after a reload, but only while `edit.json` on disk is exactly what they
  were made against, so an edit made in the chat since is never overwritten;
- drive it from the keyboard (the page lists them under **Shortcuts**): Space
  plays; ← → nudge the selected item 0.5 s (Shift: 1 frame) or, with nothing
  selected, step the playhead 1 frame (Shift: 1 s); Delete removes the selected
  item (Ctrl+Z brings it back); Ctrl+S saves; Home / End jump to the ends;
- **Save** writes `public/videos/<slug>/edit.json`, keeping the previous
  version as `edit.json.bak`; **Render video** then runs
  `scripts/render-video.py <slug>` and shows its progress.

```console
npm run review        # then open http://localhost:4100/
```

Only videos with an `edit.json` whose recording has `source.mp4` and
`words.json` are listed (run `scripts/prep-video.py` first). Every change is checked with the same schema
and RG 234 scan as the render: a change that would fail shows the error and
cannot be saved. Wording (titles, captions, cue text) is not editable here on
purpose; change it with Claude so it gets the full compliance review.

The server (`server.ts`) listens on 127.0.0.1 only, answers only requests whose
Host (and Origin, when sent) is `localhost:4100` or `127.0.0.1:4100` and that a
browser does not mark `Sec-Fetch-Site: cross-site`, so another
web page cannot save or render through it, serves `public/` with HTTP
Range support (a bad range gets 416), and runs one render at a time. `node review/check-shift.mjs`
checks the timing logic, `node review/check-timeline.mjs` the zoom, snap,
ruler, auto-scroll and undo maths (`review/timelineMath.ts`), and
`node review/check-server.mjs` the server's guards (`review/guard.ts`: Host/Origin/Sec-Fetch-Site,
path containment, UTF-8 request body), directly and through the running server
started on a temp `public/` (`REVIEW_PUBLIC`; bad Range headers, a sibling
`public-x` path, a split Vietnamese save).
