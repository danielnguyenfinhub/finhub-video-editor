// edit.json: the ONE per-video file of editorial choices for MortgageReel.
// All times are SOURCE milliseconds (the words.json clock); the timeline remaps
// them onto the cut, paced output. Validated with zod strict objects so a typo
// ("atMS") fails the render with its path instead of silently dropping a cue.
import { z } from "zod";
import { TRANSITIONS, toOutMs, type Timeline } from "./timeline";

const ms = z.number().nonnegative();
const text = z.string().min(1);
const tone = z.enum(["good", "bad", "neutral"]);
const beat = z.strictObject({ text, atMs: ms });
const span = { fromMs: ms, toMs: ms };

const kinetic = z.strictObject({
  kind: z.literal("kinetic"),
  ...span,
  kicker: text.optional(),
  struck: z.array(z.strictObject({ text, atMs: ms, strikeMs: ms })).min(1),
  slam: z.strictObject({ kicker: text.optional(), text, atMs: ms }),
  sub: beat.optional(),
});

const compareCard = z.strictObject({
  title: text,
  atMs: ms,
  highlightAtMs: ms.optional(),
  rows: z.array(z.strictObject({ label: text, value: text, tone, atMs: ms })),
});

const compare = z.strictObject({
  kind: z.literal("compare"),
  ...span,
  cards: z.tuple([compareCard, compareCard]),
  vsAtMs: ms.optional(),
  question: beat.optional(),
});

