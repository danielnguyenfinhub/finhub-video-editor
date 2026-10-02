// blueprint and orbit draw a figure and a compare cue on the same stage, so the
// cue wins (rule 3b, review c849a4c): a figure still up when a compare cue
// starts ends there if it has had its reading floor; if not, or if it starts
// during the cue, it is shown whole after the cue ends when the stage is free
// for its floor (no other cue starts by then), else it is dropped from these
// two stages (the core and the captions keep it). Talk frames.
// ponytail: a moved figure is not re-checked against the next figure.
export const yieldToCompare = <F extends { fromFrame: number; frames: number }>(
  figures: F[],
  compares: [number, number][],
  cues: [number, number][],
  floor: number,
): F[] =>
  figures.flatMap((f) => {
    const during = compares.find(
      ([a, b]) => f.fromFrame >= a && f.fromFrame < b,
    );
    const cut = compares.find(
      ([a]) => a > f.fromFrame && a < f.fromFrame + f.frames,
    );
    if (!during && !cut) return [f];
    if (cut && cut[0] - f.fromFrame >= floor)
      return [{ ...f, frames: cut[0] - f.fromFrame }];
    const after = (during ?? cut)![1];
    const free = !cues.some(([a, b]) => a < after + floor && b > after);
    return free ? [{ ...f, fromFrame: after }] : [];
  });
