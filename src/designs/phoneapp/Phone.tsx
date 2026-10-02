// "phoneapp" pieces every screen shares: the backdrop (brand navy into the
// logo blue with soft blurred shapes drifting), the phone (a generic rounded
// device, a pill-shaped camera cut-out and a status bar), the app's look
// (pale screen, white cards, navy text, gold accents), and the small UI
// parts the screens animate: a filling ring, a tap ripple, a check box.
import type React from "react";
import { useEffect, useState } from "react";
import { AbsoluteFill, interpolate, useDelayRender } from "remotion";
import { brand } from "../../brand/theme";
import { SAFE, asSaid } from "../../mortgage/golden";
import { FONT, clamp, reelFontReady } from "../../mortgage/style";

// A brand colour at an alpha, without a colour literal.
export const alpha = (c: string, a: number) =>
  `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
export const WHITE = brand.card;
export const INK = brand.textOnCard; // navy text on white
export const MUTED = brand.slate;
export const GOLD = brand.highlight;
export const SCREEN_BG = `color-mix(in srgb, ${brand.primary} 7%, ${brand.card})`;
export const CARD_SHADOW = `0 10px 30px ${alpha(brand.navy, 0.12)}`;

// The phone, centred on SAFE's middle. Its body runs off the bottom of the
// frame (held up from below); every text inside it stays between
// SCREEN.top + STATUS and BODY_BOTTOM, above the captions.
export const PHONE = { left: 187, width: 640, top: 580, height: 1420 };
const BEZEL = 16;
export const SCREEN = {
  left: PHONE.left + BEZEL,
  right: PHONE.left + PHONE.width - BEZEL,
  top: PHONE.top + BEZEL,
};
export const STATUS = 62; // status bar height
export const PAD = 26; // screen padding
export const CONTENT = {
  left: SCREEN.left + PAD,
  right: SCREEN.right - PAD,
  width: SCREEN.right - SCREEN.left - 2 * PAD,
};
export const HEADER_TOP = SCREEN.top + STATUS + 8; // home screen's header
export const HOME_TOP = HEADER_TOP + 84; // home content under the header
export const PAGE_TOP = SCREEN.top + STATUS + 12; // a pushed page (cues)
export const BODY_BOTTOM = 1188; // nothing inside the phone below this
// Floating chips above the phone (a figure or bank that lands while the
// screen is taken): two lanes left of the LogoMark tile.
export const CHIP = { top: SAFE.top + 8, height: 136, gap: 12 };
export const CHIP_LANES = [
  { left: SAFE.left, width: 318 },
  { left: SAFE.left + 330, width: 318 },
];

export const clampLines = (lines: number): React.CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textWrap: "balance",
});

export const ease = (x: number) => 1 - (1 - x) ** 3;
export const fadeOut = (frame: number, dur: number) =>
  interpolate(frame, [dur - 8, dur], [1, 0], clamp);

// The phone floats a few pixels, so the picture is never still.
export const floatY = (t: number) => Math.sin(t / 38) * 5;

export const useFontReady = (): boolean => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("phoneapp: Be Vietnam Pro"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    reelFontReady()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
  return ready;
};

// "4,35%" -> counts 0 → 4,35 with the same decimals. A year or a date
// ("2026", "29/9") is shown as said; thousands dots only if said with them.
export const counted = (big: string, t: number): string => {
  if (asSaid(big)) return big; // a year or a date: as said (golden rule 1)
  const m = big.match(/\d[\d.,]*/);
  if (!m || m.index === undefined) return big;
  if (/^(19|20)\d\d$/.test(m[0]) || /\d\/\d/.test(big)) return big;
  const target = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(target)) return big;
  const decimals = m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const now = (target * t).toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[0].includes("."),
  });
  return big.slice(0, m.index) + now + big.slice(m.index + m[0].length);
};

// How far a ring fills: a rate below 10 % on a 10 % scale, another
// percentage on 100 %; anything without a scale closes the ring.
export const ringFill = (big: string): number => {
  const m = big.match(/\d[\d.,]*/);
  if (!m || !big.includes("%")) return 1;
  const v = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(v) ? Math.min(1, v / (v < 10 ? 10 : 100)) : 1;
};

// ------------------------------------------------------------- backdrop

const BLOBS = [
  { x: 180, y: 380, r: 260, c: brand.primary, a: 0.55, s: 90 },
  { x: 900, y: 760, r: 220, c: brand.highlight, a: 0.22, s: 120 },
  { x: 120, y: 1320, r: 240, c: brand.primary, a: 0.45, s: 105 },
  { x: 960, y: 1640, r: 280, c: brand.primary, a: 0.5, s: 80 },
  { x: 560, y: 260, r: 160, c: brand.highlight, a: 0.16, s: 140 },
];

// `t` is a continuous clock (talk frame or cover frame): no jump at a cut.
export const Backdrop: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(165deg, ${brand.navy} 0%, ${brand.background} 45%, ${brand.primary} 130%)`,
      overflow: "hidden",
    }}
  >
    {BLOBS.map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: b.x - b.r + Math.sin(t / b.s + i) * 60,
          top: b.y - b.r + Math.cos(t / (b.s * 1.3) + i * 2) * 50,
          width: 2 * b.r,
          height: 2 * b.r,
          borderRadius: i % 2 ? "38% 62% 55% 45%" : "50%",
          background: alpha(b.c, b.a),
          filter: "blur(70px)",
          transform: `rotate(${t / 3 + i * 40}deg)`,
        }}
      />
    ))}
    {/* Two thin rounded outlines drifting, an app-icon echo. */}
    {[0, 1].map((i) => (
      <div
        key={`o${i}`}
        style={{
          position: "absolute",
          left: i ? 860 : 40,
          top: (i ? 380 : 1010) + Math.sin(t / 60 + i) * 30,
          width: 150,
          height: 150,
          borderRadius: 42,
          border: `3px solid ${alpha(WHITE, 0.12)}`,
          transform: `rotate(${(i ? -1 : 1) * (12 + t / 8)}deg)`,
        }}
      />
    ))}
  </AbsoluteFill>
);