const bars = z.strictObject({
  kind: z.literal("bars"),
  ...span,
  kicker: text.optional(),
  title: text,
  bars: z
    .array(
      z.strictObject({
        label: text,
        value: text,
        height: z.number().min(0).max(1),
        tone,
        atMs: ms,
        // The bar breaks through the top of the chart (a value off the scale).
        overflow: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(3),
  stamp: z.strictObject({ text, tone, atMs: ms }).optional(),
});

const verdict = z.strictObject({
  kind: z.literal("verdict"),
  ...span,
  ok: z.boolean(),
  text,
});

const venn = z.strictObject({
  kind: z.literal("venn"),
  ...span,
  left: text,
  right: text,
  label: text,
});

const emoji = z.strictObject({
  kind: z.literal("emoji"),
  ...span,
  name: text, // a file in public/emoji/, without ".json"
  position: z.enum(["right", "left"]).optional(),
});

const lenders = z.strictObject({
  kind: z.literal("lenders"),
  ...span,
  title: text.optional(),
});

// Key points, numbered, each revealed as it is said.
const points = z.strictObject({
  kind: z.literal("points"),
  ...span,
  title: text,
  items: z.array(beat).min(2).max(5),
});

// Numbers kit. What kind of rate a figure is: a value with "%" must say, and
// "advertised" needs compliance.advertisedRate (checked on editSchema).
const rateType = z.enum(["cash", "advertised", "other"]);
const RATE_TYPE_NEEDED =
  'a figure with "%" needs rateType: "cash" (RBA cash rate), "advertised" (a lender\'s rate; needs compliance.advertisedRate) or "other"';

// Old value -> new value (a rate cut, a repayment drop). Values are strings so
// Vietnamese formats ("5,89%") render untouched; the design picks the motion.
const change = z
  .strictObject({
    kind: z.literal("change"),
    ...span,
    kicker: text.optional(),
    label: text, // what changed
    from: text,
    to: text,
    swapAtMs: ms,
    direction: z.enum(["up", "down"]).optional(),
    tone: tone.optional(),
    rateType: rateType.optional(),
  })
  .refine((c) => c.swapAtMs >= c.fromMs && c.swapAtMs <= c.toMs, {
    message: "swapAtMs must fall between fromMs and toMs",
    path: ["swapAtMs"],
  })
  .refine((c) => c.rateType !== undefined || !`${c.from}${c.to}`.includes("%"), {
    message: RATE_TYPE_NEEDED,
    path: ["rateType"],
  });

// A value over time (the cash-rate path), drawn by src/elements/LineGraph.tsx.
const trend = z
  .strictObject({
    kind: z.literal("trend"),
    ...span,
    kicker: text.optional(),
    title: text,
    unit: text.optional(),
    decimals: z.number().int().min(0).max(3).optional(),
    points: z
      .array(z.strictObject({ label: text, value: z.number() }))
      .min(2)
      .max(8),
    rateType: rateType.optional(),
  })
  .refine((c) => c.rateType !== undefined || c.unit !== "%", {
    message: RATE_TYPE_NEEDED,
    path: ["rateType"],
  });

const cue = z
  .discriminatedUnion("kind", [
    kinetic,
    compare,
    bars,
    verdict,
    venn,
    emoji,
    lenders,
    points,
    change,
    trend,
  ])
  .refine((c) => c.toMs > c.fromMs, "cue toMs must be after fromMs");

// B-roll from the source library over the talk, drawn by the core so every
// design gets it (Visuals.tsx). cutaway: full frame, Daniel hidden; pip: full
// frame with Daniel small in a corner; overlay: an image card beside him.
// asset is a file under public/library/, or {find} keywords that
// `node scripts/library.mjs resolve <slug>` rewrites to one before rendering.
export const VISUAL_MODES = ["cutaway", "pip", "overlay"] as const;
const libraryPath = z
  .string()
  .regex(
    /^library\/([a-z0-9_-]+\/)*[a-z0-9_-]+\.[a-z0-9]+$/,
    'a file under public/library/, e.g. "library/stock-video/house__pexels__1a2b3c4d.mp4" (lowercase, no "..")',
  );
const visual = z.strictObject({
  mode: z.enum(VISUAL_MODES),
  atMs: ms,
  durMs: z.number().positive(), // output ms, like stats
  asset: z.union([libraryPath, z.strictObject({ find: text })]),
});
export type Visual = z.infer<typeof visual>;

const exemption = z.strictObject({
  field: text,
  term: text,
  reason: z.enum(["definition", "quoted", "negation", "third-party-name"]),
  note: text,
});

const rate = z.number().min(0.5).max(2);

// Colour grades for the talking-head footage; recipes in MortgageReel.tsx.
export const LOOKS = ["warm", "cinematic", "mono"] as const;
export type Look = (typeof LOOKS)[number];

export const editSchema = z.strictObject({
  // Not shown anywhere: why a span was removed, what the video is about, etc.
  notes: z.array(z.string()).optional(),
  // The recording this video edits: public/recordings/<source>/ holds its
  // source.mp4, foreground.webm and words.json. Absent: they sit in
  // public/videos/<slug>/ (unmigrated and faceless videos).
  source: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "a kebab-case recording id")
    .optional(),
  // The look of the video: a folder in src/designs/ (default "classic").
  design: text.optional(),
  title: text,
  subtitle: text.optional(),
  coverFrameMs: ms.optional(),
  hook: z
    .strictObject({
      big: text,
      countTo: z.number().optional(),
      decimals: z.number().int().min(0).max(3).optional(),
      suffix: text.optional(),
      sub: text.optional(),
    })
    .optional(),
  remove: z.array(z.tuple([ms, ms])).optional(),
  // Automatic cuts, each on unless set to false: hesitation sounds (ờ, ừm, …),
  // stutters (the first of a word or phrase said twice in a row, within a
  // sentence) and swear words. `words` adds more words or phrases to always cut. Restarts in
  // different words still need a `remove` span.
  cut: z
    .strictObject({
      fillers: z.boolean().optional(),
      stutters: z.boolean().optional(),
      badWords: z.boolean().optional(),
      words: z.array(text).optional(),
    })
    .optional(),
  // Background music from public/, e.g. "music/calm-piano.mp3", looped under
  // the whole video. volume (default 0.3) is its level on the cover, in pauses
  // and on the end cards; it dips automatically while Daniel talks. startMs
  // skips the track's quiet intro (node scripts/music-start.mjs <file> finds it).
  music: z
    .strictObject({
      file: text,
      volume: z.number().min(0).max(1).optional(),
      startMs: z.number().int().min(0).optional(),
    })
    .optional(),
  // Colour grade on the talking-head footage (not the cover or end cards).
  // Left out, the footage plays as recorded.
  look: z.enum(LOOKS).optional(),
  // The room behind Daniel is always replaced (golden rule, 25/09/2026): every
  // video needs foreground.webm next to source.mp4 (made once with
  // review/matte.html); the render stops with instructions if it is missing.
  // Absent or "brand" (old edit.json files) is that rule. Two per-video
  // exceptions, both Daniel's opt-in, need no cut-out and no matting:
  // "vignette" is quick mode: the full frame plays with its edges faded to
  // black (PacedVideo.tsx) and Behind layers draw on top.
  // "room" (27/09/2026): his real room, laid out by the design; it needs a
  // design whose Cover and Talk handle an undefined `foreground` (kitchen,
  // editorial).
  background: z.enum(["brand", "vignette", "room"]).optional(),
  // A fix swaps that word everywhere, or, with atMs (the word's startMs in
  // words.json, ±300 ms), only there; with atMs, "to" may be "" to hide a
  // misheard extra word ("trả lời" → "tính" + "").
  captionFixes: z
    .array(
      z
        .strictObject({ from: text, to: z.string(), atMs: z.number().optional() })
        .refine((f) => f.to !== "" || f.atMs !== undefined, {
          message: 'an empty "to" needs "atMs"',
        }),
    )
    .optional(),
  keywords: z.array(text).optional(),
  // English line under the Vietnamese captions, one per scene, in source ms.
  // Written by scripts/voice-video.mjs from script.json (faceless videos).
  subtitles: z.array(z.strictObject({ fromMs: ms, toMs: ms, text })).optional(),
  // Caption look in the classic design: "outline" (bold white words with an
  // outline, the default) or "box" (a white rounded box hugging each line).
  captionStyle: z.enum(["outline", "box"]).optional(),
  pacing: z
    .strictObject({
      mode: z.enum(["auto", "off"]),
      target: z.number().min(2).max(7).optional(),
      min: rate.optional(),
      max: rate.optional(),
      overrides: z
        .array(z.strictObject({ fromMs: ms, toMs: ms, rate }))
        .optional(),
    })
    .optional(),
  chapters: z
    .array(
      z.strictObject({
        atMs: ms,
        title: text,
        effect: z.enum(TRANSITIONS),
      }),
    )
    .optional(),
  stats: z
    .array(z.strictObject({ atMs: ms, durMs: ms, big: text, label: text }))
    .optional(),
  cues: z.array(cue).optional(),
  visuals: z.array(visual).optional(),
  cta: z.strictObject({ question: text.optional() }).optional(),
  compliance: z
    .strictObject({
      illustrativeNumbers: z.boolean().optional(),
      conditionsNote: z.boolean().optional(),
      // The video discusses tax: adds "not tax advice" (VI + EN) to the card.
      taxNote: z.boolean().optional(),
      // Faceless video from a policy document: the oldest facts.json asAt (YYYY-MM-DD),
      // printed on the end card; preflight checks it matches the ledger.
      policyAsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").optional(),
      advertisedRate: z
        .strictObject({
          rateFigure: text,
          comparisonRate: text,
          ratesAsAt: text,
        })
        .optional(),
    })
    .optional(),
  exemptions: z.array(exemption).optional(),
  // Upload copy, not shown in the video. scripts/publish-video.mjs checks it
  // (7 hashtags incl. #finhub #vietnamese, RG 234) and adds the broker details
  // and compliance footer to the caption file. Optional here; publish needs it.
  post: z
    .strictObject({ title: text, caption: text, hashtags: z.array(text) })
    .optional(),
})
  // An advertised rate on a numbers-kit cue needs the comparison-rate card.
  .superRefine((edit, ctx) => {
    (edit.cues ?? []).forEach((c, i) => {
      if (
        (c.kind === "change" || c.kind === "trend") &&
        c.rateType === "advertised" &&
        !edit.compliance?.advertisedRate
      )
        ctx.addIssue({
          code: "custom",
          path: ["cues", i, "rateType"],
          message:
            'rateType "advertised" needs compliance.advertisedRate {rateFigure, comparisonRate, ratesAsAt}',
        });
    });
  });

export type EditJson = z.infer<typeof editSchema>;
export type Cue = NonNullable<EditJson["cues"]>[number];
export type Tone = z.infer<typeof tone>;

export const DEFAULT_SUBTITLE = "Daniel Nguyen · Finance Hub";
export const DEFAULT_CTA_QUESTION = "Bạn cần tư vấn về khoản vay?";
export const CTA_BUTTON = "Liên hệ để được tư vấn";

// What calculateMetadata hands the component: plain JSON, so it survives being
// passed as input props to the render.
export type Reel = { edit: EditJson; timeline: Timeline };

export const parseEdit = (json: unknown, slug: string): EditJson => {
  const r = editSchema.safeParse(json);
  if (!r.success)
    throw new Error(
      `public/videos/${slug}/edit.json is invalid:\n${z.prettifyError(r.error)}`,
    );
  return r.data;
};

// Every string edit.json puts on screen, keyed by the field name an exemption
// must use ("title", "hook", "chapters", "stats", "cues[3]", "cta", ...).
export const onScreenCopy = (edit: EditJson): Record<string, string[]> => {
  const cueText = (c: Cue): string[] => {
    switch (c.kind) {
      case "kinetic":
        return [
          c.kicker ?? "",
          ...c.struck.map((s) => s.text),
          c.slam.kicker ?? "",
          c.slam.text,
          c.sub?.text ?? "",
        ];
      case "compare":
        return [
          ...c.cards.flatMap((k) => [
            k.title,
            ...k.rows.flatMap((r) => [r.label, r.value]),
          ]),
          c.question?.text ?? "",
        ];
      case "bars":
        return [
          c.kicker ?? "",
          c.title,
          ...c.bars.flatMap((b) => [b.label, b.value]),
          c.stamp?.text ?? "",
        ];
      case "verdict":
        return [c.text];
      case "venn":
        return [c.left, c.right, c.label];
      case "emoji":
        return [];
      case "lenders":
        return [c.title ?? ""];
      case "points":
        return [c.title, ...c.items.map((i) => i.text)];
      case "change":
        return [c.kicker ?? "", c.label, c.from, c.to];
      case "trend":
        return [
          c.kicker ?? "",
          c.title,
          c.unit ?? "",
          ...c.points.map((p) => p.label),
        ];
    }
  };
  const fields: Record<string, string[]> = {
    title: [edit.title],
    subtitle: [edit.subtitle ?? DEFAULT_SUBTITLE],
    hook: edit.hook
      ? [edit.hook.big, edit.hook.suffix ?? "", edit.hook.sub ?? ""]
      : [],
    chapters: (edit.chapters ?? []).map((c) => c.title),
    stats: (edit.stats ?? []).flatMap((s) => [s.big, s.label]),
    subtitles: (edit.subtitles ?? []).map((s) => s.text),
    cta: [edit.cta?.question ?? DEFAULT_CTA_QUESTION, CTA_BUTTON],
  };
  (edit.cues ?? []).forEach((c, i) => {
    fields[`cues[${i}]`] = cueText(c);
  });
  return fields;
};

// Source ms -> frame on the talk timeline (0 when past the end).
export const outFrameOf =
  (timeline: Timeline, fps: number) =>
  (srcMs: number): number =>
    Math.round(((toOutMs(timeline.segments, srcMs, fps) ?? 0) / 1000) * fps);
