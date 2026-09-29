// The 16:9 YouTube frame. YouTube shows the whole frame (no feed crop), so the
// safe area is the classic title-safe inset: text stays 5 % in from the left
// and right and 6.7 % from the top and bottom, clear of the player's own
// controls (title bar, progress bar) when they fade in.
export const YT_WIDTH = 1920;
export const YT_HEIGHT = 1080;
export const YT_SAFE = { left: 96, right: 1824, top: 72, bottom: 1008 };
