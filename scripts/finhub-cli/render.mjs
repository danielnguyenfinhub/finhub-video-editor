// finhub render <slug>: hands the slug to scripts/render-video.py and returns its exit code. That script
// already stops on a missing cut-out, runs preflight.mjs (edit.json, check-schema, speech cuts, pacing),
// renders and stages the finished copy, so nothing is checked twice here. It never skips: the .inputs
// hash covers only edit.json, script.json and words.json, not design code, media or music.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { slugOk } from "../listing-prep.mjs";
import { OK, PROBLEM, UsageError, emit } from "./lib.mjs";

export const help = `finhub render <slug> [--still <frame>] [--dry-run] [--json]
  Runs python scripts/render-video.py <slug> (PYTHON overrides "python") and returns its exit code:
  0 done, 1 failed, 3 rendered but not published. Always renders; nothing is skipped.
  --still <frame>  one half-size frame to out/videos/<slug>/check-<frame>.png instead of the video
  --dry-run        print the command and run nothing`;

export const renderArgs = (root, slug) => [process.env.PYTHON ?? "python", join(root, "scripts", "render-video.py"), slug];

// The same Remotion call render-video.py makes for the thumbnail, at --scale=0.5.
export const stillArgs = (root, slug, frame) => [
  process.execPath,
  join(root, "node_modules", "@remotion", "cli", "remotion-cli.js"),
  "still",
  "src/index.ts",
  "MortgageReel",
  join(root, "out", "videos", slug, `check-${frame}.png`),
  `--props=${JSON.stringify({ slug })}`,
  `--frame=${frame}`,
  "--scale=0.5",
  "--gl=angle",
];

/** One line when the last render's stamp equals the current inputs hash, else null. */
export const infoLine = (stamp, hash) =>
  stamp && hash && stamp.trim() === hash.trim()
    ? "on-screen text unchanged since the last render (design, media and music changes are not tracked)"
    : null;

export const run = (root, { positionals: [slug, ...extra], values }) => {
  if (!slug || extra.length) throw new UsageError("usage: finhub render <slug> [--still <frame>] [--dry-run]");
  if (!slugOk(slug)) throw new UsageError(`bad slug "${slug}": lowercase letters, digits, ".", "_" or "-" only`);
  const still = values.still;
  if (still !== undefined && !/^\d+$/.test(still)) throw new UsageError("--still needs a whole frame number, 0 or more");
  const argv = still !== undefined ? stillArgs(root, slug, Number(still)) : renderArgs(root, slug);

  if (values["dry-run"]) {
    emit(values.json, { dryRun: true, argv }, [argv.join(" ")]);
    return OK;
  }
  if (still !== undefined) mkdirSync(join(root, "out", "videos", slug), { recursive: true });
  else {
    const stamp = join(root, "out", "videos", slug, `${slug}.inputs`);
    if (existsSync(stamp)) {
      const h = spawnSync(
        process.execPath,
        ["--no-warnings", join(root, "scripts", "publish-video.mjs"), slug, "--inputs-hash", "--public-dir", join(root, "public")],
        { cwd: root, encoding: "utf8" },
      );
      const line = infoLine(readFileSync(stamp, "utf8"), h.status === 0 ? h.stdout : null);
      if (line) console.error(line);
    }
  }
  // --json keeps stdout for the one object: the child's output goes to stderr instead.
  const r = spawnSync(argv[0], argv.slice(1), { cwd: root, stdio: values.json ? ["inherit", 2, "inherit"] : "inherit" });
  if (r.error) console.error(r.error.message);
  const code = r.status ?? PROBLEM;
  if (code !== 0 && code !== 3) console.error(`see: finhub status ${slug}`);
  if (values.json) emit(true, { slug, argv, exitCode: code }, []);
  return code;
};
