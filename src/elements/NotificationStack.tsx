// Phone-style alerts sliding in one after another: a scroll-stopping hook
// ("Your fixed period ends in 30 days"). White cards, navy text, a count badge
// on the first. Up to 4 fit SAFE's height. Every string is on-screen copy: in a
// reel it goes through the RG 234 check (onScreenCopy in src/mortgage/schema.ts).
// Design concept from reactvideoeditor/remotion-templates' notification (MIT).
import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../brand/theme";
import { SAFE } from "../mortgage/golden";
import { FONT } from "../mortgage/style";

const ICONS = [brand.accent, brand.primary, brand.highlight];

export const NotificationStack: React.FC<{
  items: { title: string; body?: string }[];
  appName?: string; // small caps line above each title
  stagger?: number; // frames between cards
  badge?: boolean;
}> = ({ items, appName, stagger = 20, badge = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const width = SAFE.right - SAFE.left;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, fontFamily: FONT }}>
      {items.slice(0, 4).map((n, i) => {
        const s = spring({ frame: frame - i * stagger, fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });
        return (
          <div
            key={i}
            style={{
              position: "relative",
              display: "flex",
              gap: 28,
              width,
              padding: "30px 34px",
              borderRadius: 36,
              backgroundColor: brand.card,
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.3)",
              opacity: s,
              transform: `translateX(${interpolate(s, [0, 1], [700, 0])}px)`,
            }}
          >
            <div style={{ width: 84, height: 84, borderRadius: 20, flexShrink: 0, backgroundColor: ICONS[i % ICONS.length] }} />
            <div style={{ flex: 1, lineHeight: 1.3 }}>
              {appName ? (
                <div style={{ color: brand.slate, fontSize: 26, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }}>
                  {appName.normalize("NFC")}
                </div>
              ) : null}
              <div style={{ color: brand.textOnCard, fontSize: 42, fontWeight: 800 }}>{n.title.normalize("NFC")}</div>
              {n.body ? (
                <div style={{ color: brand.slate, fontSize: 34, fontWeight: 600 }}>{n.body.normalize("NFC")}</div>
              ) : null}
            </div>
            {badge && i === 0 ? (
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: -14,
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: brand.accent,
                  color: brand.textOnCard,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  fontWeight: 800,
                }}
              >
                {Math.min(items.length, 4)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
