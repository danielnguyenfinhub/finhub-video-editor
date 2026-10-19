// The said word's scale grows it past its layout box and into the space to
// its neighbours ("ThángHai"). Every word keeps a fixed side margin of half
// that overflow (width about 0.6 em a character); with the neighbour's half
// the space stays about as wide as said, and the line never reflows. In em.
// ponytail: width estimated from the character count; measure it with
// measureText if a caption font ever differs much from 0.6 em a character.
export const saidRoom = (scale: number, text: string) =>
  +(((scale - 1) / 4) * 0.6 * text.trim().length).toFixed(3);
