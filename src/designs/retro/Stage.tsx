// "retro" stage: the band in the middle of the poster where one thing lands at
// a time: the hook headline (screen-printed number, ribbon sub-line), a spoken
// number in a spinning starburst badge ("CON SỐ", halftone bar for a
// percentage), a named bank's logo on a white coupon. Plus the chapter ribbon
// and the English line.
import type React from "react";
import {
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../../brand/theme";
import {
  HOOK_FRAMES,
  SAFE,
  figuresOf,
  lenderMentionsOf,
  type Figure,
  asSaid,
  saidKind,
  hookCount,
} from "../../mortgage/golden";
import { LenderLogo } from "../../mortgage/LenderLogo";
import type { Lender } from "../../mortgage/lenders";
import type { EditJson, Reel } from "../../mortgage/schema";
import { FONT, clamp } from "../../mortgage/style";
import {
  BLUE,
  CREAM,
  GOLD,
  INK,
  NAVY,
  Ribbon,
  StarBadge,
  alpha,
  halftone,
  hardBox,
  printShadow,
  useStamp,
} from "./Print";

// Under the LogoMark tile (SAFE.top + 148), above the low caption band; the
// English line owns the bottom ENGLISH_ROOM of SAFE.
export const STAGE = { top: 590, bottom: 1120 };
export const ENGLISH_ROOM = 128;
export const STAGE_W = SAFE.right - SAFE.left;

type Place = "center" | "top";
export const StageBox: React.FC<{
  children: React.ReactNode;
  place?: Place;
}> = ({ children, place = "center" }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      width: STAGE_W,
      top: STAGE.top,
      height: STAGE.bottom - STAGE.top,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: place === "top" ? "flex-start" : "center",
      fontFamily: FONT,
    }}
  >
    {children}
  </div>
);

// "4,1 tỷ" counts 0 → 4,1 with the same decimals. A date ("29/9") or a year
// ("2026") is shown as said: counting it would flash wrong dates.
export const counted = (big: string, t: number): string => {
  if (asSaid(big)) return big; // a year or a date: as said (golden rule 1)
  if (/\d\s*\/\s*\d/.test(big) || /\b(19|20)\d\d\b/.test(big)) return big;
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[0].includes("."), // only if the spoken number had one
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// A percentage's share of its scale (10 % below 10 %, e.g. rates), or null.
const percentShare = (big: string): number | null => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return null;
  const v = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : null;
};

export const useCount = (from = 6, to = 36) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {
    ...clamp,
    easing: (x) => 1 - (1 - x) ** 3,
  });
};

// Heavy navy type, gold plate a few px off, hard shadow.
const numberStyle = (size: number): React.CSSProperties => ({
  fontSize: size,
  fontWeight: 900,
  lineHeight: 1,
  color: INK,
  letterSpacing: -1,
  textShadow: printShadow(Math.max(4, size / 26), Math.max(3, size / 45)),
  whiteSpace: "nowrap",
});

const Kicker: React.FC<{ text: string; size?: number }> = ({
  text,
  size = 26,
}) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 900,
      letterSpacing: size * 0.18,
      color: INK,
      marginBottom: size * 0.2,
    }}
  >
    {text}
  </div>
);

// ------------------------------------------------------------- figures