// ------------------------------------------------------------- the phone

const Battery: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
    <div
      style={{
        width: 42,
        height: 22,
        borderRadius: 7,
        border: `2.5px solid ${INK}`,
        padding: 2.5,
      }}
    >
      <div
        style={{
          width: "72%",
          height: "100%",
          borderRadius: 3,
          background: INK,
        }}
      />
    </div>
    <div style={{ width: 3, height: 8, borderRadius: 2, background: INK }} />
  </div>
);

const Signal: React.FC = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 22 }}>
    {[9, 13, 17, 22].map((h) => (
      <div
        key={h}
        style={{ width: 6, height: h, borderRadius: 2, background: INK }}
      />
    ))}
  </div>
);

// The device and its empty screen; `children` draw on the screen (absolute,
// frame coordinates, clipped to the screen).
export const Phone: React.FC<{
  t: number;
  dim?: number;
  children?: React.ReactNode;
}> = ({ t, dim = 0, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      transform: `translateY(${floatY(t)}px)`,
      fontFamily: FONT,
      // The phone fades into the backdrop under its content, so the captions
      // below sit on the dark backdrop, not on a pale empty screen.
      maskImage: `linear-gradient(180deg, black ${BODY_BOTTOM + 10}px, transparent ${BODY_BOTTOM + 170}px)`,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: PHONE.left,
        top: PHONE.top,
        width: PHONE.width,
        height: PHONE.height,
        borderRadius: 100,
        background: `linear-gradient(150deg, ${brand.slate}, ${brand.navy} 40%, ${brand.background})`,
        boxShadow: `0 40px 90px ${alpha(brand.navy, 0.7)}, inset 0 0 0 3px ${alpha(WHITE, 0.18)}`,
      }}
    />
    {/* The screen: clips everything drawn on it. */}
    <div
      style={{
        position: "absolute",
        left: SCREEN.left,
        top: SCREEN.top,
        width: SCREEN.right - SCREEN.left,
        height: PHONE.height - 2 * BEZEL,
        borderRadius: 84,
        background: SCREEN_BG,
        overflow: "hidden",
      }}
    >
      {/* Status bar. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: STATUS,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 48px 0",
          color: INK,
          fontSize: 34,
          fontWeight: 800,
        }}
      >
        <span>8:30</span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Signal />
          <Battery />
        </div>
      </div>
      {/* The screen's content, over the status bar (a notification drops
          over it) and under the camera pill. */}
      <div
        style={{
          position: "absolute",
          left: -SCREEN.left,
          top: -SCREEN.top,
          width: 1080,
          height: 1920,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 16,
          width: 170,
          height: 46,
          marginLeft: -85,
          borderRadius: 23,
          background: brand.navy,
        }}
      />
      {dim > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: alpha(brand.navy, 0.6 * dim),
          }}
        />
      ) : null}
    </div>
  </div>
);

// ------------------------------------------------------------- UI parts

// A progress ring; fill 0..1 of the circle, drawn up to `t` (0..1).
export const Ring: React.FC<{
  size: number;
  fill: number;
  t: number;
  width?: number;
  color?: string;
  children?: React.ReactNode;
}> = ({ size, fill, t, width = 16, color = GOLD, children }) => {
  const r = (size - width) / 2;
  const C = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={alpha(brand.primary, 0.12)}
          strokeWidth={width}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fill * t)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// A tap: a ring of light spreading from (x, y), `frame` frames after the tap.
export const Ripple: React.FC<{
  x: number;
  y: number;
  frame: number;
  color?: string;
  size?: number;
}> = ({ x, y, frame, color = brand.primary, size = 150 }) => {
  if (frame < 0 || frame > 22) return null;
  const k = ease(frame / 22);
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: alpha(color, 0.28 * (1 - k)),
        border: `4px solid ${alpha(color, 0.6 * (1 - k))}`,
        transform: `scale(${0.2 + k})`,
        pointerEvents: "none",
      }}
    />
  );
};

// A round check box that fills gold with a tick once `on` (0..1).
export const Check: React.FC<{ on: number; size?: number }> = ({
  on,
  size = 56,
}) => (
  <div
    style={{
      flex: `0 0 ${size}px`,
      width: size,
      height: size,
      borderRadius: "50%",
      border: `4px solid ${on > 0 ? GOLD : alpha(brand.slate, 0.45)}`,
      background: on > 0 ? alpha(brand.highlight, on) : WHITE,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: INK,
      fontSize: size * 0.58,
      fontWeight: 900,
      transform: `scale(${1 + 0.18 * Math.sin(Math.min(1, on) * Math.PI)})`,
    }}
  >
    {on > 0 ? <span style={{ opacity: on }}>✓</span> : null}
  </div>
);

export const Card: React.FC<{
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ style, children }) => (
  <div
    style={{
      background: WHITE,
      borderRadius: 34,
      boxShadow: CARD_SHADOW,
      ...style,
    }}
  >
    {children}
  </div>
);
