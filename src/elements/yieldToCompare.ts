// blueprint and orbit draw a figure and a compare cue on the same stage, so the
// cue wins (rule 3b), but a figure is never dropped (rule 1, review 557b020):
// - still up when a compare cue starts: it ends there once it has had its
//   reading floor; if it is short by no more than the cue panel's drop-in
//   (`entry` frames, the panel is still moving in), it holds its floor over it;
// - otherwise, or if it starts during the cue, it is shown whole after the cue,
//   marked `chip` when another cue holds the stage then (the design draws it
//   small in a place of its own, never on that cue). Talk frames.
// ponytail: a moved figure is not re-checked against the next figure.
export const yieldToCompare = <F extends { fromFrame: number; frames: number }>(
  figures: F[],
  compares: [number, number][],
  cues: [number, number][],
  floor: number,
  entry = 10,
): (F & { chip?: boolean })[] =>
  figures.map((f) => {
    const during = compares.find(
      ([a, b]) => f.fromFrame >= a && f.fromFrame < b,
    );
    const cut = compares.find(
      ([a]) => a > f.fromFrame && a < f.fromFrame + f.frames,
    );
    if (!during && !cut) return f;
    if (cut && !during) {
      const shown = cut[0] - f.fromFrame;
      if (shown >= floor) return { ...f, frames: shown };
      if (floor - shown <= entry) return { ...f, frames: floor };
    }
    const after = (during ?? cut)![1];
    const busy = cues.some(([a, b]) => a < after + f.frames && b > after);
    return { ...f, fromFrame: after, chip: busy };
  });
