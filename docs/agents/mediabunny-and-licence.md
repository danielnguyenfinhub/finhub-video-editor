# Mediabunny and the Remotion licence

Part of the project guide; [AGENTS.md](../../AGENTS.md) is the core and routes here. Moved from AGENTS.md "Conventions".

## Conventions: media files and licence

- Read a media file's duration, size or codecs with Mediabunny (`Input` with `UrlSource(staticFile(…))`, or `FilePathSource` in Node), as in the `remotion-best-practices/remotion-multimedia` guide, not with the deprecated `parseMedia()`/`getVideoMetadata()`. It's a direct dependency, pinned to the version `@remotion/media` uses.
- Mediabunny's docs (mediabunny.dev) are blocked in this sandbox. To read them, clone the source at the installed version, outside this repo and read-only: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --branch v1.56.1 https://github.com/Vanilagy/mediabunny ../vanilagy/mediabunny`, then read `docs/guide/` and `examples/`. Match the tag to `mediabunny` in `package.json`; never copy the source into this repo or install a different version than `@remotion/media` uses.
- The owner uses Remotion's free license (individuals, for-profit companies with up to 3 employees, and non-profits qualify; see [Remotion's license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)). Pass `acknowledgeRemotionLicense` where an API takes it (`<Player>`, `parseMedia()`, `convertMedia()` and others); it only hides Remotion's license notice.
