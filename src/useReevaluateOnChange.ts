// Origin: remotion-dev/remotion, packages/template-recorder/remotion/helpers/
// refresh-on-public-folder-change.ts (Remotion licence). Adapted: watches
// named public/ files (watchStaticFile) instead of filtering the whole folder.
//
// calculateMetadata reads edit.json / words.json once, and the Studio does not
// re-run it when those files change on disk, so an open tab shows stale edits.
// This re-runs it on any change. Studio only: a no-op in renders and <Player>.
import { reevaluateComposition, watchStaticFile } from "@remotion/studio";
import { useEffect } from "react";
import { getRemotionEnvironment } from "remotion";

// `paths` are relative to public/, e.g. "videos/<slug>/edit.json".
export const useReevaluateOnChange = (paths: string[]) => {
  const key = paths.join("\n");
  useEffect(() => {
    if (!getRemotionEnvironment().isStudio) return;
    const watchers = key
      .split("\n")
      .map((p) => watchStaticFile(p, () => reevaluateComposition()));
    return () => watchers.forEach((w) => w.cancel());
  }, [key]);
};
