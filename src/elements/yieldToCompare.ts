// blueprint and orbit draw a figure and a compare cue on the same stage, so the
// cue wins (rule 3b), but a figure is never dropped (rule 1, review 557b020):
// - still up when a compare cue starts: it ends there once it has had its
//   reading floor; if it is short by no more than the cue panel's drop-in
//   (`entry` frames, the panel is still moving in), it holds its floor over it;
// - otherwise, or if it starts during the cue, it is shown whole after the cue
//   (after the previous moved figure, so moved figures never overlap each
//   other), marked `chip` when another cue holds the stage then or another
//   figure is up then (the design draws it small in a place of its own, never
//   on that cue or figure). Talk frames.
// ponytail: a moved figure is not re-checked against a later compare cue.
export const yieldToCompare = <F extends { fromFrame: number; frames: number }>(
  figures: F[],
  compares: [number, number][],
  cues: [number, number][],
  floor: number,
  entry = 10,
): (F & { chip?: boolean })[] => {
  let movedFree = -Infinity;
  const out = figures.map((f): F & { chip?: boolean; moved?: true } => {
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
    const after = Math.max((during ?? cut)![1], movedFree);
    movedFree = after + f.frames;
    return { ...f, fromFrame: after, moved: true };
  });
  return out.map(({ moved, ...f }) => {
    if (!moved) return f as F;
    const end = f.fromFrame + f.frames;
    const busy =
      cues.some(([a, b]) => a < end && b > f.fromFrame) ||
      out.some(
        (g) =>
          !g.moved && g.fromFrame < end && g.fromFrame + g.frames > f.fromFrame,
      );
    return { ...f, chip: busy } as F & { chip?: boolean };
  });
};
