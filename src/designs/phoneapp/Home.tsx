// "phoneapp" home screen (under every other screen): the header with the
// current chapter (or the overview) and a bell, and a "recent" feed of what
// has been said so far (the hook, stats, banks, checklists, comparisons),
// loading placeholders shimmering where the feed is still empty.
import type React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../../brand/theme";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import { outFrameOf, type Reel } from "../../mortgage/schema";
import { enter } from "../../mortgage/style";
import {
  CONTENT,
  Card,
  GOLD,
  HEADER_TOP,
  HOME_TOP,
  INK,
  MUTED,
  alpha,
  clampLines,
} from "./Phone";
import { isOwnCue, type Plan } from "./plan";

type Past = {
  at: number;
  title: string;
  value: string;
  icon: string;
  lender?: Lender;
};

const pastOf = (reel: Reel, plan: Plan, fps: number): Past[] => {
  const at = outFrameOf(reel.timeline, fps);
  const hook = reel.edit.hook;
  const out: Past[] = plan.items.flatMap((i): Past[] =>
    i.kind === "hook" && hook
      ? [{ at: i.to, title: hook.sub ?? "", value: hook.big, icon: "%" }]
      : // An automatic figure has no title of its own: not in the feed.
        i.kind === "figure" && i.figure.source === "stat"
        ? [
            {
              at: i.to,
              title: i.figure.label,
              value: i.figure.big,
              icon: i.figure.big.includes("%") ? "%" : "#",
            },
          ]
        : i.kind === "lender"
          ? [
              {
                at: i.to,
                title: "Đang nhắc tới",
                value: "",
                icon: "",
                lender: i.lender,
              },
            ]
          : [],
  );
  for (const c of (reel.edit.cues ?? []).filter(isOwnCue)) {
    out.push(
      c.kind === "points"
        ? {
            at: at(c.toMs),
            title: c.title,
            value: `${c.items.length}/${c.items.length}`,
            icon: "✓",
          }
        : {
            at: at(c.toMs),
            title: c.question?.text ?? c.cards.map((k) => k.title).join(" · "),
            value: "",
            icon: "VS",
          },
    );
  }
  return out.sort((a, b) => a.at - b.at);
};

const ROW_H = 118;
const ROW_GAP = 12;
const ROWS = 3;

export const FeedRow: React.FC<{ past?: Past; frame: number }> = ({
  past,
  frame,
}) => {
  const shimmer = (frame % 60) / 60;
  if (!past)
    return (
      <Card
        style={{
          height: ROW_H,
          padding: 26,
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: alpha(brand.slate, 0.15),
          }}
        />
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}
        >
          {[1, 0.6].map((w) => (
            <div
              key={w}
              style={{
                width: `${w * 100}%`,
                height: 20,
                borderRadius: 10,
                background: `linear-gradient(90deg, ${alpha(brand.slate, 0.12)} ${shimmer * 100 - 30}%, ${alpha(brand.slate, 0.28)} ${shimmer * 100}%, ${alpha(brand.slate, 0.12)} ${shimmer * 100 + 30}%)`,
              }}
            />
          ))}
        </div>
      </Card>
    );
  return (
    <Card
      style={{
        height: ROW_H,
        padding: "0 24px",
        display: "flex",
        gap: 18,
        alignItems: "center",
      }}
    >
      {past.lender ? (
        <LenderLogo
          lender={past.lender}
          height={50}
          style={{ border: `2px solid ${alpha(brand.slate, 0.25)}` }}
        />
      ) : (
        <div
          style={{
            flex: "0 0 64px",
            height: 64,
            borderRadius: 20,
            background: alpha(brand.primary, 0.12),
            color: brand.primary,
            fontSize: 30,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {past.icon}
        </div>
      )}
      <div
        style={{
          flex: 1,
          fontSize: 34,
          fontWeight: 700,
          lineHeight: 1.22,
          color: INK,
          ...clampLines(2),
        }}
      >
        {past.title}
      </div>
      {past.value ? (
        <div
          style={{
            fontSize: 40,
            fontWeight: 900,
            color: INK,
            whiteSpace: "nowrap",
          }}
        >
          {past.value}
        </div>
      ) : null}
    </Card>
  );
};

// The header: the current chapter (number pill + title), or the overview.
const Header: React.FC<{ reel: Reel; frame: number; pushed: number }> = ({
  reel,
  frame,
  pushed,
}) => {
  const { fps } = useVideoConfig();
  const at = outFrameOf(reel.timeline, fps);
  const chapters = reel.edit.chapters ?? [];
  let idx = -1;
  chapters.forEach((c, i) => {
    if (frame >= at(c.atMs)) idx = i;
  });
  const since = idx < 0 ? frame : frame - at(chapters[idx].atMs);
  const p = enter(since, fps);
  const title = idx < 0 ? "Tổng quan" : chapters[idx].title;
  return (
    <div
      style={{
        position: "absolute",
        left: CONTENT.left,
        width: CONTENT.width,
        top: HEADER_TOP,
        height: 76,
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: 1 - pushed,
        transform: `translateX(${-pushed * 120}px)`,
      }}
    >
      {idx >= 0 ? (
        <div
          style={{
            padding: "4px 18px",
            borderRadius: 999,
            background: GOLD,
            color: INK,
            fontSize: 34,
            fontWeight: 900,
          }}
        >
          {idx + 1}/{chapters.length}
        </div>
      ) : null}
      <div
        style={{
          flex: 1,
          fontSize: 42,
          fontWeight: 900,
          color: INK,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
        }}
      >
        {title}
      </div>
      {/* Bell: rings when a notification lands. */}
      <svg
        width={48}
        height={52}
        viewBox="0 0 24 26"
        style={{
          transform: `rotate(${frame < 40 ? Math.sin(frame / 2) * 14 * (1 - frame / 40) : 0}deg)`,
        }}
      >
        <path
          d="M12 2a7 7 0 0 0-7 7v5l-2 4h18l-2-4V9a7 7 0 0 0-7-7z"
          fill={INK}
        />
        <circle cx={12} cy={22} r={2.6} fill={INK} />
        <circle cx={19} cy={5} r={4} fill={GOLD} />
      </svg>
    </div>
  );
};

export const HomeScreen: React.FC<{
  reel: Reel;
  plan: Plan;
  busy: number;
  pushed: number;
}> = ({ reel, plan, busy, pushed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const past = pastOf(reel, plan, fps).filter((p) => p.at <= frame);
  const shown = past.slice(-ROWS).reverse();
  const newest = shown[0];
  const k = newest ? enter(frame - newest.at, fps) : 1;
  const rows = Array.from({ length: ROWS }, (_, i) => shown[i]);
  return (
    <>
      <Header reel={reel} frame={frame} pushed={pushed} />
      <div
        style={{
          position: "absolute",
          left: CONTENT.left,
          width: CONTENT.width,
          top: HOME_TOP + 8,
          opacity: 1 - Math.max(busy, pushed),
          transform: `translateY(${busy * 40}px)`,
        }}
      >
        <div
          style={{ fontSize: 34, fontWeight: 800, color: MUTED, height: 50 }}
        >
          Gần đây
        </div>
        <div
          style={{
            position: "relative",
            height: ROWS * (ROW_H + ROW_GAP),
            overflow: "hidden",
          }}
        >
          {rows.map((r, i) => (
            <div
              key={r ? `${r.at}${r.title}` : `s${i}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: (i - (1 - k)) * (ROW_H + ROW_GAP),
                opacity: i === 0 && r ? k : 1,
              }}
            >
              <FeedRow past={r} frame={frame + i * 12} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
