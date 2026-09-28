// A card's bilingual heading: the voice's language in the serif, the other under it.
import { C, SANS, SERIF, usePair } from "./theme";

export const CardTitle: React.FC<{ vi: string; en: string }> = ({ vi, en }) => {
  const [main, sub] = usePair()(vi, en);
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div
        style={{
          color: C.goldLight,
          fontFamily: SERIF,
          fontSize: 56,
          lineHeight: 1.25,
        }}
      >
        {main}
      </div>
      <div
        style={{
          color: C.cream,
          fontFamily: SANS,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: 0.75,
        }}
      >
        {sub}
      </div>
      <div
        style={{
          margin: "18px auto 0",
          width: 120,
          height: 3,
          background: C.gold,
          borderRadius: 2,
        }}
      />
    </div>
  );
};