const HalftoneBar: React.FC<{ share: number; width: number }> = ({
  share,
  width,
}) => {
  const t = useCount(10, 40);
  return (
    <div
      style={{
        width,
        height: 46,
        marginTop: 18,
        background: CREAM,
        border: `5px solid ${INK}`,
        borderRadius: 23,
        boxShadow: hardBox(6),
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${share * t * 100}%`,
          backgroundColor: GOLD,
          backgroundImage: halftone(alpha(BLUE, 0.85), 10, 0.36),
          backgroundSize: "10px 10px",
          borderRight: `5px solid ${INK}`,
        }}
      />
    </div>
  );
};

const FigureLabel: React.FC<{ text: string; size: number; delay: number }> = ({
  text,
  size,
  delay,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 8], [0, 1], clamp);
  return (
    <Ribbon
      style={{
        marginTop: 22,
        maxWidth: STAGE_W - 130,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      <div
        style={{
          padding: "12px 30px",
          fontSize: size,
          fontWeight: 800,
          lineHeight: 1.25,
          color: INK,
          textAlign: "center",
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    </Ribbon>
  );
};

// The badge's kicker: a neutral word for a year or a date, never "CON SỐ".
export const kickerOf = (big: string): string => {
  const kind = saidKind(big);
  return kind === "year" ? "NĂM" : kind === "date" ? "NGÀY" : "CON SỐ";
};

// Stat or automatic figure: the number inside a big starburst badge.
const BadgeFigure: React.FC<{ figure: Figure; r: number }> = ({
  figure,
  r,
}) => {
  const t = useCount();
  const share = percentShare(figure.big);
  const text = counted(figure.big, t);
  // Inside the dashed ring (~1.3 r across at ~0.7 em a glyph).
  const size = Math.min(r * 0.6, (r * 1.3) / (0.7 * figure.big.length));
  return (
    <StageBox>
      <StarBadge r={r}>
        <Kicker text={kickerOf(figure.big)} size={r * 0.13} />
        <div style={numberStyle(size)}>{text}</div>
      </StarBadge>
      {share === null ? null : <HalftoneBar share={share} width={r * 2.4} />}
      {figure.label ? (
        <FigureLabel text={figure.label} size={r > 160 ? 40 : 36} delay={10} />
      ) : null}
    </StageBox>
  );
};

// ------------------------------------------------------------- hook

const HookPoster: React.FC<{
  hook: NonNullable<EditJson["hook"]>;
}> = ({ hook }) => {
  const frame = useCurrentFrame();
  const t = useCount(4, 34);
  const s = useStamp(0);
  const out = interpolate(frame, [HOOK_FRAMES - 8, HOOK_FRAMES], [1, 0], clamp);
  const big =
    hook.countTo === undefined
      ? hook.big
      : `${hookCount(hook.countTo, t).toLocaleString("vi-VN", {
          minimumFractionDigits: hook.decimals ?? 0,
          maximumFractionDigits: hook.decimals ?? 0,
        })}${hook.suffix ?? ""}`;
  const size = Math.min(230, (STAGE_W - 80) / (0.64 * hook.big.length));
  const sub = interpolate(frame, [10, 20], [0, 1], clamp);
  return (
    <StageBox>
      <div
        style={{
          opacity: out,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            ...numberStyle(size),
            textShadow: printShadow(size / 22, size / 36),
            transform: `scale(${interpolate(s, [0, 1], [1.8, 1])}) rotate(-3deg)`,
            opacity: interpolate(s, [0, 0.2], [0, 1], clamp),
          }}
        >
          {big}
        </div>
        {hook.sub ? (
          <Ribbon
            color={NAVY}
            style={{
              marginTop: 34,
              maxWidth: STAGE_W - 130,
              opacity: sub,
              transform: `scaleX(${interpolate(sub, [0, 1], [0.4, 1])}) rotate(1.5deg)`,
            }}
          >
            <div
              style={{
                padding: "16px 34px",
                fontSize: 46,
                fontWeight: 800,
                lineHeight: 1.25,
                textAlign: "center",
                color: CREAM,
                textShadow: `3px 3px 0 ${BLUE}`,
                textWrap: "balance",
              }}
            >
              {hook.sub}
            </div>
          </Ribbon>
        ) : null}
      </div>
    </StageBox>
  );
};

// ------------------------------------------------------------- lender

// A white coupon: notched sides, dashed inner border, hard shadow.
const LenderCoupon: React.FC<{ lender: Lender }> = ({ lender }) => {
  const frame = useCurrentFrame();
  const s = useStamp(0);
  const notch =
    "radial-gradient(circle 30px at 0 50%, transparent 29px, black 30px), radial-gradient(circle 30px at 100% 50%, transparent 29px, black 30px)";
  return (
    <StageBox>
      <div
        style={{
          filter: `drop-shadow(9px 9px 0 ${INK})`,
          transform: `translateX(${(1 - s) * -500}px) rotate(${-3 + Math.sin(frame / 12) * 0.8}deg)`,
        }}
      >
        <div
          style={{
            background: brand.card,
            maskImage: notch,
            maskComposite: "intersect",
            padding: 22,
          }}
        >
          <div
            style={{
              border: `4px dashed ${INK}`,
              borderRadius: 12,
              padding: "34px 70px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <LenderLogo lender={lender} height={140} />
            <div
              style={{
                marginTop: 18,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 5,
                color: brand.slate,
              }}
            >
              ĐANG NHẮC TỚI
            </div>
          </div>
        </div>
      </div>
    </StageBox>
  );
};

export const StageLayer: React.FC<{ reel: Reel }> = ({ reel }) => {
  const { fps } = useVideoConfig();
  // figuresOf starts every figure after the hook (golden rule 1).
  const figures = figuresOf(reel, fps);
  return (
    <>
      {reel.edit.hook ? (
        <Sequence durationInFrames={HOOK_FRAMES} layout="none">
          <HookPoster hook={reel.edit.hook} />
        </Sequence>
      ) : null}
      {figures.map((f) => (
        <Sequence
          key={`${f.source}${f.fromFrame}`}
          from={f.fromFrame}
          durationInFrames={f.frames}
          layout="none"
        >
          <BadgeFigure figure={f} r={f.source === "stat" ? 175 : 150} />
        </Sequence>
      ))}
      {lenderMentionsOf(reel).map((m) => {
        const from = Math.round((m.startMs / 1000) * fps);
        const to = Math.round((m.endMs / 1000) * fps);
        return (
          <Sequence
            key={`${m.lender.name}${m.startMs}`}
            from={from}
            durationInFrames={Math.max(1, to - from)}
            layout="none"
          >
            <LenderCoupon lender={m.lender} />
          </Sequence>
        );
      })}
    </>
  );
};
