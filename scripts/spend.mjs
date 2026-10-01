// Spend guard for voice-video.mjs: a paid engine (ElevenLabs) or fal.ai images need a
// --dry-run estimate first, and the script may not have grown more than 50% since, so
// Daniel has seen the cost of what actually runs. Prices stay in the dry-run output.
export const SPEND_SLACK = 1.5;

/** `now` and `est` are {engine, chars, aiImages}; est is null when no --dry-run was recorded. Returns a plain-language problem or null. */
export const spendProblem = (now, est) => {
  const paid = now.engine === "elevenlabs" || now.aiImages > 0;
  if (!paid) return null;
  if (!est) return "this script uses a paid engine or fal.ai images, and no --dry-run estimate is recorded: run --dry-run, give Daniel the cost, then run again.";
  if (est.engine !== now.engine) return `the engine changed since the estimate (${est.engine} -> ${now.engine}): run --dry-run again and give Daniel the new cost.`;
  const over = (a, b) => a > Math.ceil(b * SPEND_SLACK);
  if (over(now.chars, est.chars) || over(now.aiImages, est.aiImages))
    return `the script grew past the estimate (${est.chars} -> ${now.chars} characters, ${est.aiImages} -> ${now.aiImages} fal.ai images, limit +50%): run --dry-run again and give Daniel the new cost.`;
  return null;
};
